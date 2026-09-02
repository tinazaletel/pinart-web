-- Storno je samostojen izdan račun: dobi naslednjo zaporedno številko in
-- negativne postavke, da so tudi davčne osnove pri potrditvi pravilno negativne.
create or replace function public.storniraj_racun(p_id uuid, p_razlog text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  original public.invoices%rowtype;
  storno_id uuid;
  storno_stevilka text;
  storno_postavke jsonb;
  storno_zaporedna integer;
  storno_vzorec text;
  storno_leto integer := extract(year from current_date)::integer;
begin
  select * into original from public.invoices where id = p_id for update;
  if not found then raise exception 'Račun ne obstaja.' using errcode = 'P0002'; end if;
  if not public.role_at_least(original.organization_id, 'accounting') then
    raise exception 'Za storno potrebuješ računovodsko vlogo.' using errcode = '42501';
  end if;
  if original.issued_at is null then raise exception 'Stornirati je mogoče samo izdan račun.' using errcode = '22023'; end if;
  if original.cancelled_at is not null or original.status = 'cancelled' then raise exception 'Račun je že storniran.' using errcode = '22023'; end if;
  if nullif(trim(coalesce(p_razlog, '')), '') is null then raise exception 'Vpiši razlog stornacije.' using errcode = '22023'; end if;

  insert into public.document_counters (organization_id, leto, vrsta, zadnja)
  values (original.organization_id, storno_leto, 'racun', 1)
  on conflict (organization_id, leto, vrsta) do update
    set zadnja = public.document_counters.zadnja + 1, updated_at = now()
  returning zadnja, vzorec into storno_zaporedna, storno_vzorec;
  storno_vzorec := coalesce(nullif(storno_vzorec, ''), '{leto}-{zaporedna}');
  storno_stevilka := replace(replace(storno_vzorec, '{leto}', storno_leto::text), '{zaporedna}', lpad(storno_zaporedna::text, 4, '0'));
  select coalesce(jsonb_agg(
    case when jsonb_typeof(postavka) = 'object'
      then jsonb_set(postavka, '{kolicina}', to_jsonb(-abs(coalesce((postavka->>'kolicina')::numeric, 0))), true)
      else postavka end
  ), '[]'::jsonb) into storno_postavke
  from jsonb_array_elements(coalesce(original.items, '[]'::jsonb)) postavka;

  perform set_config('app.storno_rpc', '1', true);
  update public.invoices set status = 'cancelled', cancelled_at = now(), cancel_reason = trim(p_razlog), updated_at = now() where id = original.id;

  insert into public.invoices (
    organization_id, client_id, offer_id, contract_id, external_id, number,
    title, description, status, issue_date, due_date, amount, currency,
    file_path, items, issued_at, version, storno_of_id, payment_method
  ) values (
    original.organization_id, original.client_id, original.offer_id, original.contract_id,
    gen_random_uuid()::text, storno_stevilka,
    concat('Storno računa ', coalesce(original.number, original.id::text)), trim(p_razlog),
    'sent', current_date, current_date, -abs(original.amount), original.currency,
    null, storno_postavke, now(), 1, original.id, original.payment_method
  ) returning id into storno_id;
  return storno_id;
end;
$$;

revoke all on function public.storniraj_racun(uuid, text) from public;
grant execute on function public.storniraj_racun(uuid, text) to authenticated;

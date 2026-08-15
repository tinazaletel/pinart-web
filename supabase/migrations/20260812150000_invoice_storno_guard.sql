-- Storno je dovoljen izključno prek RPC-ja; neposreden UPDATE izdanega računa
-- ne sme obiti protivknjizbe in revizijske sledi.
create or replace function public.protect_invoice_record()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  storno_rpc boolean := coalesce(current_setting('app.storno_rpc', true), '') = '1';
begin
  if tg_op = 'DELETE' then
    raise exception 'Racunov ni dovoljeno trajno izbrisati.' using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    if new.issued_at is not null and not public.role_at_least(new.organization_id, 'accounting') then
      raise exception 'Za izdajo racuna potrebujete racunovodsko vlogo.' using errcode = '42501';
    end if;
    if new.storno_of_id is not null and not storno_rpc then
      raise exception 'Storno je mogoce ustvariti samo prek postopka za storno.' using errcode = '42501';
    end if;
    return new;
  end if;

  if (old.issued_at is not null or new.issued_at is not null)
     and new.deleted_at is distinct from old.deleted_at then
    raise exception 'Izdanega racuna ni mogoce izbrisati. Uporabite storno.' using errcode = '42501';
  end if;

  if old.issued_at is null and new.issued_at is not null
     and not public.role_at_least(new.organization_id, 'accounting') then
    raise exception 'Za izdajo racuna potrebujete racunovodsko vlogo.' using errcode = '42501';
  end if;

  if old.issued_at is not null and new.status is distinct from old.status then
    if new.status = 'cancelled' and not storno_rpc then
      raise exception 'Racun je mogoce stornirati samo prek postopka za storno.' using errcode = '42501';
    end if;
    if not (
      (old.status = 'sent' and new.status in ('paid', 'overdue', 'cancelled')) or
      (old.status = 'overdue' and new.status in ('paid', 'cancelled')) or
      (old.status = 'paid' and new.status = 'cancelled')
    ) then
      raise exception 'Ta sprememba statusa izdanega racuna ni dovoljena.' using errcode = '42501';
    end if;
  end if;

  if old.issued_at is not null and (
    new.cancelled_at is distinct from old.cancelled_at or
    new.cancel_reason is distinct from old.cancel_reason
  ) and not storno_rpc then
    raise exception 'Podatke o stornu je mogoce nastaviti samo prek postopka za storno.' using errcode = '42501';
  end if;

  if old.issued_at is not null and (
    new.organization_id is distinct from old.organization_id or
    new.client_id is distinct from old.client_id or
    new.offer_id is distinct from old.offer_id or
    new.contract_id is distinct from old.contract_id or
    new.external_id is distinct from old.external_id or
    new.number is distinct from old.number or
    new.title is distinct from old.title or
    new.description is distinct from old.description or
    new.issue_date is distinct from old.issue_date or
    new.due_date is distinct from old.due_date or
    new.amount is distinct from old.amount or
    new.currency is distinct from old.currency or
    new.file_path is distinct from old.file_path or
    new.items is distinct from old.items or
    new.issued_at is distinct from old.issued_at or
    new.version is distinct from old.version or
    new.supersedes_id is distinct from old.supersedes_id or
    new.storno_of_id is distinct from old.storno_of_id
  ) then
    raise exception 'Vsebine izdanega racuna ni mogoce spreminjati.' using errcode = '42501';
  end if;

  return new;
end;
$$;

create or replace function public.storniraj_racun(p_id uuid, p_razlog text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  original public.invoices%rowtype;
  storno_id uuid;
begin
  select * into original
  from public.invoices
  where id = p_id
  for update;

  if not found then
    raise exception 'Racun ne obstaja.' using errcode = 'P0002';
  end if;
  if not public.role_at_least(original.organization_id, 'accounting') then
    raise exception 'Za storno potrebujete racunovodsko vlogo.' using errcode = '42501';
  end if;
  if original.issued_at is null then
    raise exception 'Stornirati je mogoce samo izdan racun.' using errcode = '22023';
  end if;
  if original.cancelled_at is not null or original.status = 'cancelled' then
    raise exception 'Racun je ze storniran.' using errcode = '22023';
  end if;

  perform set_config('app.storno_rpc', '1', true);

  update public.invoices
  set status = 'cancelled',
      cancelled_at = now(),
      cancel_reason = nullif(trim(p_razlog), ''),
      updated_at = now()
  where id = original.id;

  insert into public.invoices (
    organization_id, client_id, offer_id, contract_id, external_id, number,
    title, description, status, issue_date, due_date, amount, currency,
    file_path, items, issued_at, version, storno_of_id
  ) values (
    original.organization_id, original.client_id, original.offer_id,
    original.contract_id,
    concat(coalesce(original.external_id, original.id::text), '-storno'),
    concat(coalesce(original.number, original.id::text), '-STORNO'),
    concat('STORNO: ', coalesce(original.title, original.number, 'racun')),
    coalesce(nullif(trim(p_razlog), ''), original.description),
    'sent', current_date, current_date, -abs(original.amount), original.currency,
    null, original.items, now(), 1, original.id
  ) returning id into storno_id;

  return storno_id;
end;
$$;

revoke all on function public.storniraj_racun(uuid, text) from public;
grant execute on function public.storniraj_racun(uuid, text) to authenticated;

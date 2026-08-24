-- Varna nastavitev obstoječe serije ob prehodu na Flow sredi leta.
create or replace function public.nastavi_stevilcenje(
  p_vrsta text,
  p_leto integer,
  p_zadnja integer,
  p_vzorec text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_organization_id uuid;
  trenutna integer;
  novi_vzorec text := trim(coalesce(p_vzorec, ''));
begin
  if auth.uid() is null then
    raise exception 'Prijava je obvezna.' using errcode = '28000';
  end if;
  if p_vrsta not in ('racun', 'predracun') then
    raise exception 'Neveljavna vrsta dokumenta.' using errcode = '22023';
  end if;
  if p_leto not between 2000 and 9999 then
    raise exception 'Leto mora biti med 2000 in 9999.' using errcode = '22023';
  end if;
  if p_zadnja < 0 then
    raise exception 'Zadnja številka ne sme biti negativna.' using errcode = '22023';
  end if;
  if position('{zaporedna}' in novi_vzorec) = 0
     or regexp_replace(novi_vzorec, '\{(leto|zaporedna)\}', '', 'g') ~ '[{}]' then
    raise exception 'Oblika mora vsebovati {zaporedna}; dovoljeni oznaki sta {leto} in {zaporedna}.' using errcode = '22023';
  end if;

  target_organization_id := public.ensure_user_organization();
  if not public.is_organization_admin(target_organization_id) then
    raise exception 'Številčenje lahko spremeni samo skrbnik ali lastnik.' using errcode = '42501';
  end if;

  -- Vrstico ustvarimo pred zaklepom: tako tudi dva hkratna prva vpisa iste
  -- serije ne moreta drug drugega prepisati z nižjo vrednostjo.
  insert into public.document_counters (organization_id, leto, vrsta, zadnja)
  values (target_organization_id, p_leto, p_vrsta, 0)
  on conflict (organization_id, leto, vrsta) do nothing;

  select zadnja into trenutna
  from public.document_counters
  where organization_id = target_organization_id and leto = p_leto and vrsta = p_vrsta
  for update;

  if trenutna is not null and p_zadnja < trenutna then
    raise exception 'Zadnja izdana številka ne sme biti manjša od trenutne (%).', trenutna using errcode = '22023';
  end if;

  update public.document_counters
  set zadnja = p_zadnja, vzorec = novi_vzorec, updated_at = now()
  where organization_id = target_organization_id and leto = p_leto and vrsta = p_vrsta;
end;
$$;

revoke all on function public.nastavi_stevilcenje(text, integer, integer, text) from public;
grant execute on function public.nastavi_stevilcenje(text, integer, integer, text) to authenticated;

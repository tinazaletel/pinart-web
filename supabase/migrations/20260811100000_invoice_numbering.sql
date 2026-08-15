-- Atomsko številčenje računov in predračunov po organizaciji, letu in vrsti.
create table if not exists public.document_counters (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  leto integer not null check (leto between 2000 and 9999),
  vrsta text not null check (vrsta in ('racun', 'predracun')),
  zadnja integer not null default 0 check (zadnja >= 0),
  -- NULL uporabi privzeti vzorec. Podprti oznaki sta {leto} in {zaporedna}.
  vzorec text,
  updated_at timestamptz not null default now(),
  primary key (organization_id, leto, vrsta)
);

alter table public.document_counters enable row level security;

drop policy if exists "members read document counters" on public.document_counters;
create policy "members read document counters" on public.document_counters for select
  using (public.is_organization_member(organization_id));

-- Neposredno pisanje ni dovoljeno: števec spreminja samo security-definer RPC.
revoke all on public.document_counters from anon, authenticated;
grant select on public.document_counters to authenticated;

create or replace function public.dodeli_stevilko(p_vrsta text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  target_organization_id uuid;
  target_year integer := extract(year from current_date)::integer;
  next_value integer;
  number_pattern text;
  formatted_sequence text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_vrsta not in ('racun', 'predracun') then
    raise exception 'Neveljavna vrsta dokumenta.' using errcode = '22023';
  end if;

  target_organization_id := public.ensure_user_organization();
  if not public.role_at_least(target_organization_id, 'member') then
    raise exception 'Za številčenje dokumentov potrebujete člansko vlogo.' using errcode = '42501';
  end if;

  insert into public.document_counters (organization_id, leto, vrsta, zadnja)
  values (target_organization_id, target_year, p_vrsta, 1)
  on conflict (organization_id, leto, vrsta) do update
    set zadnja = public.document_counters.zadnja + 1,
        updated_at = now()
  returning zadnja, vzorec into next_value, number_pattern;

  formatted_sequence := lpad(next_value::text, 4, '0');
  number_pattern := coalesce(
    nullif(number_pattern, ''),
    case when p_vrsta = 'predracun' then 'P-{leto}-{zaporedna}' else '{leto}-{zaporedna}' end
  );

  return replace(
    replace(number_pattern, '{leto}', target_year::text),
    '{zaporedna}', formatted_sequence
  );
end;
$$;

revoke all on function public.dodeli_stevilko(text) from public;
grant execute on function public.dodeli_stevilko(text) to authenticated;

-- Obstoječe številke oblike YYYY-NNNN, P-YYYY-NNNN ali PR-YYYY-NNNN
-- premaknejo števec do največje že uporabljene zaporedne številke.
insert into public.document_counters (organization_id, leto, vrsta, zadnja)
select
  organization_id,
  substring(number from '(20[0-9]{2})')::integer as leto,
  case when number ~* '^PR?-' then 'predracun' else 'racun' end as vrsta,
  max(substring(number from '([0-9]+)$')::integer) as zadnja
from public.invoices
where number is not null
  and number ~* '^(PR?-)?20[0-9]{2}-[0-9]+$'
group by organization_id, leto, vrsta
on conflict (organization_id, leto, vrsta) do update
set zadnja = greatest(public.document_counters.zadnja, excluded.zadnja),
    updated_at = now();

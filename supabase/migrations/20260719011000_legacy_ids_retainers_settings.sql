-- Ta migracija je namenoma samostojna: varno jo lahko zaženeš tudi, če je bila
-- predhodna grants migracija že izvedena.
grant usage on schema public to authenticated;
grant select, insert, update, delete on table
  public.organizations, public.profiles, public.organization_members,
  public.clients, public.offers, public.contracts, public.invoices,
  public.expenses, public.business_goals, public.accounting_exports
to authenticated;
grant execute on function public.is_organization_member(uuid) to authenticated;
grant execute on function public.is_organization_admin(uuid) to authenticated;
revoke all on table
  public.organizations, public.profiles, public.organization_members,
  public.clients, public.offers, public.contracts, public.invoices,
  public.expenses, public.business_goals, public.accounting_exports
from anon;

alter table public.clients add column if not exists external_id text;
alter table public.offers add column if not exists external_id text;
alter table public.contracts add column if not exists external_id text;
alter table public.invoices add column if not exists external_id text;
alter table public.expenses add column if not exists external_id text;
alter table public.organizations add column if not exists email text;
alter table public.organizations add column if not exists phone text;
alter table public.organizations add column if not exists bank_account text;

create unique index if not exists clients_organization_external_id_key on public.clients (organization_id, external_id);
create unique index if not exists offers_organization_external_id_key on public.offers (organization_id, external_id);
create unique index if not exists contracts_organization_external_id_key on public.contracts (organization_id, external_id);
create unique index if not exists invoices_organization_external_id_key on public.invoices (organization_id, external_id);
create unique index if not exists expenses_organization_external_id_key on public.expenses (organization_id, external_id);

create table if not exists public.retainers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  external_id text,
  number text,
  title text not null,
  status public.contract_status not null default 'draft',
  scope jsonb not null default '[]'::jsonb,
  pricing_model text not null check (pricing_model in ('hours', 'package', 'combined')),
  hours_per_month numeric(8,2) not null default 0,
  hourly_rate numeric(12,2) not null default 0,
  package_amount numeric(12,2) not null default 0,
  monthly_amount numeric(12,2) not null default 0,
  duration_months integer not null default 1,
  start_date date not null default current_date,
  notice_days integer not null default 30,
  rights_text text,
  offer_file_path text,
  contract_file_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists retainers_organization_external_id_key on public.retainers (organization_id, external_id);
create index if not exists retainers_organization_start_date_idx on public.retainers (organization_id, start_date desc);
alter table public.retainers enable row level security;
drop policy if exists "members manage retainers" on public.retainers;
create policy "members manage retainers" on public.retainers for all
  using (public.is_organization_member(organization_id))
  with check (public.is_organization_member(organization_id));
grant select, insert, update, delete on public.retainers to authenticated;

create table if not exists public.organization_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  monthly_goal numeric(12,2) not null default 5000,
  desired_income numeric(12,2) not null default 2000,
  reserve_percent numeric(5,2) not null default 20,
  recurring_costs jsonb not null default '[]'::jsonb,
  price_profiles jsonb not null default '{}'::jsonb,
  active_price_profile text,
  accounting_email text,
  accounting_frequency text not null default 'quarterly' check (accounting_frequency in ('monthly', 'quarterly')),
  legacy_migration_completed_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.organization_settings add column if not exists legacy_migration_completed_at timestamptz;

alter table public.organization_settings enable row level security;
drop policy if exists "members manage organization settings" on public.organization_settings;
create policy "members manage organization settings" on public.organization_settings for all
  using (public.is_organization_member(organization_id))
  with check (public.is_organization_member(organization_id));
grant select, insert, update, delete on public.organization_settings to authenticated;

create or replace function public.ensure_user_organization()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  organization_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select om.organization_id into organization_id
  from public.organization_members om
  where om.user_id = current_user_id
  order by om.created_at
  limit 1;

  if organization_id is null then
    insert into public.profiles (id) values (current_user_id)
    on conflict (id) do nothing;

    insert into public.organizations (name, owner_id)
    values ('Moje podjetje', current_user_id)
    returning id into organization_id;

    insert into public.organization_members (organization_id, user_id, role)
    values (organization_id, current_user_id, 'owner');
  end if;

  return organization_id;
end;
$$;

grant execute on function public.ensure_user_organization() to authenticated;

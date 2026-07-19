create table if not exists public.business_plans (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  desired_monthly_income numeric(12,2) not null default 2000,
  fixed_monthly_costs numeric(12,2) not null default 0,
  tax_reserve_percent numeric(5,2) not null default 20,
  safety_reserve_percent numeric(5,2) not null default 10,
  billable_hours_monthly numeric(8,2) not null default 80,
  average_project_value numeric(12,2) not null default 1000,
  work_days_weekly numeric(4,2) not null default 5,
  weeks_off_yearly numeric(4,2) not null default 5,
  notes text,
  updated_at timestamptz not null default now()
);

create table if not exists public.private_time_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_name text not null,
  service_name text,
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_minutes integer not null default 0 check (duration_minutes >= 0),
  amount numeric(12,2) not null default 0,
  scope_status text not null default 'included' check (scope_status in ('included', 'extra')),
  overrun_reason text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists private_time_entries_user_started_idx
  on public.private_time_entries (user_id, started_at desc);

alter table public.business_plans enable row level security;
alter table public.private_time_entries enable row level security;

create policy "members read business plan" on public.business_plans
  for select using (public.is_organization_member(organization_id));
create policy "admins manage business plan" on public.business_plans
  for all using (public.is_organization_admin(organization_id))
  with check (public.is_organization_admin(organization_id));

-- Timer je osebni delovni dnevnik. Članstvo v istem podjetju ne daje dostopa.
create policy "users read own private time" on public.private_time_entries
  for select using (user_id = auth.uid());
create policy "users insert own private time" on public.private_time_entries
  for insert with check (
    user_id = auth.uid() and public.is_organization_member(organization_id)
  );
create policy "users update own private time" on public.private_time_entries
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users delete own private time" on public.private_time_entries
  for delete using (user_id = auth.uid());

grant select, insert, update, delete on public.business_plans to authenticated;
grant select, insert, update, delete on public.private_time_entries to authenticated;

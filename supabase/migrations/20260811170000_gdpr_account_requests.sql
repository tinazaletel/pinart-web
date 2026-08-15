alter table public.profiles
  add column if not exists deleted_at timestamptz;

alter table public.organization_members
  add column if not exists disabled_at timestamptz;

create table if not exists public.user_data_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  request_type text not null check (request_type in ('export', 'delete')),
  status text not null default 'completed' check (status in ('pending', 'completed', 'failed')),
  metadata jsonb not null default '{}'::jsonb,
  requested_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists user_data_requests_user_requested_idx
  on public.user_data_requests (user_id, requested_at desc);

alter table public.user_data_requests enable row level security;

drop policy if exists "users read own data requests" on public.user_data_requests;
create policy "users read own data requests" on public.user_data_requests
  for select using (user_id = auth.uid());

drop policy if exists "users create own data requests" on public.user_data_requests;
create policy "users create own data requests" on public.user_data_requests
  for insert with check (user_id = auth.uid());

create or replace function public.is_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = target_organization_id
      and user_id = auth.uid()
      and disabled_at is null
  );
$$;

create or replace function public.is_organization_admin(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = target_organization_id
      and user_id = auth.uid()
      and disabled_at is null
      and role in ('owner', 'admin')
  );
$$;

create or replace function public.membership_role_of(target_organization_id uuid)
returns public.membership_role
language sql
stable
security definer
set search_path = public
as $$
  select om.role
  from public.organization_members om
  where om.organization_id = target_organization_id
    and om.user_id = auth.uid()
    and om.disabled_at is null
  limit 1;
$$;

grant execute on function public.is_organization_member(uuid) to authenticated;
grant execute on function public.is_organization_admin(uuid) to authenticated;
grant execute on function public.membership_role_of(uuid) to authenticated;


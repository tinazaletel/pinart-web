-- PREOSTALE LOKALNE SHRAMBE V OBLAK (2026-08-20)
-- Ena tabela za majhne zbirke, ki imajo isti življenjski cikel. external_id je
-- lokalni id, deleted_at pa nagrobnik, zato brisanje preživi več naprav.

create table if not exists public.organization_local_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  collection text not null check (collection in ('klepet', 'marketing', 'kom-obvestila', 'posta', 'pupa-nastavitve')),
  external_id text not null,
  data jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, collection, external_id)
);

create index if not exists organization_local_records_org_collection_idx
  on public.organization_local_records (organization_id, collection, updated_at desc);

alter table public.organization_local_records enable row level security;

drop policy if exists "clani berejo lokalne zbirke" on public.organization_local_records;
create policy "clani berejo lokalne zbirke" on public.organization_local_records for select
  using (public.is_organization_member(organization_id));

drop policy if exists "clani dodajo lokalne zbirke" on public.organization_local_records;
create policy "clani dodajo lokalne zbirke" on public.organization_local_records for insert
  with check (public.is_organization_member(organization_id));

drop policy if exists "clani spremenijo lokalne zbirke" on public.organization_local_records;
create policy "clani spremenijo lokalne zbirke" on public.organization_local_records for update
  using (public.is_organization_member(organization_id))
  with check (public.is_organization_member(organization_id));

drop policy if exists "admini izbrišejo lokalne zbirke" on public.organization_local_records;
create policy "admini izbrišejo lokalne zbirke" on public.organization_local_records for delete
  using (public.is_organization_admin(organization_id));

grant select, insert, update, delete on public.organization_local_records to authenticated;
revoke all on public.organization_local_records from anon;

-- Admin pregled mesečne Pupine porabe bere ai_usage s service-role odjemalcem.
grant select on public.ai_usage to service_role;

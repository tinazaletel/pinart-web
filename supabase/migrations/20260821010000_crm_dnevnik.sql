-- Obstoječo tabelo dnevnika razširimo z iskalnimi stolpci; data ostane zaradi
-- združljivosti s starejšimi odjemalci in že shranjenimi zapisi.
alter table if exists public.crm_dnevnik
  add column if not exists stranka_external_id text,
  add column if not exists projekt_external_id text,
  add column if not exists vrsta text,
  add column if not exists besedilo text,
  add column if not exists zgodilo_se timestamptz;

create unique index if not exists crm_dnevnik_organization_external_idx
  on public.crm_dnevnik (organization_id, external_id);

create index if not exists crm_dnevnik_stranka_external_idx
  on public.crm_dnevnik (organization_id, stranka_external_id, zgodilo_se desc);

alter table if exists public.crm_dnevnik enable row level security;

drop policy if exists "clani read scoped crm_dnevnik" on public.crm_dnevnik;
create policy "clani read scoped crm_dnevnik" on public.crm_dnevnik for select
  using (public.sme_videti_zapis(organization_id, 'crm_dnevnik', id, created_by, client_id));

drop policy if exists "clani insert crm_dnevnik" on public.crm_dnevnik;
create policy "clani insert crm_dnevnik" on public.crm_dnevnik for insert
  with check (public.is_organization_member(organization_id));

drop policy if exists "clani update scoped crm_dnevnik" on public.crm_dnevnik;
create policy "clani update scoped crm_dnevnik" on public.crm_dnevnik for update
  using (public.sme_videti_zapis(organization_id, 'crm_dnevnik', id, created_by, client_id))
  with check (public.is_organization_member(organization_id));

grant select, insert, update on public.crm_dnevnik to authenticated;
revoke all on public.crm_dnevnik from anon;

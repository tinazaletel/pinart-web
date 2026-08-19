-- PROJEKTI V OBLAK (2026-08-19)
--
-- Do zdaj so pravi projekti (lib/projekti.ts) živeli SAMO v localStorage. Zato
-- jih ni bilo mogoče deliti s sodelavcem ne videti na drugi napravi — kar je
-- predpogoj za deljenje projekta, portal za stranko in vse, kar je obrnjeno
-- k stranki.
--
-- Tabela sledi vzorcu ostalih zbirk (external_id = lokalni Projekt.id,
-- upsert po organization_id+external_id) in se vklopi v obstoječi sistem
-- vidnosti iz Faze 4: sme_videti_zapis() + record_shares.
--
-- Jedrni stolpci so tisti, po katerih bomo kdaj filtrirali ali vezali pravice
-- (naslov, stranka, status, faza); celoten Projekt (brief, cilji, povezave,
-- dodatna vprašanja) gre v data jsonb, da se ob vsaki novi rubriki briefa ne
-- rabi nova migracija.

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  external_id text not null,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  title text not null default '',
  client_id uuid references public.clients(id) on delete set null,
  status text,
  faza text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, external_id)
);

create index if not exists projects_org_idx on public.projects (organization_id);
create index if not exists projects_client_idx on public.projects (client_id);

alter table public.projects enable row level security;

-- Vidnost: enako kot pogodbe — admin/lastnik vse; član svoje ustvarjene,
-- izrecno deljene, ali tiste, katerih STRANKA je deljena z njim.
drop policy if exists "clani read scoped projects" on public.projects;
create policy "clani read scoped projects" on public.projects for select
  using (public.sme_videti_zapis(organization_id, 'projects', id, created_by, client_id));

drop policy if exists "clani insert projects" on public.projects;
create policy "clani insert projects" on public.projects for insert
  with check (public.is_organization_member(organization_id));

drop policy if exists "clani update scoped projects" on public.projects;
create policy "clani update scoped projects" on public.projects for update
  using (public.sme_videti_zapis(organization_id, 'projects', id, created_by, client_id))
  with check (public.is_organization_member(organization_id));

drop policy if exists "admins delete projects" on public.projects;
create policy "admins delete projects" on public.projects for delete
  using (public.is_organization_admin(organization_id));

grant select, insert, update, delete on public.projects to authenticated;
revoke all on public.projects from anon;

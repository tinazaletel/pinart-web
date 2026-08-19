-- NALOGE V OBLAK (2026-08-20)
--
-- Naloge (lib/naloge.ts) so do zdaj živele SAMO v localStorage — štirje ključi:
--   pinflow_naloge_data          -> seznam nalog (kanban Task Manager)
--   pinflow_naloge_zgodovina     -> dnevnik aktivnosti (append-only)
--   pinflow_tedenske_dodelitve   -> šefov tedenski razpored
--   pinflow_cikel_tednov         -> dolžina cikla (1-4 tedne)
-- Zato naloge ni bilo mogoče videti na drugi napravi ne dodeliti sodelavcu, ki
-- dela na svojem računalniku — kar je predpogoj za večuporabniški Task Manager.
--
-- Vzorec je namenoma ISTI kot pri projektih (20260819100000_projekti_v_oblak):
-- external_id = lokalni Naloga.id, upsert po organization_id+external_id, ob
-- sporu zmaga novejši updated_at, brisanje potuje kot nagrobnik (deleted_at).
--
-- Jedrni stolpci so tisti, po katerih bomo kdaj filtrirali ali vezali pravice
-- (naslov, stolpec/status, dodeljena oseba, rok, projekt); celotna Naloga
-- (komentarji, podopravila, oznake, štoparica) gre v data jsonb, da se ob vsaki
-- novi rubriki naloge ne rabi nova migracija.

create table if not exists public.naloge (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  external_id text not null,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  title text not null default '',
  -- stolpec kanbana: 'todo' | 'in_progress' | 'waiting' | 'done'
  status text,
  -- Sodelavec.id (lib/naloge), ne e-pošta in ne ime — id je stabilen
  assignee text,
  due_on date,
  -- Naloga.projectId je PROST lokalni id (ni FK na public.projects), zato ga
  -- hranimo kot besedilo; povezava na pravi projekt pride, ko bo projectId
  -- povsod res Projekt.id.
  project_external_id text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, external_id)
);

create index if not exists naloge_org_idx on public.naloge (organization_id);
create index if not exists naloge_project_idx on public.naloge (organization_id, project_external_id);

alter table public.naloge enable row level security;

-- Vidnost: enako kot projekti — admin/lastnik vse; član svoje ustvarjene ali
-- izrecno deljene. Stranke tu ni (naloga ni vezana na public.clients), zato je
-- peti argument NULL.
drop policy if exists "clani read scoped naloge" on public.naloge;
create policy "clani read scoped naloge" on public.naloge for select
  using (public.sme_videti_zapis(organization_id, 'naloge', id, created_by, null::uuid));

drop policy if exists "clani insert naloge" on public.naloge;
create policy "clani insert naloge" on public.naloge for insert
  with check (public.is_organization_member(organization_id));

drop policy if exists "clani update scoped naloge" on public.naloge;
create policy "clani update scoped naloge" on public.naloge for update
  using (public.sme_videti_zapis(organization_id, 'naloge', id, created_by, null::uuid))
  with check (public.is_organization_member(organization_id));

drop policy if exists "admins delete naloge" on public.naloge;
create policy "admins delete naloge" on public.naloge for delete
  using (public.is_organization_admin(organization_id));

grant select, insert, update, delete on public.naloge to authenticated;
revoke all on public.naloge from anon;

-- ── NASTAVITVE NALOG ─────────────────────────────────────────────────────────
-- Zgodovina aktivnosti, tedenske dodelitve in dolžina cikla NISO zapisi
-- posameznika, ampak nastavitev/dnevnik CELE organizacije (šefov razpored vidi
-- vsa ekipa). Zato ena vrstica na organizacijo in vidnost = članstvo, brez
-- sme_videti_zapis. Vsebina v data jsonb:
--   { zgodovina: ZgodovinaAktivnosti[], dodelitve: TedenskaDodelitev[], cikelTednov: number }
create table if not exists public.naloge_nastavitve (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.naloge_nastavitve enable row level security;

drop policy if exists "clani read naloge nastavitve" on public.naloge_nastavitve;
create policy "clani read naloge nastavitve" on public.naloge_nastavitve for select
  using (public.is_organization_member(organization_id));

drop policy if exists "clani insert naloge nastavitve" on public.naloge_nastavitve;
create policy "clani insert naloge nastavitve" on public.naloge_nastavitve for insert
  with check (public.is_organization_member(organization_id));

drop policy if exists "clani update naloge nastavitve" on public.naloge_nastavitve;
create policy "clani update naloge nastavitve" on public.naloge_nastavitve for update
  using (public.is_organization_member(organization_id))
  with check (public.is_organization_member(organization_id));

drop policy if exists "admins delete naloge nastavitve" on public.naloge_nastavitve;
create policy "admins delete naloge nastavitve" on public.naloge_nastavitve for delete
  using (public.is_organization_admin(organization_id));

grant select, insert, update, delete on public.naloge_nastavitve to authenticated;
revoke all on public.naloge_nastavitve from anon;

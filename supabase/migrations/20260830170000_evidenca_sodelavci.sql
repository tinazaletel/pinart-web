-- EVIDENCA DELOVNEGA ČASA ZA EKIPO (Tina, 30. 8. 2026)
--
-- Doslej je bila evidenca strogo osebna: članstvo v podjetju ni dalo dostopa do
-- tujih zapisov. To je prav za štoparico (private_time_entries), ne pa za
-- evidenco po ZEPDSV — to vodi delodajalec in jo mora znati pokazati inšpekciji
-- in oddati računovodstvu.
--
-- Zato dobita lastnik in skrbnik pravico brati in urejati evidenco sodelavcev v
-- SVOJI organizaciji. Navaden sodelavec ostane pri svojih zapisih.
--
-- Popravki za nazaj pa ne gredo tiho: sodelavec vloži zahtevek z razlogom
-- (»pozabil sem se vpisati, videl me je Luka«), skrbnik ga odobri ali zavrne, in
-- v zahtevku za vedno ostane, kdo je kaj odobril. Prepoved urejanja sama po sebi
-- evidence ne naredi poštene — naredi jo napačno, ker ljudje res pozabijo
-- pritisniti prihod. Pošteno jo naredi SLED.

-- ── 1. Skrbnik vidi in ureja evidenco svoje ekipe ───────────────────────────
drop policy if exists "admins read org presence" on public.presence_entries;
create policy "admins read org presence" on public.presence_entries
  for select using (public.is_organization_admin(organization_id));

drop policy if exists "admins insert org presence" on public.presence_entries;
create policy "admins insert org presence" on public.presence_entries
  for insert with check (public.is_organization_admin(organization_id));

drop policy if exists "admins update org presence" on public.presence_entries;
create policy "admins update org presence" on public.presence_entries
  for update using (public.is_organization_admin(organization_id))
  with check (public.is_organization_admin(organization_id));

drop policy if exists "admins delete org presence" on public.presence_entries;
create policy "admins delete org presence" on public.presence_entries
  for delete using (public.is_organization_admin(organization_id));

-- ── 2. Zahtevki za popravek za nazaj ────────────────────────────────────────
create table if not exists public.presence_change_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  -- kdo prosi za popravek
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  -- predlagane vrednosti (nič od tega se ne zapiše, dokler ni odobreno)
  arrival text,
  departure text,
  break_minutes integer check (break_minutes is null or break_minutes >= 0),
  kind text,
  -- zakaj: brez razloga zahtevka ni; to je jedro sledi
  reason text not null check (length(btrim(reason)) > 0),
  -- kdo lahko potrdi, da je bil res tu (»videl me je Luka«) — ni obvezno
  witness text,
  status text not null default 'cakanje' check (status in ('cakanje', 'odobreno', 'zavrnjeno')),
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz not null default now()
);

create index if not exists presence_change_requests_org_status_idx
  on public.presence_change_requests (organization_id, status, created_at desc);

alter table public.presence_change_requests enable row level security;

-- Sodelavec vidi svoje zahtevke in jih vlaga; skrbnik vidi vse v podjetju.
drop policy if exists "members read own requests" on public.presence_change_requests;
create policy "members read own requests" on public.presence_change_requests
  for select using (user_id = auth.uid() or public.is_organization_admin(organization_id));

drop policy if exists "members create own requests" on public.presence_change_requests;
create policy "members create own requests" on public.presence_change_requests
  for insert with check (
    user_id = auth.uid()
    and public.is_organization_member(organization_id)
    and status = 'cakanje'
  );

-- Odloča SAMO skrbnik. Sodelavec svojega zahtevka ne more odobriti — sicer
-- odobritev ne pomeni ničesar.
drop policy if exists "admins decide requests" on public.presence_change_requests;
create policy "admins decide requests" on public.presence_change_requests
  for update using (public.is_organization_admin(organization_id))
  with check (public.is_organization_admin(organization_id));

grant select, insert, update on public.presence_change_requests to authenticated;

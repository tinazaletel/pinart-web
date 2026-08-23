-- KLJUČI ZA ZUNANJE AGENTE (2026-08-24)
--
-- Ozka VHODNA pot: zunanji agent (Claude Code, skripta, urnik) naredi delo in
-- nalogo zapiše v Flow, kjer se ji meri čas — ne v klepet, ki ga nihče ne
-- prebere. Ključ iz te tabele odpira NATANKO ENO stvar: POST /api/agent/naloge.
-- Ničesar ne bere in ničesar ne briše.
--
-- ZAKAJ NOVA TABELA IN NE api_kljuci (20260820030000): tisti ključi so BRALNI
-- ključi javnega API-ja v1 z obsegom pravic (`obseg`), ki se bo širil. Ta je
-- pisalni in namenoma brez obsega — če bi obe rabi delili tabelo, bi vsaka nova
-- pravica javnega API-ja tiho veljala tudi za agente. Ločeni tabeli pomenita,
-- da preklic agentovega ključa ne vpliva na integracije in obratno.
--
-- VARNOSTNA ODLOČITEV 1 — ključ se v bazo NIKOLI ne zapiše v čitljivi obliki.
-- Shranimo samo SHA-256 zgostitev (`kljuc_hash`, heksadecimalno) in zadnje
-- štiri znake (`kljuc_namig`) za prepoznavo v seznamu. Cel ključ vidi lastnica
-- ENKRAT, ob nastanku; če ga izgubi, ga ni mogoče obnoviti — ustvari novega.
-- Uhajanje te tabele samo po sebi zato nikomur ne da dostopa.
--
-- VARNOSTNA ODLOČITEV 2 — preverjanje teče prek UNIQUE indeksa na `kljuc_hash`,
-- ne prek primerjave v aplikaciji. Iskanje po indeksu primerja celotno
-- zgostitev in ne razkriva, koliko začetnih znakov se je ujemalo — časovni
-- kanal, ki ga `crypto.timingSafeEqual` zapira, tu sploh ne nastane. Ista
-- odločitev kot pri api_kljuci; razlaga je v lib/agentKljuc.ts.
--
-- VARNOSTNA ODLOČITEV 3 — ključi se NE brišejo, ampak PREKLIČEJO (`revoked_at`).
-- Vrstica ostane kot sled: kdo je ključ ustvaril, kdaj je bil nazadnje v rabi
-- in kdaj je bil ugasnjen. Zato vlogi `authenticated` NE damo pravice delete.
--
-- SHA-256 brez soli je namerna: ključ je 192-bitna naključna vrednost
-- (crypto.randomBytes(24)), ne geslo — slovarskega napada nanj ni, zato bi
-- bcrypt/argon2 prinesla samo latenco ob vsakem klicu.

create table if not exists public.agent_kljuci (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  -- Ime za človeka ("Claude Code na prenosniku", "Nočni urnik"). Enolično
  -- znotraj organizacije, da se v seznamu ve, kateri ključ se preklicuje.
  label text not null check (char_length(label) between 1 and 100),
  -- SHA-256 celega ključa, hex (64 znakov). Edino, kar o ključu res hranimo.
  kljuc_hash text not null check (kljuc_hash ~ '^[0-9a-f]{64}$'),
  -- Zadnji štirje znaki ključa ("…9fQx"). Ni skrivnost, samo prepoznava.
  kljuc_namig text check (kljuc_namig is null or char_length(kljuc_namig) <= 8),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz,
  unique (organization_id, label)
);

-- Unique = hkrati indeks, po katerem teče preverjanje ključa ob vsakem klicu.
create unique index if not exists agent_kljuci_hash_uniq
  on public.agent_kljuci (kljuc_hash);

create index if not exists agent_kljuci_org_idx
  on public.agent_kljuci (organization_id, created_at desc);

alter table public.agent_kljuci enable row level security;

-- BERE ČLAN ORGANIZACIJE. Ključi so orodje ekipe (sodelavec mora videti, da
-- naloge prihajajo od agenta, in kateri ključ je še živ), zato tu ni omejitve
-- na skrbnika kot pri api_kljuci — ta ključ ne odpira branja podatkov, samo
-- vpis naloge.
--
-- POZOR: RLS je vrstična, ne stolpčna. `kljuc_hash` je zato viden vsakemu
-- članu — kar ni razkritje (zgostitev je enosmerna), a v poizvedbah vmesnika
-- ga vseeno NIKOLI ne naštevaj. Enak dogovor kot pri api_kljuci.
drop policy if exists "clani read agent_kljuci" on public.agent_kljuci;
create policy "clani read agent_kljuci" on public.agent_kljuci for select
  using (public.is_organization_member(organization_id));

-- USTVARJA SAMO ADMIN/LASTNIK: ključ piše v naloge cele organizacije.
drop policy if exists "admins insert agent_kljuci" on public.agent_kljuci;
create policy "admins insert agent_kljuci" on public.agent_kljuci for insert
  with check (public.is_organization_admin(organization_id));

-- UPDATE je namenjen izključno preklicu (`revoked_at`) in preimenovanju;
-- prav tako samo admin/lastnik.
drop policy if exists "admins update agent_kljuci" on public.agent_kljuci;
create policy "admins update agent_kljuci" on public.agent_kljuci for update
  using (public.is_organization_admin(organization_id))
  with check (public.is_organization_admin(organization_id));

-- Namenoma NI delete politike: ključi se prekličejo, ne brišejo.

-- Pravice: prijavljeni član bere, admin ustvarja/preklicuje (prek RLS zgoraj),
-- service_role (preverjanje ključa ob klicu poti) obide RLS.
grant select, insert, update on public.agent_kljuci to authenticated;
revoke all on public.agent_kljuci from anon;
grant all on public.agent_kljuci to service_role;

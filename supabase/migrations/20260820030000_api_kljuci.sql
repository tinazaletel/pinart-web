-- API KLJUCI ORGANIZACIJE (2026-08-20)
--
-- Temelj za javni API Flowa: organizacija si ustvari kljuc (pf_...), s katerim
-- zunanji program (skripta, integracija, kasneje MCP streznik) dostopa do
-- svojih podatkov. Kljuc NI uporabnikova seja — pripada ORGANIZACIJI in nosi
-- svoj obseg pravic.
--
-- VARNOSTNA ODLOCITEV 1 — kljuc se v bazo NIKOLI ne zapise v citljivi obliki.
-- Shranimo samo SHA-256 zgostitev celega kljuca (`zgostitev`) in prvih 8 znakov
-- (`predpona`, npr. "pf_A7dQ") za prepoznavo v seznamu. Cel kljuc vidi lastnica
-- ENKRAT, ob nastanku; ce ga izgubi, ga ni mogoce obnoviti — ustvari novega.
-- Zato tudi uhajanje te tabele samo po sebi ne da nikomur dostopa.
--
-- VARNOSTNA ODLOCITEV 2 — preverjanje kljuca gre prek UNIQUE indeksa na
-- `zgostitev`, ne prek primerjave v aplikaciji. Iskanje po indeksu je casovno
-- neodvisno od vsebine kljuca (ne razkriva, koliko znakov se ujema), zato je
-- enakovredno primerjavi s `crypto.timingSafeEqual` in bistveno preprostejse.
-- Glej opombo v `lib/apiKljuc.ts`.
--
-- VARNOSTNA ODLOCITEV 3 — kljuci se NE brisejo, ampak PREKLICEJO (`revoked_at`).
-- Vrstica ostane kot sled: kdo je kljuc ustvaril, kdaj je bil nazadnje v rabi
-- in kdaj je bil ugasnjen. Zato vlogi `authenticated` NE damo pravice delete.
--
-- SHA-256 zgostitev je tu brez soli namenoma: kljuc je 256-bitna nakljucna
-- vrednost (crypto.randomBytes(32)), ne geslo — slovarski napad nanj ne obstaja,
-- zato bcrypt/argon2 ne prinasata nicesar razen latence ob vsakem klicu API-ja.

create table if not exists public.api_kljuci (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  -- Ime za cloveka ("Zapier", "Moj skript") — samo za prikaz v seznamu.
  ime text,
  -- Prvih 8 znakov kljuca ("pf_" + 5 znakov). Ni skrivnost: sluzi zato, da
  -- lastnica v seznamu prepozna, kateri kljuc preklicuje.
  predpona text,
  -- SHA-256 celega kljuca, hex. Edino, kar o kljucu res hranimo.
  zgostitev text not null,
  -- Obseg pravic. Za zdaj 'branje'; zapisovalne operacije naj kasneje dodajo
  -- svojo oznako in jo preverjajo v koncni tocki. Privzeto najmanj pravic.
  obseg text[] not null default '{branje}',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

-- Unique = hkrati indeks, po katerem tece preverjanje kljuca ob vsakem klicu.
create unique index if not exists api_kljuci_zgostitev_uniq
  on public.api_kljuci (zgostitev);

create index if not exists api_kljuci_org_idx
  on public.api_kljuci (organization_id, created_at desc);

alter table public.api_kljuci enable row level security;

-- BERE SAMO ADMIN/LASTNIK. Sodelavec (member/accountant) kljucev NE vidi —
-- kljuc odpira dostop do celotne organizacije, zato je to skrbniska stvar.
drop policy if exists "admins read api_kljuci" on public.api_kljuci;
create policy "admins read api_kljuci" on public.api_kljuci for select
  using (public.is_organization_admin(organization_id));

-- USTVARJA SAMO ADMIN/LASTNIK.
drop policy if exists "admins insert api_kljuci" on public.api_kljuci;
create policy "admins insert api_kljuci" on public.api_kljuci for insert
  with check (public.is_organization_admin(organization_id));

-- UPDATE je namenjen izkljucno preklicu (revoked_at) in preimenovanju;
-- prav tako samo admin/lastnik.
drop policy if exists "admins update api_kljuci" on public.api_kljuci;
create policy "admins update api_kljuci" on public.api_kljuci for update
  using (public.is_organization_admin(organization_id))
  with check (public.is_organization_admin(organization_id));

-- Namenoma NI delete politike: kljuci se preklicejo, ne brisejo.

-- Pravice: prijavljeni admin bere/ustvarja/preklice prek RLS (zgoraj),
-- service_role (preverjanje kljuca ob klicu API-ja) obide RLS.
grant select, insert, update on public.api_kljuci to authenticated;
revoke all on public.api_kljuci from anon;
grant all on public.api_kljuci to service_role;

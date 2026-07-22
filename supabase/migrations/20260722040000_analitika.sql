-- ═══════════════════════════════════════════════════════════════════════════
-- ANALITIKA — anonimno zbiranje podatkov o uporabi Pinart Flow
--
-- KAJ SE ZBIRA (vse anonimno, brez povezave na osebo):
--   · cenovne točke: katera storitev, koliko izkušenj, kateri trg, koliko €
--   · dogodki uporabe: kaj se v orodju odpre, dokonča, izvozi
--   · seštevki računov po paketu (iz obstoječih tabel, prek pogleda)
--
-- KAJ SE NAMENOMA NE ZBIRA (obljuba uporabnikom — ne dodajaj brez odločitve):
--   · zasebni dnevnik ur (private_time_entries) — je in ostane samo njen
--   · vsebina ponudb, pogodb, računov; imena in podatki strank
--   · e-pošta, ime, telefon, IP naslov, natančna lokacija
--   · karkoli, kar bi cenovno točko povezalo z določenim človekom
--
-- "Od kod so uporabniki" se bere iz polja, ki ga uporabnik SAM izbere v
-- kalkulatorju (moj_trg), ne iz IP naslova. Manj natančno, a pošteno.
--
-- DOSTOP: RLS je vklopljen in NIMA politik za anon/authenticated — nihče iz
-- brskalnika ne more brati ne pisati. Zapisuje strežniška pot s service-role
-- ključem, bere admin stran z istim ključem.
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ── Cenovne točke ──────────────────────────────────────────────────────────
create table if not exists public.cenovne_tocke (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  storitve text[] not null default '{}',
  izkusnje text,
  moj_trg text,
  trg_narocnika text,
  raba text,
  izvedba_eur numeric(12,2) not null,
  pravice_eur numeric(12,2) not null default 0,
  valuta text not null default 'eur',
  -- ali je uporabnik privzeto ceno popravil: bolj realen tržni signal
  prilagojeno boolean not null default false,
  vir text not null default 'orodje',          -- orodje | retainer
  paket text not null default 'anon'           -- anon | free | pro
);

create index if not exists cenovne_tocke_cas_idx on public.cenovne_tocke (created_at desc);
create index if not exists cenovne_tocke_trg_idx on public.cenovne_tocke (trg_narocnika);

alter table public.cenovne_tocke enable row level security;
revoke all on public.cenovne_tocke from anon, authenticated;

-- ── Dogodki uporabe ────────────────────────────────────────────────────────
-- seja = naključni niz iz brskalnika (ne identificira osebe, ne pove, kdo je);
-- rabi se samo zato, da 40 klikov ene osebe ni videti kot 40 uporabnikov.
create table if not exists public.dogodki (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  ime text not null,
  pot text,
  seja text,
  naprava text,                                -- mobile | desktop
  jezik text,
  paket text not null default 'anon',          -- anon | free | pro
  lastnosti jsonb not null default '{}'
);

create index if not exists dogodki_cas_idx on public.dogodki (created_at desc);
create index if not exists dogodki_ime_idx on public.dogodki (ime);
create index if not exists dogodki_seja_idx on public.dogodki (seja);

alter table public.dogodki enable row level security;
revoke all on public.dogodki from anon, authenticated;

-- ── Pogledi za admin ───────────────────────────────────────────────────────
-- Mediana namesto povprečja: en absurden vnos ne premakne slike trga.
create or replace view public.analitika_cene as
select
  coalesce(array_to_string(storitve, ' + '), '') as storitve,
  coalesce(izkusnje, '—')                        as izkusnje,
  coalesce(trg_narocnika, '—')                   as trg_narocnika,
  count(*)                                       as stevilo,
  round(percentile_cont(0.5) within group (order by izvedba_eur)::numeric) as mediana,
  min(izvedba_eur)                               as najnizja,
  max(izvedba_eur)                               as najvisja,
  round(avg(case when prilagojeno then 1 else 0 end) * 100)  as odstotek_prilagojenih
from public.cenovne_tocke
group by 1, 2, 3
order by stevilo desc;

-- Katere storitve se sploh največkrat vpisujejo (posamezna storitev, ne skupek).
create or replace view public.analitika_storitve as
select
  storitev,
  count(*)                                        as stevilo,
  round(percentile_cont(0.5) within group (order by izvedba_eur)::numeric) as mediana
from public.cenovne_tocke, unnest(storitve) as storitev
group by 1
order by stevilo desc;

-- Od kod so uporabniki (samoprijavljeni trg, ne IP).
create or replace view public.analitika_trgi as
select
  coalesce(moj_trg, '—')                          as moj_trg,
  count(*)                                        as stevilo,
  round(percentile_cont(0.5) within group (order by izvedba_eur)::numeric) as mediana
from public.cenovne_tocke
group by 1
order by stevilo desc;

-- Koliko računov in kakšni paketi. Šteje samo število — brez e-pošt in imen.
create or replace view public.analitika_racuni as
select
  coalesce(s.tier::text, 'free')                  as paket,
  coalesce(s.status::text, 'active')              as status,
  count(*)                                        as stevilo
from public.organizations o
left join public.organization_subscriptions s on s.organization_id = o.id
group by 1, 2
order by stevilo desc;

-- Dnevna uporaba: koliko različnih sej, koliko dogodkov, koliko nevpisanih.
create or replace view public.analitika_dnevno as
select
  date_trunc('day', created_at)::date             as dan,
  count(*)                                        as dogodkov,
  count(distinct seja)                            as sej,
  count(distinct seja) filter (where paket = 'anon') as nevpisanih
from public.dogodki
group by 1
order by dan desc;

-- Pogledi ne smejo biti dostopni iz brskalnika: samo service-role jih bere.
revoke all on public.analitika_cene, public.analitika_storitve, public.analitika_trgi,
  public.analitika_racuni, public.analitika_dnevno from anon, authenticated;

-- Service-role mora imeti IZRECNO pravico: privzete pravice Supabase za nove
-- poglede ne veljajo, zato je admin vracal "permission denied for view".
grant select on
  public.analitika_cene, public.analitika_storitve, public.analitika_trgi,
  public.analitika_racuni, public.analitika_dnevno
to service_role;

grant select, insert on public.cenovne_tocke, public.dogodki to service_role;


-- Razred proracuna narocnika. Vprasalnik ga ze sprasuje, doslej se ni shranil.
alter table public.cenovne_tocke add column if not exists budget text;

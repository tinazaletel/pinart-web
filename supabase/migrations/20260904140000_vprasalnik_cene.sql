-- VPRAŠALNIK O CENAH: LASTNA TABELA
--
-- Zakaj: migracija 20260903090000 je z »create table if not exists« naletela
-- na ŽE OBSTOJEČO tabelo public.vprasalnik_odgovori — to je tabela Codexovega
-- modula »vprašalniki za stranke« (20260831060000) z obveznima stolpcema
-- vprasalnik_id in organization_id. Migracija je k njej samo prilepila svoje
-- stolpce, zapis odgovora o cenah pa je padel na not-null vprasalnik_id:
-- »Odgovorov ni bilo mogoče shraniti« pri prvem pravem odgovoru (Tina, 4. 9. 2026).
--
-- Tu: (1) lastna tabela vprasalnik_cene za odgovore o cenah po panogah,
--     (2) iz Codexove tabele odstranimo stolpce, ki jih je dodala napačna
--         migracija (panoga, email, izpolnjenih, skupaj) — stolpca ime in
--         odgovori sta Codexova in OSTANETA.
-- Varno za ponovni zagon.

create table if not exists public.vprasalnik_cene (
  id uuid primary key default gen_random_uuid(),
  panoga text not null,
  -- { "<id vprašanja>": "odgovor", "<id vprašanja>::dop": "dopolnilo" }
  odgovori jsonb not null default '{}'::jsonb,
  -- neobvezno, samo s privolitvijo (kljukica na zadnjem koraku)
  ime text,
  email text,
  izpolnjenih integer not null default 0,
  skupaj integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.vprasalnik_cene drop constraint if exists vprasalnik_cene_panoga_check;
alter table public.vprasalnik_cene
  add constraint vprasalnik_cene_panoga_check
  check (panoga in ('grafika', 'fotografija', '3d', 'interier', 'arhitektura', 'marketing', 'it'));

create index if not exists vprasalnik_cene_panoga_idx
  on public.vprasalnik_cene (panoga, created_at desc);

-- Brez politik: piše in bere SAMO strežnik s service-role ključem
-- (app/api/vprasalnik, app/api/kalkulator-admin/vprasalnik). Anonimni in
-- prijavljeni uporabniki tabele ne vidijo — odgovori so tuje poslovne skrivnosti.
alter table public.vprasalnik_cene enable row level security;

-- Pospravimo Codexovo tabelo (stolpci, ki jih je dodala migracija 3. 9.).
alter table public.vprasalnik_odgovori drop constraint if exists vprasalnik_odgovori_panoga_check;
drop index if exists public.vprasalnik_odgovori_panoga_idx;
alter table public.vprasalnik_odgovori
  drop column if exists panoga,
  drop column if exists email,
  drop column if exists izpolnjenih,
  drop column if exists skupaj;

-- V tem projektu se pravice novi tabeli ne dodelijo samodejno (4. 9. 2026:
-- »permission denied for table vprasalnik_cene« za service_role). Samo
-- strežniška vloga; anon in authenticated namenoma NE.
grant select, insert, update, delete on public.vprasalnik_cene to service_role;

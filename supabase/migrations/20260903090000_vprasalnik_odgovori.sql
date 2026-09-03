-- Odgovori na vprašalnik o cenah po panogah.
--
-- Vsebina so TUJE POSLOVNE SKRIVNOSTI: prave cene ljudi, ki so jih zaupali ob
-- obljubi, da jih ne objavimo, ne pokažemo posamično in ne delimo naprej.
-- Zato tabela ni dostopna ne anonimnim ne prijavljenim uporabnikom — piše in
-- bere jo samo strežnik s service-role ključem prek /api/vprasalnik in admina.
--
-- Zapisano po delih in ne kot en create: prvi zagon je padel na pol, tabela je
-- ostala brez stolpcev, drugi zagon pa jo je zaradi "if not exists" preskočil
-- in indeks ni našel stolpca "panoga" (Tina, 3. 9. 2026). Tako se popravi tudi
-- polovična baza.
create table if not exists public.vprasalnik_odgovori (
  id uuid primary key default gen_random_uuid()
);

alter table public.vprasalnik_odgovori
  add column if not exists panoga text,
  add column if not exists odgovori jsonb,
  add column if not exists ime text,
  add column if not exists email text,
  add column if not exists izpolnjenih integer not null default 0,
  add column if not exists skupaj integer not null default 0,
  add column if not exists created_at timestamptz not null default now();

-- Odstrani-pa-dodaj namesto "samo ce ne obstaja": ce se ta datoteka kdaj
-- popravi (kot zdaj, ko sta dodana marketing in it), mora nov seznam panog
-- res obveljati tudi na bazi, kjer je bila prejsnja razlicica ze pognana
-- (Tina, 3. 9. 2026).
alter table public.vprasalnik_odgovori drop constraint if exists vprasalnik_odgovori_panoga_check;
alter table public.vprasalnik_odgovori
  add constraint vprasalnik_odgovori_panoga_check
  check (panoga in ('grafika', 'fotografija', '3d', 'interier', 'arhitektura', 'marketing', 'it'));

create index if not exists vprasalnik_odgovori_panoga_idx
  on public.vprasalnik_odgovori (panoga, created_at desc);

alter table public.vprasalnik_odgovori enable row level security;
revoke all on public.vprasalnik_odgovori from public, anon, authenticated;
grant all on public.vprasalnik_odgovori to service_role;

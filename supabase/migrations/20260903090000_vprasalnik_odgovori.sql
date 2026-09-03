-- Odgovori na vprašalnik o cenah po panogah.
--
-- Vsebina so TUJE POSLOVNE SKRIVNOSTI: prave cene ljudi, ki so jih zaupali ob
-- obljubi, da jih ne objavimo, ne pokažemo posamično in ne delimo naprej.
-- Zato tabela ni dostopna ne anonimnim ne prijavljenim uporabnikom — piše in
-- bere jo samo strežnik s service-role ključem prek /api/vprasalnik in admina.
create table if not exists public.vprasalnik_odgovori (
  id uuid primary key default gen_random_uuid(),
  panoga text not null check (panoga in ('grafika', 'fotografija', '3d', 'interier', 'arhitektura')),
  odgovori jsonb not null,
  ime text,
  email text,
  izpolnjenih integer not null default 0 check (izpolnjenih >= 0),
  skupaj integer not null default 0 check (skupaj >= 0),
  created_at timestamptz not null default now()
);

create index if not exists vprasalnik_odgovori_panoga_idx
  on public.vprasalnik_odgovori (panoga, created_at desc);

alter table public.vprasalnik_odgovori enable row level security;
revoke all on public.vprasalnik_odgovori from public, anon, authenticated;
grant all on public.vprasalnik_odgovori to service_role;

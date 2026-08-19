-- KDAJ JE BIL REGISTER PODJETIJ NAZADNJE OSVEŽEN (2026-08-19)
--
-- Tabela public.podjetja je posnetek javnih zbirk: AJPES osveži Poslovni
-- register dvakrat mesečno, FURS seznama zavezancev pa dnevno. Posnetek zato
-- sčasoma zastara — podjetje se preseli, dobi novo ime ali novo davčno.
--
-- Tu hranimo en sam zapis, kdaj je osvežitev nazadnje stekla, da pregled
-- poslovanja lahko opozori, ko je čas za novo. Zapiše ga scripts/osveziRegister.mjs.

create table if not exists public.register_meta (
  kljuc text primary key,
  osvezeno timestamptz not null default now(),
  stevilo integer,
  opomba text
);

alter table public.register_meta enable row level security;

-- Bralci so prijavljeni uporabniki (podatek ni občutljiv), piše pa samo uvoz
-- prek service-role ključa.
drop policy if exists "prijavljeni berejo meta" on public.register_meta;
create policy "prijavljeni berejo meta" on public.register_meta for select
  to authenticated using (true);

grant select on public.register_meta to authenticated;
grant all on public.register_meta to service_role;
revoke all on public.register_meta from anon;

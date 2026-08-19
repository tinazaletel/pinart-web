-- REGISTER PODJETIJ (2026-08-19)
--
-- Poslovni register Slovenije (AJPES), objavljen kot odprti podatek na OPSI
-- pod licenco CC BY 4.0. Uvozimo ga v lastno tabelo, ker živega API-ja ni —
-- na voljo je le datoteka (CSV, ~294.000 subjektov).
--
-- Namen: ko uporabnica dodaja stranko, vtipka »Ino« in dobi »Inovis« skupaj z
-- naslovom in matično, namesto da vse prepisuje iz mailov.
--
-- To NISO uporabnikovi podatki — je javna referenčna zbirka, skupna vsem
-- organizacijam. Zato ni organization_id in ne RLS po lastništvu; bere jo
-- lahko vsak PRIJAVLJEN uporabnik, neprijavljeni ne (da ne postane odprt
-- iskalnik po podjetjih za ves svet).

create extension if not exists pg_trgm;

create table if not exists public.podjetja (
  maticna text primary key,
  ime text not null,
  oblika text,
  naslov text,
  posta_st text,
  posta text,
  /* ime v male crke in brez sumnikov — da »Jersinovic« najde »Jeršinovič« */
  iskalno text not null,
  /* davcna NI v registru AJPES — pride iz FURS-ovih seznamov zavezancev
     (pravne osebe + s.p.), povezanih po maticni. Zato je nekaj subjektov
     brez nje (niso zavezanci). */
  davcna text,
  ddv boolean
);
alter table public.podjetja add column if not exists davcna text;
alter table public.podjetja add column if not exists ddv boolean;

-- Iskanje po delu imena (»ino« -> »Inovis«) potrebuje trigramski indeks;
-- brez njega bi ILIKE '%…%' cez 294.000 vrstic bral celo tabelo.
create index if not exists podjetja_iskalno_trgm_idx
  on public.podjetja using gin (iskalno gin_trgm_ops);

alter table public.podjetja enable row level security;

drop policy if exists "prijavljeni berejo register" on public.podjetja;
create policy "prijavljeni berejo register" on public.podjetja for select
  to authenticated using (true);

grant select on public.podjetja to authenticated;
revoke all on public.podjetja from anon;
-- Uvoz registra tece prek service-role kljuca (scripts/uvoziPodjetja.mjs);
-- brez te pravice pisanje pade na "permission denied for table podjetja".
grant all on public.podjetja to service_role;

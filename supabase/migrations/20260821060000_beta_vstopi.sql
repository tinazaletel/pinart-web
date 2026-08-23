-- KDO VSTOPA V ZAPRTO BETO (21. 8. 2026)
--
-- Tina: »poleg kode naj piše ime in priimek ter mail, da vem, kdo testira in
-- kolikokrat je bil vpisan — da mi kdo ne reče, da je testiral, pa ni.«
--
-- Doslej je bilo geslo skupno in anonimno: kdorkoli ga je imel, je vstopil in
-- sled je ostala kvečjemu v strežniških dnevnikih, ki jih nihče ne bere. Brez
-- zapisa ni mogoče niti prositi za povratno informacijo tistih, ki so res
-- prišli.
--
-- Vsak USPESEN vstop je svoja vrstica, ne stevec: iz vrstic se da prešteti
-- obiske, videti prvi in zadnji, in ugotoviti, kdo je prišel samo enkrat.
-- Števec bi to zgodovino izgubil.
--
-- Osebni podatek je tu ime in e-naslov testerja, zato tabela NI dostopna
-- brskalniku: piše vanjo samo strežnik (service_role), bere pa jo Tina v
-- Supabase. Politike za `anon` in `authenticated` namenoma ni.

create table if not exists public.beta_vstopi (
  id uuid primary key default gen_random_uuid(),
  ime text not null,
  email text not null,
  -- ura vstopa; iz nje se izpelje "kolikokrat" in "kdaj nazadnje"
  created_at timestamptz not null default now()
);

-- Pregled po osebi: koliko obiskov, prvi in zadnji.
create index if not exists beta_vstopi_email_idx on public.beta_vstopi (email, created_at desc);

alter table public.beta_vstopi enable row level security;
-- Brez politik: skozi RLS ne pride nihce. Strezniski kljuc (service_role) RLS
-- obide, kar je tu edini dovoljen dostop.
revoke all on public.beta_vstopi from anon, authenticated;
grant all on public.beta_vstopi to service_role;

-- Priročen pogled za Tino: ena vrstica na testerja.
create or replace view public.beta_testerji as
  select
    email,
    max(ime)                      as ime,
    count(*)                      as obiskov,
    min(created_at)               as prvic,
    max(created_at)               as zadnjic
  from public.beta_vstopi
  group by email
  order by max(created_at) desc;

revoke all on public.beta_testerji from anon, authenticated;
grant select on public.beta_testerji to service_role;

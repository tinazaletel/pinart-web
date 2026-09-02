-- PRIJAVE ZA TESTIRANJE (Tina, 2. 9. 2026)
--
-- Doslej je prijava samo poslala mail na tina@pinart.si in se nikjer ni
-- shranila. Med enajst tisoc neprebranimi je bila prijava izgubljena brez
-- sledu — in Tina ni imela seznama, kdo caka.
--
-- Tabela je namenoma LOCENA od flow_dostop: to so ljudje, ki so izrazili
-- zanimanje, ne tisti, ki dostop ze imajo. Ko jih Tina doda med testerje,
-- se tu samo prestavi stanje.

create table if not exists public.beta_prijave (
  id         uuid primary key default gen_random_uuid(),
  ime        text not null,
  email      text not null,
  stanje     text not null default 'prijavljen'
             check (stanje in ('prijavljen', 'povabljen', 'zavrnjen')),
  opomba     text,
  prijavljen timestamptz not null default now(),
  obdelan    timestamptz
);

-- En naslov, ena vrstica: ponovna prijava samo osvezi cas in ime.
create unique index if not exists beta_prijave_email_idx on public.beta_prijave (lower(email));

-- RLS vklopljen BREZ politik: do tabele pride samo service_role (API in admin).
-- Anon in prijavljeni uporabniki seznama ne morejo brati — v njem so tuji
-- e-naslovi.
alter table public.beta_prijave enable row level security;
grant all on table public.beta_prijave to service_role;
revoke all on table public.beta_prijave from anon, authenticated;

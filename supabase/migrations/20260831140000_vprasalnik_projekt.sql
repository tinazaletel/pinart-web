-- VPRAŠALNIK, VEZAN NA PROJEKT (Tina, 31. 8. 2026)
--
-- Vprašalnik je lahko dvoje: splošno povpraševanje (»pišite mi«) ali brief za
-- KONKRETEN projekt. V drugem primeru mora odgovor pristati pri projektu, ne
-- na skupnem kupu — sicer ga cez mesec dni nihce ne najde.
--
-- Hranimo lokalni id projekta (Projekt.id, isti kot projects.external_id), ne
-- tujega kljuca: projekti zivijo tudi lokalno in se v oblak sinhronizirajo,
-- zato bi tuj kljuc padel pri projektu, ki se ni prisel gor.

alter table public.vprasalniki add column if not exists projekt text;
alter table public.vprasalnik_odgovori add column if not exists projekt text;

create index if not exists vprasalnik_odgovori_projekt_idx
  on public.vprasalnik_odgovori (organization_id, projekt);

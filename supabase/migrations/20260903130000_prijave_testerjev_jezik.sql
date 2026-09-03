-- Jezik testerja ob prijavi.
--
-- navodila() ob sprejemu je bilo trdo zapisano v slovenscini, ceprav se na
-- /en/kalkulator/testiranje prijavljajo tudi tujejezicni obiskovalci. Jezika
-- se ni dalo izbrati, ker se ob prijavi ni nikoli beležil — zato ga zdaj
-- shranimo, ne da bi ga bilo treba ugibati (Tina, 3. 9. 2026).
alter table public.beta_prijave
  add column if not exists jezik text not null default 'sl' check (jezik in ('sl', 'en'));

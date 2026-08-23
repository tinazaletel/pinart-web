-- Valuta stroška: znesek se vpiše NEPOSREDNO v izbrani valuti (npr. SaaS naročnine v USD),
-- brez preračuna tečaja. Vsote v aplikaciji seštejejo samo EUR, tuje valute se izpišejo
-- ob vsoti posebej. Nazaj združljivo: obstoječe vrstice dobijo privzeto 'eur'.
-- ODVISNOST: public.expenses iz 20260718234000_pinart_flow_foundation.sql mora obstajati.
alter table if exists public.expenses
  add column if not exists currency text not null default 'eur';

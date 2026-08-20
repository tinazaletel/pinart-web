-- Enotni obrazec stroškov: nova polja so nazaj združljiva.
-- ODVISNOST: public.expenses iz 20260718234000_pinart_flow_foundation.sql mora obstajati.
alter table if exists public.expenses
  add column if not exists expense_period text not null default 'enkratni';

alter table if exists public.expenses
  add column if not exists tags jsonb not null default '[]'::jsonb;

do $$ begin
  alter table public.expenses add constraint expenses_period_check
    check (expense_period in ('enkratni', 'mesecni', 'letni'));
exception when duplicate_object then null;
end $$;

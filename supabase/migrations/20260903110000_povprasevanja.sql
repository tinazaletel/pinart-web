-- Povpraševanja s spletne strani.
--
-- Doslej so šla SAMO na Google Sheets webhook, ki je nato poslal mail. Če je
-- skript padel ali mu je pošla kvota, je stranka izginila brez sledu in tega
-- ni videl nihče — ne obiskovalec, ne Tina. Zdaj se najprej zapiše k nam,
-- šele nato posreduje naprej (Tina, 3. 9. 2026).
create table if not exists public.povprasevanja (
  id uuid primary key default gen_random_uuid()
);

alter table public.povprasevanja
  add column if not exists ime text,
  add column if not exists email text,
  add column if not exists podjetje text,
  add column if not exists brief text,
  add column if not exists proracun text,
  add column if not exists termin text,
  add column if not exists vrsta text,
  add column if not exists jezik text,
  add column if not exists vir text,
  add column if not exists posredovano boolean not null default false,
  add column if not exists napaka text,
  add column if not exists created_at timestamptz not null default now();

create index if not exists povprasevanja_created_idx
  on public.povprasevanja (created_at desc);

alter table public.povprasevanja enable row level security;
revoke all on public.povprasevanja from public, anon, authenticated;
grant all on public.povprasevanja to service_role;

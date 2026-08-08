-- Belezenje obiskov PRIJAVLJENIH uporabnikov (engagement za beto: kdo se vraca).
-- Loceno od anonimne cenovne analitike (public.dogodki) — tu gre za LASTNO aktivnost
-- prijavljenega uporabnika (ni anonimno; pokrito z namenom "zagotavljanje in
-- izboljsevanje storitve" v politiki zasebnosti). Admin bere prek service-role.

create table if not exists public.obiski (
  user_id uuid primary key references auth.users(id) on delete cascade,
  prvi_obisk timestamptz not null default now(),
  zadnji_obisk timestamptz not null default now(),
  zadnji_dan date not null default current_date,
  dni integer not null default 1,      -- stevilo RAZLICNIH dni aktivnosti
  odprtij integer not null default 1   -- skupaj sej / odprtij aplikacije
);

alter table public.obiski enable row level security;

-- Uporabnik vidi samo svoj zapis; vpisovanje gre izkljucno prek RPC spodaj.
drop policy if exists obiski_select_self on public.obiski;
create policy obiski_select_self on public.obiski
  for select using (auth.uid() = user_id);

-- Zabelezi obisk: prvi obisk vstavi, sicer poveca odprtij in (ce je nov dan) dni.
create or replace function public.zabelezi_obisk()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    return;
  end if;
  insert into public.obiski (user_id)
  values (uid)
  on conflict (user_id) do update set
    zadnji_obisk = now(),
    odprtij = obiski.odprtij + 1,
    dni = obiski.dni + (case when obiski.zadnji_dan < current_date then 1 else 0 end),
    zadnji_dan = current_date;
end;
$$;

grant execute on function public.zabelezi_obisk() to authenticated;

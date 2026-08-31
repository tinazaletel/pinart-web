-- ČAS NA STRANI (Tina, 31. 8. 2026: »želim videti, koliko časa se je nekdo
-- zadržal na moji strani«).
--
-- Doslej je `obiski` štel dneve in odprtja — koliko časa je nekdo v aplikaciji
-- res preživel, pa ne. Dodamo sekunde in RPC, ki jih prišteva.
--
-- Ta datoteka je NAMENOMA ponovljiva in vsebuje tudi prvotno tabelo: če
-- migracija iz avgusta ni bila pognana, jo ta ustvari; če je bila, ne naredi
-- ničesar. (Tak primer smo že imeli pri organization_invites.)

create table if not exists public.obiski (
  user_id uuid primary key references auth.users(id) on delete cascade,
  prvi_obisk timestamptz not null default now(),
  zadnji_obisk timestamptz not null default now(),
  zadnji_dan date not null default current_date,
  dni integer not null default 1,
  odprtij integer not null default 1
);

alter table public.obiski add column if not exists sekunde integer not null default 0;

alter table public.obiski enable row level security;

drop policy if exists obiski_select_self on public.obiski;
create policy obiski_select_self on public.obiski
  for select using (auth.uid() = user_id);

-- Obisk (odprtje aplikacije): enako kot prej.
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

-- Čas: odjemalec pošlje, koliko sekund je bil zavihek VIDEN od zadnjega
-- sporočila. Zgornja meja 600 s na klic je varovalka: brez nje bi pokvarjen ali
-- podtaknjen klic v eni potezi zapisal ure, ki jih ni bilo. Podatek je merilo
-- zanimanja, ne obračun — grobi približek je dovolj, laž pa ni.
create or replace function public.zabelezi_cas(sek integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  dodaj integer := least(greatest(coalesce(sek, 0), 0), 600);
begin
  if uid is null or dodaj = 0 then
    return;
  end if;
  insert into public.obiski (user_id, sekunde)
  values (uid, dodaj)
  on conflict (user_id) do update set
    sekunde = obiski.sekunde + dodaj,
    zadnji_obisk = now(),
    dni = obiski.dni + (case when obiski.zadnji_dan < current_date then 1 else 0 end),
    zadnji_dan = current_date;
end;
$$;

grant execute on function public.zabelezi_obisk() to authenticated;
grant execute on function public.zabelezi_cas(integer) to authenticated;

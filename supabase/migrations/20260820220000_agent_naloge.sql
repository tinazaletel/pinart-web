-- VRSTA NALOG ZA AGENTE — delo, ki teče brez odprtega zavihka.
--
-- Brskalnik ne more delati v ozadju: ko uporabnica zapre okno, se JavaScript
-- ustavi. Zato naloga tu ni "klic, ki ga čakamo", ampak ZAPIS. Uporabnica ga
-- odloži, urnik (Vercel Cron) ga pobere, opravi in vpiše odgovor nazaj.
--
-- Bistvo je atomsko prevzemanje: urnik se lahko sproži, preden se prejšnji
-- zagon konča, in dve izvajanji ne smeta prijeti iste naloge. To rešuje
-- funkcija prevzemi_agent_naloge() s FOR UPDATE SKIP LOCKED.

create table if not exists public.agent_naloge (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null,

  besedilo text not null,
  -- NULL pomeni Pupa (naš ponudnik). Sicer povezava iz "Moj AI".
  connection_id uuid references public.organization_ai_connections(id) on delete set null,
  -- Neobvezna vez na projekt, da odgovor lahko pristane, kjer mu je mesto.
  projekt_external_id text,

  stanje text not null default 'caka'
    check (stanje in ('caka', 'dela', 'gotovo', 'napaka', 'preklicano')),
  odgovor text,
  napaka text,
  model text,

  -- Koliko zagonov je naloga že doživela. Po treh odnehamo; brez tega bi
  -- naloga, ki vedno pade, večno jedla urnik.
  poskusi integer not null default 0,

  created_at timestamptz not null default now(),
  zacetek timestamptz,
  konec timestamptz,
  deleted_at timestamptz
);

-- Urnik bere samo čakajoče, po vrsti prihoda.
create index if not exists agent_naloge_vrsta_idx
  on public.agent_naloge (stanje, created_at)
  where deleted_at is null;

-- Vmesnik bere svoje naloge, najnovejše zgoraj.
create index if not exists agent_naloge_org_idx
  on public.agent_naloge (organization_id, created_at desc);

alter table public.agent_naloge enable row level security;

-- Naloge so osebne, ne skupne: agent dela v uporabničinem imenu in odgovor
-- lahko vsebuje karkoli, kar je vpisala. Zato pogoj ni le organizacija.
drop policy if exists agent_naloge_svoje on public.agent_naloge;
create policy agent_naloge_svoje on public.agent_naloge
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- PREVZEM: označi do :kolicina čakajočih nalog kot "dela" in jih vrne.
-- SKIP LOCKED poskrbi, da vzporedni zagon vzame NASLEDNJE, ne istih.
create or replace function public.prevzemi_agent_naloge(kolicina integer)
returns setof public.agent_naloge
language sql
security definer
set search_path = public
as $$
  update public.agent_naloge
     set stanje = 'dela',
         zacetek = now(),
         poskusi = poskusi + 1
   where id in (
     select id from public.agent_naloge
      where stanje = 'caka'
        and deleted_at is null
      order by created_at
      limit greatest(kolicina, 0)
      for update skip locked
   )
  returning *;
$$;

-- REŠEVANJE OBTIČALIH: če se izvajanje ustavi sredi poti (funkcija poteče,
-- postopek pade), naloga za vedno obvisi v "dela". Po petih minutah jo damo
-- nazaj v vrsto, po treh poskusih pa priznamo poraz — tiho ponavljanje v
-- neskončnost je slabše od jasne napake.
create or replace function public.osvezi_obticale_naloge()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  vrnjenih integer;
begin
  update public.agent_naloge
     set stanje = case when poskusi >= 3 then 'napaka' else 'caka' end,
         napaka = case when poskusi >= 3
                       then 'Naloge ni bilo mogoče dokončati po treh poskusih.'
                       else napaka end,
         konec = case when poskusi >= 3 then now() else konec end
   where stanje = 'dela'
     and deleted_at is null
     and zacetek < now() - interval '5 minutes';
  get diagnostics vrnjenih = row_count;
  return vrnjenih;
end;
$$;

revoke all on function public.prevzemi_agent_naloge(integer) from public, anon, authenticated;
revoke all on function public.osvezi_obticale_naloge() from public, anon, authenticated;
grant execute on function public.prevzemi_agent_naloge(integer) to service_role;
grant execute on function public.osvezi_obticale_naloge() to service_role;
grant all on public.agent_naloge to service_role;

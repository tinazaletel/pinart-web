-- KATALOGI ORGANIZACIJE V OBLAK (2026-08-20)
--
-- Pet manjsih shramb je do zdaj zivelo SAMO v localStorage:
--   pinflow_sodelavci      (lib/sodelavci.ts)  -> ekipa za dodeljevanje nalog
--   pinflow_oddelki        (lib/oddelki.ts)    -> oddelki studia
--   pinflow_podrocja       (lib/podrocja.ts)   -> podrocja dela (oznake)
--   pinart-flow-postavke   (lib/postavke.ts)   -> ponavljajoce se postavke
--   pinart-flow-produkti   (lib/produkti.ts)   -> produkti/materiali v ceniku
-- Zato sodelavec na drugi napravi ni videl ne ekipe ne cenika, kar podre
-- dodeljevanje nalog in vstavljanje postavk v ponudbo.
--
-- POSEBNOST proti projektom/nalogam: to NISO zapisi po uporabniku, ampak
-- NASTAVITVE oz. KATALOGI cele organizacije. Zato ni external_id/nagrobnikov,
-- ampak ena vrstica na (organizacija, katalog) in celoten seznam v data jsonb.
-- Vzorec je isti kot public.naloge_nastavitve (20260820021000).
--
-- ZAKAJ ENA TABELA ZA VSEH PET in ne pet skoraj enakih: vse imajo isto obliko
-- (seznam -> jsonb), isto vidnost in isto razsodbo ob sporu (novejsi
-- updated_at zmaga). Locevanje po stolpcu kljuc pomeni, da nov katalog ne
-- potrebuje nove migracije. Namenoma BREZ check omejitve na kljuc, da lahko
-- lib/katalogiOblak.ts doda sesti katalog brez posega v bazo.
--
-- updated_at postavlja ODJEMALEC (cas lokalne spremembe), ne baza — sicer bi
-- vsak zapis izgledal kot najnovejsi in bi zadnja naprava, ki se prijavi,
-- povozila tujo spremembo. Zato tu ni sprozilca (trigger) za updated_at.

create table if not exists public.org_katalogi (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  -- 'sodelavci' | 'oddelki' | 'podrocja' | 'postavke' | 'produkti'
  kljuc text not null,
  data jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (organization_id, kljuc)
);

-- Dodaten indeks na organization_id ni potreben: primarni kljuc se zacne z njim.

alter table public.org_katalogi enable row level security;

-- Vidnost = clanstvo. To so DELOVNI katalogi (imena sodelavcev, oddelki,
-- postavke cenika), ne financni podatki, zato tu ni sme_videti_zapis: vsak
-- clan mora videti in urejati isti seznam, sicer ne more dodeliti naloge ne
-- vstaviti postavke v ponudbo.
drop policy if exists "clani read org_katalogi" on public.org_katalogi;
create policy "clani read org_katalogi" on public.org_katalogi for select
  using (public.is_organization_member(organization_id));

drop policy if exists "clani insert org_katalogi" on public.org_katalogi;
create policy "clani insert org_katalogi" on public.org_katalogi for insert
  with check (public.is_organization_member(organization_id));

drop policy if exists "clani update org_katalogi" on public.org_katalogi;
create policy "clani update org_katalogi" on public.org_katalogi for update
  using (public.is_organization_member(organization_id))
  with check (public.is_organization_member(organization_id));

-- Brisanje CELE vrstice (= celega kataloga) je administrativno dejanje; odjemalec
-- tega ne pocne nikoli (prazen seznam se zapise kot data = '[]').
drop policy if exists "admins delete org_katalogi" on public.org_katalogi;
create policy "admins delete org_katalogi" on public.org_katalogi for delete
  using (public.is_organization_admin(organization_id));

grant select, insert, update, delete on public.org_katalogi to authenticated;
revoke all on public.org_katalogi from anon;
grant all on public.org_katalogi to service_role;

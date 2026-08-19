-- VIDEZ DOKUMENTOV V OBLAK (2026-08-20)
--
-- Videz dokumentov (predloge: barva, pisava, logo, glava/noga, podlogi,
-- nalozena lastna pisava) je do zdaj zivel SAMO v localStorage, v zapisu
-- pinart-kalkulator-v2 (polja dokPredloge / dokAktivnaPredloga / dokBarva /
-- dokFont) in pinart-kalkulator-logo. Zato je bil vezan na eno napravo in en
-- brskalnik — ponudba, poslana z drugega racunalnika, je izgledala drugace.
--
-- POSEBNOST proti ostalim zbirkam: to NI zapis na uporabnika in ni zbirka
-- zapisov, ampak ENA nastavitev ORGANIZACIJE — znamka podjetja. Zato ena
-- vrstica na organizacijo (organization_id je hkrati primarni kljuc) in ne
-- external_id/upsert vzorec iz projects.
--
-- Celotna slika gre v data jsonb ({ predloge: DokPredloga[], aktivnaId: string }),
-- da ob vsakem novem polju predloge (nova podloga, nova glava) ni potrebna
-- nova migracija. updated_at je merodajen za razsodbo, katera stran je novejsa
-- (lib/dokVidezOblak.ts).
--
-- OPOZORILO O VELIKOSTI: predloga lahko nosi data: URI-je (logo, platnica,
-- ozadje in predvsem nalozena lastna pisava, do ~3 MB v base64). jsonb to
-- prenese (meja polja je 1 GB, TOAST vsebino se stisne), tesnejsa meja je
-- localStorage (~5 MB na izvor) in morebitna meja velikosti zahtevka na
-- Supabase prehodu. Ce se to izkaze za problem, je resitev Storage — o tem
-- odloca lastnica, ta migracija tega NE predpostavlja.

create table if not exists public.dok_videz (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.dok_videz enable row level security;

-- Berejo VSI clani organizacije: sodelavec mora videti pravi videz, sicer bi
-- iz njegovega racuna odsli dokumenti v napacni znamki.
drop policy if exists "clani read dok_videz" on public.dok_videz;
create policy "clani read dok_videz" on public.dok_videz for select
  using (public.is_organization_member(organization_id));

-- Pisejo SAMO admin/lastnik: videz dokumentov je znamka podjetja in je
-- sodelavec ne sme spreminjati.
drop policy if exists "admins insert dok_videz" on public.dok_videz;
create policy "admins insert dok_videz" on public.dok_videz for insert
  with check (public.is_organization_admin(organization_id));

drop policy if exists "admins update dok_videz" on public.dok_videz;
create policy "admins update dok_videz" on public.dok_videz for update
  using (public.is_organization_admin(organization_id))
  with check (public.is_organization_admin(organization_id));

drop policy if exists "admins delete dok_videz" on public.dok_videz;
create policy "admins delete dok_videz" on public.dok_videz for delete
  using (public.is_organization_admin(organization_id));

grant select, insert, update, delete on public.dok_videz to authenticated;
revoke all on public.dok_videz from anon;

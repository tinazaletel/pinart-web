-- VPRAŠALNIKI ZA STRANKE (Tina, 31. 8. 2026)
--
-- V Marketingu je kartica »Vprašalnik« obljubljala obrazec, klik pa je odprl
-- navadno kampanjo. To je tabela za pravo stvar: sestaviš vprašanja, dobiš
-- povezavo, stranka jo izpolni brez prijave, odgovori pridejo k tebi.
--
-- Zakaj tu NI politik za anonimni vpis: javen INSERT v tabelo je najbolj
-- občutljiva stvar, kar jih premore ta aplikacija — kdorkoli na internetu bi
-- lahko pisal v bazo. Zato gre javna pot skozi strežniško API pot, ki najprej
-- preveri žeton, in šele nato piše s service-role ključem. Enak vzorec kot
-- portal za stranko. Anonimni odjemalec do teh tabel nima ničesar.

create table if not exists public.vprasalniki (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  naslov text not null,
  uvod text,
  -- [{ id, tip, besedilo, obvezno, moznosti[] }] — obliko preverja strežnik
  vprasanja jsonb not null default '[]'::jsonb,
  -- SHA-256 žetona iz povezave; žetona samega ne hranimo (glej lib/portalZeton)
  zeton_zgostitev text unique,
  -- zaprt vprašalnik povezave ne sprejme več, odgovori ostanejo
  odprt boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vprasalniki_org_idx
  on public.vprasalniki (organization_id, created_at desc);

create table if not exists public.vprasalnik_odgovori (
  id uuid primary key default gen_random_uuid(),
  vprasalnik_id uuid not null references public.vprasalniki(id) on delete cascade,
  -- podvojeno iz vprašalnika: RLS tako ne rabi stika, branje je hitrejše
  organization_id uuid not null references public.organizations(id) on delete cascade,
  -- { "<id vprašanja>": "odgovor" }
  odgovori jsonb not null default '{}'::jsonb,
  -- izluščeno iz odgovorov, da seznam ni brez imena
  ime text,
  eposta text,
  podjetje text,
  -- pregledano = videla si ga; ne brišemo, samo umaknemo iz »novo«
  pregledano boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists vprasalnik_odgovori_idx
  on public.vprasalnik_odgovori (organization_id, created_at desc);

alter table public.vprasalniki enable row level security;
alter table public.vprasalnik_odgovori enable row level security;

-- Vprašalnike ureja podjetje, ki jim pripadajo.
drop policy if exists vprasalniki_clan on public.vprasalniki;
create policy vprasalniki_clan on public.vprasalniki
  for all using (public.is_organization_member(organization_id))
  with check (public.is_organization_member(organization_id));

-- Odgovore član BERE in označi kot pregledane; piše jih strežnik.
drop policy if exists odgovori_clan_bere on public.vprasalnik_odgovori;
create policy odgovori_clan_bere on public.vprasalnik_odgovori
  for select using (public.is_organization_member(organization_id));

drop policy if exists odgovori_clan_ureja on public.vprasalnik_odgovori;
create policy odgovori_clan_ureja on public.vprasalnik_odgovori
  for update using (public.is_organization_member(organization_id))
  with check (public.is_organization_member(organization_id));

drop policy if exists odgovori_clan_brise on public.vprasalnik_odgovori;
create policy odgovori_clan_brise on public.vprasalnik_odgovori
  for delete using (public.is_organization_member(organization_id));

grant select, insert, update, delete on public.vprasalniki to authenticated;
grant select, update, delete on public.vprasalnik_odgovori to authenticated;
-- anon namenoma nima ničesar: javna pot teče prek /api/vprasalnik/<zeton>

-- ─────────────────────────────────────────────────────────────────────────────
-- SEF AVTORSTVA — OVERJEN CASOVNI ZIG (RFC 3161)
--
-- Sef (components/SefAvtorstvaWorkspace.tsx) je do zdaj zivel SAMO v
-- localStorage pod kljucem `pinart-sef-avtorstva`: zgostitev (SHA-256) datoteke
-- + datum, ki ga postavimo MI. Prav ta datum je pravna sibkost — nasprotna
-- stran upraviceno ugovarja, da smo si ga izmislili.
--
-- Ta migracija naredi dvoje:
--   1) Sef dobi svojo tabelo v bazi (do zdaj je ni bilo — zapisa, ki ga ni v
--      bazi, ni mogoce zigosati s streznika).
--   2) Doda stolpce za overjen casovni zig: zeton, cas, streznik in stanje.
--
-- Stolpci so dodani z `add column if not exists`, da migracija naredi pravo
-- stvar tudi, ce tabela v kaksnem okolju ze obstaja.
--
-- KAJ GRE NAVZVEN: ob zigosanju gre na neodvisni streznik SAMO 32 bajtov
-- zgostitve. Nikoli datoteka, ime datoteke, naslov dela ali ime stranke — TSA
-- ne izve, KAJ je bilo zigosano. Zato je tudi `zgostitev` edini stolpec, ki ga
-- API pot /api/sef/zig sploh prebere.
--
-- Vzorec tabele (external_id, data jsonb, mehko brisanje, RLS prek
-- sme_videti_zapis) je namenoma ISTI kot pri nalogah in projektih:
--   20260819100000_projekti_v_oblak.sql, 20260820021000_naloge_oblak.sql
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.sef_zapisi (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  -- lokalni Zapis.id iz localStorage (pinart-sef-avtorstva)
  external_id text not null,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  naslov text not null default '',
  datoteka text,
  -- SHA-256 v hex zapisu; edino, kar gre kdaj navzven
  zgostitev text not null,
  orodje text,
  kategorija text,
  -- cas, ki ga je zabelezil Flow (nas datum — dokaz je sele zig spodaj)
  zabelezeno timestamptz not null default now(),
  -- ostalo (opombe, posnetek procesa, velikost, tip) — da nova rubrika ne
  -- zahteva nove migracije
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, external_id)
);

-- ── OVERJEN CASOVNI ZIG ──────────────────────────────────────────────────────
-- zig_zeton    cel TimeStampResp (RFC 3161) v base64; iz njega se da cas
--              PREBRATI in PREVERITI tudi brez Flowa (openssl ts -verify)
-- zig_cas      cas iz zetona (genTime), ne nas cas
-- zig_streznik naslov TSA, ki je zeton izdala (za preverjanje certifikata)
-- zig_stanje   'caka' | 'overjeno' | 'napaka'
alter table public.sef_zapisi add column if not exists zig_zeton text;
alter table public.sef_zapisi add column if not exists zig_cas timestamptz;
alter table public.sef_zapisi add column if not exists zig_streznik text;
alter table public.sef_zapisi add column if not exists zig_stanje text not null default 'caka';

alter table public.sef_zapisi drop constraint if exists sef_zapisi_zig_stanje_check;
alter table public.sef_zapisi add constraint sef_zapisi_zig_stanje_check
  check (zig_stanje in ('caka', 'overjeno', 'napaka'));

create index if not exists sef_zapisi_org_idx on public.sef_zapisi (organization_id);
-- iskanje po prstnem odtisu: »ali je to delo ze v sefu?«
create index if not exists sef_zapisi_zgostitev_idx on public.sef_zapisi (organization_id, zgostitev);

alter table public.sef_zapisi enable row level security;

-- Vidnost: enako kot naloge/projekti — admin/lastnik vse; clan svoje ustvarjene
-- ali izrecno deljene. Sef je dokaz o AVTORSTVU, zato je omejitev na svoje
-- zapise tu se bolj na mestu kot drugod.
drop policy if exists "clani read scoped sef" on public.sef_zapisi;
create policy "clani read scoped sef" on public.sef_zapisi for select
  using (public.sme_videti_zapis(organization_id, 'sef_zapisi', id, created_by, null::uuid));

drop policy if exists "clani insert sef" on public.sef_zapisi;
create policy "clani insert sef" on public.sef_zapisi for insert
  with check (public.is_organization_member(organization_id));

drop policy if exists "clani update scoped sef" on public.sef_zapisi;
create policy "clani update scoped sef" on public.sef_zapisi for update
  using (public.sme_videti_zapis(organization_id, 'sef_zapisi', id, created_by, null::uuid))
  with check (public.is_organization_member(organization_id));

drop policy if exists "admins delete sef" on public.sef_zapisi;
create policy "admins delete sef" on public.sef_zapisi for delete
  using (public.is_organization_admin(organization_id));

grant select, insert, update, delete on public.sef_zapisi to authenticated;
revoke all on public.sef_zapisi from anon;

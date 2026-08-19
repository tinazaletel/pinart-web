-- SESTANKI + CRM DNEVNIK V OBLAK (2026-08-20)
--
-- Dve zadnji večji lokalni shrambi, ki sta živeli SAMO v localStorage:
--   1) sestanki/klici v Koledarju (lib/sestanki.ts, ključ pinflow_sestanki),
--   2) dnevnik stranke — klici, sestanki, dogovori (lib/dnevnik.ts).
-- Zato termina, dogovorjenega na telefonu, ni videla druga naprava ne sodelavec,
-- kar je pri CRM-ju (stranka kot vozlišče) bistveno.
--
-- Vzorec je enak kot pri projektih (migracija 20260819100000): external_id =
-- lokalni id zapisa, upsert po organization_id+external_id, ob sporu zmaga
-- novejši updated_at, brisanje potuje kot nagrobnik (deleted_at). Jedrni
-- stolpci so samo tisti, po katerih bomo filtrirali ali vezali pravice; celoten
-- zapis gre v data jsonb, da nova polja ne zahtevajo nove migracije.

-- ── 1) SESTANKI IN KLICI (koledar) ──────────────────────────────────────────
-- Nimajo stranke kot obveznega polja (interni termin, osebna zadolžitev), zato
-- vidnost teče samo po lastniku/deljenju: sme_videti_zapis(..., null).
create table if not exists public.sestanki (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  external_id text not null,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  naslov text not null default '',
  -- začetek termina (datum + ura iz lokalnega zapisa, zloženo v en trenutek) —
  -- jedrni stolpec, da se da kdaj filtrirati po obdobju brez branja jsonb
  zacetek timestamptz,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, external_id)
);

create index if not exists sestanki_org_idx on public.sestanki (organization_id);
create index if not exists sestanki_zacetek_idx on public.sestanki (organization_id, zacetek);

alter table public.sestanki enable row level security;

drop policy if exists "clani read scoped sestanki" on public.sestanki;
create policy "clani read scoped sestanki" on public.sestanki for select
  using (public.sme_videti_zapis(organization_id, 'sestanki', id, created_by, null));

drop policy if exists "clani insert sestanki" on public.sestanki;
create policy "clani insert sestanki" on public.sestanki for insert
  with check (public.is_organization_member(organization_id));

drop policy if exists "clani update scoped sestanki" on public.sestanki;
create policy "clani update scoped sestanki" on public.sestanki for update
  using (public.sme_videti_zapis(organization_id, 'sestanki', id, created_by, null))
  with check (public.is_organization_member(organization_id));

drop policy if exists "admins delete sestanki" on public.sestanki;
create policy "admins delete sestanki" on public.sestanki for delete
  using (public.is_organization_admin(organization_id));

grant select, insert, update, delete on public.sestanki to authenticated;
revoke all on public.sestanki from anon;

-- ── 2) CRM DNEVNIK STRANKE ──────────────────────────────────────────────────
-- Vsak vnos je vezan na stranko, zato gre client_id v sme_videti_zapis kot
-- related_client: ko admin deli STRANKO s članom, se članu samodejno odpre tudi
-- njen dnevnik — brez ločenega deljenja vsakega zapisa posebej.
-- on delete cascade: brez stranke dnevnik nima pomena.
create table if not exists public.crm_dnevnik (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  external_id text not null,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  client_id uuid references public.clients(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, external_id)
);

create index if not exists crm_dnevnik_org_idx on public.crm_dnevnik (organization_id);
create index if not exists crm_dnevnik_client_idx on public.crm_dnevnik (client_id);

alter table public.crm_dnevnik enable row level security;

drop policy if exists "clani read scoped crm_dnevnik" on public.crm_dnevnik;
create policy "clani read scoped crm_dnevnik" on public.crm_dnevnik for select
  using (public.sme_videti_zapis(organization_id, 'crm_dnevnik', id, created_by, client_id));

drop policy if exists "clani insert crm_dnevnik" on public.crm_dnevnik;
create policy "clani insert crm_dnevnik" on public.crm_dnevnik for insert
  with check (public.is_organization_member(organization_id));

drop policy if exists "clani update scoped crm_dnevnik" on public.crm_dnevnik;
create policy "clani update scoped crm_dnevnik" on public.crm_dnevnik for update
  using (public.sme_videti_zapis(organization_id, 'crm_dnevnik', id, created_by, client_id))
  with check (public.is_organization_member(organization_id));

drop policy if exists "admins delete crm_dnevnik" on public.crm_dnevnik;
create policy "admins delete crm_dnevnik" on public.crm_dnevnik for delete
  using (public.is_organization_admin(organization_id));

grant select, insert, update, delete on public.crm_dnevnik to authenticated;
revoke all on public.crm_dnevnik from anon;

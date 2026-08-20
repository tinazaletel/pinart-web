-- PORTAL ZA STRANKO (20. 8. 2026)
--
-- Stranka dobi povezavo in vidi projekt: stanje, brief, roke, povezave (Figma,
-- Drive) in dopisovanje z njo. NE vidi ponudb, pogodb, računov, stroškov,
-- notranjega klepeta z ekipo ne cenika.
--
-- Brez prijave in brez registracije — stranka ne bo delala računa. Dostop nosi
-- žeton v povezavi, zato je ta tabela edino mesto, kjer se odloča, kdo sme
-- videti kaj. Pravila:
--   · žeton se NE hrani v čistopisu, ampak kot SHA-256 zgostitev (kdor dobi
--     bazo, ne dobi delujočih povezav),
--   · povezava se prekliče (revoked_at), ne briše — ostane sled, komu si jo dala,
--   · neobvezen rok veljavnosti (expires_at).
--
-- Vrstice bere in piše SAMO strežnik prek service-role ključa: anonimni obiskovalec
-- ne sme videti niti obstoja te tabele.

create table if not exists public.portal_dostopi (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  /* projekt, kot ga pozna aplikacija (Projekt.id = projects.external_id) */
  projekt_external_id text not null,
  /* zgostitev žetona iz povezave; unique, da je iskanje eno samo in v konstantnem času */
  zeton_zgostitev text not null,
  /* ime prejemnika samo za tvoj pregled (»Luna, Ana«) — stranki se ne prikaže */
  prejemnik text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  last_seen_at timestamptz,
  ogledov integer not null default 0,
  unique (zeton_zgostitev)
);

create index if not exists portal_dostopi_projekt_idx
  on public.portal_dostopi (organization_id, projekt_external_id);

alter table public.portal_dostopi enable row level security;

-- Lastnica in admin vidita, komu sta dali povezavo, in jo lahko prekličeta.
-- Član ne — deljenje navzven je odločitev lastnika.
drop policy if exists "admins read portal dostopi" on public.portal_dostopi;
create policy "admins read portal dostopi" on public.portal_dostopi for select
  using (public.is_organization_admin(organization_id));

drop policy if exists "admins insert portal dostopi" on public.portal_dostopi;
create policy "admins insert portal dostopi" on public.portal_dostopi for insert
  with check (public.is_organization_admin(organization_id));

drop policy if exists "admins update portal dostopi" on public.portal_dostopi;
create policy "admins update portal dostopi" on public.portal_dostopi for update
  using (public.is_organization_admin(organization_id))
  with check (public.is_organization_admin(organization_id));

grant select, insert, update on public.portal_dostopi to authenticated;
revoke all on public.portal_dostopi from anon;
grant all on public.portal_dostopi to service_role;

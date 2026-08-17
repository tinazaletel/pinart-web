-- ─────────────────────────────────────────────────────────────────────────────
-- EKIPA — Faza 4 (omejena vidljivost), STAGE 1: TEMELJ
--
-- Cilj Faze 4: član vidi le SVOJE zapise + kar je DELJENO z njim; admin/lastnik
-- vidita vse. Trenutno vsak član vidi VSE v organizaciji (RLS scopa le po org).
--
-- Ta migracija je NAMENOMA samo ADDITIVNA in NE spremeni nobene obstoječe RLS
-- politike -> NIČ ne spremeni trenutnega dostopa (varno tudi za prod). Doda:
--   1) created_by (kdo je zapis ustvaril) na ključne tabele,
--   2) record_shares (eksplicitno deljenje zapisa s članom),
--   3) helper sme_videti_zapis().
-- Dejanski PREKLOP vidljivosti (member: vidi vse -> vidi svoje+deljeno) pride v
-- STAGE 2 kot ločena migracija, ki jo TESTIRAMO na demo/2. računu PRED produkcijo.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) created_by — privzeto trenutni uporabnik (za NOVE zapise; stari ostanejo NULL)
alter table public.clients   add column if not exists created_by uuid references auth.users(id) on delete set null default auth.uid();
alter table public.offers    add column if not exists created_by uuid references auth.users(id) on delete set null default auth.uid();
alter table public.invoices  add column if not exists created_by uuid references auth.users(id) on delete set null default auth.uid();
alter table public.contracts add column if not exists created_by uuid references auth.users(id) on delete set null default auth.uid();
alter table public.retainers add column if not exists created_by uuid references auth.users(id) on delete set null default auth.uid();
alter table public.expenses  add column if not exists created_by uuid references auth.users(id) on delete set null default auth.uid();

-- 2) eksplicitno deljenje zapisa s članom
create table if not exists public.record_shares (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  resource text not null,          -- 'clients' | 'offers' | 'invoices' | 'contracts' | 'retainers' | 'expenses'
  record_id uuid not null,
  shared_with uuid not null references auth.users(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (resource, record_id, shared_with)
);
create index if not exists record_shares_lookup_idx on public.record_shares (shared_with, resource, record_id);

alter table public.record_shares enable row level security;
drop policy if exists "admins manage record shares" on public.record_shares;
create policy "admins manage record shares" on public.record_shares for all
  using (public.is_organization_admin(organization_id))
  with check (public.is_organization_admin(organization_id));
drop policy if exists "members read own record shares" on public.record_shares;
create policy "members read own record shares" on public.record_shares for select
  using (shared_with = auth.uid() or public.is_organization_admin(organization_id));

-- 3) helper: sme član videti ta zapis? (admin/lastnik vse; sicer svoj ustvarjen ali deljen z njim)
create or replace function public.sme_videti_zapis(target_org uuid, res text, rec_id uuid, owner uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_organization_admin(target_org)
     or owner = auth.uid()
     or exists (
       select 1 from public.record_shares rs
       where rs.resource = res and rs.record_id = rec_id and rs.shared_with = auth.uid()
     );
$$;
grant execute on function public.sme_videti_zapis(uuid, text, uuid, uuid) to authenticated;
grant select, insert, update, delete on public.record_shares to authenticated;
revoke all on public.record_shares from anon;

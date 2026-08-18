-- ─────────────────────────────────────────────────────────────────────────────
-- EKIPA — Faza 4 (omejena vidljivost), STAGE 2: PREKLOP VIDLJIVOSTI
--
-- Rabi Stage 1 (created_by, record_shares, sme_videti_zapis). Preklopi člane z
-- "vidi VSE v organizaciji" na "vidi le SVOJE (created_by) + DELJENO z njim".
-- Admin/lastnik vidita in urejata vse; brisanje ostane admin-only.
--
-- ⚠️ NE POŽENI na slepo: demo in prod si delita ISTO bazo, zato ta migracija velja
--    povsod. Poženi jo ŠELE, ko vključiš prvega pravega člana, in TAKOJ preveri:
--    - član vidi le svoje/deljeno,  - ti (admin) vidiš vse,  - deljenje (record_shares) deluje.
--    Rabi tudi UI za deljenje zapisov (Stage 3), sicer člani vidijo le kar sami ustvarijo.
--    Obstoječi zapisi imajo created_by = NULL -> član jih NE vidi (admin da). Po potrebi
--    naredi backfill (npr. na lastnika) LOČENO, premišljeno.
--
-- Idempotentno: drop policy if exists (pokrije foundation IN role-migracijo imena).
-- ─────────────────────────────────────────────────────────────────────────────

-- Pomozni makro-vzorec ponovimo za vsako tabelo (resource = ime tabele).

-- ── clients ──────────────────────────────────────────────────────────────────
drop policy if exists "members manage clients" on public.clients;
drop policy if exists "members read clients" on public.clients;
drop policy if exists "members insert clients" on public.clients;
drop policy if exists "members update clients" on public.clients;
drop policy if exists "admins delete clients" on public.clients;
create policy "clani read scoped clients" on public.clients for select
  using (public.sme_videti_zapis(organization_id, 'clients', id, created_by));
create policy "clani insert clients" on public.clients for insert
  with check (public.is_organization_member(organization_id));
create policy "clani update scoped clients" on public.clients for update
  using (public.sme_videti_zapis(organization_id, 'clients', id, created_by))
  with check (public.is_organization_member(organization_id));
create policy "admins delete clients" on public.clients for delete
  using (public.is_organization_admin(organization_id));

-- ── offers ───────────────────────────────────────────────────────────────────
drop policy if exists "members manage offers" on public.offers;
drop policy if exists "members read offers" on public.offers;
drop policy if exists "members insert offers" on public.offers;
drop policy if exists "members update offers" on public.offers;
drop policy if exists "admins delete offers" on public.offers;
create policy "clani read scoped offers" on public.offers for select
  using (public.sme_videti_zapis(organization_id, 'offers', id, created_by, client_id));
create policy "clani insert offers" on public.offers for insert
  with check (public.is_organization_member(organization_id));
create policy "clani update scoped offers" on public.offers for update
  using (public.sme_videti_zapis(organization_id, 'offers', id, created_by, client_id))
  with check (public.is_organization_member(organization_id));
create policy "admins delete offers" on public.offers for delete
  using (public.is_organization_admin(organization_id));

-- ── invoices ─────────────────────────────────────────────────────────────────
drop policy if exists "members manage invoices" on public.invoices;
drop policy if exists "members read invoices" on public.invoices;
drop policy if exists "members insert invoices" on public.invoices;
drop policy if exists "members update invoices" on public.invoices;
drop policy if exists "admins delete invoices" on public.invoices;
create policy "clani read scoped invoices" on public.invoices for select
  using (public.sme_videti_zapis(organization_id, 'invoices', id, created_by, client_id));
create policy "clani insert invoices" on public.invoices for insert
  with check (public.is_organization_member(organization_id));
create policy "clani update scoped invoices" on public.invoices for update
  using (public.sme_videti_zapis(organization_id, 'invoices', id, created_by, client_id))
  with check (public.is_organization_member(organization_id));
create policy "admins delete invoices" on public.invoices for delete
  using (public.is_organization_admin(organization_id));

-- ── contracts ────────────────────────────────────────────────────────────────
drop policy if exists "members manage contracts" on public.contracts;
drop policy if exists "members read contracts" on public.contracts;
drop policy if exists "members insert contracts" on public.contracts;
drop policy if exists "members update contracts" on public.contracts;
drop policy if exists "admins delete contracts" on public.contracts;
create policy "clani read scoped contracts" on public.contracts for select
  using (public.sme_videti_zapis(organization_id, 'contracts', id, created_by, client_id));
create policy "clani insert contracts" on public.contracts for insert
  with check (public.is_organization_member(organization_id));
create policy "clani update scoped contracts" on public.contracts for update
  using (public.sme_videti_zapis(organization_id, 'contracts', id, created_by, client_id))
  with check (public.is_organization_member(organization_id));
create policy "admins delete contracts" on public.contracts for delete
  using (public.is_organization_admin(organization_id));

-- ── retainers ────────────────────────────────────────────────────────────────
drop policy if exists "members manage retainers" on public.retainers;
drop policy if exists "members read retainers" on public.retainers;
drop policy if exists "members insert retainers" on public.retainers;
drop policy if exists "members update retainers" on public.retainers;
drop policy if exists "admins delete retainers" on public.retainers;
create policy "clani read scoped retainers" on public.retainers for select
  using (public.sme_videti_zapis(organization_id, 'retainers', id, created_by));
create policy "clani insert retainers" on public.retainers for insert
  with check (public.is_organization_member(organization_id));
create policy "clani update scoped retainers" on public.retainers for update
  using (public.sme_videti_zapis(organization_id, 'retainers', id, created_by))
  with check (public.is_organization_member(organization_id));
create policy "admins delete retainers" on public.retainers for delete
  using (public.is_organization_admin(organization_id));

-- ── expenses ─────────────────────────────────────────────────────────────────
drop policy if exists "members manage expenses" on public.expenses;
drop policy if exists "members read expenses" on public.expenses;
drop policy if exists "members insert expenses" on public.expenses;
drop policy if exists "members update expenses" on public.expenses;
drop policy if exists "admins delete expenses" on public.expenses;
create policy "clani read scoped expenses" on public.expenses for select
  using (public.sme_videti_zapis(organization_id, 'expenses', id, created_by, client_id));
create policy "clani insert expenses" on public.expenses for insert
  with check (public.is_organization_member(organization_id));
create policy "clani update scoped expenses" on public.expenses for update
  using (public.sme_videti_zapis(organization_id, 'expenses', id, created_by, client_id))
  with check (public.is_organization_member(organization_id));
create policy "admins delete expenses" on public.expenses for delete
  using (public.is_organization_admin(organization_id));

alter table if exists public.offers
  add column if not exists licenca_do date;

create index if not exists offers_organization_licenca_do_idx
  on public.offers (organization_id, licenca_do);

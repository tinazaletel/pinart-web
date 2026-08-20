-- Popravek je oznaka in stanje na obstojecem sporocilu, ne nova rubrika/tabela.
-- ODVISNOST: public.project_mail in deleted_at morata ze obstajati
-- (20260730170000_project_mail.sql + 20260730180000_project_mail_folders.sql).
alter table if exists public.project_mail
  add column if not exists is_revision boolean not null default false;

alter table if exists public.project_mail
  add column if not exists revision_resolved_at timestamptz;

create index if not exists project_mail_open_revisions_idx
  on public.project_mail (organization_id, occurred_at desc)
  where is_revision = true and revision_resolved_at is null and deleted_at is null;

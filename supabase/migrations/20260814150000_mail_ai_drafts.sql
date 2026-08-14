-- Sledljivost AI osnutkov odgovorov. Osnutek je vedno project_mail.is_draft=true
-- in ga ta funkcionalnost nikoli ne pošlje samodejno.
alter table public.project_mail
  add column if not exists source_mail_id uuid references public.project_mail(id) on delete set null,
  add column if not exists ai_connection_id uuid references public.organization_ai_connections(id) on delete set null,
  add column if not exists draft_generated_by text
    check (draft_generated_by is null or draft_generated_by in ('pupa', 'connected-ai', 'manual'));

create index if not exists project_mail_source_idx
  on public.project_mail (organization_id, source_mail_id);

create index if not exists project_mail_drafts_idx
  on public.project_mail (organization_id, occurred_at desc)
  where is_draft = true and deleted_at is null;

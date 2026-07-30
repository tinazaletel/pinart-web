-- Poštni predal (project_mail): mape Osnutki + Koš.
-- Prejeto = direction 'in', Poslano = direction 'out', Osnutki = is_draft,
-- Koš = deleted_at ni NULL. (Junk namenoma NI — projektna pošta ni spam.)

alter table public.project_mail add column if not exists is_draft boolean not null default false;
alter table public.project_mail add column if not exists deleted_at timestamptz;

create index if not exists project_mail_folder_idx
  on public.project_mail (organization_id, project_external_id, is_draft, deleted_at);

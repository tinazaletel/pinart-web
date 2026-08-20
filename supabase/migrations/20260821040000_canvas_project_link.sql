-- Canvas je poslovni dokument in lahko ostane brez projekta; ko je vezan,
-- zunanji ID kaže na Projekt.id, ki je shranjen v projects.data.
alter table public.business_canvases
  add column if not exists projekt_external_id text;

create index if not exists business_canvases_project_external_idx
  on public.business_canvases (organization_id, projekt_external_id)
  where projekt_external_id is not null and is_archived = false;

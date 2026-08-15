-- En stabilen inbound naslov na projekt. Najprej varno združi morebitne stare
-- podvojene preslikave, nato prepreči nove pri sočasnih zahtevkih.
delete from public.project_inbox starejsi
using public.project_inbox novejsi
where starejsi.organization_id = novejsi.organization_id
  and starejsi.project_external_id = novejsi.project_external_id
  and (
    starejsi.created_at > novejsi.created_at
    or (starejsi.created_at = novejsi.created_at and starejsi.id > novejsi.id)
  );

create unique index if not exists project_inbox_org_project_key
  on public.project_inbox (organization_id, project_external_id);

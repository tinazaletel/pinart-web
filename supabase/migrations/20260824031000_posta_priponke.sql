-- Priponke v pošti. Datoteke gredo v OBSTOJEČE vedro business-documents
-- (sekcija 'mail'), evidenca ostane v public.document_files — isti vzorec kot
-- priloge pri pogodbah in stroških. Tu hranimo samo SEZNAM na sporočilu, da se
-- priponke pokažejo pod mailom, tudi če je datoteka medtem arhivirana.
--
-- ODVISNOSTI: public.project_mail (20260730170000_project_mail.sql),
--             public.document_files (20260811150000_document_files.sql).
--
-- Oblika enega elementa (jsonb objekt):
--   { "ime": "ponudba.pdf", "velikost": 240512, "mime": "application/pdf",
--     "pot": "<org-uuid>/mail/<sklic>/<cas>-ponudba.pdf" }
-- Brez "pot" pomeni: priponka je BILA, a je nismo shranili (npr. prevelik
-- dohodni mail). Tiho izginjanje je najhujše — raje zapišemo, da je obstajala.

alter table if exists public.project_mail
  add column if not exists attachments jsonb not null default '[]'::jsonb;

-- Meje so iste kot v lib/priponke.ts: največ 5 priponk na sporočilo.
-- Velikost posamezne (10 MB) in skupno (20 MB) preveri zaledje, ker je v jsonb
-- ne moremo zanesljivo sešteti brez razpiranja polja.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.project_mail'::regclass
      and conname = 'project_mail_attachments_check'
  ) then
    alter table public.project_mail
      add constraint project_mail_attachments_check
      check (jsonb_typeof(attachments) = 'array' and jsonb_array_length(attachments) <= 5);
  end if;
end $$;

-- Iskanje sporočil s priponkami (kljukica »samo s priponko« v Komunikaciji).
create index if not exists project_mail_attachments_idx
  on public.project_mail (organization_id, occurred_at desc)
  where attachments <> '[]'::jsonb and deleted_at is null;

-- RLS je na project_mail že vklopljena in velja tudi za nov stolpec; politiko
-- vseeno ponovimo (idempotentno), da je ta migracija samostojno berljiva.
alter table public.project_mail enable row level security;

drop policy if exists "members manage project mail" on public.project_mail;
create policy "members manage project mail" on public.project_mail
  for all using (public.is_organization_member(organization_id))
  with check (public.is_organization_member(organization_id));

grant select, insert, update, delete on public.project_mail to authenticated;
grant all on public.project_mail to service_role;

comment on column public.project_mail.attachments is
  'Seznam priponk: ime, velikost, mime in pot v business-documents. Brez "pot" = priponka je bila, a ni shranjena.';

-- Dohodna pošta prinese tudi tipe, ki jih poslovni dokumenti ne poznajo
-- (navadno besedilo, GIF, stari Office, koledarska vabila). Brez njih bi jih
-- Storage zavrnil in priponka bi se izgubila. Seznam je nadgradnja obstoječega
-- iz 20260811150000_document_files.sql — nič se ne odvzame.
-- POZOR: to zrahlja SAMO Storage; aplikacija ima svojo ožjo bel listo končnic
-- (ALLOWED_BUSINESS_DOCUMENT_TYPES v lib/pinartFlowCloud.ts) in črno listo
-- izvršljivih končnic (PREPOVEDANE_KONCNICE v lib/priponke.ts).
update storage.buckets
set allowed_mime_types = array[
      'application/pdf', 'image/png', 'image/jpeg', 'image/webp',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv', 'application/csv', 'application/zip',
      'application/x-zip-compressed',
      'image/gif', 'image/heic',
      'text/plain', 'text/calendar', 'application/rtf',
      'application/msword', 'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ]
where id = 'business-documents';

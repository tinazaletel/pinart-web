-- Evidenca zasebnih poslovnih dokumentov. Dejanski backup/restore zagotavlja
-- Supabase; ta tabela omogoca nadzor, izvoz seznama in prihodnji AV pregled.
create table if not exists public.document_files (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id) on delete restrict default auth.uid(),
  bucket text not null default 'business-documents',
  path text not null,
  original_name text not null,
  mime text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 26214400),
  section text not null,
  external_id text not null,
  scan_status text not null default 'clean'
    check (scan_status in ('pending', 'clean', 'infected')),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bucket, path),
  check (bucket = 'business-documents'),
  check (path not like '%..%'),
  check (path like organization_id::text || '/%')
);

create index if not exists document_files_org_created_idx
  on public.document_files (organization_id, created_at desc);
create index if not exists document_files_active_path_idx
  on public.document_files (organization_id, path)
  where deleted_at is null;

alter table public.document_files enable row level security;

drop policy if exists "members read document files" on public.document_files;
drop policy if exists "members insert document files" on public.document_files;
create policy "members read document files" on public.document_files for select
  using (public.is_organization_member(organization_id));
create policy "members insert document files" on public.document_files for insert
  with check (
    public.role_at_least(organization_id, 'member')
    and uploaded_by = auth.uid()
  );

grant select, insert on public.document_files to authenticated;
grant all on public.document_files to service_role;

create or replace function public.archive_document_file(
  p_organization_id uuid,
  p_path text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.role_at_least(p_organization_id, 'member') then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;
  update public.document_files
  set deleted_at = now(), updated_at = now()
  where organization_id = p_organization_id
    and path = p_path
    and deleted_at is null;
  return found;
end;
$$;

revoke all on function public.archive_document_file(uuid, text) from public;
grant execute on function public.archive_document_file(uuid, text) to authenticated;

-- Ista omejitev velja tudi ob neposrednem uploadu v Storage. Aplikacijska
-- validacija dodatno preveri ujemanje koncnice in MIME tipa.
update storage.buckets
set file_size_limit = 26214400,
    allowed_mime_types = array[
      'application/pdf', 'image/png', 'image/jpeg', 'image/webp',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv', 'application/csv', 'application/zip',
      'application/x-zip-compressed'
    ]
where id = 'business-documents';

comment on table public.document_files is
  'Evidenca business-documents; launch uporablja clean, AV worker bo nove zapise preklopil prek pending v clean/infected.';

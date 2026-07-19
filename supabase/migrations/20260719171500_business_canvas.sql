create table if not exists public.business_canvases (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  blocks jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.business_canvases enable row level security;

create policy "members read business canvas" on public.business_canvases
  for select using (public.is_organization_member(organization_id));
create policy "admins manage business canvas" on public.business_canvases
  for all using (public.is_organization_admin(organization_id))
  with check (public.is_organization_admin(organization_id));

grant select, insert, update, delete on public.business_canvases to authenticated;

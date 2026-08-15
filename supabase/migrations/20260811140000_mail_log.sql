create table if not exists public.mail_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key text not null,
  recipients text[] not null default '{}',
  subject text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  provider_id text,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, idempotency_key)
);

create index if not exists mail_log_organization_created_idx
  on public.mail_log (organization_id, created_at desc);

alter table public.mail_log enable row level security;

drop policy if exists "members read organization mail log" on public.mail_log;
create policy "members read organization mail log" on public.mail_log
  for select using (public.is_organization_member(organization_id));

grant select on public.mail_log to authenticated;
revoke insert, update, delete on public.mail_log from authenticated;
grant all on public.mail_log to service_role;

comment on table public.mail_log is
  'Metadata-only outbound mail log. Message bodies and HTML are never stored.';

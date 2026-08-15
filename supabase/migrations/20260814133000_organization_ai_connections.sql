create table if not exists public.organization_ai_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connection_type text not null check (connection_type in ('api', 'mcp')),
  provider text not null check (provider in ('openai', 'anthropic', 'google', 'mistral', 'openai-compatible', 'custom-mcp')),
  label text not null check (char_length(label) between 1 and 100),
  model text check (model is null or char_length(model) <= 150),
  endpoint_url text check (endpoint_url is null or char_length(endpoint_url) <= 2048),
  encrypted_secret text not null,
  secret_hint text not null check (char_length(secret_hint) <= 12),
  permissions jsonb not null default '{"read":true,"draft":true,"send":false,"delete":false}'::jsonb,
  status text not null default 'configured' check (status in ('configured', 'verified', 'error', 'disabled')),
  last_tested_at timestamptz,
  last_error text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, connection_type, provider, label)
);

create index if not exists organization_ai_connections_org_idx
  on public.organization_ai_connections (organization_id, updated_at desc);

alter table public.organization_ai_connections enable row level security;

-- Poverilnic ne izpostavljamo brskalniku niti prijavljenemu uporabniku.
-- Dostop je mogoč samo prek strežniškega API-ja s service-role ključem.
revoke all on public.organization_ai_connections from anon, authenticated;
grant all on public.organization_ai_connections to service_role;

create or replace function public.touch_organization_ai_connection()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists organization_ai_connections_touch on public.organization_ai_connections;
create trigger organization_ai_connections_touch
before update on public.organization_ai_connections
for each row execute function public.touch_organization_ai_connection();

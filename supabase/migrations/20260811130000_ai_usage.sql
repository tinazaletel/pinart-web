create table if not exists public.ai_usage (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  model text not null,
  tokens integer not null default 0 check (tokens >= 0),
  ip_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_rate_lookup_idx
  on public.ai_usage (organization_id, user_id, ip_hash, created_at desc);

alter table public.ai_usage enable row level security;

drop policy if exists "members read organization ai usage" on public.ai_usage;
create policy "members read organization ai usage" on public.ai_usage
  for select using (public.is_organization_member(organization_id));

grant select on public.ai_usage to authenticated;
revoke insert, update, delete on public.ai_usage from authenticated;

create or replace function public.ai_rate_check(
  p_organization_id uuid,
  p_ip_hash text,
  p_limit integer default 30,
  p_window_seconds integer default 3600,
  p_request_id uuid default gen_random_uuid(),
  p_model text default 'unknown'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  recent_requests integer;
begin
  if current_user_id is null
    or not public.is_organization_member(p_organization_id)
    or p_limit < 1
    or p_window_seconds < 1
    or length(p_ip_hash) <> 64 then
    return false;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    current_user_id::text || ':' || p_organization_id::text || ':' || p_ip_hash,
    0
  ));

  select count(*) into recent_requests
  from public.ai_usage
  where organization_id = p_organization_id
    and user_id = current_user_id
    and ip_hash = p_ip_hash
    and created_at >= now() - make_interval(secs => p_window_seconds);

  if recent_requests >= p_limit then
    return false;
  end if;

  insert into public.ai_usage (id, organization_id, user_id, model, ip_hash)
  values (p_request_id, p_organization_id, current_user_id, left(p_model, 120), p_ip_hash);
  return true;
end;
$$;

create or replace function public.ai_usage_set_tokens(p_request_id uuid, p_tokens integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.ai_usage
  set tokens = greatest(0, p_tokens)
  where id = p_request_id and user_id = auth.uid();
end;
$$;

revoke all on function public.ai_rate_check(uuid, text, integer, integer, uuid, text) from public;
revoke all on function public.ai_usage_set_tokens(uuid, integer) from public;
grant execute on function public.ai_rate_check(uuid, text, integer, integer, uuid, text) to authenticated;
grant execute on function public.ai_usage_set_tokens(uuid, integer) to authenticated;

comment on table public.ai_usage is
  'Metadata-only AI usage log. Prompt, context, history and response content are never stored.';

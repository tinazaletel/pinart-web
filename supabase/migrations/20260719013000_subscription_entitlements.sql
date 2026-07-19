do $$ begin
  create type public.subscription_tier as enum ('free', 'pro');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.subscription_status as enum ('active', 'trialing', 'past_due', 'canceled');
exception when duplicate_object then null;
end $$;

create table if not exists public.organization_subscriptions (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  tier public.subscription_tier not null default 'free',
  status public.subscription_status not null default 'active',
  valid_until timestamptz,
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  updated_at timestamptz not null default now()
);

alter table public.organization_subscriptions enable row level security;

drop policy if exists "members read subscription" on public.organization_subscriptions;
create policy "members read subscription" on public.organization_subscriptions
  for select using (public.is_organization_member(organization_id));

grant select on public.organization_subscriptions to authenticated;
revoke insert, update, delete on public.organization_subscriptions from authenticated;

create or replace function public.current_organization_entitlements()
returns table (
  organization_id uuid,
  tier public.subscription_tier,
  status public.subscription_status,
  valid_until timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select o.id,
    coalesce(s.tier, 'free'::public.subscription_tier),
    coalesce(s.status, 'active'::public.subscription_status),
    s.valid_until
  from public.organizations o
  join public.organization_members om on om.organization_id = o.id
  left join public.organization_subscriptions s on s.organization_id = o.id
  where om.user_id = auth.uid()
  order by om.created_at
  limit 1;
$$;

grant execute on function public.current_organization_entitlements() to authenticated;

-- Plačilni ponudnik bo tabelo pozneje posodabljal iz varnega webhooka s
-- service-role ključem. Brskalnik nima pravice ustvariti ali spremeniti paketa.

-- Javni obrazec za povprasevanje. Vsa javna branja/pisanja tecejo prek strezniske API poti.
alter table if exists public.organizations add column if not exists inquiry_slug text;

create unique index if not exists organizations_inquiry_slug_key
  on public.organizations (inquiry_slug) where inquiry_slug is not null;

do $$ begin
  alter table public.organizations add constraint organizations_inquiry_slug_check
    check (inquiry_slug is null or inquiry_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');
exception when duplicate_object then null;
end $$;

create table if not exists public.povprasevanja (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  podatki jsonb not null default '{}'::jsonb,
  ime text not null,
  email text not null,
  status text not null default 'novo' check (status in ('novo', 'obdelano', 'zavrnjeno')),
  created_at timestamptz not null default now(),
  ip_hash text not null
);

create index if not exists povprasevanja_organization_created_idx
  on public.povprasevanja (organization_id, created_at desc);

alter table public.povprasevanja enable row level security;
drop policy if exists "clani berejo povprasevanja" on public.povprasevanja;
create policy "clani berejo povprasevanja" on public.povprasevanja for select
  using (public.is_organization_member(organization_id));
drop policy if exists "clani posodabljajo povprasevanja" on public.povprasevanja;
create policy "clani posodabljajo povprasevanja" on public.povprasevanja for update
  using (public.is_organization_member(organization_id));

-- Anon nima SELECT ali INSERT. Javni INSERT opravi samo preverjena API pot s service-role.
revoke all on public.povprasevanja from anon;
grant select, update on public.povprasevanja to authenticated;

-- Povprasevanje, nova stranka in osnutek ponudbe nastanejo v eni transakciji.
create or replace function public.sprejmi_povprasevanje(
  p_organization_id uuid, p_podatki jsonb, p_ime text, p_email text,
  p_ip_hash text, p_client_external_id text, p_offer_external_id text,
  p_offer_title text, p_scope jsonb
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_inquiry_id uuid; v_client_id uuid;
begin
  insert into public.povprasevanja (organization_id, podatki, ime, email, ip_hash)
  values (p_organization_id, p_podatki, p_ime, p_email, p_ip_hash)
  returning id into v_inquiry_id;
  insert into public.clients (organization_id, external_id, name, email)
  values (p_organization_id, p_client_external_id, p_ime, p_email)
  returning id into v_client_id;
  insert into public.offers (organization_id, external_id, client_id, title, status, scope, amount)
  values (p_organization_id, p_offer_external_id, v_client_id, p_offer_title, 'draft', p_scope, 0);
  return v_inquiry_id;
end;
$$;

revoke all on function public.sprejmi_povprasevanje(uuid,jsonb,text,text,text,text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.sprejmi_povprasevanje(uuid,jsonb,text,text,text,text,text,text,jsonb) to service_role;

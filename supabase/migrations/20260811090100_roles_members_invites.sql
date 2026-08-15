create or replace function public.membership_role_of(target_organization_id uuid)
returns public.membership_role
language sql
stable
security definer
set search_path = public
as $$
  select om.role
  from public.organization_members om
  where om.organization_id = target_organization_id
    and om.user_id = auth.uid()
  limit 1;
$$;

create or replace function public.role_at_least(
  target_organization_id uuid,
  minimum_role public.membership_role
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    case public.membership_role_of(target_organization_id)
      when 'owner' then 5
      when 'admin' then 4
      when 'accounting' then 3
      when 'accountant' then 3
      when 'member' then 2
      when 'viewer' then 1
    end >=
    case minimum_role
      when 'owner' then 5
      when 'admin' then 4
      when 'accounting' then 3
      when 'accountant' then 3
      when 'member' then 2
      when 'viewer' then 1
    end,
    false
  );
$$;

grant execute on function public.membership_role_of(uuid) to authenticated;
grant execute on function public.role_at_least(uuid, public.membership_role) to authenticated;

-- PostgreSQL zdruzuje permisivne politike z OR, zato stare siroke FOR ALL politike
-- odstranimo in jih nadomestimo z locenimi politikami po operaciji.
drop policy if exists "members manage clients" on public.clients;
drop policy if exists "members read clients" on public.clients;
drop policy if exists "members insert clients" on public.clients;
drop policy if exists "members update clients" on public.clients;
drop policy if exists "admins delete clients" on public.clients;
create policy "members read clients" on public.clients for select
  using (public.is_organization_member(organization_id));
create policy "members insert clients" on public.clients for insert
  with check (public.role_at_least(organization_id, 'member'));
create policy "members update clients" on public.clients for update
  using (public.role_at_least(organization_id, 'member'))
  with check (public.role_at_least(organization_id, 'member'));
create policy "admins delete clients" on public.clients for delete
  using (public.role_at_least(organization_id, 'admin'));

drop policy if exists "members manage offers" on public.offers;
drop policy if exists "members read offers" on public.offers;
drop policy if exists "members insert offers" on public.offers;
drop policy if exists "members update offers" on public.offers;
drop policy if exists "admins delete offers" on public.offers;
create policy "members read offers" on public.offers for select
  using (public.is_organization_member(organization_id));
create policy "members insert offers" on public.offers for insert
  with check (public.role_at_least(organization_id, 'member'));
create policy "members update offers" on public.offers for update
  using (public.role_at_least(organization_id, 'member'))
  with check (public.role_at_least(organization_id, 'member'));
create policy "admins delete offers" on public.offers for delete
  using (public.role_at_least(organization_id, 'admin'));

drop policy if exists "members manage contracts" on public.contracts;
drop policy if exists "members read contracts" on public.contracts;
drop policy if exists "members insert contracts" on public.contracts;
drop policy if exists "members update contracts" on public.contracts;
drop policy if exists "admins delete contracts" on public.contracts;
create policy "members read contracts" on public.contracts for select
  using (public.is_organization_member(organization_id));
create policy "members insert contracts" on public.contracts for insert
  with check (public.role_at_least(organization_id, 'member'));
create policy "members update contracts" on public.contracts for update
  using (public.role_at_least(organization_id, 'member'))
  with check (public.role_at_least(organization_id, 'member'));
create policy "admins delete contracts" on public.contracts for delete
  using (public.role_at_least(organization_id, 'admin'));

drop policy if exists "members manage expenses" on public.expenses;
drop policy if exists "members read expenses" on public.expenses;
drop policy if exists "members insert expenses" on public.expenses;
drop policy if exists "members update expenses" on public.expenses;
drop policy if exists "admins delete expenses" on public.expenses;
create policy "members read expenses" on public.expenses for select
  using (public.is_organization_member(organization_id));
create policy "members insert expenses" on public.expenses for insert
  with check (public.role_at_least(organization_id, 'member'));
create policy "members update expenses" on public.expenses for update
  using (public.role_at_least(organization_id, 'member'))
  with check (public.role_at_least(organization_id, 'member'));
create policy "admins delete expenses" on public.expenses for delete
  using (public.role_at_least(organization_id, 'admin'));

drop policy if exists "members manage invoices" on public.invoices;
drop policy if exists "members read invoices" on public.invoices;
drop policy if exists "members insert invoices" on public.invoices;
drop policy if exists "members update invoices" on public.invoices;
drop policy if exists "admins delete invoices" on public.invoices;
create policy "members read invoices" on public.invoices for select
  using (public.is_organization_member(organization_id));
create policy "members insert invoices" on public.invoices for insert
  with check (public.role_at_least(organization_id, 'member'));
create policy "members update invoices" on public.invoices for update
  using (public.role_at_least(organization_id, 'member'))
  with check (public.role_at_least(organization_id, 'member'));
create policy "admins delete invoices" on public.invoices for delete
  using (public.role_at_least(organization_id, 'admin'));

drop policy if exists "members manage retainers" on public.retainers;
drop policy if exists "members read retainers" on public.retainers;
drop policy if exists "members insert retainers" on public.retainers;
drop policy if exists "members update retainers" on public.retainers;
drop policy if exists "admins delete retainers" on public.retainers;
create policy "members read retainers" on public.retainers for select
  using (public.is_organization_member(organization_id));
create policy "members insert retainers" on public.retainers for insert
  with check (public.role_at_least(organization_id, 'member'));
create policy "members update retainers" on public.retainers for update
  using (public.role_at_least(organization_id, 'member'))
  with check (public.role_at_least(organization_id, 'member'));
create policy "admins delete retainers" on public.retainers for delete
  using (public.role_at_least(organization_id, 'admin'));

drop policy if exists "members manage accounting exports" on public.accounting_exports;
drop policy if exists "members read accounting exports" on public.accounting_exports;
drop policy if exists "accounting insert accounting exports" on public.accounting_exports;
drop policy if exists "accounting update accounting exports" on public.accounting_exports;
drop policy if exists "admins delete accounting exports" on public.accounting_exports;
create policy "members read accounting exports" on public.accounting_exports for select
  using (public.is_organization_member(organization_id));
create policy "accounting insert accounting exports" on public.accounting_exports for insert
  with check (public.role_at_least(organization_id, 'accounting'));
create policy "accounting update accounting exports" on public.accounting_exports for update
  using (public.role_at_least(organization_id, 'accounting'))
  with check (public.role_at_least(organization_id, 'accounting'));
create policy "admins delete accounting exports" on public.accounting_exports for delete
  using (public.role_at_least(organization_id, 'admin'));

drop policy if exists "members manage organization settings" on public.organization_settings;
drop policy if exists "members read organization settings" on public.organization_settings;
drop policy if exists "members insert organization settings" on public.organization_settings;
drop policy if exists "members update organization settings" on public.organization_settings;
drop policy if exists "admins delete organization settings" on public.organization_settings;
create policy "members read organization settings" on public.organization_settings for select
  using (public.is_organization_member(organization_id));
create policy "members insert organization settings" on public.organization_settings for insert
  with check (public.role_at_least(organization_id, 'member'));
create policy "members update organization settings" on public.organization_settings for update
  using (public.role_at_least(organization_id, 'member'))
  with check (public.role_at_least(organization_id, 'member'));
create policy "admins delete organization settings" on public.organization_settings for delete
  using (public.role_at_least(organization_id, 'admin'));

create table if not exists public.organization_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role public.membership_role not null default 'member',
  token text not null unique default encode(gen_random_bytes(32), 'hex'),
  invited_by uuid references auth.users(id) on delete set null default auth.uid(),
  accepted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  constraint organization_invites_role_check check (role <> 'owner')
);

create index if not exists organization_invites_org_created_idx
  on public.organization_invites (organization_id, created_at desc);
create unique index if not exists organization_invites_pending_email_key
  on public.organization_invites (organization_id, lower(email))
  where accepted_at is null;

alter table public.organization_invites enable row level security;
drop policy if exists "admins read organization invites" on public.organization_invites;
drop policy if exists "admins create organization invites" on public.organization_invites;
drop policy if exists "admins update organization invites" on public.organization_invites;
drop policy if exists "admins delete organization invites" on public.organization_invites;
create policy "admins read organization invites" on public.organization_invites for select
  using (public.is_organization_admin(organization_id));
create policy "admins create organization invites" on public.organization_invites for insert
  with check (
    public.is_organization_admin(organization_id)
    and invited_by = auth.uid()
    and role <> 'owner'
  );
create policy "admins update organization invites" on public.organization_invites for update
  using (public.is_organization_admin(organization_id))
  with check (public.is_organization_admin(organization_id) and role <> 'owner');
create policy "admins delete organization invites" on public.organization_invites for delete
  using (public.is_organization_admin(organization_id));

create or replace function public.accept_organization_invite(invite_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  invitation public.organization_invites%rowtype;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select * into invitation
  from public.organization_invites
  where token = invite_token
  for update;

  if invitation.id is null
    or invitation.accepted_at is not null
    or invitation.expires_at <= now()
    or lower(invitation.email) <> current_email then
    raise exception 'Invite is invalid, expired, or belongs to another account';
  end if;

  insert into public.organization_members (organization_id, user_id, role)
  values (invitation.organization_id, current_user_id, invitation.role)
  on conflict (organization_id, user_id) do update
    set role = excluded.role;

  update public.organization_invites
  set accepted_at = now()
  where id = invitation.id;

  return invitation.organization_id;
end;
$$;

grant select, insert, update, delete on public.organization_invites to authenticated;
grant select, insert, update, delete on public.organization_invites to service_role;
grant execute on function public.accept_organization_invite(text) to authenticated;
revoke all on public.organization_invites from anon;

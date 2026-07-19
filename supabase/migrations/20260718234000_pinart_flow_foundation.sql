create extension if not exists pgcrypto;

create type public.membership_role as enum ('owner', 'admin', 'member', 'accountant');
create type public.offer_status as enum ('draft', 'sent', 'accepted', 'rejected');
create type public.contract_status as enum ('draft', 'received', 'review', 'active', 'signed');
create type public.invoice_status as enum ('draft', 'sent', 'paid', 'overdue', 'cancelled');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tax_number text,
  address text,
  owner_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.membership_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create or replace function public.is_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = target_organization_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_organization_admin(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = target_organization_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
  );
$$;

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  email text,
  contact_name text,
  phone text,
  address text,
  tax_number text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  number text,
  title text not null,
  status public.offer_status not null default 'draft',
  issue_date date not null default current_date,
  valid_until date,
  scope jsonb not null default '[]'::jsonb,
  amount numeric(12,2) not null default 0,
  currency text not null default 'EUR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, number)
);

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  offer_id uuid references public.offers(id) on delete set null,
  title text not null,
  status public.contract_status not null default 'draft',
  contract_date date not null default current_date,
  body text,
  file_path text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  offer_id uuid references public.offers(id) on delete set null,
  contract_id uuid references public.contracts(id) on delete set null,
  number text,
  title text,
  description text,
  status public.invoice_status not null default 'draft',
  issue_date date not null default current_date,
  due_date date,
  paid_at date,
  amount numeric(12,2) not null default 0,
  currency text not null default 'EUR',
  file_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, number)
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  offer_id uuid references public.offers(id) on delete set null,
  title text not null,
  supplier text,
  category text,
  expense_date date not null default current_date,
  amount numeric(12,2) not null default 0,
  currency text not null default 'EUR',
  recurring boolean not null default false,
  file_path text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.business_goals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  revenue_target numeric(12,2) not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, period_start, period_end)
);

create table public.accounting_exports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  recipient_email text,
  sent_at timestamptz,
  archive_path text,
  invoice_count integer not null default 0,
  expense_count integer not null default 0,
  bank_statement_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index on public.clients (organization_id, name);
create index on public.offers (organization_id, issue_date desc);
create index on public.contracts (organization_id, contract_date desc);
create index on public.invoices (organization_id, issue_date desc);
create index on public.expenses (organization_id, expense_date desc);

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;
alter table public.clients enable row level security;
alter table public.offers enable row level security;
alter table public.contracts enable row level security;
alter table public.invoices enable row level security;
alter table public.expenses enable row level security;
alter table public.business_goals enable row level security;
alter table public.accounting_exports enable row level security;

create policy "members read organizations" on public.organizations
  for select using (public.is_organization_member(id));
create policy "admins update organizations" on public.organizations
  for update using (public.is_organization_admin(id));
create policy "users read own profile" on public.profiles
  for select using (id = auth.uid());
create policy "users update own profile" on public.profiles
  for update using (id = auth.uid());
create policy "members read memberships" on public.organization_members
  for select using (public.is_organization_member(organization_id));
create policy "admins manage memberships" on public.organization_members
  for all using (public.is_organization_admin(organization_id))
  with check (public.is_organization_admin(organization_id));

create policy "members manage clients" on public.clients for all
  using (public.is_organization_member(organization_id))
  with check (public.is_organization_member(organization_id));
create policy "members manage offers" on public.offers for all
  using (public.is_organization_member(organization_id))
  with check (public.is_organization_member(organization_id));
create policy "members manage contracts" on public.contracts for all
  using (public.is_organization_member(organization_id))
  with check (public.is_organization_member(organization_id));
create policy "members manage invoices" on public.invoices for all
  using (public.is_organization_member(organization_id))
  with check (public.is_organization_member(organization_id));
create policy "members manage expenses" on public.expenses for all
  using (public.is_organization_member(organization_id))
  with check (public.is_organization_member(organization_id));
create policy "members manage goals" on public.business_goals for all
  using (public.is_organization_member(organization_id))
  with check (public.is_organization_member(organization_id));
create policy "members manage accounting exports" on public.accounting_exports for all
  using (public.is_organization_member(organization_id))
  with check (public.is_organization_member(organization_id));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  new_organization_id uuid;
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));

  insert into public.organizations (name, owner_id)
  values (coalesce(nullif(new.raw_user_meta_data ->> 'company_name', ''), 'Moj studio'), new.id)
  returning id into new_organization_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (new_organization_id, new.id, 'owner');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

insert into storage.buckets (id, name, public, file_size_limit)
values ('business-documents', 'business-documents', false, 52428800)
on conflict (id) do nothing;

create policy "members read organization documents" on storage.objects
  for select using (
    bucket_id = 'business-documents'
    and public.is_organization_member((storage.foldername(name))[1]::uuid)
  );
create policy "members upload organization documents" on storage.objects
  for insert with check (
    bucket_id = 'business-documents'
    and public.is_organization_member((storage.foldername(name))[1]::uuid)
  );
create policy "members update organization documents" on storage.objects
  for update using (
    bucket_id = 'business-documents'
    and public.is_organization_member((storage.foldername(name))[1]::uuid)
  );
create policy "members delete organization documents" on storage.objects
  for delete using (
    bucket_id = 'business-documents'
    and public.is_organization_member((storage.foldername(name))[1]::uuid)
  );

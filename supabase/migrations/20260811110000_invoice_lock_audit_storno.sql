-- Zaklep izdanih računov, mehki izbris dokumentov, storno in nespremenljiva revizijska sled.
alter table public.invoices
  add column if not exists items jsonb not null default '[]'::jsonb,
  add column if not exists issued_at timestamptz,
  add column if not exists version integer not null default 1,
  add column if not exists supersedes_id uuid references public.invoices(id) on delete restrict,
  add column if not exists storno_of_id uuid references public.invoices(id) on delete restrict,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancel_reason text,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id) on delete set null;

alter table public.offers
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id) on delete set null;
alter table public.contracts
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id) on delete set null;
alter table public.expenses
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id) on delete set null;

create index if not exists invoices_org_active_idx on public.invoices (organization_id, issue_date desc) where deleted_at is null;
create index if not exists offers_org_active_idx on public.offers (organization_id, issue_date desc) where deleted_at is null;
create index if not exists contracts_org_active_idx on public.contracts (organization_id, contract_date desc) where deleted_at is null;
create index if not exists expenses_org_active_idx on public.expenses (organization_id, expense_date desc) where deleted_at is null;

do $$ begin
  create type public.document_audit_action as enum ('create', 'update', 'issue', 'cancel', 'delete');
exception when duplicate_object then null;
end $$;

create table if not exists public.document_audit (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  table_name text not null check (table_name in ('invoices', 'offers', 'contracts', 'expenses')),
  record_id uuid not null,
  action public.document_audit_action not null,
  user_id uuid references auth.users(id) on delete set null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);
create index if not exists document_audit_record_idx on public.document_audit (organization_id, record_id, created_at desc);
alter table public.document_audit enable row level security;

drop policy if exists "members read document audit" on public.document_audit;
create policy "members read document audit" on public.document_audit for select
  using (public.is_organization_member(organization_id));

revoke insert, update, delete on public.document_audit from authenticated;
grant select on public.document_audit to authenticated;
grant all on public.document_audit to service_role;

create or replace function public.audit_business_document()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  audit_action public.document_audit_action := 'update';
  org_id uuid;
  row_id uuid;
begin
  org_id := coalesce(new.organization_id, old.organization_id);
  row_id := coalesce(new.id, old.id);
  if tg_op = 'INSERT' then
    audit_action := case when tg_table_name = 'invoices' and new.issued_at is not null then 'issue' else 'create' end;
  elsif tg_op = 'UPDATE' then
    audit_action := case
      when new.deleted_at is distinct from old.deleted_at and new.deleted_at is not null then 'delete'
      when tg_table_name = 'invoices' and new.cancelled_at is distinct from old.cancelled_at and new.cancelled_at is not null then 'cancel'
      when tg_table_name = 'invoices' and new.issued_at is distinct from old.issued_at and new.issued_at is not null then 'issue'
      else 'update'
    end;
  elsif tg_op = 'DELETE' then
    audit_action := 'delete';
  end if;

  insert into public.document_audit (organization_id, table_name, record_id, action, user_id, old_data, new_data)
  values (
    org_id, tg_table_name, row_id, audit_action, auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function public.protect_invoice_record()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Računov ni dovoljeno trajno izbrisati.' using errcode = '42501';
  end if;
  if tg_op = 'INSERT' then
    if new.issued_at is not null and not public.role_at_least(new.organization_id, 'accounting') then
      raise exception 'Za izdajo računa potrebujete računovodsko vlogo.' using errcode = '42501';
    end if;
    return new;
  end if;
  if (old.issued_at is not null or new.issued_at is not null) and new.deleted_at is distinct from old.deleted_at then
    raise exception 'Izdanega računa ni mogoče izbrisati. Uporabite storno.' using errcode = '42501';
  end if;
  if old.issued_at is null and new.issued_at is not null and not public.role_at_least(new.organization_id, 'accounting') then
    raise exception 'Za izdajo računa potrebujete računovodsko vlogo.' using errcode = '42501';
  end if;
  if new.status = 'cancelled' and old.status <> 'cancelled' and (
    new.cancelled_at is null or not public.role_at_least(new.organization_id, 'accounting')
  ) then
    raise exception 'Račun je mogoče stornirati samo prek pooblaščenega postopka.' using errcode = '42501';
  end if;
  if old.issued_at is not null and (
    new.organization_id is distinct from old.organization_id or
    new.client_id is distinct from old.client_id or
    new.offer_id is distinct from old.offer_id or
    new.contract_id is distinct from old.contract_id or
    new.external_id is distinct from old.external_id or
    new.number is distinct from old.number or
    new.title is distinct from old.title or
    new.description is distinct from old.description or
    new.issue_date is distinct from old.issue_date or
    new.due_date is distinct from old.due_date or
    new.amount is distinct from old.amount or
    new.currency is distinct from old.currency or
    new.file_path is distinct from old.file_path or
    new.items is distinct from old.items or
    new.issued_at is distinct from old.issued_at or
    new.version is distinct from old.version or
    new.supersedes_id is distinct from old.supersedes_id or
    new.storno_of_id is distinct from old.storno_of_id
  ) then
    raise exception 'Vsebine izdanega računa ni mogoče spreminjati.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_invoice_record_trigger on public.invoices;
create trigger protect_invoice_record_trigger before insert or update or delete on public.invoices
for each row execute function public.protect_invoice_record();

drop trigger if exists audit_invoices_trigger on public.invoices;
create trigger audit_invoices_trigger after insert or update or delete on public.invoices
for each row execute function public.audit_business_document();
drop trigger if exists audit_offers_trigger on public.offers;
create trigger audit_offers_trigger after insert or update or delete on public.offers
for each row execute function public.audit_business_document();
drop trigger if exists audit_contracts_trigger on public.contracts;
create trigger audit_contracts_trigger after insert or update or delete on public.contracts
for each row execute function public.audit_business_document();
drop trigger if exists audit_expenses_trigger on public.expenses;
create trigger audit_expenses_trigger after insert or update or delete on public.expenses
for each row execute function public.audit_business_document();

create or replace function public.prevent_document_audit_mutation()
returns trigger language plpgsql set search_path = public as $$
begin
  raise exception 'Revizijske sledi ni dovoljeno spreminjati ali brisati.' using errcode = '42501';
end;
$$;
drop trigger if exists prevent_document_audit_mutation_trigger on public.document_audit;
create trigger prevent_document_audit_mutation_trigger before update or delete on public.document_audit
for each row execute function public.prevent_document_audit_mutation();

create or replace function public.storniraj_racun(p_id uuid, p_razlog text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  original public.invoices%rowtype;
  storno_id uuid;
begin
  select * into original from public.invoices where id = p_id for update;
  if not found then raise exception 'Račun ne obstaja.'; end if;
  if not public.role_at_least(original.organization_id, 'accounting') then
    raise exception 'Za storno potrebujete računovodsko vlogo.' using errcode = '42501';
  end if;
  if original.issued_at is null then raise exception 'Stornirati je mogoče samo izdan račun.'; end if;
  if original.cancelled_at is not null or original.status = 'cancelled' then raise exception 'Račun je že storniran.'; end if;

  update public.invoices
  set status = 'cancelled', cancelled_at = now(), cancel_reason = nullif(trim(p_razlog), ''), updated_at = now()
  where id = original.id;

  insert into public.invoices (
    organization_id, client_id, offer_id, contract_id, external_id, number, title, description,
    status, issue_date, due_date, amount, currency, file_path, items, issued_at, version, storno_of_id
  ) values (
    original.organization_id, original.client_id, original.offer_id, original.contract_id,
    concat(coalesce(original.external_id, original.id::text), '-storno'),
    concat(coalesce(original.number, original.id::text), '-STORNO'),
    concat('STORNO: ', coalesce(original.title, original.number, 'račun')),
    coalesce(nullif(trim(p_razlog), ''), original.description),
    'sent', current_date, current_date, -abs(original.amount), original.currency, null,
    original.items, now(), 1, original.id
  ) returning id into storno_id;
  return storno_id;
end;
$$;

revoke all on function public.storniraj_racun(uuid, text) from public;
grant execute on function public.storniraj_racun(uuid, text) to authenticated;

alter table public.invoices
  add column if not exists fiscal_confirmed_at timestamptz,
  add column if not exists fiscal_eor text,
  add column if not exists fiscal_zoi text,
  add column if not exists fiscal_provider text;

comment on column public.invoices.fiscal_confirmed_at is
  'Cas potrditve pri davcnem ponudniku; ni enako interni izdaji racuna.';

create or replace function public.protect_invoice_fiscal_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.role() = 'authenticated' then
    if tg_op = 'INSERT' and (
      new.fiscal_confirmed_at is not null or new.fiscal_eor is not null or
      new.fiscal_zoi is not null or new.fiscal_provider is not null
    ) then
      raise exception 'Davcna polja lahko zapise samo strezniska integracija.' using errcode = '42501';
    end if;
    if tg_op = 'UPDATE' and (
      new.fiscal_confirmed_at is distinct from old.fiscal_confirmed_at or
      new.fiscal_eor is distinct from old.fiscal_eor or
      new.fiscal_zoi is distinct from old.fiscal_zoi or
      new.fiscal_provider is distinct from old.fiscal_provider
    ) then
      raise exception 'Davcnih polj ni dovoljeno spreminjati iz brskalnika.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_invoice_fiscal_fields_trigger on public.invoices;
create trigger protect_invoice_fiscal_fields_trigger
before insert or update on public.invoices
for each row execute function public.protect_invoice_fiscal_fields();


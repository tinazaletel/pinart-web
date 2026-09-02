-- FURS konfiguracija je strežniška skrivnost. Prijavljeni uporabniki do nje
-- nimajo neposrednega dostopa; nastavitve se pozneje urejajo prek varne API poti.
create table if not exists public.furs_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  okolje text not null default 'test' check (okolje in ('test', 'produkcija')),
  davcna_stevilka text not null check (davcna_stevilka ~ '^\d{8}$'),
  davcna_stevilka_operaterja text check (davcna_stevilka_operaterja is null or davcna_stevilka_operaterja ~ '^\d{8}$'),
  poslovni_prostor text not null check (poslovni_prostor ~ '^[0-9A-Za-z]{1,20}$'),
  elektronska_naprava text not null check (elektronska_naprava ~ '^[0-9A-Za-z]{1,20}$'),
  struktura_stevilcenja text not null default 'B' check (struktura_stevilcenja in ('B', 'C')),
  naslednja_stevilka bigint not null default 1 check (naslednja_stevilka > 0),
  prostor_prijavljen_at timestamptz,
  prostor_podatki jsonb,
  certifikat_sifriran text not null,
  certifikat_iv text not null,
  certifikat_oznaka text not null,
  kljuc_sifriran text not null,
  kljuc_iv text not null,
  kljuc_oznaka text not null,
  geslo_sifrirano text,
  geslo_iv text,
  geslo_oznaka text,
  updated_at timestamptz not null default now()
);

alter table public.furs_settings enable row level security;
revoke all on public.furs_settings from public, anon, authenticated;
grant all on public.furs_settings to service_role;

alter table public.invoices
  add column if not exists payment_method text check (payment_method is null or payment_method in ('bank_transfer', 'cash', 'card', 'other_cash')),
  add column if not exists fiscal_invoice_number bigint,
  add column if not exists fiscal_business_premise text,
  add column if not exists fiscal_electronic_device text,
  add column if not exists fiscal_attempted_at timestamptz,
  add column if not exists fiscal_error_code text,
  add column if not exists fiscal_error_message text,
  add column if not exists fiscal_qr_payload text;

create unique index if not exists invoices_furs_number_unique
  on public.invoices (organization_id, fiscal_business_premise, fiscal_electronic_device, fiscal_invoice_number)
  where fiscal_invoice_number is not null;

create table if not exists public.furs_attempts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete restrict,
  message_id uuid not null,
  okolje text not null check (okolje in ('test', 'produkcija')),
  uspesno boolean not null default false,
  http_status integer,
  error_code text,
  error_message text,
  created_at timestamptz not null default now()
);
create index if not exists furs_attempts_invoice_idx on public.furs_attempts (invoice_id, created_at desc);
alter table public.furs_attempts enable row level security;
create policy "members read furs attempts" on public.furs_attempts for select
  using (public.is_organization_member(organization_id));
revoke insert, update, delete on public.furs_attempts from authenticated;
grant select on public.furs_attempts to authenticated;
grant all on public.furs_attempts to service_role;

-- Številka se rezervira enkrat in se po neuspelem pošiljanju ne uporablja znova.
-- Zaklep vrstice nastavitev prepreči dvojnik pri dveh sočasnih zahtevkih.
create or replace function public.reserve_furs_invoice_number(p_organization_id uuid, p_invoice_id uuid)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_number bigint;
  v_premise text;
  v_device text;
begin
  if auth.role() <> 'service_role' then
    raise exception 'FURS številko sme dodeliti samo strežniška integracija.' using errcode = '42501';
  end if;

  select fiscal_invoice_number into v_number
  from public.invoices
  where id = p_invoice_id and organization_id = p_organization_id;
  if v_number is not null then return v_number; end if;

  select naslednja_stevilka, poslovni_prostor, elektronska_naprava
    into v_number, v_premise, v_device
  from public.furs_settings
  where organization_id = p_organization_id
  for update;
  if v_number is null then raise exception 'FURS nastavitve niso pripravljene.'; end if;

  update public.invoices
  set fiscal_invoice_number = v_number,
      fiscal_business_premise = v_premise,
      fiscal_electronic_device = v_device
  where id = p_invoice_id and organization_id = p_organization_id and fiscal_invoice_number is null;
  if not found then
    select fiscal_invoice_number into v_number from public.invoices
    where id = p_invoice_id and organization_id = p_organization_id;
    return v_number;
  end if;

  update public.furs_settings set naslednja_stevilka = v_number + 1, updated_at = now()
  where organization_id = p_organization_id;
  return v_number;
end;
$$;
revoke all on function public.reserve_furs_invoice_number(uuid, uuid) from public, anon, authenticated;
grant execute on function public.reserve_furs_invoice_number(uuid, uuid) to service_role;

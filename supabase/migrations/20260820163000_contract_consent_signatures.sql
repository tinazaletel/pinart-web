-- Dokazilo o soglasju (ni kvalificiran elektronski podpis po eIDAS).
-- ODVISNOST: public.contracts in public.organization_members iz temeljnih migracij morata obstajati.
alter table if exists public.contracts add column if not exists locked_at timestamptz;
alter table if exists public.contracts add column if not exists signed_content_hash text;

create table if not exists public.contract_signing_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  token_hash text not null unique,
  content_hash text not null,
  content_snapshot text not null,
  client_email text,
  expires_at timestamptz not null,
  completed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.contract_signatures (
  id uuid primary key default gen_random_uuid(),
  signing_request_id uuid not null references public.contract_signing_requests(id) on delete cascade,
  party text not null check (party in ('provider', 'client')),
  signer_name text not null,
  signer_user_id uuid references auth.users(id) on delete set null,
  signed_at timestamptz not null default now(),
  ip_address inet,
  user_agent text,
  content_hash text not null,
  unique (signing_request_id, party)
);

create index if not exists contract_signing_requests_contract_idx
  on public.contract_signing_requests (contract_id, created_at desc);

alter table public.contract_signing_requests enable row level security;
alter table public.contract_signatures enable row level security;
revoke all on public.contract_signing_requests from anon, authenticated;
revoke all on public.contract_signatures from anon, authenticated;

create or replace function public.prepreci_spremembo_podpisane_pogodbe()
returns trigger language plpgsql as $$
begin
  if old.locked_at is not null and new is distinct from old then
    raise exception 'Podpisana pogodba je zaklenjena; ustvari nov dokument.';
  end if;
  return new;
end;
$$;

drop trigger if exists lock_signed_contract_trigger on public.contracts;
create trigger lock_signed_contract_trigger before update on public.contracts
for each row execute function public.prepreci_spremembo_podpisane_pogodbe();

-- En sam transakcijski korak: podpis narocnika, zakljucek zahteve in zaklep pogodbe.
create or replace function public.podpisi_pogodbo_javno(
  p_token_hash text, p_signer_name text, p_ip inet, p_user_agent text
) returns table (signed_at timestamptz, content_hash text)
language plpgsql security definer set search_path = public as $$
declare
  z public.contract_signing_requests%rowtype;
  zdaj timestamptz := now();
begin
  select * into z from public.contract_signing_requests
  where token_hash = p_token_hash for update;
  if z.id is null or z.expires_at <= zdaj then raise exception 'Povezava ni veljavna ali je potekla.'; end if;
  if z.completed_at is not null then raise exception 'Pogodba je že podpisana.'; end if;
  insert into public.contract_signatures
    (signing_request_id, party, signer_name, ip_address, user_agent, content_hash)
  values (z.id, 'client', p_signer_name, p_ip, left(p_user_agent, 500), z.content_hash);
  update public.contract_signing_requests set completed_at = zdaj where id = z.id;
  update public.contracts set status = 'signed', locked_at = zdaj, signed_content_hash = z.content_hash
    where id = z.contract_id and locked_at is null;
  if not found then raise exception 'Pogodbe ni bilo mogoče zakleniti.'; end if;
  return query select zdaj, z.content_hash;
end;
$$;

revoke all on function public.podpisi_pogodbo_javno(text,text,inet,text) from public, anon, authenticated;
grant execute on function public.podpisi_pogodbo_javno(text,text,inet,text) to service_role;

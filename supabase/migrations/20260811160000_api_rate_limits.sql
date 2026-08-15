create table if not exists public.api_klici (
  kljuc_hash text not null,
  pot text not null,
  okno_zacetek timestamptz not null,
  stevilo integer not null default 1 check (stevilo > 0),
  updated_at timestamptz not null default now(),
  primary key (kljuc_hash, pot, okno_zacetek)
);

alter table public.api_klici enable row level security;

revoke all on public.api_klici from anon, authenticated;
grant all on public.api_klici to service_role;

create or replace function public.preveri_api_omejitev(
  p_kljuc_hash text,
  p_pot text,
  p_limit integer,
  p_okno_sekund integer default 60
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_okno timestamptz;
  v_stevilo integer;
begin
  if p_kljuc_hash is null or length(p_kljuc_hash) < 16
     or p_pot is null or length(p_pot) > 120
     or p_limit < 1 or p_okno_sekund < 1 then
    return false;
  end if;

  v_okno := to_timestamp(
    floor(extract(epoch from now()) / p_okno_sekund) * p_okno_sekund
  );

  insert into public.api_klici (kljuc_hash, pot, okno_zacetek, stevilo)
  values (p_kljuc_hash, p_pot, v_okno, 1)
  on conflict (kljuc_hash, pot, okno_zacetek)
  do update set
    stevilo = public.api_klici.stevilo + 1,
    updated_at = now()
  returning stevilo into v_stevilo;

  return v_stevilo <= p_limit;
end;
$$;

revoke all on function public.preveri_api_omejitev(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.preveri_api_omejitev(text, text, integer, integer) to service_role;

create index if not exists api_klici_updated_at_idx on public.api_klici (updated_at);

comment on table public.api_klici is
  'Strezniski stevci za omejevanje dragih API poti; dostop ima samo service_role.';

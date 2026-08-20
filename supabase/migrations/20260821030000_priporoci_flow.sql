create table if not exists public.referral_codes (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  code text not null unique check (code ~ '^[a-z0-9]{10,32}$'),
  created_at timestamptz not null default now(),
  unique (owner_user_id)
);

create table if not exists public.referral_registrations (
  id uuid primary key default gen_random_uuid(),
  code_id uuid not null references public.referral_codes(id) on delete cascade,
  referred_user_id uuid not null references auth.users(id) on delete cascade unique,
  registered_at timestamptz not null default now(),
  reward_status text not null default 'pending' check (reward_status in ('pending', 'approved', 'rejected'))
);

alter table public.referral_codes enable row level security;
alter table public.referral_registrations enable row level security;

drop policy if exists "uporabnik vidi svojo priporocilno kodo" on public.referral_codes;
create policy "uporabnik vidi svojo priporocilno kodo" on public.referral_codes for select using (owner_user_id = auth.uid());
drop policy if exists "uporabnik ustvari svojo priporocilno kodo" on public.referral_codes;
create policy "uporabnik ustvari svojo priporocilno kodo" on public.referral_codes for insert with check (owner_user_id = auth.uid());
drop policy if exists "uporabnik vidi svoje priporocene registracije" on public.referral_registrations;
create policy "uporabnik vidi svoje priporocene registracije" on public.referral_registrations for select using (exists (select 1 from public.referral_codes k where k.id = code_id and k.owner_user_id = auth.uid()));

grant select, insert on public.referral_codes to authenticated;
grant select on public.referral_registrations to authenticated;
revoke all on public.referral_codes, public.referral_registrations from anon;

create or replace function public.zabelezi_priporocilo_novega_uporabnika()
returns trigger language plpgsql security definer set search_path = public as $$
declare najdena_koda uuid;
begin
  select id into najdena_koda from public.referral_codes where code = lower(coalesce(new.raw_user_meta_data->>'referral_code', ''));
  if najdena_koda is not null then
    insert into public.referral_registrations (code_id, referred_user_id) values (najdena_koda, new.id) on conflict (referred_user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists zabelezi_priporocilo_ob_registraciji on auth.users;
create trigger zabelezi_priporocilo_ob_registraciji after insert on auth.users for each row execute function public.zabelezi_priporocilo_novega_uporabnika();

create or replace function public.zabelezi_moje_priporocilo(p_code text)
returns void language plpgsql security definer set search_path = public as $$
declare najdena_koda uuid;
begin
  if auth.uid() is null then raise exception 'Prijava je obvezna'; end if;
  select id into najdena_koda from public.referral_codes where code = lower(p_code);
  if najdena_koda is not null then
    insert into public.referral_registrations (code_id, referred_user_id) values (najdena_koda, auth.uid()) on conflict (referred_user_id) do nothing;
  end if;
end;
$$;
grant execute on function public.zabelezi_moje_priporocilo(text) to authenticated;

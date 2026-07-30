-- Evidenca prisotnosti (prihod/odhod/malica/vrsta/kraj) v oblak.
-- Osebni delovni dnevnik: kot pri stoparici (private_time_entries) clanstvo v
-- istem podjetju NE daje dostopa do tujih zapisov. Cilj delovnika (workday_hours)
-- je nastavitev in gre v organization_settings.

create table if not exists public.presence_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  arrival text,
  departure text,
  break_minutes integer check (break_minutes is null or break_minutes >= 0),
  kind text not null default 'redno',
  location text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists presence_entries_user_date_idx
  on public.presence_entries (user_id, entry_date desc);

alter table public.presence_entries enable row level security;

drop policy if exists "users read own presence" on public.presence_entries;
create policy "users read own presence" on public.presence_entries
  for select using (user_id = auth.uid());

drop policy if exists "users insert own presence" on public.presence_entries;
create policy "users insert own presence" on public.presence_entries
  for insert with check (
    user_id = auth.uid() and public.is_organization_member(organization_id)
  );

drop policy if exists "users update own presence" on public.presence_entries;
create policy "users update own presence" on public.presence_entries
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "users delete own presence" on public.presence_entries;
create policy "users delete own presence" on public.presence_entries
  for delete using (user_id = auth.uid());

grant select, insert, update, delete on public.presence_entries to authenticated;

-- Cilj delovnika (ur na dan) — nastavitev poleg ostalih organization_settings.
alter table public.organization_settings
  add column if not exists workday_hours numeric(4,2) not null default 8;

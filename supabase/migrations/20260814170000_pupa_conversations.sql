-- Pupa pogovori (zgodovina AI klepeta v Pupa domu) — PER-UPORABNIK.
-- Sledi pravilom iz docs/CODEX-NALOGE-launch.md: aditivno, RLS, eksplicitni grant.
-- Model varnosti: RLS po auth.uid() — vsak vidi/ureja SAMO svoje pogovore.
-- Brskalniski odjemalec (@/utils/supabase/client) pise neposredno; RLS je kljucavnica.

create table if not exists public.pupa_conversation (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  naslov text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pupa_message (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.pupa_conversation(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists pupa_message_conv_idx on public.pupa_message (conversation_id, created_at);
create index if not exists pupa_conversation_user_idx on public.pupa_conversation (user_id, updated_at desc);

alter table public.pupa_conversation enable row level security;
alter table public.pupa_message enable row level security;

-- Pogovori: vidis/urejas samo svoje.
drop policy if exists "pupa conv own" on public.pupa_conversation;
create policy "pupa conv own" on public.pupa_conversation for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Sporocila: dostopna, ce je nadrejeni pogovor tvoj.
drop policy if exists "pupa msg own" on public.pupa_message;
create policy "pupa msg own" on public.pupa_message for all
  using (exists (select 1 from public.pupa_conversation c where c.id = conversation_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.pupa_conversation c where c.id = conversation_id and c.user_id = auth.uid()));

grant select, insert, update, delete on public.pupa_conversation to authenticated;
grant select, insert, delete on public.pupa_message to authenticated;

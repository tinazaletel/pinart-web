-- Klepet na projektih (kolaboracija med sodelavci).
-- PRAVI model varnosti: RLS po E-MAILU udelezenca, preverjenem prek prijave
-- (auth.jwt() ->> 'email'). Cross-account: sodelavec (npr. mama) vidi/pise le v
-- nitih, kjer je njen email med udelezenci. Vsili BAZA (ne aplikacija) = prava
-- kljucavnica. Brez prijave/tabele klijent tiho degradira na lokalni klepet.

-- NIT = pogovor, vezan na projekt + izbrane udelezence. nit_key je deterministicen
-- (projekt + sortirani e-maili) za idempotentno iskanje/ustvarjanje.
create table if not exists public.chat_thread (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  project_external_id text,
  nit_key text not null unique,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- Udelezenci niti (po e-mailu; shranjeno male crke). Cross-account clanstvo.
create table if not exists public.chat_participant (
  thread_id uuid not null references public.chat_thread(id) on delete cascade,
  email text not null,
  ime text,
  primary key (thread_id, email)
);

create table if not exists public.chat_message (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_thread(id) on delete cascade,
  sender_email text not null,
  sender_name text,
  body text not null,
  od_maila text,                         -- neobvezno: zadeva deljenega maila
  created_at timestamptz not null default now()
);
create index if not exists chat_message_thread_idx on public.chat_message (thread_id, created_at);

alter table public.chat_thread enable row level security;
alter table public.chat_participant enable row level security;
alter table public.chat_message enable row level security;

-- Pomozna (security definer -> obide RLS na chat_participant, brez rekurzije):
-- je moj preverjeni email udelezenec te niti?
create or replace function public.is_chat_participant(target_thread_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.chat_participant p
    where p.thread_id = target_thread_id
      and lower(p.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- NITI: beres, ce si udelezenec; ustvaris kot lastnik zapisa.
drop policy if exists "chat thread read" on public.chat_thread;
create policy "chat thread read" on public.chat_thread for select
  using (public.is_chat_participant(id));
drop policy if exists "chat thread insert" on public.chat_thread;
create policy "chat thread insert" on public.chat_thread for insert
  with check (created_by = auth.uid());

-- UDELEZENCI: beres, ce si udelezenec iste niti; dodaja ustvarjalec ali obstojeci udelezenec.
drop policy if exists "chat participant read" on public.chat_participant;
create policy "chat participant read" on public.chat_participant for select
  using (public.is_chat_participant(thread_id));
drop policy if exists "chat participant insert" on public.chat_participant;
create policy "chat participant insert" on public.chat_participant for insert
  with check (
    exists (select 1 from public.chat_thread t where t.id = thread_id and t.created_by = auth.uid())
    or public.is_chat_participant(thread_id)
  );

-- SPOROCILA: beres, ce si udelezenec; posljes le v svojem imenu (email = tvoj).
drop policy if exists "chat message read" on public.chat_message;
create policy "chat message read" on public.chat_message for select
  using (public.is_chat_participant(thread_id));
drop policy if exists "chat message insert" on public.chat_message;
create policy "chat message insert" on public.chat_message for insert
  with check (
    public.is_chat_participant(thread_id)
    and lower(sender_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

grant select, insert on public.chat_thread to authenticated;
grant select, insert, delete on public.chat_participant to authenticated;
grant select, insert on public.chat_message to authenticated;

-- Realtime: da klepet osvezuje v zivo (Supabase realtime na sporocilih).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_message'
  ) then
    alter publication supabase_realtime add table public.chat_message;
  end if;
end $$;

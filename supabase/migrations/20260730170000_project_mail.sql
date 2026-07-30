-- Posta vezana na projekt (offer.id ali pravi projekt id): poslano IN prejeto.
-- Oblacni ekvivalent lib/postaDnevnik.ts (lokalni dnevnik). Per-organizacija RLS.
-- project_inbox = preslikava skritega inbound naslova (token) -> projekt, za
-- razvrstitev prejete poste (korak 2). Token se generira ob prvem posiljanju.

create table if not exists public.project_mail (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_external_id text not null,
  client_id uuid references public.clients(id) on delete set null,
  direction text not null default 'out' check (direction in ('out', 'in')),
  from_email text,
  to_emails text[] not null default '{}',
  subject text,
  body_text text,
  body_html text,
  summary text,
  message_id text,
  in_reply_to text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- de-dup prejete poste po (organizacija, message_id); poslane nimajo nujno id-ja
create unique index if not exists project_mail_org_message_id_key
  on public.project_mail (organization_id, message_id) where message_id is not null;
create index if not exists project_mail_project_idx
  on public.project_mail (organization_id, project_external_id, occurred_at desc);

alter table public.project_mail enable row level security;

drop policy if exists "members manage project mail" on public.project_mail;
create policy "members manage project mail" on public.project_mail
  for all using (public.is_organization_member(organization_id))
  with check (public.is_organization_member(organization_id));

grant select, insert, update, delete on public.project_mail to authenticated;

-- Skriti projektni inbound naslov: token -> projekt. Uporabi ga webhook (korak 2)
-- za razvrstitev prejete poste; nikoli ni viden strankam (le v reply-to).
create table if not exists public.project_inbox (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_external_id text not null,
  token text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists project_inbox_project_idx
  on public.project_inbox (organization_id, project_external_id);

alter table public.project_inbox enable row level security;

drop policy if exists "members read project inbox" on public.project_inbox;
create policy "members read project inbox" on public.project_inbox
  for select using (public.is_organization_member(organization_id));
drop policy if exists "members create project inbox" on public.project_inbox;
create policy "members create project inbox" on public.project_inbox
  for insert with check (public.is_organization_member(organization_id));

grant select, insert on public.project_inbox to authenticated;

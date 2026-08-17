-- ─────────────────────────────────────────────────────────────────────────────
-- EKIPA — Faza 1: vabila (invitations) + accept flow
--
-- Zakaj: SodelavciPanel je zdaj localStorage (enouporabniška simulacija). Za advance
-- paket rabimo PRAVO večuporabniško: povabiš po emailu -> povabljenec se prijavi ->
-- postane član ORGANIZACIJE (organization_members). Ta migracija doda samo VABILA in
-- varno accept funkcijo. Vidljivost/scoping (Faza 4) in frontend priklop (Faza 2-3)
-- pridejo v ločenih korakih, testirano na demo/2. računu PRED produkcijo.
--
-- Varno: samo NOVA tabela + funkcija + RLS. Ne spreminja obstoječih tabel/politik.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role public.membership_role not null default 'member',
  token uuid not null unique default gen_random_uuid(),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null
);

-- eno AKTIVNO (nepotrjeno) vabilo na email+organizacijo (ponovno vabilo prepiše staro prek app logike)
create unique index if not exists organization_invitations_pending_uniq
  on public.organization_invitations (organization_id, lower(email))
  where accepted_at is null;

create index if not exists organization_invitations_org_idx
  on public.organization_invitations (organization_id);

alter table public.organization_invitations enable row level security;

-- Samo ADMIN/OWNER organizacije vidi in upravlja vabila svoje organizacije.
create policy "org admins manage invitations"
  on public.organization_invitations
  for all
  using (public.is_organization_admin(organization_id))
  with check (public.is_organization_admin(organization_id));

-- ── Accept: povabljenec (prijavljen) unovči token -> postane član organizacije ──
-- security definer: obide RLS (povabljenec ŠE ni član), a strogo preveri token.
create or replace function public.accept_organization_invitation(invite_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.organization_invitations;
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Ni prijave.' using errcode = '28000';
  end if;

  select * into inv
  from public.organization_invitations
  where token = invite_token
    and accepted_at is null
    and expires_at > now()
  limit 1;

  if inv.id is null then
    raise exception 'Vabilo ni veljavno ali je poteklo.' using errcode = 'P0002';
  end if;

  -- dodaj kot člana (če je že član, ne podvoji)
  insert into public.organization_members (organization_id, user_id, role)
  values (inv.organization_id, uid, inv.role)
  on conflict (organization_id, user_id) do nothing;

  update public.organization_invitations
  set accepted_at = now(), accepted_by = uid
  where id = inv.id;

  return inv.organization_id;
end;
$$;

grant execute on function public.accept_organization_invitation(uuid) to authenticated;

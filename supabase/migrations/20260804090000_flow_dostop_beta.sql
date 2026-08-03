-- Zaprta beta / dodelitve: tabela flow_dostop + security-definer RPC flow_dostop_za.
-- Idempotentno: varno pognati tudi, ce tabela ze obstaja (popravi manjkajoca
-- dovoljenja, ki so povzrocila "permission denied for table flow_dostop").
--
--   · tester  — poln dostop do aplikacije (beta), brez datuma poteka
--   · nagrada — poln dostop za obdobje (velja_od–velja_do), potem potece -> placilo
--   · popust  — zabelezen % ob placilu (uveljavi se, ko bo placilni sistem ziv)

create table if not exists public.flow_dostop (
  email    text primary key,
  vrsta    text not null default 'tester' check (vrsta in ('tester', 'nagrada', 'popust')),
  velja_od date,
  velja_do date,
  popust   numeric,
  opomba   text,
  dodan    timestamptz not null default now()
);

-- RLS vklopljen, BREZ politik: do tabele pride samo service_role (obide RLS) in
-- spodnji security-definer RPC. Anon/authenticated NE moreta brati seznama.
alter table public.flow_dostop enable row level security;

-- Dovoljenja: service-role (admin panel prek /api) potrebuje polni dostop.
grant all on table public.flow_dostop to service_role;

-- RPC: vrne SAMO aktivno dodelitev za dani e-mail (znotraj obdobja) — ne razkrije
-- celega seznama. Uporabljata ga middleware (zaklep) in getAccessTier (paket).
-- DROP najprej: ce funkcija ze obstaja s staro obliko, bi "create or replace"
-- zavrnilo (sprememba return type) in razveljavilo celo transakcijo (tudi GRANT).
drop function if exists public.flow_dostop_za(text);
create function public.flow_dostop_za(p_email text)
returns table (vrsta text, velja_od date, velja_do date, popust numeric)
language sql
security definer
set search_path = public
as $$
  select d.vrsta, d.velja_od, d.velja_do, d.popust
  from public.flow_dostop d
  where d.email = lower(trim(p_email))
    and (d.velja_od is null or d.velja_od <= current_date)
    and (d.velja_do is null or d.velja_do >= current_date)
  limit 1;
$$;

grant execute on function public.flow_dostop_za(text) to anon, authenticated, service_role;

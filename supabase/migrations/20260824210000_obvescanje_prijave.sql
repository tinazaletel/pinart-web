-- Prijave na obvescanje (enovica).
--
-- Doslej je prijava padla v isti Google Sheet kot povprasevanja, odjava pa je
-- pocistila samo brskalnik tistega cloveka -- vrstica je ostala. Obljuba
-- odjave, ki se ne izvede, je najslabsa moznost pred GDPR.
--
-- Ta tabela je zapis PRIVOLITVE: kdaj je bila dana, od kod in po kateri
-- razlicici pogojev. Seznam za posiljanje zivi pri Resendu (Broadcasts);
-- tu hranimo dokaz in nadzor nad izbrisom.
--
-- IP-naslova NE hranimo -- v isti kartici uporabnici obljubljamo, da ga ne
-- zbiramo.

create table if not exists public.obvescanje_prijave (
  id                uuid primary key default gen_random_uuid(),
  email             text        not null unique,
  ime               text,
  jezik             text        not null default 'sl',
  vir               text        not null default 'kalkulator',
  pogoji_razlicica  text,
  zeton             text        not null unique,
  potrjeno_ob       timestamptz,
  ustvarjeno        timestamptz not null default now()
);

comment on table  public.obvescanje_prijave is 'Prijave na obvescanje. Zapis privolitve; seznam za posiljanje je pri Resendu.';
comment on column public.obvescanje_prijave.zeton is 'Skrivni zeton v povezavi za potrditev in odjavo. Brez prijave, en klik.';
comment on column public.obvescanje_prijave.potrjeno_ob is 'NULL = prijava se ni potrjena prek maila (dvojna privolitev).';

-- Nepotrjene je treba znati poiskati in pociscati: zanje privolitve NIMAMO.
create index if not exists obvescanje_prijave_nepotrjene_idx
  on public.obvescanje_prijave (ustvarjeno)
  where potrjeno_ob is null;

-- Dostop SAMO prek service_role (strezniske poti). Brez politik = brez
-- javnega branja in pisanja, tudi ce bi kdo dobil anon kljuc.
alter table public.obvescanje_prijave enable row level security;

-- RLS strezniskega kljuca ne ovira, dovoljenja na tabeli pa ga. Brez tega
-- vrne "permission denied for table" tudi service_role. Isto kot pri
-- agent_kljuci, beta_vstopi in ostalih.
grant all on public.obvescanje_prijave to service_role;

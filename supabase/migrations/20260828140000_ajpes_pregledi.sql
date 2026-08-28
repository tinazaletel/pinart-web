-- EVIDENCA AJPES PREGLEDOV (2026-08-28)
--
-- Zakaj tabela in ne zgolj števec: enote za proFi=Po so PINARTOVE, ne
-- uporabnikove. Vseh 200 jih črpa iz istega paketa, zato mora obstajati zapis,
-- KDO je koliko porabil — sicer en uporabnik z uvoženimi tristo strankami
-- izprazni zalogo, naslednjih petdeset plačnikov pa ostane brez, in nihče ne ve,
-- kaj se je zgodilo.
--
-- Zapis hkrati pove, katero kombinacijo (matična + leto + shema) smo že
-- prevzeli. AJPES iste kombinacije ne zaračuna dvakrat, zato je ponovni pregled
-- brezplačen in se v kvoto ne šteje.
create table if not exists public.ajpes_pregledi (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  maticna text not null,
  leto text not null,
  nabor text not null,
  vrsta_lp text not null,
  /* false = kombinacija je bila že prevzeta, AJPES je ni zaračunal */
  porabljena_enota boolean not null default true,
  /* Izvleček odgovora: blokade, insolventnost, odprt račun. Shranjen zato, da
     stranka ob naslednjem odprtju pokaže izid brez ponovnega klica — rezultat
     stoji tam z datumom, namesto da bi ga bilo treba vsakič sprožiti znova. */
  povzetek jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ajpes_pregledi_org_cas
  on public.ajpes_pregledi (organization_id, created_at desc);
create index if not exists ajpes_pregledi_kombinacija
  on public.ajpes_pregledi (organization_id, maticna, leto, nabor, vrsta_lp);

alter table public.ajpes_pregledi enable row level security;

drop policy if exists "clani berejo preglede" on public.ajpes_pregledi;
create policy "clani berejo preglede" on public.ajpes_pregledi
  for select using (public.is_organization_member(organization_id));

grant select on public.ajpes_pregledi to authenticated;
revoke insert, update, delete on public.ajpes_pregledi from authenticated;

comment on table public.ajpes_pregledi is
  'Poraba AJPES enot po organizaciji. Piše samo service_role (strežniška pot).';

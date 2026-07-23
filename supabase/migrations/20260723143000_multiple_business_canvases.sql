/*
  Vec Business Canvasov na podjetje.

  Obstojeci zapis je imel organization_id kot primarni kljuc, zato je bilo
  mogoce shraniti samo en Canvas. Migracija ohrani vse obstojece podatke in
  jim doda ime "Glavni Canvas".
*/

alter table public.business_canvases
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists name text not null default 'Glavni Canvas',
  add column if not exists company_name text,
  add column if not exists brand_name text,
  add column if not exists is_archived boolean not null default false,
  add column if not exists created_at timestamptz not null default now();

update public.business_canvases set id = gen_random_uuid() where id is null;
alter table public.business_canvases alter column id set not null;

alter table public.business_canvases
  drop constraint if exists business_canvases_pkey;
alter table public.business_canvases
  add constraint business_canvases_pkey primary key (id);

create index if not exists business_canvases_organization_updated_idx
  on public.business_canvases (organization_id, updated_at desc)
  where not is_archived;

create unique index if not exists business_canvases_organization_name_key
  on public.business_canvases (
    organization_id,
    lower(coalesce(company_name, '')),
    lower(coalesce(brand_name, '')),
    lower(name)
  );

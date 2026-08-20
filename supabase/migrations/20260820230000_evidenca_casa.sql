-- EVIDENCA DELOVNEGA ČASA — ZEPDSV (2026-08-20)
--
-- Zakon o evidencah na področju dela in socialne varnosti (ZEPDSV), 18. člen,
-- po noveli ZEPDSV-A (velja od 20. 11. 2023) zahteva evidenco o izrabi
-- delovnega časa za vsakogar, ki za delodajalca opravlja delo — vključno s
-- študenti in samozaposlenimi v delovnem procesu. Globe segajo do 20.000 EUR.
--
-- To NI štoparica. Štoparica (public.naloge -> data.porabljeniCasMinute) meri,
-- koliko časa je šlo na projekt; ta tabela beleži, KDAJ je človek delal:
-- prihod, obseg odmora, odhod, vrsta dneva in razlog odsotnosti. Dve različni
-- stvari, zato ločena tabela in ne stolpec v obstoječi.
--
-- Vzorec je NAMENOMA isti kot pri projektih (20260819100000_projekti_v_oblak):
-- external_id = stabilna identiteta zapisa, upsert po organization_id +
-- external_id, ob sporu zmaga novejši updated_at, brisanje potuje kot nagrobnik
-- (deleted_at). external_id je "<user_id>:<YYYY-MM-DD>", ker je en koledarski
-- dan ene osebe ena vrstica — s tem isti dan, vpisan na dveh napravah, ne more
-- nastati dvakrat, hkrati pa se dnevi dveh oseb ne zaletita v unique indeks.

create table if not exists public.delovni_dnevi (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  external_id text not null,
  -- ČIGAV dan je to. Ni created_by: evidenca je osebni zakonski zapis in ne
  -- zapis "kdor je pač kliknil". Kadrovik lahko vnaša za drugega, lastnik
  -- vrstice pa ostane oseba, na katero se evidenca nanaša.
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  datum date not null,
  -- ura prihoda in odhoda (novost ZEPDSV-A). time, ne timestamptz: evidenca je
  -- lokalna ura na delovnem mestu; časovni pas bi jo samo premaknil.
  prihod time,
  odhod time,
  -- obseg odmora v minutah — zakon zahteva "izrabo IN obseg", ne le kljukico
  odmor_minute integer not null default 0,
  -- 'delo' | 'dopust' | 'bolniska' | 'praznik' | 'prosto'
  vrsta text not null default 'delo',
  -- razlog odsotnosti oz. pripomba
  opomba text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, external_id)
);

create index if not exists delovni_dnevi_org_idx on public.delovni_dnevi (organization_id);
create index if not exists delovni_dnevi_oseba_idx on public.delovni_dnevi (organization_id, user_id, datum);

alter table public.delovni_dnevi enable row level security;

-- Vidnost je tu OŽJA kot pri projektih ali nalogah in to je namerno: evidenca
-- delovnega časa je osebni podatek o prisotnosti. Svojo evidenco vidi vsak sam,
-- CELO evidenco organizacije pa samo admin/lastnik — ker jo mora ob nadzoru
-- predložiti delodajalec. Deljenja po sme_videti_zapis tu NI: nihče ne sme
-- odpreti tuje evidence z deljenjem posameznega zapisa.
drop policy if exists "oseba ali admin read delovni_dnevi" on public.delovni_dnevi;
create policy "oseba ali admin read delovni_dnevi" on public.delovni_dnevi for select
  using (
    public.is_organization_member(organization_id)
    and (user_id = auth.uid() or public.is_organization_admin(organization_id))
  );

-- Vpisuje se lahko zase; za drugega samo admin (kadrovik vnese bolniško).
drop policy if exists "oseba ali admin insert delovni_dnevi" on public.delovni_dnevi;
create policy "oseba ali admin insert delovni_dnevi" on public.delovni_dnevi for insert
  with check (
    public.is_organization_member(organization_id)
    and (user_id = auth.uid() or public.is_organization_admin(organization_id))
  );

drop policy if exists "oseba ali admin update delovni_dnevi" on public.delovni_dnevi;
create policy "oseba ali admin update delovni_dnevi" on public.delovni_dnevi for update
  using (
    public.is_organization_member(organization_id)
    and (user_id = auth.uid() or public.is_organization_admin(organization_id))
  )
  with check (
    public.is_organization_member(organization_id)
    and (user_id = auth.uid() or public.is_organization_admin(organization_id))
  );

-- TRDEGA brisanja vmesnik NE uporablja: izbris gre skozi deleted_at (nagrobnik),
-- ker je evidenca po ZEPDSV listina trajne vrednosti in je ni dovoljeno uničiti.
-- Politika obstaja samo zato, da lahko admin počisti pomotoma nastale vrstice
-- (npr. podvojen uvoz), preden postanejo del uradne evidence.
drop policy if exists "admins delete delovni_dnevi" on public.delovni_dnevi;
create policy "admins delete delovni_dnevi" on public.delovni_dnevi for delete
  using (public.is_organization_admin(organization_id));

grant select, insert, update, delete on public.delovni_dnevi to authenticated;
revoke all on public.delovni_dnevi from anon;

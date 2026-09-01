-- NAČRTOVANE OBJAVE V OBLAK (Tina, 1. 9. 2026)
--
-- Objave so doslej živele samo v localStorage te naprave. Zdaj se sinhronizirajo
-- enako kot kampanje, prek skupne tabele organization_local_records. Ta ima na
-- stolpcu collection omejitev z naštetimi zbirkami, zato je vpis nove zbirke
-- padel z napako 23514 (check_violation) — v brskalniku se je pokazalo kot
-- »Sinhronizacija zbirke objave ni uspela«.
--
-- Omejitve ne brišemo po imenu: če je bila ustvarjena pod drugim imenom
-- (npr. ..._check1), bi drop po ugibanem imenu tiho ne naredil nič, dodali bi
-- drugo omejitev in stara bi še naprej zavračala vpise. Zato poiščemo VSE
-- preverbe na tej tabeli, ki omenjajo collection, jih odstranimo in dodamo eno
-- samo, ki pozna tudi 'objave'.

do $$
declare r record;
begin
  for r in
    select conname
    from pg_constraint
    where conrelid = 'public.organization_local_records'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%collection%'
  loop
    execute format('alter table public.organization_local_records drop constraint %I', r.conname);
  end loop;

  alter table public.organization_local_records
    add constraint organization_local_records_collection_check
    check (collection in ('klepet', 'marketing', 'objave', 'kom-obvestila', 'posta', 'pupa-nastavitve'));
end $$;

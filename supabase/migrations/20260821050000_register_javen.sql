-- REGISTER PODJETIJ TUDI ZA NEPRIJAVLJENE (21. 8. 2026)
--
-- Tina: »tudi brezplačni kalkulator mora ponuditi podjetje, ko vpisuješ —
-- saj so ti podatki brezplačni.« Drži: gre za javno objavljene podatke iz
-- Poslovnega registra Slovenije (AJPES) in davčnega registra (FURS), ki jih
-- oba objavljata v odprtih zbirkah.
--
-- Doslej je pravilo dovoljevalo branje samo prijavljenim, zato je iskalnik v
-- brezplačnem kalkulatorju vračal prazen seznam — vmesnik je deloval, podatkov
-- pa ni bilo od kod dobiti.
--
-- KAJ SE S TEM NE ODPRE: v tej tabeli so IZKLJUČNO javni podatki registra.
-- Uporabnikove lastne stranke živijo v `public.clients` in se v iskalnik
-- dodajo šele v brskalniku prijavljene uporabnice — skozi to tabelo ne gredo
-- nikoli. Odpiranje registra torej ne odpre ničesar Tininega.
--
-- Zloraba: pot /api/podjetja ima omejitev po IP (30 poizvedb na minuto za
-- neprijavljene) in zahteva vsaj tri znake, zato pobiranje celotnega registra
-- prek nje ni praktično.

drop policy if exists "vsi berejo register" on public.podjetja;
create policy "vsi berejo register" on public.podjetja for select
  using (true);

grant select on public.podjetja to anon;

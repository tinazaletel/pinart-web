# Codex — nastavitev številčenja računov

**Zakaj:** Tina prehaja na Flow **sredi leta** in je letos že izdala račune. Prvi
račun iz Flowa se mora vključiti v njeno obstoječo serijo, ne začeti nove. To ni
njena posebnost — vsak uporabnik, ki pride sredi leta, ima isto težavo, in danes
tega ni mogoče nastaviti drugače kot z ročnim posegom v bazo.

## Kaj že obstaja

- tabela `public.document_counters` (`organization_id`, `leto`, `vrsta`,
  `zadnja`, `vzorec`) — migracija `20260811100000_invoice_numbering.sql`
- funkcija `public.dodeli_stevilko(p_vrsta text)` — dodeli naslednjo številko
- `lib/stevilcenje.ts` — odjemalec, ki funkcijo kliče
- privzeta vzorca: `{leto}-{zaporedna}` za račun, `P-{leto}-{zaporedna}` za
  predračun

Uporabnik ima danes samo `select` pravico; pisati ne more.

## Kaj naredi

1. **Migracija** `supabase/migrations/20260824140000_stevilcenje_nastavitev.sql`:
   - funkcija `public.nastavi_stevilcenje(p_vrsta text, p_leto integer,
     p_zadnja integer, p_vzorec text)`, `security definer`, ki vrstico v
     `document_counters` ustvari ali posodobi.
   - **Sme jo klicati samo admin ali lastnik** (`public.is_organization_admin`).
   - `p_zadnja` ne sme biti manjši od trenutne vrednosti — **številke se ne
     smejo ponoviti**. Če je manjši, dvigni izjemo z razumljivim sporočilom.
   - `p_vzorec` mora vsebovati `{zaporedna}`; `{leto}` je neobvezen. Karkoli
     drugega zavrni.
   - `grant execute` samo `authenticated`, kot pri `dodeli_stevilko`.
2. **`lib/stevilcenje.ts`**: dodaj `preberiStevilcenje(leto)` in
   `nastaviStevilcenje(...)`. Čiste pomožne funkcije (preveri vzorec, sestavi
   predogled številke iz vzorca in zaporedne) daj v isti modul in jih **pokrij s
   testi** `tests/unit/stevilcenje.test.ts` — vsaj 12 testov: manjkajoč
   `{zaporedna}`, neveljavne oznake, vodilne ničle, predogled, meja leta.
3. **Vmesnik** v `components/SettingsWorkspace.tsx`, razdelek o dokumentih:
   - polji **»Zadnja izdana številka«** in **»Oblika številke«**
   - **živ predogled**: »Naslednji račun bo 2026-15«
   - kratko pojasnilo, da se zaporedje nadaljuje in se številke ne smejo
     ponoviti
   - ob shranjevanju uporabi obstoječi vzorec obvestil (`components/Toast.tsx`,
     glej DESIGN.md točka 13)
   - vidno **samo adminu/lastniku**; ostalim mirno pojasnilo, ne napaka

## Trde omejitve

- **NE spreminjaj:** `components/BusinessOverview.tsx`, `components/PupaDom.tsx`,
  `components/KalkulatorApp.tsx`, `components/TaskManagerWorkspace.tsx`,
  `lib/danes.ts`, `lib/priponke.ts`, `components/Priponke.tsx`, `DESIGN.md`.
- Ne spreminjaj `dodeli_stevilko` — samo dodaj novo funkcijo.
- Migracije **ne poganjaj**; Tina jo požene sama.
- Ne poganjaj `next build` (teče dev na 3456). Ne commitaj, ne pushaj.
- Na koncu `npx tsc --noEmit` in `npx vitest run`, poročaj točne izide.

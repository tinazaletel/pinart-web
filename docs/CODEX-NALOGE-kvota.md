# Codex — kvota prostora na organizacijo

**Zakaj zdaj:** 24. 8. so pristale priponke. Do včeraj je brezplačen račun hranil
samo besedilo, danes lahko naloži 20 MB na eno sporočilo. Brez kvote je to odprt
račun na ime ponudnika.

## Kaj naredi

1. **`lib/kvota.ts` — čiste funkcije, brez baze in brez `new Date()`:**
   - `KVOTE: Record<Paket, number>` v bajtih: `free` 100 MB, `premium` 1 GB,
     `pro` 5 GB. Imena paketov preberi iz `lib/pinartFlowEntitlements.ts` in
     `lib/paketi.ts` — ne izmišljaj si novih.
   - `jeSeProstora(porabljeno, kvota, dodatek)` → boolean
   - `odstotekKvote(porabljeno, kvota)` → 0–100
   - `stanjeKvote(porabljeno, kvota)` → `'ok' | 'opozorilo' | 'polno'`
     (opozorilo od 80 %)
   - `besediloKvote(porabljeno, kvota, jeEn)` → »Porabila si 82 MB od 100 MB«
     Za berljivo velikost **uporabi `berljivaVelikost` iz `lib/priponke.ts`**,
     ne pisati svoje.
2. **`app/api/kvota/route.ts`** — `GET`, vrne `{ porabljeno, kvota, stanje }`.
   Sešteje `size_bytes` iz `public.document_files` za organizacijo, kjer
   `deleted_at is null`. Rate-limit prek `@/lib/rate-limit`, kot druge poti.
3. **Ustavi nalaganje ob polni kvoti** v `lib/priponkeOblak.ts`
   (`naloziPriponko`): pred nalaganjem preveri kvoto in ob preseženi vrni jasno
   napako. **Nič se ne izbriše in nič ne postane nedostopno** — blokira se samo
   novo nalaganje.
4. **Prikaz** v `components/Priponke.tsx`: pri 80 % in več mirna vrstica z
   besedilom iz `besediloKvote`. Ne rdeče, ne klicaji.
5. **Testi** `tests/unit/kvota.test.ts` — vsaj 14: meje 0/79/80/99/100/čez,
   ničelna kvota, negativne vrednosti, besedilo v obeh jezikih.

## Trde omejitve

- **NE spreminjaj:** `lib/priponke.ts`, `components/TaskManagerWorkspace.tsx`,
  `components/BusinessOverview.tsx`, `lib/danes.ts`, `lib/naloge.ts`,
  `components/KalkulatorApp.tsx`, `app/[locale]/kalkulator/pregled/**`,
  `DESIGN.md`.
- Migracije ne rabiš — `document_files.size_bytes` že obstaja. Če se ti zdi, da
  jo rabiš, **najprej vprašaj**, ne piši je.
- Ne poganjaj `next build` (teče dev na 3456). Ne commitaj, ne pushaj.
- Preberi `DESIGN.md`, preden se dotakneš česa vidnega.
- Na koncu poženi `npx tsc --noEmit` in `npx vitest run` ter poročaj izide.

## Kaj NI del naloge

Plačila, nadgradnja paketa, brisanje starih datotek, arhiviranje. Samo
merjenje, opozorilo in ustavitev novega nalaganja.

# Codex — globoke povezave iz seznama »Kaj čaka nate«

**Težava:** vrstice na nadzorni plošči peljejo na pravo *stran*, ne na *zapis*.
Klikneš »Pošlji opomnik za račun« in pristaneš na seznamu vseh računov, kjer
moraš tisti račun spet poiskati. Edina stran, ki danes bere parametre iz
naslova, so Projekti.

## Kaj naredi

Vsaka od teh strani naj sprejme `?id=<external_id>` in ob nalaganju **odpre ali
označi tisti zapis**:

- `app/[locale]/kalkulator/racuni` — odpre račun
- `app/[locale]/kalkulator/komunikacija` — odpre sporočilo oziroma nit
- `app/[locale]/kalkulator/naloge` — odpre panel te naloge

Vzorec **prepiši iz Projektov**, kjer to že deluje — ne izumljaj drugega.

Nato v `lib/danes.ts` dopolni polje `kam`, da vsebuje id:
`/kalkulator/racuni?id=<r.id>` in tako naprej. Vrstice, ki id-ja nimajo, naj
ostanejo, kot so.

## Pozor

- `useSearchParams` v Next 14 zahteva `Suspense` ali `export const dynamic =
  'force-dynamic'`, sicer **pade build**. To se je v tem projektu že zgodilo.
  Preveri, kako je rešeno v Projektih, in naredi enako.
- Če zapisa z danim id-jem ni (izbrisan, tuja organizacija), naj se stran odpre
  normalno, brez napake in brez praznega panela.
- Testi za `lib/danes.ts` že obstajajo (`tests/unit/danes.test.ts`) — dopolni
  jih, da preverijo obliko `kam` z id-jem.

## Trde omejitve

- **NE spreminjaj:** `components/BusinessOverview.tsx`, `components/Priponke.tsx`,
  `lib/priponke.ts`, `components/KalkulatorApp.tsx`, `DESIGN.md`.
- Ne poganjaj `next build`, ne commitaj, ne pushaj.
- Na koncu `npx tsc --noEmit` in `npx vitest run`, poročaj izide.

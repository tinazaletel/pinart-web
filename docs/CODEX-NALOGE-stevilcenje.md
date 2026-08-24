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

## ŽE NAREJENO (24. 8., commit 73e0d1c) — tega NE delaj znova

Zaledje stoji in je pokrito s testi:

- migracija `supabase/migrations/20260824140000_stevilcenje_nastavitev.sql` s
  funkcijo `public.nastavi_stevilcenje(p_vrsta, p_leto, p_zadnja, p_vzorec)` —
  ustvari ali posodobi vrstico, sme jo klicati **samo admin**, nova `zadnja` ne
  more biti nižja od trenutne, oblika mora vsebovati `{zaporedna}`
- `lib/stevilcenje.ts`: `napakaVzorca`, `sestaviStevilko`, `preberiStevilcenje`,
  `nastaviStevilcenje`, `PRIVZETI_VZORCI`
- `tests/unit/stevilcenje.test.ts` — 16 testov, vsi zeleni

**Migracija še ni pognana v bazi.** To stori Tina; ti je ne poganjaj.

## Kaj naredi — ostane samo VMESNIK

## Kaj naredi (izvirni opis, za kontekst)

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

## Prvi stik: vprašaj takrat, ko šteje

Polje v Nastavitvah **ni dovolj**. Nihče ne gre v nastavitve, preden naredi prvi
račun. Če Flow tiho ponudi `2026-0001`, ga bo človek izdal — in čez tri mesece
bo imel v knjigah dve številki 0001. To ni nerodnost, to je davčna težava.

Zato: ko uporabnik **prvič** odpre nov račun in števca za to leto še ni, se nad
številko pokaže ena vrstica:

> **Je to tvoj prvi račun v letu 2026?**
> `[ Da, prvi je ]`  `[ Ne, že sem izdajala ]`

**Da** → številka ostane `2026-0001`, števec se nastavi na 0, vrstica izgine za
vedno.

**Ne** → eno samo polje:

> **Prepiši številko zadnjega računa, ki si ga izdala:** `2026-0014`
> ✓ Naslednji račun bo **2026-0015**

**Iz te ene številke izpelji obliko IN števec.** `2026-14` → `2026-15`;
`14/2026` → `15/2026`; `2026/0014` → `2026/0015`. Uporabnica ne sme nikoli
izvedeti, da obstaja nekaj takega kot »vzorec« — samo prepiše, kar že ima.
Prepoznavanje oblike je **čista funkcija** in mora biti pokrita s testi (vsaj
osem primerov, vključno z vodilnimi ničlami in obratnim vrstnim redom).

Če oblike ne prepoznaš, ne ugibaj: pokaži polje za obliko in predogled, dokler
ni videti prav.

## Nazaj ne gre — in to je treba povedati VNAPREJ

Tinina izrecna zahteva: to mora biti jasno povedano, ne šele kot napaka po
poskusu.

- **Pod poljem, preden potrdi**, mirno in brez klicaja:
  > Številke ni mogoče nastaviti nazaj. Ko bo prvi račun izdan, se zaporedje
  > lahko samo nadaljuje.
- **Ob potrditvi** pokaži, kaj bo: »Naslednji račun bo 2026-0015.«
- **Poznejši poskus nižje številke** zavrni s pojasnilom, ne s suho napako:
  > Trenutna zadnja številka je 2026-0015. Nižje ni mogoče nastaviti, ker bi se
  > številka ponovila. Ponovljena številka je hujša od preskočene.
- V Nastavitvah naj bo ob polju vedno vidno, katera je **trenutna zadnja**
  številka in katera bo naslednja.

## Trde omejitve

- **NE spreminjaj:** `components/BusinessOverview.tsx`, `components/PupaDom.tsx`,
  `components/KalkulatorApp.tsx`, `components/TaskManagerWorkspace.tsx`,
  `lib/danes.ts`, `lib/priponke.ts`, `components/Priponke.tsx`, `DESIGN.md`.
- Ne spreminjaj `dodeli_stevilko` — samo dodaj novo funkcijo.
- Migracije **ne poganjaj**; Tina jo požene sama.
- Ne poganjaj `next build` (teče dev na 3456). Ne commitaj, ne pushaj.
- Na koncu `npx tsc --noEmit` in `npx vitest run`, poročaj točne izide.

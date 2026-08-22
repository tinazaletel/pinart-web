# Cene — od kod so

**Zakaj ta dokument.** 21. 8. 2026 sva s Tino ugotovila, da izhodiščne cene v
`lib/pricingCatalog.ts` (CGP 1350 €, logotip 650 €) nimajo zapisanega izvora.
Raziskava je bila narejena, a je živela le v spominu pogovorov — zato sva
razpone popravljala po občutku in dvakrat zgrešila. Ta datoteka je zdaj vir
resnice; ob spremembi cene se popravi tudi tukaj.

**Stanje:** delno. Dva vira sta preverjena in zapisana spodaj. Ceniki
konkurence, ki jih je Tina našla na spletu, **še niso vpisani** — glej
»Manjka« na koncu.

---

## Vir 1 · Priporočila Društva oblikovalcev Slovenije (DOS)

**Uradni slovenski benchmark.** Vir: `priporocila.drustvo-oblikovalcev.si`
(smernice, vrednost točke, faktorji za obseg uporabe, primeri izračunov).
Zabeleženo 5. 8. 2026.

- **Vrednost točke: 4,00 €** (velja od 21. 6. 2023, letno se prilagaja).
  Storitev je ovrednotena v točkah; točke × 4 € = osnovna cena.
- **Formula obsega rabe:** `Vp = (A × B × C) × Voz`, kjer je Voz vrednost
  oblikovalske zasnove. Faktorji se **množijo**.
  - **A · teritorij:** nacionalno 1,0 · regionalno 1,5 · neomejeno 2,0
  - **B · doba:** do 1 leta 1,0 · do 5 let 1,5 · neomejeno 2,0
  - **C · intenzivnost:** manjša 1,0 · srednja 1,5 · velika 2,0
  - **Meji:** Fmin = 1, Fmax = 8
- **Produkcija se NE množi** s faktorjem obsega — samo idejna zasnova. To se
  ujema z logiko Flowa, kjer so pravice ločena postavka.
- **Njihov primer:** ista tri dela pri F = 1 stanejo 1.160 €, pri F = 4,5
  (2 × 1,5 × 1,5) pa 4.660 €.

**Zakaj šteje:** to je obramba pred očitkom »cene niso realne«. Flow ne sledi
občutku, ampak priporočilom stanovskega društva.

## Vir 2 · Tinin cenik (Google Sheet »Pinart_Cenik«)

Pokazan 23. 7. 2026. Struktura: kategorija, opis, **enota**, razpon za SLO in
za ZDA, ter velikosti XS/S/M/L.

**Razponi za Slovenijo:**

| storitev | razpon SLO | enota |
|---|---|---|
| Logotip | 400 – 2.000 € | projekt |
| Celostna grafična podoba | 600 – 3.500 € | projekt |
| Letaki | 50 – 180 € | kos |
| Brošure / katalogi | 250 – 1.200 € | projekt |
| Dodatna podstran | 150 – 400 € | stran |
| Backend razvoj | 60 – 90 € | ura |
| Vzdrževanje | 50 € | mesec |
| AI izobraževanje | 200 – 2.000 € | delavnica |

- **ZDA ≈ 1,5 – 2 × slovenske cene.** To je podlaga za tržni množitelj.
- **Enote niso pavšal:** na projekt, na kos, na stran, na uro, na kampanjo,
  mesečno, na delavnico.
- Kategorije: branding, digitalni marketing, UX/UI, spletni razvoj,
  izobraževanje in svetovanje.

Sheet: `docs.google.com/spreadsheets/d/10H00yPvJFED8S_YLTzlrmK6Ob6Jh3kX7_Qe0OM92Q0w`

---

## Kako iz tega nastanejo številke v kalkulatorju

**Izhodiščne cene** (`lib/pricingCatalog.ts`) so postavljene znotraj razponov
iz vira 2:

| storitev | izhodišče | razpon iz cenika | kje leži |
|---|---|---|---|
| Logotip | 650 € | 400 – 2.000 € | spodnja tretjina |
| CGP | 1.350 € | 600 – 3.500 € | sredina |

**Budgetni razponi** se od 21. 8. 2026 **izpeljejo iz izhodiščne cene**
(`budgetIzbire` v `lib/vprasanjaPoStoritvi.ts`) po pravilu 0,6× / 1,5× / 3×.
Prej so bili vpisani ročno na 24 mestih in so se razšli s cenikom.

**⚠️ Nepotrjeno:** pravilo 0,6× je matematično dosledno, ni pa preverjeno ob
resničnih ponudbah konkurence. Pri logotipu da spodnjo mejo 400 €, kar je
natanko dno Tininega razpona — verjetno prenizko za prvi predal. Preveriti ob
vpisu vira 3.

---

## Manjka

1. **Ceniki konkurence.** Tina je našla slovenska podjetja z javno objavljenimi
   ceniki in poslala posnetke. Za vsakega je treba zapisati: podjetje in
   povezavo, storitev, objavljeno ceno ali razpon, datum preverjanja, trg in
   valuto, primerljivost s Pinartovo storitvijo, ter sklep, kaj to pomeni za
   našo izhodiščno ceno.
2. **Izvor izhodiščnih cen za preostalih 22 storitev.** Zgoraj sta utemeljena
   samo logotip in CGP; ostale so v ceniku, njihov izvor pa ni zapisan.
3. **Točkovnik DOS po storitvah.** Vrednost točke poznamo, koliko točk je
   posamezna storitev, pa ni zabeleženo — brez tega DOS formule ne moremo
   uporabiti za neposredno primerjavo.

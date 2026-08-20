# Naloge za Codex — enajsta runda, 21. 8. 2026

Projekt: `~/Desktop/Pinart website/pinart-web`. Slovenska koda in komentarji.

**To vzemi ŠELE, ko končaš deseto rundo** (`docs/CODEX-NALOGE-marketing.md`).

## Pravila

- **NE dotikaj se** (delam v njih): `components/DokPanel.tsx`,
  `components/BriefAgent.tsx`, `components/PupaDom.tsx`, `components/Pupa.tsx`,
  `components/BusinessCanvasWorkspace.tsx`, `components/AgentTabla.tsx`,
  `components/FlowCloudBridge.tsx`, `app/api/agent-naloge/**`, `app/api/cron/**`,
  `vercel.json`
- **NE poganjaj `npm run build`** (dev na 3456). `npx tsc --noEmit` in `npx vitest run`.
- Paleta: vijola `#6E4FA6`, napaka `#a4342a`, uspeh `#2F5D50`. **Rumene ni.**
- V novi kodi ne uporabljaj `#8a8177` — pade na kontrastu (3,83 : 1).

---

# 1. Dokumenti naj delujejo TUDI brez AI

Tinina zahteva (21. 8. 2026): »lahko imamo kasneje tam kot vprašalnik tako da
deluje tudi brez pupe.«

## Zakaj to šteje

Danes brief, pitch in canvas **brez modela ne naredijo nič** — brez ključa
vrnejo napako. To pomeni troje, in vsako je slabo:

1. Kdor nima povezanega agenta in nima našega ključa, vidi mrtev gumb.
2. Če ponudnik pade ali podraži, pade cel dokumentni del izdelka.
3. V zaprti beti bo marsikdo hotel samo **strukturo**, ne pa da mu vsebino
   piše model.

Vprašalnik to reši in hkrati naredi nekaj boljšega: **Flow ostane uporaben brez
AI.** AI je takrat pospeševalnik, ne pogoj.

## Kaj naredi

Vsak dokument dobi **dve poti do istega izida**:

**a) »Naj napiše Pupa«** — kar je danes. Ostane privzeto, kadar je AI na voljo.

**b) »Izpolnim sama«** — vprašalnik: ista polja, ki jih sicer vrne model, samo
da jih uporabnica vpiše sama. Eno vprašanje na korak ali vsa v enem stolpcu —
odloči se za eno in bodi dosleden.

- Preklop naj bo **viden vnaprej**, ne skrit v napaki. Dva gumba ali stikalo
  nad poljem za opis.
- Če AI ni na voljo (ni ključa, ponudnik vrne napako), naj se vprašalnik
  ponudi **takoj v istem sporočilu**: »Pupa trenutno ni dosegljiva — lahko
  izpolniš sama.« Nikoli slepa ulica.
- Izid je **isti objekt** kot pri AI poti, zato gre skozi isto shranjevanje na
  projekt. Ne podvajaj shranjevalne logike.
- Vsako polje naj ima kratko **pomoč, kaj sploh vpisati** — en stavek primera.
  Prazno okno z napisom »Ton glasu« ne pomaga nikomur.

**Vprašalnik naj se da uporabiti tudi za urejanje** izida, ki ga je napisala
Pupa. Model se zmoti; uporabnica mora znati popraviti brez ponovnega pisanja.

## Česa NE delaj

- Ne gradi svojega prikaza dokumenta. Prikaz je moj `DokPanel` — ti samo vrni
  polja in v poročilu povej, kaj naj priklopim.
- Ne skrivaj AI poti, ko ključ obstaja. Vprašalnik je enakovredna izbira, ne
  kazen.

---

# 2. Priporoči Flow — povabilo in donacija

Majhno in samostojno.

- **Povabilo:** uporabnica dobi svojo povezavo. Kdor se prek nje registrira,
  se zabeleži. Nagrado (npr. mesec paketa) zaenkrat samo **evidentiraj**;
  o obliki nagrade odloči Tina.
- **Donacija:** tih pas nekje v nastavitvah ali v nogi — »Flow ti prihrani
  čas? Podpri razvoj.« Brez pojavnih oken in brez ponavljanja; kdor ga zapre,
  ga ne vidi več.
- Migracija: prva prosta številka je **`20260821030000`**. Tabela naj hrani
  povabilo (kdo, koda, kdaj) in registracijo prek nje.

Ne vgrajuj plačilnega ponudnika. Stripe pride ločeno in ni tvoja runda.

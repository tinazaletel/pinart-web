# Naloge za Codex — dvanajsta runda, nočna, 21. 8. 2026

Projekt: `~/Desktop/Pinart website/pinart-web`. Slovenska koda in komentarji.

Deseto in enajsto rundo si opravil. Ti dve sta nocojšnji.

## Pravila

- **NE dotikaj se** (jutri delam v njih): `components/DokPanel.tsx` (**uporabljaj
  ga, ne spreminjaj**), `components/BriefAgent.tsx`, `components/PitchAgent.tsx`,
  `components/CanvasAgent.tsx`, `components/PupaDom.tsx`, `components/Pupa.tsx`,
  `components/AgentTabla.tsx`, `components/FlowCloudBridge.tsx`,
  `app/api/agent-naloge/**`, `app/api/cron/**`, `vercel.json`
- **NE poganjaj `npm run build`** (dev na 3456). `npx tsc --noEmit`, `npx vitest run`.
- Prva prosta številka migracije: **`20260821040000`**.
- Paleta: vijola `#6E4FA6`, napaka `#a4342a`, uspeh `#2F5D50`. **Rumene ni.**
- Ne uporabljaj `#8a8177` — pade na kontrastu (3,83 : 1).

---

# 1. Dokumenti morajo biti VIDNI na projektu

## Zakaj to šteje — preberi, preden kodiraš

Tina ponavlja isti prizor že desetič: *»V avtu se pelješ in mu govoriš: naredi
mi ponudbo. On te sprašuje. Ko se pripelješ v službo, imaš stvari narejene na
projektu — pregledaš in pošlješ.«*

Zadnji del tega prizora je **pokvarjen**. Pitch se shrani na projekt kot polje
`pitch` (`lib/projekti.ts`, vrstica ~86), ampak **nobena stran ga ne prikaže** —
preveril sem z iskanjem po vsej kodi. Uporabnica se torej pripelje v službo in
tam ni ničesar. Dokument, ki ga ni mogoče najti, je enak dokumentu, ki ga ni.

## Kaj naredi

Na podrobnostih projekta (`components/ProjectDetailModern.tsx`) dodaj razdelek
**Dokumenti**:

- Seštej, kaj projekt ima: **brief** (polja `opisStranke`, `panoga`,
  `ciljnaSkupina`, `dizajnZelje`, `voice`, `konkurenca`, `cilji`), **pitch**
  (`projekt.pitch`), **SWOT** in ostale, ki si jih dodal v enajsti rundi.
- Vsak naj bo **ena vrstica**: ime dokumenta, kdaj je nastal, in klik.
- Klik odpre **`components/DokPanel.tsx`** — isti panel, ki ga uporablja brief.
  Poglej, kako ga kliče `BriefAgent.tsx`, in ga uporabi enako. **Ne piši
  svojega prikaza in ne spreminjaj panela** — če se videzi dokumentov razidejo,
  smo tam, kjer smo bili.
- Če dokumenta ni, ga **ne naštevaj kot prazno vrstico**. Namesto tega en tih
  napis: »Brief še ni napisan« s povezavo na `?orodje=brief`. Prazna vrstica z
  imenom dokumenta zgleda kot okvara.

**Ne dodajaj gumba za brisanje.** Dokumenti so del projekta, ne priponke.

## To NI seznam dveh dokumentov — je kraj, kamor gre vse

Tina (21. 8., 01:50): »tudi link do canvasa, brief, kar je fajn shraniti s
projektom, pregled konkurence, vse.«

Zato **ne zakodiraj seznama v JSX**. Naredi **en register vrst dokumentov** —
na primer polje v `lib/` z zapisi `{ kljuc, ime, jeNaVoljo(projekt), odpri }` —
in razdelek naj se izriše iz njega. Dodati nov dokument mora biti **ena
vrstica**, ne nov blok pogojev. Vrst bo še precej.

V register ob zagonu daj vse, kar že obstaja ali nastaja:
- brief, pitch, SWOT in ostale iz enajste runde;
- **pregled konkurence** in **raziskava stranke** iz druge naloge spodaj;
- **povezavo na Canvas** — ta ne živi na projektu, ampak v Poslovnem okviru
  (`lib/pinartCanvas`). Zato ni vrstica z vsebino, ampak **povezava** z jasno
  oznako, da gre za poslovni dokument, ne projektnega.

To razlikovanje ohrani: kar je **o projektu**, se hrani na projektu; kar je **o
podjetju** (canvas, brand brief), ostane v Poslovnem okviru in je s projekta
samo dosegljivo. Brez tega bo isti dokument čez mesec dni na dveh mestih z
dvema različnima vsebinama.

### Vez manjka — to je pravo delo te naloge

Tina (21. 8., 01:55): »ja sam je treba povezati.«

Ima prav in tu ne gre za povezavo v smislu gumba. Canvas danes **ne ve, h
kateremu projektu sodi** — v Poslovnem okviru je seznam dokumentov brez vsake
vezi na projekt. Zato »odpri canvas« s projekta ne more odpreti *pravega*
canvasa, ampak le seznam vseh. To ni povezava, to je bližnjica.

Kaj naredi:

- Poslovni dokument (canvas in kar bo še prišlo v okvir) dobi **neobvezno vez
  na projekt** — polje `projektExternalId`. Neobvezno namerno: canvas o
  podjetju ni od nobenega projekta in mora smeti ostati brez vezi.
- Migracija **`20260821040000`**: stolpec na tabeli poslovnih dokumentov, plus
  push/pull po istem vzorcu kot ostala polja.
- Na projektu naštej **samo dokumente, vezane nanj**. Kjer vezi ni, pokaži
  »Poveži obstoječi canvas« z izbiro iz seznama — in **»Ustvari novega«**, ki
  novega takoj poveže.
- V Poslovnem okviru naj kartica dokumenta pokaže, **h kateremu projektu
  sodi**, če sodi. Vez mora biti vidna z obeh strani, sicer je pol vezi.

Isti vzorec uporabi za vse prihodnje poslovne dokumente. Naredi ga enkrat in
prav; to je tista vez, brez katere razdelek Dokumenti ostane okrasek.

---

# 2. Dve novi Pupini opravili

Po **istem vzorcu** kot brief in pitch: preprost vpis → model vrne JSON →
uporabnica pregleda v `DokPanel` → shrani na projekt.

**a) »Razišči stranko«** — vpišeš ime podjetja (ali ga izbereš iz obstoječih
strank, iskalnik je v `components/IskalnikPodjetij.tsx`), Pupa vrne: čim dela,
kdo so njihove stranke, kako se predstavljajo, kaj bi jim lahko ponudili in
**tri vprašanja, ki jih velja postaviti na prvem sestanku**.

Zadnja točka je najbolj vredna. Tina to potrebuje **pred sestankom**, ne po
njem.

**b) »Preglej konkurenco«** — vpišeš panogo in nekaj imen, Pupa vrne primerjavo:
kako se pozicionirajo, kaj poudarjajo, kje je vrzel. **Brez izmišljenih cen** —
če model ne ve, naj tega ne ugiba. Izmišljena cena je hujša od manjkajoče.

**Priklop v Pupin dom je moj.** `PupaDom.tsx` je prepovedan; komponenti samo
napiši in v poročilu povej, kateri vrstici naj dodam.

## Če zmanjka časa

Naredi **prvo nalogo**. Vidni dokumenti na projektu so tisto, kar manjka
Tininemu prizoru; novi opravili sta dodatek.

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

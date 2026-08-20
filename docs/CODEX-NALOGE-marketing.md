# Naloge za Codex — deseta runda, 20. 8. 2026

Projekt: `~/Desktop/Pinart website/pinart-web`. Slovenska koda in komentarji.

Dve nalogi. Prva so trije drobci, ki odpravijo prepisovanje; druga dokonča
dokumentni hub.

## Pravila

- **NE dotikaj se** (drugi delajo v njih): `components/AgentTabla.tsx`,
  `components/PupaDom.tsx`, `components/Pupa.tsx`, `components/FlowCloudBridge.tsx`,
  `components/EvidencaCasa.tsx`, `components/SefAvtorstvaWorkspace.tsx`,
  `lib/evidencaCasa*.ts`, `lib/casovniZig.ts`, `lib/sefOblak.ts`,
  `app/api/agent-naloge/**`, `app/api/cron/**`, `app/api/sef/**`, `vercel.json`
- **NE poganjaj `npm run build`** (dev na 3456). Preverjaj z `npx tsc --noEmit`
  in `npx vitest run`.
- Prva prosta številka migracije: **`20260821020000`**.
- Paleta: vijola `#6E4FA6`, napaka `#a4342a`, uspeh `#2F5D50`. **Rumene ni.**
- **Kontrast:** `#8a8177` na beli je 3,83 : 1 in za drobno besedilo pade
  (glej `docs/DOSTOPNOST-pregled.md`). V novi kodi uporabi `#6b655d`.

---

# 1. Marketing — trije drobci

Vse troje je v `components/MarketingWorkspace.tsx`.

**a) Lasten kanal.** `SocialKanal` je zaklenjen tip osmih omrežij (vrstica 36).
Kdor načrtuje novičnik, blog ali podcast, tega nima kam vpisati. Dodaj
možnost lastnega kanala z imenom, ki si ga uporabnica izmisli sama, in
neobveznim naslovom. Shranjen naj bo tam, kjer so ostale marketinške
nastavitve — brez nove tabele, če se da.

**b) »Odpri« naj pelje na NJEN profil.** Zdaj gumb odpre `instagram.com`,
torej Instagram nasploh (`SOCIAL_LINKI`, vrstica 40). Uporabnico odloži pred
vhodom in svojo stran mora poiskati sama.
Dodaj mesto, kjer enkrat vpiše svoje naslove profilov; gumb naj potem odpre
njen profil, in samo če naslova ni, splošno stran omrežja.

**c) Iz objave naredi nalogo.** Kartica *Flow Naloge* je zdaj le bližnjica na
seznam (vrstica 318). Načrtovana objava in naloga se ne poznata, zato se
priprava besedila in vizuala prepisuje ročno.
Pri načrtovani objavi dodaj gumb, ki ustvari nalogo z naslovom objave, njenim
datumom kot rokom in besedilom v opisu. Uporabi obstoječi način ustvarjanja
nalog — ne pisati novega.

To je od treh edina, ki kaj spremeni. Če zmanjka časa, naj bo narejena ta.

---

# 2. Šest manjkajočih dokumentov v poslovnem okviru

Na strani **Poslovni okvir** (`components/BusinessCanvasWorkspace.tsx`) je mreža
dokumentov. Brief in Pitch sta **že aktivna** (kartica z oznako »Na voljo«, ki
pelje na `/kalkulator/dom?orodje=…`). Šest jih še nosi oznako »Kmalu«:

Problem · Persone · Vrednostna ponudba · Empathy map · Journey map · SWOT ·
Brand brief

Naredi jih po **istem vzorcu** kot pitch in brief

Pitch in brief že obstajata (`components/PitchAgent.tsx`,
`components/BriefAgent.tsx`) in delujeta po istem vzorcu: preprost vpis →
model vrne JSON → uporabnica pregleda → shrani na projekt.

**Ne izmišljaj si novega vzorca; skopiraj obstoječega.** Vsak dokument je ista
zgodba z drugimi polji.

Če ne moreš narediti vseh sedmih, naredi po vrsti: **SWOT, Persone, Problem** —
te tri Tina rabi za sestanke. Ostale pusti pri »Kmalu«; delno obljubljena
kartica je slabša od poštene.

Polja po dokumentu:
- **SWOT** — prednosti, slabosti, priložnosti, nevarnosti
- **Persone** — ime persone, kaj dela, kaj jo tare, kaj si želi, kje jo najdeš
- **Problem** — čigav problem, kako ga rešuje danes, zakaj to ne zadošča
- **Vrednostna ponudba** — opravilo stranke, bolečine, koristi, naša rešitev
- **Empathy map** — misli, čuti, vidi, sliši
- **Journey map** — koraki poti, kaj stranka takrat čuti, kje se zatakne
- **Brand brief** — misija, vrednote, ton govora, česa nikoli ne rečemo

- Vpis naj bo v vsakdanjem jeziku — »o čem gre« in »kdo je stranka« —, ne
  obrazec s štirimi praznimi okni. Če bi uporabnica znala izpolniti štiri okna,
  orodja ne bi rabila.
- Prikaz naj bo **polja v mreži**, tiskljivo. Ne canvas.
- Shrani na projekt po istem vzorcu kot pitch (`shraniProjekt({ ...projekt,
  swot })`); polja dodaj v `Projekt` v `lib/projekti.ts` kot neobvezna.
- **`components/PupaDom.tsx` in `components/BusinessCanvasWorkspace.tsx` sta
  prepovedana** — v njiju delam jaz. Komponente samo napiši in v poročilu povej,
  katero vrstico naj dodam jaz; priklop v obe strani je moj.

## Česa NE delaj

- Ne dodajaj novih zunanjih odvisnosti.
- Ne spreminjaj Pitcha in Briefa. Ta runda ju samo posnema.

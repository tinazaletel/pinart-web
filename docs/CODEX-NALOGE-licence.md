# Naloge za Codex — sedma runda, 20. 8. 2026

Projekt: `~/Desktop/Pinart website/pinart-web`. Slovenska koda in komentarji.

Ena sama naloga, a pomembna: **opomniki za potekle licence**. Tina je danes vprašala, ali delujejo. Ne delujejo — in našel sem, zakaj je mislila, da: v demo podatkih (`lib/predogled.ts`, vrstica ~218) je vzorčni zapis »ALERT: Potekle avtorske pravice — licenca za tisk je potekla 1. 6. 2026«. Predogled torej obljublja funkcijo, ki je ni.

## Pravila

- **NE dotikaj se** (Claude dela v njih): `components/PupaDom.tsx`, `components/Pupa.tsx`, `components/BriefAgent.tsx`, `components/PitchAgent.tsx`, `components/CanvasAgent.tsx`, `components/PortalOgled.tsx`, `components/FlowCloudBridge.tsx`, `components/FlowLanding.tsx`, `components/SettingsWorkspace.tsx`, `components/MojAiPovezave.tsx`, `components/SidebarUserMenu.tsx`, `lib/portalZeton.ts`, `lib/aiPonudniki.ts`, `lib/vstopnaStran.ts`, `app/api/portal/**`, `app/[locale]/p/**`
- **NE poganjaj `npm run build`** (dev na 3456). Preverjaj z `npx tsc --noEmit` in `npx vitest run`.
- Migracijo samo napiši; SQL podaj v poročilu. Zadnja obstoječa številka je `20260820200000`.
- Paleta: vijola `#6E4FA6`, napaka `#a4342a`, uspeh `#2F5D50`. Rumene ni.

---

## Zakaj to šteje

To ni administrativni opomnik. **Potekla licenca je iztočnica za nov posel.** Stranka, ki še naprej uporablja delo, mora pravice podaljšati — in nihče od konkurence tega ne spremlja, ker generična orodja ne vedo, da avtorske pravice sploh imajo rok. To je ena redkih funkcij, ki jo lahko ima samo orodje, ki razume kreativno delo.

## Kaj je treba narediti

**1. Trajanje licence mora preživeti shranjevanje ponudbe.**
Danes je v `components/KalkulatorApp.tsx` (`PravRec.trajanje`, `PravRec.trajLeta`, tudi `LastnaPravica`), a se v shranjeno ponudbo (`FlowOffer` v `lib/pinartFlowStore.ts`) prenese samo kot **besedilo** v `scope`. Iz besedila datuma ni mogoče izračunati.

- `FlowOffer` naj dobi neobvezno polje **`licencaDo?: string`** (datum ISO).
- Izračunaj ga ob shranjevanju ponudbe: datum ponudbe + trajanje pravic. Če je pravic več z različnimi roki, vzemi **najzgodnejši** — prvi potek je tisti, ki šteje.
- Če je prenos izključni ali trajen, polja ne nastavljaj (ni poteka).
- Stare ponudbe ostanejo brez polja in se obnašajo kot doslej.

**2. Migracija:** stolpec `licenca_do date` na `public.offers`, plus push/pull v `lib/pinartFlowCloud.ts` (isti vzorec kot ostala polja ponudbe).

**3. Opozorilo v vmesniku:**
- **Domov (pregled):** kartica ali vrstica »Licence, ki potečejo« — kaj poteče v naslednjih 60 dneh, in kaj je že poteklo.
- **Koledar:** vpis na datum poteka.
- **Profil stranke:** pri njenih ponudbah označi tiste s poteklo licenco.
- Barva: opozorilo pred potekom nevtralno, **poteklo rdeče** (`#a4342a`). Rumene ni.

**4. Besedilo naj bo poslovno, ne administrativno.**
Ne »licenca je potekla«, ampak nekaj v smislu: **»Licenca za tisk pri stranki Inovis je potekla 1. 6. Predlagaj podaljšanje.«** Cilj je, da uporabnica pomisli na ponudbo, ne na opravilo.

**5. Demo podatki:** ko funkcija deluje, naj vzorčni »ALERT« v `lib/predogled.ts` ostane, a se ujema z resničnim izračunom — sicer predogled spet obljublja nekaj drugega, kot izdelek počne.

## Česa NE delaj

- Brez pošiljanja mailov v tej rundi. Najprej naj bo vidno v aplikaciji; obveščanje po pošti je svoja odločitev (kdaj, kako pogosto, možnost izklopa).
- Ne spreminjaj izračuna cene pravic. Samo bereš trajanje, ne posegaš v vrednotenje.

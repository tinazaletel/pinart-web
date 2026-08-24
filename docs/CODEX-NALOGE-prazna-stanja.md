# Codex — prazno stanje ne sme lagati

**Zakaj:** Tina odpre Naloge in za trenutek vidi prazno tablo z »Povleci nalogo
sem«, potem se podatki pojavijo. Enako na nadzorni plošči, kjer najprej piše
`0 €`. Njene besede: *»to vzbuja nezaupanje«* — in prav ima. Aplikacija tisti
hip trdi, da podatkov ni.

Vzrok ni napaka: delovni prostori berejo shrambo šele po montaži (prej ne smejo,
ker razbije hidracijo), prijavljenim pa `FlowCloudBridge` takoj zatem potegne
podatke še iz oblaka. Prvi izris je prazen **po zasnovi**.

**Pravilo, ki ga uvajamo:** prazno stanje sme trditi, da je prazno, šele ko RES
vemo. Do takrat je tiho.

## Kaj že obstaja

`lib/oblakStanje.ts` — `useOblakPripravljen()` vrne `true`, ko se začetna
sinhronizacija konča, ko javi napako, ali po izteku 2,5 s (da okvara ne pomeni
večnega vrtiljaka). Neprijavljeno uporabnico reši prav iztek.

## Kaj naredi

Za vsak spodnji zaslon dodaj lokalno stanje »naloženo« (podatki prebrani) in ga
združi z `useOblakPripravljen()`. Dokler oboje ni res:

- **ne izpiši praznega stanja** (»Ni odprtih nalog«, »Povleci nalogo sem«,
  »Ni še projektov«, `0 €` …)
- namesto tega pokaži **tiho skeletno ploskev** v obliki vsebine, ki pride
  (kartica, vrstica, stolpec) — brez besedila in brez vrtiljaka
- postavitev se ob prihodu podatkov **ne sme premakniti**

Zasloni, po vrsti pomembnosti:

1. `components/TaskManagerWorkspace.tsx` — kanban stolpci in seznam
2. `components/KomunikacijaWorkspace.tsx` — seznam pošte in niti
3. `components/ArhivWorkspace.tsx` — projekti in arhiv
4. `components/InvoiceWorkspace.tsx` — seznam računov

Skeleton naj bo **ena skupna komponenta** (npr. `components/Skeleton.tsx`), ne
štiri različne. Spoštuj `prefers-reduced-motion`.

## Trde omejitve

- **NE spreminjaj:** `components/BusinessOverview.tsx` (to naredim sam),
  `components/PupaDom.tsx`, `components/KalkulatorApp.tsx`, `lib/danes.ts`,
  `lib/priponke.ts`, `components/Priponke.tsx`, `lib/oblakStanje.ts`,
  `DESIGN.md`.
- Ne uvajaj novih knjižnic.
- Ne poganjaj `next build`. Ne commitaj, ne pushaj.
- Na koncu `npx tsc --noEmit` in `npx vitest run`, poročaj točne izide.

## Ko končaš

Napiši, katero pravilo naj zapišem v `DESIGN.md`, da bo veljalo za vse prihodnje
zaslone. Zapisal ga bom jaz.

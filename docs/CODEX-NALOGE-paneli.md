# Codex — poenotenje drsečih panelov (23. 8. 2026)

## Zakaj

Tina, 23. 8.: »te slide desni paneli je vsak drugačen in ne razumem zakaj se
ne držiš neke sistematike«. Imela je prav — v Flowu je bilo **sedem**
neodvisnih implementacij panela, ki zdrsne z desne, vsak s svojo širino,
zatemnitvijo, senco in hitrostjo.

Ponoči so bili poenoteni paneli v `DokPanel`, `ProjectsWorkspace` in
dokumentni panel za ponudbe/račune/pogodbe. **Ostali niso.**

## Vzorec — `components/DokPanel.tsx`

Vse vrednosti prepiši od tam, ne izmišljaj si svojih:

| lastnost | vrednost |
|---|---|
| širina | `min(46rem, 94vw)` |
| senca | `-18px 0 50px oklch(40% .08 300 / .18)` |
| animacija | `.3s cubic-bezier(.2,.85,.25,1)`, samo `translateX(100%) → 0` |
| zatemnitev | `oklch(30% .03 300 / .22)` |
| ovoj | `rgba(255,255,255,.86)` + `backdrop-filter: blur(24px) saturate(1.4)` |
| vsebina | bel papir znotraj, `border-radius: 1rem 1rem 0 0` |
| glava | **Natisni levo z ikono** (brez ozadja), **zapri desno kot krog** |
| `prefers-reduced-motion` | animacija `none` |

## Kaj je treba narediti

Poravnaj na zgornje vrednosti panele v teh datotekah:

1. **`components/KalkulatorApp.tsx`** — pet ločenih implementacij v isti
   datoteki (`grep -n "translateX(100%)"`)
2. **`components/ContractWorkspace.tsx`** — ena
3. **`components/PupaDom.tsx`** — ena

## Dvoje, kar je pri tem NUJNO

**a) Portal.** Panel s `position: fixed` mora biti v portalu na `<body>`
(`createPortal`). Sicer ga ujame prvi prednik s `transform`, `filter` ali
`overflow: clip` in panel obvisi sredi strani z ozadjem ob sebi. To se je
zgodilo `DokPanelu` in je bilo popravljeno 23. 8.

**b) Pisava v portalu.** Znotraj portala `var(--font-serif)` NI več preslikan
v Flow serif (preslikava živi na `.shell` v `pregled.module.css`) in pade na
portfeljev Bodoni. V panelih uporabi **`var(--font-serif-flow)`**.

**c) Zaklep drsenja.** Ob odprtem panelu se telo zaklene, sicer se pod
panelom premika stran in vidita se dva drsnika:

```ts
useEffect(() => {
  if (!odprt || typeof document === 'undefined') return;
  const prejO = document.body.style.overflow;
  const prejP = document.body.style.paddingRight;
  const sirina = window.innerWidth - document.documentElement.clientWidth;
  document.body.style.overflow = 'hidden';
  if (sirina > 0) document.body.style.paddingRight = `${sirina}px`;
  return () => { document.body.style.overflow = prejO; document.body.style.paddingRight = prejP; };
}, [odprt]);
```

## Meje — česa se NE dotikaj

Te datoteke hkrati ureja Claude; ne odpiraj jih:

- `app/api/posta/**`, `lib/postaDnevnik.ts`, `components/KomunikacijaWorkspace.tsx` (priponke)
- `lib/danes.ts`, `tests/unit/danes.test.ts`, `components/BusinessOverview.tsx` (seznam »Danes«)
- `app/api/pupa/**`, `components/PupaPogovor.tsx` (kazalnik porabe — dela drug agent)

**Ne spreminjaj vsebine panelov, samo ovoj.** Kaj je v panelu, je Tinina
odločitev; ti poravnavaš mere, ne oblikuješ na novo.

## Preverjanje pred oddajo

```
npx tsc --noEmit
npm test
```

Ne poganjaj `npm run build`, kadar teče dev strežnik na vratih 3456.

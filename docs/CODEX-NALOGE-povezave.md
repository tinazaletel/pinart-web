# Codex — povezovanje dokumentov s projektom (23. 8. 2026, zvečer)

## Kaj je narobe

Na podrobnostih projekta so pri karticah **Ponudbe in pogodbe**, **Računi** in
**Stroški** gumbi `+`. Vsi trije peljejo na strani, kjer se ustvari **nov**
dokument:

- `components/ProjectDetailModern.tsx` → `${base}/kalkulator/pogodbe`
- isto za `/kalkulator/racuni` in `/kalkulator/stroski`

Tina, 23. 8.: *»tale gumb pomojem ne sme biti link do nove ponudbe ampak link
do uvoza v projekt ponudbe in pogodbe?«* — in ima prav. Na projektu je smiselno
**povezati obstoječ** dokument, ne ustvarjati novega.

Poleg tega dokumenta, ki pristane na napačnem projektu, danes **ni mogoče
prevezati** — nikjer ni izbirnika, ki bi obstoječemu zapisu zamenjal projekt.

## Kaj naredi

Panel za izbiro obstoječega dokumenta, ki se odpre iz gumba `+`:

1. `ProjectDetailModern` dobi nov prop, npr.
   `onPoveziObstojece?: (tip: 'ponudbe' | 'pogodbe' | 'racuni' | 'stroski') => void`,
   in gumbi `+` kličejo njega namesto `<Link>`.
2. `ProjectsWorkspace` prop implementira: odpre panel s seznamom dokumentov
   izbrane vrste, ki **še niso vezani na ta projekt**.
3. Ob izbiri se zapiše povezava in seznam na projektu se osveži.

## Kako se povezava zapiše

Vsi štirje tipi uporabljajo isto polje **`sourceOfferId`** (glej
`lib/pinartFlowStore.ts`). Projekt v tem panelu vedno ima ponudbo (`data.offer`),
zato je vrednost `data.offer.id`.

Shranjevanje: preberi zbirko, zamenjaj en zapis, shrani nazaj — isti vzorec kot
`saveOfferStatus` v istem modulu.

**Prevezavo dodaj tudi v panel dokumenta** (`vrsticaDetajl` v
`ProjectsWorkspace`): vrstica »Projekt: … ▾«, kjer se izbere drug projekt ali
odveže. Tam je bila prvotna Tinina zahteva.

## Meje

Ne odpiraj teh datotek, hkrati so v delu:

- `components/KalkulatorApp.tsx` (Claude — profil, področja, panel ponudbe)
- `components/ExpenseWorkspace.tsx` (Claude — značke, priponka, valuta)
- `app/api/posta/**`, `lib/postaDnevnik.ts`, `components/KomunikacijaWorkspace.tsx`
- `lib/danes.ts`, `components/BusinessOverview.tsx`

**Ne spreminjaj podatkovnega modela.** Da bi dokumenti dobili `projektId`
namesto `sourceOfferId`, je ločena odločitev, ki jo Tina še ni sprejela — tu
uporabi obstoječe polje.

## Preverjanje

```
npx tsc --noEmit
npm test
```

Ne poganjaj `npm run build`, kadar teče dev strežnik na vratih 3456.

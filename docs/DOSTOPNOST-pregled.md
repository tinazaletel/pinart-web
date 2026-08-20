# Pregled dostopnosti — 20. 8. 2026

Obseg: statični pregled `app/` in `components/`, pregled globalnih slogov ter
ključnih interaktivnih delov aplikacije. Merilo: WCAG 2.1 AA. To je interna
samoocena, ne certifikat skladnosti.

## Preverjeno

- kontrast pogosto uporabljenih sivin na beli in papirnati podlagi;
- odstranjen `outline`, fokus s tipkovnico in klikljivi nesemantični elementi;
- prisotnost `main`, naslovov in povezave za preskok;
- modalna okna, oznake obrazcev, sporočila stanja ter slike in ikone;
- nastavitev `prefers-reduced-motion`;
- besedilo javne izjave o dostopnosti.

## Izmerjen kontrast

| Besedilo | Podlaga | Razmerje | Rezultat za navadno besedilo |
|---|---:|---:|---|
| `#8a8177` | `#ffffff` | 3,83 : 1 | ne ustreza |
| `#8a8177` | `#F5F2EA` | 3,42 : 1 | ne ustreza |
| `#6b655d` | `#ffffff` | 5,76 : 1 | ustreza |
| `#6b655d` | `#F5F2EA` | 5,15 : 1 | ustreza |

Izračun uporablja relativno svetilnost po WCAG. `#8a8177` je primeren le za
veliko besedilo ali nebesedilne dekoracije, ne za drobno vsebinsko besedilo.

## Popravljeno

- Dodana je globalna, vijolična `:focus-visible` oznaka. Velja tudi za stare
  module, ki lokalno uporabljajo `outline: none`.
- Kot prvi fokusabilni element je dodana povezava »Preskoči na vsebino«.
- Globalno je upoštevan `prefers-reduced-motion`; animacije in prehodi se v tem
  načinu praktično izključijo.
- Najden klikljivi ovoj imena cenika je dobil `role`, `tabIndex` in podporo za
  Enter ter preslednico.
- Drobno vsebinsko besedilo `#8a8177` je na pregledanih mestih kalkulatorja,
  arhiva, ponastavitve gesla, pomoči in administrativnih opozoril potemnjeno na
  `#6b655d`. Osnovna vsebina kalkulatorja ni več izrisana s težo 300.
- Sporočilo pri ponastavitvi gesla ima `aria-live="polite"` in uporablja
  dogovorjeni barvi za uspeh oziroma napako.
- Izjava o dostopnosti ne trdi več, da je ves kontrast, semantika in vsako
  nadomestno besedilo že skladno. Nepotrjene trditve so prestavljene med znane
  omejitve.

## Znane omejitve

- Projekt vsebuje več različnih izvedb modalnih oken. Vsa še nimajo pasti za
  fokus, zapiranja z Esc in vračanja fokusa na sprožilec. Globalna fokusna
  oznaka izboljša vidnost, ne reši pa upravljanja fokusa.
- V delu kompleksnega kalkulatorja in urejevalnikov ostajajo nesemantična
  ozadja modalov z `onClick`. Ozadja so namenoma izločena iz zaporedja Tab;
  vse notranje akcije še niso ročno preverjene z bralnikom zaslona.
- V repozitoriju ostajajo primeri `#8a8177` v velikih oznakah, dekorativnih
  elementih in datotekah, ki jih v tej rundi zaradi vzporednega dela ni bilo
  dovoljeno spreminjati. Vsak tak par ni samodejno kršitev, zahteva pa pregled
  dejanske velikosti in podlage.
- Slike so večinoma večvrstični JSX, zato preprost statični vzorec ne more
  zanesljivo potrditi vseh `alt`, dimenzij in namena. Potreben je še ročni
  pregled posameznih predstavitvenih strani.
- Hierarhija naslovov ter povezave napak obrazcev z `aria-describedby` niso bile
  ročno potrjene na vsakem zaslonu.

## Naslednji priporočeni pregled

Ročni prehod s tipkovnico in VoiceOver/NVDA po poteh prijava → Domov → ponudba
→ pogodba → račun. Modalna okna naj se nato preselijo na eno skupno komponento
za upravljanje fokusa; to je poseg z večjim tveganjem in ni primeren za slepo
masovno zamenjavo.

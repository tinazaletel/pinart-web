# Kako zbiramo podatke o tržnem okviru

**Zadnja posodobitev:** 28. 8. 2026
**Vir podatkov:** `docs/CENE-TRZNA-RAZISKAVA-2026.md` (preverjeno 22. 8. 2026)

Ta dokument pojasnjuje, od kod pridejo številke, ki jih Pinart Flow prikaže ob
ceni. Namenjen je trem bralcem: uporabnici, ki hoče vedeti, ali se sme na
številko zanesti; ponudniku, ki se sprašuje, zakaj je njegov cenik med viri; in
odvetniku, ki presoja, ali je ravnanje korektno.

## Kaj tržni okvir je in kaj ni

Tržni okvir je **opis stanja na trgu** — razpon cen, ki so jih ponudniki sami
javno objavili. Ni priporočilo, ni ceniku podobna smernica in ni napoved, kaj bo
naročnik pripravljen plačati.

Flow nikjer ne pravi »zaračunaj toliko«. Pravi »toliko se na trgu giblje«.
Odločitev o ceni ostane uporabničina in Flow je pri tem ne usmerja k nobeni
določeni številki.

## Od kod podatki

1. **Javno objavljeni ceniki ponudnikov.** Cene, ki jih podjetja sama objavijo
   na svojih spletnih straneh, v javnih PDF cenikih ali v javnih paketih.
2. **Javni katalogi stroškov** (npr. razpisni katalogi občin), kjer je cena
   storitve del javnega dokumenta.
3. **Javne agregirane analize**, kadar so izrecno navedene kot take.

Podatke prebere in zapiše človek. Ne uporabljamo samodejnega pobiranja vsebine
(»scraping«), ne obhajamo tehničnih zaščit in ne obremenjujemo tujih strežnikov.

## Kaj zapišemo in česa ne

**Zapišemo:** ceno kot številko, enoto (projekt, stran, m², mesec, dan) in
kratek lasten povzetek obsega — dovolj, da je primerjava poštena.

**Ne zapišemo:** besedil ponudnikov, njihovih opisov storitev, slik, oblikovanja
ali kakršnihkoli vsebin, ki bi jih bilo mogoče brati namesto njihove strani.
Cena je dejstvo; dejstva niso avtorsko delo, izraz pa je in ostane njihov.

## Kdaj razpona ne izračunamo

Raziskava vsako storitev oceni po kakovosti dokazov:

| ocena | pomen | kaj Flow pokaže |
|---|---|---|
| A | trije ali več neposredno primerljivih cenikov | razpon in mediano |
| B | dva ali več virov, obseg je bilo treba poenotiti | razpon z opombo o obsegu |
| C | javni signal obstaja, ni pa dovolj za pošten razpon | **nič** |
| D | enota storitve še ni določena | **nič** |

Pri C in D Flow namenoma ne pokaže ničesar. Lažno natančna številka bi bila
slabša od odkritega »tega še ne vemo«, ker vsa vrednost tega prikaza stoji na
tem, da drži.

## Primerjamo samo delo

V razponu niso zajeti tisk, zakup medijev, produkcijski najemi, material,
programski razvoj in DDV, razen kadar je pri viru izrecno zapisano drugače.
Cene v evrih in dolarjih se nikoli ne mešajo v isti razpon.

## Staranje podatkov

Vsak razpon nosi datum preverjanja in ta datum je viden uporabnici. Podatek se
stara; ko datum ni več svež, to ni skrita napaka, ampak vidno dejstvo.
Raziskavo je treba osvežiti najmanj enkrat letno.

## Če ste ponudnik in ne želite biti med viri

Pišite na tina@pinart.si. Cene iz javnih cenikov so dejstva in njihovo
navajanje z navedbo vira je dopustno, a če ne želite biti navedeni, vas bomo
umaknili brez pojasnjevanja.

## Kaj pride pozneje

Ko bo v Flowu dovolj lastnih, anonimiziranih ponudb, bo isti prikaz lahko
temeljil na njih — »na podlagi 128 ponudb v Flowu« namesto »6 preverjenih
virov«. Takrat ne bo šlo za tuje podatke, ampak za podatke, ki nastanejo pri
uporabi orodja, in bodo anonimizirani ter združeni tako, da posamezne ponudbe
ali stranke iz njih ne bo mogoče prepoznati.

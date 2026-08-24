# Štoparica — pravila

Vir: ChatGPT, 24. 8. 2026, po nalogi v `docs/CHATGPT-NALOGA-stoparica.md`.
Še ni implementirano.

## 1. Samo eno aktivno merjenje

Ko med tekočim merjenjem zaženeš drug projekt: prvo se konča ob istem času,
segment se shrani, novo se začne takoj. **Brez potrditvenega okna** — samo mirno
obvestilo: »Katalog je ustavljen. Zdaj meriš Spletno stran.«

## 2. Merjenje čez polnoč

Ob polnoči se samodejno razdeli na dva povezana segmenta (22.30–24.00 in
00.00–01.15). Štoparica teče neprekinjeno; razdelitev je vidna le v poročilih.

## 3. Pozabljeno merjenje

- po 8 urah: nevtralno preverjanje
- po 12 urah: oznaka **Potrebuje pregled**

Podatek se **ne izbriše** in čas se **ne popravi sam**. Nepotrjen segment se ne
všteva v potrjene ure, dokler ga ne pregledaš. Možnosti: potrdi celotno
trajanje · popravi čas zaključka · razdeli merjenje · še vedno merim.

## 4. Nadaljevanje projekta

Vrstni red v izbirniku: nazadnje merjeni → merjeni v zadnjih 30 dneh → aktivni po
zadnjem merjenju → zaključeni in arhivirani prek iskanja. Vsaka vrstica ima
**Nadaljuj**:

> Katalog Inovis · nazadnje 12. maja · **Nadaljuj**

Nadaljevanje vedno ustvari **nov segment**; starega ne podaljšuje.

## 5. En vir podatkov

Časovni segment je edini vir resnice. Vsak ima: **projekt (obvezno)**, nalogo
(neobvezno), storitev ali opis (neobvezno), začetek, konec, trajanje, stanje
potrditve.

Merjenje iz Naloge zabeleži projekt in nalogo; merjenje s strani Čas je lahko
vezano samo na projekt. Naloga kaže vsoto svojih segmentov, projekt vsoto vseh,
stran Čas iste segmente — ne druge evidence.

**Ločena štoparica, ki v Nalogi hrani samo skupne minute, se ukine.**

## 6. Ročni vnosi in popravki

Dovoljeno: dodati pozabljeno merjenje, popraviti začetek in konec, zamenjati
projekt ali nalogo, razdeliti segment, dodati pojasnilo, označiti čas kot
neobračunljiv.

Vsak popravek ohrani prvotno vrednost, novo vrednost, čas spremembe in oznako
**Ročno popravljeno**. Brisanje je mehko in obnovljivo. Če je bil čas že
uporabljen na izdanem računu, se ne sme tiho spremeniti — popravek se zabeleži
kot nov popravljalni vnos.

## Dnevni pogled

| Projekt | Podrobnosti | Čas |
|---|---|---|
| Katalog Inovis | Postavitev 2 h 10 min · popravki 50 min | 3 h |
| Spletna stran Lumen | UX 1 h 15 min · priprava vsebine 45 min | 2 h |
| | **Skupaj evidentirano** | **5 h** |

Če del časa potrebuje pregled:
> Skupaj evidentirano 5 h · potrjeno 4 h 20 min · za pregled 40 min

## Besedila

**Gumbi:** Začni meriti · Ustavi · Nadaljuj · Zamenjaj projekt · Dodaj čas ročno
· Popravi merjenje · Potrdi trajanje

**Aktivno:** Meriš Katalog Inovis · 01:24:16

**Prazno:** Danes še nisi merila časa. Izberi projekt, ko začneš.

**Pozabljeno:** To merjenje traja dlje kot običajno. Preveri trajanje, preden ga
vključimo v poročilo.

---

## Opombe pri izvedbi (Claude, 24. 8.)

- **Točka 5 je migracija, ne stikalo.** Naloge danes hranijo
  `porabljeniCasMinute` kot vsoto brez odsekov. Ob prehodu jih je treba
  pretvoriti v en začetni segment (»prenos stanja«) ali obdržati kot odprto
  začetno stanje — sicer se ure izgubijo.
- **Točka 6, popravljalni vnos pri izdanem računu**, zahteva vez med segmentom
  in postavko računa. Te vezi danes ni. Ceneje in pošteno: dokler je ni,
  urejanje takega segmenta **zaklenemo z razlago**, namesto da delamo
  popravljalne vnose.
- Stanje potrditve pomeni **dve vsoti povsod** (evidentirano in potrjeno). To je
  prav, a je treba upoštevati v vseh poročilih, ne le v dnevnem pogledu.

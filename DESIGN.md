# DESIGN.md — pravila videza za Pinart Flow

Ta datoteka obstaja zato, da se iste napake ne ponavljajo. Kar je tu zapisano,
ni predlog — je stanje, ki je bilo že enkrat popravljeno. Preden se česa
dotakneš, preberi razdelek, ki se tvojega dela tiče.

**Zlato pravilo:** obstoječi vzorec poišči in ga uporabi. Ne gradi novega.
`grep` selektor ali komponento **pred** pisanjem, ne po njem.

---

## 1. Desni paneli — DokPanel je vzorec

Vsak panel, ki zdrsne z desne, gre skozi `components/DokPanel.tsx`. Brez izjem.
Če pišeš svojega, si že naredil napako — imeli smo sedem različnih in vsak je
bil malo drugačen.

```tsx
<DokPanel odprt={odprt} nadnaslov="Naloge" naslov="Analitika ekipe" onZapri={zapri}>
  …vsebina…
</DokPanel>
```

DokPanel sam poskrbi za: portal na `<body>`, zaklep drsenja strani, Esc,
vračanje fokusa, glavo (**Natisni levo z ikono, brez obarvanega ozadja; × desno
v krogu**) in naslov v pravem serifu.

## 2. Pisave — od kod pride »spet Bodoni«

`var(--font-serif)` je **portfeljev Bodoni**. V Flow serif (DM Serif) je
preslikan **samo znotraj** `.cw`, `.fl` in `.shell`.

Panel v portalu visi na `<body>`, torej **zunaj** teh ovojev. Tam `--font-serif`
spet pomeni Bodoni in naslov je nenadoma moden.

**Zato v vsem, kar gre v portal ali je samostojna stran, uporabi
`var(--font-serif-flow)`.** Velja tudi za pravne strani, beto in pogoje.

```css
font: 500 clamp(1.5rem,3.4vw,2.1rem)/1.12 var(--font-serif-flow), Georgia, serif;
```

## 3. position: fixed potrebuje portal

Prvi prednik s `transform`, `filter` ali `overflow: clip` postane referenca za
`position: fixed`. Panel takrat obvisi sredi strani. V lupini Lenis transformira
prednika, zato se to zgodi vedno.

**Rešitev:** `createPortal(…, document.body)`. DokPanel to že dela.

## 4. Ozadje aurora

Za skrivanje vodoravnega prelivanja uporabi `overflow-x: clip`, **nikoli
`hidden`** — `hidden` odreže aurora ozadje in stran postane siva.

## 5. Barve, črte, kontrast

- Črte vedno `var(--line)`. Nikoli poljubna siva.
- Besedilo: `var(--ink)`, teža **400**. **Nikoli weight 300 in nikoli siv body.**
- Poudarek: `var(--purple)` / `var(--accent)`.
- Kartice orodij: gradient z ikono, kot drugje. Ne izumljaj nove kartice.

## 6. Širine

Flow ima `max-width: 1280px`. Raztegnjeni zasloni brez omejitve so bili izrecno
zavrnjeni. Orodne vrstice morajo iti **v eno vrstico** — če ne gredo, skrči
besedilo v ikone (glej `.tm-akcija-tekst`), ne prelomi vrstice.

## 7. Mobilno

- Besedilo v karticah `1.41rem`.
- Kartice: bleed `-.5rem`, radij `14px`, padding `1.1rem`.
- Asimetrija levo/desno pomeni `width: auto` in premajhno specifičnost — preveri
  pravila starša, ne dodajaj novih.
- Filtri so na telefonu spustni seznam; na namizju navaden dropdown, ne segment.

## 8. Injeciran CSS se ne osvežuje

Slog, vstavljen prek `<style dangerouslySetInnerHTML>`, se ob vročem nalaganju
ne osveži. **Kritičen detajl daj inline na element**, sicer boš lovil duha.

## 9. styled-jsx ne doseže `<Link>`

`styled-jsx` ne postavi svojega atributa na Next `<Link>`. Slog se tiho ne
prime — simptom so kartice, ki se postavijo v ravno vrsto. Uporabi `<a>` ali
`:global()`.

## 10. Datum in ura razbijeta hidracijo

`new Date()` med renderjem da drugačen izid na strežniku in v brskalniku →
»Text does not match server-rendered HTML«.

**Datum vedno vstopi kot parameter** (glej `lib/danes.ts`) ali se izračuna šele
po montaži. Ni CSS napaka, čeprav je videti kot ena.

## 11. Jezik vmesnika

Uporabljaj **Tinina poimenovanja**, ne svojih boljših: »Štoparica« (ne »ure na
projektih«), »Delovna prisotnost«, »Poslovni okvir«, »Umestitev«, »Sef
avtorstva«, »Pupa«.

Polje pove, **kaj pišeš**; gumb pove, **kaj se zgodi**. Nikoli »+ dodaj
opravilo« v polju in »+ Dodaj« na gumbu — isti ukaz dvakrat.

Vse besedilo je dvojezično prek `L('slovensko', 'english')`.

## 12. Česa se ne dotikaš brez naročila

- popravljenih vrednosti (če je bila številka enkrat popravljena, je odločitev)
- leteči papir na landingu
- kartice orodij na nadzorni plošči
- barvni storitveni mehurčki v kalkulatorju (Flow mehki mehurček je nekaj drugega)
- onboarding — je samostojen modul, **ne** del ponudbe za prijavljene (`!vLupini`)


## 13. Obvestila in opozorila

Vsa obvestila gredo skozi `components/Toast.tsx`. Ne piši svojega.

```tsx
<Toast sporocilo="Shranjeno." onClose={() => setSporocilo('')} />
<Toast ton="napaka" trajanje={0} sporocilo="…" dejanja={<><button/><button/></>} onClose={…} />
```

**Kje se pokaže:**

| Vrsta | Mesto | Trajanje |
|---|---|---|
| info, uspeh | sredina zgoraj | 3,5 s |
| **opozorilo (`ton="napaka"`)** | **desno, tik pod glavo** | 3,5 s ali trajno |
| karkoli s `trajanje={0}` | desno, tik pod glavo | dokler se ne odloči |

Opozorila prizdrsnejo **z desne proti levi** in stojijo pri zvoncu, kjer jih
uporabnica išče — nikoli čez sredino glave, kjer zakrijejo orodno vrstico. Glava
je visoka `3.25rem`, obvestilo stoji na `top: 4rem`.

Na telefonu opozorilo pride **spodaj**, čez celo širino, nad varnim robom — tam
je palec.

**Rdeča pove, da je opozorilo — a ne pove vsega trikrat.**

```css
ozadje:  oklch(95.5% .05 25)        /* res rdečkasto, ne komaj načeto */
obroba:  oklch(76% .13 25 / .65)
črta levo: 4px solid oklch(58% .18 25)
ikona:   oklch(52% .17 25)
naslov:  oklch(46% .17 25)
telo:    var(--ink)                  /* NE rdeče — mora se brati */
```

Prva različica je bila tako svetla, da je kartica izpadla bela. Če ni videti
rdeča na prvi pogled, ni opozorilo.

Telo sporočila in glavni gumb ostaneta `--ink`: rdeče besedilo na rdeči podlagi
se slabše bere, vijoličen gumb v rdečem obvestilu pa združi znamko in alarm, ki
se med seboj izničita.

**Ikona na začetku.** `ikona` nadomesti barvno piko in pove, o čem obvestilo
govori, preden ga uporabnica prebere — štoparica dobi `<Timer />`. Pri obvestilih
brez svoje ikone ostane pika.

**Kaj zahteva odločitev, ne sme izginiti samo.** `trajanje={0}` pomeni, da
obvestilo počaka. Gumbi gredo v `dejanja`; prvi je glavni (**poln, `--ink`**),
drugi je izhod (obroba, bel).

**Naslov ob ikoni, sporočilo pod njim.** `naslov` je krepek, `sporocilo` pade v
drugo vrstico. Dolgo obvestilo v enem kosu se prelomi kjer koli in je videti
razmetano.

**Ikona, gumbi in križec stojijo na sredini višine kartice** (`align-self:
center`), ne poravnani z naslovom — pri dvovrstičnem obvestilu jih poravnava z
naslovom potisne previsoko.

**Opozorilo ne sme predelati elementa, na katerega se nanaša.** Ko je štoparica
pozabljena, pilula v glavi ostane nedotaknjena in vprašanje pride ločeno — sicer
uporabnica izgubi izpred oči prav tisto, o čemer jo sprašujemo.


## 13b. `hidden` ne skrije elementa z `display`

Atribut `hidden` postavi `display: none` na ravni brskalnika — vsak razred z
`display: grid` ali `flex` ga premaga. Element ostane viden, koda pa je videti
pravilno.

```css
.moja-mreza[hidden] { display: none; }
```

Če skrivaš pogojno, je varneje sploh ne izrisati (`{pogoj && <div>…</div>}`).

## 13c. Stranka v vmesniku, naročnik v dokumentu

Aplikacija je uporabljala oba izraza pomešano — v meniju »Stranke«, v čarovniku
pa »Od kod je naročnik?«. Za uporabnico sta to dve besedi za isto stvar in mora
sklepati, ali gre za isto.

- **vmesnik, meni, gumbi, navodila → »stranka«**
- **besedilo dokumentov (ponudba, pogodba, račun) → »naročnik«**, ker je to
  pravni izraz za pogodbeno stranko in tam mora stati

V dokumentu torej piše »Naročnik: Rokus Klett«, v vmesniku pa »Kdo je stranka?«.

## 14. Nepovratna dejanja povej vnaprej

Kar se ne da razveljaviti, mora biti povedano **preden** človek klikne, ne kot
napaka za tem. Številka računa je najbolj oster primer: ko je enkrat izdana, se
zaporedje lahko samo nadaljuje.

- pod poljem, mirno in brez klicaja: *»Številke ni mogoče nastaviti nazaj.«*
- ob potrditvi pokaži izid: *»Naslednji račun bo 2026-0015.«*
- zavrnitev pojasni, ne samo javi: *»Nižje ni mogoče, ker bi se številka
  ponovila.«*

Isto velja povsod, kjer nastane zapis, ki ga uporabnica ne more vzeti nazaj —
izdan račun, poslana pošta, časovni žig v Sefu.

---

## Preden rečeš, da je narejeno

1. `npx tsc --noEmit` — čisto
2. `npx vitest run` — vse zeleno
3. pogledal si **isti vzorec drugje** in ga posnemal, ne izumil
4. če je panel: gre skozi DokPanel
5. če je naslov v portalu: `--font-serif-flow`
6. če si spreminjal CSS: preveril si pravila starša z `grep`
7. pred pushom `next build` (ESLint v projektu nima konfiguracije, build je
   edini pravi filter)


---

# Del 2 — Žetoni in gradniki

Vse spodaj je prepisano iz kode, ne izmišljeno. Če se koda spremeni, popravi
tudi to.

## Barve

```css
--paper:      #F5F2EA;   /* ozadje strani */
--paper-deep: #ECE6D5;   /* globlje ozadje, ločnice ploskev */
--ink:        #111111;   /* besedilo in polni gumbi */
--accent:     oklch(66% 0.2 297);  /* vijolična, poudarek */
```

Vijolična ima dva odtenka v rabi: `#6E4FA6` (fokus obris, polni gumbi) in
`oklch(52% .2 297)` (hover na povezavah v panelu). Ne dodajaj tretjega.

**`--line` ni globalna spremenljivka.** Vsaka komponenta jo nastavi na svojem
korenu in nato uporablja **samo njo**:

```css
.moja-komponenta { --line: rgba(17,17,17,.1); }
```

Nikoli ne piši surove sive vrednosti mimo `--line` — sivine se razidejo in
stran postane umazana.

Prigušeno besedilo:

```css
--muted: color-mix(in oklch, var(--ink) 72%, transparent);
```

## Pisave

```
--font-serif       Bodoni Moda        naslovi PORTFOLIA (pinart.si)
--font-serif-flow  DM Serif Display   naslovi FLOWA
--font-sans        Archivo            vmesnik, telo, oznake
```

Ovoji `.fl`, `.cw` in `.shell` znotraj sebe preslikajo
`--font-serif: var(--font-serif-flow)`. **Zunaj njih — v portalu na `<body>`,
na pravnih straneh, na beti — to ne velja in dobiš Bodoni.** Tam piši
`var(--font-serif-flow)` izrecno.

Bodoni je tanek in ima v `globals.css` `-webkit-text-stroke`. DM Serif ga
**ne** potrebuje.

## Tipografija

```css
/* nadnaslov / eyebrow */
font: 800 .62rem var(--font-sans), sans-serif;
letter-spacing: .18em; text-transform: uppercase; color: var(--muted);

/* naslov panela ali strani */
font: 500 clamp(1.5rem, 3.4vw, 2.1rem)/1.12 var(--font-serif-flow), Georgia, serif;
letter-spacing: -.01em; text-wrap: balance;

/* telo */
font: 400 .92rem/1.5 var(--font-sans), sans-serif; color: var(--ink);

/* podnaslov razdelka */
font: 700 .66rem var(--font-sans), sans-serif;
letter-spacing: .08em; text-transform: uppercase; color: var(--muted);
```

**Nikoli weight 300 za telo in nikoli siv body.** Kontrast je bil že enkrat
popravljen.

## Gumbi

Vsak gumb je visok vsaj `2.75rem` (44 px) — to je dotikalna tarča po WCAG, ne
estetska izbira.

```css
/* pilula, privzeta */
.gumb-pilula {
  min-height: 2.75rem; padding: 0 1rem;
  border: 1px solid var(--line); border-radius: 999px;
  background: #fff; color: var(--ink);
  font: 750 .72rem var(--font-sans), sans-serif; cursor: pointer;
  transition: background .15s, color .15s, border-color .15s;
}
.gumb-pilula:hover { background: var(--ink); color: var(--paper); }

/* glavni gumb */
.gumb-glavni { border: 0; background: var(--ink); color: var(--paper); font-weight: 750; }

/* na ozkem zaslonu postane sam krog: besedilo se skrije, ne prelomi vrstice */
@media (max-width: 980px) {
  .gumb-pilula { width: 2.75rem; min-width: 2.75rem; padding: 0; justify-content: center; border-radius: 50%; }
  .gumb-pilula .akcija-tekst { display: none; }
}
```

## Polja

```css
input, select, textarea {
  padding: .65rem .75rem;
  border: 1px solid rgba(17,17,17,.16); border-radius: .7rem;
  background: #fff; color: var(--ink);
  font: 500 .88rem var(--font-sans), sans-serif; line-height: 1.5;
}
```

Fokus: globalno pravilo v `globals.css` da `outline: 3px solid #6E4FA6` z
odmikom 3 px. **Vnosna polja so iz tega namenoma izvzeta** — pravokoten obris je
pri njih širši od polja in je videti kot napaka; ta dobijo senco, ki sledi
njihovemu radiju. Ne odstranjuj fokusa.

## Kartica

```css
.kartica {
  padding: 1rem; border: 1px solid var(--line); border-radius: .9rem;
  background: #fff; box-shadow: 0 .4rem 1rem oklch(30% .02 55 / .06);
  transition: transform .16s cubic-bezier(.2,.8,.3,1), box-shadow .16s;
}
.kartica:hover { transform: translateY(-1px); box-shadow: 0 .6rem 1.4rem oklch(30% .02 55 / .12); }
```

Kartice orodij imajo **gradient in ikono** — poišči obstoječo in jo posnemaj.

Na telefonu:

```css
@media (max-width: 640px) {
  .kartica { margin-inline: -.5rem; border-radius: 14px; padding: 1.1rem; }
  .kartica p { font-size: 1.41rem; }
}
```

## Spustni seznam na namizju, plošča na telefonu

Filter in podobni izbirniki: **na telefonu spodnja plošča**, na namizju
**navaden spustni seznam pod gumbom**. Portal ostane v obeh primerih (sicer ga
odreže prednik), mesto pa se izračuna iz gumba:

```tsx
const r = gumbRef.current?.getBoundingClientRect();
setPoz({ top: r.bottom + 8, left: Math.max(8, Math.min(r.left, window.innerWidth - 340)) });
```

Na namizju zastor **ne** temni strani: `background: none; backdrop-filter: none`.
Spustni seznam ni modalno okno.

Prag med njima je `981px` (`window.matchMedia('(min-width: 981px)')`).

## Panel

Ne piši svojega. `<DokPanel odprt naslov nadnaslov onZapri>`. Ključne mere, če
jih moraš poznati:

```css
širina:   min(46rem, 94vw)
zastor:   oklch(30% .03 300 / .22)
ozadje:   rgba(255,255,255,.86) + blur(24px) saturate(1.4)
papir:    #fff, radij 1rem 1rem 0 0, robovi 2.4rem clamp(1.4rem,4vw,3rem) 3rem
× gumb:   2.2rem krog, 1px obroba, bel
vstop:    translateX(100%) → 0, .3s cubic-bezier(.2,.85,.25,1)
```

## Gibanje

```css
hitro:   .15s–.18s   (hover, barve)
panel:   .3s–.34s    cubic-bezier(.2,.85,.25,1) ali (.16,1,.3,1)
```

Vse animacije morajo spoštovati `prefers-reduced-motion` — globalno pravilo to
že naredi, ne preglašaj ga.

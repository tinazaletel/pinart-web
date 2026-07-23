# Fazni model ponudbe (interier, arhitektura, večji projekti)

Načrt za drugo obliko ponudbe — poleg obstoječe **storitev → ena cena + pravice**
(grafika). Podlaga: opis dela interier oblikovalca (Borjan B, WhatsApp) + Tinine
zahteve glede rokov in ur. Ta dokument je za skupno gradnjo, ne končna koda.

---

## 1. Zakaj obstoječi model ne zadošča

Kalkulator zdaj: izbereš storitve (logo, CGP …), vsaka ima osnovo, sistem doda
množitelje (izkušnje, trg, pravice) → **ena cena**. To je pravo za kreativni
deliverable z avtorskimi pravicami.

Interier/arhitektura (in večji projekti) delujejo **fazno**:
- projekt je razbit na **faze**, vsaka ima **svojo ceno**, spodaj **skupek**;
- del cene so **ure**, ocenjene iz **m² in obsega**, ne pavšal;
- vsaka faza ima **korekcije** (1, največ 2);
- **nadzor** je pogosto **ločena ponudba** s predvidenimi urami, ki se na koncu
  **poračunajo** (skrči ali doda dejansko porabljene);
- plačilo je **po mejnikih** (npr. 50 % takoj, 50 % ob predaji dokumentacije).

Avtorske pravice tu niso glavna os; glavna os sta **obseg (faze + ure)** in
**poračun ur**.

---

## 2. Faze interier projekta (privzeti nabor)

Iz Borjanovega opisa — privzete faze, ki jih uporabnik obkljuka/uredi:

1. **Idejni tloris**
2. **Look & feel** — materiali, barve, osnovni stil (moodboard po slikovnem gradivu)
3. **Idejna vizualizacija** (po dogovoru — neobvezna faza)
4. **Kosovna oprema + delavniški načrti** — pozicije vode, elektrike, stikal, luči
5. **3D vizualizacija**
6. **Nadzor vgradnje** — LOČENA ponudba, ure s poračunom

Prečno skozi faze: **ure iskanja ponudb, usklajevanja s stranko, orientacijski
sestanki** — okvirno število ur glede na m² in obseg.

Vsaka faza: **vsaj 1 korekcija, največ 2** (privzeto, uredljivo).

Mizarsko/po meri pohištvo = več detajlnega projektiranja → višja teža faze 4.

---

## 3. Podatkovni model (predlog)

Ponudba dobi tip. Obstoječa = `deliverable`; nova = `fazna`.

```ts
type FaznaPonudba = {
  tip: 'fazna';
  projekt: { opis: string; kvadratura?: number; vrsta: 'novogradnja' | 'prenova' | 'mizarsko' };
  faze: Faza[];
  ure: {                         // prečne ure iz m² + obsega
    uskladjevanje: number;       // ocenjeno, uredljivo
    urnaPostavka: number;
  };
  nadzor?: {                     // ločena ponudba/postavka
    predvideneUre: number;
    urnaPostavka: number;
    poracun: 'ob-koncu';         // dejanske ure se poračunajo na koncu
  };
  placilo: PlacilniMejnik[];     // npr. 50/50
};

type Faza = {
  id: string;
  ime: string;
  opis?: string;
  vkljucena: boolean;            // "po dogovoru" faze se dajo izklopiti
  cena: number;                  // cena po fazi (glavni podatek)
  korekcije: number;             // privzeto 1, max 2
};

type PlacilniMejnik = {
  ime: string;                   // "Ob podpisu", "Po predaji dokumentacije"
  odstotek: number;              // 50, 50
  // ali fiksen znesek namesto %
};
```

**Ocena ur iz m²** (груб privzetek, uporabnik popravi):
`uskladjevanje = round(kvadratura * faktor)` kjer je faktor npr. 0.3–0.6 h/m²
odvisno od `vrsta` (novogradnja manj, mizarsko več). **Vedno uredljivo** — je
izhodišče, ne pravilo (isto kot pri cenah).

---

## 4. Kako izgleda v orodju (UX)

Preklop na začetku: **»Enkraten deliverable«** (obstoječe) vs **»Fazni projekt«**.
Za fazni:

1. **Projekt** — opis, m², vrsta (novogradnja / prenova / mizarsko).
2. **Faze** — seznam privzetih faz z ceno na fazo; vsako vključiš/izključiš,
   ceno urediš, nastaviš korekcije (1/2). Skupek se sešteva sproti.
3. **Ure** — usklajevanje/sestanki: predlog iz m², uredljiv; urna postavka.
4. **Nadzor** — ločeno: predvidene ure, opomba o poračunu.
5. **Plačilo** — mejniki (privzeto 50/50), uredljivo (po fazah tudi možno).
6. **Ponudba** — faze kot postavke s cenami, skupek, mejniki, roki.

Faza = pravzaprav postavka z lastno ceno in korekcijami. Model postavk
(vrstice s kolicino) že obstaja — faze so lahko poseben tip vrstice.

---

## 5. Pogodba (iz Borjanovega opisa)

Struktura, ki se **generira iz ponudbe** (ne prepisuje):
1. **Opis projekta**
2. **Posamezne faze**, ki jih predlagamo
3. **Cena po posamezni fazi**
4. **Skupek vsega**
5. **Plačilni pogoji** — mejniki (npr. 50 % ob podpisu, 50 % po predaji
   projektne dokumentacije)
6. **Korekcije** — koliko na fazo (1–2)
7. **Nadzor** — poračun ur na koncu (klavzula: dejanske ure se odštejejo/dodajo)

---

## 6. Kako se veže na ostalo, kar gradiva

- **Rok / doba / licenca na ponudbi** (nocoj dodano polje) → v fazni ponudbi je
  rok **na fazo** ali skupni; nadzor ima svojo dobo.
- **Stražar rokov/ur na plošči** → za fazni model je ključen pri **nadzoru**:
  ko predvidene ure potečejo, opozori »ure nadzora presežene — poračun/doplačilo«.
  To je točno Tinina bolečina (projekt se razvleče, plačilo ostane).
- **Produkcija/prelom** (nocoj dodano) je sorodno faznemu: tudi ura/enota.
  Fazni model je posplošitev; produkcijske postavke se lahko pojavijo kot faze.

---

## 7. Kaj zgraditi (predlog vrstnega reda, SKUPAJ)

1. Preklop tip ponudbe (deliverable / fazna) + osnovni fazni tok (projekt → faze
   → skupek). Brez ur/nadzora — najprej da fazna ponudba sploh nastane.
2. Ure iz m² + urna postavka.
3. Plačilni mejniki (50/50, uredljivo) na ponudbi in v pogodbi.
4. Nadzor kot ločena postavka s poračunom.
5. Prenos vsega v pogodbo (opis → faze → cena/fazo → skupek → mejniki).
6. Vezava na stražarja rokov/ur.

Vsak korak je uporaben sam zase in ga lahko preizkusiš, preden greva naprej.

---

## 8. Odprta vprašanja za Tino

- Privzete faze — je zgornji nabor (1–6) pravi, ali kaj dodava/preimenujeva?
- Faktor ur/m² po vrsti projekta — imaš občutek za razpon (npr. novogradnja
  0.3 h/m², mizarsko 0.6 h/m²)? Lahko začneva grobo in popraviš.
- Plačilni mejniki — privzeto 50/50, ali raje po fazah?
- Korekcije — privzeto 1, strop 2 (Borjan) — velja za vse profile ali le interier?

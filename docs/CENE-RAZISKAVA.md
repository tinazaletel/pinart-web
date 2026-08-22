# Cene — od kod so

**Zakaj ta dokument.** 21. 8. 2026 sva s Tino ugotovila, da izhodiščne cene v
`lib/pricingCatalog.ts` (CGP 1350 €, logotip 650 €) nimajo zapisanega izvora.
Raziskava je bila narejena, a je živela le v spominu pogovorov — zato sva
razpone popravljala po občutku in dvakrat zgrešila. Ta datoteka je zdaj vir
resnice; ob spremembi cene se popravi tudi tukaj.

**Stanje:** delno. Dva vira sta preverjena in zapisana spodaj. Ceniki
konkurence, ki jih je Tina našla na spletu, **še niso vpisani** — glej
»Manjka« na koncu.

---

## Vir 1 · Priporočila Društva oblikovalcev Slovenije (DOS)

**Uradni slovenski benchmark.** Vir: `priporocila.drustvo-oblikovalcev.si`
(smernice, vrednost točke, faktorji za obseg uporabe, primeri izračunov).
Zabeleženo 5. 8. 2026.

- **Vrednost točke: 4,00 €** (velja od 21. 6. 2023, letno se prilagaja).
  Storitev je ovrednotena v točkah; točke × 4 € = osnovna cena.
- **Formula obsega rabe:** `Vp = (A × B × C) × Voz`, kjer je Voz vrednost
  oblikovalske zasnove. Faktorji se **množijo**.
  - **A · teritorij:** nacionalno 1,0 · regionalno 1,5 · neomejeno 2,0
  - **B · doba:** do 1 leta 1,0 · do 5 let 1,5 · neomejeno 2,0
  - **C · intenzivnost:** manjša 1,0 · srednja 1,5 · velika 2,0
  - **Meji:** Fmin = 1, Fmax = 8
- **Produkcija se NE množi** s faktorjem obsega — samo idejna zasnova. To se
  ujema z logiko Flowa, kjer so pravice ločena postavka.
- **Njihov primer:** ista tri dela pri F = 1 stanejo 1.160 €, pri F = 4,5
  (2 × 1,5 × 1,5) pa 4.660 €.

**Zakaj šteje:** to je obramba pred očitkom »cene niso realne«. Flow ne sledi
občutku, ampak priporočilom stanovskega društva.

## Vir 2 · Tinin cenik (Google Sheet »Pinart_Cenik«)

Pokazan 23. 7. 2026. Struktura: kategorija, opis, **enota**, razpon za SLO in
za ZDA, ter velikosti XS/S/M/L.

**Razponi za Slovenijo:**

| storitev | razpon SLO | enota |
|---|---|---|
| Logotip | 400 – 2.000 € | projekt |
| Celostna grafična podoba | 600 – 3.500 € | projekt |
| Letaki | 50 – 180 € | kos |
| Brošure / katalogi | 250 – 1.200 € | projekt |
| Dodatna podstran | 150 – 400 € | stran |
| Backend razvoj | 60 – 90 € | ura |
| Vzdrževanje | 50 € | mesec |
| AI izobraževanje | 200 – 2.000 € | delavnica |

- **ZDA ≈ 1,5 – 2 × slovenske cene.** To je podlaga za tržni množitelj.
- **Enote niso pavšal:** na projekt, na kos, na stran, na uro, na kampanjo,
  mesečno, na delavnico.
- Kategorije: branding, digitalni marketing, UX/UI, spletni razvoj,
  izobraževanje in svetovanje.

Sheet: `docs.google.com/spreadsheets/d/10H00yPvJFED8S_YLTzlrmK6Ob6Jh3kX7_Qe0OM92Q0w`

## Vir 3 · Mednarodna raziskava pravic in tantiem

Opravljena 16. 7. 2026, **22 virov**, med njimi primarni. Zajema pravno
podlago in tantieme, **ne** cen posameznih storitev.

**Metoda množiteljev je mednarodni standard, ne naša iznajdba:**
- **Nemčija (AGD / VTV):** honorar = cena × faktor rabe, faktor je vsota
  štirih podfaktorjev (vrsta rabe, teritorij, doba, obseg). Minimalna
  postavka za strateško oblikovanje **≈ 120 € / uro**. Vir: `vtv.calculate.design`.
- **Francija (UPP):** objavljeni okvirni barème za prenos pravic.
- To potrjuje logiko obsega rabe v Flowu in se ujema z A×B×C od DOS.

**Tantieme po kategoriji** (% neto veleprodaje; Graphic Artists Guild,
Licensing International): oblikovanje in likovna raba 3–10 % · znamke in liki
do 15–20 % · po kanalu: množični trg 3–5 %, specializirani 5–10 %.
**Odstotek je vezan na kategorijo izdelka, ne na državo** — razlike med
državami gredo v osnovno ceno (tržni množitelj), ne v tantiemo.

**Pravna podlaga po regijah:**
- **Slovenija (ZASP 69/70/79/80/99):** popoln odkup pravic **pravno ni mogoč**.
  Prenesejo se le posamezne materialne pravice, **pisno**; naročilo samo po
  sebi pravic ne prenese. Moralne pravice so neodtujljive.
- **EU (DSM 2019/790, čl. 18–20):** pravica do primernega in sorazmernega
  plačila; pavšalni odkup le izjemoma; letno poročanje o izkoriščanju;
  **neodpovedljiva** pravica do prilagoditve plačila (bestseller klavzula).
- **ZDA:** work-for-hire le s pisno pogodbo; avtorjeva pravica do **preklica
  po 35 letih** je neodpovedljiva.
- **VB:** moralne pravice se ne prenesejo, se pa lahko pisno odpovejo.

Primarni viri: `eur-lex` 32019L0790 · Uradni list ZASP-I · `copyright.gov` ·
`rightsback.org` · `graphicartistsguild.org` · `licensinginternational.org` ·
AGD/VTV · UPP.

---

## Kako iz tega nastanejo številke v kalkulatorju

**Izhodiščne cene** (`lib/pricingCatalog.ts`) so postavljene znotraj razponov
iz vira 2:

| storitev | izhodišče | razpon iz cenika | kje leži |
|---|---|---|---|
| Logotip | 650 € | 400 – 2.000 € | spodnja tretjina |
| CGP | 1.350 € | 600 – 3.500 € | sredina |

**Budgetni razponi** se od 21. 8. 2026 **izpeljejo iz izhodiščne cene**
(`budgetIzbire` v `lib/vprasanjaPoStoritvi.ts`) po pravilu 0,6× / 1,5× / 3×.
Prej so bili vpisani ročno na 24 mestih in so se razšli s cenikom.

**⚠️ Nepotrjeno:** pravilo 0,6× je matematično dosledno, ni pa preverjeno ob
resničnih ponudbah konkurence. Pri logotipu da spodnjo mejo 400 €, kar je
natanko dno Tininega razpona — verjetno prenizko za prvi predal. Preveriti ob
vpisu vira 3.

---

## Manjka

0. **Cene storitev v tujini.** Vir 3 pokriva pravice in tantieme temeljito,
   ne pa cen posameznih storitev. Edini tuji cenovni podatek, ki ga imamo, sta
   nemška postavka ≈ 120 €/uro in razmerje ZDA ≈ 1,5–2 × SLO iz Tininega
   cenika. Manjkajo objavljeni ceniki oziroma ankete o honorarjih (npr. AIGA,
   GDC, nacionalna društva) za primerjavo po storitvah.
1. **Ceniki konkurence.** Tina je našla slovenska podjetja z javno objavljenimi
   ceniki in poslala posnetke. Za vsakega je treba zapisati: podjetje in
   povezavo, storitev, objavljeno ceno ali razpon, datum preverjanja, trg in
   valuto, primerljivost s Pinartovo storitvijo, ter sklep, kaj to pomeni za
   našo izhodiščno ceno.
2. **Izvor izhodiščnih cen za preostalih 22 storitev.** Zgoraj sta utemeljena
   samo logotip in CGP; ostale so v ceniku, njihov izvor pa ni zapisan.
3. **Točkovnik DOS po storitvah.** Vrednost točke poznamo, koliko točk je
   posamezna storitev, pa ni zabeleženo — brez tega DOS formule ne moremo
   uporabiti za neposredno primerjavo.

---

## Celoten pregled kataloga · 22. 8. 2026

### Metoda in omejitve

Pregled zajema vseh 25 storitev z izhodiščno ceno v `lib/pricingCatalog.ts`.
»Drugo / po dogovoru« nima izhodišča in ni predmet primerjave. Uporabljeni so:

1. javni ceniki slovenskih izvajalcev (najbolj primerljivi, a navadno
   predstavljajo spodnji ali srednji del trga);
2. slovenski agregati dejanskih povpraševanj, predvsem Omisli.si (širši vzorec,
   vendar posamezni obsegi niso vedno enaki Flowovim);
3. javne globalne platforme 99designs in Upwork kot kontrola mednarodnega
   spodnjega/srednjega segmenta — **ne kot neposreden ZDA agencijski cenik**;
4. strokovne smernice DOS za ločevanje izvedbe in pravic.

Vse cene so brez stroškov medijskega zakupa, tiska, razvoja, produkcijskih
najemov in DDV, razen če vir izrecno pove drugače. USD ni pretvorjen v EUR,
da tečaj ne ustvari lažne natančnosti. »Potrjeno« pomeni, da obstajata vsaj dva
uporabna javna primerjalna podatka; ne pomeni, da je cena primerna za vsak obseg.

### Sklep po vseh storitvah

| ID | Flowova storitev | izhodišče | javni signal | ocena | odločitev / opomba |
|---|---|---:|---|---|---|
| `logo` | Logotip + osnovna identiteta | 650 € | Omisli: večina logotip/branding/CGP 560–1.400 €, mediana 750 €; 99designs logo 249–1.050 USD | **potrjeno** | 650 € je razumno vstopno izhodišče, če vključuje osnovno identiteto in omejeno število smeri. |
| `cgp` | Celostna grafična podoba | 1.350 € | Spletni donos 550/1.200/1.890 €; Art Design 1.000/1.600/2.500 € za osnovno in 1.500/2.500/4.500 € za razširjeno | **potrjeno** | 1.350 € je utemeljeno za srednji osnovni paket; razširjeni priročnik in aplikacije morajo ceno dvigniti. |
| `web` | Spletna stran | 1.400 € | Sette od 1.200 €; MMStudio od 1.490 €; Hrabar 1.400 €; Spletnik od 1.499 € | **potrjeno** | 1.400 € je dobro izhodišče za predstavitveno stran. Trgovina in custom aplikacija ne smeta uporabljati iste osnove. |
| `kampanja` | Kampanja / oglasni vizuali | 900 € | Tash-Tash: posamezna pasica 55 €; slovenski javni ceniki večinoma cenijo po formatih, ne kot cel projekt | **nepotrjeno** | Obdrži začasno. Določiti je treba enoto: koncept + ključni vizual + koliko prilagoditev. Zakup medijev ni vključen. |
| `publikacija` | Publikacija / tiskovina | 700 € | Eving 20 €/stran; Tash-Tash do 30 €/stran za katalog/knjigo/revijo; Tinin cenik 250–1.200 € na projekt | **delno potrjeno** | 700 € ustreza približno 24–35 stranem lažjega preloma. V kalkulatorju naj obseg strani ostane glavni množitelj. |
| `embalaza` | Embalaža / produkt | 900 € | Omisli tipično 337,5–587,5 €, mediana 425 €; 99designs embalaža od 349 USD | **delno potrjeno** | 900 € je nad javnim nizkocenovnim trgom, vendar sprejemljivo za izvirno embalažo z mrežo, pripravo in usklajevanjem. »Produkt« je treba ločiti od embalaže. |
| `ilustracija` | Ilustracija / vizualni svet | 550 € | 99designs ilustracija od 299 USD; slovenski javni ceniki večinoma ne povedo obsega ali pravic | **nepotrjeno** | Ena ilustracija in »vizualni svet« nista ista izdelek. Osnova je možna za manjši komplet, pravice ostanejo ločene. |
| `direkcija` | Kreativna direkcija | 900 € | primerljivi javni ceniki praviloma uporabljajo dan, mesec ali retainer, ne pavšal projekta | **nepotrjeno** | 900 € brez enote ni preverljivo. Predlagana enota: projektni dan ali mesečni retainer. |
| `fotografija` | Fotografiranje | 450 € | ART A produktna fotografija od 290 €; Flowov dodatek ima 450–600 € za portrete/produktni dan | **delno potrjeno** | 450 € je razumno za krajši termin ali osnovni paket, ne za cel produkcijski dan z najemi in zahtevno retušo. |
| `copy` | Besedila / copywriting | 450 € | Omisli ločuje spletna/PR besedila po številu besed, raziskavi in intervjujih; Flowov dodatek ima 120 €/spletno stran in 250 €/PR članek | **delno potrjeno** | 450 € je smiselno za 3–4 spletne strani. Obvezna je enota (stran, članek ali paket), ne samo projekt. |
| `interier` | Interier dizajn | 1.200 € | Unikrea: idejna zasnova 18–30 €/m², izvedbeni projekt 25–35 €/m²; TriDesign poslovni prostor 15 €/m²; Omisli navaja srednjo vrednost 2.000 € | **potrjeno, napačna enota** | 1.200 € lahko pokrije manjši idejni projekt, ne splošnega interierja. Cena mora izhajati iz m² in faze. |
| `arhitektura` | Arhitekturno oblikovanje | 2.200 € | Omisli: idejna zasnova 5–8 €/m²; IZS faze vrednoti ločeno, PZI predstavlja velik delež celote | **potrjeno, obseg nejasen** | 2.200 € je možno izhodišče za idejno zasnovo, ne za dokumentacijo in nadzor. Razdeliti po fazah IDZ/IZP/DGD/PZI. |
| `razstava` | Razstavni / scenski dizajn | 1.300 € | neposrednega primerljivega javnega slovenskega cenika ni bilo mogoče potrditi | **nepotrjeno** | Obdrži le kot začasno izhodišče. Kvadratura, grafične aplikacije, 3D in nadzor morajo biti ločeni obseg. |
| `produktni` | Produktni / pohištveni dizajn | 1.600 € | neposredni javni ceniki so redki; platforme ločujejo industrijsko oblikovanje, CAD in prototipiranje | **nepotrjeno** | Koncept, tehnična dokumentacija in prototip niso ista storitev. 1.600 € je lahko koncept + osnovni 3D, ne razvoj do proizvodnje. |
| `uxui` | UX/UI dizajn | 1.100 € | 99designs: oblikovanje posamezne spletne strani od 599 USD; globalni oblikovalci na Upworku tipično 15–35 USD/h (širok svetovni trg) | **nepotrjeno za SLO** | Smiselno za manjši tok ali do približno 5 ekranov. Cena mora slediti številu unikatnih pogledov in vključeni raziskavi. |
| `aplikacija` | Mobilna aplikacija | 2.400 € | javne ponudbe zelo nihajo; razvoj in samo UX/UI sta povsem različna produkta | **nepotrjeno / nevarno poimenovanje** | 2.400 € je lahko samo UX/UI manjšega MVP. Če izbira vključuje »Razvoj«, cena ni primerna; storitev preimenuj v »UX/UI mobilne aplikacije« ali razvoj loči. |
| `dizajnsistem` | Dizajn sistem | 1.600 € | ni dovolj primerljivih javnih paketnih cen; cena je vezana na število komponent, stanj, dokumentacijo in dev handoff | **nepotrjeno** | Razumno le za osnovni sistem. Potrebne so velikosti S/M/L po številu komponent. |
| `smm` | Social media vodenje | 650 €/mesec | Profiletter 455 € za 8 in 595 € za 12 objav; Digitalni Manever 290/490 €; Digitala od 790 €, z Reels od 1.490 € | **potrjeno** | 650 € je dobro srednje izhodišče za 12 objav brez polne foto/video produkcije. Enota mora biti mesec. |
| `seo` | SEO | 550 € | slovenski ponudniki ločujejo audit, začetno optimizacijo in mesečno vodenje; enotna projektna cena zato ni neposredno primerljiva | **delno potrjeno** | 550 € je možno za začetni audit/osnovo. Mesečni SEO mora biti ločena postavka. |
| `email` | Email marketing | 350 € | Pakt potrjuje odvisnost od števila pošiljanj in zahtevnosti; javnih paketnih cen z dovolj jasnim obsegom ni dovolj | **nepotrjeno** | 350 € lahko pomeni predlogo + eno kampanjo. Avtomatizacije in redno pošiljanje morajo imeti ločeno osnovo. |
| `pr` | PR / odnosi z javnostmi | 750 € | objavljeni cenik PRSS: sporočilo 308,80 €, follow-up 375,56 €, priprava izhodišč 1.381,24 € | **delno potrjeno** | 750 € ustreza sporočilu + distribuciji/follow-upu. Ne ustreza celovitemu mesečnemu PR. |
| `video` | Video produkcija | 1.300 € | Omisli: tipično 300–950 €, korporativni video 300–3.750 € (povp. 950 €), animirani 1.300–2.150 € | **potrjeno za zahtevnejši obseg** | 1.300 € je nad splošno mediano, vendar realno za koncept, snemanje in postprodukcijo. Najemi in igralci niso vključeni. |
| `motion` | Motion / animacija | 750 € | Omisli oblikovalska animacija tipično 171–775 €, animirani video v video kategoriji 1.300–2.150 € | **potrjeno za kratek motion** | 750 € je zgornji del za krajšo 2D animacijo; za cel animirani video je prenizko. Trajanje mora biti izrecno. |
| `render3d` | 3D vizualizacije | 650 € | 99designs arhitekturni render od 389 USD; Flowov dodatek 350 €/kos | **delno potrjeno** | 650 € je smiselno za približno 1–2 pogleda. Modeliranje iz nič, dodatni pogledi in animacija morajo biti ločeni. |
| `strategija` | Brand strategija | 1.100 € | javni slovenski izvajalci praviloma ponudbo oblikujejo po meri; 99designs full-service brand paket je od 4.499 USD in ni neposredno primerljiv | **nepotrjeno** | 1.100 € je mogoče le za lažjo analizo in dokument brez obsežnih delavnic. Določiti je treba število intervjujev/delavnic in globino raziskave. |

### Kaj je dovolj trdno za uporabo zdaj

- Brez spremembe lahko ostanejo izhodišča za **logo, CGP, spletno stran, SMM**
  in — ob jasnem obsegu — **video**.
- **Publikacija, fotografija, copy, interier, arhitektura, PR, motion in 3D**
  potrebujejo predvsem pravo enoto oziroma fazo; sama številka ni nujno napačna.
- **Kampanja, ilustracija, kreativna direkcija, razstava, produktni dizajn,
  UX/UI, aplikacija, dizajn sistem, SEO, email in brand strategija** ostanejo
  označeni kot začasni, dokler nimamo vsaj dveh res primerljivih javnih ponudb.
- Največje vsebinsko tveganje je **»Mobilna aplikacija«**: vprašalnik dopušča
  razvoj, cenik 2.400 € pa je utemeljiv kvečjemu za manjši UX/UI projekt.

### Viri, preverjeni 22. 8. 2026

- Omisli.si — [logotip, branding in CGP](https://omisli.si/graficno-oblikovanje/izdelava-logotipa-branding-cgp/cene/),
  [embalaža](https://omisli.si/graficno-oblikovanje/oblikovanje-embalaze-nalepk-etiket/cene/),
  [animacija](https://omisli.si/graficno-oblikovanje/izdelava-animacije/cene/),
  [video produkcija](https://omisli.si/video-produkcijo/cene/),
  [notranje oblikovanje](https://omisli.si/arhitekta/notranje-oblikovanje/cene/),
  [PR](https://omisli.si/pr/odnosi-z-javnostmi-piar/cene/).
- Slovenski javni ceniki — [Spletni donos / Vsi.si](https://www.spletnidonos.si/oblikovanje/),
  [Art Design](https://art-design.si/cenik-graficnega-oblikovanja/),
  [Eving](https://eving-oblikovanje.si/cenik/), [Sette](https://sette.at/),
  [MMStudio](https://mmstudio.si/izdelava-spletnih-strani.html),
  [Hrabar — splet](https://hrabar.si/izdelava-spletnih-strani/cenik/),
  [Spletnik](https://spletnik.si/izdelava-spletne-strani/),
  [Unikrea](https://www.unikrea.si/notranje-oblikovanje/),
  [TriDesign](https://www.tridesign.si/cenik/),
  [Profiletter](https://profiletter.com/nase-storitve/upravljanje-druzbenih-omrezij/),
  [Digitala](https://digitala.si/blog-koliko-stane-vodenje-druzbenih-omrezij-v-sloveniji.dc),
  [Digitalni Manever](https://digitalni.manever.si/cenik-upravljanja-druzbenih-omrezij/).
- Mednarodna kontrola spodnjega/srednjega segmenta —
  [99designs kategorije in začetne cene](https://99designs.com/categories),
  [99designs logo paketi](https://99designs.com/pricing),
  [Upwork grafični oblikovalci](https://www.upwork.com/hire/graphic-designers/).
- PRSS cenik je javno reproduciran v
  [pregledu KRITIK.si](https://kritik.si/2023/12/03/dejavnost-kreativne-baze-po-ceniku-slovenskega-drustva-za-odnose-z-javnostmi/);
  pred uporabo za pogodbeno določanje cen je treba poiskati aktualni izvirnik
  društva, ker objava ni uradna stran PRSS.

### Naslednji raziskovalni krog

Za začasne storitve je treba pridobiti ponudbe ali javne cenike z **enakim
obsegom**, ne le isto oznako. Najbolj koristnih bo 3–5 primerov za vsako od teh
skupin: kampanjski paket, ilustracijski komplet z licenco, kreativna direkcija
na dan/mesec, razstavni koncept, produktni koncept + CAD, UX/UI po številu
ekranov, osnovni dizajn sistem, SEO audit, email avtomatizacija in brand
strategija z delavnico. Do takrat se teh izhodišč ne predstavlja kot »tržno
potrjenih«.

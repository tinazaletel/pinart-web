# Tržna raziskava cen storitev v Flowu

**Datum preverjanja:** 22. 8. 2026  
**Namen:** surovi, preverljivi cenovni zapisi za vseh 25 cenjenih storitev v
`lib/pricingCatalog.ts`. Ta dokument ne izhaja iz trenutnih Flowovih cen. Vsak
zapis spodaj vodi na javno objavljeno ponudbo ali cenik.

## Kako brati podatke

- EUR in USD se ne mešata v isti mediani.
- »Od« je vstopna cena, ne povprečje trga.
- Agregat pomeni podatke več ponudnikov, neposredni cenik pa ponudbo enega.
- Primerjamo samo delo. Tisk, zakup medijev, produkcijski najemi, razvoj,
  material in DDV niso vključeni, če pri viru ni zapisano drugače.
- Kjer so obsegi različni, mediane namenoma ni. Lažno natančna mediana bi bila
  slabša od poštene oznake »ni primerljivo«.

## 1 · Grafika in branding

### Logotip + osnovna identiteta

| ponudnik / trg | objavljena cena | obseg ali opomba | vir |
|---|---:|---|---|
| Kroki, SLO | od 150 € | logotip / razpoznavni znak, DDV vključen | [cenik](https://kroki.si/cena-logotip-celostna-podoba) |
| Eving, SLO | od 150 € | oblikovanje logotipa, več predlogov | [cenik](https://eving-oblikovanje.si/cenik/) |
| Omisli, SLO agregat | 560–1.400 €, mediana 750 € | združena kategorija logo/branding/CGP | [analiza 2026](https://omisli.si/graficno-oblikovanje/izdelava-logotipa-branding-cgp/cene/) |
| 99designs, mednarodno | 249 / 399 / 799 / 1.050 USD | štirje paketi natečaja za logo | [pricing](https://99designs.com/pricing) |
| 99designs, mednarodno | od 429 USD | logo + brand guide | [paketi](https://99designs.com/categories) |

**Razporeditev:** slovenski nizkocenovni rob 150 €, agregirano jedro 560–1.400 €;
mednarodni platformni paketi 249–1.479 USD. Flowova storitev vključuje tudi
osnovno identiteto, zato je primerljiva z zgornjo polovico logotipa ali paketom
logo + guide, ne z golim znakom za 150 €.

### Celostna grafična podoba

| ponudnik / trg | objavljena cena | obseg | vir |
|---|---:|---|---|
| Spletni donos / Vsi.si, SLO | 550 € | logo, barve, tipografija, vizitka, dopis, žig | [cenik](https://www.spletnidonos.si/oblikovanje/) |
| Spletni donos / Vsi.si, SLO | 1.200 € | 4 predlogi, priročnik, tiskovine, e-podpis | [cenik](https://www.spletnidonos.si/oblikovanje/) |
| Spletni donos / Vsi.si, SLO | 1.890 € | 8 predlogov, slogan, priročnik in širši komplet | [cenik](https://www.spletnidonos.si/oblikovanje/) |
| Art Design, SLO | 1.000 / 1.600 / 2.500 € | osnovni CGP glede na velikost podjetja | [cenik](https://art-design.si/cenik-graficnega-oblikovanja/) |
| Art Design, SLO | 1.500 / 2.500 / 4.500 € | razširjeni CGP | [cenik](https://art-design.si/cenik-graficnega-oblikovanja/) |
| Sette, SLO | od 690 € | logo, barve, tipografija, pravila, priročnik | [storitve](https://sette.at/) |
| 99designs, mednarodno | od 599 USD | logo + osnovne digitalne in tiskane aplikacije | [brand identity](https://99designs.com/brand-identity-pack) |

**Mediana primerljivih slovenskih osnovnih paketov:** 1.200 € (550, 690,
1.000, 1.200, 1.600, 1.890, 2.500). Razširjeni sistemi so ločen trg.

### Publikacija / tiskovina

| ponudnik / trg | objavljena cena | enota / obseg | vir |
|---|---:|---|---|
| Eving, SLO | 20 €/stran | katalog ali brošura; odvisno od vsebine | [cenik](https://eving-oblikovanje.si/cenik/) |
| Tash-Tash, regija | 30 €/stran | katalog, knjiga ali revija do 30 strani | [PDF cenik](https://tash-tash.com/wp-content/uploads/2024/08/cenik-graficno-oblikovanje-slovenija-hrvatska-italia-istra-umag-2.pdf) |
| Eving, SLO | od 120 € | naslovnica knjige | [cenik](https://eving-oblikovanje.si/cenik/) |
| Tash-Tash, regija | 279 € | naslovnica s personalizirano ilustracijo | [PDF cenik](https://tash-tash.com/wp-content/uploads/2024/08/cenik-graficno-oblikovanje-slovenija-hrvatska-italia-istra-umag-2.pdf) |

**Razporeditev:** 20–30 €/stran za običajen prelom; naslovnica in izvirna
zasnova sta dodatni postavki. Projekt s 24 stranmi pomeni približno 480–720 €
pred naslovnico, ilustracijami in zahtevnejšo pripravo.

### Embalaža

| ponudnik / trg | objavljena cena | obseg | vir |
|---|---:|---|---|
| Tash-Tash, regija | 195 € | etiketa/nalepka + deklaracija | [PDF cenik](https://tash-tash.com/wp-content/uploads/2024/08/cenik-graficno-oblikovanje-slovenija-hrvatska-italia-istra-umag-2.pdf) |
| Omisli, SLO agregat | 337,50–587,50 €, mediana 425 € | embalaža, nalepke in etikete | [analiza 2026](https://omisli.si/graficno-oblikovanje/oblikovanje-embalaze-nalepk-etiket/cene/) |
| 99designs, mednarodno | od 349 USD | produktna/živilska/retail embalaža | [kategorije](https://99designs.com/categories) |
| 99designs, mednarodno | od 299 USD | produktna etiketa | [kategorije](https://99designs.com/categories) |

**Razporeditev:** 195–425 € za etiketo ali lažji posamezen izdelek; celovita
izvirna embalaža z dielineom, več ploskvami, pripravo za proizvodnjo in
usklajevanjem ni enaka tej mediani in potrebuje višji paket.

### Ilustracija / vizualni svet

| ponudnik / trg | objavljena cena | obseg | vir |
|---|---:|---|---|
| Irena Režek, SLO | od 70 € | vektorska grafika | [cenik](https://irenarezek.com/cenik/) |
| Irena Režek, SLO | od 150 / 200 / 220 € | eno-/obojestranska/naslovna ilustracija | [cenik](https://irenarezek.com/cenik/) |
| 99designs, mednarodno | od 299 USD | poslovna, spletna ali knjižna ilustracija | [kategorije](https://99designs.com/categories) |

**Razporeditev:** 70–220 € za posamezno slovensko ilustracijo pred širšimi
pravicami; »vizualni svet« pomeni komplet motivov in ne sme uporabljati cene
enega kosa.

## 2 · Splet in digitalni produkti

### Spletna stran

| ponudnik / trg | objavljena cena | obseg | vir |
|---|---:|---|---|
| Eving, SLO | od 590 € | predstavitvena WordPress stran | [cenik](https://eving-oblikovanje.si/cenik/) |
| WebNET, SLO | 550 / 750 / 1.200 € | one-page / do 10 / do 20 podstrani | [paketi](https://izdelava-spletne-strani-trgovine.si/izdelava-spletne-strani/) |
| Sette, SLO | od 1.200 € | struktura, oblikovanje in izdelava, responsive, osnovni SEO | [storitve](https://sette.at/) |
| Hrabar, SLO | 1.400 € | do 20 podstrani, responsive, SEO, analitika | [cenik](https://hrabar.si/izdelava-spletnih-strani/cenik/) |
| MMStudio, SLO | od 1.490 € | osnovna predstavitvena rešitev | [ponudba](https://mmstudio.si/izdelava-spletnih-strani.html) |
| Spletnik, SLO | od 1.499 € + DDV | izdelava po meri | [ponudba](https://spletnik.si/izdelava-spletne-strani/) |

**Mediana šestih primerljivih vstopnih ponudb:** 1.200 € (550, 590, 1.200,
1.400, 1.490, 1.499). Mediana petih ponudb, ki niso najosnovnejši one-page,
je 1.400 €. Trgovina in spletna aplikacija nista vključeni.

### UX/UI dizajn

| ponudnik / trg | objavljena cena | obseg | vir |
|---|---:|---|---|
| Reztive, mednarodno | 499 USD | landing page, osnovni user flow, 2 reviziji | [pricing](https://reztive.studio/pricing) |
| Reztive, mednarodno | 1.499 USD | do 5 SaaS/produktnih ekranov, flow in wireframes | [pricing](https://reztive.studio/pricing) |
| NexKraft, mednarodno | od 499 USD | do 10 ekranov, flow, wireframe, prototip, basic system | [pricing](https://nexkraft.com/pricing/) |
| NexKraft, mednarodno | od 1.499 USD | do 30 ekranov, raziskava, responsive, design system | [pricing](https://nexkraft.com/pricing/) |
| TwoPixel, mednarodno | od 3.000 USD | product UI/UX, 2–6 tednov | [pricing](https://www.twopixel.org/services/brand-and-design) |

**Razporeditev:** 499–1.499 USD za platformni/startup spodnji segment,
3.000 USD+ za studijski produktni projekt. Slovenski neposredni javni paketi z
enakim obsegom niso bili najdeni; zato ni EUR mediane.

### UX/UI mobilne aplikacije

| ponudnik / trg | objavljena cena | obseg | vir |
|---|---:|---|---|
| NexKraft, mednarodno | od 499 USD | do 10 mobilnih ali spletnih ekranov, brez razvoja | [pricing](https://nexkraft.com/pricing/) |
| Alot Digital, mednarodno | 600–2.000 USD | starter UX/UI, ključni ekrani | [pricing](https://www.alotdigitalagency.com/pricing) |
| Alot Digital, mednarodno | 2.000–6.000 USD | celovitejši produkt in prototip | [pricing](https://www.alotdigitalagency.com/pricing) |
| TwoPixel, mednarodno | od 3.000 USD | product UI/UX | [pricing](https://www.twopixel.org/services/brand-and-design) |

**Pomembno:** to so cene **dizajna**, ne razvoja. Flowova oznaka »Mobilna
aplikacija« mora povedati, ali ceni UX/UI ali programsko izvedbo; ene tržne
cene za oboje ni.

### Dizajn sistem

| ponudnik / trg | objavljena cena | obseg | vir |
|---|---:|---|---|
| TwoPixel, mednarodno | od 4.500 USD | 2–4 tedne, studijski design system | [pricing](https://www.twopixel.org/services/brand-and-design) |
| Adamarant, mednarodno | 5.000–60.000+ USD | od temelja do večjega sistema | [pregled 2026](https://adamarant.com/en/blog/design-system-pricing-in-2026-project-retainer-or-shared-ownership) |
| WhatShouldICharge, ZDA | 5.000–12.000 USD | osnovni startup sistem, 20–30 komponent | [pricing intelligence](https://whatshouldicharge.io/ui-ux-designer/design-system-creation) |
| Intunio, Švedska | 20.000–40.000 SEK | audit | [cenik](https://intunio.se/en/services/design-system) |
| Intunio, Švedska | 320.000–480.000 SEK | celotna družina produktov | [cenik](https://intunio.se/en/services/design-system) |

**Razporeditev:** pravi design system je bistveno dražji od preprostega UI
kita. Flow mora osnovni paket poimenovati »temeljni UI kit«, če vsebuje le
barve, tipografijo in nekaj komponent.

## 3 · Marketing, vsebine in odnosi z javnostmi

### Social media vodenje

| ponudnik / trg | objavljena cena | obseg | vir |
|---|---:|---|---|
| Digitalni Manever, SLO | 290 € + DDV/mesec | FB + IG, 3 objave/teden, pripravljena strategija/material | [cenik](https://digitalni.manever.si/cenik-upravljanja-druzbenih-omrezij/) |
| Digitalni Manever, SLO | 490 € + DDV/mesec | 4 objave + story/teden | [cenik](https://digitalni.manever.si/cenik-upravljanja-druzbenih-omrezij/) |
| Profiletter, SLO | 455 € + DDV/mesec | 8 objav, plan, grafike, besedila, objava | [paketi](https://profiletter.com/nase-storitve/upravljanje-druzbenih-omrezij/) |
| Profiletter, SLO | 595 € + DDV/mesec | 12 objav + strategija | [paketi](https://profiletter.com/nase-storitve/upravljanje-druzbenih-omrezij/) |
| Srečna Lisica, SLO | od 720 €/mesec | do 22 objav, tudi video vsebine | [paket](https://www.srecna-lisica.com/druzbenaomrezja) |
| Digitala, SLO | od 790 €/mesec | dogovorjeni del rednega vodenja | [pregled](https://digitala.si/blog-koliko-stane-vodenje-druzbenih-omrezij-v-sloveniji.dc) |
| Digitala, SLO | od 1.490 €/mesec | vodenje z Reels produkcijo | [pregled](https://digitala.si/blog-koliko-stane-vodenje-druzbenih-omrezij-v-sloveniji.dc) |

**Mediana osnovnih slovenskih mesečnih paketov:** 545 € (290, 455, 490, 595,
720, 790). Video produkcija premakne vstop na približno 720–1.490 €.

### PR / odnosi z javnostmi

| vir / trg | objavljena cena | storitev | povezava |
|---|---:|---|---|
| reproducirani cenik PRSS, SLO | 308,80 € | priprava sporočila za javnost | [pregled cenika](https://kritik.si/2023/12/03/dejavnost-kreativne-baze-po-ceniku-slovenskega-drustva-za-odnose-z-javnostmi/) |
| reproducirani cenik PRSS, SLO | 375,56 € | pošiljanje, preverjanje in dogovarjanje objav | [pregled cenika](https://kritik.si/2023/12/03/dejavnost-kreativne-baze-po-ceniku-slovenskega-drustva-za-odnose-z-javnostmi/) |
| reproducirani cenik PRSS, SLO | 1.381,24 € | priprava izhodišč za PR aktivnosti | [pregled cenika](https://kritik.si/2023/12/03/dejavnost-kreativne-baze-po-ceniku-slovenskega-drustva-za-odnose-z-javnostmi/) |

**Razporeditev:** približno 684 € za sporočilo + distribucijski follow-up;
strateška priprava je ločen, višji projekt. Vir je reprodukcija in ga je pred
pogodbeno uporabo treba preveriti pri aktualnem izvirniku PRSS.

### SEO, email, copywriting, kampanja in brand strategija

Za te storitve je bilo najdenih premalo **posameznih javnih ponudb z enakim
obsegom**, da bi bila mediana poštena. Uporabni javni signali so:

| storitev | ponudnik / cena | kaj dejansko pokriva | vir |
|---|---:|---|---|
| copywriting | Eving 40 €/h | oblikovalska ura; uporaben le kot spodnja urna kontrola kreativnega dela | [cenik](https://eving-oblikovanje.si/cenik/) |
| copywriting | Flowov zunanji Tinin cenik 120 €/spletno stran | spletno besedilo; lasten zgodovinski vir, ne spletni dokaz | [povzetek](CENE-RAZISKAVA.md) |
| email marketing | brez javne cene | Pakt potrjuje model po številu pošiljanj in zahtevnosti | [opis](https://www.pakt.si/storitve/email-marketing) |
| SEO | brez dovolj razčlenjene javne cene | ponudniki ločujejo audit, implementacijo in mesečni retainer | [SEObeta cenik](https://seobeta.si/wp-content/uploads/2024/07/SEObeta-cenik-2024-izdelava-spletne-strani-seo-clanki.pdf) |
| kampanja | Tash-Tash 55 €/pasico | posamezna spletna pasica, ne koncept kampanje | [PDF cenik](https://tash-tash.com/wp-content/uploads/2024/08/cenik-graficno-oblikovanje-slovenija-hrvatska-italia-istra-umag-2.pdf) |
| brand strategija | 99designs od 4.499 USD | full-service brand paket s strategom; ni neposredno primerljiv z lažjim dokumentom | [kategorije](https://99designs.com/categories) |

**Odločitev:** teh cen še ni dovoljeno razglasiti za tržno potrjene. Naslednji
krog mora iskati oziroma pridobiti konkretne ponudbe za: SEO audit, mesečni SEO,
predlogo + eno email kampanjo, email avtomatizacijo, spletna besedila na stran,
koncept kampanje + ključni vizual in brand strategijo z določnim številom
delavnic/intervjujev.

## 4 · Foto, video, motion in 3D

### Fotografiranje

| ponudnik / trg | objavljena cena | obseg | vir |
|---|---:|---|---|
| Studio Železna, SLO | od 25 € + DDV/produkt | fotografiranje, izbor in obdelava | [PDF cenik](https://www.zelezna.si/files/ceniki/1/pdf/FOTO%20STUDIO%20ZELEZNA%20FE16%20STORITVE%20FOTOGRAFIRANJE%20CENIK%202024%20SPLETN.pdf) |
| ART A, SLO | od 290 € | paket produktne fotografije | [objavljena ponudba](https://omisli.si/art-a-oglasevalska-agencija/) |
| MOM katalog stroškov, SLO | 400–600 €/dan | snemalni dan fotografiranja | [javni katalog](https://maribor.si/wp-content/uploads/2023/02/KATALOG-STROSKOV-razpis.pdf) |

**Razporeditev:** produktna fotografija po kosu od 25 €, paket od 290 €,
snemalni dan 400–600 €; najem studia, modeli, scena in zahtevna retuša dodatno.

### Video produkcija

| ponudnik / trg | objavljena cena | obseg | vir |
|---|---:|---|---|
| Samo Paušer, SLO | 800–1.800 € | do 4 h, 1–2 kameri, 2–3 min, osnovni motion | [cenik](https://samopauser.com/cenik-video/) |
| Digital Studio, SLO | 1.290 € + DDV | pol dneva, glasba, grafika, montaža | [cenik](https://www.digitalstudio.si/cenik) |
| Digital Studio, SLO | 1.990 € + DDV | cel dan, scenarij, režija, grafika, spiker | [cenik](https://www.digitalstudio.si/cenik) |
| Kontrast, SLO | od 1.950 € | korporativni film, celoten cikel | [cenik](https://kontrast.si/video-produkcija-cenik/) |
| Omisli, SLO agregat | 300–950 €, mediana 737,50 € | mešanica video produkcije | [analiza 2026](https://omisli.si/video-produkcijo/cene/) |

**Mediana štirih primerljivih neposrednih vstopnih ponudb:** približno 1.545 €
(800, 1.290, 1.800, 1.990); agregat vključuje tudi manjše produkcije.

### Motion / animacija

| ponudnik / trg | objavljena cena | obseg | vir |
|---|---:|---|---|
| Kontrast, SLO | 180–800 € | paket motion grafike / animacij | [cenik](https://kontrast.si/video-produkcija-cenik/) |
| Digital Studio, SLO | od 600 € + DDV | animirani TV oglas do 15 s | [cenik](https://www.digitalstudio.si/cenik) |
| Irena Režek, SLO | od 900 €/min | motion graphics | [cenik](https://irenarezek.com/cenik/) |
| Digital Studio, SLO | od 1.700 € + DDV | 1-min explainer, scenarij, ilustracije, spiker | [cenik](https://www.digitalstudio.si/cenik) |
| Omisli, SLO agregat | 171–775 €, mediana 300 € | mešana kategorija animacije | [analiza 2026](https://omisli.si/graficno-oblikovanje/izdelava-animacije/cene/) |

**Razporeditev:** 180–900 € za krajši motion element; 1.700 €+ za cel minutni
razlagalni video. Trajanje in zahtevnost morata biti del imena postavke.

### 3D vizualizacija

| ponudnik / trg | objavljena cena | obseg | vir |
|---|---:|---|---|
| 99designs, mednarodno | od 389 USD | posamezen arhitekturni render | [kategorije](https://99designs.com/categories) |
| V kadru, SLO | 2.500–5.000+ € | 3D animacija izdelka | [storitve](https://vkadru.si/) |
| Intunio/ostali javni paketi | ni primerljive EUR cene | cena močno odvisna od obstoječega modela, pogledov in animacije | — |

**Odločitev:** statični render in 3D animacija morata biti ločeni storitvi.
Za statični render je objavljen mednarodni vstop 389 USD; slovenska 3D animacija
je več tisoč evrov. Skupna mediana bi bila nesmiselna.

## 5 · Prostor, arhitektura in produkt

### Interier dizajn

| ponudnik / trg | objavljena cena | faza | vir |
|---|---:|---|---|
| TriDesign, SLO | 15 €/m² | idejna zasnova poslovnega prostora | [cenik](https://www.tridesign.si/cenik/) |
| Unikrea, SLO | 18–30 €/m² | idejna zasnova | [cenik](https://www.unikrea.si/notranje-oblikovanje/) |
| Unikrea, SLO | 25–35 €/m² | projekt za izvedbo | [cenik](https://www.unikrea.si/notranje-oblikovanje/) |
| Notranje-oblikovanje.si, SLO | od 45 €/m² | idejna zasnova / ponudnikov paket | [ponudba](https://notranje-oblikovanje.si/) |
| Omisli, SLO | srednja cena 2.000 € | mešani projekti notranjega oblikovanja | [pregled](https://omisli.si/nasvet-strokovnjaka/interier/interier-cene-za-notranje-oblikovanje-notranji-dizajn-in-ideje-za-vas-dom-arhitekt-notranji-oblikovalec/) |

**Mediana treh javnih izhodišč idejne zasnove:** 24 €/m² (15, sredina 24,
45). Izvedbeni projekt je ločen in dražji. Pavšal brez kvadrature ni primerljiv.

### Arhitekturno oblikovanje

| vir / trg | objavljena cena | faza | povezava |
|---|---:|---|---|
| Omisli, SLO | 900–1.500 € | idejna zasnova (IDZ), srednja 1.100 € | [pregled 2026](https://omisli.si/nasvet-strokovnjaka/arhitekt/arhitekt-cena-pgd-pzi-pid-idp-pzr-interier-nacrt-hisa-stanovavnje/) |
| Omisli, SLO | 1.800–3.000 € | idejni projekt (IDP), srednja 2.200 € | [pregled 2026](https://omisli.si/nasvet-strokovnjaka/arhitekt/arhitekt-cena-pgd-pzi-pid-idp-pzr-interier-nacrt-hisa-stanovavnje/) |
| Omisli, SLO | 2.500–6.300 € | DGD/PGD, srednja 4.000 € | [pregled 2026](https://omisli.si/nasvet-strokovnjaka/arhitekt/arhitekt-cena-pgd-pzi-pid-idp-pzr-interier-nacrt-hisa-stanovavnje/) |
| Omisli, SLO | 3.000–6.300 € | PZI, srednja 4.200 € | [pregled 2026](https://omisli.si/nasvet-strokovnjaka/arhitekt/arhitekt-cena-pgd-pzi-pid-idp-pzr-interier-nacrt-hisa-stanovavnje/) |
| Omisli, SLO | 5–8 €/m² | idejni načrt stanovanja | [pregled 2026](https://omisli.si/nasvet-strokovnjaka/arhitekt/arhitekt-cena-pgd-pzi-pid-idp-pzr-interier-nacrt-hisa-stanovavnje/) |
| IZS, SLO | 7 % / 11–14 % / 25–30 % | deleži IDZ / IDP / PZI v celotni storitvi | [normativni pregled](https://arhiv.izs.si/fileadmin/dokumenti/aktualno/aktualno-leto-2012/4-priloga-k_tc__5-MVPS_marec_2012.pdf) |

**Odločitev:** spletni javni podatki ne podpirajo ene pavšalne cene za vse
faze. Flow mora ceno vezati na m² in izbrane faze; dovoljenja, inženirski načrti
in nadzor niso del istega izhodišča kot idejna zasnova.

### Razstavni / scenski dizajn

| vir / trg | objavljena cena | obseg | povezava |
|---|---:|---|---|
| MOM katalog stroškov, SLO | 1.500 € | scenografija, pavšal | [javni katalog](https://maribor.si/wp-content/uploads/2023/02/KATALOG-STROSKOV-razpis.pdf) |
| MOM katalog stroškov, SLO | 10 % celotne vrednosti | oblikovanje razstave | [javni katalog](https://maribor.si/wp-content/uploads/2023/02/KATALOG-STROSKOV-razpis.pdf) |
| MOM katalog stroškov, SLO | do 2.500 € | pregledna razstava / razstavnina, ni čista oblikovalska storitev | [javni katalog](https://maribor.si/wp-content/uploads/2023/02/KATALOG-STROSKOV-razpis.pdf) |

**Razporeditev:** 1.500 € je uporaben javni pavšal za scenografijo; pri razstavi
je pogost model odstotek celotne vrednosti. Izdelava konstrukcije ni vključena.

### Produktni / pohištveni dizajn

Za to storitev v tem krogu ni bilo mogoče najti treh javnih cenikov z enakim
obsegom. Javni katalogi mešajo industrijski koncept, CAD, inženiring, prototip
in pripravo na proizvodnjo. **Rezultat: brez tržnega razpona.** Pred zbiranjem
ponudb je treba storitev razdeliti najmanj na: koncept, 3D/CAD, tehnično
dokumentacijo, prototip in nadzor proizvodnje.

## 6 · Kreativno vodenje in strategija

### Kreativna direkcija

Javni slovenski ceniki skoraj vedno uporabljajo dan ali mesečni retainer in ne
enotnega projekta. Mednarodni strokovni benchmark VTV, že dokumentiran v
`CENE-RAZISKAVA.md`, navaja 120 €/h za strateško oblikovanje. To ni dovolj za
slovensko mediano. **Flow mora najprej določiti enoto: dan, mesec ali projekt z
določenim številom srečanj.**

### Brand strategija

| ponudnik / trg | objavljena cena | obseg | vir |
|---|---:|---|---|
| 99designs, mednarodno | od 4.499 USD | full-service brand paket z osebnim strategom | [kategorije](https://99designs.com/categories) |
| beGlobal Design, mednarodno | 2.847,50 USD | identiteta; strategija ni jasno ločena | [pricing](https://beglobaldesign.com/pricing) |
| slovenski ponudniki | po meri | javni opisi ne objavijo primerljivega števila delavnic/intervjujev | [primer FormingBrands](https://formingbrands.si/pogosta-vprasanja/) |

**Odločitev:** brez slovenske mediane. Raziskovalni dokument, delavnica in
celoten strateški proces morajo biti tri različne velikosti.

## Končna razporeditev glede na kakovost dokazov

| kakovost podatkov | storitve |
|---|---|
| **A — vsaj 3 neposredni primerljivi ceniki** | CGP, spletna stran, social media, video, motion, interier |
| **B — 2+ uporabna vira, obseg je treba normalizirati** | logo, publikacija, embalaža, ilustracija, UX/UI, aplikacijski UX/UI, fotografija, PR, razstava |
| **C — javni signal obstaja, ni dovolj za mediano** | kampanja, copywriting, SEO, email marketing, 3D statični render, dizajn sistem, brand strategija, arhitektura |
| **D — najprej je treba definirati izdelek/enoto** | kreativna direkcija, produktni/pohištveni dizajn |

## Kaj raziskava pomeni za Flow

1. Cen se ne sme samodejno zamenjati samo zato, ker je nekdo objavil nižji
   paket. Najprej mora biti obseg primerljiv.
2. Najbolj zanesljivo utemeljeni izhodišči sta trenutno **spletna stran okoli
   1.200–1.500 €** in **SMM okoli 455–790 €/mesec brez večje video produkcije**.
3. CGP ima na slovenskem trgu jasno stopnjevanje: približno **550–1.200 € za
   vstop**, **1.200–2.500 € za srednji sistem**, **2.500–4.500 € za razširjenega**.
4. Pri interierju, arhitekturi, publikaciji, UX/UI, fotografiji in motionu mora
   kalkulator prikazati enoto, ker pavšal zakrije glavni stroškovni dejavnik.
5. »Mobilna aplikacija« se mora razdeliti na **UX/UI dizajn** in **razvoj**.
6. Raziskava še ni zaključena za kategorije C in D. Tam dokument ne ugiba in
   ne izdeluje mediane iz neprimerljivih podatkov.

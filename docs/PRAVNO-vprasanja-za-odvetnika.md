# Pinart Flow — vprašanja za pravni pregled

Pripravljeno 21. 8. 2026 za pregled pogojev poslovanja in politike zasebnosti.

**Kaj je Pinart Flow.** Spletno poslovno orodje (SaaS) za samostojne podjetnike,
mikro podjetja in manjše kreativne studie. Uporabnik v njem pripravlja ponudbe,
pogodbe in račune, vodi projekte in stranke ter hrani poslovne dokumente.
Naročniški model, delno brezplačna raba (kalkulator cen brez registracije).
Ponudnik: Pinart, Tina Zaletel. Načrtovan trg: Slovenija, nato EU in ZDA.

**Kje sta besedili.** Pogoji: `/kalkulator/pogoji`. Zasebnost: `/zasebnost`.
Obe strani sta dvojezični (slovensko in angleško) in sta **osnutek**, pisan brez
pravne pomoči.

---

## 1. Davčno potrjevanje računov (najbolj pereče)

Flow izdaja račune, **ni pa davčna blagajna** in ne izvaja davčnega potrjevanja
pri FURS. Računi so namenjeni plačilu z nakazilom na TRR.

Tveganje: uporabnik izstavi račun v Flowu, plačilo prejme v gotovini in
predpostavlja, da je davčno urejeno.

**Vprašanje:** kako naj se ta omejitev zapiše, da je odgovornost jasno na
uporabniku? Osnutek člena, ki ga prosimo popraviti:

> Pinart Flow ni davčna blagajna in ne izvaja davčnega potrjevanja računov pri
> FURS. Računi, izdani v Flowu, so namenjeni plačilu z nakazilom na transakcijski
> račun. Če uporabnik prejema plačila v gotovini, s plačilno kartico na prodajnem
> mestu ali na drug način, ki se šteje za gotovinsko poslovanje, mora za izdajo
> računov uporabiti ustrezno davčno blagajno. Za skladnost s predpisi o davčnem
> potrjevanju računov odgovarja uporabnik.

## 2. Vloga po GDPR in pogodba o obdelavi

Uporabnik v Flow vnaša **osebne podatke svojih strank** (ime, naslov, davčna
številka, e-naslov, vsebina komunikacije). Flow je tu obdelovalec, uporabnik pa
upravljavec.

**Vprašanja:** je potrebna ločena pogodba o obdelavi podatkov (DPA) in ali
zadošča vključitev v pogoje? Kateri podobdelovalci morajo biti navedeni
(gostovanje, baza, pošiljanje e-pošte, ponudnik AI)? Kaj mora pisati o
prenosu podatkov v tretje države?

## 3. Vsebina, ki jo ustvari AI

Flow z jezikovnim modelom pripravlja osnutke ponudb, briefov, pitchev in
poslovnih dokumentov. Model se lahko zmoti ali navede napačen podatek.

**Vprašanje:** kako omejiti odgovornost za vsebino, ki jo ustvari model, ne da
bi omejitev postala neveljavna kot nepošten pogodbeni pogoj?

## 4. Cenovna priporočila

Orodje uporabniku **predlaga ceno** njegovega dela na podlagi vnesenih podatkov
in primerjav. To ni finančni ali davčni nasvet.

**Vprašanje:** je potrebno posebno opozorilo? Nosi kakšno odgovornost, če
uporabnik po predlagani ceni posluje z izgubo?

## 5. Podatki iz javnih registrov

Načrtujemo prevzem podatkov o poslovnih subjektih iz AJPES (servis proFi=Po):
identifikacija, transakcijski računi in blokade, insolventni postopki, finančni
kazalniki iz letnih poročil. Podatke bi hranili v lastni bazi in jih prikazovali
plačljivim uporabnikom.

**Vprašanja:** kaj mora biti zapisano v pogojih glede vira in točnosti teh
podatkov? Kakšna je odgovornost, če je prikazan podatek zastarel ali napačen in
uporabnik na tej podlagi sklene posel?

## 6. Časovni žig avtorstva (»Sef«)

Flow izračuna zgostitev datoteke (SHA-256) in pridobi časovni žig neodvisnega
strežnika po RFC 3161. Strežnik ni kvalificirana overitelj po eIDAS.

**Vprašanje:** kaj smemo o tem trditi? Konkretno — ali smemo zapisati, da žig
»dokazuje obstoj datoteke ob določenem času«, ali je potrebna previdnejša
formulacija, dokler ne uporabimo kvalificiranega ponudnika?

## 7. Potrošniki proti podjetjem

Ciljna skupina so podjetja, a se lahko registrira tudi posameznik brez
dejavnosti.

**Vprašanja:** ali moramo ločiti pogoje za potrošnike (pravica do odstopa,
obvezne informacije) ali lahko rabo omejimo izključno na poslovne subjekte in
kako naj bo ta omejitev zapisana?

## 8. Zaprta beta in brezplačna raba

Trenutno je dostop omejen na povabljene testerje, kalkulator pa je brezplačen in
odprt.

**Vprašanja:** kaj mora biti zapisano za obdobje beta (jamstva, razpoložljivost,
možnost izgube podatkov) in kaj za brezplačno rabo brez registracije?

## 9. Tuji trgi

Načrtujemo prodajo v ZDA. Osnutek pogojev že vsebuje nekaj ameriških določb,
napisanih brez pravne pomoči.

**Vprašanja:** katero pravo in katero sodišče naj velja? Ali ameriške določbe v
osnutku puščamo, jih odstranimo do ureditve, ali jih je treba pisati posebej?

## 10. Odpoved, izbris in izvoz podatkov

**Vprašanja:** kako dolgo smemo hraniti podatke po odpovedi naročnine, kaj mora
pisati o izvozu podatkov ob odhodu in kaj o izbrisu na zahtevo?

## 11. Pogodba o obdelavi je vpisana v pogoje (točka 4G)

Vlogo obdelovalca smo medtem uredili v **točki 4G pogojev uporabe**; točka 8B
politike zasebnosti se nanjo sklicuje.

**Vprašanje:** ali 4G zadošča kot pogodba o obdelavi po 28. členu GDPR ali
potrebujemo ločen dokument? Preverili bi radi, ali vsebuje vse zahtevane
elemente: predmet, trajanje, namen, vrste podatkov, kategorije posameznikov,
navodila upravljavca, zaupnost, varnost, podobdelovalce, pomoč pri pravicah
posameznikov, izbris ali vrnitev podatkov ob koncu in možnost nadzora.

Dokler tega ne potrdite, formulacije v pogojih ne bomo krepili.

## 12. Pravna podlaga za AI (Pupa)

Pupa deluje prek Anthropic Claude API. Uporabnik jo sproži sam; če je ne
uporablja, se ne pošlje nič.

**Vprašanje:** katera podlaga je pravilna — izvajanje pogodbe (6(1)(b)) ali
privolitev (6(1)(a))? Po smernicah EDPB mora biti obdelava pri 6(1)(b)
objektivno nujna za izvedbo storitve, kar pri izbirni funkciji ni samoumevno.
Če je pravilna privolitev, moramo dodati preklic, ki je enako preprost kot
podaja.

Ne bi radi zapisali ene podlage »za vsak primer«, če ne drži.

## 13. Prenosi v ZDA — za vsakega ponudnika posebej

Uporabljamo Vercel (gostovanje), Resend (pošiljanje pošte) in Anthropic (AI).
Podatki verjetno potujejo v ZDA.

**Vprašanje:** kako naj to zapišemo, ne da bi trdili preveč? Za vsakega
ponudnika bi bilo treba preveriti pravo pogodbeno družbo, sklenjen DPA,
lokacijo obdelave in dejanski mehanizem prenosa (odločba o ustreznosti, Data
Privacy Framework, standardne pogodbene klavzule). Tega doslej nismo preverili
za vsakega posebej.

## 14. Arbitraža za ZDA (točka 11d) — obdržati ali umakniti?

V pogojih je klavzula o zavezujoči arbitraži in odpovedi skupinski tožbi za
uporabnike v ZDA. Napisana je bila brez pravne pomoči.

**Naša skrb:** Flow prodajamo tudi samostojnim ustvarjalcem, ki se lahko pravno
štejejo za potrošnike. Vnaprej pripravljena klavzula, ki oteži sodno varstvo, je
lahko nepoštena in nezavezujoča.

**Vprašanje:** naj klavzulo obdržimo, spremenimo ali umaknemo, dokler ZDA ni naš
dejanski trg?

## 15. Odstavki, ki še niso aktualni

Nekatere določbe so pisane za funkcije, ki še ne delujejo ali jih še ne
prodajamo. Predlagamo, da jih do takrat **skrijemo**, ne izbrišemo — da so
pripravljene, ko pride čas, in da danes ne obljubljamo, česar ni.

- **plačljivi trezor** — omenjen v pogojih, funkcija še ni na trgu
- **arbitraža za ZDA** — dokler ZDA ni naš trg
- **naročnina in plačila** — plačilni sistem še ni postavljen

**Vprašanje:** je z vidika prava bolje imeti določbe vnaprej (in jih ne
uporabljati) ali jih dodati šele, ko funkcija zaživi?

---

## Kaj smo že popravili

Omenjamo zato, ker so bili to primeri, kjer je dokument trdil nekaj drugega kot
koda. Radi bi, da za celoto velja: **politika opisuje resnično obdelavo, ne
želene.**

- **Časovni žig.** Politika in pogoji so navajali različna mehanizma (FreeTSA po
  RFC 3161 proti OpenTimestamps/Bitcoin). Poenoteno po tem, kar koda res
  uporablja: RFC 3161, privzeto FreeTSA. Bitcoina ni nikjer.
- **Varnostne kopije.** Dokumentacija je navajala, da jih ni. Od 23. 8. 2026 je
  projekt na paketu Supabase Pro z dnevnimi kopijami; besedilo je popravljeno.
- **Regija.** Baza stoji v EU (Stockholm, eu-north-1) — potrjeno v nadzorni
  plošči.
- **Opombe za odvetnika** so umaknjene z javnih strani (spodaj).

## Opombe, ki smo jih umaknili z javnih strani

Te opombe so bile do 23. 8. 2026 vidne obiskovalcem. Namenjene so vam, ne
strankam, zato so zdaj tukaj.

| Kje | Kaj je pisalo |
|---|---|
| Pogoji, uvod (EN) | DRAFT — pending legal review |
| Pogoji 4c — Sef avtorstva | OSNUTEK — pravno mora potrditi odvetnik |
| Pogoji 7 — AI (Pupa) | OSNUTEK — pravno mora potrditi odvetnik |
| Pogoji 9a — Odločitve in AI | OSNUTEK — pravno mora potrditi odvetnik |
| Pogoji 11d — Arbitraža ZDA | OSNUTEK — zavezujoča arbitraža in odpoved skupinski tožbi sta pravna izbira, ne zahteva. Pred uporabo naj obseg in izvršljivost potrdi odvetnik za ZDA (FAA in omejitve po pravu posamezne države). |
| Zasebnost, uvod (EN) | DRAFT — pending legal review |
| Zasebnost 9 — Pupa | OSNUTEK — pravno mora potrditi odvetnik |
| Zasebnost 9 — Pupa | »Pravno podlago (privolitev ali zakoniti interes) mora pred objavo potrditi odvetnik.« |

---

## Kje si lahko ogledate produkt

- **brezplačni kalkulator cene** — odprt, brez registracije; pokaže logiko
  izračuna in je edini del, ki gre morda v javni zagon prvi
- **celotna platforma** — dostop uredimo posebej (zaprta beta)

Povezavi pošljemo v spremnem sporočilu.

V aplikaciji je tudi **gumb, prek katerega se stranka lahko odloči za odvetnika**
— torej uporabnika napotimo na pravno pomoč, ko jo pri pogodbi potrebuje.

---

**Prošnja.** Zanima nas predvsem, kaj je **nujno popraviti pred javnim
zagonom** in kaj lahko počaka. Zagon je predviden v začetku septembra 2026.

Prosimo tudi za **priporočilo odvetnika** za to vrsto vprašanj — SaaS, GDPR, AI
in avtorske pravice — **za slovenski in za ameriški trg**. Flow načrtujemo tudi
za tuje uporabnike, zato bi radi imeli oba pogleda. Enako nas zanima, koga bi
lahko priporočili našim uporabnikom prek gumba, omenjenega zgoraj.

---

## Priloge

- `docs/EVIDENCA-OBDELAVE.md` — evidenca dejavnosti obdelave (30. člen)
- `docs/PODATKOVNI-TOK.md` — kateri podatki tečejo kam, z diagrami
- pogoji uporabe in politika zasebnosti — objavljena, dvojezično
- `docs/PRAVNI-PREGLEDI-AI.md` — pregledi jezikovnih orodij; niso pravno mnenje,
  so pa vir vprašanj v tem dokumentu

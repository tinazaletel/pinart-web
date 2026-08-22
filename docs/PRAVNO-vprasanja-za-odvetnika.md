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

---

**Prošnja.** Zanima nas predvsem, kaj je **nujno popraviti pred javnim
zagonom** in kaj lahko počaka. Zagon je predviden v začetku septembra 2026.

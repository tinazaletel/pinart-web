# Pinart Flow: vprašanja za pravni pregled

**Različica 3, 4. 9. 2026.** Prva različica (25. 8. 2026) je imela 17 vprašanj.
Druga (26. 8.) je dodala vprašanja o pravicah uporabe v kalkulatorju — v tej
različici so preštevilčena v 19 do 28, ker sta v drugi dve vprašanji po pomoti
nosili številko 18. Vprašanja 1 do 18 so nespremenjena. Nova so vprašanja
29 do 38 (razdelek »Kar je nastalo po 25. 8.«) in uvodni seznam sprememb, da
vam ni treba iskati, kaj je drugače.

Sem Tina Zaletel, oblikovalka. Zadnje leto sem naredila **Pinart Flow**, spletno
orodje za samostojne kreativce in male studie. V njem pripravijo ponudbo,
pogodbo in račun, vodijo projekte in stranke ter hranijo dokumente. Del orodja
je brezplačni kalkulator cen, ki deluje brez registracije.

Pogoje uporabe in politiko zasebnosti sem **napisala sama, brez pravne pomoči**.
Objavljena sta in v uporabi; obe besedili prilagam, na strani sta na
`www.pinartflow.com/kalkulator/pogoji` in `www.pinartflow.com/zasebnost`.

**Stanje 4. 9. 2026:** orodje je v zaprti beti — dostop imajo povabljeni
testerji, ki se prijavijo prek obrazca in dobijo geslo. Javno in brez prijave
delujejo brezplačni kalkulator, predstavitvene strani in vprašalnik o cenah
(vprašanje 29). Plačljive naročnine tečejo prek Stripa. Najbolj me zanima
**kaj moram popraviti pred odprtjem za vse in kaj lahko počaka**.

---

## Kaj je novo od 25. 8. 2026 (na kratko)

V pogojih in politiki (živi različici 2026-08-31):

- Stripe je poimenovan kot pooblaščeni ponudnik plačil (točka 2a pogojev,
  5a politike). Naročnine so od 28. 8. žive.
- Nova podobdelovalca: PostHog (EU, Frankfurt; toplotne karte, posnetki sej in
  lijaki, samo na predstavitvenih straneh in samo po privolitvi) in AJPES
  (poizvedbe v poslovni register in letna poročila). Politika 5a, 6 in 8;
  pogoji 8a.
- Politika 2: med podatki o uporabi je zdaj tudi skupen čas, ko je aplikacija
  odprta in dejavna.
- Točka 1a pogojev se imenuje »Od kod tržni okvir« (prej »Od kod priporočene
  cene«): orodje ne izreka »priporočene cene«, ampak pokaže razpon iz javno
  objavljenih cenikov.

Zgrajeno, a v besedilih še ne opisano (zato nova vprašanja 29 do 38):

- javni vprašalnik o cenah za kreativce (29),
- vprašalniki, ki jih uporabniki pošiljajo svojim strankam (30),
- povpraševanja se hranijo tudi v moji bazi, ne le v Google Sheets (31),
- preverjanje stranke: bonitetni podatki iz AJPES z mesečno kvoto (32),
- davčna blagajna: zgrajena, izklopljena, vklop po zagonu z zunanjim
  izvajalcem (33),
- pravice uporabe zdaj v ponudbi in pogodbi z izrecnimi stavki (34),
- ekipe: organizacija, vabila, vloge, sedeži (35),
- evidenca delovnega časa po ZEPDSV (36),
- privolitev za PostHog in snemanje sej (37),
- cene: tri lestvice, uvodna do 31. 10. 2026, obstoječim se ne dvigne (38).

---

## Kar me najbolj skrbi

**1. Računi in FURS.** Flow izdaja račune, ni pa davčna blagajna in računov ne
potrjuje pri FURS. Namenjeni so plačilu na transakcijski račun. Bojim se
primera, ko uporabnik izda račun pri meni, plačilo prejme v gotovini in misli,
da je davčno vse urejeno. Kako naj to omejitev zapišem, da je odgovornost jasno
na uporabniku? Tako sem ga zaenkrat zapisala sama, prosim, popravite ga po
svoje:

> Pinart Flow ni davčna blagajna in ne izvaja davčnega potrjevanja računov pri
> FURS. Računi, izdani v Flowu, so namenjeni plačilu z nakazilom na
> transakcijski račun. Če uporabnik prejema plačila v gotovini, s plačilno
> kartico na prodajnem mestu ali na drug način, ki se šteje za gotovinsko
> poslovanje, mora za izdajo računov uporabiti ustrezno davčno blagajno. Za
> skladnost s predpisi o davčnem potrjevanju računov odgovarja uporabnik.

*(Dopolnitev 4. 9.: to velja še naprej, dokler je modul iz vprašanja 33
izklopljen.)*

**2. Podatki strank mojih uporabnikov.** V Flow vnašajo imena, naslove, davčne
številke in vsebino komunikacije svojih strank. Razumem, da sem pri tem
obdelovalec, uporabnik pa upravljavec, in sem pogodbo o obdelavi napisala kar v
pogoje (točka 4g). Ali to zadošča po 28. členu GDPR ali potrebujem ločen
dokument, ki ga vsak podpiše posebej?

**3. Pupa (AI pomočnica).** Deluje prek Anthropic Claude API. Uporabniku
povem, naj vanjo ne vnaša zaupnih podatkov, in da brez uporabe Pupe podatki ne
gredo nikamor. Vprašanji: katera pravna podlaga je prava, privolitev ali
zakoniti interes, in kaj moram urediti za prenos v ZDA (DPA, standardne
pogodbene klavzule)? Enako me zanima za vse ponudnike zunaj EU, ki jih naštevam
med podobdelovalci.

**4. Cene, ki jih orodje priporoči.** Privzete cene in množitelji so nastali iz
AI raziskave trga: iz javnih cenikov, priporočil stanovskih združenj in primerjav
objavljenih cen. Niso izmerjena statistika; to bazo šele gradim iz anonimnih
izračunov. V pogojih pišem, da so informativni in da je končna cena odločitev
uporabnika. Je to dovolj, da me ne doleti odgovornost, če nekdo po mojem
predlogu zaračuna preveč ali premalo?

**5. Podatki iz javnih registrov.** V orodju je iskalnik podjetij, ki iz javnih
virov (AJPES, FURS) predizpolni naziv, naslov in davčno številko stranke. Ali
smem te podatke uporabljati na tak način in ali moram kaj posebej navesti?
*(Glej tudi vprašanje 32 — od 28. 8. so zraven še bonitetni podatki.)*

## Manjše, a nerešeno

**6. Sef avtorstva.** Shrani kriptografski odtis datoteke in datum, časovni žig
pa naredi neodvisen overitelj po standardu RFC 3161. Pišem, da to dokazuje
obstoj dela na določen dan, ne pa avtorstva. Je taka formulacija dovolj
previdna?

**7. Potrošniki proti podjetjem.** Orodje je namenjeno poslovni rabi, a
samostojni kreativci so pogosto tudi potrošniki. Katere določbe moram
prilagoditi, da so pravice potrošnikov spoštovane (odstop od pogodbe, vračila)?

**8. Zaprta beta.** Dostop je po vabilu, funkcije se še spreminjajo, podatki se
lahko ponastavijo. Kako to zapisati, da je pošteno in hkrati varno?

**9. Izbris in izvoz.** Uporabnik lahko podatke kadarkoli izvozi, izbris
zahteva po e-pošti. Moram izbris ponuditi kot gumb v aplikaciji?

**10. Priponke.** Uporabniki lahko k projektom in pošti pripenjajo datoteke
(slike, PDF, tudi SVG). Shranjene so v zasebni shrambi v EU. Moram za naložene
vsebine dodati kaj več, kot imam v točki 8c (prijava sporne vsebine)?

**11. Ustanovna cena.** Razmišljam o ponudbi »ustanovna cena ostane enaka, dokler
naročnina neprekinjeno traja«. Ali me taka obljuba zavezuje za vedno in kako naj
jo zapišem, da jo lahko izpolnim? *(Odločitev je padla 30. 8. — glej
vprašanje 38.)*

**12. Predloge pogodb.** V orodju so predloge pogodb med kreativcem in njegovo
stranko, s privzetimi vrednostmi (obseg pravic, rok, avans). Kakšna je moja
odgovornost za vsebino teh predlog?

**13. Arbitraža za ZDA.** V pogojih (točka 11d) imam določbo o zavezujoči
arbitraži in odpovedi skupinski tožbi. Prevzela sem jo po zgledu ameriških
storitev. Naj jo obdržim ali umaknem, dokler ZDA niso moj trg?

**14. Podobdelovalca, dodana 25. 8. 2026.** Politika in pogoji zdaj navajata
Google Sheets (vanj se zapišejo povpraševanja s kontaktnega obrazca: ime,
e-naslov in sporočilo) in Cloudflare (dohodna pošta na @pinartflow.com). Prej ju
nista. Je opis zadosten in ali moram obvestiti tiste, ki so obrazec izpolnili
prej? *(Glej tudi vprašanje 31.)*

**15. Prijava na obveščanje.** Uporabljam dvojno privolitev: prijava se zapiše
kot nepotrjena, potrditveno pisemce gre po e-pošti, seznam nastane šele ob
kliku, nepotrjene prijave se po 14 dneh izbrišejo, odjava zapis izbriše. Zapišem
čas, vir in različico pogojev; IP-naslova ne hranim. Zadošča kot dokaz
privolitve po členu 7(1)? *(Od 3. 9. ima vsako pisemce tudi povezavo za
odjavo z enim klikom po RFC 8058.)*

**16. Brezplačni kalkulator.** Ker deluje brez računa in se pri meni ne shrani
nič razen anonimne cenovne vrstice, obiskovalcu ob vstopu pokažem kratko
kartico s tremi bistvenimi točkami in povezavama na pogoje in zasebnost, celotne
pogoje s potrditvijo pa šele ob prvem izvozu ali pošiljanju. Je tak dvostopenjski
pristop v redu ali potrebujem ločene, krajše pogoje samo za kalkulator?

**17. Odstavki za funkcije, ki še ne delujejo.** Nekaj določb (plačljivi trezor,
naročnina, arbitraža) je pisanih vnaprej. Je bolje imeti jih zapisane in
neuporabljene ali jih dodati šele, ko funkcija zaživi?

**18. Zaklenjene opombe (načrtujem).** Uporabniki mi po e-pošti pošiljajo tudi
gesla in dostope svojih strank. Namesto navadnega besedilnega polja načrtujem
opombe, šifrirane v brskalniku z geslom, ki ga pozna samo uporabnik: v mojo
bazo pride le šifrat, jaz vsebine ne morem prebrati niti obnoviti, pozabljeno
geslo pomeni trajno izgubo. Vprašanja: ali tako šifriranje spremeni moje
obveznosti po 32. členu in ob morebitni kršitvi; ali za hrambo poverilnic
tretjih oseb potrebujem še kaj v pogojih; in ali smem zapisati, da vsebine
"niti mi ne moremo prebrati"?

## Pravice uporabe v kalkulatorju (dodano 26. 8. 2026)

Ta sklop je nastal po tem, ko sem gradivo prvič poslala. Gre za osrednji del
orodja: ob ponudbi izvajalka določi, v kakšnem obsegu sme naročnik delo
uporabljati, orodje pa za to predlaga znesek. Prav tu se mi zdi tveganje
največje, ker gre za prenos pravic in ne le za ceno.

**19. Postavitev proti oblikovanju.** V orodju trdim, da postavitev spletne
strani po kupljeni predlogi ni avtorsko delo in da zato zanjo ni prenosa
pravic; avtorsko delo je oblikovanje, ki ga izvajalka ustvari sama. Ali to
drži? Zanima me predvsem, kje je meja: koliko prilagoditve tuje predloge
(barve, tipografija, postavitev sekcij, lastne komponente) že ustvari novo
avtorsko delo, in kako naj to zapišem, da ne obljubljam nečesa, kar ni moje.

**20. Pravice, vključene v ceno izvedbe.** Izvajalka lahko izbere, da so pravice
uporabe zajete v ceni oblikovanja in se ne zaračunajo posebej. Ali mora biti
obseg (teritorij, mediji, doba, izključnost) tudi v tem primeru izrecno
zapisan, da je prenos veljaven? Bojim se položaja, ko se izvajalka odloči za
»vključeno v ceno«, misli pa, da je s tem obseg samoumevno neomejen.

**21. Kaj pomeni molk.** Privzeto pravilo v orodju je, da neodgovorjeno
vprašanje ne pomeni dovoljenja: če obseg ni dogovorjen, se ne šteje za
dovoljeno uporabo, ampak za nedogovorjeno. Vsako vprašanje ima izrecno izbiro
»Še ni dogovorjeno«. Ali je taka razlaga skladna z zakonom in kako naj bo
zapisana v ponudbi, da drži tudi ob sporu?

**22. Ali ponudba zadošča pisni obliki.** Prenos materialnih avtorskih pravic
mora biti pisen. V praksi izvajalka pošlje PDF ponudbo, v kateri so pogoji
uporabe izpisani pri vsaki storitvi, naročnik pa jo potrdi po elektronski
pošti ali s klikom. Ali to zadošča, ali je za veljaven prenos nujna ločena
podpisana pogodba? Če zadošča, kaj mora ponudba nujno vsebovati?

**23. Tuja gradiva v izdelku.** V delo pogosto vstopijo predloge, pisave,
fotografije in vtičniki drugih avtorjev. V orodju jih ločujem od avtorskih
pravic izvajalke in jih imenujem licence. Kaj mora ponudba povedati, da
odgovornost za njihove licence nosi naročnik in ne izvajalka, in kaj se zgodi,
če izvajalka licenco kupi na svoje ime, izdelek pa uporablja naročnik?

**24. Logotip in znamka.** Prenos avtorskih pravic na logotipu ni registracija
znamke. Ali naj pogodba to izrecno loči, kdo nosi stroške registracije in ali
mora izvajalka naročnika na to opozoriti? Zanima me tudi, ali je za oblikovalko
kakšno tveganje, če naročnik logotip registrira kot znamko, izvajalka pa
podobno rešitev pozneje uporabi pri drugem naročniku.

**25. Časovno omejene licence.** Pri kampanjah in oglasnih materialih orodje
privzeto predlaga licenco za obdobje (na primer tri mesece). Kaj se zgodi, če
naročnik gradivo uporablja po izteku: je to kršitev pogodbe ali avtorske
pravice, in katero določbo naj vključim, da je posledica jasna vnaprej?

**26. Tantieme pri prodajnih produktih.** Pri izdelkih za prodajo orodje
namesto enkratnega odkupa predlaga honorar in tantieme od prodaje, s predujmom
kot minimalno garancijo, vračilom pravic ob prekinitvi in letnim poročanjem o
prodaji. Ali so take določbe v Sloveniji uveljavljive in kaj mora pogodba
vsebovati, da je poročanje izvršljivo?

**27. Poimenovanje v orodju.** V vmesniku uporabljam izraz »pravice uporabe
(avtorske pravice)« za delo izvajalke in »licenca« za tuja gradiva, ker je
uporabnicam razumljivejši; v pogodbi pa piše »materialne avtorske pravice«.
Ali je tako dvojno poimenovanje sprejemljivo, dokler je pogodbeno besedilo
pravno pravilno?

**28. Predlagani zneski.** Orodje predlaga ceno pravic na podlagi obsega
uporabe in podatkov o naročniku, izvajalka pa jo lahko kadar koli spremeni.
Ob predlogu piše, da gre za priporočilo in ne za pravni nasvet. Je tak zapis
dovolj, ali naj bo opozorilo tudi v sami ponudbi, ki jo prejme naročnik?

## Kar je nastalo po 25. 8. 2026

**29. Vprašalnik o cenah (javna stran, od 3. 9.).** Na
`www.pinartflow.com/vprasalnik` kreativci iz sedmih panog odgovarjajo na do 42
vprašanj o svojih dejanskih cenah (kolikšen je honorar za logotip, dan
fotografiranja, mesečno vodenje omrežja ipd.). Odgovarjati je mogoče
anonimno; ime in e-naslov sta neobvezna in se shranita samo, če oseba
označi kljukico soglasja (vnaprej ni označena) z besedilom: *»Strinjam se, da
ime in e-pošto uporabite za zahvalo in pošiljanje rezultatov, v skladu s
politiko zasebnosti.«* Odgovori se shranijo v mojo bazo (Supabase, EU), o
vsakem novem odgovoru dobim e-pošto. Anketiranec ob koncu vidi, ali je njegova
ključna cena nad, pod ali znotraj razpona iz javno objavljenih cenikov v
Sloveniji (imen virov ne objavljam). Iz odgovorov izpeljem razmerja med
izbirami (uteži v kalkulatorju); zneskov ne objavim in jih ne posredujem.
Strani iskalniki ne indeksirajo. Vprašanja:

- (a) Cene samostojnega podjetnika so, kadar je oseba določljiva, osebni
  podatek. Je za anonimne odgovore sploh potrebna podlaga, za podpisane pa
  privolitev — ali zadošča zakoniti interes (razvoj orodja)?
- (b) Hramba: predlagam, da se ime in e-naslov izbrišeta 12 mesecev po
  odgovoru, odgovori pa ostanejo anonimni. Je to razumno?
- (c) Je besedilo soglasja zgoraj ustrezno?
- (d) Je primerjava »nad/pod tem, kar drugi običajno zaračunajo« tvegana
  trditev, čeprav temelji na javnih cenikih in ne imenuje nikogar?
- (e) Politika zasebnosti vprašalnika še ne omenja. Predlagam nov odstavek v
  točki 2 in 5a; prosim za popravek.

**30. Vprašalniki uporabnikov za njihove stranke (od 31. 8.).** Uporabnik v
Flowu sestavi vprašalnik (na primer brief za novo spletno stran), pošlje
povezavo svoji stranki, ta odgovori na javni strani brez prijave, odgovori se
shranijo pri projektu, uporabnik dobi obvestilo. Javna stran nosi ime in
znamko uporabnika. Po mojem razumevanju je uporabnik upravljavec, jaz
obdelovalec (točka 4g). Vprašanja: ali mora javna stran kazati obvestilo o
zasebnosti in v čigavem imenu; kaj mora vsebovati; ali 4g potrebuje dodatek o
podatkih, ki jih vnesejo tretje osebe (stranke uporabnika), in ne uporabnik
sam.

**31. Povpraševanja se hranijo tudi pri meni (od 3. 9.).** Kontaktni obrazec
na predstavitvenih straneh (ime, e-naslov, podjetje, sporočilo, okvirni
proračun in termin) se od 3. 9. najprej zapiše v mojo bazo (Supabase, EU) in
šele nato posreduje v Google Sheets, ker se je prej ob napaki povezave
povpraševanje izgubilo. Politika (5a) omenja samo Google Sheets. Predlagam
hrambo 24 mesecev od zadnjega stika. Prosim za ustrezen zapis.

**32. Preverjanje stranke: bonitetni podatki iz AJPES (od 28. 8.).** Poleg
iskalnika (vprašanje 5) plačljivi paketi ponujajo vpogled v letno poročilo
podjetja, ki ga uporabnik preverja: prihodki, dobiček ali izguba in ali ima
podjetje blokiran račun. Podatke pridobim iz AJPES
(storitev proFi/Po, z mojimi portalnimi poverilnicami, plačilo na poizvedbo)
in jih uporabniku prikažem ob ceni, z mesečno kvoto poizvedb na naročnika.
Vprašanja: (a) kaj mi pogoji AJPES dovolijo pri prikazu teh podatkov
uporabnikom in ali moram navesti vir; (b) pri samostojnih podjetnikih so to
osebni podatki — zadošča zakoniti interes uporabnika (preverjanje plačilne
sposobnosti stranke) in kaj moram zapisati; (c) smem pridobljene podatke
predpomniti in koliko časa, da ne plačam iste poizvedbe dvakrat; (d) kako
zapisati, da prikaz ni bonitetna ocena ali nasvet.

**33. Davčna blagajna: zgrajena, izklopljena (2. 9.).** Modul za izdajo
računov z gotovino ali kartico, davčno potrjevanje pri FURS (ZOI, EOR, QR-koda),
storno in nastavitve poslovnih prostorov je v orodju zgrajen, a
**izklopljen** (uporabnik ga vidi, ne more ga uporabiti). Vklop načrtujem po
zagonu z zunanjim izvajalcem, ki bo del za FURS poganjal na ločenem strežniku.
Uporabnikovo namensko digitalno potrdilo FURS se hrani šifrirano; ključ ni v
bazi. Vprašanja: (a) dokler je izklopljen, ostane besedilo iz vprašanja 1 —
kako naj se glasi, ko se vklopi (uporabnik ostane zavezanec, Flow je programska
oprema; katere obveznosti ima proizvajalec programske opreme po ZDavPR, na
primer izjava o skladnosti); (b) hramba uporabnikovega potrdila v mojem
sistemu in pri zunanjem izvajalcu (32. člen GDPR, pogodba o obdelavi z
izvajalcem); (c) račun bi kupcu privzeto izročili elektronsko (QR-koda na
zaslonu, SMS ali e-pošta), tiskanje kot možnost — prosim za potrditev, da to
ustreza ZDavPR-B (»v elektronski ali papirni obliki«).

**34. Pravice v ponudbi in pogodbi: konkretni stavki (4. 9.).** Navezuje se na
vprašanja 20 do 22. Pri vsaki storitvi ima izvajalka tri možnosti in dokument
zdaj pri vsaki izpiše svoj stavek:

- ločena postavka: *»pravice uporabe za [obseg] ([vrsta prenosa], [trajanje])
  so ločena postavka: [znesek]«*;
- vključeno v ceno: *»pravice uporabe za [obseg] ([vrsta], [trajanje]) so
  vključene v ceno storitve«*;
- neoznačeno: *»naročnik pridobi pravico uporabe dela za dogovorjeni namen
  brez ločenega doplačila; širša ali izključna uporaba se dogovori posebej«*.

Člen o avtorskih pravicah v pogodbi dobi dodatek: *»Kjer ponudba pravic ne
navaja posebej, naročnik pridobi pravico uporabe dela za dogovorjeni namen
brez ločenega doplačila; širša ali izključna uporaba se dogovori posebej.
Moralne avtorske pravice ostanejo avtorju.«* Prosim za pregled formulacij:
so pravno zadostne, in je tretja (neoznačeno) v skladu s pravilom iz
vprašanja 21, da molk ni neomejeno dovoljenje?

**35. Ekipe (zgrajeno, v zaprti beti).** Uporabnik ustvari organizacijo,
povabi sodelavce po e-pošti, določa vloge (lastnik, član), lahko prenese
lastništvo; brezplačni paket ima 3 sedeže, Pro 25. Povabljeni sodelavec vidi
podatke organizacije (stranke, projekte, dokumente) in vanje vnaša svoje.
Vprašanja: kdo je upravljavec za podatke, ki jih vnese sodelavec (organizacija
kot podjetje uporabnika?); kaj mora v pogoje (nova točka 4h); kaj se zgodi z
vnosi člana, ko ga lastnik odstrani; vabilo vsebuje e-naslov vabljene osebe
pred njenim sprejemom — koliko časa ga smem hraniti, če vabila ne sprejme.

**36. Evidenca delovnega časa (od 30. 8.).** Uporabnik (in člani njegove
ekipe) beležijo prihod, malico in odhod s štoparico; nastane mesečna tabela s
seštevki in izvoz CSV. Namen je evidenca po ZEPDSV. Vprašanja: kaj mora orodje
zagotoviti, da se evidenca šteje za ustrezno (nespremenljivost oziroma
revizijska sled popravkov, seznanitev delavca, hramba); ali moram izrecno
zapisati, da je za pravilnost in hrambo odgovoren delodajalec; kako dolgo
morajo biti podatki dosegljivi po prenehanju naročnine.

**37. PostHog in snemanje sej (od 31. 8.).** Na predstavitvenih straneh (ne
v aplikaciji in ne v kalkulatorju) po privolitvi tečejo toplotne karte,
posnetki sej in lijaki (PostHog, EU oblak, Frankfurt); vsebina vpisnih polj je v
posnetkih zakrita. Privolitveni pas ponuja funkcionalne in analitične
piškotke; PostHog spada med analitične skupaj z Google Analytics. Vprašanja:
ali snemanje sej sme teči pod isto privolitvijo kot analitika ali potrebuje
svojo kategorijo; ali je opis v politiki (5a, 6, 8) zadosten.

**38. Cene: tri lestvice (odločeno 30. 8.).** Ustanovna cena za prvih 50
(9 € na mesec), uvodna do 31. 10. 2026 (15 € oziroma 29 €) in redna (23 €
oziroma 48 €; ob letnem plačilu 18 € oziroma 35 € na mesec). Vse cene so
končne, z DDV, ker Stripe kot pooblaščeni ponudnik plačil obračuna DDV po
državi kupca. Obljuba: kdor je naročen, obdrži svojo ceno, dokler naročnina
neprekinjeno traja. Vprašanja: kako to zapisati v točko 2a, da je zaveza
izpolnljiva (vprašanje 11); ali je sklic »končna cena z DDV« pravilen, ko
kupec ni potrošnik in DDV odbija.

---

## Kam grem naprej

Da vam ni treba istega besedila pregledovati večkrat, na kratko še načrti za
naslednje leto. Zanima me le, ali je pri kateri od teh smeri kaj takega, kar
moram vedeti že zdaj: ali gre za regulirano dejavnost in ali bo treba pogoje
bistveno predelati.

- **vklop davčne blagajne** (vprašanje 33) in prodajno mesto s plačilom na
  telefon (Stripe Tap to Pay, v Sloveniji v predogledu),
- **povezava z banko** (odprto bančništvo, PSD2), da uporabnik vidi plačila in
  označi račun kot plačan. Ali s tem postanem plačilni posrednik?
- **kvalificirani časovni žig** po eIDAS namesto sedanjega,
- **priklop uporabnikovega lastnega AI** in agenti, ki opravijo nalogo v
  njegovem imenu. Kdo odgovarja za izhod tujega modela?
- **povezava z Gmailom** prek OAuth (branje nabiralnika),
- **priporočila in donacije**, torej nagrada za povabljenega kolega,
- **tuji trgi**: najprej EU, nato ZDA, s plačili prek pooblaščenega ponudnika
  (Merchant of Record),
- **mobilna aplikacija** in naročnine prek trgovin,
- **anonimna cenovna statistika** kot javno dostopen ali plačljiv pregled trga.

## Še nekaj, kar ni pravno vprašanje

V orodju imam gumb, prek katerega se uporabnik lahko odloči za pravno pomoč,
kadar želi pogodbo pregledati ali napisati bolj profesionalno. Iščem odvetnika
ali pisarno, na katero bom lahko naslovila take stranke. Če koga poznate in bi
ga to zanimalo, bom hvaležna za povezavo.

# Vprašanja za odvetnika — prikaz tržnega okvira cen

**Pripravljeno:** 28. 8. 2026
**Stanje:** funkcija je izdelana in deluje; pred objavo javnosti čakamo vaše mnenje
**Za:** drugi krog vprašanj, po paketu, poslanem 25. 8. 2026
**Priloga:** `docs/TRZNI-OKVIR-METODOLOGIJA.md` (kako podatke zbiramo)

## Kaj smo naredili

Pinart Flow ob izračunani ceni prikaže **tržni okvir** — razpon cen za isto
vrsto storitve, zbran iz javno objavljenih cenikov drugih ponudnikov. Ob razponu
piše število virov in datum preverjanja. Uporabnica lahko odpre podrobnosti
(mediana, obseg, stopnja zaupanja v podatek).

Podatki so zbrani ročno iz javno dostopnih cenikov (86 zapisov, 19 storitev),
vsak s povezavo na izvirnik. Ne uporabljamo samodejnega pobiranja vsebine.

**Kaj smo se že sami odločili (in izvedli):**

1. Imen ponudnikov in njihovih posameznih cen **ne prikazujemo**. Uporabnica vidi
   samo razpon, število virov in datum preverjanja. Imena ostanejo v internem
   dokumentu; posredujemo jih na zahtevo.
2. Imena tudi tehnično ne pridejo v brskalnik — v odjemalca gredo samo števila,
   da skritih podatkov ne bi bilo mogoče najti v kodi strani.
3. Izraza »priporočena cena« ne uporabljamo nikjer. Povsod piše **»tržni okvir«**,
   ob številki pa stoji: »Tržni okvir je orientacija, ne priporočena cena.«
4. Kjer raziskava poštenega razpona ne dopušča, ne prikažemo ničesar.

Spodnja vprašanja zato sprašujejo, ali je to dovolj, in ne, ali smemo začeti.

## Vprašanja

### 1. Navajanje tujih cen v komercialnem orodju

Ali smemo v plačljivem orodju prikazati ceno, ki jo je ponudnik javno objavil na
svoji strani, skupaj z navedbo vira in povezavo nanj?

Naše razumevanje je, da je cena dejstvo in ne avtorsko delo, ter da navedba z
virom ne posega v ZASP. Prosimo za potrditev ali popravek.

### 2. Ali je prikaz brez imen dovolj

Odločili smo se, da prikažemo **samo razpon in število virov** (npr.
»590–1.500 €, 6 preverjenih virov«), imen ponudnikov pa ne.

- Ali s tem vprašanje navajanja tujih cen odpade v celoti?
- Ali moramo kljub temu hraniti evidenco virov za primer spora? (Hranimo jo.)
- Je taka oblika ustrezna tudi z vidika poslovne korektnosti do konkurentov na
  majhnem trgu?

### 3. Pravica izdelovalca podatkovne baze

Del podatkov izvira iz **agregatorjev** (npr. omisli.si), ki objavljajo lastne
izračunane mediane iz zbranih ponudb. Gre za tuji izdelek, ne za surovo dejstvo.

Ali uporaba njihove izračunane mediane pomeni poseg v pravico izdelovalca
podatkovne baze (Direktiva 96/9/ES, ZASP)? Ali zadošča navedba vira, ali se je
takim virom bolje izogniti in razpon graditi le iz neposrednih cenikov?

### 4. Reproducirani cenik stanovskega društva

En vir je **reprodukcija cenika PRSS** (Slovensko društvo za odnose z
javnostmi), objavljena na tuji spletni strani, ne pri društvu samem.

Ali ga smemo uporabiti kot vir? Ali je potrebno soglasje društva?

### 5. Konkurenčno pravo — najpomembnejše vprašanje

Orodje bo isto številko prikazovalo **mnogim konkurenčnim ponudnikom na istem
trgu**. Priporočeni ceniki stanovskih združenj so v EU že bili predmet
postopkov zaradi usklajevanja cen.

- Ali obstaja tveganje, da bi se prikaz tržnega okvira razumel kot **omogočanje
  usklajevanja cen** med konkurenti?
- Izraza »priporočena cena« nikjer ne uporabljamo in dosledno govorimo o
  »tržnem okviru« oziroma opisu stanja. Ali je to zadostno razlikovanje?
- Bi bilo varneje razpon prikazati **le uporabnici za njeno lastno odločitev**,
  brez možnosti izvoza ali deljenja?
- Ali na presojo vpliva, da bo pozneje razpon temeljil na **anonimiziranih
  podatkih iz uporabe Flowa** (torej na cenah samih uporabnikov)?

To vprašanje se nam zdi resnejše od avtorskopravnega in prosimo za posebno
pozornost.

### 6. Odgovornost za pravilnost

Uporabnica lahko po tej številki postavi ceno in posla ne dobi — ali pa
zaračuna premalo.

- Kakšna izjava o omejitvi odgovornosti je potrebna in kje mora stati?
- Zadošča besedilo »tržni okvir je orientacija, ne priporočena cena«?
- Ali moramo hraniti dokazilo, kdaj je bil podatek preverjen? (Datum
  preverjanja že hranimo in ga prikazujemo.)

### 7. Zahteva ponudnika za umik

Predvidevamo, da ponudnika na njegovo zahtevo umaknemo iz virov brez
pojasnjevanja.

Ali je taka obljuba pravno smiselna, ali si z njo nakopljemo obveznost, ki je
ne bomo mogli izpolniti (npr. če je isti podatek že v izračunanem razponu)?

### 8. Lastni podatki v prihodnje

Načrtujemo, da bo razpon nekoč temeljil na anonimiziranih ponudbah uporabnikov
Flowa.

- Kaj mora pisati v pogojih uporabe, da smemo te podatke združevati in
  prikazovati drugim uporabnikom?
- Kje je meja anonimizacije, da ne gre več za osebne podatke oziroma poslovno
  skrivnost naročnika? (Npr. najmanjše število ponudb v skupini, preden se
  povprečje sploh pokaže.)

# Pinart Flow: vprašanja za pravni pregled

**Različica 2, 26. 8. 2026.** Prva različica je bila poslana 25. 8. 2026 in je
imela 17 vprašanj. V tej so dodana vprašanja 18 do 27 o pravicah uporabe v
kalkulatorju (svoje poglavje pred razdelkom »Kam grem naprej«); prvih 17
vprašanj je nespremenjenih.

Sem Tina Zaletel, oblikovalka. Zadnje leto sem naredila **Pinart Flow**, spletno orodje za samostojne kreativce in male studie. V njem pripravijo
ponudbo, pogodbo in račun, vodijo projekte in stranke ter hranijo dokumente.
Del orodja je brezplačni kalkulator cen, ki deluje brez registracije.

Pogoje uporabe in politiko zasebnosti sem **napisala sama, brez pravne pomoči**. Objavljena sta in v uporabi; obe besedili prilagam, na strani sta na
`www.pinartflow.com/kalkulator/pogoji` in `www.pinartflow.com/zasebnost`.

Zagon načrtujem v začetku septembra 2026. Najbolj me zanima **kaj moram popraviti pred tem in kaj lahko počaka**. Spodaj so vprašanja, ki me najbolj težijo. Na koncu je še kratek seznam tega, kar načrtujem, da mi ni treba priti
k vam vsak mesec posebej.

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
jo zapišem, da jo lahko izpolnim?

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
prej?

**15. Prijava na obveščanje.** Uporabljam dvojno privolitev: prijava se zapiše
kot nepotrjena, potrditveno pisemce gre po e-pošti, seznam nastane šele ob
kliku, nepotrjene prijave se po 14 dneh izbrišejo, odjava zapis izbriše. Zapišem
čas, vir in različico pogojev; IP-naslova ne hranim. Zadošča kot dokaz
privolitve po členu 7(1)?

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

## Pravice uporabe v kalkulatorju (dopolnjeno 26. 8. 2026)

Ta sklop je nastal po tem, ko sem gradivo prvič poslala. Gre za osrednji del
orodja: ob ponudbi izvajalka določi, v kakšnem obsegu sme naročnik delo
uporabljati, orodje pa za to predlaga znesek. Prav tu se mi zdi tveganje
največje, ker gre za prenos pravic in ne le za ceno.

**18. Postavitev proti oblikovanju.** V orodju trdim, da postavitev spletne
strani po kupljeni predlogi ni avtorsko delo in da zato zanjo ni prenosa
pravic; avtorsko delo je oblikovanje, ki ga izvajalka ustvari sama. Ali to
drži? Zanima me predvsem, kje je meja: koliko prilagoditve tuje predloge
(barve, tipografija, postavitev sekcij, lastne komponente) že ustvari novo
avtorsko delo, in kako naj to zapišem, da ne obljubljam nečesa, kar ni moje.

**19. Pravice, vključene v ceno izvedbe.** Izvajalka lahko izbere, da so pravice
uporabe zajete v ceni oblikovanja in se ne zaračunajo posebej. Ali mora biti
obseg (teritorij, mediji, doba, izključnost) tudi v tem primeru izrecno
zapisan, da je prenos veljaven? Bojim se položaja, ko se izvajalka odloči za
»vključeno v ceno«, misli pa, da je s tem obseg samoumevno neomejen.

**20. Kaj pomeni molk.** Privzeto pravilo v orodju je, da neodgovorjeno
vprašanje ne pomeni dovoljenja: če obseg ni dogovorjen, se ne šteje za
dovoljeno uporabo, ampak za nedogovorjeno. Vsako vprašanje ima izrecno izbiro
»Še ni dogovorjeno«. Ali je taka razlaga skladna z zakonom in kako naj bo
zapisana v ponudbi, da drži tudi ob sporu?

**21. Ali ponudba zadošča pisni obliki.** Prenos materialnih avtorskih pravic
mora biti pisen. V praksi izvajalka pošlje PDF ponudbo, v kateri so pogoji
uporabe izpisani pri vsaki storitvi, naročnik pa jo potrdi po elektronski
pošti ali s klikom. Ali to zadošča, ali je za veljaven prenos nujna ločena
podpisana pogodba? Če zadošča, kaj mora ponudba nujno vsebovati?

**22. Tuja gradiva v izdelku.** V delo pogosto vstopijo predloge, pisave,
fotografije in vtičniki drugih avtorjev. V orodju jih ločujem od avtorskih
pravic izvajalke in jih imenujem licence. Kaj mora ponudba povedati, da
odgovornost za njihove licence nosi naročnik in ne izvajalka, in kaj se zgodi,
če izvajalka licenco kupi na svoje ime, izdelek pa uporablja naročnik?

**23. Logotip in znamka.** Prenos avtorskih pravic na logotipu ni registracija
znamke. Ali naj pogodba to izrecno loči, kdo nosi stroške registracije in ali
mora izvajalka naročnika na to opozoriti? Zanima me tudi, ali je za oblikovalko
kakšno tveganje, če naročnik logotip registrira kot znamko, izvajalka pa
podobno rešitev pozneje uporabi pri drugem naročniku.

**24. Časovno omejene licence.** Pri kampanjah in oglasnih materialih orodje
privzeto predlaga licenco za obdobje (na primer tri mesece). Kaj se zgodi, če
naročnik gradivo uporablja po izteku: je to kršitev pogodbe ali avtorske
pravice, in katero določbo naj vključim, da je posledica jasna vnaprej?

**25. Tantieme pri prodajnih produktih.** Pri izdelkih za prodajo orodje
namesto enkratnega odkupa predlaga honorar in tantieme od prodaje, s predujmom
kot minimalno garancijo, vračilom pravic ob prekinitvi in letnim poročanjem o
prodaji. Ali so take določbe v Sloveniji uveljavljive in kaj mora pogodba
vsebovati, da je poročanje izvršljivo?

**26. Poimenovanje v orodju.** V vmesniku uporabljam izraz »pravice uporabe
(avtorske pravice)« za delo izvajalke in »licenca« za tuja gradiva, ker je
uporabnicam razumljivejši; v pogodbi pa piše »materialne avtorske pravice«.
Ali je tako dvojno poimenovanje sprejemljivo, dokler je pogodbeno besedilo
pravno pravilno?

**27. Predlagani zneski.** Orodje predlaga ceno pravic na podlagi obsega
uporabe in podatkov o naročniku, izvajalka pa jo lahko kadar koli spremeni.
Ob predlogu piše, da gre za priporočilo in ne za pravni nasvet. Je tak zapis
dovolj, ali naj bo opozorilo tudi v sami ponudbi, ki jo prejme naročnik?

---

## Kam grem naprej

Da vam ni treba istega besedila pregledovati večkrat, na kratko še načrti za
naslednje leto. Zanima me le, ali je pri kateri od teh smeri kaj
takega, kar moram vedeti že zdaj: ali gre za regulirano dejavnost in ali bo treba pogoje
bistveno predelati.

- **davčna blagajna in potrjevanje pri FURS**, vključno s prodajnim mestom. Vem,
  da je to najbolj regulirano od vsega.
- **povezava z banko** (odprto bančništvo, PSD2), da uporabnik vidi plačila in
  označi račun kot plačan. Ali s tem postanem plačilni posrednik?
- **kvalificirani časovni žig** po eIDAS namesto sedanjega
- **ekipe in sodelavci**: kdo je upravljavec, ko podatke vnese povabljeni
  sodelavec?
- **priklop uporabnikovega lastnega AI** in agenti, ki opravijo nalogo v
  njegovem imenu. Kdo odgovarja za izhod tujega modela?
- **povezava z Gmailom** prek OAuth (branje nabiralnika)
- **priporočila in donacije**, torej nagrada za povabljenega kolega
- **tuji trgi**: najprej EU, nato ZDA, s plačili prek pooblaščenega ponudnika
  (Merchant of Record)
- **mobilna aplikacija** in naročnine prek trgovin
- **anonimna cenovna statistika** kot javno dostopen ali plačljiv pregled trga

## Še nekaj, kar ni pravno vprašanje

V orodju imam gumb, prek katerega se uporabnik lahko odloči za pravno pomoč,
kadar želi pogodbo pregledati ali napisati bolj profesionalno. Iščem odvetnika
ali pisarno, na katero bom lahko naslovila take stranke. Če koga poznate in bi
ga to zanimalo, bom hvaležna za povezavo.

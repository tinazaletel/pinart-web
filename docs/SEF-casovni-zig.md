# Sef avtorstva — overjen časovni žig (RFC 3161)

## Zakaj sploh

Sef zna izračunati **zgostitev** (SHA-256 »prstni odtis«) datoteke. To dokaže,
da je neka datoteka točno tista datoteka. Ne dokaže pa, **kdaj** je obstajala —
datum je do zdaj postavil Flow, torej mi. Nasprotna stran v sporu lahko
upravičeno reče: »Datum ste si izmislili, saj je vaša baza.«

Overjen časovni žig to reši. Zgostitev pošljemo **neodvisnemu strežniku**
(Time-Stamp Authority, TSA). Ta vrne **podpisan žeton**, v katerem sta zapisana
zgostitev in čas, podpisana z njegovim certifikatom. Žetona ni mogoče
ponarediti ali predatirati brez zasebnega ključa TSA — in preveri ga lahko
kdorkoli, tudi brez Flowa.

Kar žig dokaže: **ta zgostitev je obstajala najkasneje ob tem času.**
Kar žig NE dokaže: da si delo ustvarila ti. Za avtorstvo še vedno štejejo
izvorne datoteke, sloji, delovna zgodovina in priče.

## Kaj gre navzven — in kaj nikoli

Navzven gre **samo 32 bajtov zgostitve**. Nič drugega:

- ne datoteka,
- ne ime datoteke,
- ne naslov dela, kategorija ali opombe,
- ne ime stranke,
- ne id organizacije ali uporabnika.

To ni le varnostna omejitev, ampak bistvo funkcije: TSA potrdi **čas**, ne izve
pa, **kaj** je bilo žigosano. Iz zgostitve vsebine ni mogoče izračunati nazaj.

Edini klic navzven je v `app/api/sef/zig/route.ts` (poimenovan v komentarju).
Če bo kdo kdaj hotel v ta klic dodati še ime dela ali stranke, to ni izboljšava
— to je razkritje.

## Kako je narejeno

| Del | Datoteka |
| --- | --- |
| Sestavljanje zahteve, branje in preverjanje žetona | `lib/casovniZig.ts` |
| API pot (pridobi/preveri žig) | `app/api/sef/zig/route.ts` |
| Odjemalec (shrani zapis v oblak, sproži žig) | `lib/sefOblak.ts` |
| Vmesnik | `components/SefAvtorstvaWorkspace.tsx` |
| Baza | `supabase/migrations/20260821000000_sef_casovni_zig.sql` |

Potek:

1. Brskalnik izračuna SHA-256 datoteke (datoteka **ostane** pri uporabnici).
2. Zapis se shrani v `public.sef_zapisi` (zgostitev, naslov, orodje …).
3. Strežnik sestavi `TimeStampReq` (DER) iz zgostitve, doda naključni *nonce* in
   `certReq = true` (da TSA v žeton vloži svoj certifikat).
4. `POST` na TSA z `Content-Type: application/timestamp-query`.
5. Odgovor (`application/timestamp-reply`) se v celoti shrani kot base64 v
   `sef_zapisi.zig_zeton`; čas iz žetona gre v `zig_cas`, naslov TSA v
   `zig_streznik`, stanje v `zig_stanje` (`caka` / `overjeno` / `napaka`).
6. Pred shranjevanjem strežnik preveri, da se **zgostitev v žetonu ujema** s
   poslano in da se ujema **nonce** (sicer bi nam kdo lahko podtaknil star žeton).

Žeton se **nikoli ne prepiše**. Če zapis že ima žig, ga nov poskus ne zamenja —
poznejši čas bi dokaz oslabil, ne okrepil.

### Strežnik

Nastavljiv prek spremenljivke okolja `TSA_URL`. Privzeto
`https://freetsa.org/tsr` (brezplačna javna TSA, podpira SHA-256, certifikate
objavlja na `https://freetsa.org/files/`). Sprejmemo samo `https` naslove — žig,
ki bi ga kdo lahko po poti zamenjal, ni dokaz.

Zamenjava strežnika je samo sprememba `TSA_URL`; format žetona je standarden.

### Zakaj brez zunanje knjižnice

`TimeStampReq` je majhna ASN.1/DER struktura, branje odgovora pa sprehod po
nekaj ugnezdenih `SEQUENCE`-ih do `TSTInfo`. `pkijs` ali `node-forge` bi za to
prinesla veliko odvisnost. Enotni testi (`tests/unit/casovniZig.test.ts`)
primerjajo našo zahtevo **bajt za bajt** z zahtevo, ki jo ustvari
`openssl ts -query`, in berejo pravi odgovor prave (lokalno postavljene) TSA.

**Pošteno:** kriptografskega podpisa žetona v kodi **ne** preverjamo — za to je
potrebna veriga certifikatov TSA in pravi CMS preveritelj. Naša funkcija
`preveriZig()` prebere čas in preveri, da se zgostitev v žetonu ujema z
zapisom. Dokončno preverjanje podpisa opravi openssl (spodaj) — in prav to je
tudi tisto, kar bi v sporu naredil izvedenec.

## Kako žig preveri tretja oseba (brez Flowa)

V tabeli sefa ima vsak overjen zapis gumb za prenos žetona (`.tsr`).
Prejemniku pošlješ **tri stvari**: datoteko (ali njeno zgostitev), žeton `.tsr`
in podatek, katera TSA ga je izdala.

```bash
# 1) certifikata TSA (primer za FreeTSA — enkrat)
curl -O https://freetsa.org/files/cacert.pem
curl -O https://freetsa.org/files/tsa.crt

# 2) preverjanje neposredno iz datoteke
openssl ts -verify -in casovni-zig-Ilustracija_Pupa.tsr \
  -data delo.ai \
  -CAfile cacert.pem -untrusted tsa.crt

# ali, če ima prejemnik samo zgostitev (datoteke mu ni treba dati)
openssl ts -verify -in casovni-zig-Ilustracija_Pupa.tsr \
  -digest c94e654002d9efd7ffb71199f8289da490d10f0206db2759e74e136bc77632c4 \
  -CAfile cacert.pem -untrusted tsa.crt
```

Izpis `Verification: OK` pomeni: podpis TSA je veljaven **in** žeton se nanaša
točno na to datoteko. Ob spremenjeni datoteki openssl javi
`message imprint mismatch` in `Verification: FAILED`.

Čas iz žetona izpišeš z:

```bash
openssl ts -reply -in casovni-zig-Ilustracija_Pupa.tsr -text
```

(vrstica `Time stamp:`).

Različica `-digest` je pomembna zato, ker lahko dokažeš čas, **ne da bi delo
razkrila** — nasprotni strani ali sodišču daš samo zgostitev.

## Naslednja stopnja: kvalificiran (eIDAS) žig

To, kar je zdaj vgrajeno, je **napreden** elektronski časovni žig po RFC 3161.
V EU pravu je močnejša oblika **kvalificiran elektronski časovni žig** po uredbi
eIDAS (št. 910/2014, čl. 42): zanj velja **domneva točnosti** datuma in
celovitosti podatkov — nasprotna stran mora dokazovati, da žig ne drži, ne ti,
da drži.

Kaj bi bilo treba:

1. **Pogodba s kvalificiranim ponudnikom zaupanja** s seznama EU Trusted List
   (npr. slovenski SI-TRUST/Halcom, ali evropski ponudniki, kot so
   Sectigo/GlobalSign/DigiCert za kvalificirane storitve). Storitev je plačljiva
   — običajno na žig ali v paketih.
2. **Poverilnice** (ključ ali API dostop) v spremenljivkah okolja; nastaviti
   `TSA_URL` na kvalificirano končno točko in dodati avtentikacijo v
   `pridobiZig()` (zdaj klic nima glave `Authorization`).
3. **Hramba verige certifikatov in preklicnih seznamov** (CRL/OCSP) ob žetonu,
   da je žig preverljiv tudi, ko certifikat TSA poteče. Za dolgoročno veljavo
   obstaja standard **ETSI EN 319 422 / arhivski žig (LTA)** — praktično to
   pomeni, da žig čez nekaj let po potrebi »prežigosaš«.
4. **Zapis politike žiga** (policy OID) v potrdilo, da je razvidno, po katerih
   pravilih je bil izdan.

Do takrat je pošteno besedilo v vmesniku takšno, kot je: čas je potrdil
neodvisen strežnik in ga lahko preveri kdorkoli — kvalificiran žig je naslednja
stopnja, ne ta.

## Znane omejitve

- Zapis se žigosa šele, ko je uporabnica **prijavljena** in ima povezano
  podjetje. Brez tega sef še vedno dela lokalno, le čas ostane neoverjen
  (stanje `caka`, gumb »Overi čas« v tabeli).
- Brezplačna TSA nima zagotovljene razpoložljivosti. Če ne odgovori, zapis
  ostane shranjen s stanjem `napaka` in overitev je mogoče ponoviti.
- Podpis žetona preverja openssl, ne Flow (glej zgoraj).

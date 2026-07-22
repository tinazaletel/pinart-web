# Analitika Pinart Flow

Kaj se zbira, kaj se namenoma **ne** zbira, in kako se to prižge.

---

## 1. Kaj se zbira

Vse anonimno, brez povezave na določenega človeka.

| Vprašanje | Od kod pride |
|---|---|
| Kakšne cene vpisujejo za določeno storitev | tabela `cenovne_tocke` |
| Katere storitve največkrat vpisujejo | pogled `analitika_storitve` |
| Od kod so uporabniki | pogled `analitika_trgi` — trg, ki ga **sami izberejo** v kalkulatorju |
| Koliko je računov, koliko naročnin, koliko brezplačnih | pogled `analitika_racuni` |
| Koliko obiskov, koliko od tega nevpisanih | pogled `analitika_dnevno` |
| Koliko jih orodje odpre in koliko pride do cene | tabela `dogodki` |

## 2. Kaj se NE zbira

To je obljuba uporabnikom. Ne dodajaj brez zavestne odločitve:

- **zasebni dnevnik ur** (`private_time_entries`) — ostane samo v računu uporabnice
- vsebina ponudb, pogodb in računov; imena in podatki strank
- e-pošta, ime, telefon, **IP naslov**, natančna lokacija
- karkoli, kar bi cenovno točko povezalo z določeno osebo

Zato tudi »od kod so« temelji na samoprijavljenem trgu, ne na IP-ju. Manj natančno,
a pošteno — in to je ravno tisto, kar orodje prodaja.

Zaščita je vgrajena v kodo, ne samo v dogovor:

- `app/api/dogodek/route.ts` sprejme samo vnaprej našteta imena dogodkov, vrednosti pa
  skrči na število, `true/false` ali 40 znakov. Cel odstavek besedila ponudbe fizično ne gre skozi.
- `app/api/cene/route.ts` polja trdo našteje in tipizira.
- RLS je vklopljen brez politik za `anon` in `authenticated` → iz brskalnika ne more
  nihče ne brati ne pisati. Zapisuje in bere samo strežnik s service-role ključem.

## 3. Prižig — trije koraki

### a) Poženi migracijo

Supabase → SQL Editor → prilepi vsebino
`supabase/migrations/20260722040000_analitika.sql` → Run.

### b) Dodaj ključ

Supabase → Project Settings → API → **service_role** ključ (tisti z opozorilom
»secret«). Kopiraj ga.

- **Lokalno:** v `pinart-web/.env.local` dodaj vrstico
  `SUPABASE_SERVICE_ROLE_KEY=` in prilepi ključ za enačaj.
- **Vercel:** Settings → Environment Variables → Add.
  Key = `SUPABASE_SERVICE_ROLE_KEY`, Value = ključ.

> Ta ključ **ne sme** imeti predpone `NEXT_PUBLIC_`. Kar ima to predpono, se
> vgradi v datoteke, ki jih prenese brskalnik — service-role ključ tam pomeni
> odprt dostop do cele baze. Ključa tudi ne piši v klepet.

### c) Naredi nov build

Ne zadošča »Redeploy« s predpomnilnikom. Push sproži svež build.

### Preveri

Odpri `/kalkulator/admin`. Pod naslovom mora pisati število cenovnih točk brez
pripombe »vir: Google Sheet«. Če piše, da migracija ni pognana, se je zataknilo pri (a).

## 4. Kaj je z Google Sheetom

Ostane kot rezerva. Dokler je `GOOGLE_SHEETS_CENE_WEBHOOK_URL` nastavljen, se
cenovna točka zapiše v oboje. Ko bo Supabase nekaj tednov delal, se sme
spremenljivka odstraniti in Sheet ugasniti.

Opomba: ta webhook ni bil nikoli nastavljen, zato so cenovne točke od zagona
do danes izgubljene. Od te migracije naprej se shranjujejo.

## 5. Kje se beleženje kliče

`lib/analitika.ts` → `zabelezi()` ali `zabeleziSPaketom()` (slednja sama ugotovi,
ali je oseba vpisana in kateri paket ima).

Trenutno vgrajeno:

- `orodje_odprto` — ob odprtju kalkulatorja
- `cena_izracunana` — ob prihodu na korak »Tvoja cena«

Nova imena dogodkov je treba dodati v seznam `DOVOLJENA_IMENA` v
`app/api/dogodek/route.ts`, sicer jih strežnik zavrne. To je namerno: preprečuje,
da bi kdo (tudi jaz) mimogrede začel pošiljati nekaj, kar ne bi smel.

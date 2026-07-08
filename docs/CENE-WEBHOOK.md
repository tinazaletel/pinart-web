# Zbiranje anonimnih cen iz kalkulatorja (nastavitev, ~2 minuti)

Kalkulator ob koraku "Tvoja cena" anonimno poslje eno vrstico
(storitve, izkusnje, trga, raba, cena izvedbe, pravice, valuta)
na Google Sheets webhook. Brez imen, mailov ali IP-jev.

Dokler webhook ni nastavljen, se nic ne poslje in nic ne pokvari.

## 1. Ustvari Google Sheet

Nov Sheet (npr. "Pinart kalkulator — cene"), v prvo vrstico daj glave:

    submittedAt | storitve | izkusnje | mojTrg | trgNarocnika | raba | izvedbaEUR | praviceEUR | valuta | prilagojeno

(`prilagojeno` = ali je uporabnik cene rocno prilagodil (da) ali so privzete (ne)
 — pri branju daj vecjo tezo vrsticam z "da", so bolj realen signal.)

## 2. Apps Script webhook

V Sheetu: Razsiritve → Apps Script, prilepi:

```javascript
function doPost(e) {
  var d = JSON.parse(e.postData.contents);
  SpreadsheetApp.getActiveSpreadsheet().getSheets()[0].appendRow([
    d.submittedAt, d.storitve, d.izkusnje, d.mojTrg,
    d.trgNarocnika, d.raba, d.izvedbaEUR, d.praviceEUR, d.valuta, d.prilagojeno,
  ]);
  return ContentService.createTextOutput('ok');
}
```

Deploy → New deployment → Web app → Execute as: Me →
Who has access: **Anyone** → Deploy → kopiraj URL (konca se z /exec).

## 3. Vercel env

vercel.com → pinart-web → Settings → Environment Variables:

    GOOGLE_SHEETS_CENE_WEBHOOK_URL = <prilepljen URL>

## 3a. Bot-zascita (Turnstile, priporoceno pred javnim zagonom)

Nevidno preverjanje, ki ustavi surove POST-bote (brez kvadratka za uporabnika).
Aktivira se sele, ko sta vpisana kljuca — do takrat nic ne blokira.

1. cloudflare.com (brezplacen racun) → Turnstile → Add site → domena pinart.si →
   nacin **Managed** (ali Invisible). Dobis **Site Key** in **Secret Key**.
2. Vercel env:

       NEXT_PUBLIC_TURNSTILE_SITE_KEY = <Site Key>
       TURNSTILE_SECRET_KEY           = <Secret Key>

3. Redeploy. Od zdaj mora vsak zapis cez nevidno preverjanje; brez veljavnega
   zetona strezik vrne 403 in zapis ne pride v bazo.

Poleg tega strezik ze zdaj zavrne nemogoce zneske (izvedba pod 20 € ali nad
300.000 €) — absurdi ne pridejo v bazo, ne glede na Turnstile.

Redeploy. Konec.

## 4. Admin pregled zate (/kalkulator/admin)

Zascitena stran (geslo + noindex + nikjer linkana), ki namesto surovih
vrstic pokaze mediano/stevilo/razpon cen po storitvi × izkusnji × trgu
narocnika. Bere iz istega Sheeta prek novega `doGet` v istem Apps Scriptu.

1. V isti Apps Script (tam kjer je `doPost`) dodaj tudi `doGet` — zamenjaj
   `TVOJ-SKRIVNI-NIZ` s svojim dolgim nakljucnim nizom (isti kot spodaj v env):

```javascript
function doGet(e) {
  if (e.parameter.secret !== 'TVOJ-SKRIVNI-NIZ') {
    return ContentService.createTextOutput('forbidden');
  }
  var rows = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0].getDataRange().getValues();
  var header = rows[0];
  var data = rows.slice(1).map(function (r) {
    var o = {};
    header.forEach(function (h, i) { o[h] = r[i]; });
    return o;
  });
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
```

2. **Deploy → Manage deployments → uredi (svincnik) obstojeci deployment →
   Version: New version → Deploy.** (Samo shraniti kodo NI dovolj — brez
   tega koraka `doGet` ne bo zivel na ze kopirani /exec povezavi.)

3. Vercel env (dodaj poleg obstojecih):

       GOOGLE_SHEETS_CENE_READ_SECRET = <isti nakljucni niz kot v skripti>
       KALKULATOR_ADMIN_GESLO         = <tvoje admin geslo, sam izberi>

4. Redeploy strani. Pojdi na `pinart.si/kalkulator/admin`, vpisi
   `KALKULATOR_ADMIN_GESLO` — stran ni linkana nikjer (menu, sitemap),
   torej jo najde samo nekdo, ki pozna tocen naslov IN geslo.

## Cez pol leta

Sheet → filter/pivot: mediana `izvedbaEUR` po `storitve` × `izkusnje`
× `mojTrg` = pregled cen na trgu, ki ga nima nihce drug. Pri 200+
vrsticah se splaca podatke vrniti v orodje ("kreativci s tvojimi
izkusnjami racunajo X–Y"). Admin stran (§4) to zdaj ze pokaze sproti,
ni treba cakati na rocno filtriranje v Sheetu.

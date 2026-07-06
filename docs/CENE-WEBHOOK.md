# Zbiranje anonimnih cen iz kalkulatorja (nastavitev, ~2 minuti)

Kalkulator ob koraku "Tvoja cena" anonimno poslje eno vrstico
(storitve, izkusnje, trga, raba, cena izvedbe, pravice, valuta)
na Google Sheets webhook. Brez imen, mailov ali IP-jev.

Dokler webhook ni nastavljen, se nic ne poslje in nic ne pokvari.

## 1. Ustvari Google Sheet

Nov Sheet (npr. "Pinart kalkulator — cene"), v prvo vrstico daj glave:

    submittedAt | storitve | izkusnje | mojTrg | trgNarocnika | raba | izvedbaEUR | praviceEUR | valuta

## 2. Apps Script webhook

V Sheetu: Razsiritve → Apps Script, prilepi:

```javascript
function doPost(e) {
  var d = JSON.parse(e.postData.contents);
  SpreadsheetApp.getActiveSpreadsheet().getSheets()[0].appendRow([
    d.submittedAt, d.storitve, d.izkusnje, d.mojTrg,
    d.trgNarocnika, d.raba, d.izvedbaEUR, d.praviceEUR, d.valuta,
  ]);
  return ContentService.createTextOutput('ok');
}
```

Deploy → New deployment → Web app → Execute as: Me →
Who has access: **Anyone** → Deploy → kopiraj URL (konca se z /exec).

## 3. Vercel env

vercel.com → pinart-web → Settings → Environment Variables:

    GOOGLE_SHEETS_CENE_WEBHOOK_URL = <prilepljen URL>

Redeploy. Konec.

## Cez pol leta

Sheet → filter/pivot: mediana `izvedbaEUR` po `storitve` × `izkusnje`
× `mojTrg` = pregled cen na trgu, ki ga nima nihce drug. Pri 200+
vrsticah se splaca podatke vrniti v orodje ("kreativci s tvojimi
izkusnjami racunajo X–Y").

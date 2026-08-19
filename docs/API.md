# Pinart Flow — javni API v1 (samo branje)

Zunanji bralni vmesnik v podatke Flowa. Namenjen integracijam, skriptam in
MCP strežniku, ki naj o Flowu **berejo**, ne pišejo.

**Prva različica je izključno bralna.** Vse končne točke so `GET`. Poti, ki bi
karkoli ustvarila, spremenila ali izbrisala, namenoma ne obstajajo — to je
zavestna omejitev, ne pomanjkljivost. Če jo je treba odpraviti, se to zgodi z
novo, izrecno načrtovano različico.

Osnovni naslov: `https://<domena>/api/v1`

---

## Avtentikacija

Vsak klic mora nositi API ključ v glavi `Authorization`:

```
Authorization: Bearer pf_<43 znakov>
```

- Ključ je vezan na **eno organizacijo**. Vidiš izključno podatke te
  organizacije; drugih ni mogoče doseči z nobenim parametrom.
- Ključ mora imeti obseg **`branje`**. Ključ brez tega obsega dobi `403`.
- Ključ se ob nastanku prikaže **natanko enkrat**. V bazi je shranjena samo
  SHA-256 zgostitev — če ključ izgubiš, ga ni mogoče obnoviti, samo preklicati
  in izdati novega.
- Preklican ali neznan ključ dobi enak odgovor kot manjkajoč (`401`), da ni
  mogoče ugotavljati, kateri ključi obstajajo.

Ključ obravnavaj kot geslo: nikoli v repozitorij, nikoli v URL, nikoli v
odjemalčev JavaScript. Predpona `pf_` je izbrana zato, da ga orodja za
odkrivanje skrivnosti v git zgodovini prepoznajo.

---

## Oblika odgovora

Vsi odgovori so JSON s **slovenskimi ključi**.

`id` v odgovoru je vedno **zunanji id** (`external_id`) — isti, ki ga vrne
seznam in ki ga vstaviš v pot `/stranke/{id}`. Notranji UUID-ji baze niso del
javnega vmesnika in ne uhajajo ven.

Napake so vedno:

```json
{ "napaka": "Branja ni bilo mogoče izvesti." }
```

Sporočilo je splošno in namenoma **ne razkriva podrobnosti baze** (imen
stolpcev, SQL-a, kod Postgresa). Podrobnost napake gre v strežniški dnevnik.

| Status | Pomen |
| ------ | ----- |
| `200`  | v redu |
| `400`  | neveljaven `id` v poti |
| `401`  | ključ manjka, je napačne oblike, neznan ali preklican |
| `403`  | ključ je veljaven, a nima obsega `branje` |
| `404`  | zapisa ni v tvoji organizaciji |
| `429`  | presežena omejitev pogostosti |
| `503`  | zaledje trenutno ni na voljo |

Odgovori nosijo `Cache-Control: no-store` — gre za poslovne podatke enega
podjetja, ki jih noben posrednik ne sme shraniti.

### Straničenje

Vsi seznami sprejmejo:

| Parameter | Privzeto | Največ | Opis |
| --------- | -------- | ------ | ---- |
| `limit`   | `50`     | `200`  | število zapisov |
| `offset`  | `0`      | —      | koliko zapisov preskočiti |

Nesmiselne vrednosti (besedilo, negativna števila) se tiho zamenjajo s
privzetimi. Seznami vrnejo tudi:

```json
"stranicenje": { "limit": 50, "offset": 0, "vrnjeno": 12 }
```

Ko je `vrnjeno` manjše od `limit`, si na koncu seznama.

### Izbrisani zapisi

Mehko izbrisani zapisi (`deleted_at`) **niso nikoli vrnjeni** — ne pri
projektih, ne pri ponudbah, ne pri računih.

Stornirani računi **so** vrnjeni (`status: "cancelled"`, polje `preklicano`),
ker so del davčne sledi in ne smejo izginiti iz zunanjega pregleda.

### Omejitev pogostosti

120 zahtev na minuto **na ključ, na končno točko**. Omejitev je vezana na
ključ, ne na IP — en ključ ima eno kvoto, ne glede na to, od kod kliče.

---

## Končne točke

### `GET /api/v1/stranke`

```bash
curl -s "https://pinartflow.com/api/v1/stranke?limit=25" \
  -H "Authorization: Bearer pf_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
```

```json
{
  "stranke": [
    {
      "id": "cl-8f2a",
      "ime": "Studio Vez d.o.o.",
      "email": "info@studiovez.si",
      "kontakt": "Maja Novak",
      "telefon": "+386 41 123 456",
      "naslov": "Slovenska cesta 1, 1000 Ljubljana",
      "davcna": "SI12345678",
      "opombe": null,
      "ustvarjeno": "2026-03-04T09:12:00.000Z",
      "posodobljeno": "2026-08-11T14:02:11.000Z"
    }
  ],
  "stranicenje": { "limit": 25, "offset": 0, "vrnjeno": 1 }
}
```

Urejeno po imenu naraščajoče.

### `GET /api/v1/projekti`

```bash
curl -s "https://pinartflow.com/api/v1/projekti" \
  -H "Authorization: Bearer pf_..."
```

```json
{
  "projekti": [
    {
      "id": "p1m4k2xq7",
      "naslov": "Prenova spletne strani",
      "status": "aktiven",
      "faza": "delo",
      "strankaId": "cl-8f2a",
      "stranka": "Studio Vez d.o.o.",
      "ustvarjeno": "2026-06-01T07:40:00.000Z",
      "posodobljeno": "2026-08-19T18:03:00.000Z"
    }
  ],
  "stranicenje": { "limit": 50, "offset": 0, "vrnjeno": 1 }
}
```

Urejeno po `posodobljeno` padajoče.

| Polje | Vrednosti |
| ----- | --------- |
| `status` | `aktiven`, `pavza`, `koncan` |
| `faza` | `lead`, `ponudba`, `pogodba`, `delo`, `racun`, `zakljuceno`, `izgubljeno` (lahko `null`) |

Brief, cilji in povezave projekta niso del v1 — hranijo se v prosti obliki, ki
se še spreminja, in zunanji vmesnik je obljuba, ki jo je treba držati.

### `GET /api/v1/ponudbe`

```bash
curl -s "https://pinartflow.com/api/v1/ponudbe?limit=100&offset=100" \
  -H "Authorization: Bearer pf_..."
```

```json
{
  "ponudbe": [
    {
      "id": "of-2026-041",
      "stevilka": "2026-041",
      "naslov": "Celostna grafična podoba",
      "status": "sent",
      "datum": "2026-08-04",
      "veljaDo": "2026-09-04",
      "znesek": 3450.00,
      "valuta": "EUR",
      "strankaId": "cl-8f2a",
      "stranka": "Studio Vez d.o.o.",
      "ustvarjeno": "2026-08-04T08:00:00.000Z",
      "posodobljeno": "2026-08-05T10:22:00.000Z"
    }
  ],
  "stranicenje": { "limit": 100, "offset": 100, "vrnjeno": 1 }
}
```

Urejeno po `datum` padajoče. `status`: `draft`, `sent`, `accepted`, `rejected`.

Postavke ponudbe niso del v1.

### `GET /api/v1/racuni`

```bash
curl -s "https://pinartflow.com/api/v1/racuni" \
  -H "Authorization: Bearer pf_..."
```

```json
{
  "racuni": [
    {
      "id": "inv-2026-118",
      "stevilka": "2026-118",
      "naslov": "Celostna grafična podoba — 1. obrok",
      "status": "sent",
      "datum": "2026-08-10",
      "rokPlacila": "2026-08-24",
      "placano": null,
      "izdano": "2026-08-10T11:31:00.000Z",
      "preklicano": null,
      "znesek": 1725.00,
      "valuta": "EUR",
      "strankaId": "cl-8f2a",
      "stranka": "Studio Vez d.o.o.",
      "ustvarjeno": "2026-08-10T11:30:00.000Z",
      "posodobljeno": "2026-08-10T11:31:00.000Z"
    }
  ],
  "stranicenje": { "limit": 50, "offset": 0, "vrnjeno": 1 }
}
```

Urejeno po `datum` padajoče. `status`: `draft`, `sent`, `paid`, `overdue`,
`cancelled`.

| Polje | Pomen |
| ----- | ----- |
| `datum` | datum izdaje (`date`) |
| `rokPlacila` | rok plačila (`date`, lahko `null`) |
| `placano` | datum plačila (`date`, `null` = neplačano) |
| `izdano` | trenutek izdaje — po njem je račun zaklenjen (`null` = osnutek) |
| `preklicano` | trenutek storna (`null` = ni storniran) |

Postavke računa niso del v1.

### `GET /api/v1/stranke/{id}`

Ena stranka skupaj s povzetkom njenega poslovanja. `{id}` je zunanji id iz
seznama strank.

```bash
curl -s "https://pinartflow.com/api/v1/stranke/cl-8f2a" \
  -H "Authorization: Bearer pf_..."
```

```json
{
  "stranka": {
    "id": "cl-8f2a",
    "ime": "Studio Vez d.o.o.",
    "email": "info@studiovez.si",
    "kontakt": "Maja Novak",
    "telefon": "+386 41 123 456",
    "naslov": "Slovenska cesta 1, 1000 Ljubljana",
    "davcna": "SI12345678",
    "opombe": null,
    "ustvarjeno": "2026-03-04T09:12:00.000Z",
    "posodobljeno": "2026-08-11T14:02:11.000Z"
  },
  "projekti": [ { "id": "p1m4k2xq7", "naslov": "Prenova spletne strani", "status": "aktiven", "faza": "delo", "strankaId": "cl-8f2a", "stranka": "Studio Vez d.o.o.", "ustvarjeno": "…", "posodobljeno": "…" } ],
  "ponudbe": [ { "id": "of-2026-041", "stevilka": "2026-041", "naslov": "Celostna grafična podoba", "status": "sent", "datum": "2026-08-04", "veljaDo": "2026-09-04", "znesek": 3450, "valuta": "EUR", "strankaId": "cl-8f2a", "stranka": "Studio Vez d.o.o.", "ustvarjeno": "…", "posodobljeno": "…" } ],
  "racuni": [ { "id": "inv-2026-118", "stevilka": "2026-118", "naslov": "…", "status": "sent", "datum": "2026-08-10", "rokPlacila": "2026-08-24", "placano": null, "izdano": "…", "preklicano": null, "znesek": 1725, "valuta": "EUR", "strankaId": "cl-8f2a", "stranka": "Studio Vez d.o.o.", "ustvarjeno": "…", "posodobljeno": "…" } ],
  "povzetek": {
    "steviloProjektov": 3,
    "steviloPonudb": 5,
    "steviloRacunov": 4,
    "vrednostPonudb": { "EUR": 12400.00 },
    "vrednostRacunov": { "EUR": 8900.00 },
    "neplacano": { "EUR": 1725.00 }
  },
  "stranicenje": { "limit": 50, "offset": 0 }
}
```

`limit` in `offset` veljata za **vse tri vgnezdene sezname hkrati**. Če ima
stranka več zapisov, kot jih vrne ena stran, seznam prelistaj — števci v
`povzetek` so vedno **popolni** in ne odvisni od strani.

**Seštevki so razčlenjeni po valuti**, ne zliti v eno število: organizacija
lahko izdaja v EUR in USD hkrati in en sam »skupaj« bi bil laž.

| Polje povzetka | Pomen |
| -------------- | ----- |
| `vrednostPonudb` | vsota vseh neizbrisanih ponudb stranke, po valuti |
| `vrednostRacunov` | vsota vseh neizbrisanih računov stranke, po valuti |
| `neplacano` | računi brez datuma plačila, brez osnutkov in storniranih |

Seštevki zajamejo do 5000 zapisov na stranko in na zbirko.

Neznan `id` (ali id iz druge organizacije) vrne `404` z
`{ "napaka": "Stranka ne obstaja." }` — z ugibanjem ni mogoče ugotoviti, ali
zapis obstaja pri nekom drugem.

---

## Praktični primeri

Vsi neplačani računi:

```bash
curl -s "https://pinartflow.com/api/v1/racuni?limit=200" \
  -H "Authorization: Bearer $FLOW_API_KEY" \
| jq '[.racuni[] | select(.placano == null and .status != "draft" and .status != "cancelled")]'
```

Prelistaj vse stranke:

```bash
offset=0
while :; do
  odgovor=$(curl -s "https://pinartflow.com/api/v1/stranke?limit=200&offset=$offset" \
    -H "Authorization: Bearer $FLOW_API_KEY")
  echo "$odgovor" | jq -r '.stranke[].ime'
  [ "$(echo "$odgovor" | jq '.stranicenje.vrnjeno')" -lt 200 ] && break
  offset=$((offset + 200))
done
```

Preveri, da ključ deluje:

```bash
curl -s -o /dev/null -w '%{http_code}\n' \
  "https://pinartflow.com/api/v1/stranke?limit=1" \
  -H "Authorization: Bearer $FLOW_API_KEY"
# 200 = v redu, 401 = neveljaven kljuc, 403 = kljuc brez obsega branja
```

---

## Opombe za razvijalce

- Poti so v `app/api/v1/**`, skupni pripomočki v `lib/apiV1.ts`, preverjanje
  ključa v `lib/apiKljuc.ts`.
- Branje teče prek **service-role** odjemalca (`@/utils/supabase/admin`), ker
  klicatelj ni prijavljen uporabnik. Service-role **obide RLS**, zato je
  `.eq('organization_id', kontekst.organizationId)` pri **vsaki** poizvedbi
  edino, kar loči podatke enega podjetja od drugega. Nova poizvedba brez tega
  filtra je varnostna luknja, ne slog.
- Stolpci so našteti izrecno (`STOLPCI_*` v `lib/apiV1.ts`) in nikoli
  `select('*')` — nov notranji stolpec tako ne uide v javni odgovor sam od
  sebe.
- Tabela `clients` **nima** stolpca `deleted_at` (stranke se brišejo trdo),
  zato tam ni filtra po nagrobniku. Pri `projects`, `offers` in `invoices` je
  obvezen.
- Vse napake gredo skozi `napaka()` iz `lib/apiV1.ts`, ki podrobnost baze
  zapiše v dnevnik in ven pusti samo splošno slovensko sporočilo.

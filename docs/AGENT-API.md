# Pinart Flow — vhod za zunanje agente (ustvarjanje nalog)

Ozka **vhodna** pot: zunanji agent (Claude Code, skripta, urnik) opravi delo in
nalogo zapiše v Flow — tja, kjer se ji meri čas. Ne v klepet, ki ga nihče ne
prebere za nazaj.

Pot zna **eno samo stvar: ustvariti nalogo.** Vse drugo je namerno zunaj.

Naslov: `POST https://<domena>/api/agent/naloge`

---

## Kaj pot zna in česa NE zna

**Zna:** ustvariti eno nalogo v stolpcu `todo`, z naslovom, opisom, rokom,
projektom in oznakami. Vsaka tako nastala naloga dobi oznako **`agent`** — po
njej se v Task Managerju loči, kaj je naredil agent in kaj človek. Oznake ni
mogoče izklopiti.

**NE zna:**

- ne bere nalog, projektov, strank ali računov (za branje je `docs/API.md`,
  ločen ključ, ločena pot `/api/v1`),
- ne spreminja in ne briše obstoječih nalog,
- ne zaključi naloge — o tem, ali je opravljena, odloči človek,
- ne dodeli naloge sodelavcu in ne zažene štoparice,
- ne ustvari več nalog naenkrat (en klic = ena naloga).

To ni pomanjkljivost, ampak omejitev, ki jo nosi ključ: če ključ ušel, je edina
škoda odvečna naloga v seznamu. Nič se ne prebere in nič ne izgubi.

---

## Kako ustvariti ključ

Ključi živijo v tabeli `agent_kljuci` (migracija
`supabase/migrations/20260824030000_agent_kljuci.sql`). Ustvari ali prekliče ga
lahko **samo skrbnik ali lastnik** organizacije; član ključe vidi, a jih ne
izdaja.

Vmesnika za ustvarjanje **še ni** — do takrat gre ključ v bazo ročno. Ključ
sestavi lokalno (nikoli na tujem računalniku in nikoli v brskalniku):

```bash
node -e "const {createHash,randomBytes}=require('node:crypto');
const k='pf_'+randomBytes(24).toString('base64url');
console.log('KLJUČ (shrani zdaj):', k);
console.log('kljuc_hash:', createHash('sha256').update(k,'utf8').digest('hex'));
console.log('kljuc_namig:', k.slice(-4));"
```

Nato v Supabase SQL urejevalniku:

```sql
insert into public.agent_kljuci (organization_id, label, kljuc_hash, kljuc_namig, created_by)
values (
  '<uuid organizacije>',
  'Claude Code na prenosniku',
  '<kljuc_hash iz ukaza zgoraj>',
  '<kljuc_namig iz ukaza zgoraj>',
  '<uuid uporabnika iz auth.users>'
);
```

**Cel ključ vidiš enkrat.** V bazo gre samo SHA-256 zgostitev in zadnji štirje
znaki za prepoznavo v seznamu. Če ključ izgubiš, ga ni mogoče obnoviti — samo
preklicati in izdati novega.

Ključ obravnavaj kot geslo: nikoli v repozitorij, nikoli v URL, nikoli v
odjemalčev JavaScript. Predpona `pf_` je izbrana zato, da ga orodja za
odkrivanje skrivnosti v git zgodovini prepoznajo.

---

## Klic

```bash
curl -X POST https://<domena>/api/agent/naloge \
  -H "Authorization: Bearer pf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "naslov": "Popravi zamik kartic na telefonu",
    "opis": "Kartice so bile asimetrične zaradi width:auto na staršu. Popravljeno, rabi pregled.",
    "rok": "2026-08-30",
    "projekt": "Pinart Flow",
    "oznake": ["dizajn", "mobilno"]
  }'
```

Odgovor:

```json
{ "ok": true, "id": "0f2c…", "external_id": "8b41…" }
```

- `id` — vrstica v bazi (`public.naloge`),
- `external_id` — id naloge, kot ga vidi Task Manager.

Naloga se prikaže ob naslednji sinhronizaciji Flowa; oznake so `agent` +
karkoli si poslal.

### Polja telesa

| Polje | Obvezno | Oblika | Opomba |
| ----- | ------- | ------ | ------ |
| `naslov` | **da** | besedilo, 1–200 znakov | prazen ali sam presledek = `400` |
| `opis` | ne | besedilo, do 2000 znakov | |
| `rok` | ne | `YYYY-MM-DD` | koledarsko obstoječ datum; `2026-02-31` = `400` |
| `projekt` | ne | besedilo, do 200 znakov | ime projekta, kot ga uporabljaš v Flowu |
| `oznake` | ne | seznam besedil, do 10, vsaka do 40 znakov | `agent` se doda vedno |

Telo mora biti JSON (`Content-Type: application/json`) in ne sme presegati
20 000 bajtov.

### Odgovori

| Status | Pomen |
| ------ | ----- |
| `200` | naloga je nastala |
| `400` | telo ni veljavno (manjka `naslov`, napačen `rok`, predolgo polje …) |
| `401` | ključ manjka, je napačne oblike, neznan ali preklican |
| `429` | presežena omejitev pogostosti |
| `500` | naloge ni bilo mogoče zapisati |
| `503` | zaledje trenutno ni na voljo |

Manjkajoč, neznan in preklican ključ dajo **enak** odgovor (`401`) — zunanji
klicatelj ne sme ugotavljati, kateri ključi obstajajo. Ključ in njegova
zgostitev se ne pojavita ne v odgovoru ne v strežniškem dnevniku.

### Omejitev pogostosti

- 120 klicev na minuto z istega naslova IP,
- 60 klicev na minuto na **ključ** — kvota je ključeva, ne glede na to, od kod
  kliče.

Nad mejo je odgovor `429`; počakaj minuto in poskusi znova.

---

## Kako ključ preklicati

Preklic je takojšen: naslednji klic s tem ključem dobi `401`.

```sql
update public.agent_kljuci
   set revoked_at = now()
 where organization_id = '<uuid organizacije>'
   and kljuc_namig = '<zadnji štirje znaki ključa>'
   and revoked_at is null;
```

Ključi se **ne brišejo, ampak prekličejo.** Vrstica ostane kot sled: kdo ga je
ustvaril, kdaj je bil nazadnje v rabi (`last_used_at`) in kdaj je bil ugasnjen.
Zato tabela nima politike za `delete`.

Pregled ključev organizacije (brez zgostitve — te ne potrebuješ nikoli):

```sql
select label, kljuc_namig, created_at, last_used_at, revoked_at
  from public.agent_kljuci
 where organization_id = '<uuid organizacije>'
 order by created_at desc;
```

---

## Kje kaj živi

| Datoteka | Kaj je notri |
| -------- | ------------ |
| `supabase/migrations/20260824030000_agent_kljuci.sql` | tabela, indeksi, RLS |
| `lib/agentKljuc.ts` | oblika ključa, zgostitev, namig (čiste funkcije, brez baze) |
| `app/api/agent/naloge/route.ts` | pot `POST /api/agent/naloge` |
| `tests/unit/agentKljuc.test.ts` | testi oblike, zgostitve in namiga |

Bralni API v1 (`docs/API.md`) ima **svoje** ključe v tabeli `api_kljuci`.
Ločeno namenoma: preklic agentovega ključa ne vpliva na integracije in obratno,
in nobena nova pravica bralnega API-ja ne velja tiho tudi za agente.

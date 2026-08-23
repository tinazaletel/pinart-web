# Pinart Flow — tok podatkov in sifriranje

Namen: en dokument, ki odvetniku (in nam) pokaze, KATERI podatki tecejo KAM,
KDO jih hrani in KAKO so zavarovani.

Stanje: 22. 8. 2026, veja `demo`, commit 8b0233b. Vse trditve so prebrane iz kode,
ne iz spomina. Kjer nekaj ni bilo mogoce preveriti iz kode, pise **PREVERI**.

---

## Diagrami (SVG)

Za odvetnika in za tisk uporabi te. Odprejo se v brskalniku, Preview, Illustratorju
ali Figmi; besedilo je pravo besedilo, ne krivulje, zato je iskljivo in popravljivo.

| | Datoteka | Kaj pokaze |
|---|---|---|
| 01 | [diagrami/01-strezniki.svg](diagrami/01-strezniki.svg) | Kdo poganja kateri del sistema in v kateri jurisdikciji |
| 02 | [diagrami/02-tok-podatkov.svg](diagrami/02-tok-podatkov.svg) | Stranka, ponudba, racun — zapis na dve mesti hkrati |
| 03 | [diagrami/03-posta.svg](diagrami/03-posta.svg) | Dohodna in odhodna posta, odsek za odsekom |
| 04 | [diagrami/04-sifriranje.svg](diagrami/04-sifriranje.svg) | Sifriranje v prenosu, v mirovanju in v aplikaciji |
| 05 | [diagrami/05-ai-in-sef.svg](diagrami/05-ai-in-sef.svg) | Kaj zapusti sistem: AI proti Sefu avtorstva |

Mermaid razlicice spodaj so isti tok v besedilni obliki — uporabne za urejanje
in za pregled na GitHubu, a za odvetnika posljemo SVG.

---

## 1. Zemljevid sistema — kdo hrani kaj in kje

```mermaid
flowchart TB
  subgraph N["Naprava uporabnika"]
    UI["Flow v brskalniku"]
    LS[("localStorage<br/>NI sifriran")]
    UI <--> LS
  end

  subgraph EU["EU — Frankfurt (fra1, potrjeno iz glave x-vercel-id)"]
    V["Vercel<br/>Next.js streznik + poti /api/**"]
  end

  subgraph BAZA["Podatkovna baza — regija PREVERI"]
    PG[("Supabase Postgres<br/>60 tabel, RLS povsod")]
    ST[("Supabase Storage<br/>bucket business-documents<br/>zaseben, 50 MB")]
  end

  subgraph ZUN["Zunanji obdelovalci"]
    RS["Resend<br/>odhodna posta"]
    CF["Cloudflare Worker<br/>dohodna posta"]
    AN["Anthropic<br/>Pupa"]
    GO["Google<br/>OAuth + Analytics + Sheets"]
    TSA["freetsa.org<br/>casovni zig RFC 3161"]
    LAI["OpenAI / Google / Mistral<br/>samo ce jih uporabnik sam poveze"]
  end

  UI -->|HTTPS| V
  V <-->|HTTPS| PG
  V <-->|HTTPS| ST
  V -->|HTTPS| RS
  CF -->|HTTPS + skupna skrivnost| V
  V -->|HTTPS| AN
  V -->|HTTPS| LAI
  V -->|HTTPS, samo 32 bajtov zgostitve| TSA
  V -->|HTTPS| GO
  UI -.->|samo ob privolitvi za piskotke| GO
```

Kaj je iz tega pomembno za odvetnika:

- Streznik tece v Frankfurtu (EU). Regija baze **PREVERI** — to je tvoja naloga.
- Vsi prenosi gredo prek HTTPS. Nobena pot ne dovoli `http://`.
- Cloudflare, freetsa.org, OpenAI in Mistral **niso** navedeni v politiki
  zasebnosti. Glej razdelek 11.

---

## 2. Prijava in seja

```mermaid
sequenceDiagram
  autonumber
  participant U as Uporabnik
  participant B as Brskalnik
  participant M as middleware.ts
  participant V as Vercel (Next.js)
  participant S as Supabase Auth
  participant G as Google OAuth

  U->>B: odpre pinartflow.com
  B->>M: zahtevek
  Note over M: ODPRT_JAVNI_DEL = false<br/>zaklep: piskotek flow_gate (httpOnly, sameSite lax, 30 dni)
  M-->>B: 401 + vpis gesla, ce piskotka ni

  alt Prijava z Google
    B->>G: preusmeritev na Googlov vpis
    G-->>S: koda za izmenjavo
    S-->>B: seja (piskotki, ki jih nastavi @supabase/ssr)
  else Prijava z e-posto in geslom
    B->>S: e-posta + geslo prek HTTPS
    Note over S: geslo hrani in preverja Supabase Auth<br/>nasa koda gesla nikoli ne vidi in ne shrani
    S-->>B: seja
  end

  B->>V: vsak nadaljnji zahtevek s sejnim piskotkom
  V->>S: getUser() — preverjanje seje na strezniku
  V->>V: preberiClanstvo() — v kateri organizaciji je in s katero vlogo
```

Podatki, ki nastanejo: e-posta, ime iz Google profila, id uporabnika,
cas prijave. Gesla v nasi bazi ni.

---

## 3. Poslovni podatki — stranka, ponudba, pogodba, racun

To je jedro. Pomembna posebnost: podatki se pisejo **na dve mesti hkrati** —
v brskalnik in v oblak.

```mermaid
flowchart LR
  U["Uporabnik vnese<br/>stranko / ponudbo / racun"] --> UI["Flow UI"]
  UI --> LS[("localStorage<br/>pinart-* in pinflow_*<br/>ODPRTO BESEDILO")]
  UI --> BR["FlowCloudBridge"]
  BR -->|potisk ob spremembi| API["/api/** na Vercelu"]
  API --> RLS{"RLS:<br/>ali je clan te organizacije?"}
  RLS -->|da| PG[("Supabase Postgres<br/>clients, offers, contracts,<br/>invoices, expenses, projects ...")]
  RLS -->|ne| ZAV["zavrnjeno"]
  PG -->|poteg ob prijavi| BR
  BR --> LS
```

Kaj se zapise: ime in priimek ali naziv stranke, naslov, davcna in maticna
stevilka, e-posta, telefon, vsebina ponudb in pogodb, zneski, roki, opombe.
Torej **osebni podatki strank nasih uporabnikov** — Flow je pri teh podatkih
obdelovalec, uporabnik pa upravljavec.

Locitev med organizacijami je izvedena z RLS politikami na vseh 60 tabelah.
Preverjeno: vsaka tabela ima `enable row level security`.

Odprta tocka: `localStorage` je odprto besedilo. Glej razdelek 10.

---

## 4. Posta — dohodna in odhodna

```mermaid
sequenceDiagram
  autonumber
  participant P as Posiljatelj (stranka)
  participant CF as Cloudflare Email Routing + Worker
  participant V as Vercel /api/posta/prejeto
  participant PG as Supabase
  participant U as Uporabnik v Flowu
  participant R as Resend
  participant Pr as Prejemnik

  Note over P,PG: DOHODNA
  P->>CF: mail na <token>@pinartflow.com
  CF->>CF: razclenitev (postal-mime)
  CF->>V: POST z glavo x-inbound-secret
  Note over V: timingSafeEqual — primerjava skrivnosti,<br/>odporna na merjenje casa
  V->>PG: zapis v project_mail (razvrsti se k projektu prek tokena)
  PG->>U: prikaz v Flowu

  Note over U,Pr: ODHODNA
  U->>V: POST /api/posta
  V->>PG: preveri prijavo in clanstvo, omeji pogostost
  V->>R: posiljanje prek Resend (kljuc bere SAMO streznik)
  R->>Pr: SMTP dostava
  V->>PG: zapis v mail_log in project_mail
```

Pomembno: vsebina mailov je v bazi shranjena v **berljivi obliki** (da je
iskanje in prikaz sploh mogoc). Med Resendom in strezniki prejemnikov velja
navadna SMTP dostava — sifriranje je oportunisticno (STARTTLS), ne zajamceno
od konca do konca. To sodi v politiko zasebnosti kot izrecna omejitev.

---

## 5. AI — Pupa in lastna povezava uporabnika

```mermaid
flowchart TB
  U["Uporabnik pise Pupi"] --> API["/api/pupa"]
  API --> KDO{"Kateri ponudnik?"}

  KDO -->|privzeto: Pinartov racun| A["Anthropic<br/>ANTHROPIC_API_KEY iz okolja"]
  KDO -->|uporabnikova lastna povezava| B["organization_ai_connections"]

  B --> DEC["decryptAiSecret()<br/>AES-256-GCM"]
  DEC --> P2["OpenAI / Anthropic /<br/>Google / Mistral / lasten endpoint"]

  A --> ODG["odgovor"]
  P2 --> ODG
  ODG --> PG[("pupa_conversation<br/>pupa_message<br/>ai_usage (ip_hash, ne IP)")]
  PG --> U
```

Kaj gre ponudniku AI: vprasanje uporabnika in kontekst, ki ga Pupa dobi —
torej lahko tudi imena strank in vsebina dokumentov. To je prenos v tretjo
drzavo in mora biti v politiki zasebnosti pojasnjeno (Anthropic ze je).

Kljuci uporabnikovih lastnih AI povezav so **edini podatek v celem sistemu,
ki ga sifriramo mi sami** — AES-256-GCM, kljuc `AI_CREDENTIALS_ENCRYPTION_KEY`
(32 bajtov), zapis oblike `v1.<iv>.<tag>.<sifropis>`. V UI se kljuc nikoli ne
vrne — samo maska `••••1234`.

---

## 6. Sef avtorstva — overjen casovni zig

```mermaid
sequenceDiagram
  autonumber
  participant U as Uporabnik
  participant B as Brskalnik
  participant V as /api/sef/zig
  participant PG as Supabase (sef_zapisi)
  participant T as freetsa.org (TSA)

  U->>B: izbere datoteko
  B->>B: SHA-256 zgostitev (datoteka NE zapusti naprave)
  B->>V: poslje samo zgostitev
  V->>PG: prebere stolpec zgostitev
  V->>T: TimeStampReq — 32 bajtov + nonce
  Note over T: TSA ne izve, KAJ je bilo zigosano
  T-->>V: podpisan casovni zeton
  V->>PG: shrani zeton, cas, streznik
```

To je z vidika varstva podatkov najcistejsi tok v sistemu: navzven ne gre
noben osebni podatek, samo 32 bajtov zgostitve. Koda tudi zavrne vsak
`TSA_URL`, ki ni `https://`.

**Napaka, ki jo je treba popraviti pred odvetnikom:** politika zasebnosti
(`app/[locale]/zasebnost/page.tsx`) navaja OpenTimestamps in Bitcoin,
koda pa uporablja RFC 3161 proti freetsa.org (`lib/casovniZig.ts:28`).

---

## 7. Obiskovalec brez racuna — analitika, piskotki, povprasevanje

```mermaid
flowchart TB
  O["Obiskovalec"] --> BAN{"Pasica za piskotke"}
  BAN -->|zavrne ali ne odgovori| NIC["Google Analytics se NE nalozi"]
  BAN -->|sprejme| GA["Google Analytics<br/>anonymize_ip: true"]

  O --> DOG["/api/dogodek"]
  DOG --> AN[("dogodki<br/>ime dogodka, pot, groba naprava,<br/>jezik, nakljucni id seje")]
  OPOMBA1["NE sprejme: e-poste, imena, IP,<br/>vsebine ponudb, imen strank"]
  DOG -.-> OPOMBA1

  O --> OBR["Obrazec povprasevanja<br/>/api/inquiry"]
  OBR --> GS["Google Sheets<br/>prek Apps Script webhooka"]
  OPOMBA2["poslje SAMO ime, e-posto in opis —<br/>ne celega telesa zahtevka"]
  OBR -.-> OPOMBA2
```

Google Analytics se nalozi sele po privolitvi (`components/GoogleAnalytics.tsx`
preveri `pinart_cookie_consent`). To je pravilno.

Obrazec povprasevanja pise v **Google Sheets**. Ta obdelovalec v politiki
zasebnosti ni izrecno naveden kot prejemnik povprasevanj.

---

## 8. Izvoz in izbris podatkov (clena 15 in 17 GDPR)

```mermaid
flowchart LR
  U["Uporabnik"] --> IZV["/api/uporabnik/izvoz"]
  IZV --> T1[("16 organizacijskih tabel:<br/>clients, offers, contracts, invoices,<br/>expenses, retainers, mail_log ...")]
  IZV --> T2[("osebne tabele")]
  T1 --> JSON["izvoz"]
  T2 --> JSON

  U --> IZB["/api/uporabnik/izbris"]
  IZB --> POT{"potrditev"}
  POT --> DEL[("izbris + mehko brisanje<br/>deleted_at v 14 tabelah")]
  DEL --> ZAP[("user_data_requests<br/>sled o zahtevi")]
```

Obe poti obstajata in delujeta. Pri izbrisu je treba odvetniku pojasniti
razliko med mehkim brisanjem (`deleted_at`) in dokoncnim izbrisom ter navesti
rok, po katerem mehko izbrisano izgine zares. **Tega roka danes nikjer ni
zapisanega** — ne v kodi ne v politiki.

---

## 9. Sifriranje — kaj je in kaj ni

### V prenosu (v gibanju)

| Odsek | Stanje |
|---|---|
| Brskalnik → Vercel | HTTPS/TLS. HSTS `max-age=63072000` potrjen s `curl -I` |
| Vercel → Supabase | HTTPS |
| Vercel → Resend | HTTPS (`api.resend.com`) |
| Cloudflare Worker → Vercel | HTTPS + skupna skrivnost, primerjana s `timingSafeEqual` |
| Vercel → Anthropic / OpenAI / Google / Mistral | HTTPS |
| Vercel → freetsa.org | HTTPS, koda zavrne `http://` |
| Resend → streznik prejemnika | **oportunisticni STARTTLS, ne zajamceno** |

### V mirovanju

| Kje | Stanje |
|---|---|
| Supabase Postgres | sifriranje diska na strani ponudnika — **PREVERI in zapisi v DPA** |
| Supabase Storage (`business-documents`) | zaseben bucket (`public = false`), dostop samo prek podpisanih URL-jev z rokom |
| Vercel | ne hrani uporabnikovih podatkov trajno; ostanejo dnevniki |
| **localStorage v brskalniku** | **NI sifriran — odprto besedilo** |

### Sifriranje, ki ga izvajamo mi sami

Eno samo mesto:

- `lib/aiConnections.ts` — AES-256-GCM za kljuce AI povezav.

Vse ostalo, kar je videti kot sifriranje, je **enosmerna zgostitev** (hash),
kar je za te namene pravilno, a ni sifriranje:

| Kaj | Kako | Datoteka |
|---|---|---|
| API kljuci | SHA-256, shrani se samo zgostitev | `lib/apiKljuc.ts` |
| Zetoni portala za stranko | 32 nakljucnih bajtov, shrani se SHA-256 | `lib/portalZeton.ts` |
| Zetoni za podpis pogodbe | 32 nakljucnih bajtov, shrani se SHA-256 | `lib/podpisPogodbe.ts` |
| Vsebina pogodbe (dokaz nespremenjenosti) | SHA-256 | `lib/podpisPogodbe.ts` |
| IP naslovi za omejevanje pogostosti | SHA-256 s soljo | `lib/rate-limit.ts` |
| Datoteke v Sefu | SHA-256 | brskalnik + `lib/casovniZig.ts` |

Gesla: hrani in preverja jih Supabase Auth. Nasa koda gesla nikoli ne vidi.

---

## 10. Kar je treba popraviti — po nujnosti

**1. localStorage ni sifriran in ostaja na napravi**
Poslovni podatki (stranke, ponudbe, racuni, stroski) so v odprtem besedilu v
brskalniku pod predponama `pinart-` in `pinflow_`. Kdorkoli ima dostop do
naprave ali brskalniskega profila, jih prebere. Za launch je najmanjsa
sprejemljiva resitev: to izrecno napisati v politiko zasebnosti in v pogoje,
in poskrbeti, da se ob odjavi obe predponi zares pobriseta.

**2. Manjkajoce varnostne glave**
`next.config.mjs` nima `headers()`. Danes ni ne CSP, ne `Referrer-Policy`,
ne `Permissions-Policy`, ne `X-Frame-Options` na lastni domeni. HSTS doda
Vercel sam. Popravek je kratek in ne posega v videz.

**3. `contract_signatures.ip_address` hrani surov IP**
Vse ostale poti IP zgostijo, ta ga hrani v celoti (`inet`). Za dokaz o
podpisu je to obicajno in verjetno branljivo, a mora biti v politiki
zasebnosti navedeno skupaj z rokom hrambe.

**4. Nepopoln seznam obdelovalcev v politiki zasebnosti**
Navedeni so Google, Anthropic, Supabase, Vercel in Resend.
Manjkajo: **Cloudflare** (dohodna posta), **freetsa.org** (casovni zig),
**Google Sheets** kot prejemnik povprasevanj, ter **OpenAI, Google in
Mistral** za primer, ko uporabnik poveze svojega ponudnika AI.

**5. OpenTimestamps / Bitcoin v politiki zasebnosti**
Ze znano. Koda uporablja RFC 3161 proti freetsa.org.

**6. Rok hrambe ni zapisan nikjer**
Ne v kodi, ne v politiki. Odvetnik ga bo zahteval za vsako kategorijo
podatkov posebej.

**7. Sol za zgoscevanje IP-jev**
V `app/api/povprasevanje/[slug]/route.ts:14` se ob odsotnosti
`API_RATE_LIMIT_SALT` uporabi `SUPABASE_SERVICE_ROLE_KEY` kot sol. Ni uhajanja
(zgostitev je enosmerna), a se je bolje izogniti temu, da isti niz sluzi kot
dostopni kljuc do baze in kot kriptografska sol. Nastavi `API_RATE_LIMIT_SALT`.

---

## 11. Vprasanja za odvetnika, ki izhajajo iz teh diagramov

1. Ali je za `localStorage` na uporabnikovi napravi potrebna posebna
   informacija ali privolitev, ker gre za podatke o **tretjih osebah**
   (strankah uporabnika), ne le o uporabniku samem?
2. Kaksen rok hrambe naj zapisemo za: vsebino mailov, dokaz o podpisu z IP
   naslovom, mehko izbrisane zapise, dnevnike?
3. Pogodba o obdelavi z nasimi uporabniki (Flow kot obdelovalec za podatke
   njihovih strank) — ali jo pripravimo kot prilogo k pogojem uporabe?
4. Ali zadosca, da AI ponudnike nastejemo genericno, ali mora biti vsak
   posebej naveden z drzavo in pravno podlago za prenos?

---

Zadnja sprememba: 22. 8. 2026.
Ob spremembi toka podatkov posodobi tudi ta dokument — odvetnik bo delal po njem.

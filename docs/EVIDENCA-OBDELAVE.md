# Evidenca dejavnosti obdelave

Po 30. členu Splošne uredbe o varstvu podatkov (GDPR).

**Različica:** 1.0 · **Datum:** 23. 8. 2026 · **Status:** osnutek za pravni pregled

> Ta dokument je **interni** in se ne objavlja. Nadzornemu organu
> (Informacijski pooblaščenec) se predloži na zahtevo. Polja, označena z
> **[DOPOLNI]**, mora izpolniti upravljavec; označena z **[PRAVNIK]** je treba
> potrditi pri odvetniku ali računovodji.

---

## 1. Upravljavec

| | |
|---|---|
| Naziv | **[DOPOLNI — polni naziv nosilca dejavnosti]** |
| Naslov | **[DOPOLNI]** |
| Matična / davčna številka | **[DOPOLNI]** |
| Kontakt za varstvo podatkov | tina@pinart.si |
| Pooblaščena oseba za varstvo podatkov (DPO) | ni imenovana — **[PRAVNIK]** potrdi, da imenovanje ni obvezno (37. člen GDPR) |
| Storitev | Pinart Flow, `www.pinartflow.com` |

---

## 2. Dvojna vloga: upravljavec in obdelovalec

Pri tej storitvi sta **dve različni vrsti podatkov** in za vsako veljajo druge
obveznosti. To je najpomembnejše razlikovanje v tem dokumentu.

| | Podatki o uporabniku | Podatki, ki jih uporabnik vnese |
|---|---|---|
| kaj je | račun, e-pošta, ime, naročnina, uporaba | njegove stranke, ponudbe, pogodbe, pošta |
| naša vloga | **upravljavec** | **obdelovalec** |
| kdo določa namen | mi | uporabnik |
| kdo odgovarja posamezniku | mi | uporabnik |
| kaj potrebujemo | to evidenco, politiko zasebnosti | **pogodbo o obdelavi z uporabnikom** (v pogojih poslovanja) |

**Iz tega sledi obveznost, ki še ni izpolnjena:** v splošnih pogojih mora biti
razdelek, s katerim uporabnik kot upravljavec pooblasti Pinart Flow kot
obdelovalca, s seznamom podobdelovalcev in obveznostjo obveščanja o
spremembah. **[PRAVNIK]**

---

## 3. Dejavnosti obdelave

### 3.1 Uporabniški računi in dostop

| | |
|---|---|
| Namen | ustvarjanje in vodenje računa, prijava, članstvo v organizaciji, sedeži |
| Pravna podlaga | izvajanje pogodbe (čl. 6(1)(b)) |
| Kategorije posameznikov | uporabniki storitve |
| Kategorije podatkov | ime in priimek, e-naslov, telefon, identifikator Google računa, čas prijav |
| Tabele | `profiles`, `organizations`, `organization_members`, `organization_invites`, `organization_settings`, `flow_dostop` |
| Rok hrambe | do izbrisa računa + **[DOPOLNI]** dni za preklic izbrisa |

### 3.2 Podatki o strankah uporabnika (CRM)

| | |
|---|---|
| Namen | vodenje evidence strank uporabnika, zgodovina sodelovanja |
| Pravna podlaga | uporabnik je upravljavec; mi obdelujemo po njegovih navodilih (čl. 28) |
| Kategorije posameznikov | stranke in kontaktne osebe uporabnikov |
| Kategorije podatkov | naziv, e-naslov, kontaktna oseba, telefon, naslov, davčna številka, opombe |
| Tabele | `clients`, `crm_dnevnik` |
| Rok hrambe | dokler jih uporabnik ne izbriše oziroma do izbrisa njegovega računa |

### 3.3 Ponudbe, pogodbe, računi in retainerji

| | |
|---|---|
| Namen | priprava in vodenje poslovne dokumentacije uporabnika |
| Pravna podlaga | obdelava po navodilih uporabnika (čl. 28); pri **računih** tudi zakonska obveznost uporabnika |
| Kategorije podatkov | nazivi in naslovi pogodbenih strank, davčne številke, zneski, vsebina dokumentov |
| Tabele | `offers`, `contracts`, `invoices`, `retainers`, `document_counters`, `document_files`, `document_audit`, `org_katalogi`, `dok_videz` |
| Rok hrambe | računi praviloma **10 let** — **[PRAVNIK]** potrdi z računovodjo |

### 3.4 Elektronsko podpisovanje pogodb

| | |
|---|---|
| Namen | dokaz o tem, kdo je in kdaj podpisal pogodbo |
| Pravna podlaga | izvajanje pogodbe; zakoniti interes dokazljivosti (čl. 6(1)(f)) |
| Kategorije podatkov | ime podpisnika, čas podpisa, **naslov IP**, **podatki o brskalniku**, zgostitev vsebine |
| Tabele | `contract_signing_requests`, `contract_signatures` |
| Opomba | IP in brskalnik se hranita **namenoma** — brez njiju podpis ni dokazljiv. To je edino mesto, kjer se hrani nezgoščen naslov IP. |
| Rok hrambe | ves čas veljavnosti pogodbe + zastaralni rok — **[PRAVNIK]** |

### 3.5 Komunikacije (elektronska pošta)

| | |
|---|---|
| Namen | zapis poslane in prejete pošte v zvezi s projektom |
| Pravna podlaga | obdelava po navodilih uporabnika (čl. 28) |
| Kategorije podatkov | naslovi pošiljatelja in prejemnikov, zadeva, besedilo sporočila |
| Tabele | `mail_log`, `project_mail`, `project_inbox` |
| Opomba | priloge se **ne shranjujejo**; shrani se le besedilo in HTML sporočila |
| Rok hrambe | do izbrisa s strani uporabnika |

### 3.6 Evidenca delovnega časa

| | |
|---|---|
| Namen | evidenca prisotnosti in porabljenega časa |
| Pravna podlaga | **zakonska obveznost** uporabnika (ZEPDSV) — čl. 6(1)(c) |
| Kategorije posameznikov | uporabnik in njegovi sodelavci |
| Kategorije podatkov | datum, prihod, odhod, odmor, vrsta odsotnosti, kraj dela, opomba, trajanje in znesek po projektu |
| Tabele | `presence_entries`, `private_time_entries`, `delovni_dnevi` |
| Rok hrambe | po ZEPDSV — **[PRAVNIK]**; zakon predpisuje daljšo hrambo od običajne |
| Opomba | podatki o delovnem času so podatki o zaposlenih in terjajo strožjo obravnavo |

### 3.7 Sef avtorstva in časovni žig

| | |
|---|---|
| Namen | dokaz o obstoju dela na določen dan |
| Pravna podlaga | izvajanje pogodbe |
| Kategorije podatkov | zgostitev datoteke (SHA-256), ime datoteke, opis dela, čas; pri plačljivem trezorju tudi izvirna datoteka |
| Tabele | `sef_zapisi` |
| Prenos navzven | **FreeTSA** prejme izključno **32 bajtov zgostitve** — nikoli datoteke, imena ali opisa |
| Rok hrambe | trajno, dokler uporabnik zapisa ne izbriše (izbris uniči dokazno vrednost) |

### 3.8 AI asistentka Pupa

| | |
|---|---|
| Namen | pomoč pri delu, osnutki besedil, povzetki |
| Pravna podlaga | izvajanje pogodbe; uporaba je prostovoljna |
| Kategorije podatkov | besedilo, ki ga uporabnik vnese, in omejen kontekst odprtega orodja |
| Tabele | `pupa_conversation`, `pupa_message`, `ai_usage`, `organization_ai_connections` |
| Podobdelovalec | **Anthropic** (ZDA) — prejme le vsebino posamezne zahteve; **nima dostopa do baze** |
| Opomba | ključi za povezave uporabnika do njegovih ponudnikov AI so **šifrirani** |
| Rok hrambe | do izbrisa pogovora |

### 3.9 Povpraševanja z javnega obrazca

| | |
|---|---|
| Namen | prejem povpraševanja obiskovalca in priprava osnutka ponudbe |
| Pravna podlaga | ukrepi pred sklenitvijo pogodbe na zahtevo posameznika (čl. 6(1)(b)) |
| Kategorije podatkov | ime, e-naslov, vsebina povpraševanja, **zgoščen naslov IP** |
| Tabele | `povprasevanja` |
| Opomba | IP se hrani **zgoščen** (`ip_hash`), ne v izvirni obliki — za omejevanje zlorab, ne za identifikacijo |
| Rok hrambe | **[DOPOLNI]** — predlog: 12 mesecev, če ne pride do sodelovanja |

### 3.10 Zaprta beta

| | |
|---|---|
| Namen | evidenca prijav na testiranje pred javnim odprtjem |
| Pravna podlaga | privolitev (čl. 6(1)(a)) |
| Kategorije podatkov | ime in priimek, e-naslov, čas prijave |
| Tabele | `beta_vstopi` |
| Rok hrambe | do konca zaprte bete, nato izbris ali privolitev za nadaljnje obveščanje |

### 3.11 Portal za stranko

| | |
|---|---|
| Namen | omejen vpogled stranke v svoj projekt brez registracije |
| Pravna podlaga | obdelava po navodilih uporabnika (čl. 28) |
| Kategorije podatkov | e-naslov prejemnika, **zgostitev žetona**, čas veljavnosti, število ogledov |
| Tabele | `portal_dostopi`, `record_shares` |
| Opomba | žeton se hrani **zgoščen** (`zeton_zgostitev`), zato ga iz baze ni mogoče ponovno uporabiti |
| Rok hrambe | do preklica ali poteka |

### 3.12 Naročnine in plačila

| | |
|---|---|
| Namen | vodenje naročnine in obračun |
| Pravna podlaga | izvajanje pogodbe; zakonska obveznost pri računih |
| Kategorije podatkov | paket, obdobje, stanje plačila |
| Tabele | `organization_subscriptions`, `referral_codes`, `referral_registrations` |
| Opomba | **podatkov o plačilnih karticah ne obdelujemo in ne hranimo** — plačila izvede pooblaščeni ponudnik (Merchant of Record) |
| Rok hrambe | **[PRAVNIK]** — po davčnih predpisih |

### 3.13 Delovanje, varnost in analitika

| | |
|---|---|
| Namen | odkrivanje napak in zlorab, merjenje uporabe, omejevanje pogostosti klicev |
| Pravna podlaga | zakoniti interes (čl. 6(1)(f)) — varnost in izboljševanje storitve |
| Kategorije podatkov | identifikator uporabnika, čas in število obiskov, klici vmesnika, dogodki |
| Tabele | `obiski`, `api_klici`, `api_kljuci`, `dogodki`, `cenovne_tocke`, `agent_naloge` |
| Rok hrambe | **[DOPOLNI]** — predlog: 12 mesecev |

### 3.14 Uveljavljanje pravic posameznikov

| | |
|---|---|
| Namen | evidenca zahtev za dostop, izvoz in izbris |
| Pravna podlaga | zakonska obveznost (čl. 12–22) |
| Kategorije podatkov | identifikator uporabnika, vrsta zahteve, stanje, čas |
| Tabele | `user_data_requests` |
| Rok hrambe | **[PRAVNIK]** — evidenca se hrani tudi po izvršitvi zahteve, kot dokaz o izpolnitvi |

---

## 4. Podobdelovalci in prenosi v tretje države

| podobdelovalec | namen | država | podlaga za prenos | DPA podpisan |
|---|---|---|---|---|
| Supabase | baza in shramba | **EU — eu-north-1, Stockholm** (potrjeno 23. 8. 2026) | prenosa v tretjo državo ni | ☐ |
| Vercel | gostovanje aplikacije | ZDA | SCC / DPF | ☐ |
| Resend | pošiljanje e-pošte | ZDA | SCC / DPF | ☐ |
| Cloudflare | domena, prejem e-pošte | ZDA | SCC / DPF | ☐ |
| Google | prijava z Google računom | ZDA | SCC / DPF | ☐ |
| Anthropic | AI asistentka Pupa | ZDA | SCC | ☐ |
| FreeTSA | časovni žig (samo 32 bajtov zgostitve) | Nemčija (EU) | ni prenosa osebnih podatkov | n. r. |
| ponudnik plačil (MoR) | obračun naročnine | **[DOPOLNI]** | **[DOPOLNI]** | ☐ |

**Odprto:** kljukice v zadnjem stolpcu so prazne. Dokler DPA niso podpisane, je
ta evidenca formalno nepopolna, tudi če je tehnično vse urejeno.

---

## 5. Tehnični in organizacijski ukrepi

**Ločevanje podatkov med uporabniki**

- Varnost na ravni vrstice (RLS) je vklopljena na **vseh 59 tabelah** —
  preverjeno 23. 8. 2026 s pregledom vseh migracij.
- Pravila so vezana na organizacijo prek funkcij `is_organization_member` in
  `sme_videti_zapis`; brisanje je omejeno na skrbnike.
- Namenoma javno berljive so **tri** politike, vse na javnem registru podjetij
  (`podjetja`, `register_meta`). Edina pravica za neprijavljene je
  `select on public.podjetja` — javni podatki AJPES in FURS.

**Zaščita dostopa**

- Prijava prek Supabase Auth; med zaprto beto dodaten zaklep na ravni middlewara.
- Ključi uporabnikovih povezav do zunanjih ponudnikov AI so šifrirani.
- Omejevanje pogostosti klicev na 11 javnih vmesnikih; preverjanje oblike UUID.
- Žetoni za portal stranke se hranijo **zgoščeni**, ne v izvirni obliki.
- Naslovi IP pri povpraševanjih se hranijo **zgoščeni**; nezgoščeni le pri
  elektronskem podpisu, kjer so dokazno gradivo.

**Prenos in hramba**

- Ves promet po HTTPS; podatki v mirovanju šifrirani pri ponudniku.
- Baza stoji v EU (Supabase, eu-north-1 Stockholm) — potrjeno 23. 8. 2026.
- **Varnostnih kopij baze trenutno NI.** Projekt je na paketu Free, ki
  samodejnih kopij ne vključuje; nadzorna plošča kaže »No backups«. To je
  odprto neskladje s členom 32(1)(c) GDPR, ki zahteva zmožnost pravočasne
  povrnitve podatkov ob incidentu. **Odpraviti pred prvimi plačljivimi
  uporabniki.** Stanje na dan 23. 8. 2026.

**Organizacijsko**

- Do produkcijskih podatkov dostopa **[DOPOLNI: kdo]**.
- Postopek ob kršitvi varnosti podatkov (72 ur, 33. člen) — **[PRAVNIK]**,
  še ni zapisan.

---

## 6. Kaj je treba dopolniti

| # | naloga | kdo |
|---|---|---|
| 1 | ~~preveriti regijo Supabase~~ — **opravljeno 23. 8. 2026: EU, Stockholm** | ✔ |
| 1b | **vzpostaviti varnostne kopije baze** (Free paket jih nima) | upravljavec, **nujno** |
| 2 | podpisati DPA z vsemi podobdelovalci | upravljavec |
| 3 | dodati pogodbo o obdelavi v splošne pogoje (naša vloga obdelovalca) | pravnik |
| 4 | določiti roke hrambe, označene z [DOPOLNI] | upravljavec |
| 5 | potrditi zakonske roke za račune in evidenco delovnega časa | računovodja, pravnik |
| 6 | zapisati postopek ob kršitvi varnosti podatkov | pravnik |
| 7 | potrditi, da imenovanje DPO ni obvezno | pravnik |

---

*Evidenco je treba posodobiti ob vsaki novi dejavnosti obdelave, novem
podobdelovalcu ali spremembi namena. Zadnji pregled: 23. 8. 2026.*

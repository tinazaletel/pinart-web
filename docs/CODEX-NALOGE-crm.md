# Naloge za Codex — osma runda, 20. 8. 2026

Projekt: `~/Desktop/Pinart website/pinart-web`. Slovenska koda in komentarji.

Ena naloga: **stranka kot vozlišče**. Je največja od preostalih in edina, ki
spremeni, kako se z orodjem dela.

## Pravila

- **NE dotikaj se** (drugi delajo v njih): `components/AgentTabla.tsx`,
  `components/PupaDom.tsx`, `components/Pupa.tsx`, `components/FlowCloudBridge.tsx`,
  `components/PortalOgled.tsx`, `components/DeliSStranko.tsx`,
  `lib/projektiOblak.ts`, `lib/casovniZig.ts`, `lib/evidencaCasa*.ts`,
  `components/EvidencaCasa.tsx`, `app/api/agent-naloge/**`, `app/api/cron/**`,
  `app/api/sef/**`, `app/api/portal/**`, `vercel.json`
- **NE poganjaj `npm run build`** (dev na 3456). Preverjaj z `npx tsc --noEmit`
  in `npx vitest run`.
- Migracijo samo napiši; številka naj bo **`20260821010000_crm_dnevnik.sql`**.
  Nižje številke so zasedene.
- Paleta: vijola `#6E4FA6`, napaka `#a4342a`, uspeh `#2F5D50`. **Rumene ni.**

---

## Zakaj to šteje

Danes so podatki razporejeni po orodjih: ponudbe v enem seznamu, projekti v
drugem, računi v tretjem. Ko Tina po treh mesecih pokliče stranka, mora
odgovor sestaviti iz štirih zaslonov — in prav takrat je videti neurejeno.

Stranka je v resnici **vozlišče**: vse, kar smo kdaj naredili, visi na njej.
Ko odpreš stranko, moraš v petih sekundah vedeti, pri čem sta.

To je tudi razlika do splošnih orodij. Notion ima strani, Flow ima stranko,
ki ve, koliko je zaslužila in kaj ji še dolgujemo.

## Kaj je treba narediti

**1. Profil stranke = ena stran, ki potegne vse skupaj.**
Poišči obstoječi profil stranke (`grep -rn "profil\|Profil" components/ | grep -i strank`)
in ga razširi, ne gradi novega. Na njem naj bo:

- **Povzetek na vrhu:** koliko je stranka skupaj plačala, koliko je odprtih
  računov, kdaj je bilo zadnje delo, kdaj zadnji stik.
- **Projekti** te stranke, z rokom in stanjem.
- **Dokumenti**: ponudbe, pogodbe, računi, retainerji — v enem seznamu,
  razvrščeni po datumu, z jasno oznako vrste.
- **Roki**: kaj poteče (vključno z licencami, ki so že v `lib/licencePotek`).
- **Dnevnik** (novo, spodaj).

Podatke sestavi iz obstoječih shramb; **ne podvajaj** jih v novo tabelo.

**2. Dnevnik stikov — edini nov zapis.**
Kratek zapis: datum, vrsta (klic / sestanek / mail / opomba), besedilo,
neobvezna povezava na projekt.

- Migracija: `public.crm_dnevnik` z `organization_id`, `external_id`,
  `stranka_external_id`, `projekt_external_id` (neobvezno), `vrsta`, `besedilo`,
  `zgodilo_se` (timestamptz), `updated_at`, `deleted_at`. RLS po vzorcu
  sosednjih migracij, unikatni indeks na `(organization_id, external_id)`.
- Sinhronizacija po **identičnem vzorcu** kot `lib/projektiOblak.ts`
  (external_id = lokalni id, upsert, mehko brisanje, najnovejši `updatedAt`
  zmaga, primerjava podpisa). To datoteko **beri**, ne spreminjaj.
- Vpis naj bo ena vrstica in Enter. Če za vsak klic rabiš modalno okno,
  nihče tega ne bo uporabljal.

**3. Zadnji stik naj se osvežuje sam.**
Poslan mail iz Flowa in poslana ponudba naj samodejno zapišeta vrstico v
dnevnik. Ročno vpisovanje je za klice in sestanke; vse, kar orodje že ve,
naj vpiše samo.

**4. Nič novega jezika za uporabnico.**
Ne uvajaj besede »CRM« v vmesnik. Stran je še vedno **stranka**. Ime naj
ostane ime.

## Česa NE delaj

- Brez lijaka, stopenj posla in verjetnosti sklenitve. Tina prodaja
  drugače — to je prodajni CRM in bi ga morala vzdrževati.
- Brez uvoza kontaktov iz zunanjih virov v tej rundi.
- Ne spreminjaj strukture ponudb, pogodb ali računov. Samo bereš.

# CODEX — zaledne naloge za pred-launch trdnjavo (Pinart Flow)

> Namen: Codex utrdi ZALEDJE (podatki / varnost / integritete) pred launchom.
> Ta dokument je pisan na dejansko kodo v repozitoriju (stanje 2026-08-10).
>
> **Codex se sme dotikati SAMO:** `lib/*`, `app/api/*`, `supabase/migrations/*`
> (nove datoteke), `middleware.ts`.
> **Codex se NE sme dotikati:** nobenega `components/*.tsx`, `*.module.css`,
> `pregled.module.css`, ostalega UI. UI gating (ključavnice, zasloni, potrditveni
> koraki) naredi Claude/Tina kasneje. Codex pripravi samo podatkovni sloj +
> tipizirane funkcije + API + RLS + migracije.
>
> **Železna pravila (veljajo za vsako nalogo):**
> 1. Vse migracije so **aditivne in povratno združljive** — `add column if not
>    exists`, `create table if not exists`, `create ... if not exists`, novi enumi
>    prek `do $$ ... exception when duplicate_object then null; end $$;`. Nikoli
>    `drop column`, nikoli oženje tipov, nikoli `not null` na obstoječ stolpec brez
>    `default` in backfilla.
> 2. Ne uvajaj FURS na slepo. Loči **interno izdajo dokumenta** od **davčne
>    potrditve**. Launch je BREZ FURS integracije — pripravi le model + integracijsko
>    točko (glej #1).
> 3. Plačilni ponudnik in FURS sta **ločena** sistema; ne mešaj ju.
> 4. Ne trdi pravne/davčne skladnosti. Komentarji naj opisujejo mehaniko, ne
>    zagotavljajo skladnosti.
> 5. Vsak korak: **`npx tsc --noEmit` = 0 napak.** Če se dela SQL, `supabase db`
>    migracija naj bo sintaktično veljavna (ne izvajaj je proti produkciji — Tina jo
>    požene ročno).
> 6. Service-role ključ (`SUPABASE_SERVICE_ROLE_KEY`) sme uporabljati SAMO koda v
>    `app/api/**` prek `utils/supabase/admin.ts` (`createAdminClient()`), nikoli
>    komponenta z `'use client'`. Brskalniški odjemalec = `@/utils/supabase/client`.
> 7. Nove tabele: vedno `enable row level security`, eksplicitne politike in
>    eksplicitni `grant ... to authenticated` (+ `to service_role`, kjer je API
>    pisatelj). Nikoli `grant ... on all tables` (glej komentar v
>    `20260722060000_service_role_grants.sql`).

---

## 0. Povzetek trenutnega stanja (na kar se naloge navezujejo)

### Shramba in sinhronizacija

- **`lib/pinartFlowStore.ts`** — localStorage je trenutno **vir resnice**. Ključ
  `FLOW_KEY = 'pinart-flow-data-v1'`, oblika `FlowData { version:1, offers,
  invoices, expenses, contracts, clients }`. Tipi `FlowInvoice`, `FlowExpense`,
  `FlowOffer`, `FlowContract`, `FlowClient` so tu.
  - ID-ji: novi zapisi dobijo `crypto.randomUUID()` (npr. račun v
    `InvoiceWorkspace.tsx:375`); legacy stranke dobijo FNV-hash `stableId`.
  - `saveFlowCollection` / `saveOffers` / `saveOfferStatus` / `saveOfferAmount`
    zapišejo v localStorage, sprožijo `pinart-flow-change` dogodek, izračunajo
    `removedIds` in kličejo `deleteCloudRecords`, ter `scheduleCloudSync(next)`.
  - `scheduleCloudSync` prek `queueMicrotask` uvozi `pinartFlowCloud` in kliče
    `pushFlowData` ob **vsaki** shrambi (torej push je pogost; pull je redek).

- **`lib/pinartFlowCloud.ts`** — Supabase branje/pisanje na organizacijo.
  - `getOrganizationContext()` — vzame `auth.getUser()`, prebere
    `organization_members`, upošteva `ACTIVE_ORGANIZATION_KEY` (localStorage), sicer
    `rpc('ensure_user_organization')`.
  - `pushFlowData(data)` — upsert v `clients/offers/invoices/expenses/contracts` z
    `onConflict: 'organization_id,external_id'`. **Status računa se izpelje kot
    `invoice.paid ? 'paid' : 'sent'` (vrstica ~161)** — torej se `'draft'`,
    `'overdue'`, `'cancelled'` iz klienta NIKOLI ne zapišejo.
  - `pullFlowData()` — prebere vse po `organization_id`.
  - `mergeFlowData()` / `merge()` — **zlivanje je last-writer-wins po `id`, kjer
    LOKALNO povozi oblak; NI primerjave `updated_at`/verzije.** To je jedro rizika
    izgube podatkov na 2 napravah (glej #4).
  - Datoteke: `uploadBusinessDocument(file, section, externalId)` -> pot
    `{org}/{section}/{externalId}/{Date.now()}-{safeName}`, `upsert:false`;
    `getBusinessDocumentUrl(path, expiresIn=60)` -> signed URL 60 s;
    `deleteBusinessDocument(path)` -> preveri `path.startsWith('{org}/')`.
  - Nastavitve/cilji/izvozi/retainerji: `saveCloudSettings`, `loadCloudSettings`,
    `saveBusinessGoal`, `recordAccountingExport`, `listAccountingExports`,
    `saveRetainerDraft`.

- **`components/FlowCloudBridge.tsx`** (UI — Codex NE spreminja, samo referenca):
  - **»sync le enkrat na sejo«**: `sessionStorage[SESSION_KEY] === 'done'` na
    vrstici 109 preskoči `synchronize()`. Prvi sync na sejo naredi
    `pull -> merge(cloud, local) -> writeFlowDataLocally -> (pri prvi migraciji)
    pushFlowData`. Če je `legacyMigrationCompletedAt` nastavljen, **oblak zmaga**
    (`merged = cloud`), sicer `mergeFlowData(cloud, local)`.
  - `poravnajRacun()` ob preklopu računa počisti vse `pinart-*` localStorage ključe
    in resetira predogled na `mine` (demo-bleed fix).

### Predogled / demo

- **`lib/predogled.ts`** — `Predogled = 'empty' | 'zacetek' | 'mine' | 'demo'`,
  shranjen v localStorage `'pinart-predogled'`. `demoPodatki()` vrne izmišljen
  `FlowData`. Demo je **samo za gledanje**; guard je trenutno le v UI (npr.
  `InvoiceWorkspace.tsx:371` — če `samoOgled`, ne shrani). Ni strežniške ovire.

### Pravice / paketi

- **`lib/pinartFlowEntitlements.ts`** — `AccessTier = 'anonymous'|'free'|'pro'`,
  `FlowFeature` (calculator, cloudBackup, clients, contracts, expenses,
  accountingExport, aiConnector …), `canUseFeature(tier, feature)`,
  `getAccessTier()` (tester/dodelitev -> pro; sicer RPC
  `current_organization_entitlements`). **Tukaj gre razširitev vloga→pravice (#6).**
- **`lib/dostop.ts`**, **`lib/testerji.ts`** — zaprta beta (tabela `flow_dostop`,
  RPC `flow_dostop_za`, env `NEXT_PUBLIC_BETA_TESTERJI`).

### Pošta

- **`lib/posta.ts`** — klient helper `posljiMail()` -> POST `/api/posta`.
- **`app/api/posta/route.ts`** — Resend pošiljanje. Validira prejemnike (regex,
  ≤50), dolžino zadeve (≤300). **NIMA preverjanja seje (kdorkoli lahko POST-a),
  NIMA dnevnika, NIMA demo blokade.**
- **`lib/postaDnevnik.ts`** — LOKALNI dnevnik pošte (localStorage
  `'pinart-posta-dnevnik'`), vezan na projekt/stranko.
- **`app/api/posta/prejeto/route.ts`** — inbound webhook, `INBOUND_SECRET` +
  `createAdminClient()`, zapiše v `project_mail` (direction='in'), de-dup 23505.
- **`app/api/racunovodstvo/send/route.ts`** — preveri sejo, preveri da je URL
  signed URL Supabase busketa, preveri da se `recipient` ujema z
  `organization_settings.accounting_email`. Dober vzorec za posnemati.

### Pupa (AI)

- **`app/api/pupa/route.ts`** — POST z `{ vprasanje, kontekst, zgodovina }`, kliče
  Anthropic z `ANTHROPIC_API_KEY`. **NIMA preverjanja seje, NIMA rate-limita, NIMA
  omejitve dolžine vprašanja/konteksta, in v napaki vrne `podrobnost: t.slice(0,300)`
  (potencialno del Anthropic napake uporabniku).** Zgodovina je odrezana na zadnjih
  8 sporočil.

### Migracije (obstoječe) in RLS vzorec

Tabele (vse `enable row level security`): `organizations`, `profiles`,
`organization_members`, `clients`, `offers`, `contracts`, `invoices`, `expenses`,
`business_goals`, `accounting_exports`, `retainers`, `organization_settings`,
`organization_subscriptions`, `project_mail`, `project_inbox`, `flow_dostop`,
`chat_thread`/`chat_participant`/`chat_message`, `business_plans`,
`business_canvases`, analitika (`cenovne_tocke`, `dogodki`), `obiski`, presence.

Ključni RLS vzorci:
- **Večina poslovnih tabel:** `for all using (public.is_organization_member(org))
  with check (is_organization_member(org))` — **vsak član org lahko dela vse**
  (ni per-vloga ločevanja).
- **`is_organization_admin(org)`** (owner|admin) uporabljen le za update
  organizacije in za `organization_members` (manage memberships).
- **`membership_role` enum = `('owner','admin','member','accountant')`** — NI
  `viewer`, NI `accounting` (obstaja `accountant`).
- Enotnost dokumentov: `unique (organization_id, number)` na `offers` in
  `invoices`; `unique (organization_id, external_id)` prek indeksov na vseh 5
  glavnih tabelah.
- **Chat** kaže »pravi« RLS vzorec po e-mailu: `is_chat_participant(thread)` prek
  `auth.jwt() ->> 'email'` — vzorec za člane/povabila (#6).
- Service-role dobi eksplicitne `grant`-e per tabelo
  (`20260722060000_service_role_grants.sql`).

### Številčenje računa (trenutno)

`components/InvoiceWorkspace.tsx:192`:
```
const nextNumber = () => {
  const year = new Date().getFullYear();
  const count = invoices.filter(item => item.number?.startsWith(String(year))).length + 1;
  return `${year}-${String(count).padStart(4, '0')}`;
};
```
Torej: **klientsko** štetje localStorage računov za tekoče leto, format `YYYY-NNNN`.
Ni atomsko, ni strežniško, **predračun in račun delita isto zaporedje** (predračun
je le `predracun: boolean` na `FlowInvoice`). DB ima `unique(organization_id,
number)`, a klient številko izračuna sam -> na 2 napravah/dveh zavihkih obe dobita
isto številko in druga upsert-a v konflikt (23505) ali povozi.

---

## Naloge

Vsaka naloga: (1) trenutno stanje, (2) zahtevana sprememba, (3) datoteke, (4)
migracije, (5) API poti, (6) kriterij dokončanja, (7) `npx tsc --noEmit = 0`.

---

## #6 — Vloge & polni RLS sistem (D2)  ⭐ TEMELJ

> Naredi PRVA. Ostale naloge (računi, audit, storno, priponke) se naslanjajo na
> `role_at_least()` / članske funkcije, ki jih uvedeš tu.

**(1) Trenutno stanje.** `membership_role` enum = owner/admin/member/accountant.
Vse poslovne tabele imajo eno samo politiko `is_organization_member` za VSE (CRUD).
Ni razlikovanja po vlogi. Ni `viewer`. Ni tabele povabil. `is_organization_admin`
pokriva le owner|admin. Helper vloga→pravice ne obstaja (`pinartFlowEntitlements.ts`
pozna le tier free/pro).

**(2) Zahtevana sprememba.**
- Razširi vlogo na model **owner / admin / accounting / member / viewer**. Ker je
  `accountant` že v enumu, ga OBDRŽI kot alias (ne briši), doda pa se **`viewer`**
  in **`accounting`** kot novi vrednosti enuma (aditivno; `accountant`≈`accounting`
  — v helperju ju obravnavaj enakovredno).
- SQL pomožne funkcije (security definer, `search_path=public`):
  - `public.membership_role_of(org uuid) returns membership_role` — vloga trenutnega
    uporabnika v org (ali null).
  - `public.role_at_least(org uuid, min membership_role) returns boolean` — rangno
    primerjanje (owner>admin>accounting>member>viewer; `accountant`=`accounting`).
  - Obdrži obstoječi `is_organization_member` / `is_organization_admin` nedotaknjena
    (povratna združljivost).
- **RLS po vlogi** (dodaj kot NOVE politike ob obstoječih; ne rušimo obstoječih, da
  ostane povratno združljivo — nove so strožje in se AND-ajo prek ločenih `for`
  operacij). Praktično: za vsako glavno tabelo (`clients`, `offers`, `invoices`,
  `expenses`, `contracts`, `retainers`, `accounting_exports`, `organization_settings`)
  zamenjaj obstoječo `for all` politiko z ločenimi:
  - `for select using (is_organization_member(org))` — viewer+ bere.
  - `for insert / update with check (role_at_least(org,'member'))` — viewer NE piše.
  - `for delete using (role_at_least(org,'admin'))` — brisanje le admin+ (računi
    posebej: glej #3 — računi se ne brišejo).
  - `invoices`/`accounting_exports`: `accounting` in `admin`+ smeta izdati/izvoziti;
    `member` sme le osnutke; `viewer` bere. (Podrobno izdajanje ureja #3, tu le
    grobo RLS + helper.)
  > Ker `drop policy if exists` + `create policy` NE spremeni podatkov in je
  > idempotentno, to velja kot aditivna migracija (shema se ne oži).
- **Cross-org izolacija:** vsaka politika MORA filtrirati po `organization_id` prek
  članstva; nobena naj se ne opira na klientov `organization_id` brez preverbe
  članstva. (Trenutno je OK — ohrani.)
- **Povabila članov (data sloj):** nova tabela `organization_invites` z žetonom.
- **Helper `lib/pinartFlowEntitlements.ts`:** doda `FlowRole` tip in
  `roleCan(role, action)` mapo (vloga→pravice), npr.
  `type FlowRole='owner'|'admin'|'accounting'|'member'|'viewer'`,
  `roleAtLeast(role, min)`, `canIssueInvoice(role)`, `canDelete(role)`,
  `canManageMembers(role)`, `canExportAccounting(role)`. Čisti TS, brez UI.
  Doda tudi `getMembershipRole(): Promise<FlowRole|null>` (bere prek novega RPC
  `membership_role_of` ali iz `organization_members`).

**(3) Datoteke.** `lib/pinartFlowEntitlements.ts` (helper), nova migracija.
Opcijsko nov `lib/clani.ts` (data helperji za člane/povabila: `listMembers()`,
`createInvite()`, `acceptInvite(token)`), da UI kasneje samo kliče.

**(4) Migracije (aditivno).** `supabase/migrations/20260811090000_roles_members_invites.sql`:
- `alter type public.membership_role add value if not exists 'accounting';`
  `alter type public.membership_role add value if not exists 'viewer';`
  (POZOR: `add value` ne more teči v isti transakciji kot uporaba nove vrednosti;
  daj enum spremembe v svojo migracijo ali na vrh, ločeno.)
- funkcije `membership_role_of`, `role_at_least` (+ `grant execute ... to
  authenticated`).
- prekvalificirane politike (glej zgoraj).
- tabela `organization_invites (id uuid pk, organization_id uuid fk, email text,
  role membership_role not null default 'member', token text not null unique,
  invited_by uuid, accepted_at timestamptz, expires_at timestamptz, created_at)`,
  RLS: admini org berejo/ustvarjajo (`is_organization_admin`), sprejem povabila
  prek security-definer RPC `accept_organization_invite(token text)` (doda člana v
  `organization_members`), `grant execute ... to authenticated`.

**(5) API poti (nove).** Opcijsko `app/api/clani/route.ts` (GET seznam, POST
povabi, DELETE odstrani) — vse s sejo + `role_at_least(org,'admin')`; ALI pusti, da
UI kliče Supabase neposredno prek RLS (raje slednje, manj površine). Sprejem
povabila prek strežniške poti `app/api/clani/sprejmi/route.ts` (kliče RPC).

**(6) Kriterij dokončanja.** Nov enum vsebuje viewer+accounting; `role_at_least`
pravilno rangira; RLS: viewer ne more INSERT/UPDATE, member ne more DELETE, ne-član
ne vidi nič (test v #11); `organization_invites` + `accept_organization_invite`
delujeta; helper izvozi `FlowRole`, `roleAtLeast`, `roleCan`; `getMembershipRole()`
vrne pravo vlogo.

**(7)** `npx tsc --noEmit` = 0.

---

## #2 — Varno strežniško številčenje računov  ⭐ (odvisno od #6 helperja)

**(1) Trenutno stanje.** `InvoiceWorkspace.tsx:192` `nextNumber()` šteje localStorage
račune klientsko, format `YYYY-NNNN`. Predračun deli isto zaporedje. Ni atomsko;
DB `unique(organization_id, number)` je edina zaščita, a številko določi klient.
Push mapira `status = paid?'paid':'sent'`.

**(2) Zahtevana sprememba.** Uvedi **strežniško, atomsko, zaporedno** dodeljevanje
številk, ločeno po **organizaciji + letu + vrsti dokumenta** (račun vs predračun
ločeni seriji). Ročni vnos številke le kot **admin izjema** (member ne sme povoziti).
- Nova tabela zaporedij + `security definer` RPC, ki v eni transakciji atomsko
  poveča števec in vrne naslednjo številko (`select ... for update` ali
  `insert ... on conflict do update ... returning`).
- Format konfigurabilen a privzeto `{leto}-{zaporedna:0>4}` za račun in
  `P-{leto}-{zaporedna:0>4}` (ali `PR-`) za predračun — ločena serija.
- Klient (UI, kasneje) kliče RPC ob izdaji, ne ob odpiranju obrazca. Codex pripravi
  data funkcijo v `lib/` in RPC; **UI menja Claude**.
- Migracija obstoječih: enkraten backfill, ki za vsako org+leto+vrsto nastavi
  števec na `max(obstoječa zaporedna)` iz `invoices.number`, da se nove ne
  prekrivajo s starimi.

**(3) Datoteke.** Nov `lib/stevilcenje.ts` (`export async function
naslednjaStevilka(kind: 'racun'|'predracun'): Promise<string>` — kliče RPC prek
`@/utils/supabase/client`; + tip). Nova migracija. (InvoiceWorkspace NE spreminjaj —
samo dokumentiraj v tej datoteki, katero funkcijo naj UI pokliče.)

**(4) Migracije.** `20260811100000_invoice_numbering.sql`:
- `create table if not exists public.document_counters (organization_id uuid, leto
  int, vrsta text check (vrsta in ('racun','predracun')), zadnja int not null
  default 0, updated_at timestamptz default now(), primary key
  (organization_id, leto, vrsta));` RLS: member bere/piše svojo org (a pisanje le
  prek RPC — glej spodaj), `grant`.
- RPC `public.dodeli_stevilko(p_vrsta text) returns text` (security definer,
  `search_path=public`): ugotovi org iz `auth.uid()` (kot `ensure_user_organization`),
  leto=`extract(year from current_date)`, `insert ... on conflict
  (organization_id,leto,vrsta) do update set zadnja = document_counters.zadnja+1
  returning zadnja` (za nov vnos ročno +1), sestavi in vrne formatirano številko.
  `grant execute ... to authenticated`. Preveri `role_at_least(org,'member')` (iz #6).
- Backfill: `insert into document_counters ... select organization_id, ...
  max(...) ...` iz obstoječih `invoices` (ovij v `on conflict do update`).
- Ohrani `unique(organization_id, number)` (že obstaja) kot varovalo.

**(5) API poti.** Ni nujno nova pot — RPC prek klienta zadošča. Če hočeš strežniško
mejo, `app/api/racuni/stevilka/route.ts` (POST, seja, kliče RPC). Opcijsko.

**(6) Kriterij dokončanja.** Dva zaporedna klica RPC vrneta zaporedni številki brez
podvajanja; račun in predračun imata ločeni seriji; hkratna klica (test #11) ne
vrneta iste; backfill ne trči s starimi; ročna številka dovoljena le admin+ (helper
`canOverrideNumber(role)`).

**(7)** `npx tsc --noEmit` = 0.

---

## #4 — LocalStorage ↔ Supabase: vir resnice + konflikti

**(1) Trenutno stanje.** `mergeFlowData`/`merge` v `pinartFlowCloud.ts` je
last-writer-wins po `id`, kjer **lokalno vedno povozi oblak**, brez primerjave
`updated_at`. `FlowCloudBridge` sinhronizira **enkrat na sejo** (sessionStorage). Na
2 napravah lahko starejši lokalni zapis povozi novejši oblačni. Neprijavljen
uporabnik ima le localStorage, brez opozorila. Ni izvoza lokalnih podatkov.

**(2) Zahtevana sprememba.**
- **Supabase = vir resnice za prijavljene; local = cache.** Uvedi
  `updated_at`-osnovan konflikt: vsak `FlowInvoice/Offer/Expense/Contract/Client`
  dobi `updatedAt: string` (ISO) v tipu (neobvezno; stari zapisi = undefined ->
  obravnavaj kot najstarejše). Baza že ima `updated_at` na vseh tabelah.
- `merge()` -> **`mergeByUpdatedAt(cloud, local)`**: za vsak `id` izberi zapis z
  novejšim `updatedAt`; če je eden undefined, zmaga tisti z definiranim; če oba
  undefined, ohrani obstoječe obnašanje (local). Doda tudi »tombstone« zaščito: če
  je bil zapis izbrisan v oblaku (soft-delete iz #3), ga local ne obudi.
- Zaščita pred prepisom novejšega: `pushFlowData` naj v upsert vključi
  `updated_at` iz zapisa (ne vedno `now()`), da strežnik ne »pomladi« starega
  zapisa. Kjer klient spremeni zapis, `pinartFlowStore` nastavi `updatedAt = now()`.
- **Flag/opozorilo za neprijavljene:** doda `lib/` funkcijo
  `export function jeSamoLokalno(): boolean` (true, če ni seje) in
  `export function oznaciNesinhronizirano()` — UI (Claude) pokaže opozorilo »ni
  varnostne kopije«. Codex samo data/flag.
- **Izvoz lokalnih podatkov:** `export function izvoziFlowJSON(): string`
  (serializira `loadFlowData()` + nastavitve) za »prenesi moje podatke«. Čisti TS.

**(3) Datoteke.** `lib/pinartFlowStore.ts` (dodaj `updatedAt` v tipe + nastavljaj
ga ob shrambi; `izvoziFlowJSON`, `jeSamoLokalno`), `lib/pinartFlowCloud.ts`
(`mergeByUpdatedAt`, upsert z `updated_at`, upoštevanje tombstonov iz #3).
**FlowCloudBridge.tsx NE spreminjaj** — obstoječi klic `mergeFlowData` ostane
istega imena/signature (interno preusmeri na novo logiko), da UI ostane nedotaknjen.

**(4) Migracije.** Ni nujna (stolpci `updated_at` obstajajo). Če dodaš tombstone,
gre skupaj z #3 (`deleted_at`). Nič drugega.

**(5) API poti.** Ni novih.

**(6) Kriterij dokončanja.** Novejši oblačni zapis se ob sync-u NE povozi s
starejšim lokalnim (test #11 »izguba omrežja«); soft-deletan zapis se ne obudi;
`izvoziFlowJSON()` vrne veljaven JSON; obstoječi zapisi brez `updatedAt` delujejo.

**(7)** `npx tsc --noEmit` = 0.

---

## #3 — Zaklep izdanih + revizijska sled + soft-delete + STORNO temelj  ⭐ (odvisno od #6)

**(1) Trenutno stanje.** `invoice_status` enum = draft/sent/paid/overdue/cancelled
(cancelled obstaja, a klient ga ne piše — push mapira le paid/sent). Ni razlike
osnutek/izdan pri pisanju; vsak upsert povozi. Ni audit loga. `deleteCloudRecords`
naredi **hard delete**. Ni storno funkcije.

**ODLOČENO (Tina):** računi = **NIKOLI hard-delete**, vidna stornacija; ponudbe +
osnutki = izbris OK.

**(2) Zahtevana sprememba.**
- **Osnutek uredljiv; izdan zaklenjen.** Doda `invoices.issued_at timestamptz`
  (null=osnutek). Ko je `issued_at` postavljen, RLS/trigger prepreči UPDATE
  vsebinskih polj (amount, items, client, number, dates) — dovoljene le
  status-tranzicije (sent->paid->overdue) in storno.
- **Sprememba izdanega = nova verzija/popravek.** Doda `invoices.version int default
  1` in `invoices.supersedes_id uuid` (kaže na račun, ki ga popravek nadomešča).
  Popravek je nov zapis; izvirnik ostane, označen.
- **Brisanje = soft-delete.** Doda `deleted_at timestamptz` (+ `deleted_by uuid`) na
  `invoices`, `offers`, `contracts`, `expenses`. Računi: `deleted_at` se NE sme
  postaviti, dokler je `issued_at` not null (le storno). Ponudbe/osnutki: soft-delete
  dovoljen. `deleteCloudRecords` za račune -> zavrni/preusmeri na storno; za
  ponudbe/osnutke -> `update ... set deleted_at=now()` (ne hard delete).
  `pullFlowData` filtrira `deleted_at is null`.
- **Storno.** Doda status `cancelled` uporabo + `storno_of_id uuid` (protivknjižba:
  nov zapis z negativnim zneskom ali oznako) in `cancelled_at`, `cancel_reason`.
  RPC `storniraj_racun(p_id uuid, p_razlog text)` (security definer): označi
  original `status='cancelled'`, ustvari protivknjižbo, zapiše v audit. Le
  `role_at_least(org,'accounting')`.
- **Audit log.** Nova tabela `document_audit` (org, tabela, record_id, user_id,
  dejanje enum create/update/issue/cancel/delete, staro jsonb, novo jsonb,
  created_at). Polnjenje prek **trigger funkcije** na invoices/offers/contracts/
  expenses (security definer), da je zapis nespremenljiv (append-only; brez UPDATE/
  DELETE grantov za authenticated). Bere ga član (`is_organization_member`), piše
  le trigger.

**(3) Datoteke.** `lib/pinartFlowStore.ts` (tipi: `issuedAt?`, `version?`,
`supersedesId?`, `deletedAt?`, `cancelledAt?`, status razširi z uporabo
`cancelled`), `lib/pinartFlowCloud.ts` (push mapira `issued_at`, `deleted_at`,
`version`, status vključno cancelled; `deleteCloudRecords` -> soft-delete/zavrnitev
za račune; `pullFlowData` filtrira deleted; nova `stornirajRacun(id, razlog)` ->
RPC; nova `listAudit(recordId)`). Nova migracija.

**(4) Migracije.** `20260811110000_invoice_lock_audit_storno.sql`:
- `alter table invoices add column if not exists issued_at timestamptz;`
  `... version int not null default 1; ... supersedes_id uuid references
  invoices(id); ... storno_of_id uuid references invoices(id); ... cancelled_at
  timestamptz; ... cancel_reason text; ... deleted_at timestamptz; ... deleted_by
  uuid;`
- `alter table offers/contracts/expenses add column if not exists deleted_at
  timestamptz; ... deleted_by uuid;`
- trigger funkcija + trigger za audit; tabela `document_audit` (+RLS append-only,
  grant select to authenticated, brez insert/update/delete za authenticated —
  vpiše security-definer trigger; grant za service_role).
- trigger/politika, ki prepreči vsebinski UPDATE, ko `issued_at is not null` (razen
  status/cancel polj). Zaradi povratne združljivosti: privzeto vsi obstoječi računi
  imajo `issued_at = null` (=osnutek/uredljiv) — backfill NI potreben, a razmisli o
  `update invoices set issued_at = created_at where status <> 'draft'` kot
  enkratnem, opcijskem koraku (dokumentiraj, pusti zakomentirano, naj Tina odloči).
- RPC `storniraj_racun`.

**(5) API poti.** Opcijsko `app/api/racuni/storno/route.ts` (seja + accounting+,
kliče RPC). Raje RPC prek klienta.

**(6) Kriterij dokončanja.** Izdan račun (`issued_at` set) se ne da vsebinsko
UPDATE-ati (test #11); hard-delete računa ni mogoč (soft/storno); storno ustvari
protivknjižbo + audit; ponudbe/osnutki gredo v soft-delete; `document_audit` beleži
staro→novo in ni pobrisljiv iz klienta; `pullFlowData` skrije deleted.

**(7)** `npx tsc --noEmit` = 0.

---

## #1 — Davčni status MODEL (samo data; UI naredi Claude)

**(1) Trenutno stanje.** Status računa je izpeljan (`paid?'paid':'sent'`), brez
pojma »davčno potrjen«. Ni EOR/ZOI polj. FURS ni integriran.

**(2) Zahtevana sprememba.** Uvedi eksplicitno stanje življenjskega cikla, LOČENO
od davčne potrditve:
- **Interni status:** `Osnutek / Izdan / Plačan` (naslon na `issued_at` iz #3 +
  `status`).
- **Davčna potrditev:** ločena polja `fiscal_confirmed_at timestamptz`,
  `fiscal_eor text` (Enkratna Oznaka Računa), `fiscal_zoi text` (Zaščitna Oznaka
  Izdajatelja), `fiscal_provider text`. **»Davčno potrjen« se NIKOLI ne nastavi
  ročno** — le sistem/integracija sme zapisati ta polja (RLS/trigger prepreči, da
  bi jih authenticated postavil; sme le service-role prek prihodnje FURS poti).
- Brez `fiscal_eor`/`fiscal_zoi` račun **NI** davčno potrjen (izpeljano:
  `fiscal_confirmed_at is null`).
- **Integracijska točka za prihodnost:** prazna strežniška pot
  `app/api/furs/potrdi/route.ts`, ki vrne 501/503 »FURS integracija še ni
  aktivna« (launch je BREZ FURS) in vsebuje komentar, kje se bo klicalo FURS +
  zapisalo EOR/ZOI prek service-role. NE implementiraj dejanske FURS logike.

**(3) Datoteke.** `lib/pinartFlowStore.ts` (tipi + čist helper
`davcniStatus(inv): 'osnutek'|'izdan'|'placan'` in `jeDavcnoPotrjen(inv): boolean`),
`lib/pinartFlowCloud.ts` (bere/piše fiscal polja le za branje na klientu),
nova prazna API pot, migracija.

**(4) Migracije.** `20260811120000_fiscal_status.sql`: `alter table invoices add
column if not exists fiscal_confirmed_at timestamptz; ... fiscal_eor text; ...
fiscal_zoi text; ... fiscal_provider text;` + RLS/trigger: `authenticated` NE sme
UPDATE teh 4 stolpcev (le service_role). Aditivno.

**(5) API poti.** `app/api/furs/potrdi/route.ts` — stub (503/501 + komentar).

**(6) Kriterij dokončanja.** `davcniStatus()`/`jeDavcnoPotrjen()` delujeta; fiscal
polja se iz klienta ne dajo postaviti (test); brez EOR/ZOI je `jeDavcnoPotrjen=false`;
FURS pot je jasen stub, brez slepe integracije.

**(7)** `npx tsc --noEmit` = 0.

---

## #10 — Demo izolacija (strežniško utrjena)

**(1) Trenutno stanje.** Demo je localStorage `'pinart-predogled'`; guard le v UI
(npr. InvoiceWorkspace ne shrani, če `samoOgled`). `/api/posta` in `/api/pupa`
nimata pojma o demo -> teoretično bi klient v demo lahko sprožil pravi mail.

**(2) Zahtevana sprememba.**
- **Trajen strežniško-preverljiv flag:** demo je klientski način, a mutacijske
  strežniške poti morajo prepoznati »demo/preview« zahtevke in jih zavrniti/no-op.
  Ker demo nima seje-specifičnega markerja na strežniku, uvedi eksploatacijo:
  vsak mutacijski API (posta, racunovodstvo/send, prihodnji furs) že preverja sejo/
  lastništvo; DODAJ pravilo: če telo vsebuje `demo:true` ali če ni veljavne seje ->
  ne pošlji/ne piši. Za pošto (glej #8): zahtevaj sejo + ne pošiljaj, če je
  `demo`.
- **Data helper** v `lib/predogled.ts` (to je `lib/`, dovoljeno): `export function
  jeDemo(): boolean` in guard util `export function blokirajCeDemo<T>(fn): ...` za
  klientske klice — a ključno je strežniško: demo ne sme nikoli dobiti prave seje z
  mutacijo. Praktično zadošča: **API poti so vezane na sejo + organizacijo; demo
  podatki imajo id-je `demo-*` -> zavrni vsak zapis/priponko/mail, katerega
  `external_id`/pot vsebuje `demo-`.**
- V `pushFlowData`/`uploadBusinessDocument`/`deleteCloudRecords` doda varovalko:
  preskoči zapise z `id`/`externalId`, ki se začnejo z `demo-` (demo se NE
  sinhronizira v pravo organizacijo). To je enovrstična, povratno združljiva
  zaščita.

**(3) Datoteke.** `lib/pinartFlowCloud.ts` (filtriraj `demo-` iz upsertov/delete/
upload), `lib/predogled.ts` (`jeDemo()`), `app/api/posta/route.ts` in
`app/api/racunovodstvo/send/route.ts` (demo/ brez-seje blok — glej #8/#5).

**(4) Migracije.** Ni potrebna.

**(5) API poti.** Ni novih.

**(6) Kriterij dokončanja.** Zapis/priponka z `demo-` prefiksom se NE zapiše v
Supabase; demo ne pošlje maila (test #11); preklop računa (že obstoječ
`poravnajRacun`) ostane nedotaknjen; prava organizacija nikoli ne dobi demo vrstic.

**(7)** `npx tsc --noEmit` = 0.

---

## #5 — Pupa API zaščita

**(1) Trenutno stanje.** `app/api/pupa/route.ts`: brez seje, brez rate-limita, brez
omejitve dolžine vprašanja/konteksta (le `zgodovina.slice(-8)`), v napaki vrne
`podrobnost: t.slice(0,300)`. Ključ `ANTHROPIC_API_KEY` je strežniški (OK).

**(2) Zahtevana sprememba.**
- **Preverjanje seje** (`createClient()` iz `@/utils/supabase/server`,
  `auth.getUser()`); brez seje -> 401.
- **Preverjanje pravice/paketa:** dostop do Pupe je `aiConnector` feature (pro) —
  preveri prek entitlementa (RPC `current_organization_entitlements` na strežniku ali
  preverba tester/dodelitve kot v `getAccessTier`). Neupravičen -> 403.
- **Rate-limit** (uporabnik + org + IP). Nova tabela `ai_usage` ali lahek
  in-memory + trajen števec v Supabase: preprosto »N zahtev / okno« prek RPC, ki
  atomsko poveča in vrne števec; prekoračitev -> 429. IP iz `x-forwarded-for`.
- **Omejitve dolžine:** `vprasanje` ≤ npr. 4000 znakov, `kontekst` ≤ 8000, zgodovina
  ≤ 8 sporočil in vsako ≤ 4000 -> sicer 400/skrajšaj.
- **Varni odzivi:** nikoli ne vračaj Anthropic surove napake — odstrani
  `podrobnost`, logiraj strežniško, uporabniku vrni generično sporočilo.
- **Beleženje porabe brez občutljive vsebine:** zapiši (org, user, čas, št.
  tokenov/št. zahtev, model) — NE vprašanja/odgovora.

**(3) Datoteke.** `app/api/pupa/route.ts`, nov `lib/rateLimit.ts` (čista funkcija,
kliče RPC), migracija za `ai_usage`.

**(4) Migracije.** `20260811130000_ai_usage.sql`: `create table if not exists
public.ai_usage (id uuid pk, organization_id uuid, user_id uuid, model text,
tokens int, created_at timestamptz default now(), ip_hash text);` RLS: član bere
svojo org (opcijsko), piše le service-role. RPC
`ai_rate_check(p_user uuid, p_org uuid, p_ip text, p_limit int, p_window interval)
returns boolean` (security definer, šteje zadnje okno). `grant execute`.

**(5) API poti.** Obstoječa `app/api/pupa/route.ts` (dopolnjena).

**(6) Kriterij dokončanja.** Neprijavljen klic -> 401 (test #11); neupravičen ->
403; prekoračitev limita -> 429 (test #11); predolgo vprašanje -> 400; Anthropic
napaka se NE prikaže uporabniku; poraba zabeležena brez vsebine.

**(7)** `npx tsc --noEmit` = 0.

---

## #8 — Mail zaledje (dnevnik, potrditev, retry, demo blok)

**(1) Trenutno stanje.** `/api/posta` pošlje prek Resend brez seje/dnevnika/demo
blokade. `lib/postaDnevnik.ts` je LOKALNI dnevnik. `project_mail` je cloud tabela
(RLS po org) a piše se le inbound (`/api/posta/prejeto`) + ročno iz UI.
`/api/racunovodstvo/send` je dober vzorec (seja + validacija prejemnika).

**(2) Zahtevana sprememba.**
- **Seja na `/api/posta`:** zahtevaj prijavo (kot racunovodstvo/send) — brez seje
  401. (Prepreči zunanjo zlorabo relaya.)
- **Demo blok:** če telo `demo:true` ali brez seje -> ne pošlji (#10).
- **Dnevnik pošiljanja (kdo/komu/kaj/kdaj):** ob uspešnem/neuspešnem pošiljanju
  zapiši v `project_mail` (ali novo `mail_log`) prek service-role: org, user_id,
  prejemniki, zadeva, `status ('sent'|'failed')`, `provider_id`, `error_code`,
  `created_at`. **Brez telesa/HTML v log** (ali le kratek povzetek ≤140 zn., kot
  inbound). Tako se ne pušča občutljiva vsebina.
- **Podatki za potrditveni korak:** Codex pripravi data funkcijo, ki vrne
  »predogled pošiljanja« (prejemniki, zadeva, iz katerega dokumenta) — dejanski
  potrditveni UI naredi Claude. Torej: `lib/posta.ts` doda `pripraviMail(...)`
  (vrne validiran objekt + opozorila), pošiljanje ostane ločeno.
- **Retry brez podvajanja:** doda `idempotency_key` (klient generira UUID na
  poskus); strežnik pred pošiljanjem preveri, ali je ta ključ že »sent« ->
  ne pošlje znova, vrne obstoječ rezultat. Unikatni indeks na `(organization_id,
  idempotency_key)`.

**(3) Datoteke.** `app/api/posta/route.ts` (seja + demo + log + idempotency),
`lib/posta.ts` (`idempotencyKey`, `pripraviMail`), opcijsko `lib/postaLog.ts` (data
helper za branje strežniškega loga), migracija.

**(4) Migracije.** `20260811140000_mail_log.sql`: bodisi razširi `project_mail`
(`add column if not exists status text; ... provider_id text; ... error_code text;
... idempotency_key text; ... sender_user_id uuid;`) + `create unique index if not
exists project_mail_idem on project_mail(organization_id, idempotency_key) where
idempotency_key is not null;` — ALI nova tabela `mail_log`. Priporočilo: nova
`mail_log` (loči poslano evidenco od projektne pošte), RLS člansko branje, pisanje
service-role.

**(5) API poti.** Obstoječa `/api/posta` (dopolnjena). Opcijsko `/api/posta/log`
(GET, seja) za pregled — ali branje prek RLS.

**(6) Kriterij dokončanja.** Pošiljanje brez seje -> 401; demo ne pošlje (test #11);
vsak poskus zabeležen s statusom sent/failed brez vsebine; ponovni klic z istim
`idempotency_key` ne pošlje dvakrat; `pripraviMail` vrne validirane podatke za UI
potrditev.

**(7)** `npx tsc --noEmit` = 0.

---

## #7 — Priponke / storage (tipi, velikost, signed URL, arhiv, AV točka)

**(1) Trenutno stanje.** `uploadBusinessDocument` -> bucket `business-documents`
(private, `file_size_limit 52428800` = 50 MB), pot `{org}/{section}/{externalId}/
{ts}-{safeName}`, `upsert:false`. `getBusinessDocumentUrl` signed 60 s.
`deleteBusinessDocument` preveri org-prefix pot in **hard remove**. Ni preverbe MIME/
tipa/velikosti v kodi (le bucket limit), ni AV točke, ni arhiviranja.

**(2) Zahtevana sprememba.**
- **Dovoljeni tipi + velikost (strežniško/klientsko):** whitelist MIME/končnic
  (pdf, png, jpg, webp, docx, xlsx, csv, zip) in max velikost (npr. 25 MB) —
  preveri PRED uploadom v `uploadBusinessDocument`; zavrni sicer.
- **Varno ime/pot:** `safeName` že čisti; doda dolžinsko omejitev + prepreči
  `..`/vodilne pike; ohrani org-prefix.
- **Signed URL omejeno trajanje:** `getBusinessDocumentUrl` naj privzeto ostane
  kratek (60 s ok); dodaj zgornjo mejo (npr. max 3600 s) in ne dopusti neomejenega.
- **AV integracijska točka:** ob uploadu zapiši `scan_status='pending'` v novo
  tabelo `document_files`; strežniška pot/stub `app/api/dokumenti/scan/route.ts`
  (service-role), kamor bo prihodnji AV worker javil rezultat (clean/infected).
  Datoteke `scan_status<>'clean'` naj `getBusinessDocumentUrl` ne postreže (ali
  opozori). Launch: privzeto `clean` (AV še ni vključen) — dokumentiraj.
- **Arhiviranje namesto tihega brisanja:** `deleteBusinessDocument` -> premakni
  zapis v `deleted_at` (soft) + opcijsko premik v `archive/` prefiks, NE takojšen
  hard remove. Dejanski storage remove le prek admin/service-role »purge« poti.
- **Backup/restore:** dokumentiraj (komentar) + data funkcija `listOrgFiles()` za
  izvoz seznama poti (pravi backup dela Supabase; koda le omogoči evidenco).

**(3) Datoteke.** `lib/pinartFlowCloud.ts` (validacije v `uploadBusinessDocument`,
soft v `deleteBusinessDocument`, meja v `getBusinessDocumentUrl`, `listOrgFiles`),
nova migracija, stub `app/api/dokumenti/scan/route.ts`.

**(4) Migracije.** `20260811150000_document_files.sql`: `create table if not exists
public.document_files (id uuid pk, organization_id uuid, section text, external_id
text, path text unique, mime text, size int, scan_status text not null default
'clean' check (scan_status in ('pending','clean','infected')), deleted_at
timestamptz, created_at timestamptz default now());` RLS člansko; grant; +
(opcijsko) posodobi storage bucket komentar. Aditivno.

**(5) API poti.** `app/api/dokumenti/scan/route.ts` (stub, service-role, `INBOUND`-
podoben secret).

**(6) Kriterij dokončanja.** Prevelika/napačna datoteka zavrnjena; pot brez `..`;
signed URL ≤ meja; `document_files` vodi scan_status; brisanje = soft; `listOrgFiles`
vrne evidenco; AV stub obstaja brez slepe implementacije.

**(7)** `npx tsc --noEmit` = 0.

---

## #11 — Varnostni testi (skripte, ne UI)

**(1) Trenutno stanje.** Ni avtomatiziranih varnostnih testov za RLS/izolacijo/
limite.

**(2) Zahtevana sprememba.** Napiši ponovljive teste (kot `.sql` scenariji v
`supabase/migrations/` NE — raje v `supabase/tests/` ali kot skripta v repo, a ker
je Codex omejen na dovoljene mape, daj **SQL test scenarije kot komentiran
`supabase/migrations/`-slog datoteko z `pgTAP`/`assert` ali kot `lib/` skripto, ki
jo poganja Tina**). Praktično: dodaj `app/api/_selftest/route.ts` (samo v ne-prod,
za Tinino ročno preverbo) ALI dokumentiran nabor SQL poizvedb. Pokrij:
1. **Org A ne vidi org B** — user iz A bere `invoices` org B -> 0 vrstic.
2. **Član brez pravice** (viewer/member) ne izda/ne briše računa -> RLS zavrne.
3. **2 hkratna računa** prek `dodeli_stevilko` -> različni številki.
4. **Izdan račun** (`issued_at` set) — vsebinski UPDATE -> zavrnjen.
5. **Neprijavljen -> `/api/pupa`** -> 401.
6. **Prekoračitev AI limita** -> 429.
7. **Demo** (`demo-` id / `demo:true`) -> ni maila, ni zapisa v produkcijo.
8. **Izguba omrežja / stara naprava** -> `mergeByUpdatedAt` ne povozi novejšega.

**(3) Datoteke.** `supabase/migrations/20260811160000_security_tests.sql`
(pgTAP-slog, ovit tako, da NE spreminja podatkov — uporabi transakcijo z rollback,
ali samo `do $$ ... assert ... $$`), ali `lib/varnostniTesti.ts` (dokumentirane
poizvedbe). API poti `/api/pupa`, `/api/posta` se testirajo ročno/prek skripte.

**(4) Migracije.** Kot zgoraj (test datoteka; brez shema-sprememb).

**(5) API poti.** Opcijsko `_selftest` (gated na `NODE_ENV!=='production'`).

**(6) Kriterij dokončanja.** Vsi 8 scenarijev imajo izvedljiv test/poizvedbo z
jasnim PASS/FAIL; dokumentirano, kako jih Tina požene.

**(7)** `npx tsc --noEmit` = 0.

---

## Priporočeni vrstni red in odvisnosti

```
#6  Vloge & RLS + helper + člani        ← TEMELJ (role_at_least, membership funkcije)
 │
 ├─► #2  Številčenje računov             (rabi role_at_least za "ročno = admin")
 │
 ├─► #3  Zaklep/audit/soft-delete/storno (rabi role_at_least; uvede deleted_at, issued_at)
 │        │
 │        ├─► #1  Davčni status model     (naslon na issued_at; ločena fiscal polja)
 │        │
 │        └─► #4  LocalStorage↔Supabase   (rabi updated_at + tombstone/deleted_at iz #3)
 │
 ├─► #5  Pupa zaščita                    (neodvisna; rabi entitlement iz #6 za pravico)
 │
 ├─► #8  Mail zaledje                    (neodvisna; deli demo-blok z #10)
 │
 ├─► #7  Priponke/storage                (neodvisna; deli soft-delete vzorec z #3)
 │
 └─► #10 Demo izolacija                  (dotakne se posta/pupa/cloud — po #5 in #8)
        │
        └─► #11 Varnostni testi          ← ZADNJI (pokrije vse zgornje)
```

**Kritična pot (naredi po tem zaporedju):**
1. **#6** — brez vlog/`role_at_least` se #2 in #3 ne moreta pravilno zavarovati.
2. **#3** — uvede `issued_at`, `deleted_at`, audit, storno; osnova za #1 in #4.
3. **#2** — atomsko številčenje (rabi #6 za admin-izjemo).
4. **#1** — davčni status na vrhu #3 (issued_at).
5. **#4** — konfliktni merge (rabi #3 tombstone).
6. **#5**, **#8**, **#7** — vzporedno (neodvisna zaledja); #5 rabi #6 entitlement.
7. **#10** — utrdi demo v posta/pupa/cloud (po #5, #8).
8. **#11** — varnostni testi pokrijejo vse.

**Vzporedno se lahko delajo brez trkov:** #5 (samo `app/api/pupa` + `lib/rateLimit`
+ ai_usage migracija), #7 (storage), #8 (mail) — ker se dotikajo ločenih datotek.
#2/#3/#4 se vsi dotikajo `pinartFlowStore.ts` + `pinartFlowCloud.ts`, zato jih delaj
**zaporedno**, ne vzporedno (isti datoteki -> trki).

---

## Skupne opombe za Codex

- Vsaka migracija = nova datoteka s časovno predpono `YYYYMMDDHHMMSS_ime.sql`,
  višjo od `20260807120000` (zadnja obstoječa). Predlagana imena so zgoraj.
- Enum spremembe (`add value`) daj v **svojo** migracijo ali na vrh, ločeno od
  uporabe nove vrednosti (PostgreSQL zahteva commit med `add value` in uporabo).
- Za vsako novo tabelo: `enable row level security` + politike + `grant ... to
  authenticated` (in `to service_role`, kjer API piše). Nikoli `anon`.
- `security definer` funkcije vedno `set search_path = public`.
- Ne spreminjaj obstoječih signatur, ki jih kliče UI (`mergeFlowData`,
  `pushFlowData`, `pullFlowData`, `uploadBusinessDocument`,
  `getBusinessDocumentUrl`, `deleteBusinessDocument`, `posljiMail`) — razširjaj
  interno / dodajaj nove izvoze, da komponente ostanejo nedotaknjene.
- Po vsaki nalogi: `npx tsc --noEmit` = 0. Pred pushom (Tina) `next build`.
```

---

# NOVE NALOGE — paket 2026-08-11 (utrjevanje + verifikacija)

> **POZOR — trki:** Claude/Tina trenutno aktivno urejata UI:
> `components/InvoiceWorkspace.tsx`, `components/ContractWorkspace.tsx`,
> `components/ProjectsWorkspace.tsx`, `components/ui/*` (GumbNazaj, GumbPrimarni,
> uikit.module.css), `components/Toast.tsx`,
> `app/[locale]/kalkulator/pregled/pregled.module.css`.
> **Codex se teh datotek NE dotika.** Ostane v `lib/*`, `app/api/*`,
> `supabase/migrations/*` (nove), `middleware.ts`, `utils/*`. Ista železna pravila
> kot zgoraj.

## #12 — Rate limiting na javnih/dragih API poteh  ⭐ (strošek + zloraba)
Poti: `app/api/pupa/route.ts` (AI — plačljivi klici!), `app/api/posta/route.ts`,
`app/api/posta/prejeto/route.ts`, `app/api/racunovodstvo/send/route.ts`.
- Dodaj lahek limiter (`lib/rate-limit.ts`): ključ = `userId` (iz seje) ali IP
  fallback; okno + max (npr. pupa: 20/min/uporabnika, mail: 10/min). Uporabi
  Supabase tabelo `api_klici` (nova migracija, RLS service-role) ALI in-memory
  Map, če je stateless dovolj — dokumentiraj izbiro.
- Ob prekoračitvi vrni `429` + `{ napaka: 'Preveč zahtev, poskusi čez minuto.' }`.
- **Verifikacija:** unit/skripta v `scripts/` ki v zanki pokliče route in potrdi 429.

## #13 — Validacija vhodov (zod ali ročno) na VSEH `app/api/*` POST
- Za vsak POST body: preveri tipe, obvezna polja, **omeji velikost** (npr.
  pupa prompt ≤ 8 kB, mail telo ≤ 100 kB, priloge glej #7). Zavrni z `400` +
  jasnim sporočilom, ne vrzi 500.
- Centraliziraj sheme v `lib/validacija.ts`. Ne spuščaj neomejenih nizov v
  Anthropic/Resend klice.
- **Verifikacija:** skripta pošlje pokvarjen/prevelik body → pričakuj 400.

## #14 — Izvoz + izbris uporabniških podatkov (GDPR, samo zaledje)
- `app/api/uporabnik/izvoz/route.ts` — vrne ves uporabnikov podatek (računi,
  ponudbe, pogodbe, stranke, Flow JSON) kot en JSON (za pravico do prenosljivosti).
- `app/api/uporabnik/izbris/route.ts` — **soft-delete** (označi, ne uniči; glej
  #3 vzorec), z audit zapisom. Trdi izbris NE (Tina/pravno kasneje).
- Obe poti: samo lastnikovi podatki (seja), nikoli tuji; RLS + preverjanje `userId`.
- **Verifikacija:** izvoz vrne le lastnikove vrstice; poskus tujega `userId` → 403.

## #15 — Verifikacijski prehod #11 (poročilo PASS/FAIL)
Poženi/dopolni varnostne skripte iz #11 in vrni tabelo PASS/FAIL za:
- Demo-bleed: nov račun NE vidi demo/predogleda drugega (glej #10).
- Cross-account read: uporabnik A ne prebere vrstic uporabnika B (računi/stranke/Flow).
- RPC-ji: `dodeli_stevilko` (unikatnost pod sočasnostjo), `storniraj_racun`
  (samo izdani, audit), entitlement helper (paket → dovoljenja).
- Rezultat zapiši v `docs/CODEX-VARNOST-porocilo.md` (nova datoteka).

**Vrstni red:** #15 (najprej ugotovi stanje) → #12 → #13 → #14.
Vse ostane povratno združljivo; migracije aditivne; `tsc` = 0 po vsakem koraku.

---

# NALOGA #16 — Mail zaledje: centraliziraj ODHODNO pošto (strežniško) + reply-to na token  ⭐ (dvosmerna pošta)

> **Kontekst:** dvosmerna per-projekt pošta je ~70% zgrajena (`project_mail`,
> `project_inbox`, `/api/posta/prejeto`, `lib/pinartMailCloud.ts`). Manjkata
> ožičenji. Claude dela UI del (hub `KomunikacijaWorkspace` -> cloud, nit,
> reply-to klici v komponentah). **Ti (Codex) delaš SAMO zaledje:**
> `app/api/posta/route.ts`, `lib/posta.ts`, `lib/*` (nov strežniški helper),
> `supabase/migrations/*`. **NE dotikaj se komponent** (Claude jih ureja).

Trenutno `/api/posta` pošlje prek Resend + piše samo `mail_log` (metapodatki).
Odhodni mail se NE zapiše v `project_mail`, reply-to je vedno lastnikov Gmail,
zato inbound (odgovor stranke) nikoli ne pride na `token@pinartflow.com`.

**Kaj naredi:**

1. **Strežniški helper za inbox token** (nov, npr. `lib/inboxToken.ts`):
   `zagotoviInboxToken(orgId, projectExternalId): Promise<string>` prek
   `createAdminClient()` — poišče `project_inbox` po (org, project); če ga ni,
   ustvari token formata `p` + 12 hex in vrne naslov-del. (Adaptacija obstoječega
   `ensureProjectInboxToken` iz `lib/pinartMailCloud.ts`, ki je klientski.)

2. **Razširi `/api/posta` POST body** z opcijskima poljema:
   `projectExternalId?: string`, `clientId?: string` (validiraj prek
   `lib/validacija.ts`, ostani povratno združljiv — brez njiju dela kot zdaj).

3. **Ko je `projectExternalId` podan:**
   - `reply_to` = `<token>@${INBOUND_DOMAIN}` (nov env `INBOUND_DOMAIN`,
     privzeto `pinartflow.com`) — RAZEN če klicatelj eksplicitno poda `replyTo`
     (takrat spoštuj podanega).
   - Po uspešnem `resend.emails.send` **zapiši v `project_mail`** prek admin
     klienta: `direction:'out'`, `organization_id`, `project_external_id`,
     `client_id`, `from_email`, `to_emails`, `subject`, `body_html`/`body_text`,
     **`message_id` = Resendov vrnjeni id**, `occurred_at`. (Server-side zapis je
     zanesljivejši od klientskega `pushProjectMail`.)

4. **Vrni `messageId`** (Resendov) v JSON odgovoru `/api/posta`.

5. **`lib/posta.ts` `posljiMail`**: dodaj opcijska `projectExternalId`, `clientId`
   v argumente in ju posreduj v body. Podpis ostane povratno združljiv
   (obstoječi klici brez njiju delajo naprej). Vrni tudi `messageId`.

6. **Org resolucija**: uporabi obstoječi vzorec za `organization_id` prijavljenega
   uporabnika (kot drugod v API). Če helper obstaja, ga uporabi; sicer poizvedi.

7. **Migracije**: preveri, da so `project_mail`, `project_inbox`, `mail_log` že
   pokrite; če manjka indeks/stolpec za zgornje (npr. `client_id` na project_mail),
   dodaj **aditivno** migracijo `add column if not exists`.

**Železna pravila** kot zgoraj: `tsc`=0, aditivne migracije, service-role samo v
`app/api/**`, ne razbij obstoječih klicev `posljiMail`. **Ne dotikaj se UI.**

**Test/verifikacija:** klic `/api/posta` z `projectExternalId` → ustvari/najde
token, pošlje z reply-to na token, zapiše `project_mail(out)` z `message_id`.
Brez `projectExternalId` → obnašanje nespremenjeno.


# Načrt naročnin Stripe

Status: predlog za potrditev. Ta dokument ne uvaja kode, tabel ali knjižnic. Connect, Tap to Pay in FURS niso del te faze.

## 1. Kaj že obstaja

- `lib/paketi.ts` ostane edini katalog paketov, imen, cen in Pupinih kvot. Stripe vanj ne piše. Ob implementaciji se paketom dodajo samo preslikave na Stripe Price ID-je iz okolja, ne drugi cenik.
- `lib/pinartFlowEntitlements.ts` ostane odjemalska preslikava pravic po paketu. Ne sme neposredno klicati Stripea.
- `lib/pravice.ts` ostane strežniška zapora funkcij in še naprej bere `current_organization_entitlements()`.
- `lib/dostop.ts` in `flow_dostop` ostaneta za testerje, nagrade in popuste. Nista evidenca plačil.
- `organization_subscriptions` že vsebuje organizacijo, paket, stanje, veljavnost ter ID stranke/naročnine pri ponudniku. To je prava osnova in se razširi; nove vzporedne tabele `narocnine` ne potrebujemo.
- RPC `current_organization_entitlements()` ostane enotna bralna pot za aplikacijo, vendar mora po migraciji pravilno razlikovati Premium in Pro ter upoštevati plačano obdobje in dovoljeni grace period.
- `app/api/kalkulator-admin/paket` ostane samo za izrecne ročne dodelitve. Ne sme popravljati ali prepisovati Stripe naročnin; ročne dodelitve naj imajo ločen izvor `rocno` in revizijsko sled.

Stripe postane vir dogodkov o plačilu. Lokalna baza ostane hitra projekcija za pravice in UI. Brskalnik nikoli neposredno ne odloča, da je naročnina plačana.

## 2. Predlagane tabele

### Razširitev `organization_subscriptions` (obstoječa)

Primarni ključ ostane `organization_id`.

| Stolpec | Namen |
|---|---|
| `tier` | `free`, `premium`, `pro`; usklajeno z `lib/paketi.ts` |
| `status` | lokalna preslikava Stripe stanj: `incomplete`, `trialing`, `active`, `past_due`, `unpaid`, `canceled`, `paused` |
| `provider` | `stripe` ali `rocno` |
| `provider_customer_id` | Stripe `cus_…`; unikaten delni indeks za Stripe vrstice |
| `provider_subscription_id` | Stripe `sub_…`; unikaten delni indeks |
| `provider_price_id` | trenutno aktivni Stripe Price |
| `current_period_start`, `current_period_end` | kopija obdobja iz Stripe naročnine |
| `cancel_at_period_end`, `cancel_at`, `canceled_at` | načrtovana oziroma izvedena odpoved |
| `trial_end` | konec preizkusa, če obstaja |
| `latest_invoice_id` | zadnji Stripe račun, uporaben pri usklajevanju |
| `last_stripe_event_created` | čas najnovejšega sprejetega Stripe dogodka za zaščito pred starejšimi dogodki |
| `valid_until` | lokalni datum pravice; posodobi se iz uspešno plačanega obdobja, ne s čela |
| `updated_at` | lokalna revizijska sled |

### Nova `stripe_webhook_events`

- `stripe_event_id text primary key`
- `event_type text not null`
- `object_id text`
- `stripe_created_at timestamptz not null`
- `received_at timestamptz not null default now()`
- `processed_at timestamptz`
- `status text` (`processing`, `processed`, `failed`, `ignored`)
- `attempts integer not null default 0`
- `last_error text` (omejen in brez skrivnosti)
- `payload jsonb` — priporočilo: shranimo le nujna polja oziroma časovno omejimo hrambo celotnega dogodka zaradi osebnih podatkov

Primarni ključ zagotovi idempotenco istega Stripe Eventa. Dodatni indeks `(object_id, event_type, stripe_created_at)` pomaga zaznati semantične dvojnike.

### Nova `subscription_payments`

- `id uuid primary key`
- `organization_id uuid not null references organizations(id)`
- `subscription_id text not null`
- `stripe_invoice_id text not null unique`
- `stripe_payment_intent_id text`
- `amount_due`, `amount_paid` v najmanjši denarni enoti (`bigint`)
- `currency text not null`
- `status text not null` (`open`, `paid`, `void`, `uncollectible`)
- `period_start`, `period_end timestamptz`
- `paid_at`, `failed_at timestamptz`
- `invoice_url`, `invoice_pdf` (po potrebi; ne obravnavamo ju kot trajni arhiv)
- `created_at`, `updated_at timestamptz`

Ne uvajamo lastne tabele kartic ali PaymentIntentov. Te podrobnosti ostanejo pri Stripu.

## 3. Zaporedja dogodkov

Stripe priporoča webhooke za usklajevanje naročnin in `invoice.paid` kot signal za zagotavljanje nadaljnjega dostopa: [Using webhooks with subscriptions](https://docs.stripe.com/billing/subscriptions/webhooks), [SaaS subscriptions](https://docs.stripe.com/get-started/use-cases/saas-subscriptions).

### Prva naročnina

1. Prijavljeni owner/admin izbere paket; strežnik ustvari Stripe Checkout Session v načinu `subscription` in v metadata zapiše `organization_id` ter paket.
2. Uporabnik plača na Stripe Checkoutu. Vrnitev na `success_url` kaže samo »plačilo preverjamo«; čelo še ne odklepa paketa.
3. Webhook preveri podpis in zabeleži `checkout.session.completed`. Iz `customer` in `subscription` pridobi pravo naročnino ter preveri metadata.
4. `customer.subscription.created/updated` osveži projekcijo naročnine, vendar sam po sebi še ni dokaz plačila.
5. `invoice.paid` transakcijsko zapiše plačilo, paket, obdobje in `valid_until`; šele nato RPC odklene pravice. Stripe opisuje, da uspešno prvo plačilo premakne naročnino v `active`: [Subscription invoices](https://docs.stripe.com/billing/invoices/subscription).
6. Če prva faktura ostane neplačana, je naročnina `incomplete`; Stripe jo lahko po približno 23 urah premakne v `incomplete_expired`. Dostop ostane prejšnji/free.

### Podaljšanje

1. Stripe ustvari novo fakturo; `invoice.upcoming` je le informativen.
2. Ob `invoice.paid` se po unikatu Stripe invoice ID zapiše plačilo in podaljša `valid_until` na novo obdobje.
3. `customer.subscription.updated` osveži stanje/obdobje, ne sme pa sam podaljšati plačanega dostopa.

### Neuspešno plačilo

1. `invoice.payment_failed` zapiše neuspeh in stanje `past_due`/`incomplete`; uporabniku pošljemo varen poziv za posodobitev plačila v Stripe Customer Portalu.
2. Za obnovljivo napako uporabimo Stripe Smart Retries. Ne ukinemo dostopa ob prvem začasnem neuspehu; obdržimo ga do `valid_until` in vnaprej dogovorjenega kratkega grace perioda.
3. Ob poznejšem `invoice.paid` se dostop normalno podaljša. Ob `unpaid` ali dokončni odpovedi se po izteku `valid_until` vrne na Free.
4. Za potrebno 3DS dejanje poslušamo `invoice.payment_action_required`. Stripeov pregled stanj: [How subscriptions work](https://docs.stripe.com/billing/subscriptions/overview).

### Nadgradnja

1. Strežnik prebere trenutno naročnino neposredno iz Stripea in zamenja Price; čelo ne pošilja cene, samo dovoljeni ciljni paket.
2. Predlog: nadgradnja velja takoj s preračunom in takojšnjim plačilom.
3. Varnejša možnost je Stripe `pending_if_incomplete`: sprememba se uporabi šele, ko je plačilo uspešno. Stripe dokumentira `pending_update` in dogodek `customer.subscription.pending_update_applied`: [Pending updates](https://docs.stripe.com/billing/subscriptions/pending-updates).
4. Pravice se spremenijo šele po uspešnem plačilu/uporabljenem pending update.

### Znižanje

1. Znižanje se načrtuje za konec trenutnega obdobja (`Subscription Schedule` ali portalna nastavitev), brez vračila že plačanega dela.
2. Lokalno shranimo načrtovano spremembo samo za prikaz; trenutne pravice ostanejo do konca obdobja.
3. Ko Stripe spremembo dejansko uporabi, webhook posodobi Price/tier; naslednji `invoice.paid` potrdi novo plačano obdobje.

### Odpoved

1. Privzeto `cancel_at_period_end=true`; uporabnik ohrani pravice do `current_period_end`.
2. `customer.subscription.updated` pokaže načrtovano odpoved, `customer.subscription.deleted` dokončno stanje.
3. Po izteku plačanega obdobja lokalni tier postane Free. Takojšnja odpoved/refund naj bo le administrativna izjema z izrecno politiko vračil.

## 4. Idempotenca in vrstni red webhookov

Stripe opozarja, da se isti webhook lahko dostavi večkrat in da lahko dva dogodka predstavljata isti objekt/spremembo: [Webhook best practices](https://docs.stripe.com/webhooks).

1. Podpis preverimo nad nespremenjenim surovim telesom z `STRIPE_WEBHOOK_SECRET`.
2. V isti transakciji poskusimo vstaviti `event.id` v `stripe_webhook_events`. Konflikt primarnega ključa pomeni že sprejet dogodek in vrnemo 2xx brez ponovne obdelave.
3. Za semantične dvojnike primerjamo še `(event.type, data.object.id)` in stanje ciljnega objekta.
4. Dogodki niso zagotovljeno urejeni. `last_stripe_event_created` prepreči, da bi starejši subscription dogodek prepisal novejšega; pri dvomu sveže stanje pridobimo iz Stripe API-ja.
5. Plačilo ima dodaten unikat na `stripe_invoice_id`, zato podaljšanje ni mogoče dvakrat.
6. Webhook hitro potrdi sprejem; počasna obvestila se obdelajo asinhrono. Neuspehi ostanejo v tabeli za varen ponovni poskus.

## 5. Vir resnice

- Stripe je vir resnice za Customer, Subscription, Price, Invoice, PaymentIntent in dejanski uspeh plačila.
- Lokalna `organization_subscriptions` je preverjena projekcija za hitro avtorizacijo; posodablja jo samo webhook/service-role.
- `subscription_payments` je lokalni indeks plačil za podporo in poročanje, ne nadomestek Stripe evidence.
- Čelo sme brati paket, status, `valid_until`, načrtovano odpoved in povezavo do Customer Portala iz naše API poti.
- Čelo nikoli ne sme poslati ali določiti: plačanega statusa, zneska, valute, Price ID-ja, `valid_until`, Customer/Subscription ID-ja ali rezultata plačila.
- `success_url` ni dokaz plačila. Pravice se odklenejo po preverjenem webhooku oziroma strežniški uskladitvi s Stripe API-jem.

## 6. Ključi in nastavitve za Tino

Predlagana imena okolja:

- `STRIPE_SECRET_KEY` — Developers → API keys; testni `sk_test_…`, nato live `sk_live_…`.
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — `pk_test_…`/`pk_live_…`; potrebujemo ga le, če bo čelo uporabljalo Stripe.js. Pri povsem gostovanem Checkoutu ga lahko izpustimo.
- `STRIPE_WEBHOOK_SECRET` — Developers → Webhooks → izbrani endpoint → Signing secret; to ni API key in je ločen za test/live endpoint.
- `STRIPE_PRICE_PREMIUM_MONTHLY` in `STRIPE_PRICE_PRO_MONTHLY` — Products → posamezni mesečni Price.
- Po potrebi `STRIPE_PRICE_PREMIUM_FOUNDING_MONTHLY`; ustanovne cene ne računamo v kodi.
- `STRIPE_CUSTOMER_PORTAL_CONFIGURATION_ID` — če uporabimo namensko konfiguracijo portala.
- `APP_URL` — kanonični HTTPS origin za success/cancel/portal return URL-je.

Stripe opisuje lokacijo in ločenost API ter webhook ključev tukaj: [API keys](https://docs.stripe.com/keys). Tina mora ločeno ustvariti testne in live produkte/cene ali uporabiti Stripeov postopek kopiranja v live mode. Noben ključ ne sme biti v `NEXT_PUBLIC_`, razen publishable key.

Dashboard nastavitve: aktiviran Customer Portal (menjava kartice, računi, odpoved in dovoljene menjave paketov), blagovna znamka, e-poštna obvestila za neuspešna plačila, Smart Retries/dunning ter davčna nastavitev. Portal se aktivira posebej: [Customer portal](https://docs.stripe.com/customer-management).

## 7. Odobritve in čas

- Za običajni Stripe Billing/Subscriptions ni navedene ločene produktne odobritve. Za test mode lahko začnemo takoj; za prava plačila mora biti Stripe račun aktiviran: [Stripe accounts](https://docs.stripe.com/get-started/account).
- Aktivacija zahteva poslovne, davčne, osebne, bančne in javno vidne podatke ter 2FA. Omejene dejavnosti lahko zahtevajo dodatne dokumente: [Account checklist](https://docs.stripe.com/get-started/account/checklist).
- Uradna Stripe vira navajata različna roka za ročni pregled dokumentov: stran za poslovna dokazila pravi »do 24 ur«, splošna stran statusa preverjanja pa »3–5 delovnih dni«. Zato načrtujemo najmanj 5 delovnih dni rezerve in tega ne obljubimo kot SLA: [Business verification documents](https://support.stripe.com/questions/documents-for-business-verification), [Verification status](https://support.stripe.com/questions/what-is-the-verification-status-of-my-account).
- Negotovost: dejanski rok in zahtevani dokumenti so odvisni od pravne osebe, države, dejavnosti in avtomatskega preverjanja. Dashboard je edini zanesljiv seznam trenutnih zahtev računa.
- Stripe Tax ni samodejna davčna registracija ali oddaja obračunov v vseh primerih. Pred vključitvijo mora Tina z računovodjo potrditi DDV obravnavo SaaS prodaje; Stripe poudarja, da se mora podjetje najprej registrirati tam, kjer ima obveznost: [How Stripe Tax works](https://docs.stripe.com/tax/how-tax-works).

## 8. Obstoječi uporabniki iz `flow_dostop`

1. Ob prvem uspešnem Stripe plačilu organizacijo povežemo s Stripe Customerjem in naročnino; `organization_subscriptions` postane plačana projekcija.
2. `tester` in časovno veljavna `nagrada` še naprej odklepata Pro brez plačila. Plačilo ju ne izbriše in ne skrajša; aplikacija uporabi močnejšo trenutno pravico.
3. `popust` ne odklepa dostopa. Pred Checkoutom se strežniško prebere enkrat, pretvori v vnaprej ustvarjen Stripe Coupon/Promotion Code ali namenski Price ter zabeleži, da je bil izkoriščen. Odstotka čelo nikoli ne določa.
4. Če nagrajenec plača pred iztekom nagrade, predlog je začetek zaračunavanja po `velja_do` prek trial end/billing anchor. To mora Tina potrditi, ker alternativa pomeni takojšnje plačilo ob še veljavni nagradi.
5. Ročni `organization_subscriptions.provider='rocno'` se ne prepiše samodejno brez jasne migracijske odločitve. Ob prvem plačilu ga prestavimo na `stripe`, prejšnjo ročno dodelitev pa ohranimo v revizijski sledi.

## Odločitve, ki jih mora Tina potrditi pred kodo

1. Ali nadgradnja velja takoj s preračunom, znižanje pa šele ob koncu obdobja?
2. Kolikšen je grace period po neuspelem podaljšanju (predlog: največ 3 dni, vendar ne dlje od Stripeove končne odločitve)?
3. Ali nagrajenci začnejo plačevati šele po `velja_do`?
4. Ali ustanovna cena pomeni ločen trajni Price ali Stripe Coupon; predlog je ločen Price zaradi jasnejše revizije.
5. Ali v prvi fazi uporabimo Stripe Checkout + Customer Portal (priporočeno) in brez lastnega obrazca za kartice?

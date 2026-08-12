# Dvosmerna pošta — nastavitev (Cloudflare + Resend + Vercel + Supabase)

Cilj: stranka odgovori na mail → odgovor pride na `<token>@pinartflow.com` →
Cloudflare Email Worker ga POST-a na Flow → zapiše se v `project_mail` → vidi se v
Komunikacijah pod pravim projektom.

Koda Workerja je v `workers/mail-inbound/`. Endpoint je `app/api/posta/prejeto/route.ts`.

---

## 1) Cloudflare — domena `pinartflow.com`
Domena mora biti na Cloudflare (nameserverji kažejo na Cloudflare). To že imaš.

## 2) Cloudflare — vklopi Email Routing
Dashboard → izberi `pinartflow.com` → **Email** → **Email Routing** → **Enable**.
- Cloudflare samodejno doda **MX** in **SPF (TXT)** zapise za sprejem pošte.
- (MX so ločeni od spletnih A/CNAME — stran na isti domeni deluje naprej.)

## 3) Cloudflare — postavi Email Worker
Dve poti:

**A) Prek terminala (priporočeno, koda je v repo):**
```bash
cd workers/mail-inbound
npm install
npx wrangler login
npx wrangler secret put INBOUND_SECRET      # prilepi skrivnost (glej točko 6)
npx wrangler deploy
```

**B) Prek dashboarda:** Email Routing → **Email Workers** → Create → prilepi vsebino
`workers/mail-inbound/src/index.js`. V **Settings → Variables**:
- `FLOW_INBOUND_URL` (Var) = `https://pinartflow.com/api/posta/prejeto`
- `INBOUND_SECRET` (Secret) = ista skrivnost kot v Vercel

## 4) Cloudflare — usmeri pošto na Worker
Email Routing → **Routing rules** → **Catch-all address** → Action: **Send to a Worker**
→ izberi `pinart-mail-inbound`. Tako gre `*@pinartflow.com` na Worker.

## 5) Resend — verificiraj domeno za POŠILJANJE
Resend → **Domains** → Add `pinartflow.com` → dodaj **DKIM + SPF** zapise, ki jih
Resend pokaže, v Cloudflare DNS.
- Resend običajno uporabi poddomeno (npr. `send.pinartflow.com`) za DKIM/Return-Path —
  sledi točnim zapisom iz Resenda, da se ne tepe s SPF iz Email Routinga.
- Ko je »Verified«, v Vercel nastavi `RESEND_FROM` = `Pinart Flow <posta@pinartflow.com>`.
- Do verifikacije Resend pošilja samo tebi (fallback `onboarding@resend.dev`).

## 6) Skupna skrivnost `INBOUND_SECRET`
Zmisli si dolgo naključno vrednost (npr. 32+ znakov). Nastavi jo NA OBEH mestih z
ISTO vrednostjo:
- Cloudflare Worker (točka 3),
- **Vercel** → Project → Settings → Environment Variables → `INBOUND_SECRET`.

## 7) Vercel — env spremenljivke (produkcija)
Preveri/dodaj: `INBOUND_SECRET`, `INBOUND_DOMAIN=pinartflow.com`,
`RESEND_API_KEY`, `RESEND_FROM`, `SUPABASE_SERVICE_ROLE_KEY`,
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## 8) Supabase — migracije
Potrdi, da so na produkcijski bazi pognane migracije za `project_mail`,
`project_inbox`, `mail_log` (mape v `supabase/migrations/`).

---

## Preizkus (ko je vse postavljeno)
1. V Flowu odpri projekt → pošlji dokument stranki (reply-to bo `token@pinartflow.com`).
2. Odgovori na ta mail iz drugega nabiralnika.
3. Odgovor se mora pojaviti v Komunikacijah pod tem projektom (direction='in').

Če ne pride: Cloudflare → Worker → **Logs** (real-time) pokaže klic; 401=napačen
secret, 404=projekt/token ni najden, 503=manjka env.

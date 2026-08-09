# Auth e-poštni maili = »Pinart Flow« (ne »Supabase Auth«)

**Problem:** Supabase Auth pošilja potrditveni mail kot pošiljatelj *Supabase Auth*
(`noreply@mail.app.supabase.io`), generičen template. Uporabnik išče mail od
**Pinart Flow** in ga ne najde / mu ne zaupa. Rešitev = custom SMTP + potrjena
domena + brandan template. **Vse to je v Supabase dashboardu (Tina), ne v kodi.**

## 1. Potrdi domeno v Resend (enkratno, ~15 min + DNS)
1. Resend → **Domains → Add Domain** → `pinart.si` (ali poddomena `mail.pinart.si`).
2. Dodaj v DNS (Cloudflare) zapise, ki jih Resend pokaže: **SPF (TXT), DKIM (CNAME/TXT), DMARC (TXT)**.
3. Počakaj na **Verified** (zeleno).
   - (Isti korak odklene tudi #Mail zaledje Resend, da pošilja komurkoli, ne le nase.)

## 2. Custom SMTP v Supabase (pošiljatelj = Pinart Flow)
Supabase → **Project Settings → Authentication → SMTP Settings → Enable custom SMTP**:
- **Host:** `smtp.resend.com`
- **Port:** `465` (SSL) ali `587`
- **Username:** `resend`
- **Password:** `RESEND_API_KEY` (isti kot v projektu)
- **Sender email:** `noreply@pinart.si` (ali `flow@pinart.si`)
- **Sender name:** **`Pinart Flow`**  ← to je tisto, kar folk vidi v inboxu

Shrani. Od zdaj mail prihaja od **Pinart Flow <noreply@pinart.si>**.

## 3. Brandan template (Supabase → Authentication → Email Templates → »Confirm signup«)
Prilepi (spremenljivka `{{ .ConfirmationURL }}` ostane):

```html
<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#231830">
  <div style="font-weight:800;font-size:20px;letter-spacing:.02em;margin-bottom:8px">Pinart <span style="opacity:.6;font-weight:700">FLOW</span></div>
  <h1 style="font-family:Georgia,'Times New Roman',serif;font-weight:500;font-size:26px;line-height:1.15;margin:18px 0 10px">Potrdi svoj e-naslov</h1>
  <p style="font-size:15px;line-height:1.6;color:#4a4256;margin:0 0 22px">Dobrodošla v Pinart Flow! Klikni spodnji gumb, da potrdiš e-naslov in dokončaš registracijo.</p>
  <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#231830;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 26px;border-radius:12px">Potrdi e-naslov</a>
  <p style="font-size:13px;line-height:1.6;color:#8a8296;margin:26px 0 0">Če se nisi registrirala pri Pinart Flow, ta mail lahko prezreš.</p>
  <p style="font-size:12px;color:#b3adbd;margin:18px 0 0">Pinart Flow · pinartflow.com</p>
</div>
```

Enako lahko brandaš tudi »Magic Link«, »Change Email«, »Reset Password« template.

## 4. (Beta bližnjica) — če maila ne rabiš takoj
Supabase → Authentication → Email → **izklopi »Confirm email«** (auto-confirm).
Ker je beta zaklenjena s tester-seznamom, potrditev ni varnostno nujna → testerji
se prijavijo takoj brez maila. Za javni launch spet vklopi + uporabi #1–3.

---
Opomba: koda tega ne krmili — vse je Supabase/Resend/DNS config. Ko je #1–2 narejeno,
je videz maila (kdo pošlje) rešen; #3 je vsebina/brand znotraj maila.

# Deploy Pinart Flow na pinartflow.com — runbook

Pripravil Claude, 2026-07-20. Cilj: spraviti trenutno (lokalno) Flow kodo v produkcijo
na pinartflow.com, da delujeta Flow landing IN Google/e-mail prijava.

---

## 0. Zakaj zdaj ne dela (diagnoza)

- `www.pinartflow.com` streže **star deploy** (samo portfolio Hero — packa + oči).
- Celoten Flow produkt (dashboard, prijava, `/auth/callback`, workspaci) je **lokalno,
  necommitano** (~76 datotek, večina `??` = nikoli commitano).
- Zato Google prijava pade: `?code=` pristane na `pinartflow.com/` (Site URL fallback),
  ker stari deploy nima `/auth/callback`.
- **Koda in Supabase URL-nastavitve so pravilne.** Manjka samo deploy.

---

## 1. PREDPOGOJI — to potrebujem od Tine (2 stvari)

1. **Katera veja → pinartflow.com?**
   Preveri v Vercel → Project → Settings → Domains: h kateremu projektu/veji je vezan
   `pinartflow.com`. (Domneva: `pinart.si` = veja `main`, `pinartflow.com` = veja `demo`
   ali ločen projekt. To MORAM vedeti, da push ne povozi pinart.si portfolia.)

2. **Supabase env spremenljivke v tem Vercel projektu.**
   Vercel → Project → Settings → Environment Variables — morajo obstajati (isti kot v
   lokalnem `.env.local`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - (+ karkoli drugega, kar rabi Flow: service key za API, Resend, KALKULATOR_ADMIN_GESLO …)
   Brez teh se build/prijava sesuje.

---

## 2. COMMIT (varno, lokalno)

Že urejeno: `tmp/` dodan v `.gitignore` (ne gre v git). `.env*.local` je že ignoriran
(skrivnosti ostanejo lokalne).

```bash
cd "~/Desktop/Pinart website/pinart-web"
git status            # preveri, da tmp/ NI več na seznamu
git add -A
git commit -m "Pinart Flow: landing, dashboard, prijava, retainer, računovodstvo + responsive"
```

> Če je 76 datotek preveč naenkrat, se lahko commita v temah (Flow app / landing / kalkulator),
> a za prvi deploy je en commit ok.

---

## 3. PUSH → PREVIEW (ne direkt na produkcijo)

```bash
git push origin demo          # ali ustrezna veja iz koraka 1
```

Vercel samodejno zgradi **preview URL** (`*.vercel.app`). Tam preveri PRED produkcijo:
- odpre se Flow landing (`/flow`)
- prijava: Google **in** e-pošta → pripelje na `/kalkulator/pregled`
- Flow strani delujejo (pregled, računi, stranke …)

Če build pade → poglej Vercel build log (najpogosteje manjka env spremenljivka, korak 1.2).

---

## 4. PRODUKCIJA

Ko je preview ok:
- Vercel → promoviraj preview v Production (ali merge veje, ki je vezana na pinartflow.com).

---

## 5. ROOT DOMENE `pinartflow.com/` → Flow landing

Trenutno je `/` = studijski portfolio. Za pinartflow.com naj bo root = Flow landing (`/flow`).
Ker isti app streže tudi pinart.si (portfolio na `/`), rabimo **hostname preusmeritev**:

Opcija A (Vercel rewrite, priporočeno) — v `next.config` dodaj rewrite z `has: host`:
```js
async rewrites() {
  return [{
    source: '/',
    has: [{ type: 'host', value: '(www\\.)?pinartflow\\.com' }],
    destination: '/flow',
  }];
}
```
(To pripravim in testiram šele ob deployu — na localhostu hostname ni pinartflow.com.)

Opcija B: pinartflow.com naj bo ločen Vercel projekt, kjer je root nastavljen na Flow.

---

## 6. SUPABASE / GOOGLE (že urejeno — samo za kontrolo)

- Supabase → Auth → URL Configuration:
  - Site URL: `https://www.pinartflow.com` ✓
  - Redirect URLs: localhost:3456, pinart.si, www.pinartflow.com, pinartflow.com — vsi `/auth/callback` ✓
- Google Cloud Console → OAuth client → Authorized redirect URIs:
  - `https://nfzargetjzywzctsfqwz.supabase.co/auth/v1/callback`

---

## 7. PO DEPLOYU — preveri

- [ ] `pinartflow.com` pokaže Flow landing (ne portfolio packe)
- [ ] Google prijava → `/kalkulator/pregled` (ne root)
- [ ] E-mail registracija + potrditev deluje
- [ ] Flow strani se naložijo z realnimi podatki
- [ ] pinart.si portfolio NEDOTAKNJEN

---

## Kaj Claude NE naredi brez izrecne potrditve
commit, push, deploy, spreminjanje Vercel/Supabase nastavitev. Vse to je tvoja odločitev;
jaz pripravim kodo in ti korake.

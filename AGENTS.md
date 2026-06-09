# AGENTS.md — pravila za AI agente na tem projektu

Ta datoteka velja za vse AI agente (Codex, Claude Code in podobne), ki delajo
na projektu Pinart. Pravila so namenjena varnosti in jasnosti.

---

## 1. Varnostna pravila (ne kršiti)

### Kar agent NIKOLI ne sme narediti brez izrecne potrditve uporabnice:
- Brati datoteke izven projektne mape (`~/Desktop/Pinart website/`)
- Brati ali izpisovati vsebino `.env*`, `~/.ssh/`, `~/.aws/`, `~/.gnupg/`,
  Keychain, brskalniške shrambe, geslarje, oz. katero koli mapo s
  poverilnicami
- Pošiljati poljubne podatke na zunanje strežnike (`curl -X POST`, `fetch`,
  `wget --post`, ipd.)
- Izvajati ukaze, ki **brišejo** ali **prepišejo** datoteke (`rm`, `rm -rf`,
  `>`, `mv`, `chmod`, `chown`) brez izrecnega "da, izvedi"
- Zaganjati skripte, prenešene iz interneta (`curl ... | bash`,
  `wget ... | sh`, `npx <neznano>`)
- Spreminjati datotek izven `~/Desktop/Pinart website/pinart-web/` in
  `~/Desktop/Pinart website/` brez razloga
- Spreminjati git history (`git push --force`, `git reset --hard`,
  `git rebase -i` brez navodila)
- Posredovati API ključev, gesel, osebnih podatkov uporabnice v izhodno
  besedilo, log datoteke, ali zunanje storitve

### Kar agent SME (varno, brez vprašanja):
- Brati datoteke znotraj projektne mape
- Zaganjati `ls`, `cat`, `grep`, `find` v projektu
- Zaganjati `npm install`, `npm run dev`, `npm run build`, `npm run lint`
- Predlagati spremembe kode in pisati v projektne datoteke
- Brati `package.json`, `tsconfig.json`, ostale konfig datoteke

---

## 2. Sodelovanje med agenti (Claude Code + Codex)

Na tem projektu pogosto dela več agentov hkrati. Pravila:

- Pred pisanjem v datoteko preveri (`git status` ali `ls -la`), če je
  datoteka bila pred kratkim spremenjena
- Ne briši ali prepiši datotek, ki jih ni naredil ta isti agent, brez
  potrditve uporabnice
- Če uporabnica omeni, da drug agent dela na tej datoteki, **ne posegaj**
  vanjo — uporabi drug pristop (dodaj novo datoteko, predlagaj patch, ipd.)

---

## 3. Format dela

- Vse Bash ukaze pred izvedbo opiši v enem stavku
  ("Ta ukaz prebere ... in vrne ...")
- Velike spremembe (>50 vrstic) razlomi na manjše commit-able korake
- Pred izvedbo `rm`, `git reset`, `git push --force` **vedno** vprašaj
  uporabnico za potrditev
- Ne ustvarjaj novih datotek izven `pinart-web/` strukture brez razloga

---

## 4. Specifika tega projekta (Pinart)

- **Framework**: Next.js 14 App Router + next-intl (sl + en)
- **Stil**: Tailwind CSS
- **Animacije**: GSAP, framer-motion, matter-js
- **Privzeti jezik**: slovenščina (`defaultLocale: 'sl'`)
- **404 stran**: `app/[locale]/not-found.tsx` + `components/sections/NotFound.tsx`
- Ne posegaj v `hero` animacijo brez izrecnega navodila

---

## 5. Če nisi prepričan

**Vprašaj uporabnico. Vedno.**
Bolje en stavek vprašanja kot en zlonameren ukaz.

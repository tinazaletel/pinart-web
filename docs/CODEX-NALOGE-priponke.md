# Codex — priponke v pošti (23. 8. 2026)

## Zakaj je to prvo

Tina: *»mail brez slik je neuporaben in tako ne morem štartat«* in *»to ni ok
moramo imeti priponke«*. To je edina stvar, ki ji preprečuje začetek.

## Kaj je danes narobe

**Prejem — priponka se tiho zavrže.** [`app/api/posta/prejeto/route.ts:36`](../app/api/posta/prejeto/route.ts)
sprejme samo ta polja:

```
token, from, to, subject, text, html, messageId, inReplyTo
```

Polja za priloge **ni**. Cloudflare Worker preda mail, priponka pade v nič.
Uporabnica vidi mail, ki izgleda popoln, priponke pa ni in nikjer ne piše, da
je bila. Isto velja za `PostaVnos` v `lib/postaDnevnik.ts`.

**Pošiljanje — priponke ni mogoče pripeti.** V `ArhivWorkspace` na dveh mestih
piše: »Do postavitve pošiljanja s priponko pripni PDF ročno.«

## Kaj naredi, po vrsti

1. **Vhodni endpoint sprejme priloge.** Razširi telo zahtevka s seznamom
   prilog (ime, mime, velikost, vsebina). Preveri velikost in tip; zavrni
   izvršljive datoteke.
2. **Shramba.** Uporabi obstoječi `uploadBusinessDocument(file, section, id)` iz
   `lib/pinartFlowCloud.ts` — isti vzorec kot priloge pri stroških in pogodbah.
   Predlagana sekcija: `mail`.
3. **Zapis.** `PostaVnos` dobi polje s prilogami (ime, pot, mime, velikost).
   Stari zapisi ga nimajo in morajo delovati naprej.
4. **Prikaz.** V `KomunikacijaWorkspace` pokaži priloge pod sporočilom, s
   prenosom prek `getBusinessDocumentUrl`.
5. **Pošiljanje.** `lib/posiljatelj.ts` (Resend) dobi možnost pripenjanja.

**Če kateri koraka ne gre do konca, naredi vsaj tega:** ob prejemu zabeleži,
da je priloga bila, tudi če je ne shraniš — »priloga: pogodba.pdf (ni
shranjena)«. Tiho izginjanje je najhujše.

## Meje

Ne odpiraj: `components/KalkulatorApp.tsx`, `components/PupaDom.tsx`,
`components/PupaPogovor.tsx`, `components/TaskManagerWorkspace.tsx`,
`lib/danes.ts`, `docs/` (pravni dokumenti so v delu).

## Preverjanje

```
npx tsc --noEmit
npm test
```

Ne poganjaj `npm run build`, kadar teče dev strežnik na 3456.

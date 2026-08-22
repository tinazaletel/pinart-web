# Naloge za Codex — trinajsta runda, 22. 8. 2026

Projekt: `~/Desktop/Pinart website/pinart-web`. Slovenska koda in komentarji.

## Pravila

- **NE dotikaj se** (delam v njih): `components/BusinessOverview.tsx`,
  `app/[locale]/kalkulator/pregled/pregled.module.css`,
  `components/KalkulatorApp.tsx`, `components/PupaDom.tsx`
- **NE poganjaj `npm run build`** (dev na 3456). `npx tsc --noEmit`, `npx vitest run`.
- **NE potiskaj na `main`.** Samo `demo`.
- Paleta: vijola `#6E4FA6`, napaka `#a4342a`, uspeh `#2F5D50`. Rumene ni.
- Ne uporabljaj `#8a8177` — pade na kontrastu (3,83 : 1).

---

# 1. Vsi dokumenti se natisnejo z oštevilčenimi stranmi

Tina, 22. 8.: pokazala je tuj dokument z nogo »Stran 1 od 2« in pripomnila, da
Flow s tem nima urejeno.

**Kaj že dela:** PDF ponudbe. Nastane na strežniku
(`app/api/ponudba-pdf/route.ts`) in ima v nogi `Stran <pageNumber> / <totalPages>`.

**Kaj ne dela:** vse, kar se tiska iz brskalnika — Business Canvas
(`lib/natisni.ts`), arhivski izvoz (`components/ArhivWorkspace.tsx`,
funkcija `izvoziDokument`) in prihodnji poslovni načrt. Ti dokumenti številk
nimajo in jih **brskalnik ne more dodati**: v trenutku tiskanja ne ve, koliko
strani bo. To ni pomanjkljivost CSS, ampak omejitev tiskanja iz strani.

**Naloga:** ti dokumenti naj gredo skozi **isto strežniško pot** kot ponudba,
da dobijo enako nogo.

- Posploši `app/api/ponudba-pdf/route.ts` ali dodaj sorodno pot, ki sprejme
  **HTML dokumenta** in naslov, ter vrne PDF z isto nogo in robovi.
- `lib/natisni.ts` naj dobi drugo pot: namesto odpiranja okna pošlje HTML na
  strežnik in ponudi PDF v prenos. Obstoječi klic `natisniElement` naj ostane
  kot rezerva, če strežnik ni dosegljiv — tiskanje ne sme odpovedati tiho.
- **Past, ki je že bila ujeta in je ne izgubi:** `outerHTML` vrne ZAČETNO
  stanje polj, ne vpisanega. `lib/natisni.ts` zato polja pred izvozom zamenja z
  besedilom. Ta korak mora ostati tudi na novi poti.
- Preveri na Business Canvasu (ležeči A4) in na arhivskem izvozu ponudbe,
  pogodbe in računa.

**Merilo:** natisnjen canvas ima v nogi »Stran 1 od 2«, enako kot ponudba, in
na papirju ni gumbov ne praznih okvirjev.

---

# 2. Priporoči Flow — dokončaj, kar manjka

V enajsti rundi je nastala migracija `20260821030000_priporoci_flow.sql`.
Preveri, kaj od tega dejansko deluje v vmesniku, in dokončaj:

- **Povabilo:** uporabnica dobi svojo povezavo; kdor se prek nje registrira, se
  zabeleži. Nagrado samo **evidentiraj**, o obliki odloči Tina.
- **Donacija:** tih pas v nastavitvah ali nogi — »Flow ti prihrani čas? Podpri
  razvoj.« Brez pojavnih oken; kdor ga zapre, ga ne vidi več.
- Če je kaj od tega že narejeno, v poročilu napiši **kaj** in ne delaj znova.

Ne vgrajuj plačilnega ponudnika. Stripe pride ločeno.

---

## V poročilu napiši

Katere datoteke si spremenil, ali si kaj našel že narejenega, in **kaj od tega
je preverjeno na živem primeru** — ne le da se prevede.

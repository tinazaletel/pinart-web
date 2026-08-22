# Naloge za Cline — 22. 8. 2026

Projekt: `~/Desktop/Pinart website/pinart-web`. Slovenska koda in komentarji.
Preberi `CLAUDE.md` v korenu in ga spoštuj.

## Pravila sodelovanja — na projektu delajo štirje hkrati

- **NE dotikaj se** (drugi so notri): `components/BusinessOverview.tsx`,
  `app/[locale]/kalkulator/pregled/pregled.module.css`,
  `components/KalkulatorApp.tsx`, `components/PupaDom.tsx`, `lib/natisni.ts`,
  `components/ArhivWorkspace.tsx`, `app/api/ponudba-pdf/**`
- **NE potiskaj na `main`.** Samo `demo`.
- **NE poganjaj `npm run build`** — dev teče na vratih 3456. Preverjaj z
  `npx tsc --noEmit` in `npx vitest run`.
- Migracijo samo **napiši**, ne poganjaj proti bazi; SQL podaj v poročilu.
  Prva prosta številka: **`20260822010000`**.
- Paleta: vijola `#6E4FA6`, napaka `#a4342a`, uspeh `#2F5D50`. Rumene ni.
  Ne uporabljaj `#8a8177` — pade na kontrastu (3,83 : 1).

---

# Klepeti, deljeni z mano

## Kaj obstaja

Oblačni klepet dela: Supabase, RLS in sprotno osveževanje. Uporabnica lahko
klepet **deli** s sodelavcem.

## Kaj ne dela

Deljenje teče **samo v eno smer**. Tisti, s katerim je klepet deljen, ga v
svojem Flowu **ne vidi nikjer** — nima seznama, kamor bi deljeni klepet prišel.
Deljenje je torej danes brez učinka; kdor deli, misli, da je nekaj poslal, in
ni.

## Kaj naredi

1. **Najprej razišči in poročaj, preden pišeš kodo.**
   `grep -rn "klepet\|chat" lib/ components/ --include=*.ts --include=*.tsx | head -40`
   Ugotovi, kje je deljenje shranjeno in ali obstaja tabela za prejemnike. V
   poročilu napiši, kaj si našel — mogoče je polovica že tam.

2. **Prejemnik mora deljeni klepet videti.** V seznamu klepetov naj bo ločen
   razdelek »Deljeni z mano«, z imenom osebe, ki je klepet delila, in datumom.

3. **Pravice naj bodo jasne.** Prejemnik bere in piše; **ne** more klepeta
   deliti naprej niti ga izbrisati. Brisanje ostane pri lastniku.

4. **Preklic deljenja mora delovati takoj.** Ko lastnik prekliče, klepet
   prejemniku izgine; odprt pogled naj se zapre s pojasnilom, ne s prazno stranjo.

5. **RLS je tu bistvena.** Prejemnik sme videti **samo** klepete, ki so mu
   izrecno deljeni — nikoli celotne organizacije. Politiko napiši po vzorcu
   sosednjih migracij in v poročilu pojasni, zakaj je varna.

## Preizkusi, ki jih moraš opraviti

- Deljenje z osebo, ki še ni v organizaciji → jasno sporočilo, ne tiha napaka.
- Preklic med tem, ko ima prejemnik klepet odprt.
- Dva prejemnika hkrati.
- Prejemnik poskusi izbrisati klepet → ni mu dovoljeno.

## Česa NE delaj

- Ne uvajaj obvestil po e-pošti v tej rundi.
- Ne spreminjaj obstoječega deljenja projektov; to je svoj sistem.

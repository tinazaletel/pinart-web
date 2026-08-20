# Naloge za Codex — deveta runda, 20. 8. 2026

Projekt: `~/Desktop/Pinart website/pinart-web`. Slovenska koda in komentarji.

Dve nalogi. **Prva je pravna in ima prednost.** Vzemi ju po vrsti; če zmanjka
časa, naj druga počaka.

## Pravila

- **NE dotikaj se** (drugi delajo v njih): `components/AgentTabla.tsx`,
  `components/PupaDom.tsx`, `components/Pupa.tsx`, `components/FlowCloudBridge.tsx`,
  `components/EvidencaCasa.tsx`, `lib/evidencaCasa*.ts`, `lib/casovniZig.ts`,
  `app/api/agent-naloge/**`, `app/api/cron/**`, `app/api/sef/**`, `vercel.json`,
  ter karkoli iz svoje **osme runde** (`docs/CODEX-NALOGE-crm.md`) — profil
  stranke in `crm_dnevnik` sta tvoja, a v tej rundi ju pusti pri miru.
- **NE poganjaj `npm run build`** (dev na 3456). Preverjaj z `npx tsc --noEmit`
  in `npx vitest run`.
- Migracije v tej rundi najbrž ne rabiš. Če jo, je prva prosta številka
  **`20260821020000`**.
- Paleta: vijola `#6E4FA6`, napaka `#a4342a`, uspeh `#2F5D50`. **Rumene ni.**

---

# 1. Dostopnost — WCAG 2.1 AA

## Zakaj to šteje

Flow gre na ameriški trg. V ZDA je nedostopna spletna storitev podlaga za
tožbo po ADA in teh tožb je vsako leto več; toženi so tudi majhni ponudniki.
V EU velja Evropski akt o dostopnosti od 28. 6. 2025, a **mikropodjetja so pri
storitvah izvzeta** — Tina torej ni zavezana, je pa izpostavljena v ZDA.

To ni kljukica za skladnost. Kdor dela s tipkovnico ali bralnikom zaslona,
danes Flowa najbrž ne more uporabljati, in tega ne bomo izvedeli, ker nam tak
uporabnik ne bo pisal — samo odšel bo.

## Kaj naredi

**1. Najprej PREGLEJ, potem popravljaj.** Napiši poročilo
`docs/DOSTOPNOST-pregled.md`: kaj si preveril, kaj je padlo, kaj si popravil,
kaj ostaja. Brez pregleda je popravljanje ugibanje.

**2. Kontrast (WCAG 1.4.3).** Besedilo mora imeti razmerje **4,5 : 1**, veliko
besedilo 3 : 1. Preglej dejansko uporabljene pare barv — posebej sivine
`#6b655d`, `#8a8177` in vse, kar sedi na `#F5F2EA`. Izračunaj razmerja, ne
oceni na oko. Kjer pade, potemni besedilo; **ne** posvetli ozadja in **ne**
spreminjaj vijole `#6E4FA6`.
Tinino stalno pravilo: nikoli siv tanek tekst (weight 300) za vsebino.

**3. Tipkovnica (2.1.1, 2.4.7).** Vsak gumb, izbirnik in modalno okno mora
biti dosegljiv s Tab in uporaben z Enter/Space. Poišči `onClick` na `div` in
`span` brez `role`/`tabIndex` — teh je v projektu več. Vidno stanje fokusa
mora obstajati povsod (`:focus-visible`, obroč v vijoli), tudi tam, kjer je
kdo napisal `outline: none`.

**4. Modalna okna.** Fokus se ob odprtju premakne vanje, Esc jih zapre, fokus
se vrne na gumb, ki jih je odprl, in Tab ne uide ven. Poišči obstoječa
(`grep -rn "role=\"dialog\"\|modal\|Modal" components/`) in jih poenoti — če
je vzorcev več, naredi **eno** skupno rešitev in jo uporabi povsod.

**5. Obrazci (1.3.1, 3.3.2).** Vsak vnos ima `<label>`, povezan z `id`, ne le
`placeholder`. Napake naj bodo povezane prek `aria-describedby` in objavljene
z `aria-live="polite"`, sicer bralnik zaslona zanje ne izve.

**6. Sporočila o stanju (4.1.3).** »Shranjeno«, »Poslano«, »Ni uspelo« naj
imajo `role="status"` oz. `role="alert"`.

**7. Struktura strani.** Ena `<h1>` na stran, naslovi po vrsti brez preskokov,
`<main>` na vsaki strani, in **preskoči na vsebino** povezava kot prvi
fokusabilni element.

**8. Slike in ikone.** Okrasne ikone `aria-hidden="true"`; ikone, ki so edina
vsebina gumba, rabijo `aria-label`. Vsebinske slike rabijo `alt`.

**9. Izjava o dostopnosti — POZOR, obstaja in TRDI STVARI.**
Strani NE piši na novo: `app/[locale]/dostopnost/page.tsx` že obstaja. Težava
je, da v razdelku »Ukrepi za dostopnost« **že zdaj obljublja** kontrast 4,5 : 1,
vidno oznako fokusa, nadomestna besedila in semantično strukturo.

Tvoja naloga je, da vsako od teh trditev **narediš resnično** — ali pa trditev
popraviš, da ustreza stanju.

To je najpomembnejši del te runde. Neresnična izjava o dostopnosti je v
sporu **slabša od nobene**: nasprotna stran jo predloži kot dokaz, da smo za
pomanjkljivost vedeli in jo zamolčali. Vsako trditev, ki je po pregledu ne
moreš podpreti, prestavi iz »Ukrepi« v »Znane omejitve«.

Če dodajaš vsebino, ne pozabi: samostojne strani rabijo `var(--font-serif-flow)`,
ne `var(--font-serif)`, sicer dobiš napačno pisavo.

## Česa NE delaj

- Ne dodajaj knjižnice za dostopnostni pregled v produkcijski sveženj.
- Ne preoblikuj postavitev. To je runda za kontrast, fokus in oznake, ne za
  novo obliko.
- Ne spreminjaj vrednosti, ki jih je Tina že ročno popravila (paddingi,
  velikosti pisav). Če kontrast zahteva spremembo, spremeni **barvo**.

---

# 2. Nit pogovora v Komunikacijah

Trenutno so poslana in prejeta sporočila ločeni zapisi. Ko se stranka odzove,
ni videti, na kaj se odziva.

- Sporočila iste zadeve z isto stranko naj se prikažejo kot **nit**, novejše
  spodaj, z odmikom za prejeto proti poslanemu.
- Povezovanje: `In-Reply-To` / `References` iz glave, kjer ju imamo; sicer
  normalizirana zadeva (odstrani `Re:`, `Fwd:`, `RE:`) **plus** naslov stranke.
- V seznamu naj se nit prikaže kot **ena vrstica** z zadnjim sporočilom in
  številom v niti, ne kot pet ločenih vrstic.
- Oznaka projekta velja za celo nit, ne za posamezno sporočilo — glej
  obstoječi vzorec označevanja.

Ne gradi dohodnega nabiralnika in ne poskušaj brati tuje pošte. Flow ni drugi
Gmail; Komunikacije so **projektni zapis** tega, kar je šlo skozi Flow.

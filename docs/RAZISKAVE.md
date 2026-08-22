# Raziskave — kaj vemo in od kod

**Zakaj ta dokument.** 22. 8. 2026 se je izkazalo, da so bile raziskave
opravljene, a so živele le v spominu pogovorov. Zato smo razpone popravljali po
občutku in dvakrat zgrešili. Tu je zbrano vse, kar je bilo raziskano, z datumom
in virom. Kar ni preverjeno, je tako tudi označeno.

**Kako brati:** vsak razdelek pove ugotovitev in kje so podrobnosti. Podrobne
raziskave so v svojih datotekah, da ta ostane pregleden.

---

## 1 · Cene storitev

**Kje:** [`CENE-RAZISKAVA.md`](CENE-RAZISKAVA.md) — najbolj obsežna raziskava,
z lastnim pregledom vseh 25 storitev.

Na kratko: priporočila **Društva oblikovalcev Slovenije** (točka 4,00 €,
formula obsega rabe `Vp = (A × B × C) × Voz`, produkcija se ne množi), **Tinin
cenik** z razponi za Slovenijo in razmerjem ZDA ≈ 1,5–2 ×, ter **pregled
javnih ponudb** (Omisli.si, 99designs, Upwork) z 22. 8. 2026.

**Za obrambo pred očitkom »cene niso realne«:** Flow sledi priporočilom
stanovskega društva, ne občutku.

## 2 · Avtorske pravice in tantieme

**Kje:** [`CENE-RAZISKAVA.md`](CENE-RAZISKAVA.md), vir 3. Opravljeno 16. 7. 2026,
**22 virov**, med njimi primarni (`eur-lex`, Uradni list, `copyright.gov`).

Ključno za izdelek: v **Sloveniji in EU popoln odkup pravic pravno ni mogoč** —
prenesejo se le posamezne materialne pravice, pisno. V ZDA je odkup dovoljen, a
je pravica do preklica po 35 letih neodpovedljiva. Tantieme so vezane na
**kategorijo izdelka**, ne na državo (3–10 % za oblikovanje, do 15–20 % za
znamke).

Metoda množiteljev ni naša iznajdba: nemški **AGD/VTV** in francoski **UPP**
uporabljata isto logiko. VTV navaja ≈ 120 €/uro za strateško oblikovanje.

## 3 · Validacija pri ciljnih uporabnicah

**Kdaj:** 14. 8. 2026. Dva pogovora, obe v ciljni skupini.

- **Maja**, ročna ilustratorka: obstoječa orodja so ji **prezahtevna**; preveč
  različnih orodij se mora naučiti, preden se sploh premakne.
- **Petra**, direktorica marketinga: isto mnenje.

**Sklep:** USP ni moč, ampak **preprostost** — »vse na enem mestu, preprosto«.
Nizka učna krivulja je glavna vrednost, ne dodatek. To je argument proti
kompleksni konkurenci (Notion, Bitrix) in podlaga za odločitev, da je Pupa
**en sam vhod** namesto skakanja med orodji.

**⚠️ Omejitev:** dva pogovora nista vzorec. Pred zagonom bi bilo vredno
preveriti še pri treh do petih ljudeh, predvsem pri takih, ki Flowa ne poznajo.

## 4 · Pozicioniranje in konkurenca

**Kdaj:** 20. 7. 2026, dopolnjeno kasneje.

Izhodišče: »vse tvoje poslovanje na enem mestu« v treh sekundah ne pove
razlike — zveni kot še eno pisarniško orodje. Prava razlika: **Flow ve, koliko
je vredno tvoje delo** (poštena cena z avtorskimi pravicami in tržni pregled).

**Proti generičnim orodjem** (Notion, ChatGPT): tam dobiš prazen prostor, ki ga
moraš sestaviti sam. Flow je vertikala s pripravljenim procesom, bazo in
persono.

**Tržni benchmark kot moat:** iz cen, ki jih uporabniki vpisujejo, Flow gradi
**anonimno in združeno** sliko dejanskih cen in pokaže, kje je uporabnikova
cena. Osebni podatki se ne prodajajo; anonimizirane cene so vrednost, ne
kršitev zasebnosti.

**Bitrix24** je vir idej za funkcije, **ne** vzor za uporabniško izkušnjo.

## 5 · Podatki o podjetjih (samodejna izpolnitev)

**Kdaj:** raziskava 6. 8. 2026, ponudba AJPES prejeta 21. 8. 2026.

**Ugotovitev:** za samodejni **promet** podjetja **ni brezplačnega vira**.
Odprti podatki AJPES (`podatki.gov.si`) dajo le identiteto — naziv, naslov,
matično. Promet je javen le kot dokument letnega poročila; strganje je krhko.

**Ponudba AJPES proFi=Po** (21. 8. 2026): sistem točk, 1 točka na podjetje za
poenoteno letno poročilo, 4 točke za revidirano ali konsolidirano. Točka se
porabi **le ob prvem vpogledu** za isto podjetje, isto vrsto poročila in isto
leto; nato je spremljanje brezplačno do novih poročil (predvidoma vsak maj).
Paketi ne potečejo.

| paket | ožja shema (z DDV) | širša shema (z DDV) |
|---|---:|---:|
| 200 točk | 244 € | 366 € |
| 500 točk | 549 € | 823,50 € |
| 1.000 točk | 976 € | 1.464 € |
| 2.000 točk | 1.708 € | 2.562 € |
| 5.000 točk | 3.050 € | 4.575 € |

**Ključno:** podatke je **dovoljeno hraniti v lastni bazi**, zato je strošek na
**podjetje**, ne na poizvedbo — pri paketu 5.000 to pomeni okoli 0,50 € na
podjetje. Za primerjavo: D&B paket, ki ga je omenila Petra, je okoli 2.000 €.

**⚠️ Nepreverjeno:** kaj natanko vsebuje ožja in kaj širša shema, ali vgradnja
v plačljivo storitev zahteva posebno licenco, in ali se točka porabi tudi za
podjetje brez objavljenega letnega poročila. Vprašanja so poslana.

**Stanje:** ročni vnos prometa v kalkulatorju **že dela**; samodejni je
post-launch in ni ovira za zagon.

## 6 · Mobilna aplikacija

**Kdaj:** 4. 8. 2026.

| pot | trud | kdaj | pokrije |
|---|---|---|---|
| PWA (namestljivo) | 1–2 dni | lahko kmalu | Android, iOS omejeno |
| Capacitor ovoj | 1–2 tedna + pregled trgovin | post-launch | iOS **in** Android iz iste kode |
| Native React Native | meseci, ločena koda | ne pred PMF | — |

**Sklep:** Capacitor pomeni **ena koda → obe trgovini**, zato native nima
smisla. Za zagon zadošča mobilna odzivnost, po želji PWA.

## 7 · Dostopnost

**Kje:** [`DOSTOPNOST-pregled.md`](DOSTOPNOST-pregled.md). Opravljeno 20. 8. 2026.

Izmerjen kontrast pogostih sivin: `#8a8177` na beli je **3,83 : 1** in za
drobno besedilo **pade** (zahteva je 4,5 : 1); `#6b655d` z 5,76 : 1 ustreza.
Popravljeno: globalna oznaka fokusa, preskok na vsebino, `prefers-reduced-motion`.
Odprto: past za fokus v modalnih oknih, ročni pregled z bralnikom zaslona.

**Zakaj šteje:** v ZDA je nedostopna storitev podlaga za tožbo po ADA. V EU
velja Evropski akt o dostopnosti, a so **mikropodjetja pri storitvah izvzeta**.

## 8 · Naročnine in plačila

**Kje:** [`NACRT-narocnine.md`](NACRT-narocnine.md). Odločitve potrjene 20. 8. 2026.

Ključna odločitev: po neuspelem plačilu **ne uvajamo lastnega odštevanja** —
dostop ostane, dokler Stripe poskuša (do ~2 tedna), varovalka 30 dni. Razlog:
v Sloveniji nova kartica po pošti pride v teden ali dva.

Nadgradnja takoj s preračunom, znižanje ob koncu obdobja. Ustanovna cena je
ločen Price, ne kupon. Brez lastnega obrazca za kartice (PCI).

## 9 · Evidenca delovnega časa (ZEPDSV)

**Kdaj:** 20. 8. 2026, ob izdelavi modula.

Novela ZEPDSV-A (velja od 20. 11. 2023) zahteva evidenco za vsakogar, ki
opravlja delo, vključno s študenti in samozaposlenimi v delovnem procesu.
Globe do 20.000 €. Zahtevani podatki: prihod in odhod, **obseg** odmora,
nadure, delo ob nedeljah in praznikih, razlogi za odsotnost.

**Ni pokrito:** trajna hramba (zakon evidenco šteje za listino trajne
vrednosti), seznanitev delavca z mesečnim izpisom, in revizijska sled o
naknadnih popravkih.

## 10 · Časovni žig avtorstva

**Kje:** [`SEF-casovni-zig.md`](SEF-casovni-zig.md). Živ preizkus 20. 8. 2026.

Uporabljen RFC 3161 proti `freetsa.org`. Preizkus: odziv 567 ms, ura strežnika
1 sekundo od naše, podtaknjena zgostitev pravilno zavrnjena.

**Omejitev:** freetsa **ni kvalificirana** overitelj po eIDAS. Za pravdo v EU
bi kvalificiran ponudnik štel več; naslednja stopnja, plačljiva.

---

## Kaj še ni raziskano

1. **Cene storitev v tujini po posameznih storitvah** — imamo le nemško urno
   postavko in razmerje ZDA ≈ 1,5–2 ×. Manjkajo ankete o honorarjih (AIGA, GDC,
   nacionalna društva).
2. **Točkovnik DOS po storitvah** — vrednost točke poznamo, število točk na
   storitev pa ne.
3. **Validacija pri ljudeh, ki Flowa ne poznajo** — dosedanja sta dva pogovora
   v ožjem krogu.
4. **Konkurenčne SaaS cene** (Bonsai, HoneyBook, Moxie in podobni) — koliko
   stanejo in kaj obljubljajo; podlaga za naše pakete.

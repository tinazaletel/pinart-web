# Poveži Flow s Claudom

To navodilo je za vsakogar — programiranja ne potrebuješ. Ko končaš, boš lahko
Clauda preprosto vprašal:

> »Kdo mi še ni plačal?«
> »Katere ponudbe čakajo na odgovor?«
> »Kako stojim s stranko Novak?«

in Claude bo odgovoril iz **tvojih pravih podatkov v Flowu** — ne bo ugibal.

Povezavi se strokovno reče **MCP strežnik**, v Claudu pa **konektor**
(*connector*). To je vse, kar moraš vedeti o imenu.

---

## Kaj Claude lahko vidi in česa ne

To je pomembno, zato takoj na začetku.

**Claude lahko BERE:**

- stranke (ime, kontakt, e-pošta, telefon, naslov, davčna številka)
- projekte (naslov, status, faza, katera stranka)
- ponudbe (številka, znesek, status, datum, veljavnost)
- račune (številka, znesek, rok plačila, ali je plačan)

**Claude NE more:**

- ničesar spremeniti, dodati ali izbrisati — povezava je **samo za branje**
- videti podatkov kogar koli drugega; vidi izključno **tvoje podjetje**
- poslati ponudbe ali računa, ustvariti stranke, spremeniti zneska

Tudi če ga izrecno prosiš, naj kaj spremeni, tega ne zmore — orodij za pisanje
v tej različici preprosto ni. Pisanje pride kasneje in bo posebej označeno.

---

## Korak 1: pridobi svoj ključ

Ključ je dolgo geslo, ki se začne s `pf_`. Z njim Claude dokaže, da sme do
tvojih podatkov. Izgleda približno takole:

```
pf_A7dQ3xK9mZp2rT8vN4hL6wY1sB5cF0jG7kD3nQ8eR2u
```

Ključ ustvari **skrbnik podjetja** v Flowu. Če si to ti, super; sicer prosi
osebo, ki vam ureja Flow.

> **Pomembno:** ključ se prikaže **samo enkrat**, takoj ob nastanku.
> Prekopiraj ga in shrani na varno (geslar, npr. 1Password ali Apple Gesla).
> Če ga izgubiš, ga ni mogoče znova prikazati — narediš pač novega.

Ključ je enakovreden dostopu do tvojih poslovnih podatkov. Ravnaj z njim kot z
geslom: ne pošiljaj ga po e-pošti, ne lepi v klepet, ne shranjuj v beležko.

---

## Korak 2: dodaj konektor v Claude

Postopek se malce razlikuje glede na to, kakšen paket Clauda imaš.

### Če imaš Free, Pro ali Max

1. V Claudu odpri **Customize → Connectors** (Prilagodi → Konektorji).
2. Klikni **Add custom connector** (Dodaj konektor po meri).
3. V polje za naslov strežnika prilepi:

   ```
   https://www.pinartflow.com/api/mcp
   ```

4. Odpri razdelek **Request headers** (Glave zahtevka).
5. Za ime glave izberi s seznama **`authorization`**.
6. V polje z vrednostjo vpiši besedo `Bearer`, **presledek** in svoj ključ:

   ```
   Bearer pf_tukaj-tvoj-kljuc
   ```

   > Beseda `Bearer` in presledek za njo sta obvezna. Claude pošlje vrednost
   > točno tako, kot jo vpišeš, in brez te besede te strežnik ne bo spustil
   > naprej.

7. Klikni **Add** (Dodaj).

### Če imaš Team ali Enterprise

Konektor doda **lastnik organizacije**:

1. **Organization settings → Connectors**
2. **Add → Custom**; če te vpraša za vrsto, izberi **Web**.
3. Naslov strežnika, glava `authorization` in vrednost `Bearer pf_...` so
   enaki kot zgoraj.
4. **Add**.

Nato gre vsak član v **Customize → Connectors**, poišče konektor z oznako
»Custom« in klikne **Connect**.

> **Opomba:** vpisovanje ključa prek »Request headers« Anthropic uvaja
> postopoma (funkcija je v beta fazi). Če razdelka **Request headers** v
> pogovornem oknu še ne vidiš, tvoj račun te možnosti še nima — počakaj na
> posodobitev ali se obrni na Anthropic za zgodnji dostop.

---

## Korak 3: preveri, ali dela

Odpri nov pogovor s Claudom. S klikom na **+** v pogovoru preveri, da je pod
**Connectors** povezava s Flowom vklopljena.

Nato vprašaj nekaj preprostega:

> »Koliko strank imam v Flowu?«

Claude bo prosil za dovoljenje, da uporabi orodje — potrdi. Če dobiš številko,
ki se ujema s tvojim Flowom, je vse pripravljeno.

Prvič bo Claude za vsako orodje vprašal za dovoljenje. Ker povezava ničesar ne
spreminja, lahko mirno izbereš »Always allow« (Vedno dovoli).

---

## Kaj vse lahko vprašaš

| Kaj te zanima | Vprašaj približno tako |
| --- | --- |
| Seznam strank | »Katere stranke imam?«, »Poišči stranko Novak« |
| Kontakt stranke | »Daj mi e-pošto in telefon stranke Novak« |
| Projekti v teku | »Kaj imam trenutno v delu?« |
| Projekti ene stranke | »Kateri projekti tečejo za Novak?« |
| Ponudbe brez odgovora | »Katere ponudbe sem poslal in še čakam na odgovor?« |
| Uspešnost ponudb | »Koliko ponudb je bilo sprejetih in koliko zavrnjenih?« |
| Neplačani računi | »Kdo mi še ni plačal?«, »Kaj je že zapadlo?« |
| Pregled ene stranke | »Kako stojim s stranko Novak?« |

Claude zna odgovore tudi povezati, na primer:

> »Naredi mi seznam strank, ki imajo zapadle račune, urejen po znesku.«

Zneski so vedno navedeni skupaj z valuto. Če izdajaš v več valutah, Claude
seštevke prikaže ločeno po valutah in jih ne bo napačno seštel skupaj.

---

## Ko kaj ne dela

**»Neveljaven ali manjkajoč API ključ«**
Ključ je napačen, pretečen ali preklican. Najpogostejši vzrok: v vrednosti
manjka beseda `Bearer` in presledek pred ključem. Preveri vpis; če ne pomaga,
ustvari nov ključ in ga zamenjaj.

**»Ključ nima pravice branja«**
Ključ je bil ustvarjen brez pravice branja. Prosi skrbnika za nov ključ z
obsegom `branje`.

**»Preveč zahtev, poskusi čez minuto«**
Prehitro zaporedje vprašanj. Počakaj minuto in nadaljuj.

**Claude pravi, da orodij nima**
Preveri, da je konektor vklopljen v tem pogovoru (gumb **+** →
**Connectors**). Vklop velja za posamezen pogovor.

**Claude vidi zastarele podatke**
Vsako vprašanje bere svežo sliko iz Flowa; ničesar ne shranjuje vnaprej. Če se
podatek ne ujema, preveri, ali je bil v Flowu res shranjen.

---

## Varnost

- Ključ velja za **celo podjetje**, ne za posameznika. Kdor ga ima, vidi
  poslovne podatke podjetja.
- Povezava je **samo bralna** — nihče prek nje ne more ničesar spremeniti.
- Ključ lahko **kadar koli prekličeš**. Preklican ključ takoj neha delovati;
  Claude nato javi napako in podatkov ne dobi več.
- Če sumiš, da je ključ ušel (poslan po e-pošti, ostal v skupnem dokumentu),
  ga prekliči in ustvari novega. To je hitro in ne pokvari ničesar drugega.
- Vsakemu ključu se beleži, kdaj je bil nazadnje v rabi — tako vidiš, ali je še
  kdo aktiven.

---

## Za tehnične bralce

Kdor uporablja **Claude Code**, konektor doda z enim ukazom:

```bash
claude mcp add --transport http pinart-flow https://www.pinartflow.com/api/mcp \
  --header "Authorization: Bearer pf_tvoj-kljuc"
```

Nekaj podrobnosti o strežniku:

- **Končna točka:** `POST https://www.pinartflow.com/api/mcp`
  (`GET` in `DELETE` vrneta 405 — transport uporablja izključno POST)
- **Transport:** Streamable HTTP; odgovori so en sam JSON objekt
  (`application/json`), SSE ni potreben
- **Različice protokola:** strežnik je dvoeroben — govori revizijo `2026-07-28`
  (brez seje, `server/discover`, `_meta` v vsakem zahtevku) in starejše
  revizije z rokovanjem `initialize` (`2025-11-25`, `2025-06-18`, `2025-03-26`,
  `2024-11-05`)
- **Avtentikacija:** `Authorization: Bearer pf_...`; brez veljavnega ključa
  vsaka metoda, vključno z `initialize`, vrne 401
- **Orodja:** `flow_stranke`, `flow_projekti`, `flow_ponudbe`, `flow_racuni`,
  `flow_stranka` — vsa označena z `readOnlyHint: true`
- **Omejitev pogostosti:** 120 zahtevkov na minuto na ključ
- **Isti podatki kot REST:** orodja berejo prek `lib/apiV1`, torej iz istih
  poizvedb in preslikav kot javni `GET /api/v1/*`. Navzven potujejo zunanji
  identifikatorji (`external_id`), notranji UUID-ji baze nikoli.

Koda: `app/api/mcp/route.ts`.

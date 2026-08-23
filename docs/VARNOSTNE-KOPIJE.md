# Varnostne kopije baze

**Samodejne kopije delujejo.** Projekt je od 23. 8. 2026 na paketu Supabase
Pro, ki vključuje dnevne kopije; nadzorna plošča je tega dne kazala zadnjo
kopijo izpred ene ure. Zahteva člena 32(1)(c) GDPR po zmožnosti pravočasne
povrnitve podatkov je s tem izpolnjena.

Ta skripta zato ni več edina mreža, ampak **dodatna varnost**: naredi izvod,
ki leži izven Supabase. Če bi bil račun nedosegljiv, pomotoma izbrisan ali
zaklenjen, so samodejne kopije nedosegljive skupaj z njim — ta izvod pa ne.
Za tak primer jo je vredno pognati pred večjimi posegi v bazo in občasno
sicer.

---

## Enkratna priprava

### 1. Namesti pg_dump

```bash
brew install libpq && echo 'export PATH="/opt/homebrew/opt/libpq/bin:$PATH"' >> ~/.zshrc
```

Nato odpri **novo okno terminala** in preveri:

```bash
pg_dump --version
```

`libpq` so samo odjemalska orodja — Postgres strežnika ti ne namesti.

### 2. Shrani povezovalni niz

V Supabase: **Project Settings → Database → Connection string → URI**.
Izberi **Session pooler** (vrata `5432`). Transaction pooler (`6543`) za
`pg_dump` ne dela in ga skripta zavrne.

Niz shrani v datoteko, ki jo prebere samo tvoj račun:

```bash
touch ~/.pinart-db-url && chmod 600 ~/.pinart-db-url && open -e ~/.pinart-db-url
```

Vanjo prilepi cel niz z geslom, shrani, zapri. Niz ne gre v `.env`, ne v
projekt in ne v pogovor z agentom — skripta ga bere sama in ga nikoli ne
izpiše, tudi ob napaki ne.

---

## Zagon

```bash
./scripts/varnostna-kopija-baze.sh
```

Kopije gredo v `~/Desktop/Pinart website/varnostne-kopije/` — **izven git
repozitorija**, s pravicami 600. Skripta obdrži zadnjih 14 in starejše zavrže.
Vsak zagon zapiše vrstico v `dnevnik.txt`; ta dnevnik je hkrati dokazilo o
izvajanju ukrepa, če te kdo vpraša po skladnosti.

Kaj je v kopiji: sheme `public` (podatki aplikacije), `auth` (uporabniški
računi — brez tega bi ob obnovi izgubila vse prijave) in `storage` (zapisi
o datotekah). Same datoteke v Storage bucketih **niso** zajete.

---

## Obnova

Vaja na prazni testni bazi, nikoli prvič na produkciji:

```bash
pg_restore --dbname="$TESTNA_BAZA" --no-owner --no-privileges --clean --if-exists kopija.dump
```

Samo ena tabela:

```bash
pg_restore --dbname="$TESTNA_BAZA" --no-owner --table=ponudbe kopija.dump
```

**Kopija, ki je nihče ni preizkusil, ni kopija.** Skripta ob vsakem zagonu
prebere kazalo z `pg_restore --list` in zavrne datoteko, ki je pokvarjena ali
prazna, to pa dokaže samo berljivost — ne, da se baza res sestavi nazaj.
Pravo obnovo preizkusi enkrat ročno na testnem projektu.

---

## Kje kopije smejo ležati

Dump vsebuje osebne podatke uporabnic in njihovih strank. Zanj velja isto kot
za bazo:

- disk mora biti šifriran (FileVault)
- v git ne gre nikoli (`varnostne-kopije/` je v `.gitignore`)
- v Drive/Dropbox/iCloud brez šifriranja ne gre
- ob odtujitvi prenosnika z nešifriranimi kopijami gre za kršitev varstva
  podatkov s prijavo v 72 urah

---

## Kaj s tem ni rešeno

| Manjka | Zakaj |
|---|---|
| Samodejnost | teče samo, ko jo pognaš — za to so zdaj kopije Supabase |
| Kopija izven lokacije | vse leži na istem prenosniku kot vse drugo |
| Point-in-time recovery | vrniti se da le na trenutek zadnjega zagona |
| Datoteke iz Storage bucketov | zajeti so samo zapisi o njih, ne vsebina |

Prvo pokrivajo dnevne kopije Supabase. Point-in-Time Recovery pri Supabase
ni samodejen niti na paketu Pro — je doplačilo, ki ga je treba vklopiti
posebej; brez njega se da vrniti na dan, ne na uro. Vsebina Storage bucketov
ni zajeta ne tu ne tam.

# Pinart Flow — varnostni verifikacijski prehod

Datum preverjanja: 12. 8. 2026

## Rezultat

| Preverjanje | Rezultat | Dokaz / opomba |
|---|---|---|
| TypeScript | PASS | `npx tsc --noEmit` se konča brez napak. |
| RLS na ustvarjenih tabelah | PASS (statično) | Vseh 34 tabel, ustvarjenih v `supabase/migrations`, ima `enable row level security`. |
| GDPR tuji `userId` | PASS (koda) | Izvoz in izbris vrneta 403, če zahtevani `userId` ni ID prijavljene seje. |
| GDPR obseg izvoza | PASS (koda) | Flow poslovni podatki se filtrirajo po uporabnikovih organizacijah, klepeti po e-pošti udeleženca, osebni podatki pa po `user_id`. Skriti `project_inbox.token` se ne izvozi. |
| Soft-delete uporabnika | PASS (koda) | Profil dobi `deleted_at`, članstva `disabled_at`, dostop se onemogoči in zahteva se zabeleži v `user_data_requests`. Trdi izbris se ne izvaja. |
| Demo-bleed | BLOCKED | Test obstaja: demo pošta mora vrniti 403 in ne sme ustvariti `mail_log`. Potreben je lokalni strežnik in testna seja. |
| Cross-account read | BLOCKED | Test zdaj preveri račune, stranke, ponudbe, pogodbe in stroške organizacije B. Potrebna sta testna uporabnika na pravi shemi. |
| Sočasno `dodeli_stevilko` | BLOCKED | Živi test porabi dve testni številki; brez testnih Supabase nastavitev ni bil zagnan. |
| `storniraj_racun` + audit | BLOCKED | Test zavrne storno osnutka, stornira izdani račun, preveri negativni storno in nespremenljiv audit. Potreben je enkraten testni izdani račun. |
| Entitlement / vloge | BLOCKED | Test preveri, da helper vrne organizacijo A ter aktiven/trialing paket Pro. Potrebna je testna naročnina. |
| GDPR živi 403 | BLOCKED | Test pošlje tuj `userId` na obe poti in pričakuje 403. Potrebni sta prijavljeni testni seji. |
| Flow konflikt dveh naprav | PASS (lokalno) | `mergeByUpdatedAt` ohrani novejši zapis in ne obudi tombstona. |
| AI/mail rate limit | BLOCKED | Manjkata prijavna seja in lokalni strežnik z enakim `AI_RATE_LIMIT_SALT`. |

## Živi test

`node lib/varnostniTesti.mjs` se je 12. 8. 2026 pravilno ustavil z izhodom 2, ker okolje nima
spremenljivk `SECURITY_TEST_*`, testnega piškotka in `AI_RATE_LIMIT_SALT`.
To ni funkcionalni FAIL; pomeni, da živa produkcijska/testna shema v tej seji ni
bila varno dostopna.

Za ponovitev uporabi testni Supabase projekt, ročno izvedi še neizvedene migracije
in nastavi spremenljivke, navedene na vrhu `lib/varnostniTesti.mjs`. Testa ne
poganjaj proti produkciji, ker preverjanje številčenja porabi dve številki.

## Omejitev preverjanja

Statični RLS pregled potrjuje vklop RLS, ne dokazuje pravilnosti vsake politike.
Končni launch kriterij je 12/12 PASS iz `lib/varnostniTesti.mjs` na ločenem testnem
projektu. Do takrat so žive postavke zgoraj namenoma označene BLOCKED, ne PASS.

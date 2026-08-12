# Pinart Flow — varnostni verifikacijski prehod

Datum preverjanja: 12. 8. 2026

## Rezultat

| Preverjanje | Rezultat | Dokaz / opomba |
|---|---|---|
| TypeScript | PASS | `npx tsc --noEmit` se konča brez napak. |
| RLS na ustvarjenih tabelah | PASS (statično) | Vseh 35 tabel, ustvarjenih v `supabase/migrations`, ima `enable row level security`. |
| GDPR tuji `userId` | PASS (koda) | Izvoz in izbris vrneta 403, če zahtevani `userId` ni ID prijavljene seje. |
| GDPR obseg izvoza | PASS (koda) | Poslovni podatki se filtrirajo po uporabnikovih organizacijah; osebni čas, prisotnost, AI poraba in zahteve pa po `user_id`. Anonimna analitika ni vključena. |
| Soft-delete računa | PASS (koda) | Profil dobi `deleted_at`, članstva `disabled_at`, dostop se onemogoči in zahteva se zabeleži v `user_data_requests`. Trdi izbris se ne izvaja. |
| Demo-bleed | BLOCKED | Potreben je lokalni strežnik, prijavljena testna seja in testna Supabase shema. |
| Cross-account read | BLOCKED | Potrebna sta testna uporabnika v ločenih organizacijah na pravi testni shemi. |
| Sočasno `dodeli_stevilko` | BLOCKED | Živi test porabi dve testni številki; brez testnih Supabase nastavitev ni bil zagnan. |
| `storniraj_racun` + audit | BLOCKED | Potreben je testni izdani račun v pravi testni shemi. |
| Entitlement / vloge | BLOCKED | Potrebna je organizacija z dejansko aktivnim paketom in testnimi vlogami. |
| AI/mail rate limit | BLOCKED | Manjkata prijavna seja in lokalni strežnik z enakim `AI_RATE_LIMIT_SALT`. |

## Živi test

`node lib/varnostniTesti.mjs` se je pravilno ustavil z izhodom 2, ker okolje nima
spremenljivk `SECURITY_TEST_*`, testnega piškotka in `AI_RATE_LIMIT_SALT`.
To ni funkcionalni FAIL; pomeni, da živa produkcijska/testna shema v tej seji ni
bila varno dostopna.

Za ponovitev uporabi testni Supabase projekt, ročno izvedi še neizvedene migracije
in nastavi spremenljivke, navedene na vrhu `lib/varnostniTesti.mjs`. Testa ne
poganjaj proti produkciji, ker preverjanje številčenja porabi dve številki.

## Omejitev preverjanja

Statični RLS pregled potrjuje vklop RLS, ne dokazuje pravilnosti vsake politike.
Končni launch kriterij je 8/8 PASS iz `lib/varnostniTesti.mjs` na ločenem testnem
projektu. Do takrat so žive postavke zgoraj namenoma označene BLOCKED, ne PASS.

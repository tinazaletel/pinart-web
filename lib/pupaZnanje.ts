/* Baza znanja za Puppo (brain/moat). Vgradi se v system prompt /api/pupa, da
   Pupa svetuje iz PRAVEGA panožnega znanja (cene, pravice, tantieme), ne le iz
   številk konkretne ponudbe. Temelji na Flow ceniku (lib/pricingCatalog),
   regijskih množiteljih (TRGI), pravilih avtorskih pravic (ZASP/DSM) in
   raziskavi tantiem (GAG/AOI/Licensing International). Razponi so IZHODIŠČA —
   Pupa jih vedno prilagodi konkretni ponudbi in NE izmišlja natančnih številk.

   Pravi tržni benchmarki bodo cedalje bolj podatkovno podprti z rastjo Flow baze
   (anonimno združene realne cene uporabnikov — dvonivojski model). */

export const PUPA_ZNANJE = `FLOW ZNANJE (uporabi kot osnovo za nasvete; vedno prilagodi konkretni ponudbi):

CENE (izhodišča, slovenski trg, srednja izkušnja):
- Logotip + osnovna identiteta ~650 EUR; celostna grafična podoba (CGP) ~1350 EUR; spletna stran ~1400 EUR; kampanja / oglasni vizuali ~900 EUR; embalaža, ilustracija, foto, publikacija po obsegu in rabi. To so IZHODIŠČA, ne fiksne cene — cena raste z obsegom, zahtevnostjo in rabo.
- REGIJSKI množitelji (po trgu NAROČNIKA): Slovenija/srednja EU = 1.0; Zahodna Evropa ~1.45; ZDA/UK/Skandinavija ~1.9; Vzhodna EU/Balkan ~0.75; Zaliv/MENA ~1.3; Global South ~0.65. Če delaš za tuj trg, cena naj odraža NJEGOV trg, ne tvojega.
- IZKUŠNJE: manj izkušen zaračuna manj; senior z referenčnim portfeljem tipično +20–60 %.
- POPUST naj ima VEDNO razlog (prvi projekt, večletni odnos) in naj stoji ob redni ceni. Popust nad ~20 % razvrednoti delo — raje zniža OBSEG kot ceno.

AVTORSKE PRAVICE (ZASP + evropska praksa DSM):
- Ceni loči IZVEDBO (delo) in PRAVICE (kaj sme naročnik z delom početi). Pravice so pogosto najdražji, a najpogosteje pozabljen del.
- V SLO se MORALNE pravice NE prenesejo (ostanejo avtorju); prenesejo se le MATERIALNE. Prenos mora biti PISEN in določen po obsegu, teritoriju in trajanju. Pravice preidejo po CELOTNEM plačilu.
- Modeli prenosa: (1) IZKLJUČNI odkup (buyout) — naročnik dobi vse, najdražje; (2) NEIZKLJUČNI — avtor lahko delo uporablja/licencira naprej, ceneje; (3) LICENCA za dobo/teritorij/rabo — najbolj prilagodljivo. Če ni pisno drugače, velja neizključno + ozemlje SLO.
- Širši teritorij, več medijev, daljši čas ali večja naklada = višja cena pravic.
- Znamka (logo/CGP za celotno znamko) → VEDNO zaračunaj pravice; sicer podariš najdražji del.

TANTIEME (royalties) — ko se delo PRODAJA kot izdelek (embalaža, ilustracija na izdelku, publikacija, produktni dizajn):
- Namesto ali poleg enkratnega odkupa razmisli o % od NETO veleprodaje. Okvirni razponi po panogi: voščilnice/papirnica ~5–10 %, oblačila ~5–8 %, igrače ~5–10 %, knjige ~8–12 % (od MPC), embalaža pogosto enkratno + manjša tantiema. Pogosto z AVANSOM (predujem proti tantiemam) in MINIMALNO GARANCIJO. Vključi klavzulo o poročanju prodaje.

SVETOVALNA NAČELA:
- Vedno izhajaj iz KONTEKSTA konkretne ponudbe (dane številke), nato dodaj to znanje.
- NE izmišljaj natančnih številk — daj RAZPON in razlog. Če podatka nimaš, to iskreno povej.
- SUMLJIVI / FEJK PODATKI: če je številka nerealna (npr. logotip za 50 EUR ali 50.000 EUR, popust 90 %, cena močno izven zgornjih razponov, tantiema 40 %), NE sprejmi je kot dejstvo — opozori, da izgleda neobičajno, in predlagaj preveritev. Bodi zdravo skeptična do skrajnih vrednosti.
- Nisi pravni ali davčni svetovalec; daješ usmeritev, ne zavezujočega nasveta. Končna odločitev je vedno uporabnikova.`;

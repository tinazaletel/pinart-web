/* SAMODEJNO USTVARJENO — ne urejaj ročno.
 * Vir: docs/CENE-TRZNA-RAZISKAVA-2026.md
 * Osveži z: node scripts/trzniOkviriIzRaziskave.mjs
 */

export type VirCene = { ponudnik: string; cena: string; obseg: string; url: string | null };

export const VIRI_CEN: Record<string, VirCene[]> = {
  "logo": [
    {
      "ponudnik": "Kroki, SLO",
      "cena": "od 150 €",
      "obseg": "logotip / razpoznavni znak, DDV vključen",
      "url": "https://kroki.si/cena-logotip-celostna-podoba"
    },
    {
      "ponudnik": "Eving, SLO",
      "cena": "od 150 €",
      "obseg": "oblikovanje logotipa, več predlogov",
      "url": "https://eving-oblikovanje.si/cenik/"
    },
    {
      "ponudnik": "Omisli, SLO agregat",
      "cena": "560–1.400 €, mediana 750 €",
      "obseg": "združena kategorija logo/branding/CGP",
      "url": "https://omisli.si/graficno-oblikovanje/izdelava-logotipa-branding-cgp/cene/"
    },
    {
      "ponudnik": "99designs, mednarodno",
      "cena": "249 / 399 / 799 / 1.050 USD",
      "obseg": "štirje paketi natečaja za logo",
      "url": "https://99designs.com/pricing"
    },
    {
      "ponudnik": "99designs, mednarodno",
      "cena": "od 429 USD",
      "obseg": "logo + brand guide",
      "url": "https://99designs.com/categories"
    }
  ],
  "cgp": [
    {
      "ponudnik": "Spletni donos / Vsi.si, SLO",
      "cena": "550 €",
      "obseg": "logo, barve, tipografija, vizitka, dopis, žig",
      "url": "https://www.spletnidonos.si/oblikovanje/"
    },
    {
      "ponudnik": "Spletni donos / Vsi.si, SLO",
      "cena": "1.200 €",
      "obseg": "4 predlogi, priročnik, tiskovine, e-podpis",
      "url": "https://www.spletnidonos.si/oblikovanje/"
    },
    {
      "ponudnik": "Spletni donos / Vsi.si, SLO",
      "cena": "1.890 €",
      "obseg": "8 predlogov, slogan, priročnik in širši komplet",
      "url": "https://www.spletnidonos.si/oblikovanje/"
    },
    {
      "ponudnik": "Art Design, SLO",
      "cena": "1.000 / 1.600 / 2.500 €",
      "obseg": "osnovni CGP glede na velikost podjetja",
      "url": "https://art-design.si/cenik-graficnega-oblikovanja/"
    },
    {
      "ponudnik": "Art Design, SLO",
      "cena": "1.500 / 2.500 / 4.500 €",
      "obseg": "razširjeni CGP",
      "url": "https://art-design.si/cenik-graficnega-oblikovanja/"
    },
    {
      "ponudnik": "Sette, SLO",
      "cena": "od 690 €",
      "obseg": "logo, barve, tipografija, pravila, priročnik",
      "url": "https://sette.at/"
    },
    {
      "ponudnik": "99designs, mednarodno",
      "cena": "od 599 USD",
      "obseg": "logo + osnovne digitalne in tiskane aplikacije",
      "url": "https://99designs.com/brand-identity-pack"
    }
  ],
  "publikacija": [
    {
      "ponudnik": "Eving, SLO",
      "cena": "20 €/stran",
      "obseg": "katalog ali brošura; odvisno od vsebine",
      "url": "https://eving-oblikovanje.si/cenik/"
    },
    {
      "ponudnik": "Tash-Tash, regija",
      "cena": "30 €/stran",
      "obseg": "katalog, knjiga ali revija do 30 strani",
      "url": "https://tash-tash.com/wp-content/uploads/2024/08/cenik-graficno-oblikovanje-slovenija-hrvatska-italia-istra-umag-2.pdf"
    },
    {
      "ponudnik": "Eving, SLO",
      "cena": "od 120 €",
      "obseg": "naslovnica knjige",
      "url": "https://eving-oblikovanje.si/cenik/"
    },
    {
      "ponudnik": "Tash-Tash, regija",
      "cena": "279 €",
      "obseg": "naslovnica s personalizirano ilustracijo",
      "url": "https://tash-tash.com/wp-content/uploads/2024/08/cenik-graficno-oblikovanje-slovenija-hrvatska-italia-istra-umag-2.pdf"
    }
  ],
  "embalaza": [
    {
      "ponudnik": "Tash-Tash, regija",
      "cena": "195 €",
      "obseg": "etiketa/nalepka + deklaracija",
      "url": "https://tash-tash.com/wp-content/uploads/2024/08/cenik-graficno-oblikovanje-slovenija-hrvatska-italia-istra-umag-2.pdf"
    },
    {
      "ponudnik": "Omisli, SLO agregat",
      "cena": "337,50–587,50 €, mediana 425 €",
      "obseg": "embalaža, nalepke in etikete",
      "url": "https://omisli.si/graficno-oblikovanje/oblikovanje-embalaze-nalepk-etiket/cene/"
    },
    {
      "ponudnik": "99designs, mednarodno",
      "cena": "od 349 USD",
      "obseg": "produktna/živilska/retail embalaža",
      "url": "https://99designs.com/categories"
    },
    {
      "ponudnik": "99designs, mednarodno",
      "cena": "od 299 USD",
      "obseg": "produktna etiketa",
      "url": "https://99designs.com/categories"
    }
  ],
  "ilustracija": [
    {
      "ponudnik": "Irena Režek, SLO",
      "cena": "od 70 €",
      "obseg": "vektorska grafika",
      "url": "https://irenarezek.com/cenik/"
    },
    {
      "ponudnik": "Irena Režek, SLO",
      "cena": "od 150 / 200 / 220 €",
      "obseg": "eno-/obojestranska/naslovna ilustracija",
      "url": "https://irenarezek.com/cenik/"
    },
    {
      "ponudnik": "99designs, mednarodno",
      "cena": "od 299 USD",
      "obseg": "poslovna, spletna ali knjižna ilustracija",
      "url": "https://99designs.com/categories"
    }
  ],
  "web": [
    {
      "ponudnik": "Eving, SLO",
      "cena": "od 590 €",
      "obseg": "predstavitvena WordPress stran",
      "url": "https://eving-oblikovanje.si/cenik/"
    },
    {
      "ponudnik": "WebNET, SLO",
      "cena": "550 / 750 / 1.200 €",
      "obseg": "one-page / do 10 / do 20 podstrani",
      "url": "https://izdelava-spletne-strani-trgovine.si/izdelava-spletne-strani/"
    },
    {
      "ponudnik": "Sette, SLO",
      "cena": "od 1.200 €",
      "obseg": "struktura, oblikovanje in izdelava, responsive, osnovni SEO",
      "url": "https://sette.at/"
    },
    {
      "ponudnik": "Hrabar, SLO",
      "cena": "1.400 €",
      "obseg": "do 20 podstrani, responsive, SEO, analitika",
      "url": "https://hrabar.si/izdelava-spletnih-strani/cenik/"
    },
    {
      "ponudnik": "MMStudio, SLO",
      "cena": "od 1.490 €",
      "obseg": "osnovna predstavitvena rešitev",
      "url": "https://mmstudio.si/izdelava-spletnih-strani.html"
    },
    {
      "ponudnik": "Spletnik, SLO",
      "cena": "od 1.499 € + DDV",
      "obseg": "izdelava po meri",
      "url": "https://spletnik.si/izdelava-spletne-strani/"
    }
  ],
  "uxui": [
    {
      "ponudnik": "Reztive, mednarodno",
      "cena": "499 USD",
      "obseg": "landing page, osnovni user flow, 2 reviziji",
      "url": "https://reztive.studio/pricing"
    },
    {
      "ponudnik": "Reztive, mednarodno",
      "cena": "1.499 USD",
      "obseg": "do 5 SaaS/produktnih ekranov, flow in wireframes",
      "url": "https://reztive.studio/pricing"
    },
    {
      "ponudnik": "NexKraft, mednarodno",
      "cena": "od 499 USD",
      "obseg": "do 10 ekranov, flow, wireframe, prototip, basic system",
      "url": "https://nexkraft.com/pricing/"
    },
    {
      "ponudnik": "NexKraft, mednarodno",
      "cena": "od 1.499 USD",
      "obseg": "do 30 ekranov, raziskava, responsive, design system",
      "url": "https://nexkraft.com/pricing/"
    },
    {
      "ponudnik": "TwoPixel, mednarodno",
      "cena": "od 3.000 USD",
      "obseg": "product UI/UX, 2–6 tednov",
      "url": "https://www.twopixel.org/services/brand-and-design"
    }
  ],
  "aplikacija": [
    {
      "ponudnik": "NexKraft, mednarodno",
      "cena": "od 499 USD",
      "obseg": "do 10 mobilnih ali spletnih ekranov, brez razvoja",
      "url": "https://nexkraft.com/pricing/"
    },
    {
      "ponudnik": "Alot Digital, mednarodno",
      "cena": "600–2.000 USD",
      "obseg": "starter UX/UI, ključni ekrani",
      "url": "https://www.alotdigitalagency.com/pricing"
    },
    {
      "ponudnik": "Alot Digital, mednarodno",
      "cena": "2.000–6.000 USD",
      "obseg": "celovitejši produkt in prototip",
      "url": "https://www.alotdigitalagency.com/pricing"
    },
    {
      "ponudnik": "TwoPixel, mednarodno",
      "cena": "od 3.000 USD",
      "obseg": "product UI/UX",
      "url": "https://www.twopixel.org/services/brand-and-design"
    }
  ],
  "dizajnsistem": [
    {
      "ponudnik": "TwoPixel, mednarodno",
      "cena": "od 4.500 USD",
      "obseg": "2–4 tedne, studijski design system",
      "url": "https://www.twopixel.org/services/brand-and-design"
    },
    {
      "ponudnik": "Adamarant, mednarodno",
      "cena": "5.000–60.000+ USD",
      "obseg": "od temelja do večjega sistema",
      "url": "https://adamarant.com/en/blog/design-system-pricing-in-2026-project-retainer-or-shared-ownership"
    },
    {
      "ponudnik": "WhatShouldICharge, ZDA",
      "cena": "5.000–12.000 USD",
      "obseg": "osnovni startup sistem, 20–30 komponent",
      "url": "https://whatshouldicharge.io/ui-ux-designer/design-system-creation"
    },
    {
      "ponudnik": "Intunio, Švedska",
      "cena": "20.000–40.000 SEK",
      "obseg": "audit",
      "url": "https://intunio.se/en/services/design-system"
    },
    {
      "ponudnik": "Intunio, Švedska",
      "cena": "320.000–480.000 SEK",
      "obseg": "celotna družina produktov",
      "url": "https://intunio.se/en/services/design-system"
    }
  ],
  "smm": [
    {
      "ponudnik": "Digitalni Manever, SLO",
      "cena": "290 € + DDV/mesec",
      "obseg": "FB + IG, 3 objave/teden, pripravljena strategija/material",
      "url": "https://digitalni.manever.si/cenik-upravljanja-druzbenih-omrezij/"
    },
    {
      "ponudnik": "Digitalni Manever, SLO",
      "cena": "490 € + DDV/mesec",
      "obseg": "4 objave + story/teden",
      "url": "https://digitalni.manever.si/cenik-upravljanja-druzbenih-omrezij/"
    },
    {
      "ponudnik": "Profiletter, SLO",
      "cena": "455 € + DDV/mesec",
      "obseg": "8 objav, plan, grafike, besedila, objava",
      "url": "https://profiletter.com/nase-storitve/upravljanje-druzbenih-omrezij/"
    },
    {
      "ponudnik": "Profiletter, SLO",
      "cena": "595 € + DDV/mesec",
      "obseg": "12 objav + strategija",
      "url": "https://profiletter.com/nase-storitve/upravljanje-druzbenih-omrezij/"
    },
    {
      "ponudnik": "Srečna Lisica, SLO",
      "cena": "od 720 €/mesec",
      "obseg": "do 22 objav, tudi video vsebine",
      "url": "https://www.srecna-lisica.com/druzbenaomrezja"
    },
    {
      "ponudnik": "Digitala, SLO",
      "cena": "od 790 €/mesec",
      "obseg": "dogovorjeni del rednega vodenja",
      "url": "https://digitala.si/blog-koliko-stane-vodenje-druzbenih-omrezij-v-sloveniji.dc"
    },
    {
      "ponudnik": "Digitala, SLO",
      "cena": "od 1.490 €/mesec",
      "obseg": "vodenje z Reels produkcijo",
      "url": "https://digitala.si/blog-koliko-stane-vodenje-druzbenih-omrezij-v-sloveniji.dc"
    }
  ],
  "pr": [
    {
      "ponudnik": "reproducirani cenik PRSS, SLO",
      "cena": "308,80 €",
      "obseg": "priprava sporočila za javnost",
      "url": "https://kritik.si/2023/12/03/dejavnost-kreativne-baze-po-ceniku-slovenskega-drustva-za-odnose-z-javnostmi/"
    },
    {
      "ponudnik": "reproducirani cenik PRSS, SLO",
      "cena": "375,56 €",
      "obseg": "pošiljanje, preverjanje in dogovarjanje objav",
      "url": "https://kritik.si/2023/12/03/dejavnost-kreativne-baze-po-ceniku-slovenskega-drustva-za-odnose-z-javnostmi/"
    },
    {
      "ponudnik": "reproducirani cenik PRSS, SLO",
      "cena": "1.381,24 €",
      "obseg": "priprava izhodišč za PR aktivnosti",
      "url": "https://kritik.si/2023/12/03/dejavnost-kreativne-baze-po-ceniku-slovenskega-drustva-za-odnose-z-javnostmi/"
    }
  ],
  "fotografija": [
    {
      "ponudnik": "Studio Železna, SLO",
      "cena": "od 25 € + DDV/produkt",
      "obseg": "fotografiranje, izbor in obdelava",
      "url": "https://www.zelezna.si/files/ceniki/1/pdf/FOTO%20STUDIO%20ZELEZNA%20FE16%20STORITVE%20FOTOGRAFIRANJE%20CENIK%202024%20SPLETN.pdf"
    },
    {
      "ponudnik": "ART A, SLO",
      "cena": "od 290 €",
      "obseg": "paket produktne fotografije",
      "url": "https://omisli.si/art-a-oglasevalska-agencija/"
    },
    {
      "ponudnik": "MOM katalog stroškov, SLO",
      "cena": "400–600 €/dan",
      "obseg": "snemalni dan fotografiranja",
      "url": "https://maribor.si/wp-content/uploads/2023/02/KATALOG-STROSKOV-razpis.pdf"
    }
  ],
  "video": [
    {
      "ponudnik": "Samo Paušer, SLO",
      "cena": "800–1.800 €",
      "obseg": "do 4 h, 1–2 kameri, 2–3 min, osnovni motion",
      "url": "https://samopauser.com/cenik-video/"
    },
    {
      "ponudnik": "Digital Studio, SLO",
      "cena": "1.290 € + DDV",
      "obseg": "pol dneva, glasba, grafika, montaža",
      "url": "https://www.digitalstudio.si/cenik"
    },
    {
      "ponudnik": "Digital Studio, SLO",
      "cena": "1.990 € + DDV",
      "obseg": "cel dan, scenarij, režija, grafika, spiker",
      "url": "https://www.digitalstudio.si/cenik"
    },
    {
      "ponudnik": "Kontrast, SLO",
      "cena": "od 1.950 €",
      "obseg": "korporativni film, celoten cikel",
      "url": "https://kontrast.si/video-produkcija-cenik/"
    },
    {
      "ponudnik": "Omisli, SLO agregat",
      "cena": "300–950 €, mediana 737,50 €",
      "obseg": "mešanica video produkcije",
      "url": "https://omisli.si/video-produkcijo/cene/"
    }
  ],
  "motion": [
    {
      "ponudnik": "Kontrast, SLO",
      "cena": "180–800 €",
      "obseg": "paket motion grafike / animacij",
      "url": "https://kontrast.si/video-produkcija-cenik/"
    },
    {
      "ponudnik": "Digital Studio, SLO",
      "cena": "od 600 € + DDV",
      "obseg": "animirani TV oglas do 15 s",
      "url": "https://www.digitalstudio.si/cenik"
    },
    {
      "ponudnik": "Irena Režek, SLO",
      "cena": "od 900 €/min",
      "obseg": "motion graphics",
      "url": "https://irenarezek.com/cenik/"
    },
    {
      "ponudnik": "Digital Studio, SLO",
      "cena": "od 1.700 € + DDV",
      "obseg": "1-min explainer, scenarij, ilustracije, spiker",
      "url": "https://www.digitalstudio.si/cenik"
    },
    {
      "ponudnik": "Omisli, SLO agregat",
      "cena": "171–775 €, mediana 300 €",
      "obseg": "mešana kategorija animacije",
      "url": "https://omisli.si/graficno-oblikovanje/izdelava-animacije/cene/"
    }
  ],
  "render3d": [
    {
      "ponudnik": "99designs, mednarodno",
      "cena": "od 389 USD",
      "obseg": "posamezen arhitekturni render",
      "url": "https://99designs.com/categories"
    },
    {
      "ponudnik": "V kadru, SLO",
      "cena": "2.500–5.000+ €",
      "obseg": "3D animacija izdelka",
      "url": "https://vkadru.si/"
    },
    {
      "ponudnik": "Intunio/ostali javni paketi",
      "cena": "ni primerljive EUR cene",
      "obseg": "cena močno odvisna od obstoječega modela, pogledov in animacije",
      "url": null
    }
  ],
  "interier": [
    {
      "ponudnik": "TriDesign, SLO",
      "cena": "15 €/m²",
      "obseg": "idejna zasnova poslovnega prostora",
      "url": "https://www.tridesign.si/cenik/"
    },
    {
      "ponudnik": "Unikrea, SLO",
      "cena": "18–30 €/m²",
      "obseg": "idejna zasnova",
      "url": "https://www.unikrea.si/notranje-oblikovanje/"
    },
    {
      "ponudnik": "Unikrea, SLO",
      "cena": "25–35 €/m²",
      "obseg": "projekt za izvedbo",
      "url": "https://www.unikrea.si/notranje-oblikovanje/"
    },
    {
      "ponudnik": "Notranje-oblikovanje.si, SLO",
      "cena": "od 45 €/m²",
      "obseg": "idejna zasnova / ponudnikov paket",
      "url": "https://notranje-oblikovanje.si/"
    },
    {
      "ponudnik": "Omisli, SLO",
      "cena": "srednja cena 2.000 €",
      "obseg": "mešani projekti notranjega oblikovanja",
      "url": "https://omisli.si/nasvet-strokovnjaka/interier/interier-cene-za-notranje-oblikovanje-notranji-dizajn-in-ideje-za-vas-dom-arhitekt-notranji-oblikovalec/"
    }
  ],
  "arhitektura": [
    {
      "ponudnik": "Omisli, SLO",
      "cena": "900–1.500 €",
      "obseg": "idejna zasnova (IDZ), srednja 1.100 €",
      "url": "https://omisli.si/nasvet-strokovnjaka/arhitekt/arhitekt-cena-pgd-pzi-pid-idp-pzr-interier-nacrt-hisa-stanovavnje/"
    },
    {
      "ponudnik": "Omisli, SLO",
      "cena": "1.800–3.000 €",
      "obseg": "idejni projekt (IDP), srednja 2.200 €",
      "url": "https://omisli.si/nasvet-strokovnjaka/arhitekt/arhitekt-cena-pgd-pzi-pid-idp-pzr-interier-nacrt-hisa-stanovavnje/"
    },
    {
      "ponudnik": "Omisli, SLO",
      "cena": "2.500–6.300 €",
      "obseg": "DGD/PGD, srednja 4.000 €",
      "url": "https://omisli.si/nasvet-strokovnjaka/arhitekt/arhitekt-cena-pgd-pzi-pid-idp-pzr-interier-nacrt-hisa-stanovavnje/"
    },
    {
      "ponudnik": "Omisli, SLO",
      "cena": "3.000–6.300 €",
      "obseg": "PZI, srednja 4.200 €",
      "url": "https://omisli.si/nasvet-strokovnjaka/arhitekt/arhitekt-cena-pgd-pzi-pid-idp-pzr-interier-nacrt-hisa-stanovavnje/"
    },
    {
      "ponudnik": "Omisli, SLO",
      "cena": "5–8 €/m²",
      "obseg": "idejni načrt stanovanja",
      "url": "https://omisli.si/nasvet-strokovnjaka/arhitekt/arhitekt-cena-pgd-pzi-pid-idp-pzr-interier-nacrt-hisa-stanovavnje/"
    },
    {
      "ponudnik": "IZS, SLO",
      "cena": "7 % / 11–14 % / 25–30 %",
      "obseg": "deleži IDZ / IDP / PZI v celotni storitvi",
      "url": "https://arhiv.izs.si/fileadmin/dokumenti/aktualno/aktualno-leto-2012/4-priloga-k_tc__5-MVPS_marec_2012.pdf"
    }
  ],
  "razstava": [
    {
      "ponudnik": "MOM katalog stroškov, SLO",
      "cena": "1.500 €",
      "obseg": "scenografija, pavšal",
      "url": "https://maribor.si/wp-content/uploads/2023/02/KATALOG-STROSKOV-razpis.pdf"
    },
    {
      "ponudnik": "MOM katalog stroškov, SLO",
      "cena": "10 % celotne vrednosti",
      "obseg": "oblikovanje razstave",
      "url": "https://maribor.si/wp-content/uploads/2023/02/KATALOG-STROSKOV-razpis.pdf"
    },
    {
      "ponudnik": "MOM katalog stroškov, SLO",
      "cena": "do 2.500 €",
      "obseg": "pregledna razstava / razstavnina, ni čista oblikovalska storitev",
      "url": "https://maribor.si/wp-content/uploads/2023/02/KATALOG-STROSKOV-razpis.pdf"
    }
  ],
  "strategija": [
    {
      "ponudnik": "99designs, mednarodno",
      "cena": "od 4.499 USD",
      "obseg": "full-service brand paket z osebnim strategom",
      "url": "https://99designs.com/categories"
    },
    {
      "ponudnik": "beGlobal Design, mednarodno",
      "cena": "2.847,50 USD",
      "obseg": "identiteta; strategija ni jasno ločena",
      "url": "https://beglobaldesign.com/pricing"
    },
    {
      "ponudnik": "slovenski ponudniki",
      "cena": "po meri",
      "obseg": "javni opisi ne objavijo primerljivega števila delavnic/intervjujev",
      "url": "https://formingbrands.si/pogosta-vprasanja/"
    }
  ]
};

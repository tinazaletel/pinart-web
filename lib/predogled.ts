'use client';

import { useEffect, useState } from 'react';
import type { FlowClient, FlowContract, FlowData, FlowExpense, FlowInvoice, FlowOffer } from './pinartFlowStore';
import type { Projekt } from './projekti';
import type { Sodelavec } from './naloge';
import { PRICING_SERVICES, type PricingService } from './pricingCatalog';

/**
 * Predogled stanja: "Prazno" / "Moji" / "Demo".
 *
 * Prej je bil ta preklop navadno stanje znotraj nadzorne plošče, zato je veljal
 * samo tam in je ob prehodu na podstran izginil — Tina je izbrala Demo, podstrani
 * pa so ostale prazne. Zdaj živi v shrambi brskalnika in velja povsod.
 *
 * ODLOCITEV (Tina, 2026-07-22): demo NE izmislja ur na strani "Cena & cas".
 * Dnevnik ur je zaseben in mora vedno kazati prave vnose — tudi v demo nacinu.
 *
 * DEMO JE SAMO ZA GLEDANJE. Vsak delovni prostor mora ob `demo` onemogočiti
 * urejanje, sicer bi popravek izmišljenega računa poskusil pisati v pravo bazo.
 */

/* 'zacetek' = nekaj malega podatkov: prvi teden uporabe. Brez njega sta bila
   na voljo samo skrajna primera (nic ali polno), vmesno stanje — kjer se
   prazna stanja in prvi sestevki najveckrat lomijo — pa se ni dalo pogledati. */
export type Predogled = 'empty' | 'zacetek' | 'mine' | 'demo';

const KLJUC = 'pinart-predogled';
const DOGODEK = 'pinart-predogled-sprememba';

export function preberiPredogled(): Predogled {
  if (typeof window === 'undefined') return 'mine';
  const v = localStorage.getItem(KLJUC);
  return v === 'empty' || v === 'demo' || v === 'zacetek' ? v : 'mine';
}

/** Varnostni preizkus za vse zapisovalne poti predstavitvenega načina. */
export function jeDemo(): boolean {
  return preberiPredogled() === 'demo';
}

/** Predogledni podatki nikoli ne smejo zapustiti brskalnika. */
export function jeSamoPredogled(): boolean {
  const nacin = preberiPredogled();
  return nacin === 'demo' || nacin === 'empty' || nacin === 'zacetek';
}

/** Demo zapisi se nikoli ne smejo sinhronizirati v pravo organizacijo. */
export function jeDemoId(id?: string | null): boolean {
  return typeof id === 'string' && id.startsWith('demo-');
}

export function nastaviPredogled(vrednost: Predogled): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KLJUC, vrednost);
  /* lasten dogodek: "storage" se sprozi samo v DRUGIH zavihkih, ne v tem */
  window.dispatchEvent(new CustomEvent(DOGODEK));
}

/**
 * Vrne trenutni predogled. Zacne z 'mine', da se streznik in brskalnik ujemata
 * (hidracija); pravo vrednost prebere sele po priklopu.
 */
export function usePredogled(): [Predogled, (v: Predogled) => void] {
  const [nacin, setNacin] = useState<Predogled>('mine');

  useEffect(() => {
    setNacin(preberiPredogled());
    const osvezi = () => setNacin(preberiPredogled());
    window.addEventListener(DOGODEK, osvezi);
    window.addEventListener('storage', osvezi);   /* sprememba v drugem zavihku */
    return () => {
      window.removeEventListener(DOGODEK, osvezi);
      window.removeEventListener('storage', osvezi);
    };
  }, []);

  return [nacin, (v: Predogled) => { nastaviPredogled(v); setNacin(v); }];
}

/* ── Demo podatki ─────────────────────────────────────────────────────────
   Izmišljeni, a verjetni: cene in ritem dela slovenskega oblikovalskega
   studia. Deterministični (brez naključja), da je slika ob vsakem odprtju
   enaka in da posnetki zaslona za predstavitev ostanejo primerljivi. */

const STRANKE = [
  'Modra hiša', 'Lumen studio', 'Gorenjka Bio', 'Atelje Vrt', 'Nordika',
  'Zeleni val', 'Mesto Kranj', 'Pekarna Sonce',
];

/* datum pred N meseci in D dnevi, kot 'YYYY-MM-DD' */
function datum(mesecevNazaj: number, dan: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - mesecevNazaj);
  d.setDate(Math.min(dan, 28));
  return d.toISOString().slice(0, 10);
}

/* fiksen datum (NE relativen na "danes") — za dolgoročni demo projekt, ki mora
   ostati na istih koledarskih letih (2022-2026) ne glede na to, kdaj se demo odpre.
   `zamikDni` prišteje dneve datumu 15.1.<letoOsnova>. */
function datumFiksni(letoOsnova: number, zamikDni: number): string {
  const d = new Date(Date.UTC(letoOsnova, 0, 15));
  d.setUTCDate(d.getUTCDate() + zamikDni);
  return d.toISOString().slice(0, 10);
}

const NASLOVI = ['Nova identiteta', 'Spletna stran', 'Letno poročilo', 'Kampanja', 'Embalaža', 'Ilustracije'];

export type DemoCenovniProfil = {
  osnove: Record<string, number>;
  mojTrg: 'si';
  izkusnje: 'samostojen';
  mojeStoritve: PricingService[];
};

/** Realen cenovni profil za predogled »Demo · polno poslovanje«. */
export function demoCenovniProfili(): Record<string, DemoCenovniProfil> {
  return {
    'Slovenija — lokalne stranke': {
      mojTrg: 'si',
      izkusnje: 'samostojen',
      mojeStoritve: [],
      osnove: Object.fromEntries(
        PRICING_SERVICES.map(({ id, osnova }) => [id, osnova]),
      ),
    },
  };
}

export function demoPodatki(): FlowData {
  const offers: FlowOffer[] = Array.from({ length: 12 }, (_, i) => ({
    id: `demo-o-${i}`,
    title: NASLOVI[i % NASLOVI.length],
    client: STRANKE[i % STRANKE.length],
    date: new Date(`${datum(i % 10, 8 + (i % 16))}T00:00:00`).toISOString(),
    number: `2026-${String(i + 1).padStart(3, '0')}`,
    scope: ['Analiza in izhodišča', 'Oblikovanje', 'Priprava za tisk'].slice(0, 2 + (i % 2)),
    status: (['sent', 'accepted', 'accepted', 'draft', 'rejected'] as const)[i % 5],
    agreedAmount: 1200 + (i % 7) * 640,
    licencaDo: i === 1 ? '2026-06-01' : i === 2 ? '2026-09-15' : undefined,
  }));

  /* demo postavke racuna (da predogled pokaze razclembo, ne le vsote): 2 postavki +
     neto/DDV izpeljani iz zneska (22% DDV), vsota postavk = neto = znesek brez DDV. */
  const RACUN_OPISI = ['Oblikovanje in postavitev', 'Analiza in izhodišča', 'Produkcija in priprava', 'Svetovanje in usklajevanje'];
  const racunPostavke = (amount: number, i: number) => {
    const net = Math.round(amount / 1.22);
    const a = Math.round(net * 0.6);
    return {
      items: [
        { opis: RACUN_OPISI[i % RACUN_OPISI.length], kolicina: 1, cena: a, ddv: 22 },
        { opis: RACUN_OPISI[(i + 1) % RACUN_OPISI.length], kolicina: 1, cena: net - a, ddv: 22 },
      ],
      net,
      vatAmount: amount - net,
      vatPayer: true,
    };
  };

  const invoices: FlowInvoice[] = Array.from({ length: 30 }, (_, i) => {
    const amount = 850 + (i % 6) * 430;
    return {
      id: `demo-i-${i}`,
      number: `R-2026-${String(i + 1).padStart(3, '0')}`,
      title: NASLOVI[i % NASLOVI.length],
      client: STRANKE[i % STRANKE.length],
      amount,
      paid: i % 7 !== 0,
      date: datum(i % 10, 4 + (i % 20)),
      dueDays: 15,
      sourceOfferId: `demo-o-${i % 12}`,
      ...racunPostavke(amount, i),
    };
  });

  const expenses: FlowExpense[] = Array.from({ length: 34 }, (_, i) => ({
    id: `demo-e-${i}`,
    title: ['Zunanji sodelavec', 'Programska oprema', 'Tisk in produkcija', 'Fotografija'][i % 4],
    client: i % 4 === 1 ? '' : STRANKE[i % STRANKE.length],
    amount: 90 + (i % 5) * 125,
    date: datum(i % 10, 6 + (i % 18)),
    category: i % 4 === 1 ? 'Podjetje' : 'Projekt',
    sourceOfferId: i % 4 === 1 ? undefined : `demo-o-${i % 12}`,
    /* demo znacke: nekaj primerov za predogled polnega videza (poln nabor + brez znack) */
    tags: i % 4 === 1 ? ['mesečni', 'obratovalni stroški']
      : i % 4 === 2 ? ['letni', 'najem']
      : i % 4 === 3 ? ['naročnine']
      : undefined,
  }));

  /* demo pogodbe imajo tudi TELO (HTML v obliki predloge iz retainerja/pogodb),
     da detajl pokaze celoten dokument s cleni in podpisnim blokom — prej so bile
     samo metapodatki in detajl je izgledal prazen/pokvarjen */
  const teloPogodbe = (naslov: string, stranka: string, dat: string) => `
    <div class="kick">Pogodba o sodelovanju</div>
    <h1>${naslov}</h1>
    <p class="meta">Datum: ${new Date(dat + 'T00:00:00').toLocaleDateString('sl-SI')}</p>
    <div class="parties"><p>sklenjena med:</p><p><b>Izvajalec:</b> Pinart studio</p><p>in</p><p><b>Naročnik:</b> ${stranka}</p></div>
    <div class="pog-clen"><h2>1. člen — Predmet</h2><p>Izvajalec za naročnika opravi storitve iz ponudbe: ${naslov.toLowerCase()}. Obseg in vsebina sledita potrjeni ponudbi.</p></div>
    <div class="pog-clen"><h2>2. člen — Roki</h2><p>Deli se oddajajo po dogovorjenem terminskem načrtu. Zamude zaradi manjkajočih gradiv naročnika podaljšajo roke za enak čas.</p></div>
    <div class="pog-clen"><h2>3. člen — Cena in plačilo</h2><p>Cena po potrjeni ponudbi. Plačilo v 15 dneh od izdaje računa na TRR izvajalca.</p></div>
    <div class="pog-clen"><h2>4. člen — Avtorske pravice</h2><p>Materialne avtorske pravice se prenesejo za dogovorjene medije in obdobje po specifikaciji v ponudbi; moralne pravice ostanejo avtorju.</p></div>
    <div class="pog-clen"><h2>5. člen — Končne določbe</h2><p>Za spore je pristojno sodišče po sedežu izvajalca. Pogodba je sklenjena v dveh enakih izvodih.</p></div>
    <div class="sig"><div><span>Izvajalec</span><span class="lin"></span>Pinart studio</div><div><span>Naročnik</span><span class="lin"></span>${stranka}</div></div>`;
  const contracts: FlowContract[] = Array.from({ length: 8 }, (_, i) => {
    const naslov = NASLOVI[i % NASLOVI.length];
    const stranka = STRANKE[i % STRANKE.length];
    const dat = datum(i % 8, 10 + (i % 15));
    return {
      id: `demo-p-${i}`,
      title: `Pogodba · ${naslov}`,
      client: stranka,
      date: dat,
      status: (['signed', 'active', 'review', 'received', 'draft'] as const)[i % 5],
      sourceOfferId: `demo-o-${i}`,
      body: teloPogodbe(naslov, stranka, dat),
      /* predpona "ALERT:" oznaci opozorilo (rdece v arhivu/detajlu) — npr. potekla licenca */
      notes: i % 4 === 1 ? 'ALERT: Potekle avtorske pravice — licenca za tisk je potekla 1. 6. 2026.'
        : i % 3 === 0 ? 'Avtorske pravice prenesene za tisk in splet, 3 leta.' : undefined,
    };
  });

  /* ── Dolgorocni projekt za preizkus obsega ("Prikazi vec", Arhiv z veliko racuni) ──
     En petletni retainer z ~66 racuni, vsi vezani na isti offer prek sourceOfferId. */
  const demoPortalOffer: FlowOffer = {
    id: 'demo-portal',
    title: 'Prenova portala',
    client: 'Rokus Klett',
    date: new Date('2022-01-10T00:00:00').toISOString(),
    number: '2022-100',
    scope: ['Analiza obstoječega portala', 'UX prenova', 'Oblikovanje predlog', 'Petletni retainer vzdrževanja'],
    status: 'accepted',
    agreedAmount: 60000,
  };

  /* 66 racunov, priblizno vsake 4 tedne od 15.1.2022 naprej — pokrije obdobje 2022-2026 */
  const demoPortalInvoices: FlowInvoice[] = Array.from({ length: 66 }, (_, i) => {
    const dat = datumFiksni(2022, i * 27);
    const leto = Number(dat.slice(0, 4));
    const amount = 700 + (i % 12) * 100;
    return {
      id: `demo-portal-i-${i}`,
      number: `R-${leto}-${String(100 + i).padStart(3, '0')}`,
      title: 'Prenova portala',
      client: 'Rokus Klett',
      amount,
      paid: i % 9 !== 0,
      date: dat,
      dueDays: 15,
      sourceOfferId: 'demo-portal',
      ...racunPostavke(amount, i),
    };
  });

  const demoPortalContracts: FlowContract[] = [
    { id: 'demo-portal-p-0', title: 'Pogodba · Prenova portala', client: 'Rokus Klett', date: '2022-01-10', status: 'active', sourceOfferId: 'demo-portal', body: teloPogodbe('Prenova portala', 'Rokus Klett', '2022-01-10'), notes: 'Petletni retainer, mesečno obračunavanje po dogovorjenem obsegu.' },
    { id: 'demo-portal-p-1', title: 'Aneks 1 · Razširitev obsega', client: 'Rokus Klett', date: '2023-03-15', status: 'signed', sourceOfferId: 'demo-portal', body: teloPogodbe('Aneks 1 — razširitev obsega', 'Rokus Klett', '2023-03-15') },
    { id: 'demo-portal-p-2', title: 'Pogodba o zaupnosti (NDA)', client: 'Rokus Klett', date: '2022-01-08', status: 'signed', sourceOfferId: 'demo-portal', body: teloPogodbe('Pogodba o zaupnosti', 'Rokus Klett', '2022-01-08') },
    { id: 'demo-portal-p-3', title: 'Aneks 2 · Vzdrževanje 2025', client: 'Rokus Klett', date: '2025-01-20', status: 'review', sourceOfferId: 'demo-portal', body: teloPogodbe('Aneks 2 — vzdrževanje 2025', 'Rokus Klett', '2025-01-20') },
  ];

  const demoPortalExpenses: FlowExpense[] = [
    { id: 'demo-portal-e-0', title: 'Zunanji sodelavec · frontend', client: 'Rokus Klett', amount: 1480, date: datumFiksni(2023, 220), category: 'Projekt', sourceOfferId: 'demo-portal' },
    { id: 'demo-portal-e-1', title: 'Stock fotografije', client: 'Rokus Klett', amount: 240, date: datumFiksni(2022, 140), category: 'Projekt', sourceOfferId: 'demo-portal' },
    { id: 'demo-portal-e-2', title: 'Licenca za pisave', client: 'Rokus Klett', amount: 320, date: datumFiksni(2022, 60), category: 'Projekt', sourceOfferId: 'demo-portal' },
    { id: 'demo-portal-e-3', title: 'Testiranje dostopnosti (zunanje)', client: 'Rokus Klett', amount: 650, date: datumFiksni(2024, 90), category: 'Projekt', sourceOfferId: 'demo-portal' },
  ];

  const clients: FlowClient[] = STRANKE.map((ime, i) => ({
    id: `demo-s-${i}`,
    name: ime,
    email: `info@${ime.toLowerCase().replace(/[^a-z]/g, '')}.si`,
    contact: ['Ana Kos', 'Marko Zupan', 'Eva Novak', 'Luka Beg'][i % 4],
    phone: `041 ${100 + i * 7} ${200 + i * 3}`,
    address: ['Ljubljana', 'Kranj', 'Maribor', 'Koper'][i % 4],
    tax: `SI${10000000 + i * 137}`,
  }));
  /* Rokus Klett — stranka 5-letnega projekta "Prenova portala" (66 računov). Doda se
     posebej, da je vidna v imeniku Strank IN se ujema z demoPortalOffer.client, tako da
     njen profil pokaže projekt "Prenova portala" (Stranke -> Rokus Klett -> projekt -> 66 računov). */
  clients.push({
    id: 'demo-s-rokus',
    name: 'Rokus Klett',
    email: 'info@rokus-klett.si',
    contact: 'Maja Horvat',
    phone: '01 234 56 78',
    address: 'Ljubljana',
    tax: 'SI99887766',
    website: 'https://www.rokus-klett.si',
  });

  return {
    version: 1,
    offers: [...offers, demoPortalOffer],
    invoices: [...invoices, ...demoPortalInvoices],
    expenses: [...expenses, ...demoPortalExpenses],
    contracts: [...contracts, ...demoPortalContracts],
    clients,
  };
}

/* ── Demo sodelavci (ekipa) — samo za predogled »polno poslovanje«. Njihovi id-ji
   se ujemajo z Projekt.dodeljeni v demoRealZaOffer spodaj, da se v Delovnem pogledu
   projekta pokaze prava ekipa z imeni. ── */
export function demoSodelavci(): Sodelavec[] {
  return [
    { id: 'demo-sod-tina', ime: 'Tina Zaletel', email: 'tina@pinart.si', vloga: 'admin', aktiven: true },
    { id: 'demo-sod-luka', ime: 'Luka Beg', email: 'luka@pinart.si', vloga: 'vodja', aktiven: true },
    { id: 'demo-sod-eva', ime: 'Eva Kralj', email: 'eva@pinart.si', vloga: 'clan', aktiven: true },
    { id: 'demo-sod-marko', ime: 'Marko Zupan', email: 'marko@freelance.si', vloga: 'clan', aktiven: true },
  ];
}

/* ── Demo »real« Projekt (brief/cilji/ekipa) za izbrane demo ponudbe. Vrne bogat
   zapis za flagship projekt Rokus Klett (offer 'demo-portal'), delna zapisa za se
   dve ponudbi (da se v predogledu vidi RAZLICNA polnost), in undefined za ostale
   (prazen brief). Pripne se prek gradiVnos(offer, real) samo v predogledu. ── */
export function demoRealZaOffer(offerId: string): Projekt | undefined {
  const D = DEMO_REAL[offerId];
  return D;
}

const DEMO_REAL: Record<string, Projekt> = {
  'demo-portal': {
    id: 'demo-portal',
    stevilka: '2022-100',
    naslov: 'Prenova portala',
    strankaIme: 'Rokus Klett',
    zelje: 'Prenoviti zastarel založniški portal v sodoben, hiter in dostopen sistem, ki učiteljem in staršem olajša dostop do e-gradiv.',
    opisStranke: 'Uveljavljena slovenska založba učbenikov in izobraževalnih gradiv, del skupine Klett.',
    panoga: 'Založništvo in izobraževanje',
    ciljnaSkupina: 'Učitelji, šole in starši osnovnošolcev; interni uredniki založbe.',
    dizajnZelje: 'Čist, zaupanja vreden videz z jasno tipografijo; ohraniti prepoznavno modro znamke, dodati zračnost in boljšo hierarhijo.',
    voice: 'Strokoven, a topel in dostopen; brez žargona, spodbuden do učiteljev.',
    konkurenca: 'DZS, Mladinska knjiga, Založba Rokus (obstoječi portali) — cilj je hitrejši in preglednejši od vseh.',
    cilji: [
      { id: 'demo-c-1', besedilo: 'Skrajšati čas do e-gradiva', tarca: 'do 3 klike' },
      { id: 'demo-c-2', besedilo: 'Dvigniti hitrost nalaganja', tarca: 'pod 2 sekundi' },
      { id: 'demo-c-3', besedilo: 'Dostopnost po WCAG', tarca: 'raven AA' },
      { id: 'demo-c-4', besedilo: 'Povečati zadovoljstvo učiteljev', tarca: 'vsaj 4,5 od 5' },
    ],
    dodatnaVprasanja: [
      { id: 'demo-v-1', vprasanje: 'Ima stranka že CGP?', odgovor: 'Da, obstaja knjiga znamke — barvo in logotip ohranimo, tipografijo osvežimo.' },
      { id: 'demo-v-2', vprasanje: 'Kdo vzdržuje vsebino?', odgovor: 'Interni uredniki založbe prek CMS; potrebujejo enostaven vnos.' },
    ],
    zacetek: '2022-01-10',
    status: 'aktiven',
    faza: 'delo',
    created: new Date('2022-01-08T00:00:00').toISOString(),
    dodeljeni: ['demo-sod-tina', 'demo-sod-luka', 'demo-sod-eva'],
    /* Edini demo projekt, ki ima VSE dokumente. Nekje mora biti videti, kako
       polna kartica DOKUMENTI izgleda; ostali projekti so namenoma prazni,
       ker je prazno stanje pogostejše in ga je treba prav tako videti. */
    pitch: {
      naslov: 'Portal, ki učiteljico pripelje do gradiva v treh klikih',
      problem: 'Učitelji iščejo e-gradiva po zastarelem portalu, kjer je pot do datoteke dolga in nepredvidljiva. Del jih odneha in gradivo poišče drugje, šole pa se obračajo na podporo založbe.',
      resitev: 'Prenova okrog ene same naloge: najti gradivo in ga odpreti. Nova informacijska arhitektura, iskalnik s predlogami, hitro nalaganje in vnos vsebine, ki ga urednik obvlada brez razvijalca.',
      zakajMi: 'Delamo z založniki in vemo, da vsebina nastaja v uredništvu, ne v CMS-u. Prevzamemo celoto — od raziskave in prototipa do dostopnosti po WCAG AA in predaje ekipi.',
      obseg: 'Raziskava in informacijska arhitektura, wireframi ključnih strani, prototip navigacije in iskalnika, oblikovni sistem, uskladitev s CGP, testiranje dostopnosti, predaja.',
      okvirnaCena: '60.000 € za prvo fazo; nadaljnje faze po aneksu.',
      naslednjiKorak: 'Uskladimo obseg prve faze in potrdimo termin delavnice z uredništvom.',
      createdAt: new Date('2022-01-12T00:00:00').toISOString(),
    },
    swot: {
      prednosti: 'Uveljavljena znamka z zaupanjem učiteljev, obsežna knjižnica gradiv in interno uredništvo, ki vsebino pozna do potankosti.',
      slabosti: 'Zastarel portal in počasno nalaganje, dolga pot do datoteke, vnos vsebine odvisen od razvijalca.',
      priloznosti: 'Šole prehajajo na digitalna gradiva; kdor prvi ponudi pregleden dostop, postane privzeta izbira učiteljice. Dostopnost po WCAG odpira javne razpise.',
      nevarnosti: 'Druge založbe vlagajo v svoje portale, brezplačna gradiva na spletu pa odvračajo del učiteljev.',
      createdAt: new Date('2022-01-14T00:00:00').toISOString(),
    },
    raziskavaStranke: {
      kajDela: 'Založba učbenikov in izobraževalnih gradiv za osnovne in srednje šole. Poleg tiskanih učbenikov ponuja e-gradiva prek spletnega portala.',
      njihoveStranke: 'Šole kot ustanove, učitelji kot vsakodnevni uporabniki in starši, ki gradivo iščejo za otroka. Odločitev o nakupu sprejme šola, uporablja pa jo učiteljica.',
      predstavitev: 'Zanesljiv in strokoven partner šole. Ton je umirjen, poudarek na kakovosti gradiv in dolgi tradiciji.',
      kajPonuditi: 'Prenovo portala okrog učiteljeve naloge, oblikovni sistem za nadaljnjo rast in dostopnost po WCAG AA, ki jo javni sektor vse pogosteje zahteva.',
      vprasanja: [
        'Koliko učiteljev portal uporablja tedensko in koliko jih odneha pred prenosom?',
        'Kdo v uredništvu vnaša vsebino in koliko časa mu vzame ena enota?',
        'Katera gradiva se največ prenašajo in katerih nihče ne najde?',
        'Ali dostopnost zahtevajo razpisi ali šole same?',
        'Kje se portal sreča s šolskimi informacijskimi sistemi?',
      ],
      createdAt: new Date('2022-01-11T00:00:00').toISOString(),
    },
    pregledKonkurence: {
      panoga: 'Založništvo in izobraževalna gradiva, Slovenija',
      konkurenti: [
        { ime: 'Velike založbe učbenikov', pozicioniranje: 'Široka ponudba in tradicija; portali so obsežni, a razdrobljeni.', poudarki: 'Širina kataloga, prepoznavnost, mreža šol.' },
        { ime: 'Obstoječi portal založbe', pozicioniranje: 'Točka, ki jo prenavljamo — uporabniki so že tu, pot do gradiva pa je predolga.', poudarki: 'Obstoječa baza uporabnikov, gradiva že v sistemu.' },
        { ime: 'Brezplačna gradiva učiteljev', pozicioniranje: 'Skupnostne zbirke in osebne strani učiteljev.', poudarki: 'Zastonj, hitro najdljivo prek iskalnika, brez prijave.' },
      ],
      vrzel: 'Nihče ne reši učiteljeve naloge do konca: portali kažejo katalog, ne poti do gradiva. Kdor skrajša pot na tri klike in doda dostopnost, prevzame vsakodnevno rabo.',
      createdAt: new Date('2022-01-13T00:00:00').toISOString(),
    },
  },
  'demo-o-1': {
    id: 'demo-o-1',
    naslov: NASLOVI[1 % NASLOVI.length],
    strankaIme: STRANKE[1 % STRANKE.length],
    zelje: 'Osvežiti vizualno podobo in pripraviti ključne tiskovine za jesensko kampanjo.',
    ciljnaSkupina: 'Mladi odrasli 20–35 let, urbani, digitalno aktivni.',
    cilji: [
      { id: 'demo-c1-1', besedilo: 'Poenotiti vizualni jezik', tarca: 'vse tiskovine' },
      { id: 'demo-c1-2', besedilo: 'Pripraviti za tisk pravočasno', metrika: 'rok', tarca: '15. 9.' },
    ],
    status: 'aktiven',
    faza: 'delo',
    created: new Date('2026-02-01T00:00:00').toISOString(),
    dodeljeni: ['demo-sod-tina', 'demo-sod-marko'],
  },
  'demo-o-3': {
    id: 'demo-o-3',
    naslov: NASLOVI[3 % NASLOVI.length],
    strankaIme: STRANKE[3 % STRANKE.length],
    zelje: 'Manjši projekt — samo prenova logotipa in osnovne barvne palete.',
    status: 'pavza',
    faza: 'ponudba',
    created: new Date('2026-03-12T00:00:00').toISOString(),
    dodeljeni: ['demo-sod-tina'],
  },
};

/**
 * Kaj naj delovni prostor prikaže glede na predogled.
 * `moji` so pravi podatki uporabnice.
 */
export function podatkiZaPredogled(nacin: Predogled, moji: FlowData): FlowData {
  if (nacin === 'demo') return demoPodatki();
  if (nacin === 'empty') return { version: 1, offers: [], invoices: [], expenses: [], contracts: [], clients: [] };
  if (nacin === 'zacetek') {
    /* Prvi teden: ena poslana in ena sprejeta ponudba, en neplacan racun,
       dve stranki, brez pogodb. Namenoma NEPOPOLNO — tako se vidi, kako
       izgledajo delne vsote in prazni razdelki drug ob drugem. */
    const d = demoPodatki();
    return {
      version: 1,
      offers: d.offers.slice(0, 2),
      invoices: d.invoices.slice(0, 1),
      expenses: d.expenses.slice(0, 2),
      contracts: [],
      clients: d.clients.slice(0, 2),
    };
  }
  return moji;
}

'use client';

import { useEffect, useState } from 'react';
import type { FlowClient, FlowContract, FlowData, FlowExpense, FlowInvoice, FlowOffer } from './pinartFlowStore';

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

  const demoPortalContract: FlowContract = {
    id: 'demo-portal-p-0',
    title: 'Pogodba · Prenova portala',
    client: 'Rokus Klett',
    date: '2022-01-10',
    status: 'active',
    sourceOfferId: 'demo-portal',
    body: teloPogodbe('Prenova portala', 'Rokus Klett', '2022-01-10'),
    notes: 'Petletni retainer, mesečno obračunavanje po dogovorjenem obsegu.',
  };

  const demoPortalExpense: FlowExpense = {
    id: 'demo-portal-e-0',
    title: 'Zunanji sodelavec',
    client: 'Rokus Klett',
    amount: 480,
    date: datumFiksni(2023, 220),
    category: 'Projekt',
    sourceOfferId: 'demo-portal',
  };

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
    expenses: [...expenses, demoPortalExpense],
    contracts: [...contracts, demoPortalContract],
    clients,
  };
}

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

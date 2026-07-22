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

export type Predogled = 'empty' | 'mine' | 'demo';

const KLJUC = 'pinart-predogled';
const DOGODEK = 'pinart-predogled-sprememba';

export function preberiPredogled(): Predogled {
  if (typeof window === 'undefined') return 'mine';
  const v = localStorage.getItem(KLJUC);
  return v === 'empty' || v === 'demo' ? v : 'mine';
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

  const invoices: FlowInvoice[] = Array.from({ length: 30 }, (_, i) => ({
    id: `demo-i-${i}`,
    number: `R-2026-${String(i + 1).padStart(3, '0')}`,
    title: NASLOVI[i % NASLOVI.length],
    client: STRANKE[i % STRANKE.length],
    amount: 850 + (i % 6) * 430,
    paid: i % 7 !== 0,
    date: datum(i % 10, 4 + (i % 20)),
    dueDays: 15,
    sourceOfferId: `demo-o-${i % 12}`,
  }));

  const expenses: FlowExpense[] = Array.from({ length: 34 }, (_, i) => ({
    id: `demo-e-${i}`,
    title: ['Zunanji sodelavec', 'Programska oprema', 'Tisk in produkcija', 'Fotografija'][i % 4],
    client: i % 4 === 1 ? '' : STRANKE[i % STRANKE.length],
    amount: 90 + (i % 5) * 125,
    date: datum(i % 10, 6 + (i % 18)),
    category: i % 4 === 1 ? 'Podjetje' : 'Projekt',
    sourceOfferId: i % 4 === 1 ? undefined : `demo-o-${i % 12}`,
  }));

  const contracts: FlowContract[] = Array.from({ length: 8 }, (_, i) => ({
    id: `demo-p-${i}`,
    title: `Pogodba · ${NASLOVI[i % NASLOVI.length]}`,
    client: STRANKE[i % STRANKE.length],
    date: datum(i % 8, 10 + (i % 15)),
    status: (['signed', 'active', 'review', 'received', 'draft'] as const)[i % 5],
    sourceOfferId: `demo-o-${i}`,
    notes: i % 3 === 0 ? 'Avtorske pravice prenesene za tisk in splet, 3 leta.' : undefined,
  }));

  const clients: FlowClient[] = STRANKE.map((ime, i) => ({
    id: `demo-s-${i}`,
    name: ime,
    email: `info@${ime.toLowerCase().replace(/[^a-z]/g, '')}.si`,
    contact: ['Ana Kos', 'Marko Zupan', 'Eva Novak', 'Luka Beg'][i % 4],
    phone: `041 ${100 + i * 7} ${200 + i * 3}`,
    address: ['Ljubljana', 'Kranj', 'Maribor', 'Koper'][i % 4],
    tax: `SI${10000000 + i * 137}`,
  }));

  return { version: 1, offers, invoices, expenses, contracts, clients };
}

/**
 * Kaj naj delovni prostor prikaže glede na predogled.
 * `moji` so pravi podatki uporabnice.
 */
export function podatkiZaPredogled(nacin: Predogled, moji: FlowData): FlowData {
  if (nacin === 'demo') return demoPodatki();
  if (nacin === 'empty') return { version: 1, offers: [], invoices: [], expenses: [], contracts: [], clients: [] };
  return moji;
}

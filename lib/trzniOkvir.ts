/* TRŽNI OKVIR — koliko za to storitev zaračunavajo drugi.
 *
 * Zakaj to obstaja: kalkulator, ki vrže številko, zna narediti vsak. Številka
 * z razponom trga in navedenimi viri pa odgovori na edino vprašanje, ki
 * oblikovalcu zlomi ceno — »zakaj toliko?«. Namesto »ker se mi zdi« pokažeš
 * objavljene cenike drugih.
 *
 * Vir podatkov je docs/CENE-TRZNA-RAZISKAVA-2026.md (22. 8. 2026, 90 povezav
 * na javno objavljene cenike). Ta datoteka je NJEGOV strojni prepis — če se
 * dokument osveži, se osveži tudi tu, in datum spodaj se mora premakniti.
 *
 * Polje `vir` je tu že zdaj, čeprav ima danes eno samo vrednost: ko bo Flow
 * imel dovolj lastnih ponudb, bo isti okvir lahko rekel »na podlagi 128 ponudb
 * v Flowu« namesto »6 preverjenih virov«. Takrat se ne prepiše nič, samo doda.
 *
 * KAKOVOST DOKAZOV je prevzeta iz raziskave in ni okras:
 *   A — vsaj trije neposredno primerljivi ceniki
 *   B — dva ali več uporabnih virov, obseg je bilo treba poenotiti
 *   C — javni signal obstaja, a ga ni dovolj za pošten razpon
 *   D — najprej je treba določiti, kaj sploh je enota storitve
 * Pri C in D razpona NE izračunamo. Lažno natančna številka bi bila slabša od
 * odkritega »tega še ne vemo« — vrednost te stvari je ravno v tem, da drži.
 */

import { VIRI_STEVILO } from '@/lib/trzniOkviriStevilo';

export type Kakovost = 'A' | 'B' | 'C' | 'D';
export type Enota = 'projekt' | 'stran' | 'm2' | 'mesec' | 'dan' | 'kos' | 'minuta';

export type TrzniOkvir = {
  kakovost: Kakovost;
  /* Od kod podatek. Danes vedno »raziskava«; »baza« pride, ko bo dovolj
     lastnih anonimiziranih ponudb. */
  vir: 'raziskava' | 'baza';
  virov: number;
  posodobljeno: string;
  od?: number;
  do?: number;
  mediana?: number;
  valuta?: 'EUR' | 'USD';
  enota?: Enota;
  opomba?: string;
  opombaEn?: string;
};

export const RAZISKAVA_DATUM = '2026-08-22';

const R = (o: Omit<TrzniOkvir, 'vir' | 'posodobljeno'>): TrzniOkvir =>
  ({ ...o, vir: 'raziskava', posodobljeno: RAZISKAVA_DATUM });

export const TRZNI_OKVIRI: Record<string, TrzniOkvir> = {
  /* ── A: trije ali več neposredno primerljivih cenikov ───────────────── */
  cgp: R({ kakovost: 'A', virov: 4, od: 550, do: 2500, mediana: 1200, valuta: 'EUR', enota: 'projekt',
    opomba: 'Slovenski trg se stopnjuje: vstop 550–1.200 €, srednji sistem 1.200–2.500 €, razširjen 2.500–4.500 €.',
    opombaEn: 'The Slovenian market tiers: entry €550–1,200, mid system €1,200–2,500, extended €2,500–4,500.' }),
  web: R({ kakovost: 'A', virov: 6, od: 590, do: 1500, mediana: 1200, valuta: 'EUR', enota: 'projekt',
    opomba: 'Predstavitvena stran. Spletna trgovina in spletna aplikacija nista vključeni.',
    opombaEn: 'Brochure site. Online stores and web apps are not included.' }),
  smm: R({ kakovost: 'A', virov: 4, od: 290, do: 790, mediana: 545, valuta: 'EUR', enota: 'mesec',
    opomba: 'Brez večje video produkcije; ta vstop premakne na 720–1.490 € na mesec.',
    opombaEn: 'Excludes larger video production, which moves entry to €720–1,490 a month.' }),
  video: R({ kakovost: 'A', virov: 4, od: 800, do: 1990, mediana: 1545, valuta: 'EUR', enota: 'projekt' }),
  motion: R({ kakovost: 'A', virov: 4, od: 180, do: 1700, valuta: 'EUR', enota: 'projekt',
    opomba: 'Spodnji del razpona je krajši motion element, zgornji cel minutni razlagalni video.',
    opombaEn: 'The low end is a short motion element, the high end a full one-minute explainer.' }),
  interier: R({ kakovost: 'A', virov: 4, od: 15, do: 45, mediana: 24, valuta: 'EUR', enota: 'm2',
    opomba: 'Idejna zasnova na kvadratni meter. Projekt za izvedbo je ločen in dražji.',
    opombaEn: 'Concept design per square metre. Detailed design is separate and costs more.' }),

  /* ── B: dva ali več virov, obseg poenoten ────────────────────────────── */
  logo: R({ kakovost: 'B', virov: 5, od: 560, do: 1400, mediana: 750, valuta: 'EUR', enota: 'projekt',
    opomba: 'Velja za logotip z osnovno identiteto, ne za goli znak od 150 €.',
    opombaEn: 'For a logo with basic identity, not a bare mark from €150.' }),
  publikacija: R({ kakovost: 'B', virov: 2, od: 20, do: 30, valuta: 'EUR', enota: 'stran',
    opomba: 'Običajen prelom. Naslovnica in izvirna zasnova sta dodatni postavki.',
    opombaEn: 'Standard layout. Cover and original concept are separate items.' }),
  embalaza: R({ kakovost: 'B', virov: 3, od: 195, do: 425, mediana: 425, valuta: 'EUR', enota: 'projekt',
    opomba: 'Etiketa ali lažji posamezen izdelek. Celovita embalaža z dielineom je višji paket.',
    opombaEn: 'Label or a simpler single item. Full packaging with a dieline is a higher tier.' }),
  ilustracija: R({ kakovost: 'B', virov: 2, od: 70, do: 220, valuta: 'EUR', enota: 'kos',
    opomba: 'Cena posamezne ilustracije pred širšimi pravicami uporabe.',
    opombaEn: 'Price per illustration before broader usage rights.' }),
  uxui: R({ kakovost: 'B', virov: 3, od: 499, do: 3000, valuta: 'USD', enota: 'projekt',
    opomba: 'Slovenskih javnih paketov s primerljivim obsegom ni bilo najti, zato je razpon v dolarjih.',
    opombaEn: 'No comparable Slovenian public packages were found, so the range is in dollars.' }),
  aplikacija: R({ kakovost: 'B', virov: 3, od: 499, do: 6000, valuta: 'USD', enota: 'projekt',
    opomba: 'To je cena DIZAJNA, ne razvoja. Programska izvedba je ločena postavka.',
    opombaEn: 'This is the price of DESIGN, not development. Engineering is a separate item.' }),
  fotografija: R({ kakovost: 'B', virov: 3, od: 400, do: 600, valuta: 'EUR', enota: 'dan',
    opomba: 'Snemalni dan. Produktna fotografija po kosu se začne pri 25 €, paket pri 290 €.',
    opombaEn: 'Shooting day. Per-product photography starts at €25, packages at €290.' }),
  pr: R({ kakovost: 'B', virov: 1, od: 309, do: 1381, mediana: 684, valuta: 'EUR', enota: 'projekt',
    opomba: 'Reproduciran cenik PRSS; pred pogodbeno uporabo ga je treba preveriti pri izvirniku.',
    opombaEn: 'A reproduced PRSS price list; verify against the original before contractual use.' }),
  razstava: R({ kakovost: 'B', virov: 1, od: 1500, do: 2500, valuta: 'EUR', enota: 'projekt',
    opomba: 'Javni pavšal za scenografijo. Izdelava konstrukcije ni vključena.',
    opombaEn: 'Public flat rate for set design. Building the structure is not included.' }),

  /* ── C: signal obstaja, razpona pa raziskava ne dovoli ───────────────── */
  dizajnsistem: R({ kakovost: 'C', virov: 4 }),
  seo: R({ kakovost: 'C', virov: 1 }),
  email: R({ kakovost: 'C', virov: 1 }),
  copy: R({ kakovost: 'C', virov: 2 }),
  kampanja: R({ kakovost: 'C', virov: 1 }),
  strategija: R({ kakovost: 'C', virov: 3 }),
  render3d: R({ kakovost: 'C', virov: 2 }),
  arhitektura: R({ kakovost: 'C', virov: 2 }),

  /* ── D: enote storitve še ni ─────────────────────────────────────────── */
  direkcija: R({ kakovost: 'D', virov: 0 }),
  produktni: R({ kakovost: 'D', virov: 0 }),
};

export function okvirZa(idStoritve: string | null | undefined): TrzniOkvir | null {
  if (!idStoritve) return null;
  const o = TRZNI_OKVIRI[idStoritve];
  if (!o) return null;
  /* Število virov beremo iz samih virov, ne iz ročno vpisane številke: dve
     mesti z istim podatkom se prej ali slej razideta, tu pa bi razhajanje
     pomenilo, da pišemo »6 preverjenih virov« in jih pokažemo pet. */
  const koliko = VIRI_STEVILO[idStoritve];
  return koliko ? { ...o, virov: koliko } : o;
}

/** Stopnja zaupanja v besedi — za prikaz ob razponu. */
export function zaupanje(o: TrzniOkvir, jeEn = false): string {
  const m: Record<Kakovost, [string, string]> = {
    A: ['visoka — trije ali več primerljivih cenikov', 'high — three or more comparable price lists'],
    B: ['srednja — obseg je bilo treba poenotiti', 'medium — scope had to be normalised'],
    C: ['nizka — javni signal obstaja, razpona ne dovoli', 'low — a public signal exists but no honest range'],
    D: ['ni podatka — enota storitve še ni določena', 'no data — the unit of service is not defined yet'],
  };
  return m[o.kakovost][jeEn ? 1 : 0];
}

/** Ali okvir sploh nosi številko, ki jo smemo pokazati. */
export function imaRazpon(o: TrzniOkvir | null): o is TrzniOkvir & { od: number; do: number } {
  return !!o && typeof o.od === 'number' && typeof o.do === 'number' && (o.kakovost === 'A' || o.kakovost === 'B');
}

const ZNAK = { EUR: '€', USD: '$' } as const;

const ENOTE: Record<Enota, [string, string]> = {
  projekt: ['', ''],
  stran: [' / stran', ' / page'],
  m2: [' / m²', ' / m²'],
  mesec: [' / mesec', ' / month'],
  dan: [' / dan', ' / day'],
  kos: [' / kos', ' / piece'],
  minuta: [' / minuto', ' / minute'],
};

/** »3.000–7.000 €« oz. »20–30 € / stran«. */
export function zapisRazpona(o: TrzniOkvir, jeEn = false): string | null {
  if (!imaRazpon(o)) return null;
  const jezik = jeEn ? 'en-GB' : 'sl-SI';
  /* useGrouping: 'always' je nujen: slovenski CLDR štirimestnih števil ne
     ločuje (1500, a 15.000), v cenah pa je ločilo del berljivosti — »3.000 €«
     se prebere na prvi pogled, »3000 €« ne. */
  const st = (n: number) => new Intl.NumberFormat(jezik, { maximumFractionDigits: 0, useGrouping: 'always' }).format(n);
  const enota = o.enota ? ENOTE[o.enota][jeEn ? 1 : 0] : '';
  return `${st(o.od)}–${st(o.do)} ${ZNAK[o.valuta || 'EUR']}${enota}`;
}

/** »6 preverjenih virov · posodobljeno 22. 8. 2026« */
export function zapisVirov(o: TrzniOkvir, jeEn = false): string {
  const [l, m, d] = o.posodobljeno.split('-');
  const datum = jeEn
    ? new Date(`${o.posodobljeno}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    : `${Number(d)}. ${Number(m)}. ${l}`;
  if (o.vir === 'baza') {
    return jeEn ? `${o.virov} quotes in Flow · updated ${datum}` : `${o.virov} ponudb v Flowu · posodobljeno ${datum}`;
  }
  /* Slovenska sklanjatev: 1 vir, 2 vira, 3–4 viri, 5+ virov. */
  const n = o.virov;
  const beseda = n === 1 ? 'preverjen vir' : n === 2 ? 'preverjena vira' : n === 3 || n === 4 ? 'preverjeni viri' : 'preverjenih virov';
  return jeEn
    ? `${n} verified ${n === 1 ? 'source' : 'sources'} · updated ${datum}`
    : `${n} ${beseda} · posodobljeno ${datum}`;
}

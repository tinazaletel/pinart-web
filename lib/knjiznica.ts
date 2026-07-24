/**
 * Knjižnica postavk — ponavljajoči izdelki/storitve, ki jih uporabnica vstavi
 * v račun (in kasneje ponudbo), da jih ne tipka vsakič znova.
 *
 * Lasten modul, LOČEN od lib/pinartFlowStore.ts: knjižnica ni del FlowData
 * (offers/invoices/expenses/contracts/clients), zato ima svoj localStorage
 * kljuc in svoje load/save helperje. Ni cloud sinhronizacije (kot npr.
 * pri ceniki/PriceListsWorkspace, ki tudi zivi izven pinartFlowStore).
 */

export type KnjiznicaEnota = 'kos' | 'ura' | 'pavsal' | 'stran' | 'mesec';
export type KnjiznicaVrsta = 'izdelek' | 'storitev';

export type KnjiznicaPostavka = {
  id: string;
  naziv: string;
  opis?: string;
  cena: number;
  enota?: KnjiznicaEnota;
  vrsta: KnjiznicaVrsta;
  znacke?: string[];
};

const KLJUC = 'pinart-flow-knjiznica';
/* lasten dogodek: "storage" se sprozi samo v DRUGIH zavihkih, ne v tem — isti vzorec kot lib/predogled.ts */
const DOGODEK = 'pinart-flow-knjiznica-sprememba';

export function loadKnjiznica(): KnjiznicaPostavka[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = JSON.parse(localStorage.getItem(KLJUC) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch { return []; }
}

export function saveKnjiznica(items: KnjiznicaPostavka[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KLJUC, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(DOGODEK));
}

/* Prikazno ime enote v izbirniku (imenovalnik) — npr. za <select> opcije. */
export const ENOTA_IME: Record<KnjiznicaEnota, string> = {
  kos: 'Kos', ura: 'Ura', pavsal: 'Pavšal', stran: 'Stran', mesec: 'Mesec',
};

/* Pripona za prikaz "cena + enota" v seznamih (tozilnik/predlog, kot bi rekli
   naglas: "45 € / uro", "650 € / kos"). Pavsal je vedno EN znesek za cel obseg,
   zato ne dobi "/" — izpise se kot dodatna oznaka ob ceni. */
const ENOTA_PRIPONA: Record<KnjiznicaEnota, string> = {
  kos: '/ kos', ura: '/ uro', pavsal: '· pavšal', stran: '/ stran', mesec: '/ mesec',
};

/* Skupna funkcija za izpis cene z enoto — uporabljena v LibraryWorkspace
   (seznam postavk) IN v InvoiceWorkspace (izbirnik "Iz knjižnice"), da je
   zapis povsod enak: "1350 € / kos", "45 € / uro", "650 € · pavšal". */
export function formatCenaEnota(cena: number, enota?: KnjiznicaEnota): string {
  const znesek = `${cena.toLocaleString('sl-SI', { maximumFractionDigits: 2 })} €`;
  if (!enota) return znesek;
  return `${znesek} ${ENOTA_PRIPONA[enota]}`;
}

/* Demo primeri (predogled 'demo'/'zacetek'/'empty', glej lib/predogled.ts):
   pokrijejo vse enote in obe vrsti, da je videz knjižnice ob predogledu poln
   in verjeten (izmisljene, a smiselne cene slovenskega oblikovalskega studia). */
export function demoKnjiznica(): KnjiznicaPostavka[] {
  return [
    { id: 'demo-k-0', naziv: 'Celostna grafična podoba', opis: 'Logotip, barvna paleta, tipografija, osnovna pravila', cena: 1350, enota: 'pavsal', vrsta: 'storitev', znacke: ['pavšal', 'avtorske'] },
    { id: 'demo-k-1', naziv: 'Oblikovanje spletne strani', opis: 'Do 6 podstrani, responzivno', cena: 2200, enota: 'pavsal', vrsta: 'storitev', znacke: ['pavšal', 'produkcija'] },
    { id: 'demo-k-2', naziv: 'Svetovalna ura', opis: 'Konzultacija, brief, strateški pogovor', cena: 65, enota: 'ura', vrsta: 'storitev', znacke: ['po uri'] },
    { id: 'demo-k-3', naziv: 'Vizitka — tisk', opis: 'Dvostranski tisk, 300 g papir', cena: 0.35, enota: 'kos', vrsta: 'izdelek', znacke: ['tisk', 'produkcija'] },
    { id: 'demo-k-4', naziv: 'Ilustracija po naročilu', opis: 'Ena barvna ilustracija za splet ali tisk', cena: 180, enota: 'kos', vrsta: 'izdelek', znacke: ['avtorske'] },
    { id: 'demo-k-5', naziv: 'Mesečno vzdrževanje strani', opis: 'Manjše posodobitve, varnostne nadgradnje', cena: 95, enota: 'mesec', vrsta: 'storitev', znacke: ['naročnine'] },
    { id: 'demo-k-6', naziv: 'Priprava strani za tisk', opis: 'Prelom in priprava datoteke za tiskarno', cena: 25, enota: 'stran', vrsta: 'storitev', znacke: ['tisk', 'produkcija'] },
  ];
}

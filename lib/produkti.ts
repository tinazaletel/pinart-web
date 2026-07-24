/* Produkti = preprost webshop-style vnos v ceniku (materiali, tiskovine,
   izdelki s fiksno ceno/zalogo) — LOCEN od storitev (ki imajo cene po
   regiji/izkusnjah za kalkulator, glej pricingCatalog.ts + PriceListsWorkspace).

   Shramba je GLOBALNA (en seznam, ne per-cenik), ker sta sifra artikla in
   zaloga enaki ne glede na to, kateri cenovni profil (regija/izkusnje) je
   trenutno izbran — drugace bi isti produkt moral vnasati veckrat.

   Prihodnost: sync zaloge s spletno trgovino (Shopify/WooCommerce ipd.) —
   NE zdaj, zaloga je trenutno samo rocno vnesen podatek. */

export type ProduktEnota = 'kos' | 'ura' | 'pavsal' | 'stran' | 'mesec';

export type Produkt = {
  id: string;
  naziv: string;
  sifra?: string;
  opis?: string;
  cena: number;
  enota?: ProduktEnota;
  zaloga?: number;
};

const KLJUC = 'pinart-flow-produkti';

export function preberiProdukte(): Produkt[] {
  if (typeof window === 'undefined') return [];
  try {
    const shranjeno = JSON.parse(localStorage.getItem(KLJUC) || '[]');
    return Array.isArray(shranjeno) ? shranjeno : [];
  } catch {
    return [];
  }
}

export function shraniProdukte(produkti: Produkt[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KLJUC, JSON.stringify(produkti));
}

export const ENOTE_PRODUKT: { id: ProduktEnota; ime: string }[] = [
  { id: 'kos', ime: 'kos' },
  { id: 'ura', ime: 'ura' },
  { id: 'pavsal', ime: 'pavšal' },
  { id: 'stran', ime: 'stran' },
  { id: 'mesec', ime: 'mesec' },
];

const ENOTA_IME: Record<ProduktEnota, string> = Object.fromEntries(ENOTE_PRODUKT.map(e => [e.id, e.ime])) as Record<ProduktEnota, string>;

export const enotaIme = (enota?: ProduktEnota): string => ENOTA_IME[enota || 'kos'];

/* Demo primeri za predogled (glej lib/predogled.ts) — realisticne sifre/cene/
   zaloge, da stran izgleda polno tudi brez pravih uporabniskih podatkov. */
export function demoProdukti(): Produkt[] {
  return [
    { id: 'demo-1', naziv: 'Vizitke, 300g mat', sifra: 'VIZ-100', opis: 'Tisk + rezanje, obojestransko', cena: 0.32, enota: 'kos', zaloga: 850 },
    { id: 'demo-2', naziv: 'Embalaža za izdelek, srednja', sifra: 'EMB-220', opis: 'Kartonska škatla s tiskom', cena: 1.85, enota: 'kos', zaloga: 320 },
    { id: 'demo-3', naziv: 'Tisk plakata A1', sifra: 'PLK-A1', opis: 'Fotografski papir, mat lamin', cena: 14.5, enota: 'kos', zaloga: 40 },
    { id: 'demo-4', naziv: 'Roll-up baner 85×200', sifra: 'RUB-85', opis: 'Vključno s stojalom', cena: 62, enota: 'kos', zaloga: 12 },
    { id: 'demo-5', naziv: 'Svetovanje po uri', sifra: 'SVT-01', opis: 'Ad-hoc svetovanje izven paketa', cena: 55, enota: 'ura' },
  ];
}

/* CRM dnevnik stranke — kronologija odnosa (klici, sestanki, dogovori, e-pošta,
   opombe). Lahka lokalna shramba po ID-ju stranke (isti vzorec kot povezave
   stranke v ClientWorkspace: ne posegamo v pinartFlowStore.ts / cloud sync).
   Vnos je lahko neobvezno vezan na projekt (offer.id), da se pozneje pokaže
   tudi na projektu. */

export type DnevnikTip = 'klic' | 'sestanek' | 'email' | 'dogovor' | 'opomba';

export type DnevnikVnos = {
  id: string;
  clientId: string;
  projectId?: string;      // neobvezno: offer.id povezanega projekta
  tip: DnevnikTip;
  datum: string;           // YYYY-MM-DD (dan dogodka)
  besedilo: string;
  created: string;         // ISO cas vnosa (za stabilno razvrstitev znotraj istega dne)
};

export const DNEVNIK_TIPI: { tip: DnevnikTip; label: string }[] = [
  { tip: 'klic', label: 'Klic' },
  { tip: 'sestanek', label: 'Sestanek' },
  { tip: 'email', label: 'E-pošta' },
  { tip: 'dogovor', label: 'Dogovor' },
  { tip: 'opomba', label: 'Opomba' },
];

export const dnevnikTipLabel = (tip: DnevnikTip) => DNEVNIK_TIPI.find(t => t.tip === tip)?.label || 'Opomba';

const KLJUC = 'pinart-flow-dnevnik';
type Shramba = Record<string, DnevnikVnos[]>;

const preberiVse = (): Shramba => {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(KLJUC) || '{}') as Shramba; } catch { return {}; }
};

/* vrne vnose stranke, razvrščene od najnovejšega (po datumu dogodka, znotraj dne po vnosu) */
export const preberiDnevnik = (clientId: string): DnevnikVnos[] => {
  const vnosi = preberiVse()[clientId] || [];
  return vnosi.slice().sort((a, b) => (b.datum + b.created).localeCompare(a.datum + a.created));
};

export const shraniDnevnik = (clientId: string, vnosi: DnevnikVnos[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KLJUC, JSON.stringify({ ...preberiVse(), [clientId]: vnosi }));
};

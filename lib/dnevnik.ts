/* CRM dnevnik stranke — kronologija odnosa (klici, sestanki, dogovori, e-pošta,
   opombe). Lahka lokalna shramba po ID-ju stranke (isti vzorec kot povezave
   stranke v ClientWorkspace: ne posegamo v pinartFlowStore.ts / cloud sync).
   Vnos je lahko neobvezno vezan na projekt (offer.id), da se pozneje pokaže
   tudi na projektu. */

/* 'email' je izvirni tip (rocni vnos v obrazcu spodaj); 'epošta' je dodan za
   samodejne zapise iz klika na kontakt (glej zabeleziInterakcijo) — locen
   niz, da ne trkne z obstojecimi shranjenimi vnosi, isti prikazan label. */
export type DnevnikTip = 'klic' | 'sestanek' | 'email' | 'epošta' | 'dogovor' | 'opomba';

export type DnevnikVnos = {
  id: string;
  clientId: string;
  projectId?: string;      // neobvezno: offer.id povezanega projekta
  tip: DnevnikTip;
  datum: string;           // YYYY-MM-DD (dan dogodka)
  besedilo: string;
  created: string;         // ISO cas vnosa (za stabilno razvrstitev znotraj istega dne)
  /* neobvezno: id kontaktne osebe (lib/pinartFlowStore Kontakt), ce je zapis
     nastal s klikom na "pokliči"/"piši" pri kontaktu — stari zapisi ga nimajo */
  kontaktId?: string;
};

export const DNEVNIK_TIPI: { tip: DnevnikTip; label: string }[] = [
  { tip: 'klic', label: 'Klic' },
  { tip: 'sestanek', label: 'Sestanek' },
  { tip: 'email', label: 'E-pošta' },
  { tip: 'dogovor', label: 'Dogovor' },
  { tip: 'opomba', label: 'Opomba' },
];

/* polni nabor label-ov (vkljucno z 'epošta', ki ni med izbirnimi gumbi
   zgoraj — nastane samo samodejno) */
const DNEVNIK_LABELI: Record<DnevnikTip, string> = {
  klic: 'Klic',
  sestanek: 'Sestanek',
  email: 'E-pošta',
  epošta: 'E-pošta',
  dogovor: 'Dogovor',
  opomba: 'Opomba',
};

export const dnevnikTipLabel = (tip: DnevnikTip) => DNEVNIK_LABELI[tip] || 'Opomba';

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

/* Samodejni zapis v dnevnik — klice ga npr. klik na "pokliči"/"piši" pri
   kontaktu (ClientWorkspace) ali koledar (drug agent). Sama poskrbi za
   id/datum/created, prebere obstojece vnose stranke in doda novega. */
export const zabeleziInterakcijo = (strankaId: string, vnos: { tip: DnevnikTip; besedilo: string; kontaktId?: string; projektId?: string }) => {
  if (typeof window === 'undefined') return;
  const zdaj = new Date().toISOString();
  const nov: DnevnikVnos = {
    id: crypto.randomUUID(),
    clientId: strankaId,
    projectId: vnos.projektId,
    tip: vnos.tip,
    datum: zdaj.slice(0, 10),
    besedilo: vnos.besedilo,
    created: zdaj,
    kontaktId: vnos.kontaktId,
  };
  const obstojeci = preberiDnevnik(strankaId);
  const naslednji = [nov, ...obstojeci].sort((a, b) => (b.datum + b.created).localeCompare(a.datum + a.created));
  shraniDnevnik(strankaId, naslednji);
};

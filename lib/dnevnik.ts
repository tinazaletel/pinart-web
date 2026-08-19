/* CRM dnevnik stranke — kronologija odnosa (klici, sestanki, dogovori, e-pošta,
   opombe). Lahka lokalna shramba po ID-ju stranke (isti vzorec kot povezave
   stranke v ClientWorkspace: ne posegamo v pinartFlowStore.ts / cloud sync).
   Vnos je lahko neobvezno vezan na projekt (offer.id), da se pozneje pokaže
   tudi na projektu.

   Od 2026-08-20 se shramba sinhronizira z oblakom (lib/dnevnikOblak.ts, tabela
   public.crm_dnevnik). localStorage OSTAJA lokalna kopija, ki jo vmesnik bere
   sinhrono, zato ClientWorkspace ostane nespremenjen. Za sinhronizacijo sta
   dodana updatedAt (ob sporu zmaga novejsi) in deletedAt (mehko brisanje). */

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
  /* cas zadnje spremembe (ISO) — za sinhronizacijo z oblakom; stari zapisi ga
     nimajo, takrat velja created */
  updatedAt?: string;
  /* nagrobnik: izbrisan vnos se NE odstrani takoj, ampak se oznaci, da brisanje
     potuje v oblak. preberiDnevnik take zapise odfiltrira, zato tega ni treba
     upostevati nikjer v vmesniku. */
  deletedAt?: string;
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

const zapisiVse = (shramba: Shramba) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KLJUC, JSON.stringify(shramba));
    /* Javi spremembo, da jo FlowCloudBridge posle v oblak. Dogodek namesto
       neposrednega klica, ker bi uvoz lib/dnevnikOblak tu naredil krog. */
    window.dispatchEvent(new CustomEvent('pinart-dnevnik-change'));
  } catch (e) {
    console.error('Napaka pri shranjevanju dnevnika v localStorage:', e);
  }
};

/* vrne vnose stranke, razvrščene od najnovejšega (po datumu dogodka, znotraj dne po vnosu) */
export const preberiDnevnik = (clientId: string): DnevnikVnos[] => {
  const vnosi = (preberiVse()[clientId] || []).filter(v => !v.deletedAt);
  return vnosi.slice().sort((a, b) => (b.datum + b.created).localeCompare(a.datum + a.created));
};

/* vsi vnosi vseh strank VKLJUCNO z nagrobniki, kot raven seznam — samo za
   sinhronizacijo (lib/dnevnikOblak) */
export const preberiDnevnikVsi = (): DnevnikVnos[] =>
  Object.values(preberiVse()).flat().filter(Boolean);

/* zapise raven seznam nazaj v shrambo (razvrsti ga po clientId) — sinhronizacija */
export const zapisiDnevnikVsi = (vnosi: DnevnikVnos[]): void => {
  const shramba: Shramba = {};
  vnosi.forEach(v => {
    if (!v || !v.clientId) return;
    (shramba[v.clientId] ||= []).push(v);
  });
  zapisiVse(shramba);
};

/* primerjalni podpis brez casovnih zigov — da ponoven zapis nespremenjenega
   vnosa ne osvezi updatedAt in s tem po nepotrebnem ne "zmaga" nad oblakom */
const jedro = (v: DnevnikVnos): string => {
  const kopija: Record<string, unknown> = { ...v };
  delete kopija.updatedAt;
  delete kopija.deletedAt;
  return JSON.stringify(Object.keys(kopija).sort().map(k => [k, kopija[k]]));
};

/* Zapise seznam vnosov ene stranke. Vmesnik poslje SAMO zive vnose (dodajanje
   in brisanje gresta oba skozi to funkcijo), zato tu ugotovimo, kaj je izginilo,
   in namesto trdega brisanja pustimo nagrobnik. */
export const shraniDnevnik = (clientId: string, vnosi: DnevnikVnos[]) => {
  if (typeof window === 'undefined') return;
  const vse = preberiVse();
  const prej = vse[clientId] || [];
  const prejPoId = new Map(prej.map(v => [v.id, v]));
  const zdaj = new Date().toISOString();
  const ostali = new Set(vnosi.map(v => v.id));

  const zivi = vnosi.map(v => {
    const star = prejPoId.get(v.id);
    if (star && !star.deletedAt && jedro(star) === jedro(v)) return star;
    return { ...v, deletedAt: undefined, updatedAt: zdaj };
  });

  /* kar je bilo shranjeno, v novem seznamu pa ga ni vec = izbrisano */
  const nagrobniki = prej
    .filter(v => !ostali.has(v.id))
    .map(v => (v.deletedAt ? v : { ...v, deletedAt: zdaj, updatedAt: zdaj }));

  zapisiVse({ ...vse, [clientId]: [...zivi, ...nagrobniki] });
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
    updatedAt: zdaj,
  };
  const obstojeci = preberiDnevnik(strankaId);
  const naslednji = [nov, ...obstojeci].sort((a, b) => (b.datum + b.created).localeCompare(a.datum + a.created));
  shraniDnevnik(strankaId, naslednji);
};

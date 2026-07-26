/* PRAVI (ustvarljivi) projekti — locena, lahka shramba (localStorage), NI del
   FlowData/cloud sinhronizacije (glej lib/pinartFlowStore). Do zdaj so bili
   "projekti" na zavihku PROJEKTI izpeljani IZKLJUCNO iz ponudb (FlowOffer) —
   ProjectsWorkspace je vsako ponudbo prikazal kot svoj projekt. Ta datoteka
   doda pravo entiteto Projekt, ki jo je mogoce ustvariti brez predhodne
   ponudbe (onboarding "+ Nov projekt"), z zeljami stranke in cilji — ju
   ponudba/pogodba/racun ne nosita. ProjectsWorkspace jih zdruzi s projekti,
   izpeljanimi iz ponudb, v en seznam. */

export interface ProjektCilj {
  id: string;
  besedilo: string;
  metrika?: string;
  tarca?: string;
}

export type ProjektStatus = 'aktiven' | 'pavza' | 'koncan';

export interface Projekt {
  id: string;
  stevilka?: string;
  naslov: string;
  /* neobvezna povezava na FlowClient.id (lib/pinartFlowStore) — ob izboru se
     napolni tudi strankaIme, da seznam/vozlisce delujeta tudi brez ponovnega
     iskanja po imenikih strank */
  strankaId?: string;
  strankaIme?: string;
  opis?: string;
  /* prosto besedilo — brief/zelje stranke ob zacetku projekta */
  zelje?: string;
  cilji?: ProjektCilj[];
  zacetek?: string;
  rok?: string;
  status: ProjektStatus;
  created: string;
}

const STORAGE_KEY = 'pinflow_projekti';

export const preberiProjekti = (): Projekt[] => {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Napaka pri branju projektov iz localStorage:', e);
    return [];
  }
};

const shraniProjekte = (projekti: Projekt[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projekti));
  } catch (e) {
    console.error('Napaka pri shranjevanju projektov v localStorage:', e);
  }
};

/* upsert: ce projekt s tem id ze obstaja, ga zamenja; sicer ga doda na zacetek */
export const shraniProjekt = (projekt: Projekt): Projekt[] => {
  const obstojeci = preberiProjekti();
  const obstaja = obstojeci.some(p => p.id === projekt.id);
  const naslednji = obstaja ? obstojeci.map(p => (p.id === projekt.id ? projekt : p)) : [projekt, ...obstojeci];
  shraniProjekte(naslednji);
  return naslednji;
};

export const izbrisiProjekt = (id: string): Projekt[] => {
  const naslednji = preberiProjekti().filter(p => p.id !== id);
  shraniProjekte(naslednji);
  return naslednji;
};

export const najdiProjekt = (id: string): Projekt | undefined => preberiProjekti().find(p => p.id === id);

/* preprosta leto-zaporedna stevilka (npr. "2026-3") — na voljo za onboarding,
   ni obvezna (Projekt.stevilka je neobvezno polje) */
export const naslednjaStevilka = (projekti: Projekt[]): string => {
  const leto = new Date().getFullYear();
  const letosnji = projekti.filter(p => (p.stevilka || '').startsWith(`${leto}-`));
  return `${leto}-${letosnji.length + 1}`;
};

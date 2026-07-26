export type NalogaStolpec = 'todo' | 'in_progress' | 'waiting' | 'done';

export type NalogaPrioriteta = 'nizka' | 'srednja' | 'visoka';

/* En komentar na nalogi — zametek chata/niti pogovora vezanega na konkretno nalogo. */
export interface NalogaKomentar {
  id: string;
  avtorIme: string;
  besedilo: string;
  cas: string; // ISO datum/cas
}

export interface Naloga {
  id: string;
  naslov: string;
  opis?: string;
  stolpec: NalogaStolpec;
  /* prost tekstovni naziv projekta (ni loceno shranjen entiteta) — po zelji se ujema
     z imenom v TedenskaDodelitev.projektIme, da se todo naloge navezejo na sefov razpored */
  projectId?: string;
  /* povezava s stranko iz lib/pinartFlowStore (FlowClient.id) */
  clientId?: string;
  dodeljenoOseba?: string;
  /* dodeljevanje sodelavcu iz seznama (glej Sodelavec spodaj) */
  dodeljenoOsebaId?: string;
  dodeljenoOsebaIme?: string;
  rok?: string;
  created: string;
  /* povezava s stoparico Task Managerja (glej TaskManagerWorkspace) */
  ocenjeniCasUre?: number;      // predvideni cas (ure)
  porabljeniCasMinute?: number; // skupni porabljeni cas (minute)
  isTimerRunning?: boolean;     // ali stoparica trenutno tece za to nalogo
  timerStartTime?: string;      // ISO timestamp zacetka zadnjega merjenja
  prioriteta?: NalogaPrioriteta;
  komentarji?: NalogaKomentar[];
  /* prosti tagi na nalogi (npr. "funkcionalnost", "dizajn", "CRM", "zaledje", "ideja" + prosto
     besedilo) — za dogfooding: filtriranje razvojnih nalog Flow-a po vrsti dela */
  oznake?: string[];
}

/* --- Uporabniki / vloge / zgodovina (za vec-uporabniski Task Manager) --- */

export type UporabniskaVloga = 'admin' | 'vodja' | 'clan';

export interface Sodelavec {
  id: string;
  ime: string;
  email: string;
  vloga: UporabniskaVloga;
  aktiven: boolean;
  /* neobvezna povezava na Oddelek.id (lib/oddelki) — v kateri oddelek spada oseba */
  oddelekId?: string;
}

export interface ZgodovinaAktivnosti {
  id: string;
  nalogaId: string;
  uporabnik: string;
  opis: string;
  datum: string; // ISO datum
}

export const ZACETNI_SODELAVCI: Sodelavec[] = [
  { id: 'sod_1', ime: 'Matej Novak', email: 'matej.novak@domena.si', vloga: 'clan', aktiven: true },
  { id: 'sod_2', ime: 'Maja Zupan', email: 'maja.zupan@domena.si', vloga: 'vodja', aktiven: true },
  { id: 'sod_3', ime: 'Admin Uporabnik', email: 'admin@domena.si', vloga: 'admin', aktiven: true },
];

const STORAGE_KEY = 'pinflow_naloge_data';
const ZGODOVINA_KEY = 'pinflow_naloge_zgodovina';

/* Prebere zgodovino aktivnosti (ustvarjanje/premik/brisanje nalog) iz localStorage. */
export const preberiZgodovino = (): ZgodovinaAktivnosti[] => {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(ZGODOVINA_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Napaka pri branju zgodovine iz localStorage:', e);
    return [];
  }
};

const shraniZgodovino = (zgodovina: ZgodovinaAktivnosti[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ZGODOVINA_KEY, JSON.stringify(zgodovina));
  } catch (e) {
    console.error('Napaka pri shranjevanju zgodovine v localStorage:', e);
  }
};

/* Doda nov vnos v zgodovino aktivnosti (npr. "ustvaril nalogo", "premaknil v V teku" ...). */
export const zabeleziAktivnost = (nalogaId: string, uporabnik: string, opis: string): void => {
  const nov: ZgodovinaAktivnosti = {
    id: 'zgod_' + Date.now(),
    nalogaId,
    uporabnik,
    opis,
    datum: new Date().toISOString(),
  };
  shraniZgodovino([...preberiZgodovino(), nov]);
};

export const preberiNaloge = (): Naloga[] => {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Napaka pri branju nalog iz localStorage:', e);
    return [];
  }
};

export const shraniNaloge = (naloge: Naloga[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(naloge));
  } catch (e) {
    console.error('Napaka pri shranjevanju nalog v localStorage:', e);
  }
};

/* --- Tedenski plan / "sefov razpored dodelitev" ---
   Vodja/admin dodeli OSEBO na PROJEKT + PODROCJE za dolocen teden (grobo, tedensko);
   delavec si pod tem sam vodi svoje TODO naloge (Naloga zgoraj). Locena entiteta od
   Naloga, ker gre za tedenski "kdo dela kaj" pregled, ne za posamezno opravilo. */

export type DodelitevStatus = 'nacrtovano' | 'opravljeno' | 'delno' | 'preneseno';

export interface TedenskaDodelitev {
  id: string;
  osebaId: string;
  osebaIme: string;
  /* neobvezna povezava na stranko iz lib/pinartFlowStore (FlowClient.id) */
  projektId?: string;
  projektIme: string;
  podrocje?: string;
  /* neobvezna povezava na Oddelek.id (lib/oddelki) — kateri oddelek dela to dodelitev;
     privzeto oseba.oddelekId, a se lahko override-a (isti clovek dela za vec oddelkov) */
  oddelekId?: string;
  tedenZacetek: string; // YYYY-MM-DD, zacetek obdobja (tedna/meseca/kvartala), na katerega se dodelitev nanasa
  opomba?: string;
  /* ritual "napovem -> pregledam": kaj bo oseba ta teden delala + status ob pregledu */
  nacrt?: string;
  status?: DodelitevStatus;
}

const DODELITVE_KEY = 'pinflow_tedenske_dodelitve';

export const preberiDodelitve = (): TedenskaDodelitev[] => {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(DODELITVE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Napaka pri branju tedenskih dodelitev iz localStorage:', e);
    return [];
  }
};

const shraniDodelitveSeznam = (seznam: TedenskaDodelitev[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DODELITVE_KEY, JSON.stringify(seznam));
  } catch (e) {
    console.error('Napaka pri shranjevanju tedenskih dodelitev v localStorage:', e);
  }
};

/* Doda novo ali (po ujemanju id) posodobi obstojeco tedensko dodelitev. */
export const shraniDodelitev = (dodelitev: TedenskaDodelitev): void => {
  const obstojece = preberiDodelitve();
  const obstaja = obstojece.some((d) => d.id === dodelitev.id);
  shraniDodelitveSeznam(obstaja ? obstojece.map((d) => (d.id === dodelitev.id ? dodelitev : d)) : [...obstojece, dodelitev]);
};

export const izbrisiDodelitev = (id: string): void => {
  shraniDodelitveSeznam(preberiDodelitve().filter((d) => d.id !== id));
};

/* Dolzina cikla v tednih (1-4) za tedenski plan — privzeto 1 (klasicen teden). */
const CIKEL_KEY = 'pinflow_cikel_tednov';

export const preberiCikelTednov = (): number => {
  if (typeof window === 'undefined') return 1;
  try {
    const raw = parseInt(localStorage.getItem(CIKEL_KEY) || '1', 10);
    return Number.isFinite(raw) && raw >= 1 && raw <= 4 ? raw : 1;
  } catch {
    return 1;
  }
};

export const shraniCikelTednov = (tedni: number): void => {
  if (typeof window === 'undefined') return;
  const varno = Math.min(4, Math.max(1, Math.round(tedni) || 1));
  try {
    localStorage.setItem(CIKEL_KEY, String(varno));
  } catch {
    /* zaseben nacin brskanja — tiho ignoriraj */
  }
};

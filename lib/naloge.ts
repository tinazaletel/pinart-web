export type NalogaStolpec = 'todo' | 'in_progress' | 'waiting' | 'done';

export interface Naloga {
  id: string;
  naslov: string;
  opis?: string;
  stolpec: NalogaStolpec;
  projectId?: string;
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
}

/* --- Uporabniki / vloge / zgodovina (za vec-uporabniski Task Manager) --- */

export type UporabniskaVloga = 'admin' | 'vodja' | 'clan';

export interface Sodelavec {
  id: string;
  ime: string;
  email: string;
  vloga: UporabniskaVloga;
  aktiven: boolean;
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

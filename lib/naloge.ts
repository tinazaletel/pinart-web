export type NalogaStolpec = 'todo' | 'in_progress' | 'waiting' | 'done';

export interface Naloga {
  id: string;
  naslov: string;
  opis?: string;
  stolpec: NalogaStolpec;
  projectId?: string;
  clientId?: string;
  dodeljenoOseba?: string;
  rok?: string;
  created: string;
  /* povezava s stoparico Task Managerja (glej TaskManagerWorkspace) */
  ocenjeniCasUre?: number;      // predvideni cas (ure)
  porabljeniCasMinute?: number; // skupni porabljeni cas (minute)
  isTimerRunning?: boolean;     // ali stoparica trenutno tece za to nalogo
  timerStartTime?: string;      // ISO timestamp zacetka zadnjega merjenja
}

const STORAGE_KEY = 'pinflow_naloge_data';

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

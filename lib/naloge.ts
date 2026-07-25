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

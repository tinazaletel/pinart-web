/* Sestanki in klici — lokalna shramba dogodkov koledarja (localStorage), isti
   vzorec kot lib/naloge.ts. Ločeno od rokov (računi/naloge), ki jih koledar
   že prikazuje — to so DEJANSKI dogovorjeni termini (sestanek pri stranki,
   telefonski klic ...), ne zapadlosti. */

export type SestanekTip = 'sestanek' | 'klic';

export interface Sestanek {
  id: string;
  tip: SestanekTip;
  naslov: string;
  datum: string; // YYYY-MM-DD
  ura: string;   // HH:MM
  trajanjeMin?: number;
  strankaId?: string;
  kontaktId?: string;
  lokacija?: string;
  videoUrl?: string;
  opomba?: string;
}

const STORAGE_KEY = 'pinflow_sestanki';

export const preberiSestanki = (): Sestanek[] => {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Napaka pri branju sestankov iz localStorage:', e);
    return [];
  }
};

const zapisi = (sestanki: Sestanek[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sestanki));
  } catch (e) {
    console.error('Napaka pri shranjevanju sestankov v localStorage:', e);
  }
};

/* Doda nov sestanek/klic ali posodobi obstoječega (ujemanje po id). */
export const shraniSestanek = (s: Sestanek): void => {
  const vsi = preberiSestanki();
  const obstaja = vsi.some((item) => item.id === s.id);
  const naslednji = obstaja ? vsi.map((item) => (item.id === s.id ? s : item)) : [...vsi, s];
  zapisi(naslednji);
};

export const izbrisiSestanek = (id: string): void => {
  zapisi(preberiSestanki().filter((item) => item.id !== id));
};

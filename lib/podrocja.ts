/* Področja dela = lastne oznake (tagi) ekipe za razpored dodelitev.
   Vsak studio ima svoja: dizajn = desktop/mobile/CGP; video studio =
   snemanje/montaža/zvok. Zato jih uporabnik določi sam, nič trdo zakodiranega. */

import { oznaciKatalogSpremenjen } from '@/lib/katalogCas';

export interface Podrocje {
  id: string;
  ime: string;
}

const KEY = 'pinflow_podrocja';

export const preberiPodrocja = (): Podrocje[] => {
  if (typeof window === 'undefined') return [];
  try {
    const d = localStorage.getItem(KEY);
    return d ? JSON.parse(d) : [];
  } catch (e) {
    console.error('Napaka pri branju področij iz localStorage:', e);
    return [];
  }
};

/* Ob zapisu se zabeleži čas zadnje spremembe in javi dogodek
   'pinart-katalogi-change' — brez časa se ob sinhronizaciji (lib/katalogiOblak)
   ne da ugotoviti, katera stran je novejša. */
export const shraniPodrocja = (list: Podrocje[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch (e) {
    console.error('Napaka pri shranjevanju področij v localStorage:', e);
  }
  oznaciKatalogSpremenjen('podrocja');
};

/* Doda novo področje (brez podvajanja, neobčutljivo na velike črke) in vrne nov seznam. */
export const dodajPodrocje = (ime: string): Podrocje[] => {
  const t = ime.trim();
  const obst = preberiPodrocja();
  if (!t || obst.some((p) => p.ime.toLowerCase() === t.toLowerCase())) return obst;
  const nov = [...obst, { id: 'pod_' + Date.now(), ime: t }];
  shraniPodrocja(nov);
  return nov;
};

/* Izbriše področje po id in vrne nov seznam. */
export const izbrisiPodrocje = (id: string): Podrocje[] => {
  const nov = preberiPodrocja().filter((p) => p.id !== id);
  shraniPodrocja(nov);
  return nov;
};

/* Oddelki (studio departments) — lastna organizacijska struktura ekipe za pogled
   Plan (prej Tedenski plan). Vsak studio ima svoje oddelke (npr. Dizajn / Video /
   Produkcija) z neobveznim šefom (Sodelavec.id). Persist v localStorage, isti
   vzorec kot lib/podrocja.ts — nič trdo zakodiranega, uporabnik doda sam. */

export interface Oddelek {
  id: string;
  ime: string;
  sefId?: string; // Sodelavec.id
}

const KEY = 'pinflow_oddelki';

export const preberiOddelki = (): Oddelek[] => {
  if (typeof window === 'undefined') return [];
  try {
    const d = localStorage.getItem(KEY);
    return d ? JSON.parse(d) : [];
  } catch (e) {
    console.error('Napaka pri branju oddelkov iz localStorage:', e);
    return [];
  }
};

export const shraniOddelki = (list: Oddelek[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch (e) {
    console.error('Napaka pri shranjevanju oddelkov v localStorage:', e);
  }
};

/* Doda nov oddelek (brez podvajanja, neobčutljivo na velike črke) in vrne nov seznam. */
export const dodajOddelek = (ime: string): Oddelek[] => {
  const t = ime.trim();
  const obst = preberiOddelki();
  if (!t || obst.some((o) => o.ime.toLowerCase() === t.toLowerCase())) return obst;
  const nov = [...obst, { id: 'odd_' + Date.now(), ime: t }];
  shraniOddelki(nov);
  return nov;
};

/* Izbriše oddelek po id in vrne nov seznam. */
export const izbrisiOddelek = (id: string): Oddelek[] => {
  const nov = preberiOddelki().filter((o) => o.id !== id);
  shraniOddelki(nov);
  return nov;
};

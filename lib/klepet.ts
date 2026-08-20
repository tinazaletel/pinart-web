/* Interni klepet, vezan na projekt — za sodelovanje (»Deli v klepet«). Lahka
   lokalna shramba (localStorage), ločena od pošte (postaDnevnik) in CRM dnevnika.
   En ključ hrani vsa sporočila; branje po projektu filtrira in razvrsti od
   najstarejšega (kot v klepetu). Prava dvosmerna izmenjava med sodelavci v živo
   pride z računi sodelavcev (zaprta beta) + oblačno sinhronizacijo pozneje —
   zdaj deluje kot resničen zapis znotraj tvojega računa. */

export type KlepetSporocilo = {
  id: string;
  projectId: string;
  nit?: string;         // nit = kombinacija izbranih sodelavcev (nitId); prazno = stara/splošna
  avtor: string;        // 'jaz' = uporabnik; sicer ime/oznaka sodelavca
  besedilo: string;
  datum: string;        // ISO
  odMaila?: string;     // neobvezno: zadeva maila, iz katerega je bilo deljeno
  izsek?: string;       // neobvezno: označen del maila (deljen v klepet)
  updatedAt?: string;
  deletedAt?: string;
};

/* Nit = deterministična oznaka pogovora iz izbranih sodelavcev (skupinski klepet). */
export const nitId = (sodelavecIds: string[]): string =>
  [...sodelavecIds].filter(Boolean).sort().join('|');

const KLJUC = 'pinart-klepet';

export const preberiKlepetVsi = (): KlepetSporocilo[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = JSON.parse(localStorage.getItem(KLJUC) || '[]');
    return Array.isArray(raw) ? (raw as KlepetSporocilo[]) : [];
  } catch {
    return [];
  }
};

export const zapisiKlepetVsi = (v: KlepetSporocilo[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KLJUC, JSON.stringify(v));
  window.dispatchEvent(new Event('pinart-klepet-local-change'));
};

/* sporočila ene niti (projekt + izbrani sodelavci), najstarejše prvo */
export const preberiKlepet = (projectId: string, nit = ''): KlepetSporocilo[] =>
  preberiKlepetVsi()
    .filter(m => !m.deletedAt && m.projectId === projectId && (m.nit || '') === nit)
    .sort((a, b) => a.datum.localeCompare(b.datum));

/* doda sporočilo in vrne posodobljen seznam projekta */
export const dodajKlepet = (
  vnos: Omit<KlepetSporocilo, 'id' | 'datum'> & { id?: string; datum?: string },
): KlepetSporocilo[] => {
  const nov: KlepetSporocilo = {
    ...vnos,
    id: vnos.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Math.round(performance.now() * 1000))),
    datum: vnos.datum || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  zapisiKlepetVsi([...preberiKlepetVsi(), nov]);
  return preberiKlepet(nov.projectId);
};

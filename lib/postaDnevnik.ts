/* Dnevnik poslane (in prejete) pošte, vezane na projekt — TEMELJ za "pošto pod
   projektom". Lahka lokalna shramba (localStorage), ločena od CRM dnevnika
   (lib/dnevnik.ts) in od Flow podatkov (lib/pinartFlowStore). Vnos je lahko
   neobvezno vezan na projekt (offer.id) in/ali na stranko (clientId), tako da
   se pozneje pokaže na strani projekta (ProjectsWorkspace) ali stranke.

   En sam ključ hrani celoten seznam zapisov; branje po projektu filtrira in
   razvrsti od najnovejšega. Zapis nastane, ko pošiljanje uspe (glej
   PosljiBlok) — druge klicatelje (pogodbe/računi/kalkulator) poveže kdo drug. */

export type PostaSmer = 'poslano' | 'prejeto';

export type PostaVnos = {
  id: string;
  projectId?: string;      // neobvezno: offer.id povezanega projekta
  clientId?: string;       // neobvezno: id stranke
  smer: PostaSmer;
  prejemniki: string[];    // naslovi, na katere je bilo poslano
  zadeva: string;
  povzetek?: string;
  datum: string;           // ISO cas zapisa
  telo?: string;           // neobvezno: celo besedilo sporocila (HTML ali plain) — za branje
  osnutek?: boolean;       // neobvezno: je osnutek (Osnutki)
  izbrisano?: string;      // neobvezno: ISO cas izbrisa (Kos)
  zvezda?: boolean;        // neobvezno: oznaceno z zvezdico (pomembno)
  oznake?: string[];       // neobvezno: labele/oznake na sporocilu
  prebrano?: boolean;      // neobvezno: je bilo prebrano (za stevec neprebranih na Komunikaciji)
};

const KLJUC = 'pinart-posta-dnevnik';

const preberiVse = (): PostaVnos[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = JSON.parse(localStorage.getItem(KLJUC) || '[]');
    return Array.isArray(raw) ? (raw as PostaVnos[]) : [];
  } catch {
    return [];
  }
};

const shraniVse = (vnosi: PostaVnos[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KLJUC, JSON.stringify(vnosi));
};

/* vsi zapisi, najnovejši prvi */
export const preberiVsePoste = (): PostaVnos[] =>
  preberiVse().slice().sort((a, b) => b.datum.localeCompare(a.datum));

/* zapisi enega projekta, najnovejši prvi */
export const preberiPostoProjekta = (projectId: string): PostaVnos[] =>
  preberiVse()
    .filter(v => v.projectId === projectId)
    .sort((a, b) => b.datum.localeCompare(a.datum));

/* Doda zapis in ga shrani. Sam poskrbi za id in datum, če nista podana. */
export const dodajPosto = (
  vnos: Omit<PostaVnos, 'id' | 'datum'> & { id?: string; datum?: string },
): PostaVnos => {
  const nov: PostaVnos = {
    ...vnos,
    id: vnos.id || crypto.randomUUID(),
    datum: vnos.datum || new Date().toISOString(),
  };
  shraniVse([nov, ...preberiVse()]);
  return nov;
};

/* Premakne zapis na drug projekt (npr. napacno polinkan mail). */
export const premakniPosto = (id: string, novProjectId: string): void => {
  shraniVse(preberiVse().map(v => (v.id === id ? { ...v, projectId: novProjectId } : v)));
};

/* Nastavi oznake (labele) zapisa. */
export const nastaviOznakePoste = (id: string, oznake: string[]): void => {
  shraniVse(preberiVse().map(v => (v.id === id ? { ...v, oznake } : v)));
};

/* Oznaci zapis kot prebran (klic ob odpiranju sporocila). */
export const oznaciPostoPrebrano = (id: string): void => {
  const vsi = preberiVse();
  if (!vsi.some(v => v.id === id && !v.prebrano)) return; // ni spremembe
  shraniVse(vsi.map(v => (v.id === id ? { ...v, prebrano: true } : v)));
};

/* Stevilo neprebranih prejetih sporocil (za znacko na Komunikaciji). */
export const stejNeprebranePoste = (): number =>
  preberiVse().filter(v => v.smer === 'prejeto' && !v.izbrisano && !v.osnutek && !v.prebrano).length;

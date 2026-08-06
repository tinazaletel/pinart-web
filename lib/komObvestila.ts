/* komObvestila — skupni vir za znacko obvestil na postavki »Komunikacija«.
   Dve vrednosti:
     - poste   = stevilo NEPREBRANIH prejetih mailov (lokalni dnevnik) -> stevilcna znacka
     - klepeti = stevilo niti z NOVIM sporocilom od drugega (oblak) -> zelena pika (»v zivo«)
   »Videno« stanje klepeta hranimo lokalno (per-thread ISO cas), dokler nimamo
   per-user read stanja v bazi. Ob odprtju niti se cas posodobi. */

import { stejNeprebranePoste } from './postaDnevnik';
import { zadnjaTujaSporocila } from './klepetCloud';

const VIDENO_KEY = 'pinart-klepet-videno';
export const KOM_DOGODEK = 'kom-obvestila';

export function preberiVideno(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const r = JSON.parse(localStorage.getItem(VIDENO_KEY) || '{}');
    return r && typeof r === 'object' ? (r as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function shraniVideno(m: Record<string, string>) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(VIDENO_KEY, JSON.stringify(m)); } catch { /* poln localStorage */ }
}

/* Oznaci nit kot videno do casa (privzeto zdaj). Sprozi osvezitev znacke. */
export function oznaciNitVideno(threadId: string, cas?: string) {
  if (!threadId) return;
  const m = preberiVideno();
  m[threadId] = cas || new Date().toISOString();
  shraniVideno(m);
  javiSpremembo();
}

/* Sporoci vsem posluhom (sidebar), naj osvezijo znacko. */
export function javiSpremembo() {
  if (typeof window === 'undefined') return;
  try { window.dispatchEvent(new Event(KOM_DOGODEK)); } catch { /* SSR */ }
}

export type KomObvestila = { poste: number; klepeti: number };

/* Prebere trenutno stanje znacke (maili lokalno, klepeti iz oblaka). */
export async function preberiObvestila(): Promise<KomObvestila> {
  const poste = stejNeprebranePoste();
  let klepeti = 0;
  try {
    const zadnja = await zadnjaTujaSporocila();
    const videno = preberiVideno();
    for (const [tid, cas] of Object.entries(zadnja)) {
      if (!videno[tid] || cas > videno[tid]) klepeti++;
    }
  } catch { /* nisem prijavljen / ni oblaka */ }
  return { poste, klepeti };
}

/* OSNUTEK SPOROCILA MED STRANEMA.
 *
 * Korak marketinskega zaporedja zna odpreti pisanje v Komunikaciji z ze
 * vpisanim naslovnikom, zadevo in besedilom. Ker sta to dve strani, gre
 * osnutek skozi localStorage: Marketing ga zapise in preusmeri, Komunikacija
 * ga ob nalozitvi prebere in TAKOJ pobrise, da se ne odpre drugic
 * (Tina, 31. 8. 2026).
 */

const KLJUC = 'pinart-flow-kom-osnutek';

export type KomOsnutek = { za?: string; zadeva?: string; telo?: string; projekt?: string };

export function shraniOsnutek(o: KomOsnutek) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(KLJUC, JSON.stringify(o)); } catch { /* zaseben nacin */ }
}

/** Vrne osnutek in ga pobrise; drugic vrne null. */
export function prevzemiOsnutek(): KomOsnutek | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = window.localStorage.getItem(KLJUC);
    if (!v) return null;
    window.localStorage.removeItem(KLJUC);
    const o = JSON.parse(v);
    return o && typeof o === 'object' ? o as KomOsnutek : null;
  } catch { return null; }
}

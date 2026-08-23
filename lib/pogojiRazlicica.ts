/* Različica pogojev poslovanja in politike zasebnosti.
 *
 * Potrditev brez različice ne dokaže ničesar — ne vemo, KAJ je uporabnik
 * potrdil. Zato razlicico zapišemo skupaj s časom potrditve.
 *
 * Ob vsaki VSEBINSKI spremembi pogojev ali politike povečaj datum spodaj.
 * Uporabniki, ki so potrdili starejšo različico, bodo ob prvem pomembnem
 * dejanju (izvoz, pošiljanje, shranjevanje) znova pozvani k potrditvi.
 */
export const POGOJI_RAZLICICA = '2026-08-23';

const KLJUC = 'pinart-kalk-pogoji-potrditev';

/** nacin: 'vstop' = klik na vstopni gumb pod obvestilom (lahek sprejem);
 *  'polno' = uporabnik je pogoje prelistal do konca in obkljukal potrditev. */
export type PogojiNacin = 'vstop' | 'polno';

export type PogojiPotrditev = {
  razlicica: string;
  ko: string; // ISO
  nacin: PogojiNacin;
};

export function preberiPotrditevPogojev(): PogojiPotrditev | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(KLJUC);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<PogojiPotrditev>;
    if (!p || typeof p.razlicica !== 'string' || typeof p.ko !== 'string') return null;
    const nacin: PogojiNacin = p.nacin === 'polno' ? 'polno' : 'vstop';
    return { razlicica: p.razlicica, ko: p.ko, nacin };
  } catch { return null; }
}

/** Zapiše potrditev. Zapis nacina 'vstop' NE povozi obstoječega 'polno'
 *  za isto različico — polna potrditev je močnejša in ostane. */
export function zapisiPotrditevPogojev(nacin: PogojiNacin, kdaj: Date): PogojiPotrditev {
  const zapis: PogojiPotrditev = { razlicica: POGOJI_RAZLICICA, ko: kdaj.toISOString(), nacin };
  const prej = preberiPotrditevPogojev();
  if (nacin === 'vstop' && prej && prej.nacin === 'polno' && prej.razlicica === POGOJI_RAZLICICA) return prej;
  try { window.localStorage.setItem(KLJUC, JSON.stringify(zapis)); } catch { /* zasebni način */ }
  return zapis;
}

/** Je uporabnik pogoje AKTUALNE različice prelistal in potrdil? */
export function jePolnaPotrditev(potrditev: PogojiPotrditev | null): boolean {
  return !!potrditev && potrditev.nacin === 'polno' && potrditev.razlicica === POGOJI_RAZLICICA;
}

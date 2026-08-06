/* Stanje Pupe (AI pomočnice) — opcijska, z izrecno privolitvijo.
   - 'privolitev'  = uporabnik še ni privolil (prvič): Pupa ne pošlje ničesar,
     dokler ne klikne »Vklopi Pupo«.
   - 'vklopljena'  = privolil in vklopljena.
   - 'izklopljena' = izklopljena (v Nastavitvah ali ob zavrnitvi) — brez gumba.
   Hranjeno lokalno (per naprava); Nastavitve in Pupa se sinhronizirajo prek
   dogodka 'pupa:stanje'. */

export type PupaStanje = 'privolitev' | 'vklopljena' | 'izklopljena';

const KLJUC = 'pinart-pupa-stanje';
export const PUPA_STANJE_DOGODEK = 'pupa:stanje';

export function preberiPupaStanje(): PupaStanje {
  if (typeof window === 'undefined') return 'privolitev';
  try {
    const v = localStorage.getItem(KLJUC);
    return v === 'vklopljena' || v === 'izklopljena' ? v : 'privolitev';
  } catch {
    return 'privolitev';
  }
}

export function nastaviPupaStanje(s: PupaStanje): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(KLJUC, s); } catch { /* poln localStorage */ }
  try { window.dispatchEvent(new Event(PUPA_STANJE_DOGODEK)); } catch { /* SSR */ }
}

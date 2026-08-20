/* Stanje Pupe (AI pomočnice) — opcijska, z izrecno privolitvijo.
   - 'privolitev'  = uporabnik še ni privolil (prvič): Pupa ne pošlje ničesar,
     dokler ne klikne »Vklopi Pupo«.
   - 'vklopljena'  = privolil in vklopljena.
   - 'izklopljena' = izklopljena (v Nastavitvah ali ob zavrnitvi) — brez gumba.
   Hranjeno lokalno (per naprava); Nastavitve in Pupa se sinhronizirajo prek
   dogodka 'pupa:stanje'. */

export type PupaStanje = 'privolitev' | 'vklopljena' | 'izklopljena';

const KLJUC = 'pinart-pupa-stanje';
const CAS_KLJUC = 'pinart-pupa-stanje-updated';
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
  try {
    localStorage.setItem(KLJUC, s);
    localStorage.setItem(CAS_KLJUC, new Date().toISOString());
  } catch { /* poln localStorage */ }
  try { window.dispatchEvent(new Event(PUPA_STANJE_DOGODEK)); } catch { /* SSR */ }
}

export type PupaStanjeZapis = { id: 'stanje'; stanje: PupaStanje; updatedAt: string; deletedAt?: string };
export function preberiPupaStanjeZapis(): PupaStanjeZapis {
  if (typeof window === 'undefined') return { id: 'stanje', stanje: 'privolitev', updatedAt: new Date(0).toISOString() };
  return { id: 'stanje', stanje: preberiPupaStanje(), updatedAt: localStorage.getItem(CAS_KLJUC) || new Date(0).toISOString() };
}
export function zapisiPupaStanjeZapis(zapis: PupaStanjeZapis): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KLJUC, zapis.stanje);
  localStorage.setItem(CAS_KLJUC, zapis.updatedAt);
  window.dispatchEvent(new Event(PUPA_STANJE_DOGODEK));
}

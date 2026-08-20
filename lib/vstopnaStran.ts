/* KAM PO PRIJAVI — Pupa ali Domov.
 *
 * Kdor Pupe ne uporablja, hoče pregled; kdor se s Pupo pogovarja, hoče njo.
 * Doslej je prijava vedno odložila na Domov (/kalkulator/pregled).
 *
 * Nastavitev je namenoma vezana na NAPRAVO, ne na račun: na telefonu je
 * pogovor pogosto bolj uporaben kot tabela, na računalniku obratno. Zato živi
 * v localStorage in se ne sinhronizira.
 *
 * Prijava (oba načina, geslo in Google) gre skozi AuthForm, zato je dovolj,
 * da izbiro upoštevamo tam — strežniški callback dobi pot kot ?next=.
 */

export type VstopnaStran = 'pupa' | 'domov';

const KLJUC = 'pinart-vstopna-stran';

export function preberiVstopnoStran(): VstopnaStran {
  if (typeof window === 'undefined') return 'domov';
  try {
    return localStorage.getItem(KLJUC) === 'pupa' ? 'pupa' : 'domov';
  } catch {
    return 'domov';
  }
}

export function zapisiVstopnoStran(v: VstopnaStran): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KLJUC, v);
  } catch { /* zasebno okno */ }
}

/** Pot, na katero naj prijava odloži uporabnika. */
export function potVstopneStrani(base: string, v: VstopnaStran = preberiVstopnoStran()): string {
  return v === 'pupa' ? `${base}/kalkulator/dom` : `${base}/kalkulator/pregled`;
}

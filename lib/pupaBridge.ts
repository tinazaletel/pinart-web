/* Most med orodji in globalno Puppo. Katerakoli stran (npr. kalkulator ponudbe)
   lahko OBJAVI trenutni kontekst + nasvete, globalna Pupa (components/Pupa.tsx,
   priklopljena v layoutu) pa jih prebere. Brez React contexta, da deluje ne
   glede na drevo strani. Uporablja window CustomEvent, hrani zadnje stanje. */

import type { Nasvet } from '@/lib/copilot';

export type PupaKontekst = { nasveti: Nasvet[]; kontekst: string; naslov?: string };

let zadnji: PupaKontekst = { nasveti: [], kontekst: '', naslov: '' };

/* Orodje objavi svoj kontekst (nasvete + povzetek). Prazno = generična Pupa. */
export function objaviPupaKontekst(k: PupaKontekst) {
  zadnji = k;
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('pupa:kontekst'));
}

/* Počisti kontekst (npr. ob odhodu z orodja). */
export function pocistiPupaKontekst() {
  objaviPupaKontekst({ nasveti: [], kontekst: '', naslov: '' });
}

export function preberiPupaKontekst(): PupaKontekst {
  return zadnji;
}

/* Odpri Puppo od kjerkoli (npr. gumb v orodni vrstici). */
export function odpriPupo() {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('pupa:odpri'));
}

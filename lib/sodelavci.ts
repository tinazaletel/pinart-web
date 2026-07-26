/* Sodelavci / ekipa — persistentna lokalna shramba (za razdelek »Sodelavci« v
   Nastavitvah in za Task Manager). Tip Sodelavec/vloga je definiran v lib/naloge.ts
   (kjer se prvič uporabi); tu dodamo shranjevanje + privzeti seznam ob prvem zagonu.
   OPOMBA: to je LOKALNI mock — pravo zaklepanje dostopa pride z več-uporabniškim
   zaledjem/prijavo (kot mail/Resend). */

import type { Sodelavec } from '@/lib/naloge';
import { ZACETNI_SODELAVCI } from '@/lib/naloge';

const KLJUC = 'pinflow_sodelavci';

export const preberiSodelavci = (): Sodelavec[] => {
  if (typeof window === 'undefined') return ZACETNI_SODELAVCI;
  try {
    const raw = localStorage.getItem(KLJUC);
    if (!raw) return ZACETNI_SODELAVCI;
    const parsed = JSON.parse(raw) as Sodelavec[];
    return Array.isArray(parsed) && parsed.length ? parsed : ZACETNI_SODELAVCI;
  } catch {
    return ZACETNI_SODELAVCI;
  }
};

export const shraniSodelavci = (seznam: Sodelavec[]): void => {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(KLJUC, JSON.stringify(seznam)); } catch { /* zasebni način */ }
};

export const VLOGE: { vloga: Sodelavec['vloga']; oznaka: string; opis: string }[] = [
  { vloga: 'admin', oznaka: 'Admin', opis: 'Poln dostop — upravlja ekipo, nastavitve, vse strani.' },
  { vloga: 'vodja', oznaka: 'Vodja', opis: 'Vidi in ureja vse naloge/projekte; ne upravlja ekipe.' },
  { vloga: 'clan', oznaka: 'Član', opis: 'Vidi in ureja le naloge, dodeljene njemu.' },
];

export const vlogaOznaka = (v: Sodelavec['vloga']) => VLOGE.find(x => x.vloga === v)?.oznaka || v;

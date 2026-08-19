/* Sodelavci / ekipa — persistentna lokalna shramba (za razdelek »Sodelavci« v
   Nastavitvah in za Task Manager). Tip Sodelavec/vloga je definiran v lib/naloge.ts
   (kjer se prvič uporabi); tu dodamo shranjevanje + privzeti seznam ob prvem zagonu.
   OPOMBA: to je LOKALNI mock — pravo zaklepanje dostopa pride z več-uporabniškim
   zaledjem/prijavo (kot mail/Resend). */

import type { Sodelavec } from '@/lib/naloge';
import { ZACETNI_SODELAVCI } from '@/lib/naloge';
import { jeDemo } from '@/lib/predogled';
import { oznaciKatalogSpremenjen } from '@/lib/katalogCas';

const KLJUC = 'pinflow_sodelavci';

/* Vzorčni sodelavci (Matej Novak …) SAMO v demo predogledu — sicer bi pravi
   uporabnik videl izmišljene ljudi in mislil, da jih je nekdo dodal (slab UX).
   Pravi uporabnik začne s PRAZNO ekipo in doda svoje. */
export const preberiSodelavci = (): Sodelavec[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KLJUC);
    if (raw) {
      const parsed = JSON.parse(raw) as Sodelavec[];
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch { /* zasebni način */ }
  return jeDemo() ? ZACETNI_SODELAVCI : [];
};

/* Ob zapisu se zabeleži čas zadnje spremembe in javi dogodek
   'pinart-katalogi-change' — brez časa se ob sinhronizaciji (lib/katalogiOblak)
   ne da ugotoviti, katera stran je novejša. */
export const shraniSodelavci = (seznam: Sodelavec[]): void => {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(KLJUC, JSON.stringify(seznam)); } catch { /* zasebni način */ }
  oznaciKatalogSpremenjen('sodelavci');
};

export const VLOGE: { vloga: Sodelavec['vloga']; oznaka: string; opis: string }[] = [
  { vloga: 'admin', oznaka: 'Admin', opis: 'Poln dostop — upravlja ekipo, nastavitve, vse strani.' },
  { vloga: 'vodja', oznaka: 'Vodja', opis: 'Vidi in ureja vse naloge/projekte; ne upravlja ekipe.' },
  { vloga: 'clan', oznaka: 'Član', opis: 'Vidi in ureja le naloge, dodeljene njemu.' },
];

export const vlogaOznaka = (v: Sodelavec['vloga']) => VLOGE.find(x => x.vloga === v)?.oznaka || v;

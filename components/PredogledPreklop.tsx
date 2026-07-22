'use client';

import { usePredogled, type Predogled } from '@/lib/predogled';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';

/**
 * Preklop pogleda v zgornji vrstici — na VSAKI strani.
 *
 * Prej je bil samo na nadzorni plosci. Odkar "Prazno" vpliva tudi na uvodni
 * pogovor v kalkulatorju, se je dalo v ta nacin vstopiti in iz njega ne vec
 * ven, ne da bi sel nazaj na plosco.
 *
 * Ko nacin NI "Moji", je preklop obarvan in oznacen: pogled na izmisljene
 * podatke ne sme niti za trenutek izgledati kot pravo stanje.
 */

const MOZNOSTI: ReadonlyArray<readonly [Predogled, string]> = [
  ['empty', 'Prazno · nov uporabnik'],
  ['zacetek', 'Začetek · prvi teden'],
  ['mine', 'Moji podatki'],
  ['demo', 'Demo · polno poslovanje'],
];

export default function PredogledPreklop() {
  const [nacin, nastavi] = usePredogled();

  /* SAMO NA LOKALNEM RAZVOJU. To je orodje za preizkusanje stanj, ne funkcija
     za uporabnike: na produkciji bi nekdo gledal izmisljene stevilke in mislil,
     da so njegove. `NODE_ENV` se vgradi ob prevajanju, zato tega gumba v
     produkcijskem paketu sploh ni. */
  if (process.env.NODE_ENV === 'production') return null;

  /* Vse pobrisi in zacni znova. Prefiks 'pinart-' zajame vse kljuce aplikacije,
     da noben nov ne uide. Oblaka se NE dotakne — to bi zbrisalo prave podatke
     v Supabase. Za cist preizkus uvodnega pogovora zadostuje lokalno. */
  const resetiraj = () => {
    if (!confirm('Zbrišem vse lokalne podatke in začnem znova? (Oblak ostane.)')) return;
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith('pinart-')) localStorage.removeItem(k);
    }
    window.location.href = '/kalkulator/orodje';
  };

  return (
    <div className={styles.predogledPreklop} data-tuji={nacin !== 'mine' || undefined}>
      <select value={nacin} onChange={e => nastavi(e.target.value as Predogled)}
        aria-label="Pogled podatkov">
        {MOZNOSTI.map(([id, ime]) => <option key={id} value={id}>{ime}</option>)}
      </select>
      <button type="button" onClick={resetiraj} title="Zbriši vse lokalno in začni znova"
        aria-label="Ponastavi na novega uporabnika">↺</button>
    </div>
  );
}

'use client';

/* Majhen znak "Predogled (demo)" DESNO od naslova strani (v .topbar), prikazan
   samo kadar NI način "Moji podatki". V pravem orodju (produkcija = vedno
   "mine", predogled je dev-only) se sploh ne prikaže.

   Ker v predogledu urejanje/dodajanje ne dela (namenoma), tu ponudimo GUMB za
   preklop na "Moji podatki" z enim klikom — da uporabnik ne lovi spustnika v
   zgornji vrstici. Poleg tega povezava na prijavo. */

import Link from 'next/link';
import { usePredogled } from '@/lib/predogled';

export default function PredogledZnak({ base = '' }: { base?: string }) {
  const [nacin, nastavi] = usePredogled();
  if (nacin === 'mine') return null;
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap',
        alignSelf: 'flex-start', paddingTop: '.15rem',
        fontSize: '.78rem', color: 'oklch(52% .02 70)',
      }}
    >
      <span style={{ whiteSpace: 'nowrap' }}>Predogled (demo)</span>
      <button
        type="button"
        onClick={() => nastavi('mine')}
        title="Preklopi na svoje podatke — takrat lahko dodajaš in urejaš"
        style={{
          padding: '.28rem .7rem', border: 0, borderRadius: '999px',
          background: 'oklch(52% .17 300)', color: '#fff',
          fontSize: '.74rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
        }}
      >
        Preklopi na Moji podatki
      </button>
      <Link href={`${base}/kalkulator/prijava`} style={{ color: 'oklch(52% .17 300)', fontWeight: 600, whiteSpace: 'nowrap' }}>
        Prijavi se
      </Link>
    </span>
  );
}

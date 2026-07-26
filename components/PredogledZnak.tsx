'use client';

/* Majhen znak "Predogled (demo)" z linkom na prijavo — prikazan DESNO od naslova
   strani (v .topbar), samo kadar NI način "Moji podatki". V pravem orodju
   (produkcija = vedno "mine") se sploh ne prikaže. Redko viden, zato nevsiljiv. */

import Link from 'next/link';
import { usePredogled } from '@/lib/predogled';

export default function PredogledZnak({ base = '' }: { base?: string }) {
  const [nacin] = usePredogled();
  if (nacin === 'mine') return null;
  return (
    <span style={{ fontSize: '.78rem', color: 'oklch(52% .02 70)', whiteSpace: 'nowrap', alignSelf: 'flex-start', paddingTop: '.15rem' }}>
      Predogled (demo) ·{' '}
      <Link href={`${base}/kalkulator/prijava`} style={{ color: 'oklch(52% .17 300)', fontWeight: 600 }}>
        Prijavi se v svoj račun
      </Link>
    </span>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';

/**
 * Puščica navzgor. Vedno pomeni "eno raven visje":
 *   podstran        -> nadzorna plosca
 *   nadzorna plosca -> Flow landing
 *
 * Zato nikoli ne izgine in pomen se ne spreminja. Brez tega na telefonu z
 * nadzorne plosce ni bilo nobene vidne poti ven — izhod je bil skrit v predalu.
 *
 * Samo na telefonu: na namizju je cel meni ves cas viden in ima svoj "zapri".
 */
export default function NazajNaPregled() {
  const pathname = usePathname() || '';
  const base = pathname.startsWith('/en/') ? '/en' : '';
  const naPregledu = pathname.includes('/kalkulator/pregled');

  /* z nadzorne plosce navzgor = Flow landing (/flow), NE landing kalkulatorja
     (/kalkulator) — to sta dva razlicna izdelka. */
  const cilj = naPregledu ? `${base}/flow` : `${base}/kalkulator/pregled`;
  const opis = naPregledu ? 'Zapri Flow' : 'Nazaj na nadzorno ploščo';

  return (
    <Link className={styles.nazajGumb} href={cilj} aria-label={opis} title={opis}>
      <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 4.5 6.5 10l5.5 5.5" />
      </svg>
    </Link>
  );
}

'use client';

import { useEffect, useState, type ReactNode } from 'react';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';

/**
 * Skupina postavk v meniju.
 *
 * Na namizju je vedno odprta in izgleda kot doslej — samo naslov in pod njim
 * postavke. Na telefonu je zaprta, ker mora biti tapna tarča vsaj 44 px:
 * pri trinajstih postavkah hkrati to ne gre v en zaslon, pri štirih skupinah pa
 * z lahkoto. Skupina s trenutno stranjo se odpre sama.
 *
 * Namenoma NI <details>: v Safariju se je ta ze lomil, ko smo mu spreminjali
 * prikaz summaryja, zato raje lastno stanje.
 */
export default function MeniSkupina(
  { naslov, aktivna = false, vednoVidna = false, children }:
  { naslov: string; aktivna?: boolean; vednoVidna?: boolean; children: ReactNode },
) {
  const [siroko, setSiroko] = useState(true);
  const [odprta, setOdprta] = useState(true);

  useEffect(() => {
    const m = window.matchMedia('(min-width: 981px)');
    const uporabi = () => { setSiroko(m.matches); setOdprta(m.matches || aktivna); };
    uporabi();
    m.addEventListener('change', uporabi);
    return () => m.removeEventListener('change', uporabi);
  }, [aktivna]);

  if (siroko) {
    return <>
      <p className={styles.navGroup}>{naslov}</p>
      {children}
    </>;
  }

  /* Nekatere postavke (Nastavitve, Pomoc) ne smejo biti skrite za razpiralnikom
     — do njih mora biti en dotik. Na telefonu jih zato pokazemo neposredno. */
  if (vednoVidna) {
    return <div className={styles.meniSkupinaOdprta}>{children}</div>;
  }

  return (
    <div className={styles.meniSkupina}>
      <button type="button" className={styles.meniSkupinaGlava} aria-expanded={odprta}
        onClick={() => setOdprta(v => !v)}>
        <span>{naslov}</span>
        <span className={styles.meniSkupinaPuscica} data-odprta={odprta} aria-hidden="true">›</span>
      </button>
      {odprta && <div className={styles.meniSkupinaVsebina}>{children}</div>}
    </div>
  );
}

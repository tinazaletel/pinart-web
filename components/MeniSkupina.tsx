'use client';

import { useEffect, useState, type ReactNode } from 'react';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';

/**
 * Skupina postavk v meniju kot RAZPIRALNIK (accordion) — na vseh velikostih.
 * Aktivna skupina (s trenutno stranjo) je odprta, ostale zaprte, da meni ostane
 * kratek tudi ko raste (brez scrolla — Tinina zahteva, po vzoru Cloudflare/Vercel).
 *
 * Vsebina je VEDNO izrisana (skrije jo CSS prek data-odprta), da v icon-rail
 * načinu (body[data-meni='zaprt']) postavke ostanejo vidne kot ikone.
 *
 * Namenoma NI <details>: Safari se je z njim lomil ob spreminjanju summaryja.
 */
export default function MeniSkupina(
  { naslov, aktivna = false, vednoVidna = false, children }:
  { naslov: string; aktivna?: boolean; vednoVidna?: boolean; children: ReactNode },
) {
  const [odprta, setOdprta] = useState(aktivna);
  /* ob navigaciji: aktivna skupina se odpre, prej aktivna zapre (accordion). */
  useEffect(() => { setOdprta(aktivna); }, [aktivna]);

  /* Nekatere postavke (Pomoc) ne smejo biti za razpiralnikom — vedno vidne. */
  if (vednoVidna) {
    return <div className={styles.meniSkupinaOdprta}>{children}</div>;
  }

  return (
    <div className={styles.meniSkupina} data-odprta={odprta}>
      <button type="button" className={styles.meniSkupinaGlava} aria-expanded={odprta}
        onClick={() => setOdprta(v => !v)}>
        <span>{naslov}</span>
        <span className={styles.meniSkupinaPuscica} data-odprta={odprta} aria-hidden="true">›</span>
      </button>
      <div className={styles.meniSkupinaVsebina}>{children}</div>
    </div>
  );
}

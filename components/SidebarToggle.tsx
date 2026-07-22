'use client';

import { useEffect } from 'react';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';

/* Zlaganje stranske vrstice na namizju. Meni se zlozi DO KONCA (sirina 0), da imajo
   orodja in mehurcki ves prostor. Stanje pise v data-meni na <body>, zato lahko CSS
   modula odreagira brez prenasanja propsov skozi vse strani; shrani se v localStorage. */
const KLJUC = 'pinart-meni-zaprt';

function nastavi(zaprt: boolean) {
  if (zaprt) document.body.dataset.meni = 'zaprt';
  else delete document.body.dataset.meni;
  try { localStorage.setItem(KLJUC, zaprt ? '1' : '0'); } catch { /* zasebno okno */ }
}

export default function SidebarToggle({ vrsta }: { vrsta: 'zapri' | 'odpri' }) {
  /* Ob prvem izrisu poberi shranjeno stanje (samo enkrat, "zapri" gumb je vedno prisoten). */
  useEffect(() => {
    if (vrsta !== 'zapri') return;
    try { if (localStorage.getItem(KLJUC) === '1') document.body.dataset.meni = 'zaprt'; } catch { /* ignoriraj */ }
  }, [vrsta]);

  if (vrsta === 'odpri') {
    return (
      <button type="button" className={styles.meniOdpri} aria-label="Odpri meni" title="Odpri meni" onClick={() => nastavi(false)}>
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m8 5.5 4.5 4.5L8 14.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
    );
  }

  return (
    <button type="button" className={styles.meniZapri} aria-label="Zloži meni" title="Zloži meni" onClick={() => nastavi(true)}>
      <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m12 5.5-4.5 4.5 4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
  );
}

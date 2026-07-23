'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';

/**
 * Profil v mobilnem predalu — kot skupina menija, ne kot pojavno okno.
 *
 * Pojavno okno se je odpiralo navzdol in ga je rob zaslona odrezal, zato se
 * ni videlo, kaj je pod njim. Tu je to navadna skupina: odpre se v toku
 * predala in ne more pasti iz vidnega polja.
 */
export default function MeniProfil({ base }: { base: string }) {
  const [odprt, setOdprt] = useState(false);
  const [eposta, setEposta] = useState('');
  const [ime, setIme] = useState('');

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      const u = data.user;
      if (!u) return;
      setEposta(u.email ?? '');
      const meta = u.user_metadata as { full_name?: string; name?: string } | undefined;
      setIme((meta?.full_name || meta?.name || '').trim());
    });
  }, []);

  const odjava = async () => {
    await createClient().auth.signOut();
    window.location.href = `${base}/kalkulator/prijava`;
  };

  const zacetnica = (ime || eposta || 'T').trim().charAt(0).toUpperCase();

  return (
    <div className={styles.meniSkupina}>
      <button type="button" className={styles.meniProfilGlava} aria-expanded={odprt}
        onClick={() => setOdprt(v => !v)}>
        <span className={styles.avatar}>{zacetnica}</span>
        <span className={styles.meniProfilIme}>
          <strong>{ime || 'Tvoj studio'}</strong>
          <small>{eposta || 'Nastavitve podjetja'}</small>
        </span>
        <span className={styles.meniSkupinaPuscica} data-odprta={odprt} aria-hidden="true">›</span>
      </button>

      {odprt && <div className={styles.meniSkupinaVsebina}>
        <Link className={styles.navItem} href={`${base}/kalkulator/profil`}>
          <span className={styles.navNapis}>Moj profil</span>
        </Link>
        {/* Podatki podjetja so v "Moj profil" (/profil, sekcija "02 MOJE PODJETJE"),
            zato to NI podvojen vnos za iste podatke: "Nastavitve" vodijo na
            aplikacijske nastavitve (videz dokumentov, račun/varnost, izbris podatkov). */}
        <Link className={styles.navItem} href={`${base}/kalkulator/nastavitve`}>
          <span className={styles.navNapis}>Nastavitve</span>
        </Link>
        <Link className={styles.navItem} href={`${base}/kalkulator/pogoji`}>
          <span className={styles.navNapis}>Pogoji in zasebnost</span>
        </Link>
        <button type="button" className={`${styles.navItem} ${styles.meniOdjava}`} onClick={odjava}>
          <span className={styles.navNapis}>Odjava</span>
        </button>
      </div>}
    </div>
  );
}

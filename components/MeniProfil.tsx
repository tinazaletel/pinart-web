'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import JezikPreklop from '@/components/JezikPreklop';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';

/**
 * Profil v mobilnem predalu — kot skupina menija, ne kot pojavno okno.
 *
 * Pojavno okno se je odpiralo navzdol in ga je rob zaslona odrezal, zato se
 * ni videlo, kaj je pod njim. Tu je to navadna skupina: odpre se v toku
 * predala in ne more pasti iz vidnega polja.
 */
export default function MeniProfil({ base }: { base: string }) {
  const jeEn = base === '/en';
  const L = (sl: string, en: string) => (jeEn ? en : sl);
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
          <strong>{ime || L('Tvoj studio', 'Your studio')}</strong>
          <small>{eposta || L('Nastavitve podjetja', 'Company settings')}</small>
        </span>
        <span className={styles.meniSkupinaPuscica} data-odprta={odprt} aria-hidden="true">›</span>
      </button>

      {odprt && <div className={styles.meniSkupinaVsebina}>
        <Link className={styles.navItem} href={`${base}/kalkulator/paket`}>
          <span className={styles.navNapis}>{L('Paket', 'Plan')}</span>
        </Link>
        <Link className={styles.navItem} href={`${base}/kalkulator/profil`}>
          <span className={styles.navNapis}>{L('Moj profil', 'My profile')}</span>
        </Link>
        <Link className={styles.navItem} href={`${base}/kalkulator/racuni-davki`}>
          <span className={styles.navNapis}>{L('Računi in davki', 'Invoices & taxes')}</span>
        </Link>
        <Link className={styles.navItem} href={`${base}/kalkulator/ekipa`}>
          <span className={styles.navNapis}>{L('Ekipa in dostopi', 'Team & access')}</span>
        </Link>
        {/* Podatki podjetja so v "Moj profil" (/profil, sekcija "02 MOJE PODJETJE"),
            zato to NI podvojen vnos za iste podatke: "Nastavitve" vodijo na
            aplikacijske nastavitve (videz dokumentov in AI-orodja). */}
        <Link className={styles.navItem} href={`${base}/kalkulator/nastavitve?nazaj=1`}>
          <span className={styles.navNapis}>{L('Nastavitve', 'Settings')}</span>
        </Link>
        <Link className={styles.navItem} href={`${base}/kalkulator/pogoji`}>
          <span className={styles.navNapis}>{L('Pogoji in zasebnost', 'Terms & privacy')}</span>
        </Link>
        <JezikPreklop base={base} className={styles.navItem} napisClassName={styles.navNapis} />
        <button type="button" className={`${styles.navItem} ${styles.meniOdjava}`} onClick={odjava}>
          <span className={styles.navNapis}>{L('Odjava', 'Log out')}</span>
        </button>
      </div>}
    </div>
  );
}

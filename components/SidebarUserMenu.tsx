'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { getAccessTier, type AccessTier } from '@/lib/pinartFlowEntitlements';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';

/* Uporabniski meni na dnu stranske vrstice. Prej je bil ta cip navadna povezava na
   profil, zato je bila odjava skrita dva klika stran. Zdaj odpre majhen meni z
   e-posto prijavljenega racuna, bliznjicami in odjavo. */
export default function SidebarUserMenu({ base }: { base: string }) {
  const [odprt, setOdprt] = useState(false);
  const [eposta, setEposta] = useState('');
  const [ime, setIme] = useState('');
  const [paket, setPaket] = useState<AccessTier>('free');
  const ovoj = useRef<HTMLDivElement>(null);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      const u = data.user;
      if (!u) return;
      setEposta(u.email ?? '');
      const meta = u.user_metadata as { full_name?: string; name?: string } | undefined;
      setIme((meta?.full_name || meta?.name || '').trim());
    });
  }, []);

  useEffect(() => { void getAccessTier().then(setPaket).catch(() => undefined); }, []);

  /* Zapri ob kliku drugam in ob Escape. */
  useEffect(() => {
    if (!odprt) return;
    const klik = (e: MouseEvent) => { if (ovoj.current && !ovoj.current.contains(e.target as Node)) setOdprt(false); };
    const tipka = (e: KeyboardEvent) => { if (e.key === 'Escape') setOdprt(false); };
    document.addEventListener('mousedown', klik);
    document.addEventListener('keydown', tipka);
    return () => { document.removeEventListener('mousedown', klik); document.removeEventListener('keydown', tipka); };
  }, [odprt]);

  async function odjava() {
    await createClient().auth.signOut();
    window.location.href = `${base}/kalkulator/prijava`;
  }

  const zacetnica = (ime || eposta || 'T').trim().charAt(0).toUpperCase();

  return (
    <div className={styles.userMenuWrap} ref={ovoj}>
      <button
        type="button"
        className={styles.profile}
        aria-haspopup="menu"
        aria-expanded={odprt}
        aria-label="Odpri uporabniški meni"
        onClick={() => setOdprt(v => !v)}
      >
        <span className={styles.avatar}>{zacetnica}</span>
        <span><strong>{ime || 'Tvoj studio'}</strong><small>Nastavitve podjetja</small></span>
      </button>

      {odprt && (
        <div className={styles.userMenu} role="menu">
          {eposta && <p className={styles.userMenuMail}>{eposta}</p>}
          {/* Kateri paket imas in kje ga urejas — prej tega ni bilo videti nikjer
              razen po tem, katere postavke so zaklenjene. */}
          <Link href={`${base}/kalkulator/paket`} role="menuitem" className={styles.userMenuPaket}
            onClick={() => setOdprt(false)}>
            <span>Paket</span>
            <b data-pro={paket === 'pro'}>{paket === 'pro' ? 'Pro' : 'Brezplačno'}</b>
          </Link>
          {/* Ceniki in stroski sta ze v stranski navigaciji zgoraj — tukaj sodijo samo
              stvari o RACUNU, ne podvojena navigacija. "Paket in narocnina" ter
              "Pomoc in podpora" dodamo, ko strani obstajata (sicer mrtva povezava). */}
          <Link href={`${base}/kalkulator/profil`} role="menuitem" onClick={() => setOdprt(false)}>Moj profil</Link>
          <Link href={`${base}/kalkulator/paket`} role="menuitem" onClick={() => setOdprt(false)}>Upravljaj paket</Link>
          <Link href={`${base}/kalkulator/pogoji`} role="menuitem" onClick={() => setOdprt(false)}>Pogoji in zasebnost</Link>
          <button type="button" className={styles.userMenuOdjava} role="menuitem" onClick={odjava}>Odjava</button>
        </div>
      )}
    </div>
  );
}

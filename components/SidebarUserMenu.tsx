'use client';

import { DOGODEK_DOSTOPNOST } from '@/components/Dostopnost';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { GearSix, Package, UserCircle, UsersThree, ShieldCheck, SignOut, PersonSimple } from '@phosphor-icons/react';
import { createClient } from '@/utils/supabase/client';
import { getAccessTier, type AccessTier } from '@/lib/pinartFlowEntitlements';
import JezikPreklop from '@/components/JezikPreklop';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';

/* Uporabniski meni na dnu stranske vrstice. Prej je bil ta cip navadna povezava na
   profil, zato je bila odjava skrita dva klika stran. Zdaj odpre majhen meni z
   e-posto prijavljenega racuna, bliznjicami in odjavo. */
export default function SidebarUserMenu({ base }: { base: string }) {
  const [nastOdprte, setNastOdprte] = useState(false);

  const jeEn = base === '/en';
  const L = (sl: string, en: string) => (jeEn ? en : sl);
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
        aria-label={L('Odpri uporabniški meni', 'Open user menu')}
        onClick={() => setOdprt(v => !v)}
      >
        <span className={styles.avatar}>{zacetnica}</span>
        <span><strong>{ime || L('Tvoj studio', 'Your studio')}</strong><small>{L('Nastavitve podjetja', 'Company settings')}</small></span>
      </button>

      {odprt && (
        <div className={styles.userMenu} role="menu">
          {eposta && <p className={styles.userMenuMail}>{eposta}</p>}
          {/* Kateri paket imas in kje ga urejas — prej tega ni bilo videti nikjer
              razen po tem, katere postavke so zaklenjene. */}
          <Link href={`${base}/kalkulator/paket`} role="menuitem" className={styles.userMenuPaket}
            onClick={() => setOdprt(false)}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.45rem' }}><Package size={15} weight="bold" /> {L('Paket', 'Plan')}</span>
            <b data-pro={paket === 'pro' || paket === 'premium'}>{paket === 'pro' ? 'Pro' : paket === 'premium' ? 'Premium' : L('Brezplačno', 'Free')}</b>
          </Link>
          {/* Ceniki in stroski sta ze v stranski navigaciji zgoraj — tukaj sodijo samo
              stvari o RACUNU, ne podvojena navigacija. "Paket in narocnina" ter
              "Pomoc in podpora" dodamo, ko strani obstajata (sicer mrtva povezava). */}
          <Link href={`${base}/kalkulator/profil`} role="menuitem" onClick={() => setOdprt(false)} style={{ display: 'inline-flex', alignItems: 'center', gap: '.45rem' }}><UserCircle size={15} weight="bold" /> {L('Moj profil', 'My profile')}</Link>
          {/* Nastavitve imajo dva sklopa (Dokumenti, AI). Namesto dveh vnosov v
              meniju je en s podmenijem — meni ostane kratek, pot pa je ena klik
              krajsa kot iskanje zavihka na strani. */}
          <button type="button" role="menuitem" aria-expanded={nastOdprte}
            onClick={() => setNastOdprte(o => !o)}
            className={styles.userMenuSkupina}>
            <GearSix size={15} weight="bold" /> {L('Nastavitve', 'Settings')}
            <span aria-hidden style={{ marginLeft: 'auto', fontSize: '1.15rem', lineHeight: 1, opacity: .75, transform: nastOdprte ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}>›</span>
          </button>
          {nastOdprte && (
            <span className={styles.userMenuPod}>
              <Link href={`${base}/kalkulator/nastavitve?zavihek=dokumenti`} role="menuitem" onClick={() => setOdprt(false)}>{L('Videz dokumentov', 'Document look')}</Link>
              <Link href={`${base}/kalkulator/nastavitve?zavihek=ai`} role="menuitem" onClick={() => setOdprt(false)}>{L('AI orodja', 'AI tools')}</Link>
            </span>
          )}
          <Link href={`${base}/kalkulator/ekipa`} role="menuitem" onClick={() => setOdprt(false)} style={{ display: 'inline-flex', alignItems: 'center', gap: '.45rem' }}><UsersThree size={15} weight="bold" /> {L('Račun in ekipa', 'Account & team')}</Link>
          <Link href={`${base}/kalkulator/pogoji`} role="menuitem" onClick={() => setOdprt(false)} style={{ display: 'inline-flex', alignItems: 'center', gap: '.45rem' }}><ShieldCheck size={15} weight="bold" /> {L('Pogoji in zasebnost', 'Terms & privacy')}</Link>
          {/* Dostopnost je sestra jezika: oboje pove, kako je aplikacija
              predstavljena TEBI. Zato je svoja vrstica in ne podmeni — kdor rabi
              vecjo pisavo, ne bo brskal dve ravni globoko (Tina, 30. 8. 2026). */}
          {/* Isti razred kot ostale vrstice: gol <button> nima paddinga, ki ga
              .userMenu a dobi, zato je ikona stala levo od ostalih
              (Tina, 31. 8. 2026). */}
          <button type="button" role="menuitem" className={styles.userMenuSkupina}
            onClick={() => { setOdprt(false); window.dispatchEvent(new Event(DOGODEK_DOSTOPNOST)); }}>
            <PersonSimple size={15} weight="bold" /> {L('Dostopnost', 'Accessibility')}
          </button>
          <JezikPreklop base={base} role="menuitem" style={{ display: 'inline-flex', alignItems: 'center', gap: '.45rem' }} />
          <button type="button" className={styles.userMenuOdjava} role="menuitem" onClick={odjava} style={{ display: 'inline-flex', alignItems: 'center', gap: '.45rem' }}><SignOut size={15} weight="bold" /> {L('Odjava', 'Log out')}</button>
        </div>
      )}
    </div>
  );
}

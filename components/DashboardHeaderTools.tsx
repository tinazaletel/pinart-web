'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Sparkle, Bell } from '@phosphor-icons/react';
import { loadFlowData } from '@/lib/pinartFlowStore';
import { getAccessTier, type AccessTier } from '@/lib/pinartFlowEntitlements';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';

/* Ikone poenotene na Phosphor. Inline fill/stroke preglasi stare stroke-based
   CSS pravila (fill:none), da so Phosphor ikone vidne. */
const IKONA_SLOG = { fill: 'currentColor', stroke: 'none' } as const;

export default function DashboardHeaderTools() {
  const pathname = usePathname();
  const base = pathname?.startsWith('/en/') ? '/en' : '';
  const [aiOpen, setAiOpen] = useState(false);
  const [tier, setTier] = useState<AccessTier>('free');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState({ offers: 0, invoices: 0 });

  useEffect(() => {
    delete document.body.dataset.dashboardTheme;
    localStorage.removeItem('pinart-dashboard-theme');
    try {
      const flow = loadFlowData();
      setNotifications({ offers: flow.offers.filter(item => item.status === 'sent').length, invoices: flow.invoices.filter(item => !item.paid).length });
    } catch { /* nov profil */ }
    void getAccessTier().then(setTier);
  }, []);

  const count = notifications.offers + notifications.invoices;
  const hasAi = tier === 'pro';
  return <div className={styles.headerTools} aria-label="Uporabniške nastavitve">
    <button type="button" className={`${styles.aiAssistant}${hasAi ? '' : ` ${styles.aiLocked}`}`} title={hasAi ? 'Odpri AI asistenta' : 'AI asistent · plačljivi paket'} aria-label={hasAi ? 'Odpri AI asistenta' : 'AI asistent je na voljo v plačljivem paketu'} aria-expanded={aiOpen} onClick={() => { setNotificationsOpen(false); setAiOpen(value => !value); }}><Sparkle size={18} weight="regular" aria-hidden="true" style={IKONA_SLOG} />{!hasAi && <span className={styles.aiLock} aria-hidden="true">+</span>}</button>
    <button type="button" className={styles.notification} title="Poslovna opozorila" aria-label={`${count} poslovnih opozoril`} aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen(value => !value)}><Bell size={18} weight="regular" aria-hidden="true" style={IKONA_SLOG} />{count > 0 && <span>{count}</span>}</button>
    {/* Profilni gumb odstranjen: podvajal je uporabniski meni na dnu stranske vrstice (SidebarUserMenu). */}
    {aiOpen && <div className={`${styles.headerPopover} ${styles.aiPopover}`}><strong>Pinart AI asistent</strong>{hasAi ? <><p>Pomaga ti razumeti rezultate, pripraviti osnutke in najti naslednji korak.</p><button type="button" className={styles.aiCta}>Začni pogovor</button></> : <><p>AI asistent je del plačljivega paketa. Brezplačni kalkulator ostaja brezplačen.</p><Link className={styles.aiCta} href={`${base}/kalkulator/profil#paket`}>Nadgradi paket</Link></>}</div>}
    {notificationsOpen && <div className={styles.headerPopover}><strong>Poslovna opozorila</strong>{count ? <><Link href={`${base}/kalkulator/projekti`}>{notifications.offers} ponudb čaka odgovor</Link><Link href={`${base}/kalkulator/racuni`}>{notifications.invoices} odprtih računov</Link></> : <p>Trenutno ni odprtih opozoril.</p>}</div>}
  </div>;
}

'use client';

import { usePathname, useRouter } from 'next/navigation';
import { PersonSimple } from '@phosphor-icons/react';
import FlowUkazi from './FlowUkazi';
import DashboardHeaderTools from './DashboardHeaderTools';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';

/**
 * Orodja v mobilnem predalu: iskanje, AI, obvestila, pomoč, feedback.
 *
 * Na telefonu se ta skupina v zgornji vrstici skrije (ni prostora), zato mora
 * biti dosegljiva tukaj — sicer iskanja in AI na telefonu sploh ni.
 */
export default function MeniOrodja() {
  const pathname = usePathname() || '';
  const base = pathname.startsWith('/en/') ? '/en' : '';
  const jeEn = base === '/en';
  const L = (sl: string, en: string) => (jeEn ? en : sl);
  const router = useRouter();
  /* Na delovnih straneh (DashboardSidebar) kalkulatorjevega a11y-panela ni, zato
     je dispatch dogodka mrtev — peljimo na informativno stran /dostopnost. */
  const odpriDostopnost = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.currentTarget.closest('details')?.removeAttribute('open');
    router.push(`${base}/dostopnost`);
  };

  return (
    <div className={styles.meniOrodja}>
      <div className={styles.meniOrodjaVrsta}>
        <FlowUkazi base={base} />
        <DashboardHeaderTools />
      </div>
      <button type="button" className={`${styles.navItem} ${styles.meniDostopnost}`} onClick={odpriDostopnost}>
        <span className={styles.navIkona}><PersonSimple size={20} weight="regular" /></span>
        <span className={styles.navNapis}>{L('Dostopnost', 'Accessibility')}</span>
      </button>
    </div>
  );
}

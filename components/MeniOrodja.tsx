'use client';

import { usePathname } from 'next/navigation';
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
  const odpriDostopnost = (event: React.MouseEvent<HTMLButtonElement>) => {
    window.dispatchEvent(new CustomEvent('pinart:odpri-dostopnost'));
    event.currentTarget.closest('details')?.removeAttribute('open');
  };

  return (
    <div className={styles.meniOrodja}>
      <div className={styles.meniOrodjaVrsta}>
        <FlowUkazi base={base} />
        <DashboardHeaderTools />
      </div>
      <button type="button" className={`${styles.navItem} ${styles.meniDostopnost}`} onClick={odpriDostopnost}>
        <span className={styles.navIkona}><PersonSimple size={20} weight="regular" /></span>
        <span className={styles.navNapis}>Dostopnost</span>
      </button>
    </div>
  );
}

'use client';

import { usePathname } from 'next/navigation';
import { PersonSimple } from '@phosphor-icons/react';
import FlowUkazi from './FlowUkazi';
import { DOGODEK_DOSTOPNOST } from './Dostopnost';
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
  /* Okno dostopnosti zdaj visi v ogrodju (DashboardSidebar → <Dostopnost />) in
     ga odpre dogodek — z vsake strani, ne le iz kalkulatorja. Do izjave se pride
     iz okna (Tina, 30. 8. 2026). */
  const odpriDostopnost = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.currentTarget.closest('details')?.removeAttribute('open');
    window.dispatchEvent(new Event(DOGODEK_DOSTOPNOST));
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

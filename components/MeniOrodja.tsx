'use client';

import { usePathname } from 'next/navigation';
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

  return (
    <div className={styles.meniOrodja}>
      <div className={styles.meniOrodjaVrsta}>
        <FlowUkazi base={base} />
        <DashboardHeaderTools />
      </div>
    </div>
  );
}

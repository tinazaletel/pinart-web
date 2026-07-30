import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import DashboardSidebar from '@/components/DashboardSidebar';
import SodelavciPanel from '@/components/SodelavciPanel';
import styles from '../pregled/pregled.module.css';

export const metadata: Metadata = {
  title: 'Račun in ekipa | Pinart Flow',
  robots: { index: false, follow: false },
};

/**
 * Račun in ekipa.
 *
 * Tu živita ekipa (Sodelavci + Prenos ob odhodu) in kratek pregled računa.
 * Paket je namenoma NE cel seznam — samo kompaktna kartica z bližnjico na
 * stran s paketi (/kalkulator/paket), da ne podvajamo celega cenika tu.
 */
export default async function EkipaPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const base = locale === 'sl' ? '' : `/${locale}`;

  return <main className={styles.shell}>
    <DashboardSidebar base={base} active="ekipa" />
    <section className={styles.workspace}>
      <header className={styles.topbar}>
        <div><p className={styles.eyebrow}>RAČUN IN EKIPA</p><h1>Ekipa in dostop.</h1></div>
      </header>

      <SodelavciPanel />
    </section>
  </main>;
}

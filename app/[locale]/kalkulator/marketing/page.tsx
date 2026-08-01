import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import DashboardSidebar from '@/components/DashboardSidebar';
import MarketingWorkspace from '@/components/MarketingWorkspace';
import PredogledZnak from '@/components/PredogledZnak';
import styles from '../pregled/pregled.module.css';

export const metadata: Metadata = {
  title: 'Marketing | Pinart Flow',
  robots: { index: false, follow: false },
};

export default async function MarketingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const base = locale === 'sl' ? '' : `/${locale}`;

  return (
    <main className={styles.shell}>
      <DashboardSidebar base={base} active="marketing" />
      <section className={styles.workspace}>
        <header className={styles.topbar}>
          <div><p className={styles.eyebrow}>MARKETING</p><h1>Od ideje do odziva.</h1></div>
          <PredogledZnak base={base} />
        </header>
        <MarketingWorkspace base={base} />
      </section>
    </main>
  );
}

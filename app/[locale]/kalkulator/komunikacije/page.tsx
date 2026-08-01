import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import CommsWorkspace from '@/components/CommsWorkspace';
import DashboardSidebar from '@/components/DashboardSidebar';
import styles from '../pregled/pregled.module.css';

export const metadata: Metadata = { title: 'Komunikacije | Flow', robots: { index: false, follow: false } };

export default async function CommsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; setRequestLocale(locale); const base = locale === 'sl' ? '' : `/${locale}`;
  return (
    <main className={styles.shell}>
      <DashboardSidebar base={base} active="comms" />
      <section className={styles.workspace}>
        <header className={styles.topbar}>
          <div><p className={styles.eyebrow}>KOMUNIKACIJE</p><h1>Mail, Chat, Meet — na enem mestu.</h1></div>
        </header>
        <CommsWorkspace />
      </section>
    </main>
  );
}

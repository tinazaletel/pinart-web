import type { Metadata } from 'next';
import NazajLink from '@/components/NazajLink';
import { setRequestLocale } from 'next-intl/server';
import DashboardSidebar from '@/components/DashboardSidebar';
import SettingsWorkspace from '@/components/SettingsWorkspace';
import styles from '../pregled/pregled.module.css';

export const metadata: Metadata = {
  title: 'Nastavitve | Pinart Flow',
  description: 'Nastavitve aplikacije — videz dokumentov in podpis pošte.',
  robots: { index: false, follow: false },
};

export default async function NastavitvePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const base = locale === 'sl' ? '' : `/${locale}`;

  return (
    <main className={styles.shell}>
      <DashboardSidebar base={base} active="settings" />

      <section className={styles.workspace}>
        <header className={styles.topbar}>
          <div>
            <NazajLink label={locale === 'en' ? 'Back to dashboard' : 'Nazaj na nadzorno ploščo'} />
            <p className={styles.eyebrow}>{locale === 'en' ? 'SETTINGS' : 'NASTAVITVE'}</p>
            <h1>{locale === 'en' ? 'App settings.' : 'Nastavitve aplikacije.'}</h1>
          </div></header>

        <SettingsWorkspace base={base} />
      </section>
    </main>
  );
}

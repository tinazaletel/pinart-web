import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import DashboardSidebar from '@/components/DashboardSidebar';
import StoparicaBliznjica from '@/components/StoparicaBliznjica';
import SettingsWorkspace from '@/components/SettingsWorkspace';
import styles from '../pregled/pregled.module.css';

export const metadata: Metadata = {
  title: 'Nastavitve | Pinart Flow',
  description: 'Videz dokumentov, logotip in podatki orodja.',
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
            <p className={styles.eyebrow}>NASTAVITVE</p>
            <h1>Enkrat nastaviš. Povsod velja.</h1>
          </div>
        <StoparicaBliznjica /></header>

        <SettingsWorkspace base={base} />
      </section>
    </main>
  );
}

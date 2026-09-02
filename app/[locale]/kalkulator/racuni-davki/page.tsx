import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import DashboardSidebar from '@/components/DashboardSidebar';
import RacuniDavkiWorkspace from '@/components/RacuniDavkiWorkspace';
import styles from '../pregled/pregled.module.css';

export const metadata: Metadata = {
  title: 'Računi in davki | Pinart Flow',
  robots: { index: false, follow: false },
};

export default async function RacuniDavkiPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const base = locale === 'sl' ? '' : `/${locale}`;

  return <main className={styles.shell}>
    <DashboardSidebar base={base} active="davki" />
    <section className={styles.workspace}>
      <header className={styles.topbar}>
        <div><p className={styles.eyebrow}>{locale === 'en' ? 'INVOICES & TAXES' : 'RAČUNI IN DAVKI'}</p><h1>{locale === 'en' ? 'Invoice settings.' : 'Nastavitve računov.'}</h1></div>
      </header>
      <RacuniDavkiWorkspace />
    </section>
  </main>;
}

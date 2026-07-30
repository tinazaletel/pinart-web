import type { Metadata } from 'next';
import Link from 'next/link';
import { setRequestLocale } from 'next-intl/server';
import DashboardSidebar from '@/components/DashboardSidebar';
import IdejeWorkspace from '@/components/IdejeWorkspace';
import styles from '../pregled/pregled.module.css';

export const metadata: Metadata = {
  title: 'Moje ideje | Pinart Flow',
  description: 'Živ pregled idej in statusa gradnje Flowa.',
  robots: { index: false, follow: false },
};

export default async function IdejePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const base = locale === 'sl' ? '' : `/${locale}`;

  return (
    <main className={styles.shell}>
      <DashboardSidebar base={base} active="ideje" />
      <section className={styles.workspace}>
        <header className={styles.topbar}>
          <div>
            <Link href={`${base}/kalkulator/pregled`} style={{ display: 'inline-flex', alignItems: 'center', gap: '.3rem', fontSize: '.78rem', fontWeight: 600, color: 'rgba(17,17,17,.6)', textDecoration: 'none', marginBottom: '.5rem' }}>← Nazaj na nadzorno ploščo</Link>
            <p className={styles.eyebrow}>MOJE IDEJE</p>
            <h1>Vse ideje &amp; status.</h1>
          </div>
        </header>
        <IdejeWorkspace />
      </section>
    </main>
  );
}

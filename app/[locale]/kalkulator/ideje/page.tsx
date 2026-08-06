import type { Metadata } from 'next';
import NazajLink from '@/components/NazajLink';
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
            <NazajLink label={locale === 'en' ? 'Back to dashboard' : 'Nazaj na nadzorno ploščo'} />
            <p className={styles.eyebrow}>{locale === 'en' ? 'MY IDEAS' : 'MOJE IDEJE'}</p>
            <h1>{locale === 'en' ? 'All ideas & status.' : 'Vse ideje & status.'}</h1>
          </div>
        </header>
        <IdejeWorkspace />
      </section>
    </main>
  );
}

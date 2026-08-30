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

export default async function IdejePage(
  { params, searchParams }: {
    params: Promise<{ locale: string }>;
    searchParams: Promise<{ nazaj?: string }>;
  },
) {
  const { locale } = await params;
  /* »Nazaj« se na namizju pokaze le, ce si prisla od nekod (povezava nosi
     ?nazaj=1). Iz menija nazaj ni kam. Na telefonu je vedno, ker je meni
     zaprt (Tina, 30. 8. 2026). */
  const { nazaj } = await searchParams;
  setRequestLocale(locale);
  const base = locale === 'sl' ? '' : `/${locale}`;

  return (
    <main className={styles.shell}>
      <DashboardSidebar base={base} active="ideje" />
      <section className={styles.workspace}>
        <header className={styles.topbar}>
          <div>
            <NazajLink samoMobilno={!nazaj} label={locale === 'en' ? 'Back' : 'Nazaj'} />
            <p className={styles.eyebrow}>{locale === 'en' ? 'MY IDEAS' : 'MOJE IDEJE'}</p>
            <h1>{locale === 'en' ? 'All ideas & status.' : 'Vse ideje & status.'}</h1>
          </div>
        </header>
        <IdejeWorkspace />
      </section>
    </main>
  );
}

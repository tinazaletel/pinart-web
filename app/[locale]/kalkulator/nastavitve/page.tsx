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

export default async function NastavitvePage(
  { params, searchParams }: {
    params: Promise<{ locale: string }>;
    searchParams: Promise<{ nazaj?: string; zavihek?: string }>;
  },
) {
  const { locale } = await params;
  /* »Nazaj« se na namizju pokaze le, ce si prisla od nekod (povezava nosi
     ?nazaj=1). Iz menija nazaj ni kam. Na telefonu je vedno, ker je meni
     zaprt (Tina, 30. 8. 2026). */
  const { nazaj, zavihek } = await searchParams;
  setRequestLocale(locale);
  const base = locale === 'sl' ? '' : `/${locale}`;

  return (
    <main className={styles.shell}>
      <DashboardSidebar base={base} active="settings" />

      <section className={styles.workspace}>
        <header className={styles.topbar}>
          <div>
            <NazajLink samoMobilno={!nazaj} label={locale === 'en' ? 'Back' : 'Nazaj'} />
            <p className={styles.eyebrow}>{locale === 'en' ? 'SETTINGS' : 'NASTAVITVE'}</p>
            <h1>{locale === 'en' ? 'App settings.' : 'Nastavitve aplikacije.'}</h1>
          </div></header>

        <SettingsWorkspace base={base} zavihek={zavihek === 'ai' ? 'ai' : zavihek === 'dokumenti' ? 'dokumenti' : undefined} />
      </section>
    </main>
  );
}

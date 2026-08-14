import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import DashboardSidebar from '@/components/DashboardSidebar';
import PupaDom from '@/components/PupaDom';
import styles from '../pregled/pregled.module.css';

/* NOVA stran (Faza 1 pogovorne smeri): Pupa začetni zaslon. Obstoječe strani
   ostanejo nedotaknjene — to je KOPIJA-na-novem, ne zamenjava. Ko bo potrjeno,
   lahko postane privzeti landing. Glej memory: project_pupa_prvi_vmesnik. */

export const metadata: Metadata = {
  title: 'Pupa | Pinart Flow',
  description: 'Povej, kaj želiš ustvariti — Flow uredi poslovni del.',
  robots: { index: false, follow: false },
};

export default async function PupaDomPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const base = locale === 'sl' ? '' : `/${locale}`;

  return (
    <main className={styles.shell}>
      <DashboardSidebar base={base} active="dom" />
      <section className={styles.workspace}>
        <PupaDom base={base} />
      </section>
    </main>
  );
}

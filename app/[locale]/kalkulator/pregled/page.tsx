import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import BusinessOverview from '@/components/BusinessOverview';
import DashboardHeaderTools from '@/components/DashboardHeaderTools';
import DashboardSidebar from '@/components/DashboardSidebar';
import styles from './pregled.module.css';

export const metadata: Metadata = {
  title: 'Pregled poslovanja | Pinart',
  description: 'Tvoj kreativni posel, od prve cene do plačanega računa.',
  robots: { index: false, follow: false },
};

export default async function PoslovniPregledPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const base = locale === 'sl' ? '' : `/${locale}`;

  return (
    <main className={styles.shell}>
      <DashboardSidebar base={base} active="overview" />

      <section className={styles.workspace}>
        <header className={styles.topbar}>
          <div>
            <p className={styles.eyebrow}>POSLOVNI PREGLED</p>
            <h1>Dobrodošla nazaj.</h1>
          </div>
          <DashboardHeaderTools />
        </header>

        <BusinessOverview base={base} />
      </section>
    </main>
  );
}

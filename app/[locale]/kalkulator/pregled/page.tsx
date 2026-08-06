import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import BusinessOverview from '@/components/BusinessOverview';
import DashboardSidebar from '@/components/DashboardSidebar';
import OnboardingKartica from '@/components/OnboardingKartica';
import PozdravPregled from '@/components/PozdravPregled';
import UvodPreusmeritev from '@/components/UvodPreusmeritev';
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

      <UvodPreusmeritev base={base} />
      <section className={styles.workspace}>
        <header className={styles.topbar}>
          <div>
            <p className={styles.eyebrow}>{locale === 'en' ? 'BUSINESS OVERVIEW' : 'POSLOVNI PREGLED'}</p>
            <PozdravPregled jeEn={locale === 'en'} />
            <p className={styles.topbarSub}>{locale === 'en' ? 'Here you can quickly create a proposal, track projects and keep an overview of everything that matters.' : 'Tukaj lahko hitro ustvariš ponudbo, slediš projektom in imaš pregled nad vsem, kar je pomembno.'}</p>
          </div></header>

        {/* nad pregledom, ne pod njim: kdor nastavitve ni koncal, vidi
            privzete stevilke in ne ve, zakaj mu ne ustrezajo */}
        <OnboardingKartica base={base} />

        <BusinessOverview base={base} />
      </section>
    </main>
  );
}

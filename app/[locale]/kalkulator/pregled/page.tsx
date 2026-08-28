import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import BusinessOverview from '@/components/BusinessOverview';
import { naroceniPaket, paketUporabnika } from '@/lib/pravice';
import DashboardSidebar from '@/components/DashboardSidebar';
import DatumUra from '@/components/DatumUra';
import OnboardingKartica from '@/components/OnboardingKartica';
import PozdravPregled from '@/components/PozdravPregled';
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
  /* Prazna stanja brez Pupe ne smejo peljati k zaklenjeni Pupi. */
  const paketZaPupo = await naroceniPaket();
  const imaPupo = paketZaPupo === 'pro' || paketZaPupo === 'premium';

  return (
    <main className={styles.shell}>
      <DashboardSidebar base={base} active="overview" />

      <section className={styles.workspace}>
        <header className={styles.topbar}>
          <div>
            <p className={styles.eyebrow}>{locale === 'en' ? 'BUSINESS OVERVIEW' : 'POSLOVNI PREGLED'}</p>
            <PozdravPregled jeEn={locale === 'en'} />
            <p className={styles.topbarSub}>{locale === 'en' ? 'Here you can quickly create a proposal, track projects and keep an overview of everything that matters.' : 'Tukaj lahko hitro ustvariš ponudbo, slediš projektom in imaš pregled nad vsem, kar je pomembno.'}</p>
          </div>
          {/* datum in ura: desno v glavi, poravnana z vrhom (Tina, 26. 8. 2026) */}
          <DatumUra jeEn={locale === 'en'} className={styles.topbarDatum} />
        </header>

        {/* nad pregledom, ne pod njim: kdor nastavitve ni koncal, vidi
            privzete stevilke in ne ve, zakaj mu ne ustrezajo */}
        <OnboardingKartica base={base} />

        <BusinessOverview base={base} imaPupo={imaPupo} />
      </section>
    </main>
  );
}

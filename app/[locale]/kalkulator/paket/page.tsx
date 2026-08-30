import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import DashboardSidebar from '@/components/DashboardSidebar';
import PaketiSeznam from '@/components/PaketiSeznam';
import { naroceniPaket } from '@/lib/pravice';
import { headers } from 'next/headers';
import { dolociPonudbo, valutaZaDrzavo } from '@/lib/cenaNarocnine';
import { oddanihUstanovnih } from '@/lib/ustanovnaMesta';
import styles from '../pregled/pregled.module.css';

export const metadata: Metadata = {
  title: 'Paket | Pinart Flow',
  robots: { index: false, follow: false },
};

/**
 * Paket in naročnina.
 *
 * Tu vidiš vse pakete, kateri je tvoj, in kaj lahko s tem narediš — nadgradnja,
 * znižanje, odpoved. Ekipa (Sodelavci + Prenos ob odhodu) živi ločeno na strani
 * "Račun in ekipa" (/kalkulator/ekipa), da paket in ljudje nista zmešana skupaj.
 */
export default async function PaketPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const base = locale === 'sl' ? '' : `/${locale}`;
  const paket = await naroceniPaket();

  return <main className={styles.shell}>
    <DashboardSidebar base={base} active="settings" />
    <section className={styles.workspace}>
      <header className={styles.topbar}>
        <div><p className={styles.eyebrow}>{locale === 'en' ? 'PLAN' : 'PAKET'}</p><h1>{locale === 'en' ? 'Plan and subscription.' : 'Paket in naročnina.'}</h1></div>
      </header>

      <PaketiSeznam trenutni={paket} locale={locale} valuta={valutaZaDrzavo((await headers()).get('x-vercel-ip-country'))} ponudba={dolociPonudbo(new Date(), await oddanihUstanovnih())} />
    </section>
  </main>;
}

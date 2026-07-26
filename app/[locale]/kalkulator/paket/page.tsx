import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import DashboardSidebar from '@/components/DashboardSidebar';
import PaketiSeznam from '@/components/PaketiSeznam';
import SodelavciPanel from '@/components/SodelavciPanel';
import { paketUporabnika } from '@/lib/pravice';
import styles from '../pregled/pregled.module.css';

export const metadata: Metadata = {
  title: 'Račun in ekipa | Pinart Flow',
  robots: { index: false, follow: false },
};

/**
 * Račun in ekipa.
 *
 * Prej je "Paket" v profilnem meniju kazal na sidro, ki ni obstajalo, in klik
 * ni naredil nicesar. Tu vidis vse pakete, kateri je tvoj, in kaj lahko s tem
 * narediš — nadgradnja, znizanje, odpoved. Pod paketi je še ekipa (Sodelavci +
 * Prenos ob odhodu), da vse o računu in ljudeh živi na enem mestu.
 */
export default async function PaketPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const base = locale === 'sl' ? '' : `/${locale}`;
  const paket = await paketUporabnika();

  return <main className={styles.shell}>
    <DashboardSidebar base={base} active="settings" />
    <section className={styles.workspace}>
      <header className={styles.topbar}>
        <div><p className={styles.eyebrow}>RAČUN IN EKIPA</p><h1>Kaj imaš in kdo dela s tabo.</h1></div>
      </header>

      <PaketiSeznam trenutni={paket === 'pro' ? 'pro' : 'free'} />
      <SodelavciPanel />
    </section>
  </main>;
}

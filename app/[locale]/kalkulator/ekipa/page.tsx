import type { Metadata } from 'next';
import Link from 'next/link';
import { setRequestLocale } from 'next-intl/server';
import DashboardSidebar from '@/components/DashboardSidebar';
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
 * Tu živita ekipa (Sodelavci + Prenos ob odhodu) in kratek pregled računa.
 * Paket je namenoma NE cel seznam — samo kompaktna kartica z bližnjico na
 * stran s paketi (/kalkulator/paket), da ne podvajamo celega cenika tu.
 */
export default async function EkipaPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const base = locale === 'sl' ? '' : `/${locale}`;
  const paket = await paketUporabnika();
  const jePro = paket === 'pro';

  return <main className={styles.shell}>
    <DashboardSidebar base={base} active="ekipa" />
    <section className={styles.workspace}>
      <header className={styles.topbar}>
        <div><p className={styles.eyebrow}>RAČUN IN EKIPA</p><h1>Ekipa in dostop.</h1></div>
      </header>

      {/* Kompaktna kartica "Tvoj paket" — samo trenutni paket + bližnjica, ne cel cenik. */}
      <div className={styles.paketMini}>
        <div>
          <p className={styles.eyebrow}>TVOJ PAKET</p>
          <strong className={styles.paketMiniIme} data-pro={jePro}>{jePro ? 'Pro' : 'Brezplačno'}</strong>
        </div>
        <Link href={`${base}/kalkulator/paket`} className={styles.paketMiniLink}>Poglej pakete →</Link>
      </div>

      <SodelavciPanel />
    </section>
  </main>;
}

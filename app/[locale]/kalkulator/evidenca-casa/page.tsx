import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import DashboardSidebar from '@/components/DashboardSidebar';
import EvidencaCasa from '@/components/EvidencaCasa';
import styles from '../pregled/pregled.module.css';

export const metadata: Metadata = { title: 'Evidenca delovnega časa | Pinart Flow', robots: { index: false, follow: false } };

/* Evidenca po ZEPDSV je ZAKONSKA obveznost, ne poslovna analitika, zato NI za
   ključavnico (za razliko od Cilji/Čas/Poslovni okvir, ki so businessInsights).
   Kdor mora voditi evidenco, jo mora voditi tudi na brezplačnem paketu. */
export default async function EvidencaCasaPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const base = locale === 'sl' ? '' : `/${locale}`;
  const jeEn = locale === 'en';

  return (
    <main className={styles.shell}>
      <DashboardSidebar base={base} active="evidenca" />
      <section className={styles.workspace}>
        <header className={styles.topbar}>
          <div>
            <p className={styles.eyebrow}>{jeEn ? 'WORKING TIME RECORDS' : 'EVIDENCA DELOVNEGA ČASA'}</p>
            <h1>{jeEn ? 'When the work actually happened.' : 'Kdaj je delo res potekalo.'}</h1>
          </div>
        </header>
        <EvidencaCasa />
      </section>
    </main>
  );
}

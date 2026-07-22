import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import ContractWorkspace from '@/components/ContractWorkspace';
import DashboardSidebar from '@/components/DashboardSidebar';
import Zaklenjeno from '@/components/Zaklenjeno';
import { smePorabiti } from '@/lib/pravice';
import styles from '../pregled/pregled.module.css';

export const metadata: Metadata = { title: 'Pogodbe | Pinart Flow', robots: { index: false, follow: false } };

export default async function PogodbePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const base = locale === 'sl' ? '' : `/${locale}`;
  /* Kljucavnica v meniju je videz; prava zascita je tu, na strezniku. */
  const sme = await smePorabiti('contracts');

  return <main className={styles.shell}>
    <DashboardSidebar base={base} active="contracts" />
    <section className={styles.workspace}><header className={styles.topbar}><div><p className={styles.eyebrow}>POGODBE</p><h1>Dogovor, brez ugibanja.</h1></div></header>{sme ? <ContractWorkspace base={base} /> : <Zaklenjeno funkcija="contracts" base={base} />}</section>
  </main>;
}

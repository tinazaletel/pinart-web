import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import ContractWorkspace from '@/components/ContractWorkspace';
import DashboardSidebar from '@/components/DashboardSidebar';
import StoparicaBliznjica from '@/components/StoparicaBliznjica';
import styles from '../pregled/pregled.module.css';

export const metadata: Metadata = { title: 'Pogodbe | Pinart Flow', robots: { index: false, follow: false } };

export default async function PogodbePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const base = locale === 'sl' ? '' : `/${locale}`;
  return <main className={styles.shell}>
    <DashboardSidebar base={base} active="contracts" />
    <section className={styles.workspace}><header className={styles.topbar}><div><p className={styles.eyebrow}>POGODBE</p><h1>Dogovor, brez ugibanja.</h1></div><StoparicaBliznjica /></header><ContractWorkspace base={base} /></section>
  </main>;
}

import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import DashboardSidebar from '@/components/DashboardSidebar';
import PriceListsWorkspace from '@/components/PriceListsWorkspace';
import styles from '../pregled/pregled.module.css';

export const metadata: Metadata = { title: 'Moji ceniki | Pinart Flow', robots: { index: false, follow: false } };
export default async function CenikiPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; setRequestLocale(locale); const base = locale === 'sl' ? '' : `/${locale}`;
  return <main className={styles.shell}><DashboardSidebar base={base} active="prices" /><section className={styles.workspace}><header className={styles.topbar}><div><p className={styles.eyebrow}>MOJI CENIKI</p><h1>Tvoje cene, tvoja pravila.</h1></div></header><PriceListsWorkspace /></section></main>;
}

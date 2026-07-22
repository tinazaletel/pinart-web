import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import AccountingWorkspace from '@/components/AccountingWorkspace';
import DashboardSidebar from '@/components/DashboardSidebar';
import styles from '../pregled/pregled.module.css';

export const metadata: Metadata = { title: 'Računovodstvo | Pinart Flow', robots: { index: false, follow: false } };

export default async function AccountingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; setRequestLocale(locale); const base = locale === 'sl' ? '' : `/${locale}`;
  return <main className={styles.shell}><DashboardSidebar base={base} active="accounting" /><section className={styles.workspace}><header className={styles.topbar}><div><p className={styles.eyebrow}>RAČUNOVODSTVO</p><h1>Pripravljeno. Poslano. Zabeleženo.</h1></div></header><AccountingWorkspace /></section></main>;
}

import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import KomunikacijaWorkspace from '@/components/KomunikacijaWorkspace';
import DashboardSidebar from '@/components/DashboardSidebar';
import styles from '../pregled/pregled.module.css';

export const metadata: Metadata = { title: 'Komunikacija | Pinart Flow', robots: { index: false, follow: false } };

export default async function KomunikacijaPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; setRequestLocale(locale); const base = locale === 'sl' ? '' : `/${locale}`;
  return <main className={styles.shell}><DashboardSidebar base={base} active="komunikacija" /><section className={styles.workspace}><KomunikacijaWorkspace jeEn={locale === 'en'} /></section></main>;
}

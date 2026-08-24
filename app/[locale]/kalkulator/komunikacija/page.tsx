import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import KomunikacijaWorkspace from '@/components/KomunikacijaWorkspace';
import DashboardSidebar from '@/components/DashboardSidebar';
import styles from '../pregled/pregled.module.css';

export const metadata: Metadata = { title: 'Komunikacija | Pinart Flow', robots: { index: false, follow: false } };

export default async function KomunikacijaPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ id?: string }> }) {
  const { locale } = await params; setRequestLocale(locale); const base = locale === 'sl' ? '' : `/${locale}`;
  const { id } = await searchParams;
  return <main className={styles.shell}><DashboardSidebar base={base} active="komunikacija" /><section className={styles.workspace}><KomunikacijaWorkspace jeEn={locale === 'en'} initialId={id} /></section></main>;
}

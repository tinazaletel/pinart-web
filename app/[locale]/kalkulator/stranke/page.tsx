import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import ClientWorkspace from '@/components/ClientWorkspace';
import DashboardHeaderTools from '@/components/DashboardHeaderTools';
import DashboardSidebar from '@/components/DashboardSidebar';
import styles from '../pregled/pregled.module.css';

export const metadata: Metadata = { title: 'Stranke | Pinart Flow', robots: { index: false, follow: false } };
export default async function StrankePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; setRequestLocale(locale); const base = locale === 'sl' ? '' : `/${locale}`;
  return <main className={styles.shell}><DashboardSidebar base={base} active="clients" /><section className={styles.workspace}><header className={styles.topbar}><div><p className={styles.eyebrow}>STRANKE</p><h1>Vsi dogovori imajo obraz.</h1></div><DashboardHeaderTools /></header><ClientWorkspace /></section></main>;
}

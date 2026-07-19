import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import ExpenseWorkspace from '@/components/ExpenseWorkspace';
import DashboardHeaderTools from '@/components/DashboardHeaderTools';
import DashboardSidebar from '@/components/DashboardSidebar';
import styles from '../pregled/pregled.module.css';

export const metadata: Metadata = { title: 'Stroški | Pinart Flow', robots: { index: false, follow: false } };
export default async function StroskiPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; setRequestLocale(locale); const base = locale === 'sl' ? '' : `/${locale}`;
  return <main className={styles.shell}><DashboardSidebar base={base} active="expenses" /><section className={styles.workspace}><header className={styles.topbar}><div><p className={styles.eyebrow}>STROŠKI</p><h1>Veš, kam gre denar.</h1></div><DashboardHeaderTools /></header><ExpenseWorkspace /></section></main>;
}

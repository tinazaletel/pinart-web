import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import DashboardSidebar from '@/components/DashboardSidebar';
import LibraryWorkspace from '@/components/LibraryWorkspace';
import styles from '../pregled/pregled.module.css';

export const metadata: Metadata = { title: 'Knjižnica postavk | Pinart Flow', robots: { index: false, follow: false } };
export default async function KnjiznicaPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; setRequestLocale(locale); const base = locale === 'sl' ? '' : `/${locale}`;
  return <main className={styles.shell}><DashboardSidebar base={base} active="library" /><section className={styles.workspace}><header className={styles.topbar}><div><p className={styles.eyebrow}>KNJIŽNICA</p><h1>Tvoje postavke, vedno pri roki.</h1></div></header><LibraryWorkspace /></section></main>;
}

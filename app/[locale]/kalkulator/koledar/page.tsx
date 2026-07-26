import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import KoledarWorkspace from '@/components/KoledarWorkspace';
import DashboardSidebar from '@/components/DashboardSidebar';
import styles from '../pregled/pregled.module.css';

export const metadata: Metadata = { title: 'Koledar | Pinart Flow', robots: { index: false, follow: false } };

export default async function KoledarPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; setRequestLocale(locale); const base = locale === 'sl' ? '' : `/${locale}`;
  return <main className={styles.shell}><DashboardSidebar base={base} active="koledar" /><section className={styles.workspace}><header className={styles.topbar}><div><p className={styles.eyebrow}>KOLEDAR</p><h1>Sestanki, klici in roki.</h1></div></header><KoledarWorkspace /></section></main>;
}

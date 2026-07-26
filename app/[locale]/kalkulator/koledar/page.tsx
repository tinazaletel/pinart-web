import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import KoledarWorkspace from '@/components/KoledarWorkspace';
import DashboardSidebar from '@/components/DashboardSidebar';
import PredogledZnak from '@/components/PredogledZnak';
import styles from '../pregled/pregled.module.css';

export const metadata: Metadata = { title: 'Koledar | Pinart Flow', robots: { index: false, follow: false } };

export default async function KoledarPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; setRequestLocale(locale); const base = locale === 'sl' ? '' : `/${locale}`;
  return <main className={styles.shell}><DashboardSidebar base={base} active="koledar" /><section className={styles.workspace}><header className={styles.topbar}><div><p className={styles.eyebrow}>KOLEDAR</p><h1 style={{ textShadow: '0 0 7px var(--paper, #f6f3ec), 0 0 7px var(--paper, #f6f3ec), 0 1px 2px var(--paper, #f6f3ec)' }}>Sestanki, klici in roki.</h1></div><PredogledZnak base={base} /></header><KoledarWorkspace /></section></main>;
}

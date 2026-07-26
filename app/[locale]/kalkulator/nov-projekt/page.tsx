import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import NovProjektWorkspace from '@/components/NovProjektWorkspace';
import DashboardSidebar from '@/components/DashboardSidebar';
import styles from '../pregled/pregled.module.css';

export const metadata: Metadata = { title: 'Ustvari projekt | Pinart Flow', robots: { index: false, follow: false } };

export default async function NovProjektPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; setRequestLocale(locale); const base = locale === 'sl' ? '' : `/${locale}`;
  return <main className={styles.shell}><DashboardSidebar base={base} active="novprojekt" />
    <section className={styles.workspace}><NovProjektWorkspace base={base} /></section></main>;
}

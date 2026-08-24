import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import TaskManagerWorkspace from '@/components/TaskManagerWorkspace';
import DashboardSidebar from '@/components/DashboardSidebar';
import styles from '../pregled/pregled.module.css';

export const metadata: Metadata = { title: 'Naloge | Pinart Flow', robots: { index: false, follow: false } };

export default async function NalogePage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ id?: string }> }) {
  const { locale } = await params; setRequestLocale(locale); const base = locale === 'sl' ? '' : `/${locale}`;
  const { id } = await searchParams;
  return <main className={styles.shell}><DashboardSidebar base={base} active="naloge" /><section className={styles.workspace}><TaskManagerWorkspace initialId={id} /></section></main>;
}

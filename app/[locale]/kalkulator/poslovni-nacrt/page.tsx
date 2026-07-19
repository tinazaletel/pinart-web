import type { Metadata } from 'next';
import BusinessCanvasWorkspace from '@/components/BusinessCanvasWorkspace';
import DashboardHeaderTools from '@/components/DashboardHeaderTools';
import DashboardSidebar from '@/components/DashboardSidebar';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';

export const metadata: Metadata = { title: 'Business Canvas in poslovni načrt | Pinart Flow', robots: { index: false, follow: false } };

export default async function BusinessPlanPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; const base = locale === 'sl' ? '' : `/${locale}`;
  return <main className={styles.shell}><DashboardSidebar base={base} active="plan" /><section className={styles.workspace}><header className={styles.topbar}><div><p className={styles.eyebrow}>BUSINESS CANVAS</p><h1>Posel na eni strani.</h1></div><DashboardHeaderTools /></header><BusinessCanvasWorkspace /></section></main>;
}

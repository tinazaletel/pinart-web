import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import DashboardSidebar from '@/components/DashboardSidebar';
import StoparicaBliznjica from '@/components/StoparicaBliznjica';
import GoalsWorkspace from '@/components/GoalsWorkspace';
import styles from '../pregled/pregled.module.css';

export const metadata: Metadata = { title: 'Poslovni cilji | Pinart Flow', robots: { index: false, follow: false } };
export default async function CiljiPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; setRequestLocale(locale); const base = locale === 'sl' ? '' : `/${locale}`;
  return <main className={styles.shell}><DashboardSidebar base={base} active="goals" /><section className={styles.workspace}><header className={styles.topbar}><div><p className={styles.eyebrow}>POSLOVNI CILJI</p><h1>Številka z razlogom.</h1></div><StoparicaBliznjica /></header><GoalsWorkspace base={base} /></section></main>;
}

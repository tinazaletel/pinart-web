import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import InvoiceWorkspace from '@/components/InvoiceWorkspace';
import DashboardSidebar from '@/components/DashboardSidebar';
import StoparicaBliznjica from '@/components/StoparicaBliznjica';
import styles from '../pregled/pregled.module.css';

export const metadata: Metadata = { title: 'Računi | Pinart Flow', robots: { index: false, follow: false } };

export default async function RacuniPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; setRequestLocale(locale); const base = locale === 'sl' ? '' : `/${locale}`;
  return <main className={styles.shell}><DashboardSidebar base={base} active="invoices" /><section className={styles.workspace}><header className={styles.topbar}><div><p className={styles.eyebrow}>RAČUNI</p><h1>Od dogovora do plačila.</h1></div><StoparicaBliznjica /></header><InvoiceWorkspace base={base} /></section></main>;
}

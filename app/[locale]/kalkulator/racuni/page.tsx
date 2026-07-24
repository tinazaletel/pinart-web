import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import InvoiceWorkspace from '@/components/InvoiceWorkspace';
import DashboardSidebar from '@/components/DashboardSidebar';
import styles from '../pregled/pregled.module.css';

export const metadata: Metadata = { title: 'Računi | Pinart Flow', robots: { index: false, follow: false } };

export default async function RacuniPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; setRequestLocale(locale); const base = locale === 'sl' ? '' : `/${locale}`;
  return <main className={styles.shell}><DashboardSidebar base={base} active="invoices" />{/* naslov izrise InvoiceWorkspace v ozkem stolpcu (kot pogodbe/retainer), ne full-width */}
    <section className={styles.workspace}><InvoiceWorkspace base={base} /></section></main>;
}

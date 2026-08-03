import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import ClientWorkspace from '@/components/ClientWorkspace';
import DashboardSidebar from '@/components/DashboardSidebar';
import styles from '../pregled/pregled.module.css';

/* Za prijavo zaklenjena, personalizirana stran; ClientWorkspace uporablja
   useSearchParams(). force-dynamic preskoči statični prerender (sicer 'next build'
   pade z "useSearchParams() should be wrapped in a suspense boundary"). */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Stranke | Pinart Flow', robots: { index: false, follow: false } };
export default async function StrankePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; setRequestLocale(locale); const base = locale === 'sl' ? '' : `/${locale}`;
  return <main className={styles.shell}><DashboardSidebar base={base} active="clients" /><section className={styles.workspace}><header className={styles.topbar}><div><p className={styles.eyebrow}>STRANKE</p><h1>Vsi dogovori imajo obraz.</h1></div></header><ClientWorkspace /></section></main>;
}

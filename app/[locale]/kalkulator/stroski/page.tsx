import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import ExpenseWorkspace from '@/components/ExpenseWorkspace';
import DashboardSidebar from '@/components/DashboardSidebar';
import Zaklenjeno from '@/components/Zaklenjeno';
import { smePorabiti } from '@/lib/pravice';
import StoparicaBliznjica from '@/components/StoparicaBliznjica';
import styles from '../pregled/pregled.module.css';

export const metadata: Metadata = { title: 'Stroški | Pinart Flow', robots: { index: false, follow: false } };
export default async function StroskiPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; setRequestLocale(locale); const base = locale === 'sl' ? '' : `/${locale}`;
  /* Kljucavnica v meniju je videz; prava zascita je tu, na strezniku. */
  const sme = await smePorabiti('expenses');

  return <main className={styles.shell}><DashboardSidebar base={base} active="expenses" /><section className={styles.workspace}><header className={styles.topbar}><div><p className={styles.eyebrow}>STROŠKI</p><h1>Veš, kam gre denar.</h1></div><StoparicaBliznjica /></header>{sme ? <ExpenseWorkspace /> : <Zaklenjeno funkcija="expenses" base={base} />}</section></main>;
}

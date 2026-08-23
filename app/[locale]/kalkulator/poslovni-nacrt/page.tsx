import type { Metadata } from 'next';
import BusinessCanvasWorkspace from '@/components/BusinessCanvasWorkspace';
import DashboardSidebar from '@/components/DashboardSidebar';
import Zaklenjeno from '@/components/Zaklenjeno';
import { smePorabiti } from '@/lib/pravice';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';

export const metadata: Metadata = { title: 'Business Canvas in poslovni načrt | Pinart Flow', robots: { index: false, follow: false } };

export default async function BusinessPlanPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; const base = locale === 'sl' ? '' : `/${locale}`;
  /* Kljucavnica v meniju je videz; prava zascita je tu, na strezniku. */
  const sme = await smePorabiti('businessInsights');

  /* Naslov v urejevalniku pise komponenta sama, ker mora nad njim stati gumb
     "Vsi dokumenti" -- tako kot povsod drugod v Flowu je nazaj NAD naslovom.
     Zaklenjen primer naslov se vedno dobi tu, ker komponente sploh ni. */
  return <main className={styles.shell}><DashboardSidebar base={base} active="plan" /><section className={styles.workspace}>{sme ? <BusinessCanvasWorkspace /> : <><header className={styles.topbar}><div><p className={styles.eyebrow}>BUSINESS CANVAS</p><h1>{locale === 'en' ? 'Your business on one page.' : 'Posel na eni strani.'}</h1></div></header><Zaklenjeno funkcija="businessInsights" base={base} /></>}</section></main>;
}

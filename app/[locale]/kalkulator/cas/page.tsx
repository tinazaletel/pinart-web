import type { Metadata } from 'next';
import BusinessPlanWorkspace from '@/components/BusinessPlanWorkspace';
import DashboardSidebar from '@/components/DashboardSidebar';
import Zaklenjeno from '@/components/Zaklenjeno';
import { smePorabiti } from '@/lib/pravice';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';

export const metadata: Metadata = { title: 'Cena in čas | Pinart Flow', robots: { index: false, follow: false } };

export default async function TimePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; const base = locale === 'sl' ? '' : `/${locale}`;
  /* Kljucavnica v meniju je videz; prava zascita je tu, na strezniku.
     Stran NI vec cela zaklenjena: stoparica in danasnji vnosi so brezplacni,
     zaklenjena je analiza pod njimi. Sicer je merjenje teklo, klik nanj pa je
     pripeljal na cenik — slepa ulica. */
  const sme = await smePorabiti('businessInsights');

  return <main className={styles.shell}><DashboardSidebar base={base} active="time" /><section className={styles.workspace}><header className={styles.topbar}><div><p className={styles.eyebrow}>CENA &amp; ČAS</p><h1>Čas naj izboljša ceno.</h1></div></header><BusinessPlanWorkspace view="time" omejeno={!sme} />{!sme && <Zaklenjeno funkcija="businessInsights" base={base} />}</section></main>;
}

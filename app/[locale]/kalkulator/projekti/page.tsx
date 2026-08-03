import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import ArhivWorkspace from '@/components/ArhivWorkspace';
import DashboardSidebar from '@/components/DashboardSidebar';
import styles from '../pregled/pregled.module.css';

/* Za prijavo zaklenjena, personalizirana stran; workspace komponente uporabljajo
   useSearchParams(). force-dynamic preskoči statični prerender (sicer 'next build'
   pade z "useSearchParams() should be wrapped in a suspense boundary"). */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Arhiv | Pinart Flow', robots: { index: false, follow: false } };
export default async function ArhivPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; setRequestLocale(locale); const base = locale === 'sl' ? '' : `/${locale}`;
  /* ArhivWorkspace ima svojo glavo (kicker + Bodoni naslov) in ozadje kot retainer,
     zato tu ni topbar glave. Zavihek Projekti znotraj njega renderira ProjectsWorkspace. */
  return <main className={styles.shell}><DashboardSidebar base={base} active="projects" /><section className={styles.workspace}><ArhivWorkspace base={base} /></section></main>;
}

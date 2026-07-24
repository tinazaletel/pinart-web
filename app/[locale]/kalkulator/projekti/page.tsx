import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import ArhivWorkspace from '@/components/ArhivWorkspace';
import DashboardSidebar from '@/components/DashboardSidebar';
import styles from '../pregled/pregled.module.css';

export const metadata: Metadata = { title: 'Arhiv | Pinart Flow', robots: { index: false, follow: false } };
export default async function ArhivPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; setRequestLocale(locale); const base = locale === 'sl' ? '' : `/${locale}`;
  /* ArhivWorkspace ima svojo glavo (kicker + Bodoni naslov) in ozadje kot retainer,
     zato tu ni topbar glave. Zavihek Projekti znotraj njega renderira ProjectsWorkspace. */
  return <main className={styles.shell}><DashboardSidebar base={base} active="projects" /><section className={styles.workspace}><ArhivWorkspace base={base} /></section></main>;
}

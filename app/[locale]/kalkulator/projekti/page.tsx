import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import ProjectsWorkspace from '@/components/ProjectsWorkspace';
import DashboardHeaderTools from '@/components/DashboardHeaderTools';
import DashboardSidebar from '@/components/DashboardSidebar';
import styles from '../pregled/pregled.module.css';

export const metadata: Metadata = { title: 'Projekti in dokumenti | Pinart Flow', robots: { index: false, follow: false } };
export default async function ProjektiPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; setRequestLocale(locale); const base = locale === 'sl' ? '' : `/${locale}`;
  return <main className={styles.shell}><DashboardSidebar base={base} active="projects" /><section className={styles.workspace}><header className={styles.topbar}><div><p className={styles.eyebrow}>PROJEKTI IN DOKUMENTI</p><h1>Celotna zgodba projekta.</h1></div><DashboardHeaderTools /></header><ProjectsWorkspace base={base} /></section></main>;
}

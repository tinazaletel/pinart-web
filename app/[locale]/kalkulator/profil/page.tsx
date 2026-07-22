import type { Metadata } from 'next';
import DashboardSidebar from '@/components/DashboardSidebar';
import StoparicaBliznjica from '@/components/StoparicaBliznjica';
import ProfileWorkspace from '@/components/ProfileWorkspace';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';
export const metadata: Metadata = { title: 'Moj profil | Pinart Flow', robots: { index: false, follow: false } };
export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) { const { locale } = await params; const base = locale === 'sl' ? '' : `/${locale}`; return <main className={styles.shell}><DashboardSidebar base={base} active="profile" /><section className={styles.workspace}><header className={styles.topbar}><div><p className={styles.eyebrow}>MOJ PROFIL</p><h1>Enkrat vpišeš. Povsod velja.</h1></div><StoparicaBliznjica /></header><ProfileWorkspace base={base} /></section></main>; }

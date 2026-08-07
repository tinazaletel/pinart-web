import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import DashboardSidebar from '@/components/DashboardSidebar';
import SefAvtorstvaWorkspace from '@/components/SefAvtorstvaWorkspace';
import styles from '../pregled/pregled.module.css';

export const metadata: Metadata = { title: 'Sef avtorstva | Pinart Flow', robots: { index: false, follow: false } };

export default async function SefPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const base = locale === 'sl' ? '' : `/${locale}`;

  return (
    <main className={styles.shell}>
      <DashboardSidebar base={base} active="sef" />
      <section className={styles.workspace}>
        <header className={styles.topbar}>
          <div>
            <p className={styles.eyebrow}>{locale === 'en' ? 'AUTHORSHIP VAULT' : 'SEF AVTORSTVA'}</p>
            <h1>{locale === 'en' ? 'Proof that it is yours.' : 'Dokaz, da je tvoje.'}</h1>
          </div>
        </header>
        <SefAvtorstvaWorkspace base={base} />
      </section>
    </main>
  );
}

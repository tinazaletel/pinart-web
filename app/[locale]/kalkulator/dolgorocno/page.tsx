import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import RetainerWorkspace from '@/components/RetainerWorkspace';
import DashboardSidebar from '@/components/DashboardSidebar';
import { createClient } from '@/utils/supabase/server';
import styles from '../pregled/pregled.module.css';

export const metadata: Metadata = { title: 'Dolgoročno sodelovanje | Pinart', robots: { index: false, follow: false } };

export default async function DolgorocnoPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const base = locale === 'sl' ? '' : `/${locale}`;
  /* enako kot pri kalkulatorju: vpisan dobi Flow ogrodje, nevpisan svojo glavo */
  let vpisan = false;
  try {
    const { data } = await createClient().auth.getUser();
    vpisan = !!data.user;
  } catch { vpisan = false; }

  if (!vpisan) {
    return (
      <main style={{ minHeight: '100dvh' }}>
        <RetainerWorkspace base={base} />
      </main>
    );
  }

  return (
    <main className={styles.shell}>
      <DashboardSidebar base={base} active="overview" />
      <section className={styles.workspace}>
        <RetainerWorkspace base={base} vLupini />
      </section>
    </main>
  );
}

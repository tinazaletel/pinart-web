import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import KalkulatorApp from '@/components/KalkulatorApp';
import DashboardSidebar from '@/components/DashboardSidebar';
import { createClient } from '@/utils/supabase/server';
import styles from '../pregled/pregled.module.css';

export const metadata: Metadata = {
  title: 'Pinart kalkulator: orodje',
  description:
    'Izračunaj pošteno ceno za kreativno delo: izvedba, avtorske pravice, licenca in trije paketi ponudbe.',
  manifest: '/kalkulator-manifest.json',
  appleWebApp: {
    capable: true,
    title: 'Kalkulator',
    statusBarStyle: 'default',
  },
};

export default async function KalkulatorOrodjePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ od?: string }>;
}) {
  const { locale } = await params;
  const { od } = await searchParams;
  setRequestLocale(locale);

  const base = locale === 'sl' ? '' : `/${locale}`;
  /* Vpisan uporabnik: kalkulator je eno od orodij Flowa in nosi isto ogrodje.
     Nevpisan: samostojno orodje s svojo glavo — Flow menija zanj ni.
     ?od=flow (klik "Brezplačni kalkulator" z landinga) = marketinški/free vstop:
     VEDNO samostojen kalkulator brez app menija, tudi če je uporabnik vpisan. */
  const izLandinga = od === 'flow';
  let vpisan = false;
  try {
    const { data } = await createClient().auth.getUser();
    vpisan = !!data.user;
  } catch { vpisan = false; }

  if (!vpisan || izLandinga) {
    return (
      <main style={{ minHeight: '100dvh' }}>
        <KalkulatorApp locale={locale} />
      </main>
    );
  }

  return (
    <main className={styles.shell}>
      <DashboardSidebar base={base} active="offer" />
      <section className={styles.workspace}>
        {/* Glavo strani (nadnaslov/naslov/podnaslov) izrise KalkulatorApp:
            samo on ve, ali tece uvodni pogovor, ki ima svoj naslov. */}
        <KalkulatorApp locale={locale} vLupini />
      </section>
    </main>
  );
}

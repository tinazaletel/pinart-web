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
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const base = locale === 'sl' ? '' : `/${locale}`;
  /* Vpisan uporabnik: kalkulator je eno od orodij Flowa in nosi isto ogrodje.
     Nevpisan: samostojno orodje s svojo glavo — Flow menija zanj ni. */
  let vpisan = false;
  try {
    const { data } = await createClient().auth.getUser();
    vpisan = !!data.user;
  } catch { vpisan = false; }

  if (!vpisan) {
    return (
      <main style={{ minHeight: '100dvh' }}>
        <KalkulatorApp locale={locale} />
      </main>
    );
  }

  return (
    <main className={styles.shell}>
      <DashboardSidebar base={base} active="overview" />
      <section className={styles.workspace}>
        {/* Orodje v lupini svoje glave ne rise (da ne bi bili dve), zato jo mora
            dobiti stran — sicer ostane brez naslova, retainer pa ga ima. */}
        {/* z-index 2: .cw ima z-index 1 in njegovo ozadje (position:fixed, inset:0)
            prekrije vse v isti plasti — glava bi ostala pod njim. */}
        {/* Nadnaslov / naslov / podnaslov v isti meri kot retainer (.rw-kicker,
            .rw-h1, .rw-uvod), da sta orodji na pogled ista druzina. */}
        <header style={{
          position: 'relative', zIndex: 2,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          gap: '1.5rem', flexWrap: 'wrap',
          /* ista sirina in vodoravni odmik kot ".cw .oder", da glava sedi
             nad vsebino in ne ob njej */
          width: '100%', maxWidth: '1240px', marginInline: 'auto',
          paddingInline: 'clamp(1.2rem, 4vw, 3rem)',
          paddingTop: 'clamp(1.6rem, 4vw, 2.6rem)',
        }}>
          <div>
            <p style={{
              font: 'inherit', fontSize: '.78rem', fontWeight: 700, letterSpacing: '.2em',
              textTransform: 'uppercase', color: 'var(--accent)', margin: '0 0 .3rem',
            }}>Ponudba</p>
            <h1 style={{
              fontFamily: 'var(--font-serif), Didot, serif', fontWeight: 500,
              fontSize: 'clamp(2.4rem, 6vw, 4rem)', lineHeight: 1, letterSpacing: '-.012em',
              margin: '0 0 .6rem', color: 'var(--ink)',
            }}>Kalkulator ponudbe.</h1>
            <p style={{
              fontSize: '1rem', lineHeight: 1.55, color: 'rgba(17,17,17,.72)',
              margin: 0, maxWidth: '34rem',
            }}>Za enkraten projekt; izračuna <b>izvedbo</b>, <b>avtorske pravice</b> in <b>licenco</b> ter iz njih sestavi ponudbo v treh različicah.</p>
          </div>
        </header>
        <KalkulatorApp locale={locale} vLupini />
      </section>
    </main>
  );
}

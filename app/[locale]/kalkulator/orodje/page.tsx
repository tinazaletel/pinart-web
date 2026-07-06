import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import KalkulatorApp from '@/components/KalkulatorApp';

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

  return (
    <main style={{ minHeight: '100dvh' }}>
      <KalkulatorApp locale={locale} />
    </main>
  );
}

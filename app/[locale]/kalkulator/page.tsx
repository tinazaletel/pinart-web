import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import KalkulatorLanding from '@/components/KalkulatorLanding';

export const metadata: Metadata = {
  title: 'Pinart kalkulator: poštene cene za kreativce',
  description:
    'Brezplačen kalkulator poštenih cen za oblikovalce in kreativce: izvedba, avtorske pravice, licenca in trije paketi ponudbe, prilagojeno velikosti naročnika.',
  manifest: '/kalkulator-manifest.json',
  appleWebApp: {
    capable: true,
    title: 'Kalkulator',
    statusBarStyle: 'default',
  },
};

export default async function KalkulatorPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main style={{ minHeight: '100dvh' }}>
      <KalkulatorLanding locale={locale} />
    </main>
  );
}

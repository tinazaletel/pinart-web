import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import FlowLanding from '@/components/FlowLanding';

/* Predstavitev celotnega paketa Pinart Flow. Namenjeno domeni
   pinartflow.com/ (glej opombo o preusmeritvi ob deployu). */
export const metadata: Metadata = {
  title: 'Pinart Flow — vse tvoje poslovanje na enem mestu',
  description:
    'Pinart Flow poveže kalkulator poštenih cen, ponudbe, pogodbe, retainerje, račune, stroške, stranke in cilje v eno delovno okolje za samostojne kreativce. Kalkulator je brezplačen.',
};

export default async function FlowPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main style={{ minHeight: '100dvh' }}>
      <FlowLanding locale={locale} />
    </main>
  );
}

import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { valutaZaDrzavo } from '@/lib/cenaNarocnine';
import { setRequestLocale } from 'next-intl/server';
import FlowNav from '@/components/FlowNav';
import FlowLanding from '@/components/FlowLanding';

/* Predstavitev celotnega paketa Pinart Flow. Namenjeno domeni
   pinartflow.com/ (glej opombo o preusmeritvi ob deployu). */
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return locale === 'en'
    ? {
        title: 'Pinart Flow — your whole creative business in one place',
        description: 'Fair pricing, proposals, contracts, invoices, projects, clients and goals in one workspace for independent creatives. The calculator is free.',
      }
    : {
        title: 'Pinart Flow — vse tvoje poslovanje na enem mestu',
        description: 'Pinart Flow poveže kalkulator poštenih cen, ponudbe, pogodbe, retainerje, račune, stroške, stranke in cilje v eno delovno okolje za samostojne kreativce. Kalkulator je brezplačen.',
      };
}

export default async function FlowPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  /* Cenik v dolarjih vidi obiskovalec iz ZDA (glava ponudnika gostovanja).
     Ce glave ni — lokalni razvoj, drug ponudnik — ostanejo evri. */
  const drzava = (await headers()).get('x-vercel-ip-country');
  const valuta = valutaZaDrzavo(drzava);

  return (
    <main style={{ minHeight: '100dvh' }}>
      <FlowNav locale={locale} />
      <FlowLanding locale={locale} valuta={valuta} />
    </main>
  );
}

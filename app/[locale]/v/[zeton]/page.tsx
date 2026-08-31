import type { Metadata } from 'next';
import VprasalnikOgled from '@/components/VprasalnikOgled';

/* Stran, ki jo izpolni STRANKA. Brez prijave, brez menija, brez Pupe.
   Iskalnikom je zaprta: povezava je zasebna, čeprav je ni za geslom. */
export const metadata: Metadata = {
  title: 'Vprašalnik | Pinart Flow',
  robots: { index: false, follow: false, nocache: true },
};

export default async function Stran({ params }: { params: Promise<{ locale: string; zeton: string }> }) {
  const { locale, zeton } = await params;
  return <VprasalnikOgled zeton={zeton} jeEn={locale === 'en'} />;
}

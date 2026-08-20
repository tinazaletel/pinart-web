import type { Metadata } from 'next';
import PortalOgled from '@/components/PortalOgled';

/* Stran, ki jo vidi STRANKA. Brez prijave, brez menija, brez Pupe — samo projekt.
   Iskalnikom je zaprta: povezava je zasebna, čeprav je ni za geslom. */
export const metadata: Metadata = {
  title: 'Projekt | Pinart Flow',
  robots: { index: false, follow: false, nocache: true },
};

export default async function Stran({ params }: { params: Promise<{ zeton: string }> }) {
  const { zeton } = await params;
  return <PortalOgled zeton={zeton} />;
}

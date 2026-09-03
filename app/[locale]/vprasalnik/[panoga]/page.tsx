import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import VprasalnikPanoge from '@/components/VprasalnikPanoge';
import { PANOGE, panogaZa } from '@/lib/vprasalnikPanoge';

export const dynamic = 'force-static';

export function generateStaticParams() {
  return PANOGE.flatMap(p => [{ locale: 'sl', panoga: p.id }, { locale: 'en', panoga: p.id }]);
}

export async function generateMetadata(
  { params }: { params: Promise<{ locale: string; panoga: string }> },
): Promise<Metadata> {
  const { locale, panoga } = await params;
  const p = panogaZa(panoga);
  const ime = p ? (locale === 'en' ? p.imeEn : p.ime) : '';
  return {
    title: `${ime} — vprašalnik o cenah | Pinart Flow`,
    /* Vprasalnik je namenjen ljudem, ki jim Tina poslje povezavo, ne iskalnikom.
       Odgovori so obcutljivi (prave cene), zato strani ne indeksiramo. */
    robots: { index: false, follow: false },
  };
}

export default async function VprasalnikStran(
  { params }: { params: Promise<{ locale: string; panoga: string }> },
) {
  const { locale, panoga } = await params;
  setRequestLocale(locale);
  const p = panogaZa(panoga);
  if (!p) notFound();
  return <main><VprasalnikPanoge panoga={p} jeEn={locale === 'en'} /></main>;
}

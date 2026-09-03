import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import VprasalnikPanoge from '@/components/VprasalnikPanoge';
import { PANOGE, panogaZa } from '@/lib/vprasalnikPanoge';
import { karticaVprasalnika } from '@/lib/vprasalnikKartica';

export const dynamic = 'force-static';

export function generateStaticParams() {
  return PANOGE.flatMap(p => [{ locale: 'sl', panoga: p.id }, { locale: 'en', panoga: p.id }]);
}

export async function generateMetadata(
  { params }: { params: Promise<{ locale: string; panoga: string }> },
): Promise<Metadata> {
  const { locale, panoga } = await params;
  const p = panogaZa(panoga);
  const jeEn = locale === 'en';
  const ime = p ? (jeEn ? p.imeEn : p.ime) : '';
  return karticaVprasalnika(
    jeEn,
    jeEn ? `${ime} — pricing questionnaire · Pinart Flow` : `${ime} — vprašalnik o cenah · Pinart Flow`,
    `/vprasalnik/${panoga}`,
  );
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

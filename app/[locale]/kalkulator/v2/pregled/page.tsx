import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import FlowV2Shell from '@/components/FlowV2Shell';
import PupaDom from '@/components/PupaDom';

export const metadata: Metadata = { title: 'Pregled | Pinart Flow', robots: { index: false, follow: false } };

export default async function NoviPregled({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const base = locale === 'sl' ? '' : `/${locale}`;
  const jeEn = locale === 'en';
  return (
    <FlowV2Shell base={base} active="pregled" eyebrow={jeEn ? 'OVERVIEW' : 'PREGLED'} naslov={jeEn ? 'What do you need today?' : 'Kaj potrebuješ danes?'} opis={jeEn ? 'Start with a conversation or choose a quick action.' : 'Začni s pogovorom ali izberi hitro dejanje.'}>
      <PupaDom base={base} />
    </FlowV2Shell>
  );
}

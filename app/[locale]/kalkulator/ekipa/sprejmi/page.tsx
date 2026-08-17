import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import SprejmiVabilo from '@/components/SprejmiVabilo';

export const metadata: Metadata = {
  title: 'Sprejem vabila | Pinart Flow',
  robots: { index: false, follow: false },
};

/* useSearchParams (token) -> stran mora biti dinamicna (glej ostale Flow strani). */
export const dynamic = 'force-dynamic';

export default async function SprejmiPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const base = locale === 'sl' ? '' : `/${locale}`;
  return <SprejmiVabilo base={base} />;
}

import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import RetainerWorkspace from '@/components/RetainerWorkspace';

export const metadata: Metadata = { title: 'Dolgoročno sodelovanje | Pinart', robots: { index: false, follow: false } };

export default async function DolgorocnoPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const base = locale === 'sl' ? '' : `/${locale}`;
  return (
    <main style={{ minHeight: '100dvh' }}>
      <RetainerWorkspace base={base} />
    </main>
  );
}

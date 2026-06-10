import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { routing, type Locale } from '@/i18n/routing';
import { fontVariables } from '@/lib/fonts';
import SmoothScroll from '@/components/SmoothScroll';
import Nav from '@/components/Nav';
import Preloader from '@/components/Preloader';
import CursorBlob from '@/components/CursorBlob';
import SectionDots from '@/components/SectionDots';
import FloatingUI from '@/components/FloatingUI';
import PageTransition from '@/components/PageTransition';
import '../globals.css';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return {
    title: t('title'),
    description: t('description')
  };
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as Locale)) notFound();

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} className={fontVariables}>
      <body className="bg-paper text-ink antialiased">
        <NextIntlClientProvider messages={messages}>
          <Preloader />
          <SmoothScroll>
            <Nav />
            {children}
          </SmoothScroll>
          <div className="grain pointer-events-none fixed inset-0 z-[100]" aria-hidden />
          <SectionDots />
          <FloatingUI />
          <PageTransition />
          <CursorBlob />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

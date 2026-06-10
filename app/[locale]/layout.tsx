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
  const title = t('title');
  const description = t('description');
  const url = `https://pinart.si/${locale}`;

  return {
    title,
    description,
    metadataBase: new URL('https://pinart.si'),
    alternates: {
      canonical: url,
      languages: {
        'sl': 'https://pinart.si/sl',
        'en': 'https://pinart.si/en',
      },
    },
    openGraph: {
      title,
      description,
      url,
      siteName: 'Pinart',
      locale: locale === 'sl' ? 'sl_SI' : 'en_US',
      type: 'website',
      images: [
        {
          url: '/og-image.jpg',
          width: 1200,
          height: 630,
          alt: 'Pinart — Studio za kreativno direkcijo in branding',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og-image.jpg'],
    },
    icons: {
      icon: '/Logos/Logo_pinart.svg',
      apple: '/Logos/Logo_pinart.svg',
    },
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

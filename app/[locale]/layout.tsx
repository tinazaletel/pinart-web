import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { routing, type Locale } from '@/i18n/routing';
import { fontVariables } from '@/lib/fonts';
import SmoothScroll from '@/components/SmoothScroll';
import Nav from '@/components/Nav';
import Preloader from '@/components/Preloader';
import SectionDots from '@/components/SectionDots';
import FloatingUI from '@/components/FloatingUI';
import PageTransition from '@/components/PageTransition';
import CookieBanner from '@/components/CookieBanner';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import '../globals.css';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// viewport-fit=cover so section backgrounds fill edge-to-edge in landscape on
// notched phones (otherwise the safe-area insets leave cream bars on the sides).
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

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
    icons: {
      icon: '/favicon.png',
      apple: '/favicon.png',
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
          url: `https://pinart.si/og-image.jpg`,
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
      images: [`https://pinart.si/og-image.jpg`],
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
      <head>
        {/* Run before hydration: stop the browser restoring scroll and force the top.
            Otherwise sections briefly sit at a restored scroll position while the
            heading-reveal observers initialise → reveals misfire ("titles don't
            animate after a normal refresh"). */}
        <script
          dangerouslySetInnerHTML={{
            __html: "try{history.scrollRestoration='manual';window.scrollTo(0,0);}catch(e){}",
          }}
        />
      </head>
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
          <CookieBanner />
          <GoogleAnalytics />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

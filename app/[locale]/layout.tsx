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
  const tMeta = await getTranslations({ locale, namespace: 'meta' });

  // Structured data so Google understands Pinart as a creative studio
  // (shows richer results; harmless if ignored).
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: 'Pinart',
    url: `https://pinart.si/${locale}`,
    image: 'https://pinart.si/og-image.jpg',
    description: tMeta('description'),
    email: 'tina@pinart.si',
    founder: { '@type': 'Person', name: 'Tina' },
    areaServed: 'SI',
    knowsAbout: [
      'branding',
      'celostna grafična podoba',
      'grafično oblikovanje',
      'kreativna direkcija',
      'oblikovanje spletnih strani',
    ],
  };

  return (
    // suppressHydrationWarning: inline skripta v <head> doda data-cookie-consent
    // na <html> pred hidracijo — React tega atributa ne pozna in bi sicer javil
    // laznjivo neujemanje. Velja samo za atribute tega elementa.
    <html lang={locale} className={fontVariables} suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Run before hydration: stop the browser restoring scroll and force the top.
            Otherwise sections briefly sit at a restored scroll position while the
            heading-reveal observers initialise → reveals misfire ("titles don't
            animate after a normal refresh"). */}
        <script
          dangerouslySetInnerHTML={{
            __html: "try{history.scrollRestoration='manual';window.scrollTo(0,0);}catch(e){}",
          }}
        />
        {/* Run before paint: cookie banner je v streznikovem HTML-ju (da ne
            caka na JavaScript — bil je LCP element pri 8s na mobile), zato
            se za obiskovalce, ki so ze odgovorili, skrije se PRED izrisom
            (CSS pravilo za data-cookie-consent v globals.css). */}
        <script
          dangerouslySetInnerHTML={{
            __html: "try{if(localStorage.getItem('pinart_cookie_consent'))document.documentElement.setAttribute('data-cookie-consent','')}catch(e){}",
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

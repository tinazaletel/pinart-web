import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { routing, type Locale } from '@/i18n/routing';
import PetrolPayCase from '@/components/sections/cases/PetrolPayCase';
import MBillsCase from '@/components/sections/cases/MBillsCase';
import Lucky7Case from '@/components/sections/cases/Lucky7Case';
import MollyLollyCase from '@/components/sections/cases/MollyLollyCase';
import BackButton from '@/components/BackButton';

type CaseContent = {
  title: string;
  category: string;
  desc: string;
};

const CASES: Record<string, CaseContent> = {
  'petrol-pay': {
    title: 'Petrol Pay',
    category: 'Payment · Loyalty Experience · Card design · Web Portal',
    desc: "A premium payment-and-loyalty card scheme for Slovenia's largest fuel retailer — logo, brand book, six card proposals, and a responsive ordering portal."
  },
  mbills: {
    title: 'mBills',
    category: 'Branding · UX/UI · Cards · TV & Print · Photography',
    desc: "A five-year partnership with Slovenia's leading mobile wallet — award-winning UX/UI, brand refresh, a family of cards, and the redesign that never shipped."
  },
  'lucky-7': {
    title: 'Lucky 7',
    category: 'Visual design · UX/UI · Motion direction',
    desc: 'From a basic web page to a gaming experience that calls the player in — moodboards, mobile + desktop UI, and motion direction for Eloterija.'
  },
  'molly-lolly': {
    title: 'Molly Lolly',
    category: 'Brand creator · Illustration · Product · Web',
    desc: "A storytelling children's brand: books, sticker workbooks, plush toy, AR app, and an e-shop — all designed in-house at Pinart."
  }
};

export function generateStaticParams() {
  const slugs = Object.keys(CASES);
  return routing.locales.flatMap((locale) =>
    slugs.map((slug) => ({ locale, slug }))
  );
}

async function BackToWork({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'projects' });
  return (
    <BackButton
      fallbackHref={`/${locale}/#work`}
      className="font-sans uppercase"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.6rem',
        padding: '0.85rem 1.6rem',
        borderRadius: '999px',
        border: '1px solid rgba(17,17,17,0.42)',
        color: 'var(--ink, #111)',
        fontSize: '0.74rem',
        fontWeight: 600,
        letterSpacing: '0.22em',
        textDecoration: 'none',
        background: 'rgba(245,242,234,0.6)',
        backdropFilter: 'blur(8px)'
      }}
    >
      ← {t('backToWork')}
    </BackButton>
  );
}

export default async function WorkCaseStudyPage({
  params
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!routing.locales.includes(locale as Locale)) notFound();
  setRequestLocale(locale);

  const content = CASES[slug];
  if (!content) notFound();

  const t = await getTranslations({ locale, namespace: 'projects' });

  // Render the full case study for projects that already have one.
  // Stub for the rest until their dedicated component lands.
  const FULL_CASE: Record<string, JSX.Element> = {
    'petrol-pay': <PetrolPayCase locale={locale} />,
    mbills: <MBillsCase locale={locale} />,
    'lucky-7': <Lucky7Case locale={locale} />,
    'molly-lolly': <MollyLollyCase locale={locale} />
  };

  return (
    <>
      {/* Back to work — in document flow so it never overlaps content.
          Sits between the fixed Nav and the case-study hero. */}
      <div
        style={{
          background: 'var(--paper, #F5F2EA)',
          padding: 'clamp(5.5rem, 8vw, 8rem) clamp(1.5rem, 3vw, 3rem) 0'
        }}
      >
        <BackToWork locale={locale} />
      </div>

      {FULL_CASE[slug] ?? (
        <main
          style={{
            minHeight: '100vh',
            background: 'var(--paper, #F5F2EA)',
            color: 'var(--ink, #111)',
            padding: 'clamp(8rem,12vw,12rem) clamp(2rem,5vw,4rem) clamp(6rem,10vw,10rem)'
          }}
        >
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <p
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '12px',
                letterSpacing: '0.4em',
                textTransform: 'uppercase',
                color: 'rgba(17,17,17,0.55)',
                marginBottom: '32px',
                fontWeight: 500
              }}
            >
              {t('caseStudyEyebrow').split('·')[0]}· <span style={{ color: '#b25476', fontWeight: 600 }}>{t('caseStudyEyebrow').split('· ')[1]}</span>
            </p>

            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'clamp(4rem, 12vw, 11rem)',
                lineHeight: 0.88,
                letterSpacing: '-0.035em',
                fontWeight: 500,
                color: 'var(--ink)'
              }}
            >
              {content.title}
              <em style={{ fontStyle: 'italic', fontWeight: 400, color: '#b25476' }}>.</em>
            </h1>

            <p
              style={{
                marginTop: '40px',
                fontFamily: 'var(--font-sans)',
                fontSize: '13px',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: 'rgba(17,17,17,0.65)',
                fontWeight: 500
              }}
            >
              {content.category}
            </p>

            <p
              style={{
                marginTop: '32px',
                maxWidth: '720px',
                fontFamily: 'var(--font-serif)',
                fontStyle: 'italic',
                fontSize: 'clamp(20px, 1.7vw, 28px)',
                lineHeight: 1.4,
                color: 'rgba(17,17,17,0.78)',
                fontWeight: 400
              }}
            >
              {content.desc}
            </p>

            <div
              style={{
                marginTop: 'clamp(6rem, 10vw, 9rem)',
                padding: 'clamp(2.5rem, 4vw, 4rem)',
                borderRadius: '4px',
                background: 'rgba(17,17,17,0.06)',
                border: '1px solid rgba(17,17,17,0.1)',
                fontFamily: 'var(--font-serif)',
                fontStyle: 'italic',
                fontSize: '20px',
                color: 'rgba(17,17,17,0.7)',
                lineHeight: 1.5
              }}
            >
              Full case study coming soon.
            </div>

            <div style={{ marginTop: 'clamp(4rem, 8vw, 7rem)' }}>
              <BackToWork locale={locale} />
            </div>
          </div>
        </main>
      )}
    </>
  );
}

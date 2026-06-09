import { notFound } from 'next/navigation';
import Link from 'next/link';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { routing, type Locale } from '@/i18n/routing';
import CircularText from '@/components/CircularText';
import RevealOnScroll from '@/components/RevealOnScroll';
import BlurText from '@/components/BlurText';
import BackButton from '@/components/BackButton';

const SERVICE_SLUGS = ['direction', 'branding', 'graphic', 'marketing', 'web', 'ideas'] as const;
type ServiceSlug = (typeof SERVICE_SLUGS)[number];

const SERVICE_NUM: Record<ServiceSlug, string> = {
  direction: '01',
  branding:  '02',
  graphic:   '03',
  marketing: '04',
  web:       '05',
  ideas:     '06',
};

// Per-service ring text for the hero spin-mark (paired with the wink GIF).
const HERO_SPIN_TEXT: Record<ServiceSlug, string> = {
  direction: 'VISION*STORY*DIRECTION*',
  branding:  'BRAND*IDENTITY*SOUL*',
  graphic:   'PRINT*CRAFT*DESIGN*',
  marketing: 'REACH*ENGAGE*GROW*',
  web:       'DESIGN*BUILD*LAUNCH*',
  ideas:     'IDEATE*EXPLORE*MAKE*'
};

// Related-work items per service: a case-study link OR a standalone media
// card (used when there is real work to show but no dedicated case study
// page yet — the card has no "view →" affordance).
type RelatedItem =
  | { kind: 'case'; slug: string; image: string }
  | {
      kind: 'media';
      title: string;
      meta?: string;
      image?: string;
      video?: string;
      /** Fill card with object-fit: cover (slight crop) instead of contain. */
      cover?: boolean;
    };

const CASE_IMAGE: Record<string, string> = {
  'petrol-pay': '/work/petrol-pay/Petrol_Pay_loyalty_gold.jpg',
  'mbills': '/work/mbills/mBills_wallet_prezentation-scaled.jpg',
  'molly-lolly': '/work/molly-lolly/Molly_Lolly_knjigice.png'
};

const RELATED_WORK: Record<ServiceSlug, RelatedItem[]> = {
  direction: [
    // hero-level pearl/shell shot for the direction page
    { kind: 'case', slug: 'petrol-pay', image: '/work/petrol-pay/Petrol_Pay_Business_silver.jpg' },
    { kind: 'case', slug: 'molly-lolly', image: CASE_IMAGE['molly-lolly'] },
    { kind: 'case', slug: 'mbills', image: CASE_IMAGE['mbills'] }
  ],
  branding: [
    { kind: 'case', slug: 'petrol-pay', image: CASE_IMAGE['petrol-pay'] },
    { kind: 'case', slug: 'molly-lolly', image: CASE_IMAGE['molly-lolly'] },
    { kind: 'case', slug: 'mbills', image: CASE_IMAGE['mbills'] }
  ],
  graphic: [
    { kind: 'case', slug: 'molly-lolly', image: CASE_IMAGE['molly-lolly'] },
    // override default app/wallet image with the printed poster, which is
    // the right graphic-design example for mBills.
    { kind: 'case', slug: 'mbills', image: '/more_work/Mbills_adds/70x100_mBills.png' }
  ],
  marketing: [
    // override the default mBills image with the printed ads composition,
    // which better represents the marketing work rather than app/wallet UI.
    { kind: 'case', slug: 'mbills', image: '/more_work/Mbills_adds/70x100_mBills.png' },
    {
      kind: 'media',
      title: 'Vse storitve',
      meta: 'Marketing · In-store',
      image: '/more_work/Vsestoritve/vsestoritve_stojnica.png'
    },
    {
      kind: 'media',
      title: 'Petrol',
      meta: 'Marketing · LCD telopi',
      video: '/more_work/Petrol_adds/petrol_telop_web.mp4',
      image: '/more_work/Petrol_adds/oglas_petrol.jpg'
    }
  ],
  web: [
    {
      kind: 'media',
      title: 'Universum',
      meta: 'Web',
      video: '/more_work/Universum/universum_web.mp4',
      image: '/more_work/Universum/Universum_web.png',
      cover: true
    },
    {
      kind: 'media',
      title: 'Izzi konferenca',
      meta: 'Web · Event microsite',
      video: '/more_work/Izzikonferenca/konferenca-izzirokus_web.mp4',
      image: '/more_work/Izzikonferenca/izzi_rokus_konferenca-scaled.jpg'
    },
    {
      kind: 'media',
      title: 'Combisafe',
      meta: 'Web · Shopify',
      video: '/more_work/combisafe/combisafe_web.mp4'
    }
  ],
  ideas: [
    { kind: 'case', slug: 'molly-lolly', image: CASE_IMAGE['molly-lolly'] },
    {
      kind: 'media',
      title: 'Ribbon Lips',
      meta: 'CGP · Produkt',
      image: '/more_work/RibbonLips/1920x1080_header_ribbon_lips.png'
    },
    { kind: 'case', slug: 'mbills', image: CASE_IMAGE['mbills'] }
  ]
};

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    SERVICE_SLUGS.map((slug) => ({ locale, slug }))
  );
}

export default async function ServiceDetailPage({
  params
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!routing.locales.includes(locale as Locale)) notFound();
  if (!SERVICE_SLUGS.includes(slug as ServiceSlug)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'serviceDetail' });
  const ts = await getTranslations({ locale, namespace: 'services' });
  const tw = await getTranslations({ locale, namespace: 'moreWork' });

  const steps = ['01', '02', '03', '04'] as const;
  const reasons = ['01', '02', '03'] as const;
  const related = RELATED_WORK[slug as ServiceSlug];

  return (
    <main
      style={{
        background: 'var(--paper, #F5F2EA)',
        color: 'var(--ink, #111)',
        fontFamily: 'var(--font-sans)',
        paddingBottom: 'clamp(6rem, 10vw, 10rem)'
      }}
    >
      {/* ── Top wrapper — back-button + hero share one clipping container
            so the pupa illustration can extend up across both without being
            cut off above the hero. */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        {/* Pupa halftone — sits behind the back button + hero together */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/pupa_404_bg_dark.svg"
          alt=""
          aria-hidden
          draggable={false}
          style={{
            position: 'absolute',
            top: '18%',
            right: '-14%',
            height: 'clamp(100rem, 240vh, 170rem)',
            width: 'auto',
            opacity: 0.24,
            pointerEvents: 'none',
            userSelect: 'none',
            zIndex: 0
          }}
        />

        {/* Back to services ─ in flow, below the fixed Nav */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            padding: 'clamp(5.5rem, 8vw, 8rem) clamp(1.5rem, 3vw, 3rem) 0'
          }}
        >
          <BackButton
            fallbackHref={`/${locale}/#services`}
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
            ← {t('back')}
          </BackButton>
        </div>

      {/* ============ HERO ============ */}
      <section
        style={{
          position: 'relative',
          padding: 'clamp(4rem, 8vw, 8rem) clamp(1.5rem, 3vw, 3rem) clamp(8rem, 16vw, 14rem)',
          minHeight: 'clamp(38rem, 60vh, 56rem)'
        }}
      >
        <RevealOnScroll style={{ position: 'relative', zIndex: 1 }}>
          <p
            style={{
              fontSize: 12,
              letterSpacing: '0.4em',
              textTransform: 'uppercase',
              color: 'rgba(17,17,17,0.55)',
              marginBottom: 32,
              fontWeight: 500
            }}
          >
            {ts('kicker')} · {SERVICE_NUM[slug as ServiceSlug]} ·{' '}
            <span style={{ color: '#b25476', fontWeight: 600 }}>{ts(`items.${slug}.title`)}</span>
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 'clamp(1.5rem, 3vw, 3rem)',
              flexWrap: 'wrap'
            }}
          >
            <BlurText
              tag="h1"
              text={`${ts(`items.${slug}.title`)}.`}
              animateBy="words"
              direction="bottom"
              delay={120}
              stepDuration={0.45}
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'clamp(3.5rem, 12vw, 11rem)',
                lineHeight: 0.88,
                letterSpacing: '-0.035em',
                fontWeight: 500,
                margin: 0,
                flex: '1 1 auto'
              }}
            />

            {/* Spin mark + winks GIF, paired with the title */}
            <div
              className="service-hero-spin"
              style={{
                position: 'relative',
                flex: '0 0 auto',
                width: 'clamp(8rem,14vw,13rem)',
                height: 'clamp(8rem,14vw,13rem)',
                display: 'grid',
                placeItems: 'center',
                marginBottom: 'clamp(0.5rem, 1vw, 1.2rem)'
              }}
            >
              <CircularText
                text={HERO_SPIN_TEXT[slug as ServiceSlug]}
                spinDuration={26}
                onHover="speedUp"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/magnific_e-winks-she-laughs-and-spins-386-around-like-she-i_seedance_480p_16-9_24fps_67623-2-2-2.gif"
                alt=""
                aria-hidden
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: '72%',
                  aspectRatio: '1',
                  transform: 'translate(-50%, -50%)',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  pointerEvents: 'none',
                  zIndex: 0
                }}
              />
            </div>
          </div>

          <p
            style={{
              marginTop: 32,
              maxWidth: 720,
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontSize: 'clamp(20px, 1.7vw, 28px)',
              lineHeight: 1.4,
              color: 'rgba(17,17,17,0.78)',
              fontWeight: 400
            }}
          >
            {t(`${slug}.lede`)}
          </p>
        </RevealOnScroll>
      </section>
      </div>

      {/* ============ PROCESS ============ */}
      <RevealOnScroll as="section"
        style={{
          padding: 'clamp(4rem, 6vw, 6rem) clamp(1.5rem, 3vw, 3rem)',
          borderTop: '1px solid rgba(17,17,17,0.12)'
        }}
      >
        <p
          style={{
            fontSize: 12,
            letterSpacing: '0.4em',
            textTransform: 'uppercase',
            color: 'rgba(17,17,17,0.55)',
            marginBottom: 24,
            fontWeight: 500
          }}
        >
          <span style={{ color: '#b25476', fontWeight: 600 }}>02</span> ·{' '}
          {t('processLabel')}
        </p>
        <h2
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
            lineHeight: 0.98,
            letterSpacing: '-0.025em',
            fontWeight: 500,
            margin: 0
          }}
        >
          {t(`${slug}.processTitle`)}
        </h2>

        <ol
          style={{
            listStyle: 'none',
            margin: '4rem 0 0',
            padding: 0,
            display: 'grid',
            gap: 'clamp(1.5rem, 2.5vw, 2.25rem)',
            maxWidth: 900
          }}
        >
          {steps.map((n) => (
            <li
              key={n}
              style={{
                display: 'grid',
                gridTemplateColumns: '60px 1fr',
                gap: 28,
                paddingBottom: 'clamp(1.5rem, 2.5vw, 2rem)',
                borderBottom: '1px solid rgba(17,17,17,0.1)'
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontStyle: 'italic',
                  fontSize: 22,
                  color: '#b25476',
                  fontWeight: 500
                }}
              >
                {n}
              </div>
              <div>
                <h3
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 'clamp(1.3rem, 2vw, 1.7rem)',
                    fontWeight: 500,
                    margin: 0,
                    lineHeight: 1.15
                  }}
                >
                  {t(`${slug}.steps.${n}.title`)}
                </h3>
                <p
                  style={{
                    marginTop: 10,
                    fontSize: 15,
                    color: 'rgba(17,17,17,0.7)',
                    lineHeight: 1.55,
                    maxWidth: 560
                  }}
                >
                  {t(`${slug}.steps.${n}.desc`)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </RevealOnScroll>

      {/* ============ WHY ME ============ */}
      <RevealOnScroll as="section"
        style={{
          padding: 'clamp(4rem, 6vw, 6rem) clamp(1.5rem, 3vw, 3rem)',
          background: 'var(--paper-warm, #ECE6D5)',
          borderTop: '1px solid rgba(17,17,17,0.12)'
        }}
      >
        <p
          style={{
            fontSize: 12,
            letterSpacing: '0.4em',
            textTransform: 'uppercase',
            color: 'rgba(17,17,17,0.55)',
            marginBottom: 24,
            fontWeight: 500
          }}
        >
          <span style={{ color: '#b25476', fontWeight: 600 }}>03</span> ·{' '}
          {t('whyLabel')}
        </p>
        <h2
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
            lineHeight: 0.98,
            letterSpacing: '-0.025em',
            fontWeight: 500,
            margin: 0
          }}
        >
          {t(`${slug}.whyTitle`)}
        </h2>

        <ul
          style={{
            listStyle: 'none',
            margin: '4rem 0 0',
            padding: 0,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 'clamp(1.5rem, 2.5vw, 2.5rem)',
            maxWidth: 1100
          }}
        >
          {reasons.map((n) => (
            <li
              key={n}
              style={{
                background: 'var(--paper, #F5F2EA)',
                borderRadius: 4,
                padding: 'clamp(1.5rem, 2vw, 2rem)',
                border: '1px solid rgba(17,17,17,0.1)'
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontStyle: 'italic',
                  fontSize: 18,
                  color: '#b25476',
                  fontWeight: 500,
                  marginBottom: 14
                }}
              >
                {n}
              </div>
              <h3
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 'clamp(1.2rem, 1.8vw, 1.5rem)',
                  fontWeight: 500,
                  margin: 0,
                  lineHeight: 1.2
                }}
              >
                {t(`${slug}.reasons.${n}.title`)}
              </h3>
              <p
                style={{
                  marginTop: 12,
                  fontSize: 15,
                  color: 'rgba(17,17,17,0.7)',
                  lineHeight: 1.55
                }}
              >
                {t(`${slug}.reasons.${n}.desc`)}
              </p>
            </li>
          ))}
        </ul>
      </RevealOnScroll>

      {/* ============ RELATED WORK ============ */}
      {related.length > 0 && (
        <RevealOnScroll as="section"
          style={{
            padding: 'clamp(4rem, 6vw, 6rem) clamp(1.5rem, 3vw, 3rem)',
            borderTop: '1px solid rgba(17,17,17,0.12)'
          }}
        >
          <p
            style={{
              fontSize: 12,
              letterSpacing: '0.4em',
              textTransform: 'uppercase',
              color: 'rgba(17,17,17,0.55)',
              marginBottom: 24,
              fontWeight: 500
            }}
          >
            <span style={{ color: '#b25476', fontWeight: 600 }}>04</span> ·{' '}
            {t('workLabel')}
          </p>
          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
              lineHeight: 0.98,
              letterSpacing: '-0.025em',
              fontWeight: 500,
              margin: 0
            }}
          >
            {t('workTitle')}
          </h2>

          <div
            style={{
              marginTop: '4rem',
              display: 'grid',
              // cap each card at ~440px so a single-item grid doesn't stretch
              // across the full viewport (e.g., /services/ideas with one card).
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 440px))',
              gap: 'clamp(1rem, 1.5vw, 1.5rem)'
            }}
          >
            {related.map((item, i) => {
              if (item.kind === 'case') {
                const workSlug = item.slug;
                const title = tw(`items.${workSlug === 'petrol-pay' ? 'petrolPortal' : workSlug === 'lucky-7' ? 'lucky7' : workSlug === 'molly-lolly' ? 'mollyLolly' : workSlug}.title`);
                return (
                  <Link
                    key={workSlug}
                    href={`/${locale}/work/${workSlug}`}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      borderRadius: 4,
                      overflow: 'hidden',
                      background: 'var(--paper-warm, #ECE6D5)',
                      color: 'var(--ink)',
                      textDecoration: 'none',
                      border: '1px solid rgba(17,17,17,0.08)',
                      transition: 'transform .2s ease, background .2s ease'
                    }}
                  >
                    <div
                      style={{
                        position: 'relative',
                        width: '100%',
                        aspectRatio: '16 / 10',
                        background: '#f0eadd',
                        overflow: 'hidden'
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.image}
                        alt={title}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block'
                        }}
                      />
                    </div>
                    <div style={{ padding: 'clamp(1.25rem, 1.6vw, 1.6rem)' }}>
                      <div
                        style={{
                          fontSize: 11,
                          letterSpacing: '0.3em',
                          textTransform: 'uppercase',
                          color: 'rgba(17,17,17,0.5)',
                          marginBottom: 12,
                          fontWeight: 500
                        }}
                      >
                        Case study
                      </div>
                      <div
                        style={{
                          fontFamily: 'var(--font-serif)',
                          fontSize: 'clamp(1.4rem, 2vw, 1.9rem)',
                          lineHeight: 1.1,
                          fontWeight: 500
                        }}
                      >
                        {title}
                        <em style={{ fontStyle: 'italic', fontWeight: 400, color: '#b25476' }}>
                          .
                        </em>
                      </div>
                      <div
                        style={{
                          marginTop: 18,
                          fontSize: 12,
                          letterSpacing: '0.2em',
                          textTransform: 'uppercase',
                          color: 'rgba(17,17,17,0.55)',
                          fontWeight: 600
                        }}
                      >
                        View →
                      </div>
                    </div>
                  </Link>
                );
              }

              // Standalone media card — no link, no "view →".
              return (
                <div
                  key={`media-${i}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 4,
                    overflow: 'hidden',
                    background: 'var(--paper-warm, #ECE6D5)',
                    border: '1px solid rgba(17,17,17,0.08)'
                  }}
                >
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      aspectRatio: '16 / 9',
                      background: '#000',
                      overflow: 'hidden'
                    }}
                  >
                    {item.video ? (
                      <video
                        src={item.video}
                        poster={item.image}
                        autoPlay
                        muted
                        loop
                        playsInline
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: item.cover ? 'cover' : 'contain',
                          display: 'block'
                        }}
                      />
                    ) : item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image}
                        alt={item.title}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block'
                        }}
                      />
                    ) : null}
                  </div>
                  <div style={{ padding: 'clamp(1.25rem, 1.6vw, 1.6rem)' }}>
                    {item.meta && (
                      <div
                        style={{
                          fontSize: 11,
                          letterSpacing: '0.3em',
                          textTransform: 'uppercase',
                          color: 'rgba(17,17,17,0.5)',
                          marginBottom: 12,
                          fontWeight: 500
                        }}
                      >
                        {item.meta}
                      </div>
                    )}
                    <div
                      style={{
                        fontFamily: 'var(--font-serif)',
                        fontSize: 'clamp(1.4rem, 2vw, 1.9rem)',
                        lineHeight: 1.1,
                        fontWeight: 500
                      }}
                    >
                      {item.title}
                      <em style={{ fontStyle: 'italic', fontWeight: 400, color: '#b25476' }}>
                        .
                      </em>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </RevealOnScroll>
      )}

      {/* ============ CTA ============ */}
      <RevealOnScroll as="section"
        style={{
          padding: 'clamp(6rem, 10vw, 10rem) clamp(1.5rem, 3vw, 3rem)',
          background: 'var(--ink, #111)',
          color: 'var(--paper, #F5F2EA)',
          textAlign: 'left'
        }}
      >
        <p
          style={{
            fontSize: 12,
            letterSpacing: '0.4em',
            textTransform: 'uppercase',
            color: 'rgba(245,242,234,0.55)',
            marginBottom: 24,
            fontWeight: 500
          }}
        >
          {t('ctaLabel')}
        </p>

        {/* Heading + animated spin/GIF mark on the right */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'clamp(1.5rem, 3vw, 3rem)',
            flexWrap: 'wrap'
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(3rem, 8vw, 6.5rem)',
              lineHeight: 0.95,
              fontWeight: 500,
              margin: 0,
              color: 'var(--paper)',
              flex: '1 1 auto'
            }}
          >
            {t('ctaTitle')}
          </h2>

          <div
            style={{
              position: 'relative',
              flex: '0 0 auto',
              width: 'clamp(8rem,14vw,13rem)',
              height: 'clamp(8rem,14vw,13rem)',
              display: 'grid',
              placeItems: 'center'
            }}
          >
            <CircularText
              text="LET'S*CREATE*SOMETHING*"
              spinDuration={22}
              onHover="speedUp"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/magnific_the-girl-is-working-on-the-laptop-and-at-the-end-s_seedance_480p_16-9_24fps_67587.gif"
              alt=""
              aria-hidden
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '72%',
                aspectRatio: '1',
                transform: 'translate(-50%, -50%)',
                borderRadius: '50%',
                objectFit: 'cover',
                pointerEvents: 'none',
                zIndex: 0
              }}
            />
          </div>
        </div>

        <Link
          href={`/${locale}/#footer`}
          className="font-sans uppercase"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            marginTop: 40,
            padding: '0.95rem 2rem',
            border: '1px solid rgba(245,242,234,0.55)',
            borderRadius: 999,
            color: 'var(--paper, #F5F2EA)',
            fontSize: 13,
            letterSpacing: '0.22em',
            fontWeight: 600,
            textDecoration: 'none'
          }}
        >
          {t('ctaButton')} <span aria-hidden="true">→</span>
        </Link>
      </RevealOnScroll>
    </main>
  );
}

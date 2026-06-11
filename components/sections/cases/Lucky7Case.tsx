'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import CaseShell, { NextCase } from './CaseShell';
import BlurText from '@/components/BlurText';

// Cycles through an array of screen sources every `interval` ms with a soft
// crossfade. Used inside the laptop / phone mockups below.
function ScreenCycler({
  sources,
  interval = 3200,
  alt,
  style
}: {
  sources: string[];
  interval?: number;
  alt: string;
  style?: React.CSSProperties;
}) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (sources.length < 2) return;
    const id = window.setInterval(() => {
      setI((prev) => (prev + 1) % sources.length);
    }, interval);
    return () => window.clearInterval(id);
  }, [sources.length, interval]);

  return (
    <div style={{ position: 'absolute', inset: 0, ...style }}>
      {sources.map((src, idx) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt={alt}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            opacity: idx === i ? 1 : 0,
            transition: 'opacity 700ms ease'
          }}
        />
      ))}
    </div>
  );
}

const LAPTOP_SCREENS = [
  '/work/lucky-7/desktop_wheel.jpg',
  '/work/lucky-7/desktop_gameplay.jpg',
  '/work/lucky-7/desktop_win.jpg'
];
const PHONE_SCREENS = [
  '/work/lucky-7/mobile_intro.png',
  '/work/lucky-7/mobile_gameplay.jpg',
  '/work/lucky-7/mobile_win.png'
];

// Rich-text formatters shared across t.rich() calls.
const rich = {
  em: (chunks: React.ReactNode) => <em>{chunks}</em>,
  strong: (chunks: React.ReactNode) => <strong>{chunks}</strong>,
  br: () => <br />
};

export default function Lucky7Case({ locale }: { locale: string }) {
  const t = useTranslations('cases.lucky7');
  return (
    <CaseShell>
      <section className="case-hero">
        <div>
          <p className="eyebrow">{t('heroEyebrow')}</p>
          <BlurText
            tag="h1"
            className="case-title"
            text={t('heroTitle')}
            animateBy="words"
            direction="bottom"
            delay={120}
            stepDuration={0.45}
          />
        </div>

        <div className="case-hero__bottom">
          <p className="case-lede">{t.rich('heroLede', rich)}</p>
          <div className="case-meta-inline">
            <div>
              {t('metaRoleLabel')} <span>{t('metaRoleValue')}</span>
            </div>
            <div>
              {t('metaYearLabel')} <span>{t('metaYearValue')}</span>
            </div>
            <div>
              {t('metaForLabel')} <span>{t('metaForValue')}</span>
            </div>
          </div>
        </div>

        <div className="case-hero__visual">
          <video src="/work/lucky-7/loop.mp4" autoPlay muted loop playsInline />
        </div>
      </section>

      <section className="case-section">
        <div className="two-col">
          <div>
            <p className="head-label">
              <span className="head-label__num">02</span> · {t('briefLabel')}
            </p>
            <h2 className="head-title">{t.rich('briefTitle', rich)}</h2>
          </div>
          <div>
            <div style={{ fontSize: 18, lineHeight: 1.65, color: 'var(--ink-soft)', maxWidth: 640 }}>
              <p style={{ margin: 0 }}>{t.rich('briefBody1', rich)}</p>
              <p style={{ marginTop: 20 }}>{t('briefBody2')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* PRODUCT — desktop + mobile */}
      <section
        className="case-section"
        style={{ background: 'var(--ink, #111)', color: 'var(--paper, #F5F2EA)' }}
      >
        <div style={{ maxWidth: 800 }}>
          <p className="head-label" style={{ color: 'rgba(245,242,234,0.55)' }}>
            <span className="head-label__num">03</span> · {t('productLabel')}
          </p>
          <h2 className="head-title" style={{ color: 'var(--paper, #F5F2EA)' }}>
            {t.rich('productTitle', rich)}
          </h2>
          <p className="lede" style={{ color: 'rgba(245,242,234,0.7)' }}>
            {t('productLede')}
          </p>
        </div>

        {/* Laptop + Phone mockups, screens cycle inside each */}
        <div
          className="lucky7-devices"
          style={{
            display: 'grid',
            gridTemplateColumns: '1.7fr 1fr',
            gap: 24,
            marginTop: 48,
            alignItems: 'end',
            maxWidth: 1180
          }}
        >
          {/* Laptop frame */}
          <div className="device-laptop">
            <div className="device-laptop__lid">
              <div className="device-laptop__bezel">
                <div className="device-laptop__screen">
                  <ScreenCycler sources={LAPTOP_SCREENS} alt="Lucky 7 — desktop screen" />
                </div>
              </div>
            </div>
            <div className="device-laptop__base" />
            <div className="tile-cap">{t('productDesktopCap')}</div>
          </div>

          {/* Phone frame */}
          <div className="device-phone-wrap">
            <div className="device-phone">
              <div className="device-phone__notch" />
              <div className="device-phone__screen">
                <ScreenCycler sources={PHONE_SCREENS} alt="Lucky 7 — mobile screen" />
              </div>
            </div>
            <div className="tile-cap">{t('productMobileCap')}</div>
          </div>
        </div>

        <style jsx>{`
          .device-laptop { position: relative; }
          .device-laptop__lid {
            background: #1c1c1c;
            border-radius: 14px 14px 4px 4px;
            padding: 12px 12px 14px;
            box-shadow: 0 30px 60px rgba(0,0,0,0.45);
          }
          .device-laptop__bezel {
            background: #000;
            border-radius: 6px;
            padding: 2px;
          }
          .device-laptop__screen {
            position: relative;
            width: 100%;
            aspect-ratio: 16 / 9;
            border-radius: 4px;
            overflow: hidden;
            background: #0a0a0a;
          }
          .device-laptop__base {
            position: relative;
            width: 112%;
            height: 14px;
            margin: 0 -6% 0;
            background: linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 60%, #0e0e0e 100%);
            border-radius: 0 0 12px 12px;
            box-shadow: 0 14px 24px rgba(0,0,0,0.35);
          }
          .device-laptop__base::before {
            content: '';
            position: absolute;
            left: 50%;
            top: 0;
            transform: translateX(-50%);
            width: 18%;
            height: 5px;
            background: #0a0a0a;
            border-radius: 0 0 8px 8px;
          }

          .device-phone-wrap { display: flex; flex-direction: column; align-items: center; }
          .device-phone {
            position: relative;
            width: 78%;
            aspect-ratio: 9 / 19.5;
            background: #0c0c0c;
            border-radius: 38px;
            padding: 10px;
            box-shadow: 0 30px 60px rgba(0,0,0,0.45),
                        inset 0 0 0 2px rgba(255,255,255,0.05);
          }
          .device-phone__notch {
            position: absolute;
            top: 18px;
            left: 50%;
            transform: translateX(-50%);
            width: 36%;
            height: 22px;
            background: #000;
            border-radius: 14px;
            z-index: 2;
          }
          .device-phone__screen {
            position: relative;
            width: 100%;
            aspect-ratio: 9 / 19.5;
            border-radius: 28px;
            overflow: hidden;
            background: #0a0a0a;
          }
          .tile-cap {
            margin-top: 14px;
            font-family: var(--font-sans);
            font-size: 12px;
            letter-spacing: 0.24em;
            text-transform: uppercase;
            color: rgba(245,242,234,0.55);
            font-weight: 500;
            text-align: center;
          }
          @media (max-width: 680px) {
            :global(.lucky7-devices) {
              grid-template-columns: 1fr !important;
              gap: 36px !important;
              align-items: stretch !important;
            }
            .device-phone-wrap { align-self: center; max-width: 70%; width: 70%; }
          }
        `}</style>
      </section>

      {/* DESIGN EXPLORATION — 3 directions */}
      <section className="case-section">
        <div style={{ maxWidth: 900, marginBottom: '2.5rem' }}>
          <p className="head-label">
            <span className="head-label__num">04</span> · {t('explorationLabel')}
          </p>
          <h2 className="head-title">
            {t.rich('explorationTitle', rich)}
          </h2>
          <p className="lede">
            {t.rich('explorationLede', rich)}
          </p>
        </div>
        <figure
          style={{
            margin: 0,
            borderRadius: 18,
            overflow: 'hidden',
            background: '#1a1626',
            boxShadow: '0 24px 60px rgba(0,0,0,0.35)'
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/work/lucky-7/lucky_7_primeri.jpg"
            alt={t('explorationCap')}
            style={{ display: 'block', width: '100%', height: 'auto' }}
          />
        </figure>
        <figcaption
          style={{
            marginTop: '1rem',
            fontSize: '0.78rem',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'rgba(17,17,17,0.55)'
          }}
        >
          {t('explorationCap')}
        </figcaption>
      </section>

      {/* MOTION CALLOUT */}
      <section
        className="case-section"
        style={{
          background:
            'linear-gradient(135deg, #001632 0%, #003B7A 60%, #0a2255 100%)',
          color: 'var(--paper, #F5F2EA)'
        }}
      >
        <div style={{ maxWidth: 900 }}>
          <p className="head-label" style={{ color: 'rgba(245,242,234,0.55)' }}>
            <span className="head-label__num" style={{ color: '#FFD200' }}>05</span> · {t('motionLabel')}
          </p>
          <h2 className="head-title" style={{ color: 'var(--paper, #F5F2EA)' }}>
            {t.rich('motionTitle', {
              em: (chunks) => (
                <em
                  style={{
                    background:
                      'linear-gradient(135deg, #FFD200 0%, #fff7c2 100%)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}
                >
                  {chunks}
                </em>
              )
            })}
          </h2>
          <p className="lede" style={{ color: 'rgba(245,242,234,0.85)' }}>
            {t.rich('motionLede', rich)}
          </p>
        </div>
      </section>

      <section className="stats">
        <div>
          <div className="stats__num">4</div>
          <div className="stats__label">{t('statMoodboardsLabel')}</div>
          <div className="stats__desc">{t('statMoodboardsDesc')}</div>
        </div>
        <div>
          <div className="stats__num">2</div>
          <div className="stats__label">{t('statPlatformsLabel')}</div>
          <div className="stats__desc">{t('statPlatformsDesc')}</div>
        </div>
        <div>
          <div className="stats__num">6</div>
          <div className="stats__label">{t('statMonthsLabel')}</div>
          <div className="stats__desc">{t('statMonthsDesc')}</div>
        </div>
        <div>
          <div className="stats__num">1</div>
          <div className="stats__label">{t('statDirectionLabel')}</div>
          <div className="stats__desc">{t('statDirectionDesc')}</div>
        </div>
      </section>

      <NextCase href={`/${locale}/work/molly-lolly`} title={t.raw('nextCaseTitle')} />
    </CaseShell>
  );
}

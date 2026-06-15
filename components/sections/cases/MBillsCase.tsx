'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import CaseShell, { NextCase } from './CaseShell';
import BlurText from '@/components/BlurText';

const rich = {
  em: (chunks: React.ReactNode) => <em>{chunks}</em>,
  strong: (chunks: React.ReactNode) => <strong>{chunks}</strong>,
  br: () => <br />
};

export default function MBillsCase({ locale }: { locale: string }) {
  const t = useTranslations('cases.mbills');
  return (
    <CaseShell>
      {/* ============ HERO ============ */}
      <section className="case-hero">
        <div>
          <p className="eyebrow">{t('heroEyebrow')}</p>
          <BlurText
            tag="h1"
            className="case-title"
            text={t('heroTitle')}
            animateBy="letters"
            direction="bottom"
            delay={50}
            stepDuration={0.45}
          />
        </div>

        <div className="case-hero__bottom">
          <p className="case-lede">{t.rich('heroLede', rich)}</p>
          <div className="case-meta-inline">
            <div>{t('metaRoleLabel')} <span>{t('metaRoleValue')}</span></div>
            <div>{t('metaYearsLabel')} <span>{t('metaYearsValue')}</span></div>
            <div>{t('metaForLabel')} <span>{t('metaForValue')}</span></div>
          </div>
        </div>

        <div className="case-hero__visual" style={{ aspectRatio: '21/9' }}>
          <Image src="/work/mbills/mBills_wallet_prezentation-scaled.jpg" alt="mBills wallet — brand presentation" width={2560} height={1706} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div className="tile-cap" style={{ left: 24, bottom: 24 }}>
            {t('heroVisualCap')}
          </div>
        </div>
      </section>

      {/* ============ INTRO ============ */}
      <section className="case-section">
        <div className="two-col">
          <div>
            <p className="head-label">
              <span className="head-label__num">02</span> · {t('relationshipLabel')}
            </p>
            <h2 className="head-title">{t.rich('relationshipTitle', rich)}</h2>
          </div>
          <div>
            <div style={{ fontSize: 18, lineHeight: 1.65, color: 'var(--ink-soft)', maxWidth: 640 }}>
              <p style={{ margin: 0 }}>{t.rich('relationshipBody1', rich)}</p>
              <p style={{ marginTop: 20 }}>{t.rich('relationshipBody2', rich)}</p>
              <p style={{ marginTop: 20 }}>{t.rich('relationshipBody3', rich)}</p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '32px 40px',
                marginTop: 48,
                paddingTop: 32,
                borderTop: '1px solid var(--line)',
                maxWidth: 640
              }}
            >
              <Meta label={t('metaCellRoleLabel')}>
                {t.rich('metaCellRoleValue', rich)}
              </Meta>
              <Meta label={t('metaCellYearsLabel')} sub={t('metaCellYearsSub')}>
                {t('metaCellYearsValue')}
              </Meta>
              <Meta label={t('metaCellForLabel')} sub={t('metaCellForSub')}>
                {t('metaCellForValue')}
              </Meta>
              <Meta label={t('metaCellRecognitionLabel')} sub={t('metaCellRecognitionSub')}>
                {t('metaCellRecognitionValue')}
              </Meta>
            </div>
          </div>
        </div>
      </section>

      {/* ============ TIMELINE ============ */}
      <section className="case-section" style={{ background: 'var(--paper-warm)' }}>
        <div style={{ maxWidth: 700, marginBottom: 60 }}>
          <p className="head-label">
            <span className="head-label__num">03</span> · {t('timelineLabel')}
          </p>
          <h2 className="head-title">{t.rich('timelineTitle', rich)}</h2>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 24,
            position: 'relative'
          }}
          className="mbills-timeline"
        >
          <TimelineItem year={t('timeline1Year')} title={t('timeline1Title')} desc={t('timeline1Desc')} accent />
          <TimelineItem year={t('timeline2Year')} title={t('timeline2Title')} desc={t('timeline2Desc')} />
          <TimelineItem year={t('timeline3Year')} title={t('timeline3Title')} desc={t('timeline3Desc')} />
          <TimelineItem year={t('timeline4Year')} title={t('timeline4Title')} desc={t('timeline4Desc')} />
          <TimelineItem year={t('timeline5Year')} title={t('timeline5Title')} desc={t('timeline5Desc')} accent />
        </div>

        <style jsx>{`
          @media (max-width: 980px) {
            .mbills-timeline {
              grid-template-columns: 1fr 1fr !important;
              gap: 24px !important;
            }
          }
        `}</style>
      </section>

      {/* ============ CHAPTER I — 2019 AWARD ============ */}
      <section className="case-section">
        <div style={{ marginBottom: 50, maxWidth: 900 }}>
          <p className="head-label">
            <span className="head-label__num">04</span> · {t('chapter1Label')}
          </p>
          <h2 className="head-title">{t.rich('chapter1Title', rich)}</h2>
          <p className="lede">{t.rich('chapter1Lede', rich)}</p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 1fr',
            gap: 24
          }}
          className="mbills-ch1"
        >
          <div className="tile" style={{ aspectRatio: '4/3' }}>
            <Image src="/work/mbills/mBills_phone_hand.jpg" alt="mBills wallet — in hand" width={2500} height={1549} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div className="tile-cap">{t('chapter1TileCap')}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div
              style={{
                color: 'var(--paper, #F5F2EA)',
                padding: '36px 32px',
                borderRadius: 4,
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                backgroundImage:
                  'linear-gradient(90deg, rgba(17,17,17,0.78) 0%, rgba(17,17,17,0.55) 55%, rgba(17,17,17,0.15) 100%),' +
                  'url("/work/mbills/mBills_fintech_awards.jpg")',
                backgroundSize: 'cover',
                backgroundPosition: 'center right'
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: '0.4em',
                  textTransform: 'uppercase',
                  color: 'rgba(245,242,234,0.5)',
                  fontWeight: 500,
                  marginBottom: 16
                }}
              >
                {t('awardRecognition')}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 'clamp(2rem, 3.5vw, 3rem)',
                  lineHeight: 1,
                  fontWeight: 500,
                  marginBottom: 14,
                  WebkitTextStroke: '0.3px rgba(245,242,234,0.88)'
                }}
              >
                FinTech{' '}
                <em
                  style={{
                    fontStyle: 'italic',
                    fontWeight: 400,
                    background: 'linear-gradient(135deg,#c16784,#b25476)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    WebkitTextStroke: '0.3px #c16784'
                  }}
                >
                  Award
                </em>
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontStyle: 'italic',
                  fontSize: 17,
                  color: 'rgba(245,242,234,0.75)',
                  lineHeight: 1.5
                }}
              >
                {t('awardSub')}
              </div>
            </div>

            <div
              style={{
                background: 'var(--paper-warm)',
                padding: '36px 32px 32px',
                borderRadius: 4,
                position: 'relative'
              }}
            >
              <div
                aria-hidden
                style={{
                  position: 'absolute',
                  top: 4,
                  left: 18,
                  fontFamily: 'var(--font-serif)',
                  fontStyle: 'italic',
                  fontSize: 68,
                  lineHeight: 1,
                  color: 'var(--accent)'
                }}
              >
                “
              </div>
              <div
                style={{
                  paddingLeft: 26,
                  fontFamily: 'var(--font-serif)',
                  fontStyle: 'italic',
                  fontSize: 20,
                  lineHeight: 1.4,
                  color: 'var(--ink)'
                }}
              >
                {t('awardQuote')}
              </div>
              <div
                style={{
                  paddingLeft: 26,
                  marginTop: 20,
                  fontSize: 11,
                  letterSpacing: '0.25em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                  fontWeight: 500
                }}
              >
                {t('awardQuoteAuthor')}
              </div>
            </div>
          </div>
        </div>

        <style jsx>{`
          @media (max-width: 980px) {
            .mbills-ch1 { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </section>

      {/* ============ CHAPTER II — BRAND REFRESH ============ */}
      <section className="case-section">
        <div style={{ marginBottom: 50, maxWidth: 900 }}>
          <p className="head-label">
            <span className="head-label__num">05</span> · {t('chapter2Label')}
          </p>
          <h2 className="head-title">{t.rich('chapter2Title', rich)}</h2>
          <p className="lede">{t('chapter2Lede')}</p>
        </div>
        <PhoneEvolution evoLabels={{
          first: t('phoneEvo1Year'),
          reskin: t('phoneEvo2Year'),
          newDesign: t('phoneEvo3Year')
        }} />
      </section>

      {/* ============ CHAPTER II.5 — MARKETING ============ */}
      <section className="case-section" style={{ background: 'var(--paper-warm)' }}>
        <div style={{ marginBottom: 50, maxWidth: 900 }}>
          <p className="head-label">
            <span className="head-label__num">06</span> · {t('marketingLabel')}
          </p>
          <h2 className="head-title">{t.rich('marketingTitle', rich)}</h2>
          <p className="lede">{t.rich('marketingLede', rich)}</p>
        </div>

        <div className="grid-3">
          <MarketingCard
            label={t('marketing1Label')}
            title={t.rich('marketing1Title', rich)}
            desc={t('marketing1Desc')}
            dark
            img="/work/mbills/TV_commercials.jpg"
          />
          <MarketingCard
            label={t('marketing2Label')}
            title={t.rich('marketing2Title', rich)}
            desc={t('marketing2Desc')}
            imgs={[
              '/work/mbills/Outdoor%26Prints.jpg',
              '/work/mbills/Outdoor%26Prints_1.jpg',
              '/work/mbills/Outdoor%26Prints_2.jpg',
              '/work/mbills/brosura_mbills_1.jpg',
              '/work/mbills/Brosura_mBills_2.jpg'
            ]}
          />
          <MarketingCard
            label={t('marketing3Label')}
            title={t.rich('marketing3Title', rich)}
            desc={t('marketing3Desc')}
            red
            imgs={[
              '/work/mbills/Photo_direction_0.jpg',
              '/work/mbills/photo_direction.jpg',
              '/work/mbills/photo_direction_1.jpg',
              '/work/mbills/photo_direction_2.jpg',
              '/work/mbills/photo_direction_3.jpg'
            ]}
          />
        </div>
      </section>

      {/* ============ CHAPTER III — CARDS ============ */}
      <section
        className="case-section"
        style={{ background: 'var(--ink, #111)', color: 'var(--paper, #F5F2EA)' }}
      >
        <div style={{ maxWidth: 900 }}>
          <p className="head-label" style={{ color: 'rgba(245,242,234,0.55)' }}>
            <span className="head-label__num" style={{ color: 'rgba(245,242,234,0.85)' }}>07</span> · {t('cardsLabel')}
          </p>
          <h2 className="head-title" style={{ color: 'var(--paper, #F5F2EA)' }}>
            {t.rich('cardsTitle', rich)}
          </h2>
          <p className="lede" style={{ color: 'rgba(245,242,234,0.7)' }}>
            {t('cardsLede')}
          </p>
        </div>

        <div className="grid-4">
          <CardTile name={t.rich('card1Name', rich)} meta={t('card1Meta')} img="/work/mbills/card_mBills.png" bg="linear-gradient(135deg,#1e3a8a 0%,#06b6d4 100%)" />
          <CardTile name={t('card2Name')} meta={t('card2Meta')} svg="/work/mbills/spaycy_logo.svg" bg="linear-gradient(135deg,#0f172a 0%,#7209b7 100%)" />
          <CardTile name={t('card3Name')} meta={t('card3Meta')} img="/work/mbills/card_wish.png" bg="linear-gradient(135deg,#00ff88 0%,#ffd60a 100%)" />
          <CardTile name={t('card4Name')} meta={t('card4Meta')} img="/work/mbills/card_vibe.png" bg="linear-gradient(135deg,#ff006e 0%,#00f5ff 100%)" glow />
        </div>

        {/* CROWN — Wish & Vibe story */}
        <div
          style={{
            marginTop: 64,
            padding: 'clamp(2.5rem,5vw,4rem)',
            borderRadius: 6,
            background:
              'linear-gradient(135deg, #000 0%, #1a0a1a 50%, #001a1a 100%)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(circle at 20% 30%, rgba(255,0,110,0.25), transparent 50%), radial-gradient(circle at 80% 70%, rgba(0,245,255,0.25), transparent 50%)'
            }}
          />
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 48,
              alignItems: 'center'
            }}
            className="mbills-crown"
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: '0.4em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.6)',
                  marginBottom: 18,
                  fontWeight: 500
                }}
              >
                {t('crownLabel')}
              </div>
              <h3
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 'clamp(2.2rem, 4vw, 3.5rem)',
                  lineHeight: 1,
                  fontWeight: 500,
                  color: 'var(--paper, #F5F2EA)',
                  margin: 0
                }}
              >
                {t.rich('crownTitle', {
                  em: (c) => (
                    <em style={{ fontStyle: 'italic', fontWeight: 400, color: '#ff5ca0' }}>
                      {c}
                    </em>
                  )
                })}
              </h3>
              <p
                style={{
                  marginTop: 20,
                  fontFamily: 'var(--font-serif)',
                  fontStyle: 'italic',
                  fontSize: 20,
                  lineHeight: 1.55,
                  color: 'rgba(245,242,234,0.85)'
                }}
              >
                {t.rich('crownBody', {
                  em: (c) => <em>{c}</em>,
                  strong: (c) => (
                    <strong style={{ color: '#fff', fontStyle: 'normal' }}>{c}</strong>
                  )
                })}
              </p>
            </div>
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/work/mbills/card_wish%26vibe_1.png"
                alt="Wish + Vibe — comic packaging, glow-in-the-dark"
                loading="lazy"
                style={{
                  width: '100%',
                  filter:
                    'drop-shadow(0 0 60px rgba(80,255,140,0.45)) drop-shadow(0 0 100px rgba(40,140,255,0.35))'
                }}
              />
            </div>
          </div>

          <style jsx>{`
            @media (max-width: 780px) {
              .mbills-crown { grid-template-columns: 1fr !important; gap: 32px !important; }
            }
          `}</style>
        </div>
      </section>

      {/* ============ CHAPTER III.5 — WEB ============ */}
      <section className="case-section">
        <div style={{ maxWidth: 800 }}>
          <p className="head-label">
            <span className="head-label__num">08</span> · {t('webLabel')}
          </p>
          <h2 className="head-title">{t.rich('webTitle', rich)}</h2>
          <p className="lede">{t('webLede')}</p>
        </div>

        <div
          className="mbills-web-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 'clamp(1rem, 2vw, 2rem)',
            marginTop: 32
          }}
        >
          <LaptopShowcase
            src="/work/mbills/portal_mbills_screen.jpg"
            label={t('webPortal1Label')}
            tileBg="linear-gradient(135deg, #e8edf3 0%, #c9d2dd 100%)"
          />
          <LaptopShowcase
            src="/work/mbills/portal_wish_screen.jpg"
            label={t('webPortal2Label')}
            tileBg="linear-gradient(135deg, #d4f5e0 0%, #8ec5a3 100%)"
          />
        </div>
      </section>

      {/* ============ CHAPTER IV — 2024 WALLET ============ */}
      <section
        className="case-section"
        style={{ background: 'var(--ink, #111)', color: 'var(--paper, #F5F2EA)' }}
      >
        <div style={{ maxWidth: 900, marginBottom: 48 }}>
          <p className="head-label" style={{ color: 'rgba(245,242,234,0.55)' }}>
            <span className="head-label__num" style={{ color: 'rgba(245,242,234,0.85)' }}>09</span> · {t('chapter4Label')}
          </p>
          <h2 className="head-title" style={{ color: 'var(--paper, #F5F2EA)' }}>
            {t.rich('chapter4Title', rich)}
          </h2>
          <p className="lede" style={{ color: 'rgba(245,242,234,0.7)' }}>
            {t.rich('chapter4Lede', rich)}
          </p>
        </div>

        <div
          className="tile tile--wide"
          style={{ aspectRatio: '16/9', position: 'relative' }}
        >
          <Image src="/work/mbills/mBills_app.jpg" alt="mBills 2024 wallet — never shipped" width={2500} height={2000} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div
            style={{
              position: 'absolute',
              bottom: 24,
              left: 24,
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontSize: 22,
              color: 'var(--paper, #F5F2EA)',
              maxWidth: 480,
              lineHeight: 1.4,
              textShadow: '0 2px 12px rgba(0,0,0,0.6)'
            }}
          >
            “{t('chapter4Quote')}”
          </div>
        </div>

        <div
          style={{
            marginTop: 64,
            paddingTop: 48,
            borderTop: '1px solid rgba(245,242,234,0.15)',
            display: 'grid',
            gridTemplateColumns: '1fr 1.5fr',
            gap: 48,
            alignItems: 'start'
          }}
          className="mbills-epitaph"
        >
          <div
            style={{
              fontSize: 11,
              letterSpacing: '0.4em',
              textTransform: 'uppercase',
              color: 'var(--accent)',
              fontWeight: 600
            }}
          >
            {t('epitaphLabel')}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontSize: 'clamp(20px,1.8vw,28px)',
              lineHeight: 1.5,
              color: 'rgba(245,242,234,0.85)'
            }}
          >
            {t.rich('epitaphBody', {
              em: (c) => <em>{c}</em>,
              strong: (c) => <strong style={{ fontStyle: 'normal' }}>{c}</strong>
            })}
          </div>
        </div>

        <style jsx>{`
          @media (max-width: 780px) {
            .mbills-epitaph { grid-template-columns: 1fr !important; gap: 24px !important; }
          }
        `}</style>
      </section>

      {/* ============ STATS ============ */}
      <section className="stats">
        <div>
          <div className="stats__num">5</div>
          <div className="stats__label">{t('statYearsLabel')}</div>
          <div className="stats__desc">{t('statYearsDesc')}</div>
        </div>
        <div>
          <div className="stats__num">4</div>
          <div className="stats__label">{t('statCardsLabel')}</div>
          <div className="stats__desc">{t('statCardsDesc')}</div>
        </div>
        <div>
          <div className="stats__num">3</div>
          <div className="stats__label">{t('statRedesignsLabel')}</div>
          <div className="stats__desc">{t('statRedesignsDesc')}</div>
        </div>
        <div>
          <div className="stats__num">1</div>
          <div className="stats__label">{t('statAwardLabel')}</div>
          <div className="stats__desc">{t('statAwardDesc')}</div>
        </div>
      </section>

      <NextCase href={`/${locale}/work/lucky-7`} title={t.raw('nextCaseTitle')} />
    </CaseShell>
  );
}

// ---------- small inline helpers ----------

function Meta({
  label,
  sub,
  children
}: {
  label: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          marginBottom: 8,
          fontWeight: 500
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 20,
          lineHeight: 1.35,
          color: 'var(--ink)',
          fontWeight: 500
        }}
      >
        {children}
        {sub && (
          <em
            style={{
              fontStyle: 'italic',
              fontSize: 15,
              color: 'var(--muted)',
              display: 'block',
              marginTop: 4,
              fontWeight: 400
            }}
          >
            {sub}
          </em>
        )}
      </div>
    </div>
  );
}

function TimelineItem({
  year,
  title,
  desc,
  accent
}: {
  year: string;
  title: string;
  desc: string;
  accent?: boolean;
}) {
  return (
    <div>
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: accent ? '#b25476' : 'var(--ink)',
          marginBottom: 16
        }}
      />
      <div
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 26,
          fontWeight: 500,
          marginBottom: 8,
          ...(accent && {
            background: 'linear-gradient(135deg,#c16784,#b25476)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontStyle: 'italic'
          })
        }}
      >
        {year}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-condensed, var(--font-sans))',
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--ink)',
          marginBottom: 6
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: 13,
          color: 'var(--muted)',
          lineHeight: 1.5,
          maxWidth: 220
        }}
        dangerouslySetInnerHTML={{ __html: desc }}
      />
    </div>
  );
}

// ─── Phone evolution mockup ─────────────────────────────────────────────
// Single CSS-drawn iPhone-style frame cycling through the wallet
// design milestones. Each slot can be a still image or an MP4 loop.

type EvoSlot =
  | { kind: 'img'; src: string; year: string }
  | { kind: 'video'; src: string; year: string };

type EvoSlotTile = EvoSlot & { tileBg: string; year: string };

function buildEvoSlots(labels: { first: string; reskin: string; newDesign: string }): EvoSlotTile[] {
  return [
    {
      kind: 'img',
      src: '/work/mbills/mBills_homescreen_first.png',
      year: labels.first,
      tileBg: 'linear-gradient(135deg, #e8edf3 0%, #c9d2dd 100%)'
    },
    {
      kind: 'img',
      src: '/work/mbills/mBills_homescreen_old.jpg',
      year: labels.reskin,
      tileBg: 'linear-gradient(135deg, #cfe6f5 0%, #87b7d8 100%)'
    },
    {
      kind: 'video',
      src: '/work/mbills/wallet_screen_new_web.mp4',
      year: labels.newDesign,
      tileBg: 'linear-gradient(135deg, #1a1f3a 0%, #0a0c1a 100%)'
    }
  ];
}

function PhoneTile({ slot, flip }: { slot: EvoSlotTile; flip?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 14
      }}
    >
      {/* Square showcase tile */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '1 / 1',
          background: slot.tileBg,
          borderRadius: 8,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          perspective: '1600px',
          boxShadow: '0 20px 40px rgba(17,17,17,0.08)'
        }}
      >
        {/* Subtle radial light spot for 3D feel */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 35% 25%, rgba(255,255,255,0.22), transparent 55%)',
            pointerEvents: 'none'
          }}
        />
        {/* The 3D-tilted phone */}
        <div
          style={{
            position: 'relative',
            width: '42%',
            aspectRatio: '9 / 19.5',
            background: '#0c0c0c',
            borderRadius: 26,
            padding: 6,
            transform: 'none',
            boxShadow:
              '0 28px 50px rgba(0,0,0,0.32), 0 10px 20px rgba(0,0,0,0.22), inset 0 0 0 1.5px rgba(255,255,255,0.06)'
          }}
        >
          {/* Notch */}
          <div
            style={{
              position: 'absolute',
              top: 12,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '36%',
              height: 16,
              background: '#000',
              borderRadius: 10,
              zIndex: 2
            }}
          />
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '9 / 19.5',
              borderRadius: 24,
              overflow: 'hidden',
              background: '#0a0a0a'
            }}
          >
            {slot.kind === 'img' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={slot.src}
                alt={`mBills wallet — ${slot.year}`}
                loading="lazy"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <video
                src={slot.src}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            )}
          </div>
        </div>
        {/* Soft floor reflection */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: '18%',
            background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.18))',
            pointerEvents: 'none'
          }}
        />
      </div>
      <div
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 11,
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          fontWeight: 500
        }}
      >
        {slot.year}
      </div>
    </div>
  );
}

// ─── Laptop showcase ───────────────────────────────────────────────────
// CSS-drawn MacBook-style frame with screen content inside. Used to
// showcase the mBills.si + Wish web portals without baking 3D mockup
// rendering into a heavy image asset.

function LaptopShowcase({
  src,
  label,
  tileBg
}: {
  src: string;
  label: string;
  tileBg: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      {/* Showcase tile (matches PhoneTile styling, less squared) */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '5 / 4',
          background: tileBg,
          borderRadius: 8,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'clamp(2rem, 5vw, 3.5rem)',
          boxShadow: '0 20px 40px rgba(17,17,17,0.08)'
        }}
      >
        {/* Subtle radial light spot */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 35% 25%, rgba(255,255,255,0.22), transparent 55%)',
            pointerEvents: 'none'
          }}
        />
        {/* Laptop centered inside */}
        <div style={{ width: '82%', position: 'relative' }}>
          <div
            style={{
              background: '#1c1c1c',
              borderRadius: '10px 10px 3px 3px',
              padding: '8px 8px 10px',
              boxShadow: '0 24px 44px rgba(0,0,0,0.30)'
            }}
          >
            <div style={{ background: '#000', borderRadius: 4, padding: 1.5 }}>
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '16 / 10',
                  borderRadius: 3,
                  overflow: 'hidden',
                  background: '#0a0a0a'
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={label}
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                />
              </div>
            </div>
          </div>
          {/* Base */}
          <div
            style={{
              position: 'relative',
              width: '112%',
              height: 10,
              margin: '0 -6%',
              background: 'linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 60%, #0e0e0e 100%)',
              borderRadius: '0 0 8px 8px',
              boxShadow: '0 10px 18px rgba(0,0,0,0.20)'
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: 0,
                transform: 'translateX(-50%)',
                width: '18%',
                height: 4,
                background: '#0a0a0a',
                borderRadius: '0 0 6px 6px'
              }}
            />
          </div>
        </div>
      </div>
      <div
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 11,
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          fontWeight: 500
        }}
      >
        {label}
      </div>
    </div>
  );
}

function PhoneEvolution({ evoLabels }: { evoLabels: { first: string; reskin: string; newDesign: string } }) {
  const slots = buildEvoSlots(evoLabels);
  return (
    <>
      <div
        className="mbills-phone-evo"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 'clamp(1rem, 2vw, 2rem)',
          marginTop: 32
        }}
      >
        {slots.map((slot, idx) => (
          <PhoneTile key={slot.src} slot={slot} flip={idx === slots.length - 1} />
        ))}
      </div>
      <style jsx>{`
        @media (max-width: 760px) {
          :global(.mbills-phone-evo) {
            grid-template-columns: 1fr !important;
            gap: 36px !important;
          }
        }
        @media (min-width: 761px) and (max-width: 980px) {
          :global(.mbills-phone-evo) {
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>
    </>
  );
}

function MarketingCard({
  label,
  title,
  desc,
  dark,
  red,
  img,
  imgs
}: {
  label: string;
  title: React.ReactNode;
  desc: string;
  dark?: boolean;
  red?: boolean;
  img?: string;
  /** When supplied, cycles through these images with a soft crossfade. */
  imgs?: string[];
}) {
  // When any image is supplied we force a dark overlay + light text so all
  // 3 marketing cards read at the same brightness level. The dark/red
  // background colours stay as a fallback for the no-image case.
  const sourcesPreview = imgs && imgs.length > 0 ? imgs : img ? [img] : [];
  const hasImg = sourcesPreview.length > 0;
  const bg = dark
    ? 'linear-gradient(135deg,#1a1a1a,#0a0a0a)'
    : red
      ? 'linear-gradient(135deg,#5E1C20,#3a1014)'
      : 'linear-gradient(135deg,#ECE6D5,#d8d0bc)';
  const fg = hasImg || dark || red ? '#F5F2EA' : '#111';
  const subFg = hasImg || dark || red ? 'rgba(245,242,234,0.75)' : 'var(--muted)';
  // Same dark fade for every photo-backed card so the trio looks cohesive.
  const fadeOverlay = 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.7) 100%)';

  // Cycle through `imgs` if supplied
  const sources = sourcesPreview;
  const [activeIdx, setActiveIdx] = useState(0);
  useEffect(() => {
    if (sources.length < 2) return;
    const id = window.setInterval(() => {
      setActiveIdx((p) => (p + 1) % sources.length);
    }, 1800);
    return () => window.clearInterval(id);
  }, [sources.length]);

  return (
    <div
      className="tile"
      style={{
        aspectRatio: '4/5',
        background: bg,
        color: fg,
        padding: 32,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
        textShadow: hasImg ? '0 1px 8px rgba(0,0,0,0.5)' : 'none'
      }}
    >
      {/* Crossfading image layers (absolutely positioned, behind content) */}
      {sources.map((src, i) => (
        <div
          key={src + i}
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `${fadeOverlay}, url("${src}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            opacity: i === activeIdx ? 1 : 0,
            transition: 'opacity 900ms ease',
            zIndex: 0
          }}
        />
      ))}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}>
      <div
        style={{
          fontSize: 11,
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          color: subFg,
          fontWeight: 600
        }}
      >
        {label}
      </div>
      <div>
        <div
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(1.6rem, 2.5vw, 2.4rem)',
            lineHeight: 0.95,
            fontWeight: 500,
            letterSpacing: '-0.02em'
          }}
        >
          {title}
        </div>
        <div
          style={{
            marginTop: 12,
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: 17,
            color: subFg,
            lineHeight: 1.5
          }}
        >
          {desc}
        </div>
      </div>
      </div>
    </div>
  );
}

function CardTile({
  name,
  meta,
  img,
  svg,
  bg,
  invert,
  glow,
  cover
}: {
  name: React.ReactNode;
  meta: string;
  img?: string;
  svg?: string;
  bg: string;
  invert?: boolean;
  glow?: boolean;
  /** When true, the image fills the entire tile (object-fit: cover) instead
      of being centered at 78% width. Use for logo composition images that
      already include their own background. */
  cover?: boolean;
}) {
  return (
    <div
      style={{
        background: '#0a0a0a',
        border: '1px solid rgba(245,242,234,0.06)',
        borderRadius: 6,
        padding: 28,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <div
        style={{
          aspectRatio: '1/1',
          borderRadius: 6,
          marginBottom: 20,
          background: bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {img && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img}
              alt=""
              loading="lazy"
              style={
                cover
                  ? {
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block'
                    }
                  : {
                      width: '78%',
                      height: 'auto',
                      objectFit: 'contain',
                      filter: glow
                        ? 'drop-shadow(0 0 30px rgba(0,245,255,0.6)) drop-shadow(0 0 60px rgba(255,0,110,0.4))'
                        : 'drop-shadow(0 20px 40px rgba(0,0,0,0.4))'
                    }
              }
            />
          </>
        )}
        {svg && (
          <object
            type="image/svg+xml"
            data={svg}
            aria-hidden
            style={{
              width: '60%',
              height: 'auto',
              filter: invert ? 'invert(1) brightness(2)' : 'none',
              pointerEvents: 'none'
            }}
          />
        )}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 24,
          fontWeight: 500,
          color: 'var(--paper)',
          lineHeight: 1
        }}
      >
        {name}
      </div>
      <div
        style={{
          marginTop: 6,
          fontSize: 10,
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          color: 'rgba(245,242,234,0.4)',
          fontWeight: 500
        }}
      >
        {meta}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import BlurText from '@/components/BlurText';

type Props = { locale: string };

const rich = {
  em: (chunks: React.ReactNode) => <em>{chunks}</em>,
  strong: (chunks: React.ReactNode) => <strong>{chunks}</strong>,
  br: () => <br />
};

export default function PetrolPayCase({ locale }: Props) {
  const t = useTranslations('cases.petrolPay');
  const tc = useTranslations('caseCommon');
  const [logoSvg, setLogoSvg] = useState<string>('');
  const rootRef = useRef<HTMLElement>(null);

  // Inline the brand-mark SVG once so we can recolor via CSS (fill class swaps).
  useEffect(() => {
    fetch('/work/petrol-pay/logo.svg')
      .then((r) => r.text())
      .then(setLogoSvg)
      .catch(() => {});
  }, []);

  // Reveal each .case-section on scroll (CSS-driven, IntersectionObserver toggles class).
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const sections = Array.from(root.querySelectorAll<HTMLElement>('.case-section'));
    if (!sections.length) return;
    root.classList.add('reveal-js');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      sections.forEach((el) => el.classList.add('is-revealed'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const t = entry.target as HTMLElement;
          t.classList.add('is-revealed');
          io.unobserve(t);
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    sections.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <article
      ref={rootRef}
      className="pinart-case pinart-case--petrol"
      style={{
        background: 'var(--paper, #F5F2EA)',
        color: 'var(--ink, #111)',
        fontFamily: 'var(--font-sans, Archivo)'
      }}
    >
      {/* ============ HERO ============ */}
      <section className="case-hero">
        <div className="case-hero__top">
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/work/petrol-pay/Petrol_Pay_loyalty_gold.jpg"
            alt="Petrol Pay — horizontal card presentation"
            className="case-hero__banner"
          />
        </div>
      </section>

      {/* ============ INTRO ============ */}
      <section className="case-section intro">
        <div className="intro__left">
          <p className="head-label">
            <span className="head-label__num">02</span> · {t('introLabel')}
          </p>
          <h2 className="head-title">{t.rich('introTitle', rich)}</h2>
        </div>
        <div className="intro__right">
          <div className="intro__body">
            <p>{t.rich('introBody1', rich)}</p>
            <p>{t.rich('introBody2', rich)}</p>
          </div>

          <div className="intro__meta-grid">
            <div className="meta-cell">
              <div className="meta-cell__label">{t('metaCellRoleLabel')}</div>
              <div className="meta-cell__value">{t.rich('metaCellRoleValue', rich)}</div>
            </div>
            <div className="meta-cell">
              <div className="meta-cell__label">{t('metaCellYearLabel')}</div>
              <div className="meta-cell__value">{t('metaCellYearValue')}</div>
            </div>
            <div className="meta-cell">
              <div className="meta-cell__label">{t('metaCellForLabel')}</div>
              <div className="meta-cell__value">
                {t('metaCellForValue')}
                <em>{t('metaCellForSub')}</em>
              </div>
            </div>
            <div className="meta-cell">
              <div className="meta-cell__label">{t('metaCellStatusLabel')}</div>
              <div className="meta-cell__value">
                {t.rich('metaCellStatusValue', rich)}
                <em>{t('metaCellStatusSub')}</em>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ LOGO SYSTEM ============ */}
      <section className="case-section logo-system">
        <div className="logo-system__head">
          <p className="head-label">
            <span className="head-label__num">03</span> · {t('identityLabel')}
          </p>
          <h2 className="head-title">{t.rich('identityTitle', rich)}</h2>
        </div>
        <div className="logo-grid">
          <div className="logo-card lc-paper" dangerouslySetInnerHTML={{ __html: logoSvg }} />
          <div className="logo-card lc-red" dangerouslySetInnerHTML={{ __html: logoSvg }} />
          <div className="logo-card lc-ink" dangerouslySetInnerHTML={{ __html: logoSvg }} />
        </div>
      </section>

      {/* ============ CARDS ============ */}
      <section className="case-section cards-section">
        <div className="cards-section__head">
          <p className="head-label">
            <span className="head-label__num">04</span> · {t('familyLabel')}
          </p>
          <h2 className="cards-title">{t.rich('familyTitle', rich)}</h2>
          <p className="cards-sub">{t('familyLede')}</p>
        </div>

        <div className="cards-grid">
          <div className="card-slot">
            <div className="card-slot__pic card-slot__pic--gold">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/work/petrol-pay/Petrol_Pay_loyalty_gold.jpg"
                alt="Petrol Klub Pay — gold loyalty card"
              />
            </div>
            <div className="card-slot__name">{t.rich('card1Name', rich)}</div>
            <div className="card-slot__meta">{t('card1Meta')}</div>
          </div>
          <div className="card-slot">
            <div className="card-slot__pic card-slot__pic--klub">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/work/petrol-pay/Petrol_Pay_Business_silver.jpg"
                alt="Petrol Klub — silver loyalty card"
              />
            </div>
            <div className="card-slot__name">{t('card2Name')}</div>
            <div className="card-slot__meta">{t('card2Meta')}</div>
          </div>
          <div className="card-slot">
            <div className="card-slot__pic card-slot__pic--business">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/work/petrol-pay/Petrol_Pay_Business_card.jpg"
                alt="Petrol Business — black corporate card"
              />
            </div>
            <div className="card-slot__name">{t('card3Name')}</div>
            <div className="card-slot__meta">{t('card3Meta')}</div>
          </div>
        </div>
      </section>

      {/* ============ NUMBERS ============ */}
      <section className="case-section numbers-strip">
        <div>
          <div className="numbers-num">
            <em>6</em>
          </div>
          <div className="numbers-label">{t('stat1Label')}</div>
          <div className="numbers-desc">{t('stat1Desc')}</div>
        </div>
        <div>
          <div className="numbers-num">213</div>
          <div className="numbers-label">{t('stat2Label')}</div>
          <div className="numbers-desc">{t('stat2Desc')}</div>
        </div>
        <div>
          <div className="numbers-num">
            40<em>+</em>
          </div>
          <div className="numbers-label">{t('stat3Label')}</div>
          <div className="numbers-desc">{t('stat3Desc')}</div>
        </div>
      </section>

      {/* ============ VARIATIONS ============ */}
      <section className="case-section variations">
        <div className="variations__head">
          <p className="head-label">
            <span className="head-label__num">05</span> · {t('explorationLabel')}
          </p>
          <h2 className="head-title">{t.rich('explorationTitle', rich)}</h2>
          <p className="cards-sub" style={{ color: 'var(--ink-soft)', marginTop: 24, maxWidth: 720 }}>
            {t('explorationLede')}
          </p>
        </div>

        <div className="variations__grid">
          <figure className="variations__item">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/work/petrol-pay/concept_business_waves.jpg"
              alt="Concept — black Business card with wave hologram"
            />
            <figcaption>{t('variation1')}</figcaption>
          </figure>
          <figure className="variations__item">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/work/petrol-pay/concept_klub_maze.jpg"
              alt="Concept — black Klub card with geometric maze hologram"
            />
            <figcaption>{t('variation2')}</figcaption>
          </figure>
          <figure className="variations__item">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/work/petrol-pay/concept_business_pixel.jpg"
              alt="Concept — black Business card with pixel hologram + P monogram"
            />
            <figcaption>{t('variation3')}</figcaption>
          </figure>
          <figure className="variations__item">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/work/petrol-pay/concept_klub_pay_horizontal.jpg"
              alt="Concept — gold Klub Pay horizontal with windmills and EV"
            />
            <figcaption>{t('variation4')}</figcaption>
          </figure>
        </div>
      </section>

      {/* ============ BRAND APPLICATIONS ============ */}
      <section className="case-section brand-apps">
        <div className="brand-apps__head">
          <p className="head-label">
            <span className="head-label__num">06</span> · {t('brandAppsLabel')}
          </p>
          <h2 className="head-title">{t.rich('brandAppsTitle', rich)}</h2>
          <p className="cards-sub" style={{ color: 'var(--ink-soft)', marginTop: 24, maxWidth: 720 }}>
            {t.rich('brandAppsLede', rich)}
          </p>
        </div>

        <div className="brand-apps__grid">
          <div className="brand-apps__video">
            <video
              src="/work/petrol-pay/430x932_video_pkpk_cards_web.mp4"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
            />
            <div className="brand-apps__caption">{t('brandAppsVideoCap')}</div>
          </div>
          <figure className="brand-apps__item brand-apps__item--tshirt">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/work/petrol-pay/Tinka_a_woman_wearing_a_black_t-shirt_with_a_deep_round_neck_li_ee81b535-77f1-4571-9494-c3efadec0598 copy.jpg"
              alt="Petrol — t-shirt with windmills + EV illustration"
            />
            <figcaption>{t('brandAppsTshirtCap')}</figcaption>
          </figure>
          <figure className="brand-apps__item brand-apps__item--wide">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/work/petrol-pay/potrebscine_petrol-pay.jpg"
              alt="Petrol — stationery and brand collateral"
            />
            <figcaption>{t('brandAppsStationeryCap')}</figcaption>
          </figure>
        </div>
      </section>

      {/* ============ PORTAL ============ */}
      <section className="case-section portal">
        <div className="portal__head">
          <p className="head-label">
            <span className="head-label__num">07</span> · {t('portalLabel')}
          </p>
          <h2 className="head-title">{t.rich('portalTitle', rich)}</h2>
          <p className="cards-sub" style={{ color: 'var(--ink-soft)', marginTop: 24 }}>
            {t('portalLede')}
          </p>
        </div>

        <div className="portal__grid">
          <div className="portal__shot">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="portal__media"
              src="/work/petrol-pay/portal_laptop.jpg"
              alt="Petrol Pay portal — desktop mockup"
            />
          </div>

          <div className="portal__phone">
            <video
              className="portal__media portal__media--phone"
              src="/work/petrol-pay/portal_phone.mp4"
              autoPlay
              loop
              muted
              playsInline
            />
          </div>
        </div>
      </section>

      {/* ============ NEXT ============ */}
      <section className="case-section next-case">
        <div className="next-case__small">{tc('nextCaseLabel')}</div>
        <h2
          className="next-case__title"
          dangerouslySetInnerHTML={{ __html: t.raw('nextCaseTitle') }}
        />
        <Link href={`/${locale}/work/mbills`} className="next-case__cta">
          {tc('viewCaseStudy')}
        </Link>
      </section>

      <style jsx global>{`
        /* Reveal animation — class-driven so SSR/no-JS shows full content. */
        .pinart-case.reveal-js .case-section {
          opacity: 0;
          transform: translateY(64px);
          transition: opacity 950ms cubic-bezier(0.16, 1, 0.3, 1),
                      transform 950ms cubic-bezier(0.16, 1, 0.3, 1);
          will-change: opacity, transform;
        }
        .pinart-case.reveal-js :global(.case-section.is-revealed) {
          opacity: 1;
          transform: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .pinart-case.reveal-js :global(.case-section) {
            opacity: 1;
            transform: none;
            transition: none;
          }
        }
        .pinart-case {
          --accent: #b25476;
          --paper-warm: #ECE6D5;
          --ink-soft: #1c1c1c;
          --muted: #6e6a60;
          --line: rgba(17,17,17,0.12);
          --petrol-red: #ed1b24;
          --petrol-red-deep: #82272a;
          --petrol-red-dark: #c20e1a;
        }

        ::selection { background: var(--accent); color: var(--paper); }

        .case-hero {
          padding: 8rem 3rem 5rem;
          min-height: 90vh;
          display: flex;
          flex-direction: column;
        }
        .eyebrow {
          font-size: 12px;
          letter-spacing: 0.4em;
          text-transform: uppercase;
          color: var(--muted);
          font-weight: 500;
          margin: 0 0 32px;
        }
        .case-title {
          font-family: var(--font-serif);
          /* Lower min so it doesn't overflow on phones */
          font-size: clamp(3rem, 14vw, 13rem);
          line-height: 0.85;
          padding-bottom: 0.15em;
          letter-spacing: -0.035em;
          font-weight: 500;
          margin: 0;
          word-break: break-word;
          overflow-wrap: break-word;
        }
        /* Soft coral gradient for the BIG italic words across the case study.
           Skips .cards-title em (lives on the dark section — keeps paper-warm). */
        .case-title em,
        .next-case__title em,
        .head-title em {
          font-style: italic;
          font-weight: 400;
          background: linear-gradient(135deg, #c16784 0%, #b25476 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
        }
        /* BlurText renders the last word/letter as a span — match the
           old <em> accent gradient on the trailing segment. */
        :global(h1.case-title) > :global(span:last-child) {
          font-style: italic;
          font-weight: 400;
          background: linear-gradient(135deg, #c16784 0%, #b25476 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
          padding-right: 0.18em;
          padding-bottom: 0.2em;
        }
        .case-hero__bottom {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 80px;
          margin-top: 80px;
          align-items: end;
        }
        .case-lede {
          font-family: var(--font-serif);
          font-style: italic;
          font-size: clamp(20px, 1.7vw, 28px);
          line-height: 1.4;
          color: var(--ink-soft);
          max-width: 560px;
          margin: 0;
          font-weight: 400;
        }
        .case-lede strong {
          font-style: normal;
          font-family: var(--font-condensed, var(--font-sans));
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--accent);
          font-size: 0.82em;
          margin: 0 4px;
        }
        .case-meta-inline {
          display: flex;
          gap: 50px;
          flex-wrap: wrap;
          font-size: 13px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--muted);
          font-weight: 500;
        }
        .case-meta-inline div span {
          display: block;
          margin-top: 6px;
          color: var(--ink, #111);
          font-family: var(--font-serif);
          font-style: italic;
          font-size: 18px;
          text-transform: none;
          letter-spacing: 0;
          font-weight: 400;
        }
        .case-hero__visual {
          margin-top: 80px;
          height: 70vh;
          background: var(--ink, #111);
          border-radius: 4px;
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .case-hero__banner {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .card-mock {
          width: 60%;
          aspect-ratio: 1.586 / 1;
          background: linear-gradient(135deg, #0d0d0d 0%, #181010 60%, #1f1414 100%);
          border-radius: 14px;
          transform: perspective(2400px) rotateX(18deg) rotateZ(-4deg);
          box-shadow: 0 100px 140px rgba(0, 0, 0, 0.7), 0 30px 60px rgba(180, 40, 30, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.04);
          position: relative;
          overflow: hidden;
        }
        .card-mock::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            repeating-linear-gradient(135deg, transparent 0 14px, rgba(180, 200, 255, 0.05) 14px 15px),
            repeating-linear-gradient(45deg, transparent 0 22px, rgba(255, 180, 200, 0.03) 22px 23px);
        }
        .card-mock::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, var(--petrol-red), var(--petrol-red-deep), var(--petrol-red));
        }
        .card-mock__content {
          position: absolute;
          inset: 0;
          padding: 7% 7%;
          color: #fff;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .card-mock__name {
          font-weight: 700;
          font-size: clamp(20px, 2vw, 36px);
          letter-spacing: 0.02em;
          text-transform: uppercase;
        }
        .card-mock__name span {
          font-weight: 300;
          opacity: 0.85;
          margin-left: 8px;
        }

        .case-section {
          padding: 8rem 3rem;
          border-top: 1px solid var(--line);
        }

        .head-label {
          font-size: 12px;
          letter-spacing: 0.4em;
          text-transform: uppercase;
          color: var(--muted);
          font-weight: 500;
          margin: 0 0 24px;
        }
        .head-label__num { color: var(--accent); font-weight: 600; }
        .head-title {
          font-family: var(--font-serif);
          font-size: clamp(2.5rem, 6vw, 4.5rem);
          line-height: 0.95;
          letter-spacing: -0.025em;
          font-weight: 500;
          margin: 0;
        }
        .head-title em {
          /* Gradient declared above; this individual rule kept for any
             missed property — color is overridden by the gradient block. */
          font-style: italic;
          font-weight: 400;
        }

        .intro {
          display: grid;
          grid-template-columns: 1fr 1.3fr;
          gap: 80px;
          align-items: start;
        }
        .intro__body {
          font-size: 19px;
          line-height: 1.65;
          color: var(--ink-soft);
          max-width: 640px;
        }
        .intro__body p { margin: 0; }
        .intro__body p + p { margin-top: 20px; }
        .intro__body em {
          font-family: var(--font-serif);
          font-style: italic;
        }
        .intro__meta-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px 50px;
          margin-top: 50px;
          padding-top: 36px;
          border-top: 1px solid var(--line);
          max-width: 640px;
        }
        .meta-cell__label {
          font-size: 11px;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: var(--muted);
          margin-bottom: 10px;
          font-weight: 500;
        }
        .meta-cell__value {
          font-family: var(--font-serif);
          font-size: 22px;
          line-height: 1.35;
          font-weight: 500;
        }
        .meta-cell__value em {
          font-style: italic;
          font-size: 16px;
          color: var(--muted);
          display: block;
          margin-top: 4px;
          font-weight: 400;
        }

        .logo-system__head { margin-bottom: 60px; max-width: 720px; }
        .logo-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 16px;
        }
        .logo-card {
          aspect-ratio: 4 / 3;
          padding: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
        }
        .logo-card :global(svg) { width: 72%; height: auto; }
        .lc-paper { background: var(--paper-warm); }
        .lc-red {
          background: linear-gradient(135deg, var(--petrol-red-deep) 0%, var(--petrol-red) 60%, var(--petrol-red-dark) 100%);
        }
        .lc-red :global(svg .cls-3) { fill: #fff; }
        .lc-red :global(svg .cls-4) { fill: var(--petrol-red-dark); }
        .lc-red :global(svg .cls-1),
        .lc-red :global(svg .cls-2) { fill: #fff; }
        .lc-ink { background: var(--ink, #111); }
        .lc-ink :global(svg .cls-3) { fill: #fff; }

        .cards-section {
          background: var(--ink, #111);
          color: var(--paper);
        }
        .cards-section .head-label { color: rgba(245, 242, 234, 0.55); }
        .cards-section .head-label__num { color: var(--paper-warm); }
        .cards-section__head { margin-bottom: 80px; max-width: 900px; }
        .cards-title {
          font-family: var(--font-serif);
          font-size: clamp(3.5rem, 9vw, 6.5rem);
          line-height: 0.92;
          letter-spacing: -0.025em;
          font-weight: 500;
          margin: 0;
        }
        .cards-title em {
          font-style: italic;
          font-weight: 400;
          color: var(--paper-warm);
          opacity: 0.85;
        }
        .cards-sub {
          margin: 32px 0 0;
          font-family: var(--font-serif);
          font-style: italic;
          font-size: 22px;
          line-height: 1.5;
          color: rgba(245, 242, 234, 0.65);
          max-width: 640px;
        }
        .cards-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 24px;
        }
        .brand-apps__head { margin-bottom: 60px; max-width: 1100px; }
        .brand-apps__grid {
          display: grid;
          grid-template-columns: 1fr 1fr 2.2fr;
          gap: 28px;
          align-items: stretch;
          max-width: 1100px;
        }
        .brand-apps__video {
          background: #0a0a0a;
          border-radius: 6px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .brand-apps__video video {
          width: 100%;
          aspect-ratio: 9 / 16;
          object-fit: cover;
          display: block;
        }
        .brand-apps__caption,
        .brand-apps__item figcaption {
          padding: 18px 22px;
          font-family: var(--font-sans);
          font-size: 12px;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: var(--muted);
          font-weight: 500;
        }
        .brand-apps__item {
          margin: 0;
          background: #0a0a0a;
          border-radius: 6px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .brand-apps__item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          flex: 1;
          min-height: 0;
        }
        .brand-apps__item--tshirt img { aspect-ratio: 3 / 4; }
        .brand-apps__item--wide img { aspect-ratio: 16 / 9; }
        .variations__head { margin-bottom: 60px; }
        .variations__grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 28px;
        }
        .variations__item {
          margin: 0;
          background: #0a0a0a;
          border-radius: 6px;
          border: 1px solid rgba(245, 242, 234, 0.06);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .variations__item img {
          width: 100%;
          aspect-ratio: 16 / 9;
          object-fit: cover;
          display: block;
        }
        .variations__item figcaption {
          padding: 18px 22px;
          font-family: var(--font-sans);
          font-size: 12px;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: var(--muted);
          font-weight: 500;
        }
        .card-slot {
          background: #0a0a0a;
          border-radius: 6px;
          border: 1px solid rgba(245, 242, 234, 0.06);
          padding: 32px;
          display: flex;
          flex-direction: column;
        }
        .card-slot__pic {
          aspect-ratio: 1.586 / 1;
          border-radius: 8px;
          margin-bottom: 28px;
          position: relative;
          overflow: hidden;
        }
        .card-slot__pic img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          z-index: 1;
        }
        .card-slot__pic--gold {
          background: linear-gradient(135deg, #d4ba85 0%, #bea675 60%, #9a8556 100%);
        }
        .card-slot__pic--gold::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 70% 30%, rgba(255, 255, 255, 0.25), transparent 60%);
        }
        .card-slot__pic--klub {
          background: linear-gradient(135deg, #0c0c0c 0%, #181010 50%, #0a0a0a 100%);
        }
        .card-slot__pic--klub::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            repeating-linear-gradient(135deg, transparent 0 16px, rgba(180, 200, 255, 0.06) 16px 17px),
            repeating-linear-gradient(45deg, transparent 0 24px, rgba(255, 180, 200, 0.04) 24px 25px);
        }
        .card-slot__pic--business {
          background: linear-gradient(135deg, #0a0a0a 0%, #1a1010 50%, #0c0c0c 100%);
        }
        .card-slot__pic--business::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            repeating-linear-gradient(0deg, transparent 0 4px, rgba(200, 200, 255, 0.06) 4px 5px),
            repeating-linear-gradient(90deg, transparent 0 4px, rgba(255, 180, 200, 0.04) 4px 5px);
        }
        .card-slot__pic::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, var(--petrol-red), var(--petrol-red-deep));
          opacity: 0.7;
        }
        .card-slot__placeholder {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255, 255, 255, 0.3);
          font-size: 11px;
          font-style: italic;
          font-family: var(--font-serif);
        }
        .card-slot__name {
          font-family: var(--font-serif);
          font-size: 32px;
          line-height: 1;
          font-weight: 500;
          color: var(--paper);
        }
        .card-slot__name em {
          font-style: italic;
          font-weight: 400;
          opacity: 0.75;
        }
        .card-slot__meta {
          margin-top: 8px;
          font-size: 11px;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: rgba(245, 242, 234, 0.4);
          font-weight: 500;
        }

        .numbers-strip {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 80px;
          background: var(--paper-warm);
          padding: 100px 3rem;
        }
        .numbers-num {
          font-family: var(--font-serif);
          font-size: clamp(5rem, 13vw, 9rem);
          line-height: 0.85;
          font-weight: 500;
          color: var(--accent);
          letter-spacing: -0.04em;
        }
        .numbers-num em { font-style: italic; font-weight: 400; }
        .numbers-label {
          font-size: 12px;
          letter-spacing: 0.4em;
          text-transform: uppercase;
          color: var(--muted);
          margin-top: 16px;
          font-weight: 500;
        }
        .numbers-desc {
          margin-top: 14px;
          font-family: var(--font-serif);
          font-style: italic;
          font-size: 20px;
          color: var(--ink-soft);
          line-height: 1.45;
          font-weight: 400;
        }

        .portal__head { margin-bottom: 80px; max-width: 800px; }
        .portal__grid {
          display: grid;
          grid-template-columns: 5fr 4fr;
          gap: 24px;
        }
        .portal__shot {
          background: #fff;
          border-radius: 4px;
          aspect-ratio: 16 / 10;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          position: relative;
          overflow: hidden;
        }
        .portal__media {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .portal__media--phone {
          object-fit: contain;
          background: #fff;
        }
        .portal__laptop {
          width: 82%;
          aspect-ratio: 16 / 10;
          background: #fff;
          border-radius: 14px;
          border: 12px solid var(--ink, #111);
          border-bottom: 26px solid var(--ink, #111);
          position: relative;
          overflow: hidden;
          box-shadow: 0 40px 80px rgba(0, 0, 0, 0.18);
        }
        .portal__laptop-bg {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 30% 40%, #d4ba85 0%, #9a8556 70%);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .portal__dialog {
          background: #fff;
          border-radius: 14px;
          padding: 30px 36px;
          box-shadow: 0 40px 80px rgba(0, 0, 0, 0.25);
          max-width: 68%;
        }
        .portal__dialog-title {
          font-weight: 700;
          font-size: 22px;
          line-height: 1.2;
          color: var(--ink, #111);
          margin-bottom: 14px;
        }
        .portal__dialog-q {
          font-size: 14px;
          color: #444;
          margin-bottom: 22px;
          font-weight: 500;
        }
        .portal__dialog-btns { display: flex; gap: 10px; }
        .portal__dialog-btn {
          flex: 1;
          padding: 12px;
          font-weight: 700;
          font-size: 13px;
          letter-spacing: 0.12em;
          color: #fff;
          background: linear-gradient(180deg, var(--petrol-red), var(--petrol-red-dark));
          border-radius: 5px;
          text-align: center;
        }
        .portal__phone {
          background: #fff;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          position: relative;
          overflow: hidden;
        }
        .portal__phone-device {
          width: 58%;
          aspect-ratio: 9 / 19.5;
          background: var(--ink, #111);
          border-radius: 28px;
          padding: 6px;
          box-shadow: 0 40px 80px rgba(0, 0, 0, 0.25);
        }
        .portal__phone-screen {
          width: 100%;
          height: 100%;
          background: #fff;
          border-radius: 22px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .portal__phone-top {
          height: 40%;
          background: radial-gradient(circle at 50% 50%, #d4ba85 0%, #9a8556 100%);
          position: relative;
        }
        .portal__phone-petrol {
          position: absolute;
          top: 14px;
          left: 14px;
          background: var(--petrol-red);
          color: #fff;
          font-weight: 800;
          font-size: 8px;
          padding: 4px 6px;
          border-radius: 3px;
          letter-spacing: 0.05em;
        }
        .portal__phone-body { padding: 16px; flex: 1; }
        .portal__phone-heading {
          font-weight: 700;
          font-size: 13px;
          line-height: 1.2;
          color: var(--ink, #111);
          margin-bottom: 10px;
        }
        .portal__phone-q {
          font-size: 9px;
          color: #333;
          font-weight: 600;
        }
        .portal__phone-actions { display: flex; gap: 6px; padding: 12px 16px; }
        .portal__phone-btn {
          flex: 1;
          background: linear-gradient(180deg, var(--petrol-red), var(--petrol-red-dark));
          color: #fff;
          padding: 8px 0;
          text-align: center;
          border-radius: 4px;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.1em;
        }

        .next-case {
          padding: 12rem 3rem;
          text-align: left;
        }
        .next-case__small {
          font-size: 12px;
          letter-spacing: 0.4em;
          text-transform: uppercase;
          color: var(--muted);
          margin-bottom: 32px;
          font-weight: 500;
        }
        .next-case__title {
          font-family: var(--font-serif);
          /* Lower min so it shrinks on phones (< ~640px) without truncating */
          font-size: clamp(3.5rem, 17vw, 16rem);
          line-height: 0.85;
          letter-spacing: -0.04em;
          font-weight: 500;
          margin: 0;
          word-break: break-word;
          overflow-wrap: break-word;
        }
        .next-case__title em {
          /* Gradient set in combined block above. */
          font-style: italic;
          font-weight: 400;
        }
        .next-case__cta {
          display: inline-flex;
          align-items: center;
          gap: 14px;
          margin-top: 60px;
          font-size: 14px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--ink, #111);
          text-decoration: none;
          border-bottom: 1px solid var(--ink, #111);
          padding-bottom: 8px;
          font-weight: 600;
        }

        @media (max-width: 980px) {
          .intro, .case-hero__bottom, .portal__grid {
            grid-template-columns: 1fr;
            gap: 40px;
          }
          .logo-grid, .cards-grid, .numbers-strip, .variations__grid, .brand-apps__grid { grid-template-columns: 1fr; }
          .case-hero { padding: 5rem 1.5rem 3rem; min-height: auto; }
          .case-hero__visual { height: 50vh; margin-top: 40px; }
          .case-section { padding: 5rem 1.5rem; }
          .case-meta-inline { gap: 24px; }
          .intro__meta-grid { grid-template-columns: 1fr; gap: 28px; }
          .numbers-strip { padding: 60px 1.5rem; gap: 36px; }
          .next-case { padding: 6rem 1.5rem; }
        }
        @media (max-width: 480px) {
          .case-hero__visual { height: 38vh; }
          .case-meta-inline { font-size: 12px; gap: 18px; }
          .case-meta-inline div span { font-size: 16px; }
          .card-slot { padding: 16px; }
          .card-slot__pic { margin-bottom: 16px; }
          .case-section { padding: 4rem 1rem; }
        }
      `}</style>
    </article>
  );
}

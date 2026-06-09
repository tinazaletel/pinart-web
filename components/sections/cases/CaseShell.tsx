'use client';

import Link from 'next/link';
import { useEffect, useRef, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';

/**
 * Shared visual shell for all case studies (Pinart brand DNA).
 * Each project page wraps its content in this for consistent styling.
 * Also adds a one-shot fade-in + slide-up reveal to every `.case-section`
 * inside it, using IntersectionObserver (no scroll listeners).
 */
export default function CaseShell({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const sections = Array.from(
      root.querySelectorAll<HTMLElement>('.case-section')
    );
    if (!sections.length) return;

    // Mark the root as JS-enabled so the CSS-defined initial-hidden state
    // is allowed to apply. Then IntersectionObserver toggles `.is-revealed`.
    root.classList.add('reveal-js');

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
      ref={ref}
      className="pinart-case"
      style={{
        background: 'var(--paper, #F5F2EA)',
        color: 'var(--ink, #111)',
        fontFamily: 'var(--font-sans, Archivo)'
      }}
    >
      {children}

      <style jsx global>{`
        .pinart-case {
          --accent: #b25476;
          --accent-grad: linear-gradient(135deg, #c16784 0%, #b25476 100%);
          --paper-warm: #ECE6D5;
          --ink-soft: #1c1c1c;
          --muted: #6e6a60;
          --line: rgba(17,17,17,0.12);
        }
        .pinart-case ::selection { background: var(--accent); color: var(--paper, #F5F2EA); }

        /* Reveal animation — applied only once JS marks the case as enabled,
           so disabled-JS / SSR falls back to fully visible content. */
        .pinart-case.reveal-js .case-section {
          opacity: 0;
          transform: translateY(64px);
          transition: opacity 950ms cubic-bezier(0.16, 1, 0.3, 1),
                      transform 950ms cubic-bezier(0.16, 1, 0.3, 1);
          will-change: opacity, transform;
        }
        .pinart-case.reveal-js .case-section.is-revealed {
          opacity: 1;
          transform: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .pinart-case.reveal-js .case-section {
            opacity: 1;
            transform: none;
            transition: none;
          }
        }

        .pinart-case .case-hero {
          padding: 6rem 3rem 5rem;
          min-height: 80vh;
          display: flex;
          flex-direction: column;
        }
        .pinart-case .eyebrow {
          font-size: 12px;
          letter-spacing: 0.4em;
          text-transform: uppercase;
          color: var(--muted);
          font-weight: 500;
          margin: 0 0 32px;
        }
        .pinart-case .eyebrow .accent {
          background: var(--accent-grad);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
          font-weight: 600;
        }
        .pinart-case .case-title {
          font-family: var(--font-serif);
          font-size: clamp(3rem, 14vw, 13rem);
          line-height: 0.85;
          padding-bottom: 0.15em;
          letter-spacing: -0.035em;
          font-weight: 500;
          margin: 0;
          word-break: break-word;
        }
        .pinart-case .case-title em,
        .pinart-case .head-title em,
        .pinart-case .next-case__title em {
          font-style: italic;
          font-weight: 400;
          background: var(--accent-grad);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
        }
        /* BlurText renders each word/letter as a span — the last segment
           is the trailing word with the period, which should match the
           old <em> accent gradient. */
        .pinart-case h1.case-title > span:last-child {
          font-style: italic;
          font-weight: 400;
          background: var(--accent-grad);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
          padding-bottom: 0.2em;
        }
        .pinart-case .case-hero__bottom {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 80px;
          margin-top: 80px;
          align-items: end;
        }
        .pinart-case .case-lede {
          font-family: var(--font-serif);
          font-style: italic;
          font-size: clamp(20px, 1.7vw, 28px);
          line-height: 1.4;
          color: var(--ink-soft);
          max-width: 560px;
          margin: 0;
        }
        .pinart-case .case-lede strong {
          font-style: normal;
          font-family: var(--font-condensed, var(--font-sans));
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--accent);
          font-size: 0.82em;
          margin: 0 4px;
        }
        .pinart-case .case-meta-inline {
          display: flex;
          gap: 50px;
          flex-wrap: wrap;
          font-size: 13px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--muted);
          font-weight: 500;
        }
        .pinart-case .case-meta-inline div span {
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

        .pinart-case .case-hero__visual {
          margin-top: 80px;
          aspect-ratio: 16/9;
          border-radius: 4px;
          position: relative;
          overflow: hidden;
          background: var(--ink, #111);
        }
        .pinart-case .case-hero__visual img,
        .pinart-case .case-hero__visual video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .pinart-case .case-section {
          padding: 6rem 3rem;
          border-top: 1px solid var(--line);
        }

        .pinart-case .head-label {
          font-size: 12px;
          letter-spacing: 0.4em;
          text-transform: uppercase;
          color: var(--muted);
          font-weight: 500;
          margin: 0 0 24px;
        }
        .pinart-case .head-label__num {
          background: var(--accent-grad);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
          font-weight: 600;
        }
        .pinart-case .head-title {
          font-family: var(--font-serif);
          font-size: clamp(2.2rem, 5vw, 4.5rem);
          line-height: 0.98;
          letter-spacing: -0.025em;
          font-weight: 500;
          margin: 0;
          word-break: break-word;
        }
        .pinart-case .lede {
          margin-top: 28px;
          font-family: var(--font-serif);
          font-style: italic;
          font-size: clamp(18px, 1.5vw, 24px);
          line-height: 1.5;
          color: var(--ink-soft);
          max-width: 640px;
        }

        /* Generic 2-col layout for sections */
        .pinart-case .two-col {
          display: grid;
          grid-template-columns: 1fr 1.3fr;
          gap: 64px;
          align-items: start;
        }

        .pinart-case .grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-top: 48px;
        }
        .pinart-case .grid-3 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-top: 48px;
        }
        .pinart-case .grid-4 {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-top: 48px;
        }

        .pinart-case .tile {
          background: var(--paper-warm);
          border-radius: 4px;
          aspect-ratio: 4/5;
          overflow: hidden;
          position: relative;
        }
        .pinart-case .tile img,
        .pinart-case .tile video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .pinart-case .tile--wide { aspect-ratio: 16/9; }
        .pinart-case .tile--square { aspect-ratio: 1/1; }

        .pinart-case .tile-cap {
          position: absolute;
          bottom: 16px;
          left: 16px;
          background: rgba(0,0,0,0.55);
          backdrop-filter: blur(8px);
          color: #fff;
          padding: 6px 14px;
          border-radius: 999px;
          font-size: 11px;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          font-weight: 500;
        }

        .pinart-case .stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 40px;
          padding: 5rem 3rem;
          background: var(--paper-warm);
          border-top: 1px solid var(--line);
          border-bottom: 1px solid var(--line);
        }
        .pinart-case .stats__num {
          font-family: var(--font-serif);
          font-size: clamp(3.5rem, 9vw, 6rem);
          line-height: 0.9;
          font-weight: 500;
          letter-spacing: -0.04em;
          background: var(--accent-grad);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
        }
        .pinart-case .stats__label {
          margin-top: 12px;
          font-size: 11px;
          letter-spacing: 0.4em;
          text-transform: uppercase;
          color: var(--muted);
          font-weight: 500;
        }
        .pinart-case .stats__desc {
          margin-top: 10px;
          font-family: var(--font-serif);
          font-style: italic;
          font-size: 17px;
          color: var(--ink-soft);
          line-height: 1.45;
        }

        .pinart-case .next-case {
          padding: 8rem 3rem;
        }
        .pinart-case .next-case__small {
          font-size: 12px;
          letter-spacing: 0.4em;
          text-transform: uppercase;
          color: var(--muted);
          margin-bottom: 24px;
          font-weight: 500;
        }
        .pinart-case .next-case__title {
          font-family: var(--font-serif);
          font-size: clamp(3.5rem, 17vw, 15rem);
          line-height: 0.85;
          letter-spacing: -0.04em;
          font-weight: 500;
          margin: 0;
          word-break: break-word;
        }
        .pinart-case .next-case__cta {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          margin-top: 40px;
          font-size: 13px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--ink, #111);
          text-decoration: none;
          border-bottom: 1px solid var(--ink, #111);
          padding-bottom: 6px;
          font-weight: 600;
        }

        @media (max-width: 980px) {
          .pinart-case .case-hero__bottom,
          .pinart-case .two-col { grid-template-columns: 1fr; gap: 36px; }
          .pinart-case .grid-4 { grid-template-columns: 1fr 1fr; }
          .pinart-case .grid-3 { grid-template-columns: 1fr; }
          .pinart-case .stats { grid-template-columns: 1fr 1fr; gap: 32px; }
          .pinart-case .case-section { padding: 4.5rem 1.5rem; }
          .pinart-case .case-hero { padding: 4.5rem 1.5rem 3rem; }
          .pinart-case .case-meta-inline { gap: 28px; }
          .pinart-case .mbills-web-grid { grid-template-columns: 1fr !important; gap: 36px !important; }
          .pinart-case .next-case { padding: 6rem 1.5rem; }
          .pinart-case .next-case__title { font-size: clamp(3rem, 16vw, 8rem); }
        }
        @media (max-width: 560px) {
          .pinart-case .grid-4 { grid-template-columns: 1fr; }
          .pinart-case .stats { grid-template-columns: 1fr; gap: 28px; }
          .pinart-case .case-meta-inline { flex-direction: column; gap: 16px; }
        }
      `}</style>
    </article>
  );
}

export function NextCase({
  href,
  title
}: {
  href: string;
  title: string;
}) {
  const t = useTranslations('caseCommon');
  return (
    <section className="next-case">
      <div className="next-case__small">{t('nextCaseLabel')}</div>
      <h2
        className="next-case__title"
        dangerouslySetInnerHTML={{ __html: title }}
      />
      <Link href={href} className="next-case__cta">
        {t('viewCaseStudy')}
      </Link>
    </section>
  );
}

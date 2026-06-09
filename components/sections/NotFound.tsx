'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';

type Locale = 'sl' | 'en';

const COPY: Record<Locale, {
  eyebrow: string;
  title: string;
  lead: string;
  primary: string;
  secondary: string;
  footer: string;
}> = {
  sl: {
    eyebrow: 'Pinart',
    title: 'Ta stran je nekam pobegnila.',
    lead: 'Mogoče je odšla na kavo, mogoče je nikoli ni bilo. Ti si pa še vedno na pravem mestu.',
    primary: '← Nazaj domov',
    secondary: 'Projekti',
    footer: '© Pinart — design studio'
  },
  en: {
    eyebrow: 'Pinart',
    title: 'This page has wandered off.',
    lead: "Maybe it went for coffee, maybe it never existed. You're still in the right place though.",
    primary: '← Back home',
    secondary: 'Work',
    footer: '© Pinart — design studio'
  }
};

export default function NotFound() {
  const rawLocale = useLocale();
  const locale: Locale = rawLocale === 'en' ? 'en' : 'sl';
  const t = COPY[locale];
  const homeHref = `/${locale}`;
  const workHref = `/${locale}/more-work`;

  return (
    <div className="pinart-404">
      {/* Pupa pattern background */}
      <div className="pinart-404__illu" aria-hidden="true">
        <img src="/pupa_404_bg.svg" alt="" draggable={false} />
      </div>

      {/* Content */}
      <div className="pinart-404__content">
        <div className="pinart-404__eyebrow">{t.eyebrow}</div>
        <h1 className="pinart-404__code">404</h1>
        <h2 className="pinart-404__title">{t.title}</h2>
        <p className="pinart-404__lead">{t.lead}</p>
        <div className="pinart-404__actions">
          <Link href={homeHref} className="pinart-404__btn pinart-404__btn--primary">
            {t.primary}
          </Link>
          <Link href={workHref} className="pinart-404__btn pinart-404__btn--ghost">
            {t.secondary}
          </Link>
        </div>
      </div>

      <div className="pinart-404__footer">{t.footer}</div>

      <style jsx>{`
        .pinart-404 {
          position: fixed;
          inset: 0;
          background: #fcf9f6;
          color: #1a1a1a;
          overflow: hidden;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          z-index: 1;
        }
        .pinart-404__illu {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          z-index: 0;
        }
        .pinart-404__illu img {
          position: absolute;
          left: 50%;
          bottom: -90vh;
          transform: translateX(-50%);
          height: 260vh;
          width: auto;
          display: block;
          user-select: none;
        }
        .pinart-404__content {
          position: relative;
          z-index: 2;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 0 100px;
          max-width: 720px;
        }
        .pinart-404__eyebrow {
          font-size: 13px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #8a8478;
          margin-bottom: 24px;
        }
        .pinart-404__code {
          font-size: clamp(140px, 20vw, 320px);
          line-height: 0.88;
          font-weight: 900;
          letter-spacing: -0.05em;
          margin: 0 0 32px 0;
          color: #1a1a1a;
        }
        .pinart-404__title {
          font-size: clamp(28px, 3vw, 44px);
          font-weight: 700;
          line-height: 1.1;
          margin: 0 0 16px 0;
          color: #1a1a1a;
        }
        .pinart-404__lead {
          font-size: 17px;
          line-height: 1.5;
          color: #1a1a1a;
          max-width: 520px;
          margin: 0 0 36px 0;
        }
        .pinart-404__actions {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
        }
        .pinart-404__btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 14px 28px;
          border-radius: 999px;
          font-size: 15px;
          font-weight: 600;
          text-decoration: none;
          transition: transform 0.15s ease, background 0.15s ease;
        }
        .pinart-404__btn--primary {
          background: #1a1a1a;
          color: #fcf9f6;
        }
        .pinart-404__btn--primary:hover {
          transform: translateY(-2px);
          background: #000;
        }
        .pinart-404__btn--ghost {
          background: rgba(252, 249, 246, 0.7);
          backdrop-filter: blur(8px);
          color: #1a1a1a;
          border: 1.5px solid #c8c1b3;
        }
        .pinart-404__btn--ghost:hover {
          background: #fcf9f6;
        }
        .pinart-404__footer {
          position: absolute;
          left: 100px;
          bottom: 40px;
          font-size: 12px;
          color: #8a8478;
          letter-spacing: 0.05em;
          z-index: 3;
        }
        @media (max-width: 900px) {
          .pinart-404__content {
            padding: 80px 32px 0;
            justify-content: flex-start;
          }
          .pinart-404__illu img {
            bottom: -50vh;
            height: 200vh;
          }
          .pinart-404__footer {
            left: 32px;
            bottom: 28px;
          }
        }
      `}</style>
    </div>
  );
}

'use client';

import { useTranslations, useLocale } from 'next-intl';
import { localePath } from '@/i18n/routing';

const BG = 'oklch(0.07 0.01 58)';
const TEXT = 'rgba(245,242,234,0.76)';

export default function Footer() {
  const t = useTranslations('footer');
  const locale = useLocale();
  const year = new Date().getFullYear();

  return (
    <footer
      id="footer"
      className="site-footer"
      data-nav-dark="true"
      style={{
        background: BG,
        color: TEXT,
        borderTop: '1px solid rgba(245,242,234,0.08)',
        padding: 'clamp(2rem,4vw,3.5rem) clamp(1.25rem,4vw,4.5rem)',
      }}
    >
      <div
        className="site-footer__inner"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr) auto minmax(0,1fr)',
          gap: '1.5rem',
          alignItems: 'center',
          fontFamily: 'var(--font-sans)',
          fontSize: '0.78rem',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        <p style={{ margin: 0 }}>© {year} Pinart</p>
        <p style={{ margin: 0, textAlign: 'center' }}>{t('tagline')}</p>
        <div className="site-footer__links" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1.25rem', flexWrap: 'wrap' }}>
          <a href={localePath(locale, `/flow`)} style={{ color: TEXT, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
              <rect x="4" y="2" width="16" height="20" rx="2" />
              <line x1="8" y1="6" x2="16" y2="6" />
              <line x1="8" y1="11" x2="8" y2="11" />
              <line x1="12" y1="11" x2="12" y2="11" />
              <line x1="16" y1="11" x2="16" y2="11" />
              <line x1="8" y1="15" x2="8" y2="15" />
              <line x1="12" y1="15" x2="12" y2="15" />
              <line x1="16" y1="15" x2="16" y2="18" />
              <line x1="8" y1="18" x2="12" y2="18" />
            </svg>
            Pinart Flow
          </a>
          <a href="mailto:tina@pinart.si" style={{ color: TEXT, textDecoration: 'none' }}>tina@pinart.si</a>
          <a href={localePath(locale, `/zasebnost`)} style={{ color: TEXT, textDecoration: 'none' }}>{t('privacy')}</a>
        </div>
      </div>
    </footer>
  );
}

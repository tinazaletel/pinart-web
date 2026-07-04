'use client';

import { useTranslations, useLocale } from 'next-intl';

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
          <a href="mailto:tina@pinart.si" style={{ color: TEXT, textDecoration: 'none' }}>tina@pinart.si</a>
          <a href={`/${locale}/zasebnost`} style={{ color: TEXT, textDecoration: 'none' }}>{t('privacy')}</a>
        </div>
      </div>
    </footer>
  );
}

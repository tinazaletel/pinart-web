'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect } from 'react';
import Link from 'next/link';
import { localePath } from '@/i18n/routing';

/* Banner se namenoma izrise ze na strezniku (v prvem HTML-ju) — prej je na
   "visible" cakal do konca hidracije, zaradi cesar je bil kot LCP element
   izmerjen sele pri ~8s na mobilnih napravah. Ali ga je treba skriti
   (obiskovalec je ze odgovoril), pred izrisom odloci inline skripta v
   layout <head> + CSS pravilo v globals.css, tukaj pa ob kliku. */
export default function CookieBanner() {
  const t = useTranslations('cookies');
  const locale = useLocale();

  /* Inline skripta v <head> nastavi data-cookie-consent PRED izrisom (brez utripa),
     A React hidracija ta atribut z <html> ODSTRANI (kljub suppressHydrationWarning),
     zato se je banner vracal ob vsakem nalaganju, ceprav je privolitev shranjena.
     Po hidraciji ga tukaj znova nastavimo -> CSS pravilo banner trajno skrije. */
  useEffect(() => {
    try {
      if (localStorage.getItem('pinart_cookie_consent')) {
        document.documentElement.setAttribute('data-cookie-consent', 'accepted');
      }
    } catch { /* ignore */ }
  }, []);

  const respond = (answer: 'accepted' | 'declined') => {
    /* NAJPREJ skrij banner (atribut sprozi CSS pravilo) — da klik deluje tudi, ce
       localStorage vrze napako (sicer bi se ustavil pred skrivanjem = "sprejmi ne deluje") */
    document.documentElement.setAttribute('data-cookie-consent', answer);
    const b = document.getElementById('cookie-banner');
    if (b) b.style.display = 'none';
    try { localStorage.setItem('pinart_cookie_consent', answer); } catch { /* ignore */ }
    try { window.dispatchEvent(new CustomEvent('pinart-cookie-consent', { detail: answer })); } catch { /* ignore */ }
  };

  return (
    <div
      id="cookie-banner"
      role="dialog"
      aria-label="Obvestilo o piškotkih"
      style={{
        position: 'fixed',
        bottom: 'clamp(1rem, 3vw, 2rem)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        width: 'min(92vw, 560px)',
        background: '#111111',
        color: '#F5F2EA',
        borderRadius: '1rem',
        padding: 'clamp(1.25rem, 3vw, 1.75rem) clamp(1.25rem, 3vw, 2rem)',
        boxShadow: '0 1rem 3rem rgba(0,0,0,0.35)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.1rem',
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: 'var(--font-sans)',
          fontSize: 'clamp(0.82rem, 1.1vw, 0.92rem)',
          lineHeight: 1.55,
          color: 'rgba(245,242,234,0.82)',
        }}
      >
        {t('text')}{' '}
        <Link
          href={localePath(locale, '/zasebnost')}
          style={{
            color: 'rgba(245,242,234,0.65)',
            textDecoration: 'underline',
            textUnderlineOffset: '0.2em',
            whiteSpace: 'nowrap',
          }}
        >
          {t('privacy')}
        </Link>
      </p>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => respond('accepted')}
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '14px',
            fontWeight: 600,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            background: '#F5F2EA',
            color: '#111111',
            border: 'none',
            borderRadius: '999px',
            minHeight: '44px',
            padding: '0.6rem 1.5rem',
            cursor: 'pointer',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          {t('accept')}
        </button>
        <button
          onClick={() => respond('declined')}
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '14px',
            fontWeight: 500,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            background: 'transparent',
            color: 'rgba(245,242,234,0.6)',
            border: '1px solid rgba(245,242,234,0.25)',
            borderRadius: '999px',
            minHeight: '44px',
            padding: '0.6rem 1.5rem',
            cursor: 'pointer',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          {t('decline')}
        </button>
      </div>
    </div>
  );
}

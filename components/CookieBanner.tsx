'use client';

import { useEffect, useState } from 'react';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('pinart_cookie_consent');
    if (!stored) setVisible(true);
  }, []);

  const respond = (answer: 'accepted' | 'declined') => {
    localStorage.setItem('pinart_cookie_consent', answer);
    setVisible(false);
    window.dispatchEvent(new CustomEvent('pinart-cookie-consent', { detail: answer }));
  };

  if (!visible) return null;

  return (
    <div
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
        Ta spletna stran uporablja piškotke za analitiko (Google Analytics), da razumemo,
        kako obiskovalci uporabljajo stran. Podatki so anonimni.
      </p>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => respond('accepted')}
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '0.78rem',
            fontWeight: 600,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            background: '#F5F2EA',
            color: '#111111',
            border: 'none',
            borderRadius: '999px',
            padding: '0.6rem 1.5rem',
            cursor: 'pointer',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          Sprejmi
        </button>
        <button
          onClick={() => respond('declined')}
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '0.78rem',
            fontWeight: 500,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            background: 'transparent',
            color: 'rgba(245,242,234,0.6)',
            border: '1px solid rgba(245,242,234,0.25)',
            borderRadius: '999px',
            padding: '0.6rem 1.5rem',
            cursor: 'pointer',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          Zavrni
        </button>
      </div>
    </div>
  );
}

'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import SplitText from '@/components/SplitText';
import CircularText from '@/components/CircularText';

const BG   = 'oklch(0.07 0.01 58)';
const TEXT = 'rgba(245,242,234,0.82)';
const SOCIALS = [
  { href: 'https://www.linkedin.com/company/pinart-d-o-o', src: '/linked.svg', alt: 'LinkedIn' },
  { href: 'https://www.instagram.com/pinart_sl/', src: '/instagram.svg', alt: 'Instagram' },
  { href: 'https://www.behance.net/', src: '/Logos/behance-02.svg', alt: 'Behance' },
];

export default function Contact() {
  const t = useTranslations('contact');
  const [phone, setPhone] = useState('');
  const spinVideoRef = useRef<HTMLVideoElement>(null);
  const revealPhone = () => {
    if (!phone) setPhone([43, 51, 56, 54, 52, 49, 51, 55, 51, 55, 51, 48].map((code) => String.fromCharCode(code)).join(''));
  };

  // Decorative spin video: preload="none" so it doesn't download on page load
  // (it's at the bottom of the page). Load + play only when near the viewport.
  useEffect(() => {
    const v = spinVideoRef.current;
    if (!v) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (v.preload !== 'auto') v.preload = 'auto';
            v.play().catch(() => {});
          } else {
            v.pause();
          }
        });
      },
      { rootMargin: '400px 0px' },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  return (
    <section
      id="contact"
      data-nav-dark="true"
      className="contact-section relative min-h-screen px-6 md:px-10 py-32"
      style={{ background: BG, borderTop: '1px solid rgba(245,242,234,0.07)' }}
    >
      <div
        className="contact-layout"
        style={{
          minHeight: 'calc(100vh - 16rem)',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.05fr) minmax(22rem, 0.95fr)',
          gap: 'clamp(2rem, 5vw, 6rem)',
          alignItems: 'end',
        }}
      >
        <div className="contact-heading-block" style={{ containerType: 'inline-size' }}>
          <p className="kicker mb-16" style={{ color: TEXT, opacity: 1 }}>{t('kicker')}</p>

          <SplitText
            text={t('headline')}
            tag="h2"
            className="contact-main-title"
            textAlign="left"
            splitType="chars"
            from={{ opacity: 0, y: 40 }}
            to={{ opacity: 1, y: 0 }}
            delay={30}
            duration={0.9}
            ease="power3.out"
            rootMargin="-60px"
            style={{
              fontFamily:    'var(--font-serif)',
              fontWeight:    500,
              fontSize:      'clamp(3rem, 17cqi, 11rem)',
              lineHeight:    0.96,
              letterSpacing: '-0.035em',
              maxWidth:      '13ch',
              display:       'block',
              color:         TEXT,
            }}
          />

          <div style={{ display: 'flex', gap: '0.9rem', marginTop: 'clamp(1.5rem, 3vw, 2.4rem)' }}>
            {SOCIALS.map((item) => (
              <a
                key={item.alt}
                href={item.href}
                target="_blank"
                rel="noreferrer noopener"
                aria-label={item.alt}
                className="press-fb"
                style={{
                  width: '3.2rem',
                  height: '3.2rem',
                  borderRadius: '50%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 0 1.5px rgba(245,242,234,0.95)',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.src} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', display: 'block' }} />
              </a>
            ))}
          </div>
        </div>

        <div
          className="contact-copy"
          style={{
            color: TEXT,
            fontFamily: 'var(--font-sans)',
            paddingBottom: 'clamp(0.5rem, 2vw, 2rem)',
          }}
        >
          <div className="contact-intro" style={{ display: 'flex', alignItems: 'center', gap: 'clamp(1.5rem,3vw,3rem)', marginBottom: 'clamp(2rem,4vw,3.5rem)' }}>
            <h3
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 'clamp(1.65rem, 2.6vw, 2.7rem)',
                fontWeight: 600,
                lineHeight: 1.08,
                letterSpacing: '-0.03em',
                color: TEXT,
              }}
            >
              {t('ctaL1')}<br />
              {t('ctaL2')}
            </h3>

            <div
              className="contact-spin-gif"
              style={{
                position: 'relative',
                flex: '0 0 auto',
                width: 'clamp(8rem,14vw,13rem)',
                height: 'clamp(8rem,14vw,13rem)',
                display: 'grid',
                placeItems: 'center',
                transform: 'translate(clamp(1rem,2.5vw,3rem), clamp(1.5rem,3vw,3.5rem))',
              }}
            >
              <CircularText text="LET'S*CREATE*SOMETHING*" spinDuration={22} onHover="speedUp" />
              <video
                ref={spinVideoRef}
                className="contact-spin-gif__media"
                src="/contact_girl_laptop.mp4"
                loop
                muted
                playsInline
                preload="none"
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
                  zIndex: 0,
                }}
              />
            </div>
          </div>

          <p style={{ fontSize: 'clamp(1rem, 1.35vw, 1.25rem)', lineHeight: 1.4, maxWidth: '34rem', marginBottom: '1.2rem' }}>
            {t('body1')}
          </p>
          <p style={{ fontSize: 'clamp(0.95rem, 1.2vw, 1.08rem)', lineHeight: 1.42, maxWidth: '34rem', opacity: 0.82, marginBottom: 'clamp(2.2rem, 4vw, 3.5rem)' }}>
            {t('body2')}
          </p>

          <div style={{ display: 'grid', gap: '0.75rem', marginBottom: 'clamp(2.2rem, 4vw, 3.5rem)' }}>
            <a href={`mailto:${t('email')}`} className="press-fb" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.9rem', width: 'fit-content', color: TEXT, textDecoration: 'none', fontSize: 'clamp(1.1rem, 1.7vw, 1.5rem)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/mail-01.svg" alt="" loading="lazy" decoding="async" style={{ width: '3rem', height: '3rem', display: 'block', filter: 'contrast(1.45)' }} />
              {t('email')}
            </a>
            {phone ? (
              <a href={`tel:${phone}`} aria-label={t('callPhone')} className="press-fb" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.9rem', width: 'fit-content', color: TEXT, textDecoration: 'none', fontSize: 'clamp(1.1rem, 1.7vw, 1.5rem)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/smart-phone-01.svg" alt="" loading="lazy" decoding="async" style={{ width: '3rem', height: '3rem', display: 'block', filter: 'contrast(1.45)' }} />
                {phone}
              </a>
            ) : (
              <button
                type="button"
                onClick={revealPhone}
                className="press-fb"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.9rem', width: 'fit-content', padding: 0, border: 0, background: 'transparent', color: TEXT, cursor: 'pointer', fontSize: 'clamp(1.1rem, 1.7vw, 1.5rem)', fontFamily: 'inherit' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/smart-phone-01.svg" alt="" loading="lazy" decoding="async" style={{ width: '3rem', height: '3rem', display: 'block', filter: 'contrast(1.45)' }} />
                {t('showPhone')}
              </button>
            )}
          </div>

          <p style={{ fontSize: 'clamp(1.15rem, 1.65vw, 1.45rem)', opacity: 0.72 }}>
            {t('tagline')}
          </p>
        </div>
      </div>
    </section>
  );
}

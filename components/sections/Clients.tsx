'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import LogoLoop from '@/components/LogoLoop';
import SplitText from '@/components/SplitText';

// ─── client logos ─────────────────────────────────────────────────────────────

/* width/height = pravilno razmerje stranic pri visini 48px (dejansko
   izrisano velikost nadzoruje CSS v LogoLoop) — brskalniku pove prostor
   vnaprej, da rezervira, in tako prepreci layout shift ob nalaganju. */
const CLIENT_LOGOS = [
  { src: '/Logos/Rokus_Klett.svg',      alt: 'Rokus Klett',    width: 145, height: 48 },
  { src: '/Logos/mBills.svg',           alt: 'mBills',         width: 155, height: 48 },
  { src: '/Logos/Honeywell.svg',        alt: 'Honeywell',      width: 155, height: 48 },
  { src: '/Logos/Mojedelo.svg',         alt: 'MojeDelo.com',   width: 182, height: 48 },
  { src: '/Logos/rekruter.svg',         alt: 'Rekruter',       width: 311, height: 48 },
  { src: '/Logos/studio-moderna.svg',   alt: 'Studio Moderna', width: 585, height: 48 },
  { src: '/Logos/petrol.svg',           alt: 'Petrol',         width: 161, height: 48 },
  { src: '/Logos/cohortem.svg',         alt: 'Cohortem',       width: 193, height: 48 },
  { src: '/Logos/cankarjev dom.svg',    alt: 'Cankarjev dom',  width: 367, height: 48 },
];

// ─── component ────────────────────────────────────────────────────────────────

export default function Clients() {
  const t = useTranslations('clients');
  const [marqueeSpeed, setMarqueeSpeed] = useState(70);

  useEffect(() => {
    const isMobile = window.matchMedia('(max-width: 760px)').matches;
    if (isMobile) setMarqueeSpeed(140);
  }, []);

  return (
    <section
      id="clients"
      className="clients-section"
      style={{
        position:      'relative',
        zIndex:        1,
        minHeight:     '100vh',
        background:    '#fff',
        clipPath:      'polygon(0 clamp(5rem,8vw,8rem), 100% 0, 100% 100%, 0 100%)',
        paddingTop:    'clamp(12rem, 24vh, 18rem)',
        paddingBottom: 'clamp(420px, 42vh, 620px)',
        overflow:      'hidden',
        display:       'flex',
        flexDirection: 'column',
        justifyContent:'flex-end',
      }}
    >
      {/* ── header: kicker + heading | description ──────────────────────── */}
      <div
        className="clients-content"
        style={{
          padding:      '0 clamp(1.25rem, 4vw, 4.5rem)',
          maxWidth:     '1480px',
          width:        '100%',
          margin:       '0 auto',
          marginBottom: 'clamp(3.5rem, 7vw, 6rem)',
        }}
      >
        <div
          className="clients-heading-grid"
          style={{
            display:             'grid',
            gridTemplateColumns: 'minmax(0, 0.58fr) minmax(0, 0.42fr)',
            gap:                 'clamp(2rem, 5vw, 6rem)',
            alignItems:          'center',
          }}
        >
          {/* left */}
          <div>
            <p className="kicker" style={{ marginBottom: '1.5rem' }}>
              {t('kicker')}
            </p>

            <SplitText
              text={t('heading')}
              tag="h2"
              textAlign="left"
              splitType="chars"
              from={{ opacity: 0, y: 60 }}
              to={{ opacity: 1, y: 0 }}
              delay={35}
              duration={0.9}
              ease="power3.out"
              rootMargin="-60px"
              style={{
                fontFamily:    'var(--font-serif)',
                fontSize:      'clamp(4.5rem, 11vw, 12rem)',
                fontWeight:    400,
                lineHeight:    0.88,
                letterSpacing: '-0.03em',
                display:       'block',
                margin:        0,
                maxWidth:      '100%',
              }}
            />
          </div>

          {/* right: description */}
          <p
            className="clients-desc"
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize:   'clamp(1rem, 1.3vw, 1.18rem)',
              lineHeight: 1.58,
              color:      'rgba(17,17,17,0.55)',
              maxWidth:   '38ch',
              margin:     0,
            }}
          >
            {t('desc')}
          </p>
        </div>
      </div>

      {/* ── logo marquee — bleeds to full width ─────────────────────────── */}
      <LogoLoop
        logos={CLIENT_LOGOS}
        speed={marqueeSpeed}
        direction="left"
        logoHeight={48}
        gap={72}
        hoverSpeed={0}
        fadeOut
        fadeOutColor="#fff"
        ariaLabel={t('kicker')}
      />
    </section>
  );
}

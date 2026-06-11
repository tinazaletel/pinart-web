'use client';

import { useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import SplitText from '@/components/SplitText';

// ── service data — images mapped 1-to-1 from codex ───────────────────────────
const SERVICES = [
  { key: 'direction', image: '/creative_direction.png' },
  { key: 'branding',  image: '/branding.jpg' },
  { key: 'graphic',   image: '/work/molly-lolly/Molly_Lolly_knjigice.png' },
  { key: 'marketing', image: '/firefly-billboard.jpg' },
  { key: 'web',       image: '/web_development.png' },
  { key: 'ideas',     image: '/Molly_Lolly_plush_toy-scaled.jpg' },
] as const;

// ── component ─────────────────────────────────────────────────────────────────
export default function Services() {
  const t = useTranslations('services');
  const locale = useLocale();

  const previewRef      = useRef<HTMLDivElement>(null);
  const previewImgRef   = useRef<HTMLImageElement>(null);
  const itemRefs        = useRef<(HTMLElement | null)[]>([]);
  const activeRef       = useRef<number>(0);

  // ── move preview image to vertical centre of the given row ───────────────
  const movePreview = useCallback((idx: number) => {
    const item    = itemRefs.current[idx];
    const preview = previewRef.current;
    if (!item || !preview) return;
    preview.style.top = `${item.offsetTop + item.offsetHeight / 2}px`;
  }, []);

  // ── initialise + keep preview in place on resize ─────────────────────────
  useEffect(() => {
    movePreview(0);
    const onResize = () => movePreview(activeRef.current);
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, [movePreview]);

  // ── hover handler ─────────────────────────────────────────────────────────
  const handleEnter = useCallback((idx: number) => {
    activeRef.current = idx;

    // mark active row
    itemRefs.current.forEach((el, i) => {
      el?.classList.toggle('is-svc-active', i === idx);
    });

    movePreview(idx);

    // crossfade image
    const preview = previewRef.current;
    const img     = previewImgRef.current;
    if (!preview || !img) return;
    preview.classList.add('is-changing');
    setTimeout(() => {
      img.src = SERVICES[idx].image;
      preview.classList.remove('is-changing');
    }, 120);
  }, [movePreview]);

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <section
      id="services"
      className="services-section"
      style={{
        background:    'var(--paper-deep, #ECE6D5)',
        paddingTop:    'clamp(8rem,14vw,13rem)',
        paddingInline: 'clamp(1.25rem,4vw,4.5rem)',
        paddingBottom: 'clamp(20rem,32vw,32rem)',
        clipPath:      'polygon(0 clamp(3rem,5vw,5rem), 100% 0, 100% 100%, 0 100%)',
      }}
    >
      {/* inner content constrained */}
      <div style={{ maxWidth: '1480px', margin: '0 auto' }}>

        {/* ── section title ─────────────────────────────────────────────── */}
        <div
          className="services-heading"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(10rem, 0.38fr) minmax(0, 0.62fr)',
            gap: 'clamp(1.5rem,5vw,5rem)',
            alignItems: 'start',
            marginBottom: 'clamp(2rem,5vw,4rem)',
          }}
        >
          <p className="kicker" style={{ paddingTop: '0.4em' }}>
            {t('kicker')}
          </p>
          <SplitText
            text={t('headline')}
            tag="h2"
            textAlign="left"
            splitType="chars"
            from={{ opacity: 0, y: 40 }}
            to={{ opacity: 1, y: 0 }}
            delay={30}
            duration={0.85}
            ease="power3.out"
            rootMargin="-80px"
            style={{
              fontFamily:    'var(--font-serif)',
              fontSize:      'clamp(2.7rem,6vw,7.4rem)',
              fontWeight:    400,
              lineHeight:    0.92,
              letterSpacing: '-0.025em',
              maxWidth:      '14ch',
              margin:        0,
              display:       'block',
              overflow:      'visible',
            }}
          />
        </div>

        {/* ── service showcase ──────────────────────────────────────────── */}
        <div
          style={{
            position:  'relative',
            borderTop: '1px solid rgba(17,17,17,0.12)',
          }}
        >
          {/* floating preview image */}
          <div
            ref={previewRef}
            className="services-preview"
            aria-hidden
            style={{
              position:   'absolute',
              // moved further left so the thumbnail sits over the gap
              // between the title column and the description column,
              // rather than covering the description paragraph.
              left:       '53%',
              top:        0,
              zIndex:     2,
              width:      'min(24vw,22rem)',
              aspectRatio:'1.24',
              overflow:   'hidden',
              clipPath:   'polygon(6% 12%, 96% 0, 88% 88%, 14% 100%)',
              pointerEvents: 'none',
              transform:  'translate(-50%, -50%) rotate(-3deg)',
              transition: 'top 420ms cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow:  '0 1.8rem 4rem rgba(17,17,17,0.16)',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={previewImgRef}
              src={SERVICES[0].image}
              alt=""
              style={{
                width:      '100%',
                height:     '100%',
                objectFit:  'cover',
                transition: 'opacity 180ms ease-out, transform 520ms cubic-bezier(0.16,1,0.3,1)',
              }}
            />
          </div>

          {/* ── service rows ─────────────────────────────────────────────── */}
          {SERVICES.map(({ key, image }, i) => (
            <article
              key={key}
              ref={el => { itemRefs.current[i] = el; }}
              className={`service-row ${i === 0 ? 'is-svc-active' : ''}`}
              onPointerEnter={() => handleEnter(i)}
              style={{
                position:            'relative',
                zIndex:              1,
                borderBottom:        '1px solid rgba(17,17,17,0.12)',
                display:             'grid',
                gridTemplateColumns: 'minmax(3rem,0.08fr) minmax(0,0.56fr) minmax(16rem,0.36fr)',
                gap:                 'clamp(0.65rem,2vw,1.6rem)',
                alignItems:         'center',
                minHeight:           'clamp(6.4rem,12.8vw,12.2rem)',
                paddingBlock:        'clamp(0.65rem,1.55vw,1.35rem)',
                cursor:              'default',
              }}
            >
              {/* index */}
              <span
                style={{
                  alignSelf:     'start',
                  paddingTop:    '0.36rem',
                  color:         'rgba(17,17,17,0.45)',
                  fontFamily:    'var(--font-sans)',
                  fontSize:      'clamp(0.72rem,0.85vw,0.86rem)',
                  letterSpacing: '0.08em',
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>

              {/* name — large serif, animates in on scroll */}
              <SplitText
                text={key === 'marketing' ? 'Marketing' : t(`items.${key}.title`)}
                tag="span"
                className="svc-name"
                textAlign="left"
                splitType="chars"
                from={{ opacity: 0, y: 28 }}
                to={{ opacity: 1, y: 0 }}
                delay={18}
                duration={0.72}
                ease="power3.out"
                rootMargin="-30px"
                style={{
                  fontFamily:    'var(--font-condensed)',
                  fontSize:      'clamp(1.85rem,4.25vw,4.65rem)',
                  fontWeight:    500,
                  lineHeight:    1.05,
                  letterSpacing: '-0.01em',
                  color:         'var(--ink)',
                  mixBlendMode:  'multiply' as React.CSSProperties['mixBlendMode'],
                  display:       'block',
                  paddingRight:  '0.15em',
                  transition:    'transform 520ms cubic-bezier(0.16,1,0.3,1)',
                }}
              />

              {/* Entire description block is a link to the service subpage. */}
              <Link
                href={`/${locale}/services/${key}`}
                className="service-desc"
                style={{
                  display:    'block',
                  margin:     0,
                  fontFamily: 'var(--font-sans)',
                  fontSize:   'clamp(1.02rem,1.25vw,1.2rem)',
                  fontWeight: 300,
                  lineHeight: 1.42,
                  color:      'rgba(17,17,17,0.72)',
                  maxWidth:   '20rem',
                  textDecoration: 'none',
                  cursor:     'pointer',
                }}
              >
                {t(`items.${key}.desc`)}
                {' '}
                <span
                  style={{
                    fontFamily:              'var(--font-sans)',
                    fontWeight:              500,
                    color:                   'var(--ink)',
                    textDecoration:          'underline',
                    textDecorationThickness: '1px',
                    textUnderlineOffset:     '0.22em',
                    whiteSpace:              'nowrap',
                  }}
                >
                  more&nbsp;→
                </span>
              </Link>

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="service-mobile-visual"
                src={image}
                alt=""
                aria-hidden
              />
            </article>
          ))}

          {/* bottom border line */}
          <div style={{ borderTop: '1px solid rgba(17,17,17,0.12)' }} />
        </div>
      </div>
    </section>
  );
}

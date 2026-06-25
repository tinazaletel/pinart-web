'use client';

import { useRef, useEffect } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { gsap } from '@/lib/gsap';
import SplitText from '@/components/SplitText';

const CLIP_ODD  = 'polygon(6% 12%, 92% 0, 100% 48%, 91% 100%, 8% 88%, 0 44%)';
const CLIP_EVEN = 'polygon(8% 0, 94% 12%, 100% 56%, 92% 88%, 6% 100%, 0 48%)';

const PROJECTS = [
  {
    num: '01',
    slug: 'petrol-pay',
    title: 'Petrol Loyalty',
    image: '/work/petrol-pay/Petrol_Pay_loyalty_gold.jpg',
    video: '/petrol-card-loop.mp4',
  },
  {
    num: '02',
    slug: 'mbills',
    title: 'mBills',
    image: '/mbills_backrgound.jpg',
    mobileImage: '/New_mBills_background_mobile.jpg',
  },
  {
    num: '03',
    slug: 'lucky-7',
    title: 'Lucky 7',
    image: '/work/lucky-7/lucky_7_primeri.jpg',
    video: '/lucky-7-loop.mp4',
  },
  {
    num: '04',
    slug: 'molly-lolly',
    title: 'Molly Lolly',
    image: '/Molly_Lolly_plush_toy-scaled.jpg',
  },
] as const;

export default function Projects() {
  const t = useTranslations('projects');
  const locale = useLocale();
  const outerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const titleRefs = useRef<(HTMLDivElement | null)[]>([]);
  const maskRefs = useRef<(HTMLDivElement | null)[]>([]);
  const mediaRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ctx = gsap.context(() => {
      PROJECTS.forEach((_p, i) => {
        const outer = outerRefs.current[i];
        const title = titleRefs.current[i];
        const mask = maskRefs.current[i];
        const media = mediaRefs.current[i];
        if (!outer || !title || !mask || !media) return;

        if (prefersReduced) {
          gsap.set(mask, { scale: 1 });
          gsap.set(media, { scale: 1 });
          gsap.set(title, { autoAlpha: 1, y: 0 });
          return;
        }

        // Slika se animira kot deformiran šestkotnik.
        // Pri polni velikosti je šestkotnik večji od viewporta, zato robovi izginejo iz ekrana.
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: outer,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 0.6,
          },
        });

        tl.fromTo(mask,
          { scale: 0.18, transformOrigin: '50% 50%' },
          { scale: 1.08, ease: 'none', duration: 0.34 },
          0,
        );
        tl.to(mask,
          { scale: 1.62, ease: 'none', duration: 0.18 },
          0.34,
        );
        tl.to(media,
          { scale: 0.74, ease: 'none', duration: 0.18 },
          0.34,
        );
        tl.to(mask,
          { scale: 0.18, ease: 'none', duration: 0.28 },
          0.52,
        );
        tl.to(media,
          { scale: 1, ease: 'none', duration: 0.28 },
          0.52,
        );

        // Rahel zoom na sliki med platom
        tl.fromTo(mask,
          { filter: 'brightness(0.85)' },
          { filter: 'brightness(1.0)', ease: 'none', duration: 0.35 },
          0,
        );

        // Naslov
        tl.fromTo(title,
          { y: 40, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, ease: 'none', duration: 0.20 },
          0.20,
        );
        tl.to(title,
          { y: -40, autoAlpha: 0, ease: 'none', duration: 0.20 },
          0.52,
        );
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="work"
      style={{
        position:   'relative',
        zIndex:     1,
        marginTop:  'calc(-1 * clamp(3rem,5vw,5rem))',
        clipPath:   'polygon(0 0, 100% clamp(3rem,5vw,5rem), 100% 100%, 0 100%)',
        background: 'var(--paper, #F5F2EA)',
        // SmoothScroll auto-compensates for the negative marginTop above so
        // anchor links land at the visual start of this section.
      }}
    >
      <div
        className="px-10 md:px-14 lg:px-16 pb-16"
        style={{
          display:             'grid',
          gridTemplateColumns: 'minmax(0,1fr) minmax(0,2fr)',
          gap:                 'clamp(1.5rem,4vw,3rem)',
          alignItems:          'start',
          maxWidth:            '1480px',
          margin:              '0 auto',
          paddingTop:          'clamp(8rem,14vw,13rem)',
        }}
      >
        <p className="kicker" style={{ paddingTop: '0.4em' }}>{t('kicker')}</p>
        <div>
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
              lineHeight:    1.05,
              letterSpacing: '-0.025em',
              maxWidth:      '14ch',
              color:         'var(--ink)',
            }}
          />
          <p style={{
            marginTop:    'clamp(1.5rem,2.5vw,2.25rem)',
            marginBottom: 0,
            maxWidth:     '48ch',
            fontFamily:   'var(--font-sans)',
            fontSize:     'clamp(1.02rem,1.25vw,1.2rem)',
            fontWeight:   300,
            lineHeight:   1.42,
            color:        'rgba(17,17,17,0.72)',
          }}>
            {t('intro')}
          </p>
        </div>
      </div>

      {PROJECTS.map((project, i) => (
        <div
          key={project.num}
          ref={el => { outerRefs.current[i] = el; }}
          style={{ height: '105vh' }}
        >
          {/* Sticky viewport */}
          <div
            className="relative sticky top-0 h-screen overflow-hidden"
            style={{
              background: 'var(--paper)',
            }}
          >
            {/* Slika se animira kot deformiran šestkotnik */}
            <div
              className="absolute left-1/2 top-1/2 h-screen w-screen -translate-x-1/2 -translate-y-1/2"
            >
              <div
                ref={el => { maskRefs.current[i] = el; }}
                className="relative h-full w-full"
                style={{
                  clipPath:        i % 2 === 0 ? CLIP_ODD : CLIP_EVEN,
                  transformOrigin: '50% 50%',
                  transform:       'scale(0.18)',
                  willChange:      'transform',
                }}
              >
              {'video' in project ? (
                <video
                  ref={el => { mediaRefs.current[i] = el; }}
                  className="absolute inset-0 h-full w-full object-cover"
                  src={project.video}
                  poster={project.image}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="auto"
                />
              ) : (
                <picture>
                  {'mobileImage' in project && (
                    <source media="(max-width: 767px)" srcSet={project.mobileImage} />
                  )}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    ref={el => { mediaRefs.current[i] = el; }}
                    src={project.image}
                    alt={project.title}
                    className="absolute inset-0 h-full w-full object-cover"
                    loading={i === 0 ? 'eager' : 'lazy'}
                  />
                </picture>
              )}
              <div className="absolute inset-0 bg-ink/30" />
            </div>
            </div>

            {/* Title overlay */}
            <div
              ref={el => { titleRefs.current[i] = el; }}
              className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
              style={{ opacity: 0 }}
            >
              <span className="font-sans font-semibold text-paper/90 mb-6 tracking-[0.2em] uppercase" style={{ fontSize: 'clamp(12px, 0.85vw, 15px)', textShadow: '0 1px 10px rgba(0,0,0,0.45)' }}>
                {project.num} — {String(PROJECTS.length).padStart(2, '0')}
              </span>
              <SplitText
                text={project.title}
                tag="h2"
                className="font-serif text-paper leading-[0.9]"
                textAlign="center"
                splitType="chars"
                from={{ opacity: 0, y: 40 }}
                to={{ opacity: 1, y: 0 }}
                delay={30}
                duration={0.85}
                ease="power3.out"
                rootMargin="-80px"
                style={{ fontSize: 'clamp(3.5rem, 11vw, 10rem)', letterSpacing: '-0.02em', color: 'var(--paper)' }}
              />
              <span className="font-sans font-semibold text-paper/95 mt-6 uppercase tracking-[0.18em]" style={{ fontSize: 'clamp(13px, 0.95vw, 16px)', textShadow: '0 1px 12px rgba(0,0,0,0.55)' }}>
                {t(`items.${project.slug}.category`)}
              </span>
              <p className="font-sans text-paper/90 mt-4 text-center leading-[1.55]" style={{ fontSize: 'clamp(15px, 1.05vw, 18px)', fontWeight: 500, maxWidth: '34ch', textShadow: '0 1px 14px rgba(0,0,0,0.6)' }}>
                {t(`items.${project.slug}.desc`)}
              </p>
              <Link
                href={`/${locale}/work/${project.slug}`}
                className="font-sans uppercase mt-8"
                onClick={() => window.dispatchEvent(new CustomEvent('pinart-page-leave'))}
                style={{
                  pointerEvents:  'auto',
                  display:        'inline-flex',
                  alignItems:     'center',
                  gap:            '0.6rem',
                  padding:        '0.85rem 1.6rem',
                  borderRadius:   '999px',
                  border:         '1px solid rgba(245,242,234,0.55)',
                  color:          'var(--paper)',
                  fontSize:       '0.74rem',
                  fontWeight:     600,
                  letterSpacing:  '0.22em',
                  backdropFilter: 'blur(6px)',
                  background:     'rgba(17,17,17,0.18)',
                  textShadow:     '0 1px 8px rgba(0,0,0,0.5)',
                  transition:     'background .2s ease, transform .2s ease',
                }}
              >
                {t('more')} <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      ))}
      <div
        className="px-10 md:px-14 lg:px-16"
        style={{
          maxWidth:      '1480px',
          margin:        '0 auto',
          paddingTop:    'clamp(3rem,6vw,5rem)',
          paddingBottom: 'clamp(5rem,9vw,8rem)',
          textAlign:     'center',
        }}
      >
        <Link
          href={`/${locale}/more-work`}
          className="font-sans uppercase"
          onClick={() => window.dispatchEvent(new CustomEvent('pinart-page-leave'))}
          style={{
            display:        'inline-flex',
            alignItems:     'center',
            justifyContent: 'center',
            minHeight:      '3.25rem',
            padding:        '0 2rem',
            border:         '1.5px solid var(--ink)',
            borderRadius:   '999px',
            color:          'var(--ink)',
            fontSize:       '0.78rem',
            fontWeight:     600,
            letterSpacing:  '0.18em',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/album-02.svg" alt="" aria-hidden style={{ width: '1.1rem', height: '1.1rem', marginRight: '0.55rem', display: 'block' }} />
          {t('moreWork')}
        </Link>
      </div>
    </section>
  );
}

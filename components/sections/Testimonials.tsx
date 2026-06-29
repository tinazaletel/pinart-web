'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { gsap } from '@/lib/gsap';
import CircularText from '@/components/CircularText';

// ─── ink transition helpers (shared formula with TypographyCollapse) ──────────

const NUM_POINTS = 10;
const BG = 'oklch(0.07 0.01 58)';

function buildCoverD(pts: number[]): string {
  let d = `M 0 0 V ${pts[0]} C`;
  for (let j = 0; j < NUM_POINTS - 1; j++) {
    const p  = (j + 1) / (NUM_POINTS - 1) * 100;
    const cp = p - (1 / (NUM_POINTS - 1) * 100) / 2;
    d += ` ${cp} ${pts[j]} ${cp} ${pts[j + 1]} ${p} ${pts[j + 1]}`;
  }
  d += ' V 100 H 0';
  return d;
}

function buildRevealD(pts: number[]): string {
  let d = `M 0 ${pts[0]} C`;
  for (let j = 0; j < NUM_POINTS - 1; j++) {
    const p  = (j + 1) / (NUM_POINTS - 1) * 100;
    const cp = p - (1 / (NUM_POINTS - 1) * 100) / 2;
    d += ` ${cp} ${pts[j]} ${cp} ${pts[j + 1]} ${p} ${pts[j + 1]}`;
  }
  d += ' V 0 H 0';
  return d;
}

// ─── testimonial data ─────────────────────────────────────────────────────────

const CARDS = [
  {
    key:    'inovis' as const,
    author: 'Uroš Lesjak',
    role:   'Direktor, Inovis IT d.o.o.',
    image:  '/Uros_Lesjak.jpeg',
    rot: '-8deg', left: '0%',   top: '10%',  width: '48%',
  },
  {
    key:    'mbills' as const,
    author: 'Primož Župan',
    role:   'Direktor mBills',
    href:   'https://www.linkedin.com/in/primoz-zupan/',
    image:  '/Primoz_Zupan.png',
    rot:  '8deg', left: '48%',  top: '-2%',  width: '50%',
  },
  {
    key:    'medipedi' as const,
    author: 'Daša Jovanović',
    role:   'MediPedi',
    rot:  '7deg', left: '3%',   top: '53%',  width: '49%',
  },
  {
    key:    'rekruter' as const,
    author: 'Jure Košir',
    role:   'Rekruter',
    rot: '-9deg', left: '51%',  top: '53%',  width: '48%',
  },
];

// ─── component ────────────────────────────────────────────────────────────────

export default function Testimonials() {
  const t = useTranslations('testimonials');
  const sectionRef  = useRef<HTMLElement>(null);
  const svgRef      = useRef<SVGSVGElement>(null);
  const pathRef     = useRef<SVGPathElement>(null);
  const contentRef  = useRef<HTMLDivElement>(null);
  const triggeredRef = useRef(false);
  const [activeCard, setActiveCard] = useState<number | null>(null);
  const isRevealedRef = useRef(false);

  useEffect(() => {
    const RM      = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const section = sectionRef.current;
    const svgEl   = svgRef.current;
    const pathEl  = pathRef.current;
    const content = contentRef.current;
    if (!section || !svgEl || !pathEl || !content) return;
    const coverPts:  number[] = Array(NUM_POINTS).fill(100);
    const revealPts: number[] = Array(NUM_POINTS).fill(100);
    let phase: 'idle' | 'covering' | 'revealing' = 'idle';

    function renderPath() {
      if (!pathEl) return;
      if (phase === 'covering')  pathEl.setAttribute('d', buildCoverD(coverPts));
      if (phase === 'revealing') pathEl.setAttribute('d', buildRevealD(revealPts));
    }

    if (pathEl) pathEl.setAttribute('d', buildCoverD(coverPts));

    // ── reveal: blur-in each direct child of content ──────────────────────────
    function revealContent() {
      if (!content) return;
      isRevealedRef.current = true;
      if (section) {
        section.style.background = BG;
        section.removeAttribute('data-nav-light-ui');
        window.dispatchEvent(new Event('scroll'));
      }

      // Animate left column children
      Array.from(content.children).forEach((el, i) => {
        gsap.fromTo(
          el,
          { opacity: 0, filter: 'blur(14px)', y: 22 },
          { opacity: 1, filter: 'blur(0px)', y: 0, duration: 0.6, delay: i * 0.06, ease: 'power3.out' },
        );
      });

      // Desktop: reveal all cards together as the ink recedes. On mobile each
      // card flies in on its own as it scrolls into view (see the dedicated
      // mobile effect), so the ink reveal leaves the cards to that observer.
      const cards = section?.querySelectorAll<HTMLElement>('.testimonial-card');
      if (cards && !window.matchMedia('(max-width: 760px)').matches) {
        gsap.fromTo(
          Array.from(cards),
          { opacity: 0, scale: 0.88, y: 48 },
          { opacity: 1, scale: 1, y: 0, duration: 0.6, stagger: 0.09, delay: 0.06, ease: 'back.out(1.35)' },
        );
      }
    }

    // ── two-phase ink transition (identical pattern to TypographyCollapse) ────
    function triggerTransition() {
      if (RM) { revealContent(); return; }

      if (svgEl) svgEl.style.opacity = '1';
      window.dispatchEvent(new CustomEvent('pinart-lenis-stop'));

      // Ink-transition timing — skupni zaklep scrolla = cover + gap + reveal.
      // Skrajšano (~2.3s → ~1s) da scroll ne zmrzne predolgo, ink ostane enak.
      const INK_COVER  = 0.5;    // prej 0.7, vmes 0.35 (prehitro)
      const INK_REVEAL = 0.55;   // prej 0.9, vmes 0.4 (prehitro)
      const INK_STAGGER = 0.16;  // prej 0.3 — organska neenakomernost roba
      const INK_GAP    = 50;     // ms, prej 80
      const coverDelay  = Array.from({ length: NUM_POINTS }, () => Math.random() * INK_STAGGER);
      const revealDelay = Array.from({ length: NUM_POINTS }, () => Math.random() * INK_STAGGER);

      phase = 'covering';
      coverPts.fill(100);

      const tl1 = gsap.timeline({
        onUpdate: renderPath,
        onComplete: () => {
          if (section) {
            const top = Math.round(section.getBoundingClientRect().top + window.scrollY);
            window.dispatchEvent(new CustomEvent('pinart-snap', { detail: { y: top } }));
            // Set background before reveal starts so the light Projects section
            // below doesn't flash through while the dark ink recedes.
            section.style.background = BG;
          }
          setTimeout(() => {
            phase = 'revealing';
            revealPts.fill(100);

            // Start the content reveal AS the ink recedes (not after) so the
            // cards aren't perceived as appearing late.
            revealContent();

            const tl2 = gsap.timeline({
              onUpdate: renderPath,
              onComplete: () => {
                phase = 'idle';
                if (svgEl) { svgEl.style.opacity = '0'; svgEl.style.pointerEvents = 'none'; }
                window.dispatchEvent(new CustomEvent('pinart-lenis-start'));
              },
              defaults: { ease: 'power2.inOut', duration: INK_REVEAL },
            });

            for (let j = 0; j < NUM_POINTS; j++) {
              tl2.to(revealPts, { [j]: 0 }, revealDelay[j]);
            }
          }, INK_GAP);
        },
        defaults: { ease: 'power2.inOut', duration: INK_COVER },
      });

      for (let j = 0; j < NUM_POINTS; j++) {
        tl1.to(coverPts, { [j]: 0 }, coverDelay[j]);
      }
    }

    // ── reset on scroll-up ────────────────────────────────────────────────────
    function resetTransition() {
      gsap.killTweensOf(coverPts);
      gsap.killTweensOf(revealPts);
      phase = 'idle';
      isRevealedRef.current = false;
      if (section) {
        section.style.background = 'transparent';
        section.setAttribute('data-nav-light-ui', 'true');
      }
      window.dispatchEvent(new CustomEvent('pinart-lenis-start'));
      coverPts.fill(100);
      revealPts.fill(100);
      if (pathEl) pathEl.setAttribute('d', buildCoverD(coverPts));
      if (svgEl)  { svgEl.style.opacity = '0'; svgEl.style.pointerEvents = 'none'; }
      if (content) {
        Array.from(content.children).forEach((el) => {
          (el as HTMLElement).style.opacity = '0';
          (el as HTMLElement).style.filter  = '';
        });
      }
      // reset cards opacity so they're ready for next reveal (desktop only —
      // on mobile the per-card scroll observers own the cards; re-hiding them
      // here would leave them invisible since those observers are one-shot).
      if (!window.matchMedia('(max-width: 760px)').matches) {
        const cards = section?.querySelectorAll<HTMLElement>('.testimonial-card');
        cards?.forEach(c => { c.style.opacity = '0'; c.style.transform = ''; });
      }
    }

    // ── scroll trigger ────────────────────────────────────────────────────────
    const isMobile = window.matchMedia('(max-width: 700px)').matches;
    const triggerPoint = isMobile ? 0.72 : 0.92;
    let prevY = window.scrollY;
    const onScroll = () => {
      const curY = window.scrollY;
      const dy   = curY - prevY;
      prevY      = curY;
      const rect = section.getBoundingClientRect();

      if (dy > 0 && !triggeredRef.current && rect.top <= window.innerHeight * triggerPoint && rect.bottom > 0) {
        triggeredRef.current = true;
        triggerTransition();
        return;
      }

      if (dy < 0 && triggeredRef.current) {
        if (rect.top >= window.innerHeight || rect.bottom <= 0) {
          triggeredRef.current = false;
          resetTransition();
        }
      }
    };

    // Nav uses Lenis to jump across the page — suppress this ink transition
    // so it doesn't hijack the scroll mid-flight.
    const onSkipInk = () => {
      if (triggeredRef.current) return;
      triggeredRef.current = true;
      if (svgEl) { svgEl.style.opacity = '0'; svgEl.style.pointerEvents = 'none'; }
      revealContent();
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pinart-skip-ink', onSkipInk);

    return () => {
      window.dispatchEvent(new CustomEvent('pinart-lenis-start'));
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pinart-skip-ink', onSkipInk);
      gsap.killTweensOf(coverPts);
      gsap.killTweensOf(revealPts);
    };
  }, []);

  // Mobile (<=700px): each card flies in from an alternating side as it scrolls
  // into view — 1st from the right, 2nd from the left, 3rd right, 4th left —
  // slow and soft, with a fade, one after another. (Desktop reveals them all
  // together via the ink transition.) marginLeft drives the slide because the
  // mobile .testimonial-card has `transform: rotate(0deg) !important`, which
  // would override a GSAP-set transform; the section's overflow:hidden clips the
  // off-screen start so no horizontal scrollbar appears.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    let ios: IntersectionObserver[] = [];
    let active = false;

    const setup = () => {
      const cards = Array.from(section.querySelectorAll<HTMLElement>('.testimonial-card'));
      if (!cards.length) return;
      const dx = Math.round(window.innerWidth * 0.9);
      cards.forEach((card, i) => {
        const fromX = i % 2 === 0 ? dx : -dx; // even -> right, odd -> left
        // Keep the card in its layout spot (just invisible) so the observer reads
        // its true on-screen position; the off-screen start exists only during the
        // fromTo. Disconnect once it plays so the off-screen frame can't make the
        // observer fire again mid-animation.
        gsap.set(card, { opacity: 0, marginLeft: 0 });
        const io = new IntersectionObserver(
          (entries) => {
            if (!entries[0].isIntersecting) return;
            io.disconnect();
            gsap.fromTo(
              card,
              { opacity: 0, marginLeft: fromX },
              { opacity: 1, marginLeft: 0, duration: 0.95, ease: 'power3.out' },
            );
          },
          { threshold: 0.35 },
        );
        io.observe(card);
        ios.push(io);
      });
      active = true;
    };
    const teardown = () => { ios.forEach((io) => io.disconnect()); ios = []; active = false; };

    // Re-evaluate on resize so the per-card mobile reveal engages whenever the
    // viewport is mobile — including when a desktop window is narrowed to mobile
    // after load (otherwise the desktop "all at once" reveal would run instead).
    const evaluate = () => {
      const mobile = window.matchMedia('(max-width: 760px)').matches;
      if (mobile && !active) setup();
      else if (!mobile && active) teardown(); // desktop revealContent owns the cards
    };
    evaluate();
    window.addEventListener('resize', evaluate);
    return () => { window.removeEventListener('resize', evaluate); teardown(); };
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const activateCard = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const card = target.closest<HTMLElement>('.testimonial-card');
      if (!card || !section.contains(card)) return;
      const index = Number(card.dataset.cardIndex);
      if (Number.isNaN(index)) return;
      setActiveCard(index);
      card.focus({ preventScroll: true });
    };

    // Set initial light-UI flag via JS (not JSX) so React re-renders
    // don't override what the animation logic sets via removeAttribute.
    section.setAttribute('data-nav-light-ui', 'true');

    section.addEventListener('pointerdown', activateCard, true);
    section.addEventListener('click', activateCard, true);
    return () => {
      section.removeEventListener('pointerdown', activateCard, true);
      section.removeEventListener('click', activateCard, true);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="testimonials"
      data-nav-dark="true"
      style={{
        position:   'relative',
        zIndex:     20,
        isolation:  'isolate',
        background: 'transparent',
        minHeight:  '100svh',
        overflow:   'hidden',
        display:    'flex',
        flexDirection: 'column',
        alignItems: 'center',
        // top padding is bumped by 100px on desktop only (>= md) to avoid
        // overlap with the fixed nav; mobile keeps original spacing.
        paddingTop:    'clamp(4rem,9vw,8rem)',
        paddingBottom: 'clamp(4rem,9vw,8rem)',
        paddingInline: 0,
        pointerEvents: 'auto',
      }}
      className="md:!pt-[calc(clamp(4rem,9vw,8rem)+100px)]"
    >
      {/* ── fixed ink overlay ─────────────────────────────────────────────── */}
      <svg
        ref={svgRef}
        aria-hidden
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{
          position:      'fixed',
          top:           '-3vh',
          left:           0,
          width:         '100vw',
          height:        '106vh',
          zIndex:        500,
          pointerEvents: 'none',
          opacity:       0,
        }}
      >
        <path ref={pathRef} fill={BG} />
      </svg>

      {/* ── content — hidden until ink reveals ────────────────────────────── */}
      <div
        ref={contentRef}
        className="testimonials-grid"
        style={{
          display:             'grid',
          gridTemplateColumns: 'minmax(16rem,0.9fr) minmax(0,1.1fr)',
          gap:                 'clamp(3rem,7vw,7rem)',
          alignItems:          'center',
          width:               '100%',
          paddingInline:        'clamp(1.25rem,4vw,4.5rem)',
          position:            'relative',
          zIndex:              2,
          pointerEvents:       'auto',
        }}
      >
        {/* left — text ────────────────────────────────────────────────────── */}
        <div style={{ opacity: 0 }}>
          <div className="testimonials-copy">
            <div>
              <p className="kicker" style={{ color: 'rgba(245,242,234,0.72)', marginBottom: '1.4rem' }}>
                {t('kicker')}
              </p>
              <h2
                style={{
                  fontFamily:    'var(--font-serif)',
                  fontSize:      'clamp(3.6rem,7.4vw,9rem)',
                  fontWeight:    400,
                  lineHeight:    0.96,
                  letterSpacing: '-0.03em',
                  color:         'rgba(245,242,234,0.96)',
                  marginBottom:  '1.6rem',
                }}
              >
                {t('headlineL1')}<br />{t('headlineL2')}
              </h2>
              <p
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize:   'clamp(0.9rem,1.3vw,1.1rem)',
                  lineHeight: 1.65,
                  color:      'rgba(245,242,234,0.68)',
                  maxWidth:   '34rem',
                }}
              >
                Nekaj mnenj naših strank ali ljudi, s katerimi smo sodelovali.
              </p>
            </div>
            <div
              className="testimonials-circular"
              style={{
                position: 'relative',
                width: 'clamp(8rem, 14vw, 13rem)',
                height: 'clamp(8rem, 14vw, 13rem)',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <CircularText
                text={t('circle')}
                spinDuration={22}
                onHover="speedUp"
              />
              <video
                src="/testimonials_girl_spin.mp4"
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                aria-hidden
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: '58%',
                  aspectRatio: '1',
                  transform: 'translate(-50%, -50%)',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  background: 'rgba(245,242,234,0.14)',
                  pointerEvents: 'none',
                  zIndex: 0,
                }}
              />
            </div>
          </div>
        </div>

        {/* right — scattered cards ─────────────────────────────────────────── */}
        <div
          className="testimonial-cards"
          style={{
            position: 'relative',
            zIndex: 5,
            height: 'clamp(620px,58vw,760px)',
            paddingTop: 'clamp(3.2rem,5vw,4.5rem)',
            marginTop: 'clamp(-3.2rem,-5vw,-4.5rem)',
            pointerEvents: 'auto',
          }}
        >
          {CARDS.map((card, i) => (
            <div
              key={i}
              className="testimonial-card"
              data-card-index={i}
              onMouseEnter={() => setActiveCard(i)}
              onFocus={() => setActiveCard(i)}
              onPointerDown={() => setActiveCard(i)}
              onClick={() => setActiveCard(i)}
              tabIndex={0}
              role="button"
              aria-pressed={activeCard === i}
              style={{
                position:     'absolute',
                left:          card.left,
                top:           card.top,
                width:         card.width,
                overflow:       'visible',
                transform:      `rotate(${activeCard === i ? '0deg' : card.rot}) scale(${activeCard === i ? 1.06 : 1})`,
                zIndex:         activeCard === i ? 80 : i + 1,
                opacity:       0,
                pointerEvents: 'auto',
                background:   'rgba(245,242,234,0.97)',
                borderRadius: 'clamp(10px,1.5vw,18px)',
                padding:      card.image
                  ? 'clamp(3.4rem,5vw,4.8rem) clamp(1.2rem,2.5vw,2rem) clamp(1.2rem,2.5vw,2rem)'
                  : 'clamp(1.2rem,2.5vw,2rem)',
                boxShadow:    '0 12px 48px rgba(0,0,0,0.45)',
                cursor:       'pointer',
                transition:   'transform 0.28s ease, box-shadow 0.28s ease, z-index 0s',
                outline:      'none',
              }}
            >
              {card.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={card.image}
                  alt=""
                  aria-hidden
                  loading="lazy"
                  decoding="async"
                  style={{
                    position: 'absolute',
                    top: '-2.8rem',
                    right: 'clamp(1.5rem,3vw,3rem)',
                    width: 'clamp(4.2rem,6vw,5.8rem)',
                    aspectRatio: '1',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    objectPosition: 'center top',
                    boxShadow: '0 10px 28px rgba(0,0,0,0.22)',
                  }}
                />
              )}
              <div
                style={{
                  maxHeight: activeCard === i ? 'min(60vh, 720px)' : 'none',
                  overflowY: activeCard === i ? 'auto' : 'visible',
                  paddingRight: activeCard === i ? '0.35rem' : 0,
                }}
              >
                <h3
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 'clamp(1.25rem,1.7vw,1.8rem)',
                  fontWeight: 400,
                  lineHeight: 1.05,
                  color: 'oklch(0.10 0.01 58)',
                  marginBottom: '0.8rem',
                }}
              >
                {t(`items.${card.key}Title`)}
                </h3>
                <p
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 'clamp(0.82rem,0.95vw,0.96rem)',
                  lineHeight: 1.45,
                  color: 'oklch(0.22 0.01 58)',
                  marginBottom: '1rem',
                }}
              >
                {t(`items.${card.key}`)}
                </p>
                {card.href ? (
                  <a
                    href={card.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    style={{
                      display: 'inline-block',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '0.72rem',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: 'oklch(0.26 0.01 58)',
                      marginBottom: '0.25rem',
                      textDecoration: 'none',
                    }}
                  >
                    {card.author}
                  </a>
                ) : (
                  <p
                    style={{
                      fontFamily:    'var(--font-sans)',
                      fontSize:      '0.72rem',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color:         'oklch(0.26 0.01 58)',
                      marginBottom:  '0.25rem',
                    }}
                  >
                    {card.author}
                  </p>
                )}
                <p
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '0.76rem',
                    color: 'oklch(0.42 0.01 58)',
                  }}
                >
                  {card.role}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

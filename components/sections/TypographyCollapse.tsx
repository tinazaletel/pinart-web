'use client';

import { useEffect, useMemo, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { gsap } from '@/lib/gsap';

// ─── static data ──────────────────────────────────────────────────────────────

const LINE_ALPHA = [0.96, 0.40, 0.96, 0.40, 0.96, 0.40];

interface CharDef { ch: string; li: number; ci: number; }
function gIdx(chars: CharDef[], li: number, ci: number) {
  return chars.findIndex(c => c.li === li && c.ci === ci);
}

// ─── transition path builders ─────────────────────────────────────────────────

const NUM_POINTS = 10;

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

// ─── physics ───────────────────────────────────────────────────────────────────

interface Letter {
  node: HTMLElement;
  baseY: number;     // initial top relative to section (set after reveal)
  x: number; y: number;
  vx: number; vy: number;
  angle: number; va: number;
  active: boolean;
  resting: boolean;
}

export default function TypographyCollapse() {
  const t          = useTranslations('typography');
  const pathname   = usePathname();
  const sectionRef = useRef<HTMLElement>(null);

  const LINES = useMemo(() => t.raw('words') as string[], [t]);
  const CHARS = useMemo(() => {
    const chars: CharDef[] = [];
    LINES.forEach((w, li) => w.split('').forEach((ch, ci) => chars.push({ ch, li, ci })));
    return chars;
  }, [LINES]);
  const LINE_SLICES = useMemo(() => LINES.map((_, li) => CHARS.filter(c => c.li === li)), [LINES, CHARS]);
  const spanRefs   = useRef<HTMLSpanElement[]>([]);
  const pathRef    = useRef<SVGPathElement>(null);
  const svgRef     = useRef<SVGSVGElement>(null);
  const hintRef    = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const spans = spanRefs.current.filter(Boolean);
    const hint = hintRef.current;

    // ── physics state ────────────────────────────────────────────────────────
    const letters: Letter[] = spans.map(node => ({
      node, baseY: 0,
      x: 0, y: 0, vx: 0, vy: 0, angle: 0, va: 0,
      active: false, resting: false,
    }));

    let running = false;
    let hasCollapsed = false;
    let kicksEnabled = false;
    let raf = 0;

    const measureBaselines = () => {
      const sRect = section.getBoundingClientRect();
      letters.forEach(l => {
        const r = l.node.getBoundingClientRect();
        l.baseY = r.top - sRect.top + r.height / 2;
      });
    };

    const kick = (l: Letter) => {
      if (l.resting || !kicksEnabled) return;
      if (hint) hint.style.opacity = '0';
      l.active = true;
      hasCollapsed = true;
      running = true;
      l.vx = (Math.random() - 0.5) * 22;
      l.vy = -(Math.random() * 9 + 4);
      l.va = (Math.random() - 0.5) * 26;
    };

    const resetLetters = () => {
      letters.forEach(l => {
        l.x = 0; l.y = 0; l.vx = 0; l.vy = 0;
        l.angle = 0; l.va = 0;
        l.active = false; l.resting = false;
        l.node.style.transform = '';
      });
      running = false;
      hasCollapsed = false;
    };

    const tick = () => {
      if (running) {
        // absolutni floor v koordinatah sekcije — vse črke pristanejo na isti višini
        // ~30px nad robom sekcije: center črke pri dnu → ~50% črke vidne, spodnja polovica odrezana
        const absFloor = section.clientHeight - 30;
        let stillActive = false;
        letters.forEach(l => {
          if (!l.active) return;
          // dovoljeni y-offset = absFloor − baseY (per-letter)
          const floor = Math.max(0, absFloor - l.baseY);
          l.vy += 1.8;
          l.x += l.vx;
          l.y += l.vy;
          l.angle += l.va;
          l.vx *= 0.88;
          l.va *= 0.9;
          if (l.y >= floor) {
            l.y = floor;
            l.vy = -Math.abs(l.vy) * 0.38;
            l.vx *= 0.78;
            l.va *= 0.65;
            if (Math.abs(l.vy) < 0.8 && Math.abs(l.vx) < 0.4) {
              l.active = false;
              l.resting = true;
            }
          }
          l.node.style.transform =
            `translate3d(${l.x.toFixed(1)}px,${l.y.toFixed(1)}px,0) rotate(${l.angle.toFixed(1)}deg)`;
          if (l.active) stillActive = true;
        });
        running = stillActive;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // ── ink transition ───────────────────────────────────────────────────────
    const coverPts:  number[] = Array(NUM_POINTS).fill(100);
    const revealPts: number[] = Array(NUM_POINTS).fill(100);
    let phase: 'idle' | 'covering' | 'revealing' = 'idle';
    let triggered = false;

    const pathEl = pathRef.current;
    const svgEl  = svgRef.current;

    const renderPath = () => {
      if (!pathEl) return;
      if (phase === 'covering')  pathEl.setAttribute('d', buildCoverD(coverPts));
      if (phase === 'revealing') pathEl.setAttribute('d', buildRevealD(revealPts));
    };
    if (pathEl) pathEl.setAttribute('d', buildCoverD(coverPts));

    const revealSpans = () => {
      spans.forEach((span, k) => {
        if (!span) return;
        gsap.fromTo(
          span,
          { opacity: 0, filter: 'blur(14px)', y: 18 },
          {
            opacity: 1,
            filter:  'blur(0px)',
            y:       0,
            duration: 0.7,
            delay:    k * 0.011,
            ease:     'power3.out',
            onComplete: k === spans.length - 1 ? () => {
              measureBaselines();
              kicksEnabled = true;
              // Auto-pokaži hint po 0.8s da uporabnik ve da lahko udari črke
              if (hint && !window.matchMedia('(pointer: coarse), (max-width: 700px)').matches) {
                setTimeout(() => {
                  if (hasCollapsed) return;
                  const sRect = section.getBoundingClientRect();
                  hint.style.transform = `translate3d(${sRect.width * 0.52}px,${sRect.height * 0.55}px,0) rotate(-7deg)`;
                  hint.style.opacity = '1';
                  setTimeout(() => { hint.style.opacity = '0'; }, 2200);
                }, 200);
              }
            } : undefined,
          },
        );
      });
    };

    const triggerTransition = () => {
      if (RM) {
        spans.forEach(s => { if (s) s.style.opacity = '1'; });
        measureBaselines();
        kicksEnabled = true;
        return;
      }
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
            const sectionTop = Math.round(section.getBoundingClientRect().top + window.scrollY);
            window.dispatchEvent(new CustomEvent('pinart-snap', { detail: { y: sectionTop } }));
          }
          setTimeout(() => {
            phase = 'revealing';
            revealPts.fill(100);
            const tl2 = gsap.timeline({
              onUpdate: renderPath,
              onComplete: () => {
                phase = 'idle';
                if (svgEl) { svgEl.style.opacity = '0'; svgEl.style.pointerEvents = 'none'; }
                window.dispatchEvent(new CustomEvent('pinart-lenis-start'));
                revealSpans();
              },
              defaults: { ease: 'power2.inOut', duration: INK_REVEAL },
            });
            for (let j = 0; j < NUM_POINTS; j++) tl2.to(revealPts, { [j]: 0 }, revealDelay[j]);
          }, INK_GAP);
        },
        defaults: { ease: 'power2.inOut', duration: INK_COVER },
      });
      for (let j = 0; j < NUM_POINTS; j++) tl1.to(coverPts, { [j]: 0 }, coverDelay[j]);
    };

    const resetTransition = () => {
      gsap.killTweensOf(coverPts);
      gsap.killTweensOf(revealPts);
      spans.forEach(s => { if (s) gsap.killTweensOf(s); });
      phase = 'idle';
      triggered = false;
      window.dispatchEvent(new CustomEvent('pinart-lenis-start'));
      coverPts.fill(100);
      revealPts.fill(100);
      if (pathEl) pathEl.setAttribute('d', buildCoverD(coverPts));
      if (svgEl) {
        svgEl.style.opacity       = '0';
        svgEl.style.pointerEvents = 'none';
      }
      spans.forEach(s => {
        if (!s) return;
        s.style.opacity = '0';
        s.style.filter  = '';
      });
      resetLetters();
      kicksEnabled = false;
    };

    // ── pointer + scroll wiring ──────────────────────────────────────────────
    const onPointerMove = (e: PointerEvent) => {
      if (!kicksEnabled) return;
      const coarse = window.matchMedia('(pointer: coarse), (max-width: 700px)').matches;
      const sRect = section.getBoundingClientRect();
      const inside = e.clientX >= sRect.left && e.clientX <= sRect.right && e.clientY >= sRect.top && e.clientY <= sRect.bottom;
      if (hint && !coarse && !hasCollapsed) {
        hint.style.opacity = inside ? '1' : '0';
        hint.style.transform = `translate3d(${e.clientX - sRect.left + 30}px,${e.clientY - sRect.top - 46}px,0) rotate(-7deg)`;
      }
      const radius = coarse ? 64 : 145;
      letters.forEach(l => {
        if (l.resting) return;
        const r = l.node.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        if (Math.hypot(e.clientX - cx, e.clientY - cy) < radius) kick(l);
      });
    };

    let prevY = window.scrollY;
    let wasVisible = false;
    const onScroll = () => {
      const curY = window.scrollY;
      const dy   = curY - prevY;
      prevY      = curY;
      const rect = section.getBoundingClientRect();
      const isVisible = rect.top < window.innerHeight && rect.bottom > 0;

      // Down → trigger ink transition (one-shot, never re-fires)
      // Skip during back navigation recovery (2s window after popstate)
      if (dy > 0 && !triggered && rect.top <= window.innerHeight && rect.bottom > 0) {
        if (sessionStorage.getItem('pinart-back-nav')) return;
        triggered = true;
        triggerTransition();
      }

      // Real scroll-up only (threshold filtrira Lenis smooth-scroll micro-noise) →
      // če smo še v sekciji in črke padle, vrni jih v primarni položaj
      const scrollingUp = dy < -3;
      if (scrollingUp && isVisible && hasCollapsed && (rect.top > -window.innerHeight * 0.35 || !wasVisible)) {
        resetLetters();
      }

      // Scroll gor čez sekcijo → resetiraj ink transition da se naslednjič znova zaigra
      if (scrollingUp && triggered && rect.top >= window.innerHeight * 0.5) {
        resetTransition();
      }

      wasVisible = isVisible;
    };

    // When the user jumps via the nav (Lenis smooth scroll past this
    // section), we don't want the ink-transition to fire mid-flight and
    // hijack the scroll. Mark the section as already-triggered + reveal
    // the text content immediately so the user just glides through.
    const onSkipInk = () => {
      if (triggered) return;
      triggered = true;
      if (svgEl) {
        svgEl.style.opacity = '0';
        svgEl.style.pointerEvents = 'none';
      }
      revealSpans();
      // Med back navigacijo triggered ostane true dokler user ne scrolla nazaj navzgor.
      // Samo pri hash/nav skoku resetiramo triggered po 2s (da se ink naslednjič znova zaigra).
      if (!sessionStorage.getItem('pinart-back-nav')) {
        setTimeout(() => { triggered = false; }, 2000);
      }
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pinart-skip-ink', onSkipInk);

    // Back navigation: skip ink if flag was set before this component mounted
    if (sessionStorage.getItem('pinart-skip-ink')) {
      sessionStorage.removeItem('pinart-skip-ink');
      onSkipInk();
    }

    onScroll();

    return () => {
      window.dispatchEvent(new CustomEvent('pinart-lenis-start'));
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pinart-skip-ink', onSkipInk);
      gsap.killTweensOf(coverPts);
      gsap.killTweensOf(revealPts);
      spans.forEach(s => { if (s) gsap.killTweensOf(s); });
    };
  }, []);

  return (
    <section
      id="typography-collapse"
      ref={sectionRef}
      data-nav-dark="true"
      aria-label="Designing digital emotion through interactive stories"
      style={{
        position:       'relative',
        background:     'oklch(0.137 0.012 58)',
        minHeight:      '100svh',
        display:        'flex',
        flexDirection:  'column',
        justifyContent: 'center',
        padding:        'clamp(32px,5vw,72px) clamp(16px,4vw,56px) clamp(80px,14vw,180px)',
        overflow:       'hidden',
      }}
    >
      {/* ── fixed full-viewport overlay — spilled ink page transition ─────── */}
      <svg
        ref={svgRef}
        aria-hidden
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{
          position:       'fixed',
          inset:          0,
          width:          '100vw',
          height:         '100vh',
          zIndex:         500,
          pointerEvents:  'none',
          opacity:        0,
        }}
      >
        <path ref={pathRef} fill="oklch(0.137 0.012 58)" />
      </svg>

      {LINE_SLICES.map((slice, li) => (
        <div
          key={li}
          role="text"
          aria-label={LINES[li]}
          className="typo-line"
          style={{
            lineHeight:  0.87,
            position:    'relative',
            zIndex:      1,
            whiteSpace:  'nowrap',
            overflow:    'visible',
          }}
        >
          {slice.map(({ ch, ci }) => {
            const k = gIdx(CHARS, li, ci);
            return (
              <span
                key={ci}
                aria-hidden="true"
                className="typo-char"
                ref={el => { if (el) spanRefs.current[k] = el; }}
                style={{
                  display:         'inline-block',
                  fontFamily:      'var(--font-serif)',
                  fontWeight:      li % 2 === 0 ? 700 : 400,
                  fontStyle:       li % 2 !== 0 ? 'italic' : 'normal',
                  fontSize:        'clamp(2.5rem, 12.5vw, 13rem)',
                  color:           `rgba(245,242,234,${LINE_ALPHA[li]})`,
                  letterSpacing:   '-0.04em',
                  userSelect:      'none',
                  willChange:      'transform',
                  transformOrigin: '50% 80%',
                  opacity:         0,
                }}
              >
                {ch}
              </span>
            );
          })}
        </div>
      ))}

      <div
        ref={hintRef}
        aria-hidden
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 4,
          pointerEvents: 'none',
          opacity: 0,
          color: 'rgba(245,242,234,0.9)',
          fontFamily: '"Bradley Hand", "Segoe Print", "Comic Sans MS", cursive',
          fontSize: 'clamp(1.05rem,1.5vw,1.4rem)',
          lineHeight: 1,
          whiteSpace: 'nowrap',
          transition: 'opacity 220ms ease',
          willChange: 'transform, opacity',
        }}
      >
        {pathname.startsWith('/sl') ? 'podri črke' : 'knock them down'}
      </div>
    </section>
  );
}

'use client';

import { useEffect, type ReactNode } from 'react';
import Lenis from 'lenis';
import { gsap, ScrollTrigger } from '@/lib/gsap';

/**
 * Mounts a single Lenis instance and wires it to GSAP's ticker so that
 * ScrollTrigger.scrub stays perfectly in sync with the smooth scroll.
 *
 * Pattern: Lenis drives scroll position; we route Lenis.raf through
 * gsap.ticker (one rAF loop for both) and pulse ScrollTrigger on
 * every Lenis scroll event so scrub progress updates immediately.
 */
export default function SmoothScroll({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Force every (re)load to start at the top so ScrollTriggers with `once: true`
    // don't get skipped because the browser restored scroll past their start point.
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);

    const lenis = new Lenis({
      duration: 1.4,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      syncTouch: false
    });
    // Expose for components (e.g. Nav) that need to trigger a scroll
    // with the proper negative-marginTop compensation.
    (window as unknown as { __pinartLenis?: Lenis }).__pinartLenis = lenis;

    // Keep ScrollTrigger informed whenever Lenis emits a scroll event
    lenis.on('scroll', ScrollTrigger.update);

    const scrollToHash = (hash: string, immediate = false) => {
      if (!hash) return;
      const target = document.getElementById(hash.replace('#', ''));
      if (!target) return;

      // Some sections use negative marginTop (clipPath tricks) to overlap the
      // previous section. In that case scrolling to the element top lands the
      // user slightly above where the section visually starts — and
      // SectionDots still highlights the previous section. Read the marginTop
      // and, if negative, scroll past it so we land at the visual start.
      const cs = window.getComputedStyle(target);
      const marginTop = parseFloat(cs.marginTop || '0') || 0;
      const scrollMarginTop = parseFloat(cs.scrollMarginTop || '0') || 0;
      // For sections that pull themselves up with a negative marginTop
      // (clipPath overlap trick), add a small extra nudge so the marker
      // lands firmly inside the target — otherwise SectionDots can still
      // count the previous section as active right at the boundary.
      const compensation = marginTop < 0 ? -marginTop + 24 : 0;

      lenis.scrollTo(target, {
        immediate,
        force: true,
        // Lenis offset is added to the target position. Negative offset =
        // scroll less (leaves space above the target, e.g. for a fixed nav).
        // Positive offset = scroll more (skips over a negative top margin).
        offset: compensation - scrollMarginTop,
      });

      window.setTimeout(() => ScrollTrigger.update(), immediate ? 0 : 80);
    };

    // Drive Lenis from GSAP's ticker (one rAF loop, perfect sync)
    const tickerFn = (time: number) => {
      lenis.raf(time * 1000); // gsap ticker time is seconds → Lenis wants ms
    };
    gsap.ticker.add(tickerFn);
    gsap.ticker.lagSmoothing(0);

    // Refresh ScrollTrigger after fonts + initial layout settle, so trigger
    // positions are correct (heading positions can shift when fonts swap in).
    Promise.all([
      document.fonts.ready,
      new Promise<void>(res => {
        if (document.readyState === 'complete') res();
        else window.addEventListener('load', () => res(), { once: true });
      }),
    ]).then(() => {
      setTimeout(() => {
        ScrollTrigger.refresh();
        if (window.location.hash) {
          // Skip ink only when landing on a section at/after typography-collapse.
          // hero and services load lets the user scroll naturally to the ink.
          const BEFORE_INK = ['hero', 'services'];
          if (!BEFORE_INK.includes(window.location.hash.slice(1))) {
            window.dispatchEvent(new CustomEvent('pinart-skip-ink'));
          }
        }
        scrollToHash(window.location.hash, true);
      }, 100);
    });

    // ── page-transition helpers ──────────────────────────────────────────────
    // silent instant snap (used while ink covers viewport)
    const onSnap = (e: Event) => {
      // force: true so scrollTo works even when lenis.stop() was called
      lenis.scrollTo((e as CustomEvent<{ y: number }>).detail.y, { immediate: true, force: true });
    };
    // pause / resume smooth scroll during ink transition
    const onStop  = () => lenis.stop();
    const onStart = () => lenis.start();
    const onHashChange = () => scrollToHash(window.location.hash);
    // Nav uses next-intl <Link> which updates the URL via history.pushState
    // for same-page hash navigation — that does NOT fire `hashchange`. Nav
    // dispatches this custom event on click so we can scroll with offset
    // compensation regardless of how the URL change happened.
    const onGotoHash = (e: Event) => {
      const hash = (e as CustomEvent<{ hash: string }>).detail?.hash;
      if (hash) scrollToHash(hash);
    };

    window.addEventListener('pinart-snap',         onSnap);
    window.addEventListener('pinart-lenis-stop',   onStop);
    window.addEventListener('pinart-lenis-start',  onStart);
    window.addEventListener('hashchange',          onHashChange);
    window.addEventListener('pinart-goto-hash',    onGotoHash);

    return () => {
      gsap.ticker.remove(tickerFn);
      lenis.destroy();
      window.removeEventListener('pinart-snap',        onSnap);
      window.removeEventListener('pinart-lenis-stop',  onStop);
      window.removeEventListener('pinart-lenis-start', onStart);
      window.removeEventListener('hashchange',         onHashChange);
      window.removeEventListener('pinart-goto-hash',   onGotoHash);
    };
  }, []);

  return <>{children}</>;
}

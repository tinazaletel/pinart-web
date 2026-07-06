'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
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
  const pathname = usePathname();

  // Scroll to top on every route change
  useEffect(() => {
    const lenis = (window as unknown as { __pinartLenis?: { scrollTo: (v: number, o: object) => void } }).__pinartLenis;
    if (lenis) {
      lenis.scrollTo(0, { immediate: true });
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname]);

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

    // Keep ScrollTrigger informed whenever Lenis emits a scroll event. (Plain smooth
    // scroll — no section snapping; it fought the scroll-driven animations.)
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

      const navEasing = (t: number) =>
        t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const targetY = target.getBoundingClientRect().top + window.scrollY;
      const dist = Math.abs(targetY - window.scrollY);
      const duration = immediate ? 0 : Math.min(3.2, Math.max(1.6, dist / 700));

      lenis.scrollTo(target, {
        immediate,
        force: true,
        offset: compensation - scrollMarginTop,
        ...(immediate ? {} : { duration, easing: navEasing }),
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
      // An immediate scroll doesn't emit a Lenis 'scroll' event, so ScrollTrigger
      // stays out of sync — which then makes the NEXT animated scrollTo a no-op
      // (e.g. you couldn't scroll back up out of an ink section). Resync here.
      ScrollTrigger.update();
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
      if (!hash) return;
      // Refresh first so ScrollTrigger has correct positions after any
      // layout shifts caused by pinart-skip-ink (TypographyCollapse expanding).
      // Then scroll — triggers fire correctly as Lenis animates through them.
      ScrollTrigger.refresh();
      scrollToHash(hash);
    };

    // ── scroll position save/restore for back navigation ───────────────────
    // Save scroll position when navigating away (Next.js uses pushState)
    const origPushState = history.pushState.bind(history);
    history.pushState = function (...args: Parameters<typeof history.pushState>) {
      sessionStorage.setItem(`scroll:${window.location.pathname}`, String(Math.round(window.scrollY)));
      return origPushState(...args);
    };

    // On back/forward: ensure lenis is running and restore saved position
    const onPopState = () => {
      // Immediately start lenis in case ink transition left it stopped
      lenis.start();
      window.dispatchEvent(new CustomEvent('pinart-lenis-start'));
      // Skip ink transition on back navigation — use sessionStorage so
      // TypographyCollapse can read it even after it mounts
      sessionStorage.setItem('pinart-skip-ink', '1');
      sessionStorage.setItem('pinart-back-nav', '1');
      setTimeout(() => sessionStorage.removeItem('pinart-back-nav'), 2000);
      window.dispatchEvent(new CustomEvent('pinart-skip-ink'));
      // First refresh — components may not be mounted yet. Also try an
      // EARLY scroll restore so the page doesn't sit at the top (black
      // hero finale) until the final 800ms restore; the 800ms pass below
      // corrects the position again once layout has fully settled.
      setTimeout(() => {
        lenis.start();
        ScrollTrigger.refresh();
        window.dispatchEvent(new CustomEvent('pinart-skip-ink'));
        const early = sessionStorage.getItem(`scroll:${window.location.pathname}`);
        if (early) {
          lenis.scrollTo(parseInt(early), { immediate: true, force: true });
          ScrollTrigger.update();
        }
        // Povej zavesi (PageTransition), da je polozaj obnovljen in se
        // lahko umakne — namesto cakanja na fiksni timeout.
        window.dispatchEvent(new CustomEvent('pinart-back-restored'));
      }, 100);
      // Second refresh — after all components have mounted and painted
      setTimeout(() => {
        lenis.start();
        window.dispatchEvent(new CustomEvent('pinart-skip-ink'));
        ScrollTrigger.refresh();
        const saved = sessionStorage.getItem(`scroll:${window.location.pathname}`);
        if (saved) {
          const y = parseInt(saved);
          // immediate: true snaps position but may not fire Lenis scroll event,
          // so we manually update ScrollTrigger afterwards.
          lenis.scrollTo(y, { immediate: true, force: true });
          ScrollTrigger.update();
          // One more update on the next frame once layout has settled
          requestAnimationFrame(() => ScrollTrigger.update());
        }
      }, 800);
    };

    // After hero animation ends: refresh ScrollTrigger so all SplitText
    // and scroll-based animations get correct trigger positions.
    const onHeroDone = () => {
      setTimeout(() => ScrollTrigger.refresh(), 120);
    };

    window.addEventListener('pinart-snap',         onSnap);
    window.addEventListener('pinart-lenis-stop',   onStop);
    window.addEventListener('pinart-lenis-start',  onStart);
    window.addEventListener('hashchange',          onHashChange);
    window.addEventListener('pinart-goto-hash',    onGotoHash);
    window.addEventListener('popstate',            onPopState);
    window.addEventListener('pinart-hero-done',    onHeroDone);

    return () => {
      gsap.ticker.remove(tickerFn);
      lenis.destroy();
      history.pushState = origPushState;
      window.removeEventListener('pinart-snap',        onSnap);
      window.removeEventListener('pinart-lenis-stop',  onStop);
      window.removeEventListener('pinart-lenis-start', onStart);
      window.removeEventListener('hashchange',         onHashChange);
      window.removeEventListener('pinart-goto-hash',   onGotoHash);
      window.removeEventListener('popstate',           onPopState);
      window.removeEventListener('pinart-hero-done',    onHeroDone);
    };
  }, []);

  return <>{children}</>;
}

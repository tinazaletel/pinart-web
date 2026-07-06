'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Fade-overlay for page transitions (forward and back navigation).
 *
 * Forward (e.g. project card → case study):
 *   - Link fires `pinart-page-leave` → overlay fades IN
 *   - pathname changes (Next.js navigated) → overlay fades OUT after content renders
 *
 * Back (BackButton → router.back()):
 *   - BackButton fires `pinart-page-leave` → overlay fades IN
 *   - popstate fires → SmoothScroll restores scroll → overlay fades OUT
 */
export default function PageTransition() {
  const ref      = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Fade IN when any navigation starts
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const fadeIn = () => {
      // Hitro do polne prekrivnosti — vse, kar se zgodi pod zaveso
      // (menjava strani, obnova scrolla), mora biti zares skrito.
      el.style.transition = 'opacity 0.15s ease';
      el.style.opacity    = '1';
      el.style.pointerEvents = 'none';
    };

    window.addEventListener('pinart-page-leave', fadeIn);
    return () => window.removeEventListener('pinart-page-leave', fadeIn);
  }, []);

  // Fade OUT when pathname changes (forward navigation landed on new page)
  // For back navigation, popstate handler below takes over instead.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Only fade out if the overlay is actually showing
    const opacity = parseFloat(el.style.opacity || '0');
    if (opacity < 0.5) return;

    // Short pause so the new page content has a chance to render
    const t = setTimeout(() => {
      el.style.transition = 'opacity 0.55s ease';
      el.style.opacity    = '0';
    }, 120);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // For back navigation: wait longer so SmoothScroll can restore scroll position
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let fallback: ReturnType<typeof setTimeout> | null = null;

    const fadeOut = () => {
      if (fallback) { clearTimeout(fallback); fallback = null; }
      el.style.transition = 'opacity 0.45s ease';
      el.style.opacity    = '0';
    };

    const onPopState = () => {
      // Zavesa se umakne takoj, ko SmoothScroll javi obnovljen polozaj
      // (~100ms) — dolg fiksni timeout je izgledal kot glitch. Varovalka,
      // ce dogodek ne pride: umik po 900ms.
      window.addEventListener('pinart-back-restored', fadeOut, { once: true });
      fallback = setTimeout(fadeOut, 900);
    };

    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('pinart-back-restored', fadeOut);
      if (fallback) clearTimeout(fallback);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      style={{
        position:      'fixed',
        inset:         0,
        zIndex:        9998,
        background:    'oklch(0.07 0.01 58)',
        opacity:       0,
        pointerEvents: 'none',
        transition:    'opacity 0.28s ease',
      }}
    />
  );
}

'use client';

import { useEffect, useRef } from 'react';

/**
 * Fade-overlay for back navigation.
 * - When BackButton fires `pinart-page-leave`, the overlay fades IN (covers the
 *   current page while Next.js navigates and the scroll position is restored).
 * - On `popstate` the overlay is already opaque; after SmoothScroll has had
 *   time to restore the scroll position (~880 ms) it fades OUT, revealing the
 *   correct scroll location smoothly.
 */
export default function PageTransition() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const fadeIn = () => {
      el.style.transition = 'opacity 0.3s ease';
      el.style.opacity    = '1';
    };

    const fadeOut = () => {
      // Wait until SmoothScroll has restored scroll position (800 ms) then reveal
      setTimeout(() => {
        el.style.transition = 'opacity 0.55s ease';
        el.style.opacity    = '0';
      }, 880);
    };

    window.addEventListener('pinart-page-leave', fadeIn);
    window.addEventListener('popstate',           fadeOut);
    return () => {
      window.removeEventListener('pinart-page-leave', fadeIn);
      window.removeEventListener('popstate',           fadeOut);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      style={{
        position:       'fixed',
        inset:          0,
        zIndex:         9998,
        background:     'oklch(0.07 0.01 58)',
        opacity:        0,
        pointerEvents:  'none',
        transition:     'opacity 0.3s ease',
      }}
    />
  );
}

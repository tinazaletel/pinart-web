'use client';

/**
 * SlideStack — CodePen-style GSAP ScrollTrigger section stacking.
 *
 * Each section (except the last) is pinned once its bottom reaches the
 * viewport's bottom, then scales back + fades out while the next section
 * slides up from below — creating the "stacked card" depth effect.
 *
 * Works with Lenis because SmoothScroll wires:
 *   lenis.on('scroll', ScrollTrigger.update)
 * so every scrub step stays in perfect sync with smooth scroll.
 *
 * For ALL sections (viewport-height OR taller):
 *   start  = "bottom bottom" — pin fires once user has scrolled through the section
 *   end    = "bottom top"    — one full viewport of scrub to complete the fade-out
 *   scrub distance = window.innerHeight (consistent feel across all sections)
 */

import { useEffect } from 'react';
import { gsap, ScrollTrigger } from '@/lib/gsap';

export default function SlideStack() {
  useEffect(() => {
    let cancelled = false;
    let storedTriggers: ScrollTrigger[] = [];
    let storedPanels: HTMLElement[]     = [];

    // Two rAF ticks to let every section fully render + paint before measuring
    let id2 = 0;
    const id1 = requestAnimationFrame(() => {
      id2 = requestAnimationFrame(() => {
        if (!cancelled) setup();
      });
    });

    function setup() {
      const panels = Array.from(
        document.querySelectorAll('main > section')
      ) as HTMLElement[];

      if (panels.length < 2) return;

      // Only pin light sections — exclude dark sections (data-nav-dark) and the
      // work/projects section which uses normal scroll.
      const toPin = panels.filter(
        p => !p.hasAttribute('data-nav-dark') && p.id !== 'work'
      );
      storedPanels = toPin;

      toPin.forEach((panel) => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger:    panel,
            // Fires when section bottom aligns with viewport bottom
            // (user has scrolled through all of the section's content)
            start:      'bottom bottom',
            // One full viewport of scroll to complete the exit animation
            end:        'bottom top',
            pinSpacing: false,   // no spacer height → next section slides up
            pin:        true,
            scrub:      true,
          },
        });

        // Shrink + fade out as the next section slides up from below
        tl.fromTo(
          panel,
          { scale: 1,    opacity: 1   },
          { scale: 0.88, opacity: 0.5, duration: 0.9, ease: 'none' }
        ).to(
          panel,
          { opacity: 0, duration: 0.1, ease: 'none' }
        );

        storedTriggers.push(tl.scrollTrigger as ScrollTrigger);
      });

      ScrollTrigger.refresh();
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(id1);
      cancelAnimationFrame(id2);

      // Kill only the triggers we created (leave SplitText / other ST instances)
      storedTriggers.forEach(t => t?.kill());
      storedTriggers = [];

      // Clean up any inline styles GSAP may have left on the sections
      storedPanels.forEach(panel => {
        gsap.set(panel, { clearProps: 'scale,opacity,transform,position,top,left,width' });
      });
      storedPanels = [];
    };
  }, []);

  return null;
}

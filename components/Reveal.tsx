'use client';

import { useEffect, useRef, type ReactNode, type CSSProperties, type ElementType } from 'react';
import { gsap } from '@/lib/gsap';

type Dir = 'left' | 'right' | 'up' | 'down';

/**
 * Slides its children into place from a chosen direction the first time they
 * scroll into view. Used to give sections VARIED entrance directions (heading
 * from the left, image from the right, …) so the page stops feeling templated.
 * Additive + IntersectionObserver-based — never blocks or fights the scroll.
 */
export default function Reveal({
  children,
  from = 'up',
  distance = 140,
  rotate = 0,
  scaleFrom = 1,
  delay = 0,
  duration = 1.05,
  ease = 'expo.out',
  className,
  style,
  as = 'div',
}: {
  children: ReactNode;
  from?: Dir;
  distance?: number;
  rotate?: number;
  scaleFrom?: number;
  delay?: number;
  duration?: number;
  ease?: string;
  className?: string;
  style?: CSSProperties;
  as?: ElementType;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    const offset =
      from === 'left'  ? { x: -distance, y: 0 } :
      from === 'right' ? { x:  distance, y: 0 } :
      from === 'down'  ? { x: 0, y:  distance } :
                         { x: 0, y: -distance };

    gsap.set(el, { ...offset, rotation: rotate, scale: scaleFrom, autoAlpha: 0, willChange: 'transform, opacity' });

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        gsap.to(el, {
          x: 0, y: 0, rotation: 0, scale: 1, autoAlpha: 1,
          duration, ease, delay,
          onComplete: () => gsap.set(el, { willChange: 'auto' }),
        });
      },
      { threshold: 0.15, rootMargin: '-8% 0px -8% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [from, distance, rotate, scaleFrom, delay, duration, ease]);

  const Tag = as as ElementType;
  return (
    <Tag ref={ref} className={className} style={style}>
      {children}
    </Tag>
  );
}

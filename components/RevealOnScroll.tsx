'use client';

import { useEffect, useRef, type ReactNode, type CSSProperties } from 'react';

type Props = {
  children: ReactNode;
  /** Distance (px) the element slides up from when revealing. Default 28. */
  distance?: number;
  /** Transition duration in ms. Default 700. */
  duration?: number;
  /** Stagger delay in ms. Default 0. */
  delay?: number;
  /** IntersectionObserver threshold (0-1). Default 0.12. */
  threshold?: number;
  /** Extra inline style applied to the wrapper. */
  style?: CSSProperties;
  /** Extra className applied to the wrapper. */
  className?: string;
  /** Pass-through tag — default div. */
  as?: 'div' | 'section' | 'article' | 'span';
};

/**
 * Reveals its children with a slide-up + fade-in the first time it
 * enters the viewport. Uses IntersectionObserver (no scroll listeners,
 * no GSAP) so it stays cheap when sprinkled across many sections.
 * Respects prefers-reduced-motion.
 */
export default function RevealOnScroll({
  children,
  distance = 64,
  duration = 950,
  delay = 0,
  threshold = 0.12,
  style,
  className,
  as = 'div',
}: Props) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.style.opacity = '1';
      el.style.transform = 'none';
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const target = entry.target as HTMLElement;
          target.style.transitionDelay = `${delay}ms`;
          target.style.opacity = '1';
          target.style.transform = 'translateY(0)';
          io.unobserve(target);
        });
      },
      { threshold, rootMargin: '0px 0px -8% 0px' }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [delay, threshold]);

  const Tag = as as 'div';
  return (
    <Tag
      ref={ref as React.RefObject<HTMLDivElement>}
      className={className}
      style={{
        opacity: 0,
        transform: `translateY(${distance}px)`,
        transition: `opacity ${duration}ms cubic-bezier(0.16, 1, 0.3, 1), transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1)`,
        willChange: 'opacity, transform',
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}

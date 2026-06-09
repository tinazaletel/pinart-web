'use client';

import { motion } from 'framer-motion';
import { useEffect, useRef, useState, useMemo } from 'react';

// ─── helpers ──────────────────────────────────────────────────────────────────

type Snapshot = Record<string, number | string>;

function buildKeyframes(from: Snapshot, steps: Snapshot[]): Record<string, (number | string)[]> {
  const keys = new Set([...Object.keys(from), ...steps.flatMap(s => Object.keys(s))]);
  const keyframes: Record<string, (number | string)[]> = {};
  keys.forEach(k => {
    keyframes[k] = [from[k] ?? 0, ...steps.map(s => s[k] ?? from[k] ?? 0)];
  });
  return keyframes;
}

// ─── types ────────────────────────────────────────────────────────────────────

interface BlurTextProps {
  text?: string;
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
  tag?: keyof React.JSX.IntrinsicElements;
  animateBy?: 'words' | 'letters';
  direction?: 'top' | 'bottom';
  threshold?: number;
  rootMargin?: string;
  animationFrom?: Snapshot;
  animationTo?: Snapshot[];
  easing?: (t: number) => number;
  onAnimationComplete?: () => void;
  stepDuration?: number;
}

// ─── component ────────────────────────────────────────────────────────────────

export default function BlurText({
  text = '',
  delay = 200,
  className = '',
  style,
  tag: Tag = 'p',
  animateBy = 'words',
  direction = 'top',
  threshold = 0.1,
  rootMargin = '0px',
  animationFrom,
  animationTo,
  easing,
  onAnimationComplete,
  stepDuration = 0.35,
}: BlurTextProps) {
  const elements = animateBy === 'words' ? text.split(' ') : text.split('');
  const [inView, setInView] = useState(false);
  const ref = useRef<Element>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(el);
        }
      },
      { threshold, rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  const defaultFrom = useMemo<Snapshot>(() => (
    direction === 'top'
      ? { filter: 'blur(10px)', opacity: 0, y: -50 }
      : { filter: 'blur(10px)', opacity: 0, y: 50 }
  ), [direction]);

  const defaultTo = useMemo<Snapshot[]>(() => [
    { filter: 'blur(5px)',  opacity: 0.5, y: direction === 'top' ?  5 : -5 },
    { filter: 'blur(0px)',  opacity: 1,   y: 0 },
  ], [direction]);

  const fromSnapshot  = animationFrom ?? defaultFrom;
  const toSnapshots   = animationTo   ?? defaultTo;

  const stepCount     = toSnapshots.length + 1;
  const totalDuration = stepDuration * (stepCount - 1);
  const times         = Array.from({ length: stepCount }, (_, i) =>
    stepCount === 1 ? 0 : i / (stepCount - 1),
  );

  return (
    // @ts-expect-error dynamic tag
    <Tag ref={ref} className={className} style={{ display: 'flex', flexWrap: 'wrap', ...style }}>
      {elements.map((segment, index) => {
        const animateKeyframes = buildKeyframes(fromSnapshot, toSnapshots);
        const spanTransition = {
          duration:  totalDuration,
          times,
          delay:     (index * delay) / 1000,
          ...(easing ? { ease: easing } : {}),
        };

        return (
          <motion.span
            className="inline-block will-change-[transform,filter,opacity]"
            key={index}
            initial={fromSnapshot as Record<string, number | string>}
            animate={inView ? animateKeyframes : fromSnapshot}
            transition={spanTransition}
            onAnimationComplete={
              index === elements.length - 1 ? onAnimationComplete : undefined
            }
          >
            {segment === ' ' ? ' ' : segment}
            {animateBy === 'words' && index < elements.length - 1 && ' '}
          </motion.span>
        );
      })}
    </Tag>
  );
}

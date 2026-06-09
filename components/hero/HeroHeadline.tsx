'use client';

import { forwardRef } from 'react';
import { useTranslations } from 'next-intl';

/**
 * Editorial typography that enters the hero from the right.
 * Four lines, mixed scales, intentional asymmetry. The parent ref
 * points at the outer wrapper; the inner lines are queried via
 * the data-line attribute for staggered GSAP entry.
 */
const HeroHeadline = forwardRef<HTMLDivElement>(function HeroHeadline(_, ref) {
  const t = useTranslations('hero');

  return (
    <div
      ref={ref}
      className="pointer-events-none absolute inset-0 flex items-center justify-end pr-[6vw] md:pr-[8vw]"
      aria-hidden="true"
    >
      <div className="relative w-full max-w-[60ch] flex flex-col items-end gap-1 md:gap-2">
        <span
          data-line="1"
          className="font-serif font-medium text-display-lg leading-[0.86] tracking-[-0.035em] text-right"
          style={{
            willChange: 'transform, opacity',
            opacity: 0,
            transform: 'translateX(30%)'
          }}
        >
          {t('headlinePrimary')}
        </span>
        <span
          data-line="2"
          className="font-serif italic text-display-xs leading-[0.95] -mt-2 md:-mt-4 mr-[6vw]"
          style={{
            willChange: 'transform, opacity',
            opacity: 0,
            transform: 'translateX(30%)'
          }}
        >
          {t('headlineSecondary')}
        </span>
        <span
          data-line="3"
          className="font-sans uppercase tracking-[0.32em] text-[11px] md:text-[13px] mt-4 mr-[2vw]"
          style={{
            willChange: 'transform, opacity',
            opacity: 0,
            transform: 'translateX(30%)'
          }}
        >
          {t('headlineTertiary')}
        </span>
        <span
          data-line="4"
          className="font-serif font-medium text-display-md leading-[0.9] tracking-[-0.03em] mt-1"
          style={{
            willChange: 'transform, opacity',
            opacity: 0,
            transform: 'translateX(30%)'
          }}
        >
          {t('headlineQuat')}
        </span>
      </div>
    </div>
  );
});

export default HeroHeadline;

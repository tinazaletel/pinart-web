'use client';

import { useRef, useEffect, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText as GSAPSplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, GSAPSplitText, useGSAP);

// ─── types ────────────────────────────────────────────────────────────────────

interface SplitTextProps {
  text: string;
  tag?: keyof React.JSX.IntrinsicElements;
  className?: string;
  /** Extra inline styles merged onto the element (override defaults) */
  style?: React.CSSProperties;
  delay?: number;
  duration?: number;
  ease?: string;
  splitType?: string;
  from?: gsap.TweenVars;
  to?: gsap.TweenVars;
  threshold?: number;
  rootMargin?: string;
  textAlign?: React.CSSProperties['textAlign'];
  onLetterAnimationComplete?: () => void;
}

// ─── component ────────────────────────────────────────────────────────────────

const SplitText = ({
  text,
  tag               = 'p',
  className         = '',
  style,
  delay             = 50,
  duration          = 1.25,
  ease              = 'power3.out',
  splitType         = 'chars',
  from              = { opacity: 0, y: 40 },
  to                = { opacity: 1, y: 0 },
  threshold         = 0.1,
  rootMargin        = '-100px',
  textAlign         = 'center',
  onLetterAnimationComplete,
}: SplitTextProps) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ref                  = useRef<any>(null);
  const animationDoneRef     = useRef(false);
  const onCompleteRef        = useRef(onLetterAnimationComplete);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  // keep callback ref in sync
  useEffect(() => { onCompleteRef.current = onLetterAnimationComplete; }, [onLetterAnimationComplete]);

  // wait for fonts
  useEffect(() => {
    if (document.fonts.status === 'loaded') {
      setFontsLoaded(true);
    } else {
      document.fonts.ready.then(() => setFontsLoaded(true));
    }
  }, []);

  useGSAP(
    () => {
      if (!ref.current || !text || !fontsLoaded) return;
      if (animationDoneRef.current) return;

      const el = ref.current as HTMLElement & { _rbsplit?: GSAPSplitText };

      // clean up any previous split
      if (el._rbsplit) {
        try { el._rbsplit.revert(); } catch (_) { /* noop */ }
        el._rbsplit = undefined;
      }

      // build ScrollTrigger start string from threshold + rootMargin
      const startPct    = (1 - threshold) * 100;
      const rmMatch     = /^(-?\d+(?:\.\d+)?)(px|em|rem|%)?$/.exec(rootMargin);
      const rmVal       = rmMatch ? parseFloat(rmMatch[1]) : 0;
      const rmUnit      = rmMatch ? (rmMatch[2] || 'px') : 'px';
      const sign        = rmVal === 0
        ? ''
        : rmVal < 0
          ? `-=${Math.abs(rmVal)}${rmUnit}`
          : `+=${rmVal}${rmUnit}`;
      const start       = `top ${startPct}%${sign}`;

      let targets: gsap.DOMTarget;

      const splitInstance = new GSAPSplitText(el, {
        type:              splitType,
        smartWrap:         true,
        autoSplit:         splitType === 'lines',
        linesClass:        'split-line',
        wordsClass:        'split-word',
        charsClass:        'split-char',
        reduceWhiteSpace:  false,
        onSplit(self: GSAPSplitText) {
          if (splitType.includes('chars') && self.chars.length)       targets = self.chars;
          else if (splitType.includes('words') && self.words.length)  targets = self.words;
          else if (splitType.includes('lines') && self.lines.length)  targets = self.lines;
          else targets = self.chars || self.words || self.lines;

          const tween = gsap.fromTo(
            targets,
            { ...from },
            {
              ...to,
              duration,
              ease,
              stagger:        delay / 1000,
              scrollTrigger:  {
                trigger:         el,
                start,
                once:            true,
                fastScrollEnd:   true,
                anticipatePin:   0.4,
              },
              onComplete() {
                animationDoneRef.current = true;
                onCompleteRef.current?.();
              },
              willChange: 'transform, opacity',
              force3D:    true,
            }
          );
          return tween;
        },
      });

      el._rbsplit = splitInstance;

      return () => {
        ScrollTrigger.getAll().forEach(st => {
          if (st.trigger === el) st.kill();
        });
        try { splitInstance.revert(); } catch (_) { /* noop */ }
        el._rbsplit = undefined;
      };
    },
    {
      dependencies: [
        text, delay, duration, ease, splitType,
        JSON.stringify(from), JSON.stringify(to),
        threshold, rootMargin, fontsLoaded,
      ],
      scope: ref,
    }
  );

  const baseStyle: React.CSSProperties = {
    textAlign,
    overflow:      'hidden',
    display:       'inline-block',
    whiteSpace:    'normal',
    wordWrap:      'break-word',
    willChange:    'transform, opacity',
    ...style,           // caller overrides (fontSize, fontFamily, etc.)
    paddingBottom: '0.22em',  // descender space — extends overflow:hidden clip boundary
    marginBottom:  '-0.22em', // cancel the extra layout space so surroundings are unaffected
  };

  // Dynamically render the requested tag
  const Tag = (tag || 'p') as React.ElementType;
  return (
    <Tag ref={ref} style={baseStyle} className={`split-parent ${className}`}>
      {text}
    </Tag>
  );
};

export default SplitText;

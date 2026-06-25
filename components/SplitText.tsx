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

          // The serif "j" has a descender that overhangs to the LEFT; Safari
          // clips it on the transformed inline-block char box even with
          // overflow:visible. Tag only the j chars so CSS can widen just their
          // box to the left (net position unchanged).
          (self.chars || []).forEach((c) => {
            const el = c as HTMLElement;
            if ((el.textContent || '').trim() === 'j') el.classList.add('split-char--jhook');
          });

          // Hide the split chars immediately (their "from" state)…
          gsap.set(targets, { ...from });

          // Reusable reveal so both the IntersectionObserver AND a section-snap
          // (pinart-reveal event) can play it. Re-runnable: the full-page snap
          // brings a section to the top at a different moment than its first
          // scroll-in, so we replay the heading then so it isn't already "used up".
          const play = () => {
            gsap.killTweensOf(targets);
            gsap.set(targets, { ...from });
            gsap.to(targets, {
              ...to,
              duration,
              ease,
              stagger:    delay / 1000,
              onComplete() {
                animationDoneRef.current = true;
                onCompleteRef.current?.();
              },
              willChange: 'transform, opacity',
              force3D:    true,
            });
          };
          (el as HTMLElement & { _rbplay?: () => void })._rbplay = play;

          // …then reveal them when the heading enters the viewport. Made robust so a
          // heading NEVER stays unanimated: it plays on scroll-in, plays immediately
          // if already in view at init, and settles (no anim) if already scrolled
          // past — covering the cases where the old observer simply never fired.
          let played = false;
          const reveal = () => {
            if (played) return;
            played = true;
            io.disconnect();
            play();
          };
          const io = new IntersectionObserver(
            (entries) => { if (entries.some((e) => e.isIntersecting)) reveal(); },
            { threshold: 0, rootMargin: '0px 0px -10% 0px' }
          );
          io.observe(el);
          (el as HTMLElement & { _rbio?: IntersectionObserver })._rbio = io;
          // Fallback for elements already in/past the viewport when this initialises
          // (fonts load late, fast scroll) — the observer alone can miss these.
          requestAnimationFrame(() => {
            if (played) return;
            const r = el.getBoundingClientRect();
            if (r.bottom <= 0) { played = true; io.disconnect(); gsap.set(targets, { ...to }); }
            else if (r.top < window.innerHeight) reveal();
          });

          return undefined;
        },
      });

      el._rbsplit = splitInstance;

      return () => {
        const withIo = el as HTMLElement & { _rbio?: IntersectionObserver };
        withIo._rbio?.disconnect();
        withIo._rbio = undefined;
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

  // Replay the reveal when this heading's section is snapped to the top by the
  // full-page scroller (SmoothScroll dispatches pinart-reveal with the section id).
  useEffect(() => {
    const onReveal = (e: Event) => {
      const id = (e as CustomEvent<{ id?: string }>).detail?.id;
      const el = ref.current as (HTMLElement & { _rbplay?: () => void }) | null;
      if (!id || !el) return;
      const sec = el.closest('section[id]') as HTMLElement | null;
      if (sec && sec.id === id) el._rbplay?.();
    };
    window.addEventListener('pinart-reveal', onReveal);
    return () => window.removeEventListener('pinart-reveal', onReveal);
  }, []);

  const baseStyle: React.CSSProperties = {
    textAlign,
    // Always visible — never mask. A mask tied to the reveal animation clips
    // serif descenders whenever the (sometimes unreliable) ScrollTrigger
    // doesn't complete. Descenders must never be clipped.
    overflow:      'visible',
    display:       'inline-block',
    whiteSpace:    'normal',
    wordWrap:      'break-word',
    willChange:    'transform, opacity',
    ...style,           // caller overrides (fontSize, fontFamily, etc.)
    paddingBottom: '0.35em',  // descender space — extends overflow:hidden clip boundary
    marginBottom:  '-0.35em', // cancel the extra layout space so surroundings are unaffected
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

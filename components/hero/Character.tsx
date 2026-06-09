'use client';

import { useEffect, useRef } from 'react';

/**
 * Resolved layer handles for the artist's pupa_pinart.svg.
 * The parent receives these once the SVG is fetched and injected.
 */
export interface CharacterHandles {
  svg: SVGSVGElement;
  hair: SVGGElement;
  eyes: SVGGElement;
  eyeballs: SVGGElement;
  face: SVGGElement;
  body: SVGGElement;
  nose: SVGGElement;
  /** All <path> nodes inside #hair, in document order. Useful for
   *  staggered appearance as the pen draws across the hair area. */
  hairPaths: NodeListOf<SVGPathElement>;
}

interface Props {
  className?: string;
  onReady: (handles: CharacterHandles) => void;
}

/**
 * Loads /pupa_pinart.svg, injects it via innerHTML, then resolves the
 * named layer groups and reports them up. Using fetch+innerHTML (rather
 * than inlining the SVG into the JS bundle) lets the SVG be re-exported
 * from Illustrator at any time without touching code.
 */
export default function Character({ className, onReady }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Pin the latest callback so we don't refetch on every parent re-render
  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    fetch('/pupa_pinart.svg')
      .then((r) => r.text())
      .then((text) => {
        if (cancelled || !containerRef.current) return;
        containerRef.current.innerHTML = text;

        const svg = containerRef.current.querySelector('svg') as
          | SVGSVGElement
          | null;
        if (!svg) {
          console.warn('[Character] no <svg> root in fetched file');
          return;
        }
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        svg.setAttribute('aria-hidden', 'true');
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.display = 'block';

        const get = (id: string) =>
          svg.querySelector(`#${id}`) as SVGGElement | null;

        const hair = get('hair');
        const eyes = get('eyes');
        const eyeballs = get('eyeballs');
        const face = get('face');
        const body = get('body');
        const nose = get('nose');

        if (!hair || !eyes || !eyeballs || !face || !body || !nose) {
          console.warn(
            '[Character] one or more layer IDs missing in pupa_pinart.svg ' +
              '(expected: hair, eyes, eyeballs, face, body, nose)'
          );
          return;
        }

        const hairPaths = hair.querySelectorAll(
          'path'
        ) as NodeListOf<SVGPathElement>;

        // Hide everything that should animate in, BEFORE we hand off to
        // the parent. This avoids a one-frame flash of the fully-drawn
        // character between SVG injection and the GSAP timeline kicking
        // in. Hair group itself stays visible — only its child paths
        // start hidden so they can stagger-reveal.
        const hideLayer = (el: SVGGElement) => {
          el.style.opacity = '0';
        };
        hideLayer(eyes);
        hideLayer(eyeballs);
        hideLayer(body);
        hideLayer(face);
        hideLayer(nose);
        hairPaths.forEach((p) => {
          p.style.opacity = '0';
        });

        onReadyRef.current({
          svg,
          hair,
          eyes,
          eyeballs,
          face,
          body,
          nose,
          hairPaths
        });
      })
      .catch((err) =>
        console.error('[Character] failed to load pupa_pinart.svg', err)
      );

    return () => {
      cancelled = true;
    };
  }, []);

  return <div ref={containerRef} className={className} />;
}

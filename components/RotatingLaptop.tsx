'use client';

import { useEffect, useRef, type CSSProperties } from 'react';

/**
 * Renders /Laptop2.svg — an Adobe-exported sprite holding ~19 frames of a laptop
 * at different rotation angles (Generative_Object_(180,0) … (-150,0)) — and plays
 * them as a flipbook so the laptop appears to rotate. Spins only while in view.
 */
export default function RotatingLaptop({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let raf = 0;
    let frames: { g: SVGGElement; angle: number; box: { x: number; y: number; w: number; h: number } }[] = [];
    let svgEl: SVGSVGElement | null = null;
    let shown = -1;       // currently displayed frame index
    let current = 0;      // eased frame position (float)
    let frontIndex = 0;   // the front-facing (≈0°) frame — readable screen
    let hovering = false; // pointer is over the laptop → freeze on the front frame
    let inView = false;
    let cancelled = false;

    const showFrame = (i: number) => {
      const f = frames[i];
      if (!f || !svgEl || i === shown) return;
      if (shown >= 0 && frames[shown]) frames[shown].g.style.display = 'none';
      f.g.style.display = '';
      shown = i;
      const pad = 30;
      svgEl.setAttribute(
        'viewBox',
        `${f.box.x - pad} ${f.box.y - pad} ${f.box.w + pad * 2} ${f.box.h + pad * 2}`,
      );
    };

    // Map the cursor's horizontal offset from the laptop's centre to a frame, so the
    let last = 0;
    const frameMs = 1000 / 12; // ~12fps spin

    const loop = (t: number) => {
      if (inView && frames.length) {
        if (hovering) {
          // ease to the front frame and hold so the on-screen quote is readable
          current += (frontIndex - current) * 0.2;
        } else {
          // spin continuously on its own
          if (!last) last = t;
          if (t - last >= frameMs) { last = t; current += 1; }
        }
        const n = frames.length;
        showFrame(((Math.round(current) % n) + n) % n);
      } else {
        last = 0;
      }
      raf = requestAnimationFrame(loop);
    };

    fetch('/Laptop2.svg')
      .then((r) => r.text())
      .then((txt) => {
        if (cancelled) return;
        host.innerHTML = txt;
        svgEl = host.querySelector('svg');
        if (!svgEl) return;
        svgEl.removeAttribute('width');
        svgEl.removeAttribute('height');
        svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        svgEl.style.width = '100%';
        svgEl.style.height = '100%';
        // un-hide any display:none wrappers from the export
        host.querySelectorAll('[display="none"]').forEach((e) => e.removeAttribute('display'));

        const groups = Array.from(svgEl.querySelectorAll('g[id^="Generative_Object"]')) as SVGGElement[];
        frames = groups
          .map((g) => {
            const m = g.id.match(/_x28_(-?\d+)_x2C_/);
            const angle = m ? parseInt(m[1], 10) : 0;
            let box: { x: number; y: number; w: number; h: number } | null = null;
            try {
              const b = g.getBBox();
              if (b.width > 0) box = { x: b.x, y: b.y, w: b.width, h: b.height };
            } catch { /* getBBox can throw on empty groups */ }
            return { g, angle, box };
          })
          .filter((f): f is { g: SVGGElement; angle: number; box: { x: number; y: number; w: number; h: number } } => !!f.box)
          .sort((a, b) => b.angle - a.angle);

        // the front-facing frame (angle closest to 0°) — its screen shows the quote
        frontIndex = frames.reduce((best, f, i) => (Math.abs(f.angle) < Math.abs(frames[best].angle) ? i : best), 0);

        for (const f of frames) f.g.style.display = 'none';
        // start facing forward
        current = frontIndex;
        showFrame(Math.round(current));

        // hovering the laptop freezes it on the readable front frame
        host.addEventListener('pointerenter', () => { hovering = true; });
        host.addEventListener('pointerleave', () => { hovering = false; last = 0; });

        const io = new IntersectionObserver(
          (es) => { inView = es.some((e) => e.isIntersecting); },
          { threshold: 0.2 },
        );
        io.observe(host);
        (host as HTMLElement & { _laptopIo?: IntersectionObserver })._laptopIo = io;
      })
      .catch(() => {});

    raf = requestAnimationFrame(loop);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      (host as HTMLElement & { _laptopIo?: IntersectionObserver })._laptopIo?.disconnect();
    };
  }, []);

  return <div ref={hostRef} className={className} style={style} aria-hidden />;
}

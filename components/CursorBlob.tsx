'use client';

import { useEffect, useRef } from 'react';

export default function CursorBlob() {
  const blobRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches;
    if (!fine) return;

    const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const blob = blobRef.current;
    if (!blob) return;

    document.body.classList.add('cursor-active');

    let tx = -200, ty = -200;
    let cx = tx, cy = ty;
    let prevCx = cx, prevCy = cy;
    let raf = 0;
    let started = false;

    const SPRING = RM ? 1 : 0.13;
    const SIZE = 48;

    const onMove = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      if (!started) {
        started = true;
        blob.style.opacity = '1';
      }
    };

    const tick = () => {
      prevCx = cx; prevCy = cy;
      cx += (tx - cx) * SPRING;
      cy += (ty - cy) * SPRING;

      const vx = cx - prevCx;
      const vy = cy - prevCy;
      const speed = Math.sqrt(vx * vx + vy * vy);
      const angle = Math.atan2(vy, vx) * 180 / Math.PI;

      const sx = 1 + Math.min(speed * 0.025, 0.45);
      const sy = 1 / (sx * 0.9 + 0.1);

      blob.style.transform =
        `translate(${(cx - SIZE / 2).toFixed(1)}px,${(cy - SIZE / 2).toFixed(1)}px)` +
        ` rotate(${angle.toFixed(1)}deg)` +
        ` scaleX(${sx.toFixed(3)}) scaleY(${sy.toFixed(3)})`;

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    window.addEventListener('pointermove', onMove, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      document.body.classList.remove('cursor-active');
    };
  }, []);

  return (
    <div
      ref={blobRef}
      aria-hidden
      style={{
        position: 'fixed',
        top: 0, left: 0,
        width: 48, height: 48,
        pointerEvents: 'none',
        zIndex: 99999,
        willChange: 'transform',
        opacity: 0, // skrit dokler miška ne premakne
        transform: 'translate(-200px, -200px)',
        mixBlendMode: 'difference',
        filter: 'invert(1)',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/packa.svg" alt="" aria-hidden style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  );
}

'use client';

import { useEffect, useId, useMemo, useRef, useState, memo } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

// ─── types ────────────────────────────────────────────────────────────────────

interface CurvedLoopProps {
  marqueeText: string;
  speed?: number;
  className?: string;
  curveAmount?: number;
  direction?: 'left' | 'right';
  interactive?: boolean;
}

// ─── component ────────────────────────────────────────────────────────────────

export const CurvedLoop = memo(({
  marqueeText,
  speed       = 2,
  className,
  curveAmount = 400,
  direction   = 'left',
  interactive = true,
}: CurvedLoopProps) => {
  const text = useMemo(() => {
    const hasTrailing = /\s|\u00A0$/.test(marqueeText);
    return (hasTrailing ? marqueeText.replace(/\s+$/, '') : marqueeText) + '\u00A0';
  }, [marqueeText]);

  const uid         = useId().replace(/:/g, '');
  const pathId      = `curve-${uid}`;
  const measureRef  = useRef<SVGTextElement>(null);
  const textPathRef = useRef<SVGTextPathElement>(null);
  const [spacing, setSpacing] = useState(0);
  const [offset, setOffset] = useState(0);
  const dragRef = useRef(false);
  const lastXRef = useRef(0);
  const dirRef = useRef(direction);
  const velRef = useRef(0);

  const totalText = spacing
    ? Array(Math.ceil(1800 / spacing) + 2).fill(text).join('')
    : text;
  const ready = spacing > 0;
  const pathD = `M-100,40 Q500,${40 + curveAmount} 1540,40`;

  useEffect(() => {
    const measure = () => {
      try {
        const length = measureRef.current?.getComputedTextLength() || 0;
        if (length > 0) setSpacing(length);
      } catch { /* ignore */ }
    };
    const timerId = setTimeout(measure, 50);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => clearTimeout(timerId);
  }, [text, className]);

  useEffect(() => {
    if (!spacing) return;
    const initial = -spacing;
    textPathRef.current?.setAttribute('startOffset', `${initial}px`);
    setOffset(initial);
  }, [spacing]);

  useEffect(() => {
    if (!spacing || !ready) return;
    let frame = 0;
    const step = () => {
      if (!dragRef.current && textPathRef.current) {
        const delta = dirRef.current === 'right' ? speed : -speed;
        const current = parseFloat(textPathRef.current.getAttribute('startOffset') || '0');
        let next = current + delta;

        if (next <= -spacing) next += spacing;
        if (next > 0) next -= spacing;

        textPathRef.current.setAttribute('startOffset', `${next}px`);
        setOffset(next);
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [spacing, speed, ready]);

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!interactive) return;
    dragRef.current = true;
    lastXRef.current = e.clientX;
    velRef.current = 0;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!interactive || !dragRef.current || !textPathRef.current || !spacing) return;
    const dx = e.clientX - lastXRef.current;
    lastXRef.current = e.clientX;
    velRef.current = dx;
    const current = parseFloat(textPathRef.current.getAttribute('startOffset') || '0');
    let next = current + dx;

    if (next <= -spacing) next += spacing;
    if (next > 0) next -= spacing;

    textPathRef.current.setAttribute('startOffset', `${next}px`);
    setOffset(next);
  };

  const endDrag = () => {
    if (!interactive) return;
    dragRef.current = false;
    dirRef.current = velRef.current > 0 ? 'right' : 'left';
  };

  return (
    <svg
      className={['curvedloop', className].filter(Boolean).join(' ')}
      viewBox="0 0 1440 120"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
      style={{ visibility: ready ? 'visible' : 'hidden' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
      onPointerCancel={endDrag}
    >
      <text ref={measureRef} xmlSpace="preserve" style={{ visibility: 'hidden', opacity: 0, pointerEvents: 'none' }}>
        {text}
      </text>
      <defs>
        <path id={pathId} d={pathD} fill="none" stroke="transparent" />
      </defs>
      {ready && (
        <text className="curvedloop__text" xmlSpace="preserve">
          <textPath ref={textPathRef} href={`#${pathId}`} startOffset={`${offset}px`} xmlSpace="preserve">
            {totalText}
          </textPath>
        </text>
      )}
    </svg>
  );
});

CurvedLoop.displayName = 'CurvedLoop';
export default CurvedLoop;

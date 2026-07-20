'use client';

import { useEffect, useRef, useState } from 'react';

/* Interaktivno hero ozadje za Flow landing:
   - zamegljen svetel video (privzeto placeholder oseba z laptopom; zamenjaj z
     realnim home-office videom v /public/flow/home-office.mp4 in spremeni `video` prop)
   - plavajoči mehurčki (brez ikon/teksta) ki lebdijo in POČIJO ob hoverju miške,
     nato se po kratkem trenutku znova pojavijo drugje. */

type Hue = 'v' | 'g' | 'p';
type Bubble = { id: number; x: number; y: number; size: number; hue: Hue; dur: number; delay: number; pop: boolean };

let nextId = 1;
const HUES: Hue[] = ['v', 'g', 'p', 'v', 'g'];

function mkBubble(): Bubble {
  return {
    id: nextId++,
    x: 3 + Math.random() * 92,
    y: 5 + Math.random() * 86,
    size: 24 + Math.random() * 92,
    hue: HUES[Math.floor(Math.random() * HUES.length)],
    dur: 9 + Math.random() * 11,
    delay: -Math.random() * 12,
    pop: false,
  };
}

export default function FlowHeroBg({ video = '/flow/hero-sequence.mp4', count = 12 }: { video?: string; count?: number }) {
  /* Prazno na SSR → mehurčke ustvarimo šele na klientu (Math.random ne sme
     teči med hidracijo). */
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const timers = useRef<number[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setBubbles(Array.from({ length: count }, mkBubble));
    const t = timers.current;
    return () => { t.forEach(id => clearTimeout(id)); };
  }, [count]);

  /* Nekateri brskalniki ne sprozijo muted-autoplay brez eksplicitnega play(). */
  useEffect(() => {
    videoRef.current?.play().catch(() => {});
  }, []);

  function pop(id: number) {
    setBubbles(bs => bs.map(b => (b.id === id && !b.pop ? { ...b, pop: true } : b)));
    const t = window.setTimeout(() => {
      setBubbles(bs => bs.map(b => (b.id === id ? mkBubble() : b)));
    }, 560);
    timers.current.push(t);
  }

  return (
    <div className="fl-herobg" aria-hidden>
      <div className="fl-video">
        <video
          ref={videoRef}
          autoPlay muted loop playsInline preload="metadata"
          onError={e => { const p = (e.currentTarget.parentElement as HTMLElement | null); if (p) p.style.display = 'none'; }}
        >
          <source src={video} type="video/mp4" />
        </video>
      </div>

      <div className="fl-bubbles">
        {bubbles.map(b => (
          <span
            key={b.id}
            className={`fl-bubble h-${b.hue}${b.pop ? ' pop' : ''}`}
            onPointerEnter={() => pop(b.id)}
            style={{
              left: `${b.x}%`,
              top: `${b.y}%`,
              width: `${Math.round(b.size)}px`,
              height: `${Math.round(b.size)}px`,
              ['--dur' as string]: `${b.dur.toFixed(1)}s`,
              ['--delay' as string]: `${b.delay.toFixed(1)}s`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      <style>{`
        .fl-herobg { position: absolute; inset: 0 0 auto 0; height: 100svh; z-index: 0; overflow: hidden; pointer-events: none; }

        /* Ilustrirana pupa desno od besedila, polna višina. mix-blend multiply →
           bela podlaga izgine, ostane samo skica na papirju. Levi rob se stopi. */
        .fl-video { position: absolute; top: 0; right: 0; width: 54%; height: 100%; background: var(--paper);
          -webkit-mask-image: radial-gradient(120% 74% at 60% 50%, #000 50%, transparent 92%); mask-image: radial-gradient(120% 74% at 60% 50%, #000 50%, transparent 92%); }
        .fl-video video { width: 100%; height: 100%; object-fit: contain; object-position: center;
          mix-blend-mode: multiply; opacity: 1; filter: contrast(1.08); }
        /* Rahel prehod spodaj v papir */
        .fl-video::after { content: ''; position: absolute; inset: 0; background:
          linear-gradient(180deg, transparent 0%, transparent 82%, var(--paper) 100%); }

        @media (max-width: 820px) {
          .fl-video { width: 100%; }
          .fl-video video { opacity: .32; object-position: center 34%;
            -webkit-mask-image: linear-gradient(to bottom, #000 0%, #000 52%, transparent 86%); mask-image: linear-gradient(to bottom, #000 0%, #000 52%, transparent 86%); }
        }

        .fl-bubbles { position: absolute; inset: 0; }
        .fl-bubble { position: absolute; border-radius: 50%; pointer-events: auto; cursor: pointer; will-change: transform, opacity;
          background:
            radial-gradient(circle at 32% 27%, rgba(255,255,255,.95), rgba(255,255,255,.08) 42%, transparent 62%),
            radial-gradient(circle at 68% 74%, var(--b-tint), transparent 72%);
          border: 1px solid rgba(255,255,255,.55);
          box-shadow: inset 0 0 18px rgba(255,255,255,.5), 0 10px 26px rgba(120,90,200,.14);
          animation: flDrift var(--dur, 12s) ease-in-out var(--delay, 0s) infinite; }
        .fl-bubble.h-v { --b-tint: oklch(80% .13 297 / .5); }
        .fl-bubble.h-g { --b-tint: oklch(82% .12 165 / .5); }
        .fl-bubble.h-p { --b-tint: oklch(82% .12 330 / .5); }

        .fl-bubble.pop { animation: flPop .56s cubic-bezier(.2,.8,.2,1) forwards; }
        .fl-bubble.pop::after { content: ''; position: absolute; inset: -3px; border-radius: 50%; border: 2px solid rgba(255,255,255,.7); animation: flRing .56s ease-out forwards; }

        @keyframes flDrift {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(18px, -24px); }
          50% { transform: translate(-14px, -40px); }
          75% { transform: translate(13px, -16px); }
        }
        @keyframes flPop { 0% { transform: scale(1); opacity: .95; } 45% { transform: scale(1.32); opacity: .45; } 100% { transform: scale(1.75); opacity: 0; } }
        @keyframes flRing { 0% { transform: scale(.6); opacity: .8; } 100% { transform: scale(1.95); opacity: 0; } }

        @media (prefers-reduced-motion: reduce) {
          .fl-bubble { animation: none; }
          .fl-bubble.pop { animation-duration: .3s; }
        }
      `}</style>
    </div>
  );
}

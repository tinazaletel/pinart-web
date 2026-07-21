'use client';

import { useEffect, useRef, useState } from 'react';

/* Interaktivno hero ozadje za Flow landing:
   - zamegljen svetel video (privzeto placeholder oseba z laptopom; zamenjaj z
     realnim home-office videom v /public/flow/home-office.mp4 in spremeni `video` prop)
   - plavajoči mehurčki (brez ikon/teksta) ki lebdijo in POČIJO ob hoverju miške,
     nato se po kratkem trenutku znova pojavijo drugje. */

type Hue = 'v' | 'g' | 'p';
type Bubble = { id: number; slot: number; x: number; y: number; size: number; hue: Hue; dur: number; delay: number; pop: boolean };

let nextId = 1;
const HUES: Hue[] = ['v', 'g', 'p'];

/* Fiksni razmaknjeni sloti — mehurčki se NE prekrivajo. Prvi je spodaj-levo,
   malce pod gumbom "Vstopi v Flow"; ostali razporejeni po heroju. */
const SLOTS: { x: number; y: number; base: number }[] = [
  { x: 16, y: 80, base: 150 },
  { x: 7, y: 22, base: 108 },
  { x: 31, y: 51, base: 82 },
  { x: 47, y: 13, base: 120 },
  { x: 59, y: 72, base: 132 },
  { x: 83, y: 20, base: 104 },
  { x: 91, y: 53, base: 146 },
  { x: 71, y: 87, base: 92 },
  { x: 38, y: 34, base: 74 },
];

function mkBubble(slot: number): Bubble {
  const s = SLOTS[slot];
  return {
    id: nextId++,
    slot,
    x: s.x,
    y: s.y,
    size: Math.max(58, s.base + Math.random() * 40 - 20),
    hue: HUES[Math.floor(Math.random() * HUES.length)],
    dur: 9 + Math.random() * 11,
    delay: -Math.random() * 12,
    pop: false,
  };
}

export default function FlowHeroBg({ video = '/flow/hero-sequence.mp4' }: { video?: string }) {
  /* Prazno na SSR → mehurčke ustvarimo šele na klientu (Math.random ne sme
     teči med hidracijo). */
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const timers = useRef<number[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setBubbles(SLOTS.map((_, i) => mkBubble(i)));
    const t = timers.current;
    return () => { t.forEach(id => clearTimeout(id)); };
  }, []);

  /* Nekateri brskalniki ne sprozijo muted-autoplay brez eksplicitnega play(). */
  useEffect(() => {
    videoRef.current?.play().catch(() => {});
  }, []);

  function pop(id: number) {
    setBubbles(bs => bs.map(b => (b.id === id && !b.pop ? { ...b, pop: true } : b)));
    const t = window.setTimeout(() => {
      setBubbles(bs => bs.map(b => (b.id === id ? mkBubble(b.slot) : b)));
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

      <style dangerouslySetInnerHTML={{ __html: `
        .fl-herobg { position: absolute; inset: 0 0 auto 0; height: calc(94svh + 80px); z-index: 0; overflow: hidden; pointer-events: none; }

        /* Ilustrirana pupa desno od besedila, čez celo višino. object-fit: contain →
           cel prizor je viden (glava, laptop, roke), NIKOLI odrezan. mix-blend
           multiply → bela podlaga izgine, ostane skica na papirju. Mehki gradient
           prehod na VSEH robovih (mask zbledi pred robom) — nič grdih rezov. */
        /* Maska bledi LEVO (stik z besedilom) IN zgoraj+spodaj (da morebiten odrez
           mehko zbledi, ne moti). Presek dveh linearnih gradientov. */
        /* BREZ paper ozadja -> ne prekrije mreze/mehurckov = ni pravokotnega okvirja; belo iz videa odstrani mix-blend multiply */
        .fl-video { position: absolute; top: 0; bottom: 0; right: 0; width: 66%; background: transparent;
          -webkit-mask-image: linear-gradient(to right, transparent 0%, #000 30%), linear-gradient(to bottom, transparent 0%, #000 9%, #000 84%, transparent 100%); -webkit-mask-composite: source-in;
          mask-image: linear-gradient(to right, transparent 0%, #000 30%), linear-gradient(to bottom, transparent 0%, #000 9%, #000 84%, transparent 100%); mask-composite: intersect; }
        .fl-video video { width: 100%; height: 100%; object-fit: contain; object-position: center;
          mix-blend-mode: multiply; opacity: 1; filter: contrast(1.25) saturate(1.05); }
        /* Rahel prehod spodaj v papir */
        .fl-video::after { content: ''; position: absolute; inset: 0; background:
          linear-gradient(180deg, transparent 0%, transparent 82%, var(--paper) 100%); }

        /* Mobile: video NI več prosojno ozadje za tekstom (nečitljivo), ampak poln
           pas SPODAJ (v spodnjem delu heroja, pod besedilom). Vrh pasu zbledi. */
        @media (max-width: 820px) {
          /* Mobile: bg video skrit — hero video je zdaj cist blok POD gumbi (glej .fl-hero-vid-mob) */
          .fl-video { display: none; }
        }

        .fl-bubbles { position: absolute; inset: 0; }
        .fl-bubble { position: absolute; border-radius: 50%; pointer-events: auto; cursor: pointer;
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
      `}} />
    </div>
  );
}

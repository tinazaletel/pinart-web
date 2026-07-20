'use client';

/* Ambientni lebdeci mehurcki v ozadju (deljeno cez vsa orodja) — enak mehki jezik
   kot Flow landing (bel highlight + nezen odtenek violet/mint/pink + mehka senca).
   position: fixed, da lebdijo tudi med skrolanjem; z-index: -1, da so VEDNO za
   vsebino; pointer-events: none. Deterministicne pozicije (SSR-varno, brez Math.random).

   Umestitev: postavi kot prvi otrok korena povrsine, ki je stacking kontekst
   (position:relative z-index, ali isolation:isolate) — mehurcki se izrisejo NAD
   ozadjem korena in POD vsebino. */

type Amb = { x: number; y: number; d: number; hue: 'v' | 'g' | 'p'; dur: number; delay: number };

const MEHURCKI: Amb[] = [
  { x: 9,  y: 22, d: 200, hue: 'v', dur: 27, delay: 0 },
  { x: 83, y: 15, d: 150, hue: 'g', dur: 31, delay: -6 },
  { x: 69, y: 70, d: 220, hue: 'p', dur: 35, delay: -13 },
  { x: 19, y: 76, d: 160, hue: 'g', dur: 29, delay: -3 },
  { x: 93, y: 54, d: 120, hue: 'v', dur: 33, delay: -9 },
  { x: 45, y: 34, d: 96,  hue: 'p', dur: 25, delay: -16 },
  { x: 36, y: 94, d: 132, hue: 'v', dur: 37, delay: -19 },
];

export default function AmbientBubbles() {
  return (
    <div className="ambient-mehurcki" aria-hidden>
      {MEHURCKI.map((b, i) => (
        <span
          key={i}
          className={`amb amb-${b.hue}`}
          style={{ left: `${b.x}%`, top: `${b.y}%`, width: b.d, height: b.d, animationDuration: `${b.dur}s`, animationDelay: `${b.delay}s` }}
        />
      ))}
      <style dangerouslySetInnerHTML={{ __html: `
        .ambient-mehurcki { position: fixed; inset: 0; z-index: -1; overflow: hidden; pointer-events: none; }
        .ambient-mehurcki .amb { position: absolute; border-radius: 50%; transform: translate(-50%, -50%); opacity: .5;
          background:
            radial-gradient(circle at 32% 27%, rgba(255,255,255,.9), rgba(255,255,255,.06) 42%, transparent 62%),
            radial-gradient(circle at 68% 74%, var(--amb-tint), transparent 72%);
          box-shadow: inset 0 0 22px rgba(255,255,255,.4), 0 14px 40px rgba(120,90,200,.1);
          animation-name: ambDrift; animation-timing-function: ease-in-out; animation-iteration-count: infinite; }
        .ambient-mehurcki .amb-v { --amb-tint: oklch(80% .12 297 / .42); }
        .ambient-mehurcki .amb-g { --amb-tint: oklch(82% .11 165 / .4); }
        .ambient-mehurcki .amb-p { --amb-tint: oklch(82% .11 330 / .4); }
        @keyframes ambDrift {
          0%, 100% { transform: translate(-50%, -50%); }
          25% { transform: translate(calc(-50% + 26px), calc(-50% - 34px)); }
          50% { transform: translate(calc(-50% - 20px), calc(-50% - 54px)); }
          75% { transform: translate(calc(-50% + 18px), calc(-50% - 22px)); }
        }
        @media (prefers-reduced-motion: reduce) { .ambient-mehurcki .amb { animation: none; } }
      `}} />
    </div>
  );
}

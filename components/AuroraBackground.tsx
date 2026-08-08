'use client';

import { useEffect } from 'react';

/* Skupno animirano AURORA ozadje (3 živi gradientni blobi) — EN kos za VSE strani.
   Fiksno, z-index -1 (kot AmbientBubbles), pod vsebino. Vsebina orodij je prosojna
   (npr. .cw nima ozadja), zato aurora sije skozi.

   POZOR (vzrok, da se prej ni videla): `body` ima neprosojno ozadje `--paper`, ki se
   v vrstnem redu izrisovanja izriše NAD fiksnim elementom z z-index:-1. Zato ob vklopu
   naredimo body PROSOJEN (samo dokler je aurora prisotna = /kalkulator strani); `html`
   ostane `--paper` kot platno. Landing (druge poti) tega razreda nima -> nedotaknjen.
   Retainer ima svoj bel .rw-ozadje (z-index 0), ki tega prekrije -> tam ni dvojnika. */
export default function AuroraBackground() {
  useEffect(() => {
    document.body.classList.add('pw-aurora-on');
    return () => document.body.classList.remove('pw-aurora-on');
  }, []);

  return (
    <div className="pw-aurora" aria-hidden>
      <span className="pw-aurora-blob pw-aurora-roza" />
      <span className="pw-aurora-blob pw-aurora-modra" />
      <span className="pw-aurora-blob pw-aurora-vijola" />
      <style>{`
        body.pw-aurora-on { background-color: transparent !important; }
        .pw-aurora { position: fixed; inset: 0; z-index: -1; overflow: hidden; pointer-events: none; }
        .pw-aurora-blob { position: absolute; width: min(58vw, 720px); aspect-ratio: 1; border-radius: 50%; filter: blur(56px); }
        .pw-aurora-roza { top: -16vh; left: -12vw; background: radial-gradient(circle, oklch(72% .2 300 / .9), transparent 66%); opacity: .62; animation: pwAuroraRoza 12s ease-in-out infinite; }
        .pw-aurora-modra { bottom: -22vh; right: -14vw; background: radial-gradient(circle, oklch(80% .17 162 / .9), transparent 66%); opacity: .56; animation: pwAuroraModra 14s ease-in-out infinite; }
        .pw-aurora-vijola { top: 14vh; left: 34vw; background: radial-gradient(circle, oklch(70% .22 288 / .9), transparent 66%); opacity: .5; animation: pwAuroraVijola 10s ease-in-out infinite; }
        @keyframes pwAuroraRoza { 0%,100% { transform: translate(0,0) scale(1); } 25% { transform: translate(32vw,24vh) scale(1.15); } 50% { transform: translate(16vw,46vh) scale(.92); } 75% { transform: translate(38vw,12vh) scale(1.08); } }
        @keyframes pwAuroraModra { 0%,100% { transform: translate(0,0) scale(1); } 25% { transform: translate(-28vw,-22vh) scale(1.12); } 50% { transform: translate(-44vw,-10vh) scale(.9); } 75% { transform: translate(-16vw,-32vh) scale(1.06); } }
        @keyframes pwAuroraVijola { 0%,100% { transform: translate(0,0) scale(1); } 33% { transform: translate(-24vw,28vh) scale(1.2); } 66% { transform: translate(22vw,-16vh) scale(.88); } }
        @media (prefers-reduced-motion: reduce) { .pw-aurora-blob { animation: none; } }
      `}</style>
    </div>
  );
}

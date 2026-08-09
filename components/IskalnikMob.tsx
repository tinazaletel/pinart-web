'use client';

import { useState } from 'react';
import { MagnifyingGlass } from '@phosphor-icons/react';

/* Enoten iskalnik POVSOD: ikona v krogu, ki se ob kliku razširi v celo-širinski input
   (kot Arhiv / Komunikacija). En sam element — nikoli dvojni iskalnik.
   Postavi v flex vrstico; STARŠ naj bo position:relative, da se overlay razširi čez
   celotno vrstico. */
export default function IskalnikMob({ vrednost, naVrednost, placeholder, label }: {
  vrednost: string;
  naVrednost: (v: string) => void;
  placeholder: string;
  label?: string;
}) {
  const [odprt, setOdprt] = useState(false);

  return (
    <div className="iskmob">
      <button type="button" className="iskmob-krog" onClick={() => setOdprt(true)} aria-label={label || placeholder}><MagnifyingGlass size={18} weight="bold" /></button>

      <div className={'iskmob-over' + (odprt ? ' odprt' : '')}>
        <MagnifyingGlass size={16} weight="bold" aria-hidden />
        <input value={vrednost} onChange={e => naVrednost(e.target.value)} placeholder={placeholder} aria-label={label || placeholder} autoFocus={odprt} />
        <button type="button" className="iskmob-x" onClick={() => { naVrednost(''); setOdprt(false); }} aria-label="Zapri">✕</button>
      </div>

      <style>{`
        .iskmob { position: static; flex: none; display: inline-flex; }
        .iskmob-krog { display: inline-flex; align-items: center; justify-content: center; width: 3rem; height: 3rem; flex: none; border-radius: 50%; border: 1px solid var(--line, rgba(17,17,17,.12)); background: color-mix(in oklch, var(--paper, #fff) 92%, transparent); color: var(--ink, #111); cursor: pointer; }
        .iskmob-over { position: absolute; left: 0; right: 0; top: 0; z-index: 6; display: flex; align-items: center; gap: .5rem; min-height: 3rem; box-sizing: border-box; padding: 0 .5rem 0 1rem; border: 1px solid var(--ink, #111); border-radius: 999px; background: var(--paper, #fff); color: color-mix(in oklch, var(--ink, #111) 55%, transparent); opacity: 0; pointer-events: none; clip-path: inset(0 100% 0 0 round 999px); transition: clip-path .26s cubic-bezier(.2,.8,.3,1), opacity .18s; }
        .iskmob-over.odprt { opacity: 1; pointer-events: auto; clip-path: inset(0 0 0 0 round 999px); }
        .iskmob-over input { flex: 1; min-width: 0; border: 0; outline: 0; background: none; font: 500 16px var(--font-sans), system-ui, sans-serif; color: var(--ink, #111); }
        .iskmob-x { flex: none; width: 2.1rem; height: 2.1rem; display: inline-flex; align-items: center; justify-content: center; border: 0; background: color-mix(in oklch, var(--ink, #111) 6%, transparent); border-radius: 50%; color: var(--ink, #111); font-size: 1rem; line-height: 1; cursor: pointer; }
        @media (prefers-reduced-motion: reduce) { .iskmob-over { transition: none; } }
      `}</style>
    </div>
  );
}

'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CaretDown } from '@phosphor-icons/react';

export type MobTabOpcija = { id: string; label: string; znacka?: ReactNode };

/* Mobilni izbirnik zavihkov: na telefonu (≤640px) nadomesti horizontalni tab-trak
   z gumbom, ki odpre SLIDE-UP meni (bottom sheet) — mobilno prijazno, brez h-scrolla.
   Na namizju je SKRIT — tam ostanejo obstoječe pills.
   Desktop pills skrij na mobilnem z razredom `mobtabs-hide` (pravilo je tu, globalno). */
export default function MobTabs({ opcije, vrednost, naVrednost, label }: {
  opcije: MobTabOpcija[];
  vrednost: string;
  naVrednost: (id: string) => void;
  label?: string;
}) {
  const [odprt, setOdprt] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const trenutna = opcije.find(o => o.id === vrednost) || opcije[0];

  /* Ko je slide-up odprt, skrij Pupo (da ne prekriva menija) */
  useEffect(() => {
    document.body.classList.toggle('pw-sheet-open', odprt);
    return () => document.body.classList.remove('pw-sheet-open');
  }, [odprt]);

  return (
    <div className="mobtabs">
      <button type="button" className="mobtabs-gumb" aria-haspopup="menu" aria-expanded={odprt} aria-label={label} onClick={() => setOdprt(true)}>
        <span className="mobtabs-lbl">{trenutna?.label}</span>
        {trenutna?.znacka}
        <CaretDown size={15} weight="bold" className="mobtabs-chev" />
      </button>
      {mounted && odprt && createPortal(<>
        <div className="mobtabs-back" onClick={() => setOdprt(false)} aria-hidden />
        <div className="mobtabs-sheet" role="menu">
          <div className="mobtabs-sheet-glava"><b>{label || 'Izberi'}</b><button type="button" className="mobtabs-sheet-x" onClick={() => setOdprt(false)} aria-label="Zapri">✕</button></div>
          <div className="mobtabs-sheet-telo">
            {opcije.map(o => (
              <button key={o.id} type="button" role="menuitemradio" aria-checked={o.id === vrednost} className={o.id === vrednost ? 'on' : ''} onClick={() => { naVrednost(o.id); setOdprt(false); }}>
                <span>{o.label}</span>{o.znacka}
              </button>
            ))}
          </div>
        </div>
      </>, document.body)}
      <style>{`
        .mobtabs { display: none; }
        @media (max-width: 640px) {
          .mobtabs { display: inline-block; position: relative; width: auto; max-width: 100%; }
          .mobtabs-hide { display: none !important; }
        }
        .mobtabs-gumb { display: flex; align-items: center; gap: .5rem; width: 100%; min-height: 2.9rem; padding: 0 .95rem; border: 1px solid color-mix(in oklch, var(--ink, #111) 14%, transparent); border-radius: 999px; background: color-mix(in oklch, var(--paper, #fff) 92%, transparent); color: var(--ink, #111); font: 700 .82rem var(--font-sans), system-ui, sans-serif; cursor: pointer; }
        .mobtabs-lbl { text-align: left; }
        .mobtabs-chev { margin-left: auto; flex: none; opacity: .7; }
        .mobtabs-back { position: fixed; inset: 0; z-index: 199; background: color-mix(in oklch, var(--ink, #111) 34%, transparent); animation: mobtabsFade .2s ease both; }
        .mobtabs-sheet { position: fixed; left: 0; right: 0; bottom: 0; z-index: 200; background: var(--paper, #fff); border-radius: 20px 20px 0 0; box-shadow: 0 -16px 44px color-mix(in oklch, var(--ink, #111) 22%, transparent); max-height: 70dvh; display: flex; flex-direction: column; padding-bottom: env(safe-area-inset-bottom, 0px); animation: mobtabsUp .3s cubic-bezier(.2,.8,.3,1) both; }
        .mobtabs-sheet-glava { position: relative; display: flex; align-items: center; justify-content: space-between; padding: 1.3rem 1.2rem .7rem; border-bottom: 1px solid color-mix(in oklch, var(--ink, #111) 10%, transparent); }
        .mobtabs-sheet-glava::before { content: ''; position: absolute; top: .5rem; left: 50%; transform: translateX(-50%); width: 2.4rem; height: .3rem; border-radius: 999px; background: color-mix(in oklch, var(--ink, #111) 18%, transparent); }
        .mobtabs-sheet-glava b { font: 700 1.02rem var(--font-sans), system-ui, sans-serif; color: var(--ink, #111); }
        .mobtabs-sheet-x { width: 2rem; height: 2rem; display: inline-flex; align-items: center; justify-content: center; border: 0; border-radius: 50%; background: color-mix(in oklch, var(--ink, #111) 6%, transparent); color: var(--ink, #111); font-size: 1rem; line-height: 1; cursor: pointer; }
        .mobtabs-sheet-telo { overflow-y: auto; padding: .5rem .8rem calc(1rem + env(safe-area-inset-bottom, 0px)); }
        .mobtabs-sheet-telo button { display: flex; align-items: center; gap: .5rem; width: 100%; text-align: left; border: 0; background: transparent; border-radius: 12px; padding: .9rem .8rem; font: 600 .95rem var(--font-sans), system-ui, sans-serif; color: var(--ink, #111); cursor: pointer; }
        .mobtabs-sheet-telo button > span:first-child { flex: 1; }
        .mobtabs-sheet-telo button:hover { background: color-mix(in oklch, var(--ink, #111) 6%, transparent); }
        .mobtabs-sheet-telo button.on { background: var(--ink, #111); color: var(--paper, #fff); }
        @keyframes mobtabsUp { from { transform: translateY(100%); } to { transform: none; } }
        @keyframes mobtabsFade { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}

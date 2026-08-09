'use client';

import { useState, type ReactNode } from 'react';
import { CaretDown } from '@phosphor-icons/react';

export type MobTabOpcija = { id: string; label: string; znacka?: ReactNode };

/* Mobilni izbirnik zavihkov: na telefonu (≤640px) nadomesti horizontalni tab-trak
   z dropdownom (brez h-scrolla). Na namizju je SKRIT — tam ostanejo obstoječe pills.
   Desktop pills skrij na mobilnem z razredom `mobtabs-hide` (pravilo je tu, globalno). */
export default function MobTabs({ opcije, vrednost, naVrednost, label }: {
  opcije: MobTabOpcija[];
  vrednost: string;
  naVrednost: (id: string) => void;
  label?: string;
}) {
  const [odprt, setOdprt] = useState(false);
  const trenutna = opcije.find(o => o.id === vrednost) || opcije[0];

  return (
    <div className="mobtabs">
      <button type="button" className="mobtabs-gumb" aria-haspopup="menu" aria-expanded={odprt} aria-label={label} onClick={() => setOdprt(o => !o)}>
        <span className="mobtabs-lbl">{trenutna?.label}</span>
        {trenutna?.znacka}
        <CaretDown size={15} weight="bold" className="mobtabs-chev" />
      </button>
      {odprt && <>
        <div className="mobtabs-back" onClick={() => setOdprt(false)} aria-hidden />
        <div className="mobtabs-meni" role="menu">
          {opcije.map(o => (
            <button key={o.id} type="button" role="menuitemradio" aria-checked={o.id === vrednost} className={o.id === vrednost ? 'on' : ''} onClick={() => { naVrednost(o.id); setOdprt(false); }}>
              <span>{o.label}</span>{o.znacka}
            </button>
          ))}
        </div>
      </>}
      <style>{`
        .mobtabs { display: none; }
        @media (max-width: 640px) {
          .mobtabs { display: inline-block; position: relative; width: auto; max-width: 100%; }
          .mobtabs-hide { display: none !important; }
        }
        .mobtabs-gumb { display: flex; align-items: center; gap: .5rem; width: 100%; min-height: 2.9rem; padding: 0 .95rem; border: 1px solid color-mix(in oklch, var(--ink, #111) 14%, transparent); border-radius: 999px; background: color-mix(in oklch, var(--paper, #fff) 92%, transparent); color: var(--ink, #111); font: 700 .82rem var(--font-sans), system-ui, sans-serif; cursor: pointer; }
        .mobtabs-lbl { text-align: left; }
        .mobtabs-chev { margin-left: auto; flex: none; opacity: .7; }
        .mobtabs-back { position: fixed; inset: 0; z-index: 60; }
        .mobtabs-meni { position: absolute; z-index: 61; top: calc(100% + .4rem); left: 0; right: 0; padding: .35rem; border: 1px solid color-mix(in oklch, var(--ink, #111) 12%, transparent); border-radius: 16px; background: var(--paper, #fff); box-shadow: 0 16px 40px color-mix(in oklch, var(--ink, #111) 22%, transparent); display: flex; flex-direction: column; gap: .12rem; }
        .mobtabs-meni button { display: flex; align-items: center; gap: .5rem; width: 100%; padding: .7rem .8rem; border: 0; border-radius: 12px; background: transparent; color: var(--ink, #111); font: 600 .88rem var(--font-sans), system-ui, sans-serif; text-align: left; cursor: pointer; }
        .mobtabs-meni button:hover { background: color-mix(in oklch, var(--ink, #111) 6%, transparent); }
        .mobtabs-meni button.on { background: var(--ink, #111); color: var(--paper, #fff); }
        .mobtabs-meni button > span:first-child { flex: 1; }
      `}</style>
    </div>
  );
}

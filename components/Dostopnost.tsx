'use client';

/* DOSTOPNOST — eno okno za vso aplikacijo (Tina, 30. 8. 2026).
 *
 * Doslej je okno živelo znotraj KalkulatorApp, zato ga je bilo videti samo na
 * Ponudbi; na Nalogah, Koledarju ali pri Pupi ga ni bilo, menijska postavka pa
 * je peljala na informativno stran. Zdaj je komponenta samostojna in jo odpre
 * dogodek `pinart:odpri-dostopnost` z vsakega mesta v aplikaciji.
 *
 * Okno ni več samo navodilo: nosi tri nastavitve, ki jih človek, ki jih rabi,
 * res potrebuje TAKOJ — večja pisava, več kontrasta, manj gibanja. Zapišejo se
 * kot atributi na <html> in obveljajo na vseh straneh (pravila so v
 * app/globals.css), shranijo pa v localStorage, da ostanejo ob osvežitvi.
 *
 * Pripomoček ni dokaz skladnosti: pravno šteje izjava in resnična dostopnost
 * strani. Zato je v oknu tudi povezava na izjavo.
 */

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { PersonSimple } from '@phosphor-icons/react';

export const DOGODEK_DOSTOPNOST = 'pinart:odpri-dostopnost';

const K_PISAVA = 'pinart-a11y-pisava';
const K_KONTRAST = 'pinart-a11y-kontrast';
const K_GIBANJE = 'pinart-a11y-gibanje';

type Pisava = 'normalna' | 'velika' | 'vecja';

/** Prebere shranjene nastavitve in jih zapiše na <html>. Kliče se ob nalaganju. */
export function uporabiShranjenoDostopnost(): void {
  if (typeof document === 'undefined') return;
  try {
    const k = document.documentElement;
    const pisava = localStorage.getItem(K_PISAVA);
    if (pisava && pisava !== 'normalna') k.setAttribute('data-a11y-pisava', pisava);
    if (localStorage.getItem(K_KONTRAST) === '1') k.setAttribute('data-a11y-kontrast', '1');
    if (localStorage.getItem(K_GIBANJE) === '1') k.setAttribute('data-a11y-gibanje', '1');
  } catch { /* zasebni način: nastavitev pač ne pomnimo */ }
}

export default function Dostopnost({ gumb = false, jeEn = false, base = '' }: {
  /** Plavajoč gumb: samo tam, kjer menija ni (brezplačni kalkulator). */
  gumb?: boolean;
  jeEn?: boolean;
  base?: string;
}) {
  const L = (sl: string, en: string) => (jeEn ? en : sl);
  const [odprt, setOdprt] = useState(false);
  const [pisava, setPisava] = useState<Pisava>('normalna');
  const [kontrast, setKontrast] = useState(false);
  const [gibanje, setGibanje] = useState(false);

  useEffect(() => {
    uporabiShranjenoDostopnost();
    try {
      const p = localStorage.getItem(K_PISAVA);
      if (p === 'velika' || p === 'vecja') setPisava(p);
      setKontrast(localStorage.getItem(K_KONTRAST) === '1');
      setGibanje(localStorage.getItem(K_GIBANJE) === '1');
    } catch { /* brez shrambe */ }
  }, []);

  useEffect(() => {
    const odpri = () => setOdprt(true);
    window.addEventListener(DOGODEK_DOSTOPNOST, odpri);
    return () => window.removeEventListener(DOGODEK_DOSTOPNOST, odpri);
  }, []);

  /* Zapri na Esc: okno je pogovorno in mora imeti izhod s tipkovnice. */
  useEffect(() => {
    if (!odprt) return;
    const naTipko = (e: KeyboardEvent) => { if (e.key === 'Escape') setOdprt(false); };
    window.addEventListener('keydown', naTipko);
    return () => window.removeEventListener('keydown', naTipko);
  }, [odprt]);

  const zapisi = useCallback((kljuc: string, vrednost: string | null, atribut: string) => {
    const k = document.documentElement;
    if (vrednost === null) k.removeAttribute(atribut);
    else k.setAttribute(atribut, vrednost);
    try {
      if (vrednost === null) localStorage.removeItem(kljuc);
      else localStorage.setItem(kljuc, vrednost);
    } catch { /* brez shrambe */ }
  }, []);

  const nastaviPisavo = (v: Pisava) => {
    setPisava(v);
    zapisi(K_PISAVA, v === 'normalna' ? null : v, 'data-a11y-pisava');
  };
  const preklopiKontrast = () => {
    const v = !kontrast; setKontrast(v);
    zapisi(K_KONTRAST, v ? '1' : null, 'data-a11y-kontrast');
  };
  const preklopiGibanje = () => {
    const v = !gibanje; setGibanje(v);
    zapisi(K_GIBANJE, v ? '1' : null, 'data-a11y-gibanje');
  };

  const stopnje: Array<{ id: Pisava; ime: string }> = [
    { id: 'normalna', ime: 'A' },
    { id: 'velika', ime: 'A+' },
    { id: 'vecja', ime: 'A++' },
  ];

  return (
    <div className="dost">
      {gumb && (
        <button type="button" className="dost-gumb" aria-label={L('Dostopnost', 'Accessibility')}
          aria-expanded={odprt} onClick={() => setOdprt(o => !o)}>
          <PersonSimple size={22} weight="bold" />
        </button>
      )}

      {/* PORTAL NA <body>: stranska vrstica ima transform, ta pa naredi iz nje
          vsebovalni blok za position:fixed — okno je zato pristalo izven zaslona
          (Tina, 31. 8. 2026). Ista past kot pri Pupinem domu. */}
      {odprt && typeof document !== 'undefined' && createPortal((
        <>
          <div className="dost-zastor" onClick={() => setOdprt(false)} aria-hidden />
          <div className="dost-okno" role="dialog" aria-modal="true" aria-label={L('Dostopnost', 'Accessibility')}>
            <button type="button" className="dost-zapri" onClick={() => setOdprt(false)}
              aria-label={L('Zapri', 'Close')}>×</button>
            <h2>{L('Dostopnost', 'Accessibility')}</h2>

            <div className="dost-vrsta">
              <span className="dost-ime">{L('Velikost pisave', 'Text size')}</span>
              <div className="dost-stopnje" role="group" aria-label={L('Velikost pisave', 'Text size')}>
                {stopnje.map(s => (
                  <button key={s.id} type="button" className={'dost-stopnja' + (pisava === s.id ? ' on' : '')}
                    aria-pressed={pisava === s.id} onClick={() => nastaviPisavo(s.id)}>{s.ime}</button>
                ))}
              </div>
            </div>

            <div className="dost-vrsta">
              <span className="dost-ime">{L('Več kontrasta', 'More contrast')}</span>
              <button type="button" className={'dost-stikalo' + (kontrast ? ' on' : '')}
                role="switch" aria-checked={kontrast} onClick={preklopiKontrast}>
                <span aria-hidden />
              </button>
            </div>

            <div className="dost-vrsta">
              <span className="dost-ime">{L('Manj animacij', 'Less motion')}</span>
              <button type="button" className={'dost-stikalo' + (gibanje ? ' on' : '')}
                role="switch" aria-checked={gibanje} onClick={preklopiGibanje}>
                <span aria-hidden />
              </button>
            </div>

            <h3>{L('Tipkovnica', 'Keyboard')}</h3>
            <ul>
              <li>{L('Tab premika fokus med polji, izbirami in gumbi; Shift + Tab nazaj.', 'Tab moves focus between fields, choices and buttons; Shift + Tab goes back.')}</li>
              <li>{L('Enter potrdi korak, kadar nisi v večvrstičnem polju.', 'Enter confirms the step when you are not in a multi-line field.')}</li>
              <li>{L('Esc zapre okna in panele.', 'Esc closes dialogs and panels.')}</li>
            </ul>

            <h3>{L('Glasovni ukazi', 'Voice commands')}</h3>
            <ul>
              <li><strong>macOS:</strong> System Settings → Accessibility → Voice Control.</li>
              <li><strong>iPhone/iPad:</strong> Settings → Accessibility → Voice Control.</li>
              <li><strong>Windows:</strong> {L('Settings → Accessibility → Speech ali Voice access.', 'Settings → Accessibility → Speech or Voice access.')}</li>
            </ul>

            <Link className="dost-izjava" href={`${base}/dostopnost`} onClick={() => setOdprt(false)}>
              {L('Izjava o dostopnosti', 'Accessibility statement')}
            </Link>
          </div>
        </>
      ), document.body)}

      <style jsx>{`
        .dost-gumb { position: fixed; left: 1.4rem; bottom: 4.9rem; z-index: 61; width: 2.3rem; height: 2.3rem; border-radius: 999px; border: 1px solid rgba(124,58,237,.4); background: rgba(255,255,255,.92); color: #111; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 .7rem 1.8rem rgba(17,17,17,.08); }
        .dost-gumb:hover { border-color: rgba(124,58,237,.75); }
        .dost-zastor { position: fixed; inset: 0; z-index: 140; background: rgba(17,17,17,.28); backdrop-filter: blur(2px); }
        .dost-okno { position: fixed; z-index: 141; left: 50%; top: 50%; transform: translate(-50%,-50%); width: min(27rem, calc(100vw - 2rem)); max-height: min(80dvh, 40rem); overflow: auto; border: 1px solid rgba(17,17,17,.14); border-radius: 16px; background: #fff; padding: 1.15rem 1.25rem 1.25rem; box-shadow: 0 1.4rem 3rem rgba(17,17,17,.18); color: #111; }
        .dost-zapri { position: absolute; top: .7rem; right: .7rem; width: 1.75rem; height: 1.75rem; border-radius: 999px; border: 1px solid rgba(17,17,17,.14); background: #fff; color: rgba(17,17,17,.7); cursor: pointer; font-size: 1rem; line-height: 1; }
        .dost-okno h2 { margin: 0 0 1rem; font-size: .82rem; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }
        .dost-okno h3 { margin: 1.2rem 0 .35rem; font-size: .82rem; font-weight: 800; }
        .dost-okno ul { margin: 0; padding-left: 1.05rem; display: grid; gap: .25rem; }
        .dost-okno li { font-size: .86rem; line-height: 1.5; color: rgba(17,17,17,.78); }
        .dost-vrsta { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: .6rem 0; border-top: 1px solid rgba(17,17,17,.1); }
        .dost-vrsta:first-of-type { border-top: 0; }
        .dost-ime { font-size: .92rem; font-weight: 600; }
        .dost-stopnje { display: inline-flex; gap: .3rem; }
        .dost-stopnja { min-width: 2.4rem; padding: .35rem .5rem; border-radius: 10px; border: 1px solid rgba(17,17,17,.14); background: #fff; font: 700 .82rem inherit; color: rgba(17,17,17,.7); cursor: pointer; }
        .dost-stopnja.on { border-color: #7C3AED; color: #7C3AED; background: rgba(124,58,237,.08); }
        .dost-stikalo { width: 2.7rem; height: 1.55rem; border-radius: 999px; border: 1px solid rgba(17,17,17,.16); background: rgba(17,17,17,.06); cursor: pointer; padding: 0 .18rem; display: inline-flex; align-items: center; transition: background .18s ease, border-color .18s ease; }
        .dost-stikalo span { width: 1.15rem; height: 1.15rem; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(17,17,17,.22); transition: transform .18s cubic-bezier(.23,1,.32,1); }
        .dost-stikalo.on { background: #7C3AED; border-color: #7C3AED; }
        .dost-stikalo.on span { transform: translateX(1.05rem); }
        .dost-izjava { display: inline-block; margin-top: 1.1rem; font-size: .84rem; color: #7C3AED; }
      `}</style>
    </div>
  );
}

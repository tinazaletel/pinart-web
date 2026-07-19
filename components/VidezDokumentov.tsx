'use client';

/* Nastavitev videza dokumentov: barva poudarka + pisava naslovov.
   Uporablja kalkulator (profil) in retainer (profil). Vrednosti se shranijo
   v K_NAST prek starsa (onBarva/onFont). Velja cez celotno dokumentacijo. */

import { useEffect, type CSSProperties } from 'react';
import { DOK_FONTI, DOK_FONT_IMENA, dokFontStack, DOK_BARVA_PRIVZETA, DOK_FONT_PRIVZETI } from '@/lib/dokVidez';

const BARVE = ['#6E4FA6', '#7C4DD6', '#3730A3', '#111111', '#2F5D50', '#A44A3F', '#B8860B'];

/* naloži izbrane Google pisave v aplikacijo, da je predogled na zaslonu pravilen */
function naloziPisave() {
  if (typeof document === 'undefined') return;
  DOK_FONT_IMENA.forEach(ime => {
    const g = DOK_FONTI[ime]?.google;
    if (!g) return;
    const id = 'dokfont-' + ime.replace(/\s+/g, '-');
    if (document.getElementById(id)) return;
    const l = document.createElement('link');
    l.id = id; l.rel = 'stylesheet';
    l.href = `https://fonts.googleapis.com/css2?family=${g}&display=swap`;
    document.head.appendChild(l);
  });
}

export default function VidezDokumentov({
  barva, font, onBarva, onFont,
}: {
  barva: string; font: string;
  onBarva: (v: string) => void; onFont: (v: string) => void;
}) {
  useEffect(() => { naloziPisave(); }, []);

  return (
    <div className="vd-ovoj">
      <p className="vd-uvod">Ta barva in pisava se uporabita na <b>vseh dokumentih</b> — ponudbah, računih in pogodbah. Nastaviš enkrat, stil je povsod enak.</p>

      <div className="vd-blok">
        <span className="vd-oznaka">Barva poudarka</span>
        <div className="vd-barve">
          {BARVE.map(b => (
            <button key={b} type="button" aria-label={b}
              className={'vd-barva' + (barva.toLowerCase() === b.toLowerCase() ? ' on' : '')}
              style={{ background: b }} onClick={() => onBarva(b)} />
          ))}
          <label className="vd-barva vd-barva-custom" title="Poljubna barva">
            <input type="color" value={barva} onChange={e => onBarva(e.target.value)} />
            <span aria-hidden>+</span>
          </label>
        </div>
      </div>

      <div className="vd-blok">
        <span className="vd-oznaka">Pisava naslovov</span>
        <div className="vd-fonti">
          {DOK_FONT_IMENA.map(f => (
            <button key={f} type="button"
              className={'vd-font' + (font === f ? ' on' : '')}
              style={{ fontFamily: dokFontStack(f) }} onClick={() => onFont(f)}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="vd-predogled" style={{ '--vd-akcent': barva } as CSSProperties}>
        <span className="vd-pred-kick">Ponudba — predogled</span>
        <h3 style={{ fontFamily: dokFontStack(font) }}>Naslov dokumenta</h3>
        <span className="vd-pred-crta" />
        <p>Tako izgledajo naslovi in poudarki v tvojih dokumentih.</p>
      </div>

      {(barva.toLowerCase() !== DOK_BARVA_PRIVZETA.toLowerCase() || font !== DOK_FONT_PRIVZETI) && (
        <button type="button" className="vd-ponastavi" onClick={() => { onBarva(DOK_BARVA_PRIVZETA); onFont(DOK_FONT_PRIVZETI); }}>
          Ponastavi na privzeto
        </button>
      )}

      <style jsx>{`
        .vd-ovoj { display: flex; flex-direction: column; gap: 1.5rem; }
        .vd-uvod { margin: 0; font-size: .9rem; line-height: 1.55; color: #4a4550; }
        .vd-blok { display: flex; flex-direction: column; gap: .7rem; }
        .vd-oznaka { font-size: .72rem; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: #8a8177; }
        .vd-barve { display: flex; flex-wrap: wrap; gap: .6rem; }
        .vd-barva { width: 38px; height: 38px; border-radius: 999px; border: 2px solid rgba(0,0,0,.08); cursor: pointer; padding: 0; transition: transform .15s, box-shadow .15s; }
        .vd-barva:hover { transform: translateY(-2px); }
        .vd-barva.on { box-shadow: 0 0 0 2px #fff, 0 0 0 4px #111; }
        .vd-barva-custom { position: relative; display: flex; align-items: center; justify-content: center; background: #fff; color: #111; font-size: 1.2rem; font-weight: 600; overflow: hidden; }
        .vd-barva-custom input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
        .vd-fonti { display: flex; flex-wrap: wrap; gap: .6rem; }
        .vd-font { padding: .6rem 1.1rem; border-radius: 999px; border: 1.5px solid rgba(17,17,17,.15); background: #fff; color: #111; font-size: 1.05rem; cursor: pointer; transition: border-color .15s, background .15s; }
        .vd-font:hover { border-color: rgba(17,17,17,.4); }
        .vd-font.on { border-color: #111; background: #111; color: #F5F2EA; }
        .vd-predogled { border: 1px solid rgba(17,17,17,.1); border-radius: 14px; padding: 1.4rem 1.5rem; background: #FCFBF7; }
        .vd-pred-kick { font-size: .68rem; letter-spacing: .24em; text-transform: uppercase; font-weight: 700; color: var(--vd-akcent); }
        .vd-predogled h3 { margin: .5rem 0 0; font-size: 1.7rem; font-weight: 600; color: #111; line-height: 1.1; }
        .vd-pred-crta { display: block; width: 48px; height: 2px; background: var(--vd-akcent); margin: .9rem 0; }
        .vd-predogled p { margin: 0; font-size: .9rem; color: #5a5560; line-height: 1.5; }
        .vd-ponastavi { align-self: flex-start; background: none; border: none; color: #8a8177; font-size: .82rem; text-decoration: underline; text-underline-offset: .2em; cursor: pointer; padding: 0; }
        .vd-ponastavi:hover { color: #111; }
      `}</style>
    </div>
  );
}

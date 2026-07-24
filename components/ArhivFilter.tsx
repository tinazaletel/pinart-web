'use client';

/* ARHIV FILTER — skupna vrstica filtrov za arhive (racuni, pogodbe, ...).
   Privzeto samo dva okrogla gumba: lupa (klik razsiri iskalni input cez vrstico)
   in Filtri (klik odpre slide-up sheet z dna; vsebino sheeta da vsaka stran
   prek children — status, obdobje, od-do ...). Filtri delujejo TAKOJ, gumb
   Pocisti resetira prek callbacka. Deluje enako na namizju in mobilnem.
   Sheet MORA biti v portalu na document.body: transform na prednikih
   (animacije sekcij) ukrade sidro position:fixed — znana past.
   Stili so samostojni (prefiks af-), brez odvisnosti od pregled.module.css. */

import { ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FunnelSimple, MagnifyingGlass } from '@phosphor-icons/react';

type Props = {
  iskanje: string;
  onIskanje: (vrednost: string) => void;
  placeholder?: string;
  /* stevilo aktivnih filtrov — pikica/stevec na gumbu Filtri */
  aktivnihFiltrov?: number;
  onPocisti?: () => void;
  children?: ReactNode;
};

export default function ArhivFilter({ iskanje, onIskanje, placeholder = 'Poišči …', aktivnihFiltrov = 0, onPocisti, children }: Props) {
  const [iskanjeOdprto, setIskanjeOdprto] = useState(false);
  const [sheet, setSheet] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  /* autofocus ob razsiritvi — sele po animaciji sirine se input ne premika pod prstom */
  useEffect(() => { if (iskanjeOdprto) inputRef.current?.focus(); }, [iskanjeOdprto]);

  return <div className="af">
    <div className="af-vrstica">
      {/* MOBILNO (<=640): kompaktni ikoni + prekrivni iskalnik + sheet.
          display:contents -> otroci ostanejo v af-vrstici (af-iskanje absolute
          se sidra na af-vrstico), na namizju cel blok skrijemo. */}
      <div className="af-mob">
        <button type="button" className="af-krog" aria-label="Išči" aria-expanded={iskanjeOdprto} onClick={() => setIskanjeOdprto(true)}>
          <MagnifyingGlass size={17} />
          {iskanje.trim() !== '' && <span className="af-stevec" aria-hidden>1</span>}
        </button>
        <button type="button" className="af-krog" aria-label="Filtri" aria-haspopup="dialog" aria-expanded={sheet} onClick={() => setSheet(true)}>
          <FunnelSimple size={17} />
          {aktivnihFiltrov > 0 && <span className="af-stevec" aria-hidden>{aktivnihFiltrov}</span>}
        </button>
        <div className={'af-iskanje' + (iskanjeOdprto ? ' odprt' : '')} aria-hidden={!iskanjeOdprto}>
          <MagnifyingGlass size={16} aria-hidden />
          <input ref={inputRef} type="search" value={iskanje} onChange={event => onIskanje(event.target.value)} placeholder={placeholder} aria-label={placeholder} tabIndex={iskanjeOdprto ? 0 : -1} />
          <button type="button" className="af-iskanje-x" aria-label="Zapri iskanje" tabIndex={iskanjeOdprto ? 0 : -1} onClick={() => { onIskanje(''); setIskanjeOdprto(false); }}>✕</button>
        </div>
      </div>
      {/* NAMIZJE (>640): dovolj prostora -> poln iskalnik + pilule filtrov v vrsti */}
      <div className="af-namizje">
        <span className="af-poln">
          <MagnifyingGlass size={16} aria-hidden />
          <input type="search" value={iskanje} onChange={event => onIskanje(event.target.value)} placeholder={placeholder} aria-label={placeholder} />
        </span>
        <div className="af-pilule">{children}</div>
      </div>
    </div>

    {typeof document !== 'undefined' && createPortal(
      <>
        {sheet && <div className="af-zastor" onClick={() => setSheet(false)} aria-hidden />}
        <div className={'af-sheet' + (sheet ? ' odprt' : '')} role="dialog" aria-label="Filtri" aria-hidden={!sheet}>
          <div className="af-glava"><b>Filtri</b><button type="button" className="af-sheet-x" onClick={() => setSheet(false)} aria-label="Zapri">✕</button></div>
          <div className="af-vsebina">{children}</div>
          {onPocisti && <div className="af-noga">
            <button type="button" className="af-pocisti" aria-label="Počisti filtre" onClick={onPocisti}>Počisti filtre</button>
          </div>}
        </div>
      </>,
      document.body,
    )}

    <style>{`
      .af{position:relative;width:100%;min-width:0}
      .af-vrstica{position:relative;display:flex;align-items:center;gap:.6rem;min-height:2.75rem;min-width:0}
      /* privzeto (mobilno) = kompaktni ikoni; namizni blok skrit */
      .af-mob{display:contents}
      .af-namizje{display:none}
      /* NAMIZJE: dovolj prostora -> vse vidno, poln iskalnik + pilule v vrsti */
      @media (min-width:641px){
        .af-mob{display:none}
        .af-namizje{display:flex;flex:1 1 auto;flex-wrap:wrap;align-items:center;gap:.5rem .7rem;min-width:0}
        .af-sheet,.af-zastor{display:none !important}
        .af-poln{flex:1 1 16rem;min-width:0;display:flex;align-items:center;gap:.45rem;box-sizing:border-box;background:rgba(255,255,255,.85);border:1px solid rgba(17,17,17,.16);border-radius:999px;padding:0 .95rem;color:rgba(17,17,17,.5)}
        .af-poln:focus-within{border-color:var(--ink,#111)}
        .af-poln input{flex:1;min-width:0;border:none;background:none;font:inherit;font-size:.95rem;font-weight:500;color:var(--ink,#111);padding:.62rem .25rem}
        .af-poln input:focus{outline:none}
        .af-poln input::placeholder{color:rgba(17,17,17,.45)}
        .af-pilule{display:flex;flex-wrap:wrap;align-items:center;gap:.4rem;flex:0 1 auto}
      }
      .af-krog{position:relative;display:inline-flex;align-items:center;justify-content:center;width:2.5rem;height:2.5rem;padding:0;border:1px solid rgba(17,17,17,.18);border-radius:50%;background:rgba(255,255,255,.7);color:var(--ink,#111);cursor:pointer;transition:background .15s,color .15s}
      .af-krog:hover{background:var(--ink,#111);color:var(--paper,#fff)}
      .af-stevec{position:absolute;top:-.3rem;right:-.3rem;min-width:1.05rem;height:1.05rem;padding:0 .25rem;border-radius:999px;background:var(--accent,#B25476);color:#fff;font-size:.62rem;font-weight:800;display:grid;place-items:center;line-height:1}
      /* razsirjeno iskanje: pilula cez CELO vrstico filtrov (animacija sirine iz leve) */
      .af-iskanje{position:absolute;inset:0;z-index:2;display:flex;align-items:center;gap:.45rem;box-sizing:border-box;background:rgba(255,255,255,.97);border:1px solid rgba(17,17,17,.16);border-radius:999px;padding:0 .3rem 0 .85rem;color:rgba(17,17,17,.55);opacity:0;pointer-events:none;clip-path:inset(0 100% 0 0 round 999px);transition:clip-path .26s cubic-bezier(.2,.8,.3,1),opacity .18s}
      .af-iskanje.odprt{opacity:1;pointer-events:auto;clip-path:inset(0 0 0 0 round 999px)}
      @media (prefers-reduced-motion:reduce){.af-iskanje{transition:none}}
      .af-iskanje svg{flex:none}
      .af-iskanje input{flex:1;min-width:0;min-height:2.2rem;border:none;background:none;font:inherit;font-size:16px;font-weight:500;color:var(--ink,#111);padding:.45rem .25rem}
      .af-iskanje input:focus{outline:none}
      .af-iskanje input::placeholder{color:rgba(17,17,17,.45)}
      .af-iskanje-x{flex:none;width:2.1rem;height:2.1rem;display:inline-flex;align-items:center;justify-content:center;border:none;background:rgba(17,17,17,.06);border-radius:50%;font-size:1rem;line-height:1;color:var(--ink,#111);cursor:pointer}
      .af-iskanje-x:hover{background:var(--ink,#111);color:var(--paper,#fff)}

      /* sheet z dna — enak videz kot Oblikovanje/Podpis sheet pri pogodbah */
      .af-zastor{position:fixed;inset:0;background:rgba(30,18,35,.34);z-index:95}
      .af-sheet{position:fixed;left:50%;bottom:0;transform:translate(-50%,102%);width:min(480px,100vw);z-index:96;background:var(--paper,#fff);border-radius:20px 20px 0 0;box-shadow:0 -16px 44px rgba(40,25,40,.22);transition:transform .32s cubic-bezier(.2,.8,.3,1);max-height:76dvh;overflow-y:auto;padding:0 1.2rem calc(1.4rem + env(safe-area-inset-bottom,0px))}
      .af-sheet.odprt{transform:translate(-50%,0)}
      @media (prefers-reduced-motion:reduce){.af-sheet{transition:none}}
      .af-glava{position:relative;display:flex;align-items:center;justify-content:space-between;width:100%;padding:1.35rem 0 .65rem;border-bottom:1px solid rgba(17,17,17,.1)}
      .af-glava::before{content:'';position:absolute;top:.5rem;left:50%;transform:translateX(-50%);width:2.4rem;height:.3rem;border-radius:999px;background:rgba(17,17,17,.18)}
      .af-glava b{font-size:1.05rem;font-weight:700}
      .af-sheet-x{width:2.1rem;height:2.1rem;display:inline-flex;align-items:center;justify-content:center;border:none;background:rgba(17,17,17,.06);border-radius:50%;font-size:1.1rem;line-height:1;color:var(--ink,#111);cursor:pointer}
      .af-vsebina{display:grid;gap:1.1rem;padding:1rem 0 .4rem}
      .af-noga{display:flex;justify-content:flex-start;padding:.4rem 0 .2rem;border-top:1px solid rgba(17,17,17,.08);margin-top:.4rem}
      .af-pocisti{margin-top:.6rem;padding:.5rem 1rem;border:1px solid rgba(17,17,17,.2);border-radius:999px;background:rgba(255,255,255,.5);font:inherit;font-size:.86rem;color:var(--ink,#111);cursor:pointer;transition:border-color .15s,background .15s,color .15s}
      .af-pocisti:hover{border-color:var(--ink,#111)}
    `}</style>
  </div>;
}

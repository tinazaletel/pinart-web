'use client';

/* DOKUMENTNI PANEL — rezultat zdrsne z desne in je videti kot dokument.
 *
 * Tinina zahteva (21. 8. 2026, 00:35): »ne vem zakaj bi bla drugačna. vse se
 * dogaja tu in lahko se odpre desni panel in vidiš cel dokument kot pdf.«
 *
 * Iz tega sledita dve odločitvi:
 *  - Orodje NI svoja stran s svojim videzom. Vpis ostane pri Pupi; panel je
 *    samo pogled na izid.
 *  - Panel ni okno z JSON izpisom, ampak STRAN: papir, serif, robovi kot pri
 *    tisku. Kar uporabnica vidi, mora biti isto, kar bo natisnila ali poslala.
 *
 * Panel je skupen — brief, pitch, canvas in vsi prihodnji dokumenti gredo
 * skozenj. Če bi ga vsak imel svojega, bi se videzi spet razšli.
 */

import { useEffect, useRef, type ReactNode } from 'react';

export type DokPanelProps = {
  odprt: boolean;
  naslov: string;
  nadnaslov?: string;
  podnaslov?: string;
  /* Dejanja gredo v nogo panela (Shrani, Odpri projekt …). */
  dejanja?: ReactNode;
  children: ReactNode;
  onZapri: () => void;
  jeEn?: boolean;
};

export default function DokPanel({ odprt, naslov, nadnaslov, podnaslov, dejanja, children, onZapri, jeEn = false }: DokPanelProps) {
  const L = (sl: string, en: string) => (jeEn ? en : sl);
  const panelRef = useRef<HTMLDivElement>(null);
  const vrniFokus = useRef<HTMLElement | null>(null);

  /* Esc zapre, fokus gre v panel in se ob zaprtju vrne tja, od koder je prišel.
     Brez tega je panel za tipkovnico past — glej docs/DOSTOPNOST-pregled.md. */
  useEffect(() => {
    if (!odprt) return;
    vrniFokus.current = document.activeElement as HTMLElement;
    panelRef.current?.focus();
    const naTipko = (e: KeyboardEvent) => { if (e.key === 'Escape') onZapri(); };
    document.addEventListener('keydown', naTipko);
    return () => {
      document.removeEventListener('keydown', naTipko);
      vrniFokus.current?.focus?.();
    };
  }, [odprt, onZapri]);

  if (!odprt) return null;

  return (
    <>
      <div className="dp-back" onClick={onZapri} aria-hidden />
      <aside className="dp" role="dialog" aria-modal="true" aria-label={naslov} tabIndex={-1} ref={panelRef}>
        <header className="dp-glava">
          <button type="button" className="dp-x" onClick={onZapri} aria-label={L('Zapri', 'Close')}>×</button>
          <button type="button" className="dp-tisk" onClick={() => window.print()}>{L('Natisni', 'Print')}</button>
        </header>

        {/* Papir: isti občutek kot natisnjen dokument, zato bela stran s tihimi robovi. */}
        <div className="dp-papir">
          {nadnaslov && <p className="dp-nad">{nadnaslov}</p>}
          <h1 className="dp-naslov">{naslov}</h1>
          {podnaslov && <p className="dp-pod">{podnaslov}</p>}
          <div className="dp-vsebina">{children}</div>
        </div>

        {dejanja && <footer className="dp-noga">{dejanja}</footer>}
      </aside>

      <style jsx>{`
        .dp-back { position: fixed; inset: 0; z-index: 70; background: oklch(30% .03 300 / .22); animation: dpFade .2s ease; }
        @keyframes dpFade { from { opacity: 0; } to { opacity: 1; } }
        .dp { position: fixed; top: 0; right: 0; z-index: 71; height: 100dvh; width: min(46rem, 94vw); display: flex; flex-direction: column;
              background: rgba(255,255,255,.86); backdrop-filter: blur(24px) saturate(1.4); -webkit-backdrop-filter: blur(24px) saturate(1.4);
              border-left: 1px solid rgba(255,255,255,.7); box-shadow: -18px 0 50px oklch(40% .08 300 / .18);
              animation: dpDrsni .3s cubic-bezier(.2,.85,.25,1); outline: none; }
        @keyframes dpDrsni { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @media (prefers-reduced-motion: reduce) { .dp, .dp-back { animation: none; } }

        .dp-glava { flex: none; display: flex; align-items: center; justify-content: space-between; gap: .5rem; padding: .8rem 1rem; }
        .dp-x { display: grid; place-items: center; width: 2.2rem; height: 2.2rem; border: 1px solid color-mix(in oklch, var(--ink, #1a1a1a) 12%, transparent);
                border-radius: 50%; background: rgba(255,255,255,.8); font-size: 1.3rem; line-height: 1; color: color-mix(in oklch, var(--ink, #1a1a1a) 60%, transparent); cursor: pointer; }
        .dp-x:hover { background: #fff; color: var(--ink, #1a1a1a); }
        .dp-tisk { padding: .45rem .9rem; border: 1px solid color-mix(in oklch, var(--ink, #1a1a1a) 14%, transparent); border-radius: 999px;
                   background: rgba(255,255,255,.8); font: 700 .76rem var(--font-sans), sans-serif; color: color-mix(in oklch, var(--ink, #1a1a1a) 70%, transparent); cursor: pointer; }
        .dp-tisk:hover { background: #fff; color: var(--ink, #1a1a1a); }

        /* Stran, ne okno: bel papir z velikodušnimi robovi, kot v tisku. */
        .dp-papir { flex: 1 1 auto; min-height: 0; overflow-y: auto; margin: 0 1rem; padding: 2.4rem clamp(1.4rem, 4vw, 3rem) 3rem;
                    background: #fff; border-radius: 1rem 1rem 0 0; box-shadow: 0 -2px 24px oklch(40% .08 300 / .08); }
        .dp-nad { margin: 0 0 .3rem; font: 800 .62rem var(--font-sans), sans-serif; letter-spacing: .18em; text-transform: uppercase; color: var(--purple, oklch(60% .2 297)); }
        .dp-naslov { margin: 0; font: 500 clamp(1.5rem, 3.4vw, 2.1rem)/1.12 var(--font-serif), Georgia, serif; font-synthesis: none; letter-spacing: -.01em; color: var(--ink, #1a1a1a); text-wrap: balance; }
        .dp-pod { margin: .5rem 0 0; font: 500 .92rem/1.5 var(--font-sans), sans-serif; color: color-mix(in oklch, var(--ink, #1a1a1a) 58%, transparent); }
        .dp-vsebina { margin-top: 1.8rem; }

        .dp-noga { flex: none; display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; padding: .85rem 1rem 1rem; margin: 0 1rem;
                   background: #fff; border-top: 1px solid color-mix(in oklch, var(--ink, #1a1a1a) 8%, transparent); border-radius: 0 0 1rem 1rem; }

        /* Ob tiskanju ostane samo papir — brez zatemnitve, glave in noge. */
        @media print {
          .dp-back, .dp-glava, .dp-noga { display: none; }
          .dp { position: static; width: auto; height: auto; box-shadow: none; border: 0; background: #fff; backdrop-filter: none; }
          .dp-papir { margin: 0; padding: 0; overflow: visible; box-shadow: none; border-radius: 0; }
        }
      `}</style>
    </>
  );
}

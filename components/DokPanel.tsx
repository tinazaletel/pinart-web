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

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

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
  /* Kaj uporabnica tu dela — Pupa s tem pozdravi po zadevi, ne na splošno
     (npr. »pripravljaš kampanjo«). */
  pupaDelo?: string;
};

export default function DokPanel({ odprt, naslov, nadnaslov, podnaslov, dejanja, children, onZapri, jeEn = false, pupaDelo }: DokPanelProps) {
  const L = (sl: string, en: string) => (jeEn ? en : sl);
  const panelRef = useRef<HTMLDivElement>(null);
  const vrniFokus = useRef<HTMLElement | null>(null);
  const [montiran, setMontiran] = useState(false);
  useEffect(() => setMontiran(true), []);


  /* Stran za panelom obmiruje: ko je panel odprt, se premika samo panel. Sicer se
     ob drsenju nad njim pomika stran spodaj, kar je videti kot dva drsnika hkrati.
     Padding nadomesti sirino drsnika, da vsebina ob zaklepu ne poskoci. */
  useEffect(() => {
    if (!odprt || typeof document === 'undefined') return;
    const prejsnjiOverflow = document.body.style.overflow;
    const prejsnjiPadding = document.body.style.paddingRight;
    const sirinaDrsnika = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (sirinaDrsnika > 0) document.body.style.paddingRight = `${sirinaDrsnika}px`;
    return () => {
      document.body.style.overflow = prejsnjiOverflow;
      document.body.style.paddingRight = prejsnjiPadding;
    };
  }, [odprt]);

  /* Esc zapre, fokus gre v panel in se ob zaprtju vrne tja, od koder je prišel.
     Brez tega je panel za tipkovnico past — glej docs/DOSTOPNOST-pregled.md.
     POZOR: ucinek sme biti odvisen SAMO od `odprt`. Klicatelji podajajo
     onZapri kot vgnezdeno funkcijo, ki je ob vsakem izrisu nova; ce je v
     odvisnostih, se ucinek po vsaki tipki pocisti in znova pozene, fokus pa
     odleti iz polja nazaj na panel — »napisem crko in me vrze ven«
     (Tina, 1. 9. 2026). Zato gre onZapri v ref. */
  const zapriRef = useRef(onZapri);
  useEffect(() => { zapriRef.current = onZapri; });

  /* PANEL SI FOKUSA NE VZAME. Vsak poskus (tudi enkraten, ob odprtju) je v
     praksi konceval tako, da je fokus pristal na okviru panela — uporabnica je
     videla, kako se cel desni panel obarva vijolicno, in pisanja ni bilo
     (Tina, 1. 9. 2026). Pisanje je pomembnejse od samodejnega fokusa; panel je
     s tipkovnico dosegljiv s tabulatorjem, izhod pa ima z Esc in gumbom Zapri.
     Ob zaprtju fokus vrnemo tja, od koder je prisel, a le ce je bil v panelu. */
  useEffect(() => {
    if (odprt) { vrniFokus.current = document.activeElement as HTMLElement; return; }
    return;
  }, [odprt]);

  /* Esc zapre panel; poslusalec ni vezan na izris, zato ne posega v fokus. */
  useEffect(() => {
    if (!odprt) return;
    const naTipko = (e: KeyboardEvent) => { if (e.key === 'Escape') zapriRef.current(); };
    document.addEventListener('keydown', naTipko);
    return () => document.removeEventListener('keydown', naTipko);
  }, [odprt]);

  if (!odprt || !montiran) return null;

  /* Panel gre v portal na <body>. Brez tega ga ujame prvi prednik s
     transform/filter/overflow-clip -- takrat position:fixed ni vec glede na
     zaslon, ampak glede na tega prednika, in panel obvisi sredi strani z
     ozadjem ob sebi. Sosednja panela v ProjectDetailModern portal ze imata. */
  return createPortal(
    <>
      <div className="dp-back" onClick={onZapri} aria-hidden />
      <aside className="dp" role="dialog" aria-modal="true" aria-label={naslov} tabIndex={-1} ref={panelRef}>
        <header className="dp-glava">
          {/* Natisni levo kot povezava z ikono, zapri desno -- zapiranje je vedno
              v desnem kotu, dejanje nad dokumentom pa ob njegovem zacetku. */}
          <button type="button" className="dp-tisk" onClick={() => window.print()}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 9V3h12v6M6 18H4v-6h16v6h-2M8 14h8v7H8z" /></svg>
            {L('Natisni', 'Print')}
          </button>
          <button type="button" className="dp-x" onClick={onZapri} aria-label={L('Zapri', 'Close')}>×</button>
        </header>

        {/* Papir: isti občutek kot natisnjen dokument, zato bela stran s tihimi robovi. */}
        <div className="dp-papir">
          {nadnaslov && <p className="dp-nad">{nadnaslov}</p>}
          <div className="dp-naslov-vrsta">
            <h1 className="dp-naslov">{naslov}</h1>
            {/* Gumb za Pupo ob naslovu: krogca spodaj desno marsikdo ne poveže z
                AI, zato je vstop tam, kjer je delo (Tina, 1. 9. 2026). Odpre
                obstoječo Pupo — panel se ob njej umakne levo. */}
            <button
              type="button"
              className="dp-pupa"
              onClick={() => window.dispatchEvent(new CustomEvent('pupa:odpri', { detail: { nacin: 'chat', delo: pupaDelo } }))}
            >
              <span className="dp-pupa-orb" aria-hidden />
              {L('Vprašaj Pupo', 'Ask Pupa')}
            </button>
          </div>
          {podnaslov && <p className="dp-pod">{podnaslov}</p>}
          <div className="dp-vsebina">{children}</div>
        </div>

        {dejanja && <footer className="dp-noga">{dejanja}</footer>}
      </aside>

      <style jsx>{`
        .dp-back { position: fixed; inset: 0; z-index: 70; background: oklch(30% .03 300 / .22); animation: dpFade .2s ease; }
        @keyframes dpFade { from { opacity: 0; } to { opacity: 1; } }
        /* Ko je Pupa odprta, se panel umakne levo za njeno sirino — delata
           skupaj, ne eden cez drugega (Tina, 1. 9. 2026). */
        :global(body.pupa-odprta) .dp { right: var(--pupa-sirina, 0); }
        :global(body.pupa-odprta) .dp-back { right: var(--pupa-sirina, 0); }
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
        .dp-tisk { display: inline-flex; align-items: center; gap: .4rem; padding: 0; border: 0; background: none;
                   font: 700 .78rem var(--font-sans), sans-serif; color: color-mix(in oklch, var(--ink, #1a1a1a) 62%, transparent); cursor: pointer; transition: color .15s; }
        .dp-tisk:hover { color: var(--purple, oklch(52% .2 297)); text-decoration: underline; text-underline-offset: 3px; }

        /* Stran, ne okno: bel papir z velikodušnimi robovi, kot v tisku. */
        .dp-papir { flex: 1 1 auto; min-height: 0; overflow-y: auto; margin: 0 1rem; padding: 2.4rem clamp(1.4rem, 4vw, 3rem) 3rem;
                    background: #fff; border-radius: 1rem 1rem 0 0; box-shadow: 0 -2px 24px oklch(40% .08 300 / .08); }
        .dp-naslov-vrsta { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
        .dp-pupa { flex: none; display: inline-flex; align-items: center; gap: .45rem;
                   padding: .5rem .9rem; border: 1px solid color-mix(in oklch, var(--purple, oklch(66% .2 297)) 40%, transparent);
                   border-radius: 999px; background: color-mix(in oklch, var(--purple, oklch(66% .2 297)) 8%, #fff);
                   font: 750 .8rem var(--font-sans), sans-serif; color: oklch(42% .16 300); cursor: pointer;
                   transition: transform .18s ease, box-shadow .18s ease, background .18s ease; }
        .dp-pupa:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(35,18,45,.12);
                         background: color-mix(in oklch, var(--purple, oklch(66% .2 297)) 14%, #fff); }
        .dp-pupa-orb { width: 1.05rem; height: 1.05rem; border-radius: 50%;
                       background: conic-gradient(from 210deg, oklch(70% .19 300), oklch(72% .16 200), oklch(80% .13 150), oklch(78% .16 60), oklch(70% .19 300)); }
        .dp-nad { margin: 0 0 .3rem; font: 800 .62rem var(--font-sans), sans-serif; letter-spacing: .18em; text-transform: uppercase; color: var(--purple, oklch(60% .2 297)); }
        /* --font-serif-flow (DM Serif), NE --font-serif. Panel visi v portalu na
           <body>, torej zunaj .shell, kjer je --font-serif preslikan v Flow serif.
           Zunaj tega je --font-serif portfeljev Bodoni in ta v Flow ne sodi. */
        .dp-naslov { margin: 0; font: 500 clamp(1.5rem, 3.4vw, 2.1rem)/1.12 var(--font-serif-flow), Georgia, serif; font-synthesis: none; letter-spacing: -.01em; color: var(--ink, #1a1a1a); text-wrap: balance; }
        .dp-pod { margin: .5rem 0 0; font: 500 .92rem/1.5 var(--font-sans), sans-serif; color: color-mix(in oklch, var(--ink, #1a1a1a) 58%, transparent); }
        .dp-vsebina { margin-top: 1.8rem; }

        .dp-noga { flex: none; display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; padding: .85rem clamp(1.4rem, 4vw, 3rem) 1rem; margin: 0 1rem;
                   background: #fff; border-top: 1px solid color-mix(in oklch, var(--ink, #1a1a1a) 8%, transparent); border-radius: 0 0 1rem 1rem; }

        /* Ob tiskanju ostane samo papir — brez zatemnitve, glave in noge. */
        @media print {
          /* Natisne se SAMO dokument: vse ostalo na strani (lupina, meni, kartice
             projekta) gre iz tiska, sicer se pred dokumentom natisne cela app. */
          :global(body > *:not(.dp)) { display: none !important; }
          .dp-back, .dp-glava, .dp-noga { display: none; }
          .dp { position: static; width: auto; height: auto; box-shadow: none; border: 0; background: #fff; backdrop-filter: none; }
          .dp-papir { margin: 0; padding: 0; overflow: visible; box-shadow: none; border-radius: 0; }
        }
      `}</style>
    </>,
    document.body,
  );
}

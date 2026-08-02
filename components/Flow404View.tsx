import Link from 'next/link';

/* Predstavitveni Flow 404 (kužek + kabel + svetleči utripajoči "404"). Brez
   hookov, da deluje TUDI v korenskem app/not-found.tsx (zunaj next-intl
   konteksta). Jezik dobi prek prop. Klientni ovoj Flow404 doda useLocale. */
export default function Flow404View({ locale = 'sl' }: { locale?: string }) {
  const jeEn = locale === 'en';
  const L = (sl: string, en: string) => (jeEn ? en : sl);
  const flow = jeEn ? '/en/flow' : '/flow';
  const kalk = jeEn ? '/en/kalkulator' : '/kalkulator';

  return (
    <main className="f404">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="f404-slika" src="/flow/jorki-404.png" alt="" aria-hidden />
      <div className="f404-scrim" aria-hidden />

      <div className="f404-vsebina">
        <span className="f404-eyebrow">Pinart Flow</span>
        <div className="f404-koda" role="img" aria-label="404">
          <span>4</span><span>0</span><span>4</span>
        </div>
        <h1 className="f404-h">{L('Ta stran je ostala brez elektrike.', 'This page lost power.')}</h1>
        <p className="f404-p">
          {L(
            'Videti je, da je kužek pregriznil kabel do te strani. Pridi, pospremiva te nazaj na varno.',
            'Looks like the pup chewed through the cable to this page. Come on, we will walk you back to safety.'
          )}
        </p>
        <div className="f404-cta">
          <Link className="f404-btn prim" href={flow}>{L('← Nazaj na Flow', '← Back to Flow')}</Link>
          <Link className="f404-btn ghost" href={kalk}>{L('Odpri kalkulator', 'Open the calculator')}</Link>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .f404 { position: relative; min-height: 100svh; overflow: hidden;
          background: #f4f4f3; color: oklch(26% .012 300);
          font-family: var(--font-sans, ui-sans-serif, system-ui, sans-serif); }
        .f404-slika { position: absolute; inset: 0; width: 100%; height: 100%;
          object-fit: cover; object-position: 74% 62%; z-index: 0; pointer-events: none; user-select: none; }
        .f404-scrim { position: absolute; inset: 0; z-index: 1; pointer-events: none;
          background: linear-gradient(100deg, #f4f4f3 26%, rgba(244,244,243,.72) 44%, rgba(244,244,243,0) 62%); }

        .f404-vsebina { position: relative; z-index: 2; max-width: 1180px; margin: 0 auto;
          min-height: 100svh; display: flex; flex-direction: column; justify-content: center;
          align-items: flex-start; gap: .1rem; padding: 2.5rem clamp(1.5rem, 5vw, 5rem); }

        .f404-eyebrow { font-size: .78rem; font-weight: 700; letter-spacing: .22em; text-transform: uppercase;
          color: oklch(52% .14 300); margin-bottom: 1.1rem; }

        .f404-koda { display: flex; gap: .01em; line-height: .82; margin: 0 0 1.3rem -.05em;
          font-weight: 900; font-size: clamp(5.5rem, 17vw, 14rem); letter-spacing: -.03em; }
        .f404-koda span { color: oklch(56% .23 295);
          text-shadow: 0 0 7px oklch(72% .2 300 / .6), 0 0 24px oklch(66% .22 300 / .5), 0 0 55px oklch(62% .24 300 / .4), 0 0 100px oklch(60% .25 300 / .25);
          animation: f404flicker 5.5s linear infinite; }
        .f404-koda span:nth-child(2) { animation-delay: .5s; }
        .f404-koda span:nth-child(3) { animation-delay: .18s; }
        @keyframes f404flicker {
          0%, 100% { opacity: 1; filter: brightness(1); }
          46% { opacity: 1; filter: brightness(1.12); }
          48% { opacity: .58; filter: brightness(.68); }
          49% { opacity: 1; filter: brightness(1.18); }
          51% { opacity: .74; filter: brightness(.82); }
          52% { opacity: 1; filter: brightness(1); }
          85% { opacity: 1; }
          86% { opacity: .6; filter: brightness(.7); }
          87% { opacity: 1; filter: brightness(1); }
        }

        .f404-h { margin: 0 0 .7rem; max-width: 22ch; font-size: clamp(1.5rem, 3.4vw, 2.35rem);
          font-weight: 700; line-height: 1.12; letter-spacing: -.01em; color: oklch(24% .015 300); }
        .f404-p { margin: 0 0 1.9rem; max-width: 34ch; font-size: 1.02rem; line-height: 1.55;
          color: oklch(42% .012 300); }

        .f404-cta { display: flex; flex-wrap: wrap; gap: .7rem; }
        .f404-btn { display: inline-flex; align-items: center; justify-content: center; height: 3rem;
          padding: 0 1.4rem; border-radius: 999px; font-size: .95rem; font-weight: 700;
          text-decoration: none; transition: transform .12s ease, background .12s ease; }
        .f404-btn.prim { background: oklch(24% .016 285); color: #fff; }
        .f404-btn.prim:hover { transform: translateY(-1px); background: oklch(30% .03 285); }
        .f404-btn.ghost { background: rgba(255,255,255,.7); color: oklch(30% .02 300);
          border: 1px solid oklch(30% .02 300 / .18); }
        .f404-btn.ghost:hover { background: #fff; }

        @media (max-width: 760px) {
          .f404-slika { object-position: 62% 92%; }
          .f404-scrim { background: linear-gradient(180deg, #f4f4f3 34%, rgba(244,244,243,.6) 52%, rgba(244,244,243,0) 72%); }
          .f404-vsebina { justify-content: flex-start; padding-top: clamp(2.5rem, 10vh, 6rem); }
        }
        @media (prefers-reduced-motion: reduce) { .f404-koda span { animation: none; } }
      ` }} />
    </main>
  );
}

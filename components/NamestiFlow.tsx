'use client';

import { useEffect, useState } from 'react';

/* GUMB "NAMESTI FLOW".
 *
 * Brskalnik ponudi namestitev sam, a ikono v naslovni vrstici skoraj nihce ne
 * opazi. Zato ujamemo dogodek beforeinstallprompt in ponudimo svoj gumb
 * (Borjan, 2. 9. 2026: "pricakoval bi, da si ga lahko nalozim na komp").
 *
 * iPhone tega dogodka nima — tam pokazemo navodilo, ker je pot drugacna
 * (Deli -> Na zacetni zaslon). Ce je Flow ze namescen ali brskalnik namestitve
 * ne podpira, se ne pokaze nic: gumb, ki ne dela, je slabsi od nobenega. */

type Poziv = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export default function NamestiFlow({ jeEn = false }: { jeEn?: boolean }) {
  const L = (sl: string, en: string) => (jeEn ? en : sl);
  const [poziv, setPoziv] = useState<Poziv | null>(null);
  const [iphone, setIphone] = useState(false);
  const [navodilo, setNavodilo] = useState(false);

  useEffect(() => {
    const zeNamescen = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (zeNamescen) return;

    const jeIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (jeIos) { setIphone(true); return; }

    const ujemi = (e: Event) => { e.preventDefault(); setPoziv(e as Poziv); };
    window.addEventListener('beforeinstallprompt', ujemi);
    return () => window.removeEventListener('beforeinstallprompt', ujemi);
  }, []);

  if (!poziv && !iphone) return null;

  return (
    <div className="nf">
      <button type="button" className="nf-gumb" onClick={async () => {
        if (iphone) { setNavodilo(v => !v); return; }
        await poziv?.prompt();
        const izid = await poziv?.userChoice;
        if (izid?.outcome === 'accepted') setPoziv(null);
      }}>
        <svg viewBox="0 0 256 256" width="15" height="15" fill="currentColor" aria-hidden>
          <path d="M74.34,85.66a8,8,0,0,1,11.32-11.32L120,108.69V24a8,8,0,0,1,16,0v84.69l34.34-34.35a8,8,0,0,1,11.32,11.32l-48,48a8,8,0,0,1-11.32,0ZM240,136v64a16,16,0,0,1-16,16H32a16,16,0,0,1-16-16V136a16,16,0,0,1,16-16H72a8,8,0,0,1,0,16H32v64H224V136H184a8,8,0,0,1,0-16h40A16,16,0,0,1,240,136Z" />
        </svg>
        {L('Namesti Flow', 'Install Flow')}
      </button>
      {navodilo && (
        <p className="nf-navodilo">
          {L('V Safariju odpri Deli in izberi »Na začetni zaslon«.',
             'In Safari, tap Share and choose “Add to Home Screen”.')}
        </p>
      )}
      <style jsx>{`
        .nf { display: flex; flex-direction: column; gap: .4rem; align-items: flex-start; }
        .nf-gumb { display: inline-flex; align-items: center; gap: .5rem; min-height: 2.25rem;
                   padding: 0 1.05rem; border-radius: 999px; cursor: pointer;
                   border: 1px solid color-mix(in oklch, var(--ink, #221E19) 18%, transparent);
                   background: transparent; color: var(--ink, #221E19);
                   font: 700 .82rem var(--font-sans), sans-serif;
                   transition: border-color .15s ease, color .15s ease; }
        .nf-gumb:hover { border-color: var(--purple, #7C3AED); color: var(--purple, #7C3AED); }
        .nf-navodilo { margin: 0; font: 500 .78rem var(--font-sans), sans-serif;
                       color: color-mix(in oklch, var(--ink, #221E19) 62%, transparent); }
      `}</style>
    </div>
  );
}

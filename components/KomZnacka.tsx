'use client';

/* KomZnacka — obvestilna znacka na postavki »Komunikacija« v stranski vrstici.
   Dva LOCENA signala (Tinina odlocitev 6.8.):
     - stevilka (zgoraj desno) = neprebrani prejeti maili
     - zelena utripajoca pika (spodaj desno) = nov klepet »v zivo« (sporocilo od
       drugega, ki ga se nisi videl)
   Osvezi se ob nalozitvi, vsakih 30 s, ob fokusu okna in ob dogodku kom-obvestila
   (npr. ko na Komunikaciji odpres mail/nit). Ne pokaze niti stevilke niti pike,
   ce ni nic novega. */

import { useEffect, useState } from 'react';
import { preberiObvestila, KOM_DOGODEK } from '@/lib/komObvestila';

export default function KomZnacka() {
  const [poste, setPoste] = useState(0);
  const [zivo, setZivo] = useState(false);

  useEffect(() => {
    let ustavljeno = false;
    const osvezi = () => {
      void preberiObvestila().then(o => { if (!ustavljeno) { setPoste(o.poste); setZivo(o.klepeti > 0); } });
    };
    osvezi();
    const iv = window.setInterval(osvezi, 30000);
    window.addEventListener('focus', osvezi);
    window.addEventListener(KOM_DOGODEK, osvezi);
    window.addEventListener('storage', osvezi);
    return () => {
      ustavljeno = true;
      window.clearInterval(iv);
      window.removeEventListener('focus', osvezi);
      window.removeEventListener(KOM_DOGODEK, osvezi);
      window.removeEventListener('storage', osvezi);
    };
  }, []);

  if (!poste && !zivo) return null;

  return (
    <span className="kom-znacka" aria-label={`${poste ? `${poste} neprebranih sporočil` : ''}${zivo ? ' · nov klepet v živo' : ''}`.trim()}>
      {poste > 0 && <span className="kom-znacka-n">{poste > 99 ? '99+' : poste}</span>}
      {zivo && <span className="kom-znacka-pika" />}
      <style>{`
        .kom-znacka{position:absolute;inset:0;pointer-events:none}
        .kom-znacka-n{position:absolute;top:-6px;right:-7px;min-width:1.05rem;height:1.05rem;padding:0 .28rem;display:grid;place-items:center;border-radius:999px;background:var(--purple,oklch(66% .2 297));color:#fff;font:800 .62rem/1 var(--font-sans),system-ui,sans-serif;box-shadow:0 0 0 2px var(--paper,#fff)}
        .kom-znacka-pika{position:absolute;bottom:-3px;right:-4px;width:.62rem;height:.62rem;border-radius:50%;background:oklch(72% .19 150);box-shadow:0 0 0 2px var(--paper,#fff)}
        .kom-znacka-pika::after{content:'';position:absolute;inset:0;border-radius:50%;background:oklch(72% .19 150);animation:komPip 1.8s ease-out infinite}
        @keyframes komPip{0%{transform:scale(1);opacity:.6}70%{transform:scale(2.4);opacity:0}100%{opacity:0}}
        @media (prefers-reduced-motion:reduce){.kom-znacka-pika::after{animation:none}}
      `}</style>
    </span>
  );
}

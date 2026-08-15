'use client';

/* Toast — lahka pasica z obvestilom, ki zdrsne z vrha zaslona in po nekaj
   sekundah izgine. Renderira se prek portala na document.body (fixed, nad vsem),
   da NE podira postavitve orodnih vrstic. Mobilno prijazno: na ozkih zaslonih se
   razširi čez širino z robom. Uporaba: <Toast sporocilo={x} onClose={() => setX('')} />
   Skupni slog obvestil povsod po aplikaciji. */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type Ton = 'info' | 'uspeh' | 'napaka';

export default function Toast({
  sporocilo,
  onClose,
  trajanje = 3500,
  ton = 'info',
}: {
  sporocilo: string;
  onClose: () => void;
  trajanje?: number;
  ton?: Ton;
}) {
  const [mounted, setMounted] = useState(false);
  const [odhaja, setOdhaja] = useState(false);
  const zapriRef = useRef(onClose);
  zapriRef.current = onClose;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!sporocilo) return;
    setOdhaja(false);
    const t1 = window.setTimeout(() => setOdhaja(true), Math.max(0, trajanje - 320));
    const t2 = window.setTimeout(() => zapriRef.current(), trajanje);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, [sporocilo, trajanje]);

  if (!mounted || !sporocilo) return null;

  const barva = ton === 'uspeh' ? 'oklch(62% .16 150)' : ton === 'napaka' ? 'oklch(58% .18 25)' : 'var(--purple, oklch(66% .2 297))';

  return createPortal(
    <div className={`pw-toast${ton === 'napaka' ? ' pw-toast-napaka' : ''}${odhaja ? ' pw-toast-off' : ''}`} role={ton === 'napaka' ? 'alert' : 'status'} aria-live={ton === 'napaka' ? 'assertive' : 'polite'}>
      <span className="pw-toast-pika" style={{ background: barva }} />
      <span className="pw-toast-txt">{sporocilo}</span>
      <button type="button" className="pw-toast-x" onClick={() => { setOdhaja(true); window.setTimeout(() => zapriRef.current(), 240); }} aria-label="Zapri obvestilo">×</button>
      <style>{`
        .pw-toast{position:fixed;top:1rem;left:50%;z-index:9999;display:inline-flex;align-items:center;gap:.6rem;max-width:min(92vw,30rem);padding:.7rem .8rem .7rem 1rem;background:#fff;border:1px solid color-mix(in oklch,var(--ink, #2a2620) 10%,transparent);border-radius:.85rem;box-shadow:0 12px 34px -12px color-mix(in oklch,var(--ink, #2a2620) 40%,transparent),0 2px 8px -4px color-mix(in oklch,var(--ink, #2a2620) 30%,transparent);animation:pwToastIn .32s cubic-bezier(.16,1,.3,1) both;transform:translateX(-50%)}
        .pw-toast-off{animation:pwToastOut .3s ease-in both}
        .pw-toast-pika{flex:none;width:.5rem;height:.5rem;border-radius:999px}
        .pw-toast-napaka{background:oklch(96% .035 25);border-color:oklch(78% .13 25 / .6)}
        .pw-toast-napaka .pw-toast-txt{color:oklch(46% .17 25)}
        .pw-toast-napaka .pw-toast-x{color:oklch(56% .13 25)}
        .pw-toast-napaka .pw-toast-pika{display:none}
        .pw-toast-txt{font:600 .82rem var(--font-sans),system-ui,sans-serif;color:var(--ink, #2a2620);line-height:1.4}
        .pw-toast-x{flex:none;border:0;background:none;color:color-mix(in oklch,var(--ink, #2a2620) 45%,transparent);font-size:1.05rem;line-height:1;cursor:pointer;padding:0 .1rem;margin-left:.1rem}
        .pw-toast-x:hover{color:var(--ink, #2a2620)}
        @keyframes pwToastIn{from{opacity:0;transform:translate(-50%,-120%)}to{opacity:1;transform:translate(-50%,0)}}
        @keyframes pwToastOut{from{opacity:1;transform:translate(-50%,0)}to{opacity:0;transform:translate(-50%,-120%)}}
        @media (max-width:640px){.pw-toast{left:.7rem;right:.7rem;max-width:none;transform:none}
          @keyframes pwToastIn{from{opacity:0;transform:translateY(-120%)}to{opacity:1;transform:translateY(0)}}
          @keyframes pwToastOut{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(-120%)}}}
        @media (prefers-reduced-motion:reduce){.pw-toast,.pw-toast-off{animation-duration:.01ms}}
      `}</style>
    </div>,
    document.body,
  );
}

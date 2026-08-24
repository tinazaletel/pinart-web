'use client';

/* Toast — lahka pasica z obvestilom, ki zdrsne z vrha zaslona in po nekaj
   sekundah izgine. Renderira se prek portala na document.body (fixed, nad vsem),
   da NE podira postavitve orodnih vrstic. Mobilno prijazno: na ozkih zaslonih se
   razširi čez širino z robom. Uporaba: <Toast sporocilo={x} onClose={() => setX('')} />
   Skupni slog obvestil povsod po aplikaciji. */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type Ton = 'info' | 'uspeh' | 'napaka';

export default function Toast({
  sporocilo,
  onClose,
  trajanje = 3500,
  ton = 'info',
  dejanja,
  ikona,
  naslov,
}: {
  sporocilo: string;
  onClose: () => void;
  /* 0 = obvestilo NE izgine samo. Za tisto, kar zahteva odločitev
     (pozabljena štoparica), sicer izgine, preden ga uporabnica prebere. */
  trajanje?: number;
  ton?: Ton;
  /* Gumbi v obvestilu — postavijo se pred križec. */
  dejanja?: ReactNode;
  /* Ikona na začetku. Kadar je podana, nadomesti barvno piko — obvestilo o
     štoparici naj se prepozna, preden ga uporabnica prebere. */
  ikona?: ReactNode;
  /* Naslov v krepkem, ob ikoni. Sporočilo se prelomi pod njega — dolgo
     obvestilo v enem kosu se prelomi kjer koli in je videti razmetano. */
  naslov?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [odhaja, setOdhaja] = useState(false);
  const zapriRef = useRef(onClose);
  zapriRef.current = onClose;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!sporocilo || trajanje <= 0) return;
    setOdhaja(false);
    const t1 = window.setTimeout(() => setOdhaja(true), Math.max(0, trajanje - 320));
    const t2 = window.setTimeout(() => zapriRef.current(), trajanje);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, [sporocilo, trajanje]);

  if (!mounted || !sporocilo) return null;

  const barva = ton === 'uspeh' ? 'oklch(62% .16 150)' : ton === 'napaka' ? 'oklch(58% .18 25)' : 'var(--purple, oklch(66% .2 297))';

  return createPortal(
    <div className={`pw-toast${ton === 'napaka' ? ' pw-toast-napaka' : ''}${ton === 'napaka' || trajanje <= 0 ? ' pw-toast-vztrajen' : ''}${odhaja ? ' pw-toast-off' : ''}`} role={ton === 'napaka' ? 'alert' : 'status'} aria-live={ton === 'napaka' ? 'assertive' : 'polite'}>
      {ikona
        ? <span className="pw-toast-ikona" style={{ color: barva }} aria-hidden>{ikona}</span>
        : <span className="pw-toast-pika" style={{ background: barva }} />}
      <span className={`pw-toast-txt${naslov ? ' pw-toast-txt-dvojni' : ''}`}>
        {naslov && <b className="pw-toast-naslov">{naslov}</b>}
        <span>{sporocilo}</span>
      </span>
      {dejanja && <span className="pw-toast-dejanja">{dejanja}</span>}
      <button type="button" className="pw-toast-x" onClick={() => { setOdhaja(true); window.setTimeout(() => zapriRef.current(), 240); }} aria-label="Zapri obvestilo">×</button>
      <style>{`
        .pw-toast{position:fixed;top:1rem;left:50%;z-index:9999;display:inline-flex;align-items:center;gap:.6rem;max-width:min(92vw,30rem);padding:.7rem .8rem .7rem 1rem;background:#fff;border:1px solid color-mix(in oklch,var(--ink, #2a2620) 10%,transparent);border-radius:.85rem;box-shadow:0 12px 34px -12px color-mix(in oklch,var(--ink, #2a2620) 40%,transparent),0 2px 8px -4px color-mix(in oklch,var(--ink, #2a2620) 30%,transparent);animation:pwToastIn .32s cubic-bezier(.16,1,.3,1) both;transform:translateX(-50%)}
        .pw-toast-off{animation:pwToastOut .3s ease-in both}
        /* OPOZORILA (ton napaka) in vsa vztrajna obvestila pridejo z DESNE
           proti levi in stojijo tik pod glavo, pri zvoncu — tam jih uporabnica
           išče. Ne visijo čez sredino glave, kjer bi zakrivala orodno vrstico.
           Kratka info in uspeh obvestila ostanejo na sredini zgoraj.
           Glava je visoka 3.25rem, zato 4rem pusti prst zraka pod njo. */
        .pw-toast-vztrajen{top:4rem;left:auto;right:1rem;transform:none;align-items:flex-start;max-width:min(92vw,31rem);border-left:4px solid oklch(58% .18 25);animation:pwToastVstran .34s cubic-bezier(.16,1,.3,1) both}
        .pw-toast-vztrajen .pw-toast-txt{font-size:.86rem;font-weight:700}
        .pw-toast-vztrajen.pw-toast-off{animation:pwToastVstranOff .28s ease-in both}
        @keyframes pwToastVstran{from{opacity:0;transform:translateX(115%)}to{opacity:1;transform:translateX(0)}}
        @keyframes pwToastVstranOff{from{opacity:1;transform:translateX(0)}to{opacity:0;transform:translateX(115%)}}
        .pw-toast-pika{flex:none;width:.5rem;height:.5rem;border-radius:999px}
        .pw-toast-ikona{flex:none;display:grid;place-items:center;width:1.6rem;height:1.6rem}
        .pw-toast-vztrajen .pw-toast-ikona,.pw-toast-vztrajen .pw-toast-dejanja,.pw-toast-vztrajen .pw-toast-x{margin-top:.05rem}
        .pw-toast-napaka .pw-toast-ikona{color:oklch(52% .17 25)}
        .pw-toast-napaka{background:#fff;border-color:color-mix(in oklch,var(--ink, #2a2620) 12%,transparent)}
        .pw-toast-napaka .pw-toast-txt{color:var(--ink, #2a2620)}
        .pw-toast-napaka .pw-toast-x{color:color-mix(in oklch,var(--ink, #2a2620) 45%,transparent)}
        .pw-toast-napaka .pw-toast-pika{display:none}
        .pw-toast-txt{font:600 .82rem var(--font-sans),system-ui,sans-serif;color:var(--ink, #2a2620);line-height:1.4}
        .pw-toast-txt-dvojni{display:flex;flex-direction:column;gap:.1rem;min-width:0}
        .pw-toast-naslov{font-weight:800;font-size:.86rem}
        .pw-toast-txt-dvojni>span{font-weight:600;opacity:.82}
        .pw-toast-dejanja{flex:none;display:inline-flex;align-items:center;gap:.4rem;margin-left:.2rem}
        .pw-toast-dejanja button{min-height:2rem;padding:.3rem .7rem;border-radius:999px;font:700 .74rem var(--font-sans),system-ui,sans-serif;white-space:nowrap;cursor:pointer}
        .pw-toast-dejanja button:first-child{border:0;background:var(--ink, #2a2620);color:#fff}
        .pw-toast-dejanja button:first-child:hover{opacity:.88}
        .pw-toast-dejanja button+button{border:1px solid color-mix(in oklch,var(--ink, #2a2620) 18%,transparent);background:#fff;color:var(--ink, #2a2620)}
        @media (max-width:640px){.pw-toast{flex-wrap:wrap}.pw-toast-dejanja{flex-basis:100%;margin-left:0}}
        .pw-toast-x{flex:none;border:0;background:none;color:color-mix(in oklch,var(--ink, #2a2620) 45%,transparent);font-size:1.05rem;line-height:1;cursor:pointer;padding:0 .1rem;margin-left:.1rem}
        .pw-toast-x:hover{color:var(--ink, #2a2620)}
        @keyframes pwToastIn{from{opacity:0;transform:translate(-50%,-120%)}to{opacity:1;transform:translate(-50%,0)}}
        @keyframes pwToastOut{from{opacity:1;transform:translate(-50%,0)}to{opacity:0;transform:translate(-50%,-120%)}}
        @media (max-width:640px){.pw-toast{left:.7rem;right:.7rem;max-width:none;transform:none}
          .pw-toast-vztrajen{top:auto;bottom:calc(.7rem + env(safe-area-inset-bottom));left:.7rem;right:.7rem;max-width:none}
          @keyframes pwToastIn{from{opacity:0;transform:translateY(-120%)}to{opacity:1;transform:translateY(0)}}
          @keyframes pwToastOut{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(-120%)}}}
        @media (prefers-reduced-motion:reduce){.pw-toast,.pw-toast-off{animation-duration:.01ms}}
      `}</style>
    </div>,
    document.body,
  );
}

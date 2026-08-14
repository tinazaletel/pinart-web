'use client';

/* Preklop pogleda: Pupa dom ⇄ Nadzorna plošča. Isti gumb na obeh straneh.
   »Pupa dom« je odklenjen LE, če imaš Pupo v paketu (imaPupo); sicer klik
   pokaže alert za nadgradnjo paketa. Navadni <a> (styled-jsx scopa native
   elemente; Link se ne bi scopal). */

import { useState } from 'react';

export default function PogledPreklop({
  base = '',
  aktiven,
  jeEn = false,
  imaPupo = true,
}: {
  base?: string;
  aktiven: 'dom' | 'plosca' | 'none';
  jeEn?: boolean;
  imaPupo?: boolean;
}) {
  const L = (sl: string, en: string) => (jeEn ? en : sl);
  const [opozorilo, setOpozorilo] = useState(false);
  const domZaklenjen = !imaPupo && aktiven !== 'dom';

  /* dvojna zvezdica = ustaljena AI ikona (ista kot AI izbirnik v PupaDom) */
  const iskraSvg = <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 2l1.7 5.3L19 9l-5.3 1.7L12 16l-1.7-5.3L5 9l5.3-1.7L12 2z" /><path d="M18.5 13l.9 2.6L22 16.5l-2.6.9-.9 2.6-.9-2.6L15 16.5l2.6-.9.9-2.6z" opacity=".65" /></svg>;

  return (
    <div className="pp" role="group" aria-label={L('Preklop pogleda', 'Switch view')}>
      {domZaklenjen ? (
        <button type="button" className="pp-g pp-lock" onClick={() => setOpozorilo(o => !o)} aria-haspopup="dialog" aria-expanded={opozorilo}>
          {iskraSvg}<span className="pp-txt">Pupa</span>
          <svg className="pp-lockico" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
        </button>
      ) : (
        <a href={`${base}/kalkulator/dom`} className={'pp-g' + (aktiven === 'dom' ? ' on' : '')} aria-current={aktiven === 'dom' ? 'page' : undefined}>
          {iskraSvg}<span className="pp-txt">Pupa</span>
        </a>
      )}
      <a href={`${base}/kalkulator/pregled`} className={'pp-g' + (aktiven === 'plosca' ? ' on' : '')} aria-current={aktiven === 'plosca' ? 'page' : undefined}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
        <span className="pp-txt">Home</span>
      </a>

      {opozorilo && (
        <div className="pp-alert" role="alertdialog" aria-label={L('Nadgradnja', 'Upgrade')}>
          <p>{L('Pupa dom je pogovorni vmesnik s Pupo — na voljo v paketu s Pupo.', 'Pupa home is the conversational interface — available in a plan with Pupa.')}</p>
          <div className="pp-alert-akc">
            <a href={`${base}/kalkulator/paket`} className="pp-nadg">{L('Nadgradi paket', 'Upgrade plan')}</a>
            <button type="button" className="pp-zapri" onClick={() => setOpozorilo(false)}>{L('Zapri', 'Close')}</button>
          </div>
        </div>
      )}

      <style jsx>{`
        /* brez zunanje sence: scroll vsebnik menija (.nav overflow-y:auto) bi jo rezal — steklo + obroba + vijola aktivni zadošča */
        .pp { position: relative; display: inline-flex; align-items: center; gap: .2rem; padding: .22rem; border-radius: 999px; background: rgba(255,255,255,.6); backdrop-filter: blur(14px) saturate(1.3); -webkit-backdrop-filter: blur(14px) saturate(1.3); border: 1px solid color-mix(in oklch, var(--ink, #1a1a1a) 8%, transparent); }
        .pp-g { display: inline-flex; align-items: center; gap: .38rem; padding: .42rem .8rem; border-radius: 999px; font: 600 .8rem var(--font-sans), sans-serif; color: color-mix(in oklch, var(--ink, #1a1a1a) 62%, transparent); text-decoration: none; white-space: nowrap; border: 0; background: transparent; cursor: pointer; transition: background .16s ease, color .16s ease; }
        .pp-g:hover { color: var(--ink, #1a1a1a); }
        .pp-g.on { background: var(--purple, oklch(58% .2 297)); color: #fff; }
        .pp-lock { color: color-mix(in oklch, var(--ink, #1a1a1a) 45%, transparent); }
        .pp-g svg { flex: none; }
        .pp-alert { position: absolute; top: calc(100% + .5rem); right: 0; z-index: 60; width: min(20rem, 80vw); padding: .85rem .9rem; border-radius: .9rem; background: #fff; border: 1px solid color-mix(in oklch, var(--ink, #1a1a1a) 10%, transparent); box-shadow: 0 18px 44px oklch(40% .08 300 / .2); animation: ppIn .18s ease both; }
        .pp-alert p { margin: 0 0 .6rem; font: 500 .82rem/1.45 var(--font-sans), sans-serif; color: var(--ink, #1a1a1a); }
        .pp-alert-akc { display: flex; align-items: center; gap: .5rem; }
        .pp-nadg { display: inline-flex; padding: .45rem .8rem; border-radius: 999px; background: var(--purple, oklch(58% .2 297)); color: #fff; font: 700 .78rem var(--font-sans), sans-serif; text-decoration: none; }
        .pp-zapri { border: 0; background: transparent; color: color-mix(in oklch, var(--ink, #1a1a1a) 55%, transparent); font: 600 .78rem var(--font-sans), sans-serif; cursor: pointer; }
        @keyframes ppIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
        /* Zaprt meni (ozek pas 4.4rem): preklop = dve ikoni druga pod drugo, brez besedila */
        :global(body[data-meni='zaprt']) .pp { flex-direction: column; gap: .1rem; padding: 0; margin: 0; background: transparent; border: 0; box-shadow: none; }
        :global(body[data-meni='zaprt']) .pp-txt, :global(body[data-meni='zaprt']) .pp-lockico { display: none; }
        :global(body[data-meni='zaprt']) .pp-g { width: 2.2rem; height: 2.2rem; padding: 0; gap: 0; justify-content: center; border-radius: .7rem; }
        :global(body[data-meni='zaprt']) .pp-alert { left: calc(100% + .5rem); right: auto; top: 0; }
        @media (max-width: 560px) { .pp-g { padding: .42rem .6rem; font-size: .74rem; } }
      `}</style>
    </div>
  );
}

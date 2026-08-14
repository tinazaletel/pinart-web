'use client';

/* PUPA DOM — pogovorni začetni zaslon (Faza 1). NOVA stran (/kalkulator/dom);
   obstoječe ostanejo nedotaknjene. Živ videz: aurora ozadje + Pupa orb + mehki
   glass mehurčki. Kartice-v-pogovoru + prava Pupa (glas, kontekst) = Faza 2.
   Glej memory: project_pupa_prvi_vmesnik, project_flow_glass_aurora. */

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { lokalniOdgovori } from '@/lib/onboarding';

export default function PupaDom({ base = '' }: { base?: string }) {
  const jeEn = base === '/en';
  const L = (sl: string, en: string) => (jeEn ? en : sl);
  const [ime, setIme] = useState('');
  const [vnos, setVnos] = useState('');

  useEffect(() => {
    try { setIme((lokalniOdgovori().ime || '').trim()); } catch { /* ignore */ }
  }, []);

  const pozdrav = ime
    ? L(`Hej, ${ime}. Kaj želiš danes urediti?`, `Hi, ${ime}. What would you like to do today?`)
    : L('Hej. Kaj želiš danes urediti?', 'Hi. What would you like to do today?');

  /* hitre izbire vodijo v OBSTOJEČA orodja; vsaka nosi mehko barvo (kot mehurčki) */
  const hitre: { ime: string; opis: string; href: string; h: number }[] = [
    { ime: L('Pripravi ponudbo', 'Create a quote'), opis: L('cena, obseg, pravice', 'price, scope, rights'), href: `${base}/kalkulator/orodje`, h: 297 },
    { ime: L('Izdaj račun', 'Issue an invoice'), opis: L('iz ponudbe ali na novo', 'from a quote or new'), href: `${base}/kalkulator/racuni`, h: 200 },
    { ime: L('Dodaj strošek', 'Add an expense'), opis: L('vodi v donosnost', 'feeds profitability'), href: `${base}/kalkulator/stroski`, h: 60 },
    { ime: L('Preglej poslovanje', 'Review the business'), opis: L('številke, cilji, stanje', 'numbers, goals, status'), href: `${base}/kalkulator/pregled`, h: 160 },
    { ime: L('Kaj moram danes?', 'What do I need today?'), opis: L('naloge in roki', 'tasks and deadlines'), href: `${base}/kalkulator/naloge`, h: 25 },
  ];

  const posljiVnos = () => {
    const t = vnos.trim();
    if (typeof window === 'undefined') return;
    window.location.href = `${base}/kalkulator/orodje${t ? `?uvod=1&namig=${encodeURIComponent(t)}` : ''}`;
  };

  return (
    <div className="pd">
      <div className="pd-aurora" aria-hidden>
        <i className="a1" /><i className="a2" /><i className="a3" />
      </div>

      <div className="pd-vsebina">
        <div className="pd-glava">
          <span className="pd-orb" aria-hidden />
          <div>
            <p className="pd-eyebrow">PUPA</p>
            <h1 className="pd-naslov">{pozdrav}</h1>
          </div>
        </div>
        <p className="pd-uvod">{L('Povej, kaj želiš ustvariti — Pupa uredi poslovni del. Ali izberi hitro akcijo spodaj.', 'Tell me what you want to create — Pupa handles the business part. Or pick a quick action below.')}</p>

        <div className="pd-vnos">
          <textarea
            value={vnos}
            onChange={e => setVnos(e.target.value)}
            onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); posljiVnos(); } }}
            placeholder={L('npr. »Pripravi ponudbo za novo spletno stran za Marand, rok konec septembra«', 'e.g. “Prepare a quote for a new website for Marand, deadline end of September”')}
            rows={2}
            aria-label={L('Napiši, kaj želiš', 'Write what you want')}
          />
          <div className="pd-vnos-akc">
            <button type="button" className="pd-mik" title={L('Glas (kmalu)', 'Voice (soon)')} aria-label={L('Glas', 'Voice')} disabled>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" /><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4" /></svg>
            </button>
            <button type="button" className="pd-poslji" onClick={posljiVnos}>
              {L('Začni', 'Start')} <span aria-hidden>→</span>
            </button>
          </div>
        </div>

        <div className="pd-hitre">
          {hitre.map(h => (
            <Link key={h.href + h.ime} href={h.href} className="pd-cip" style={{ ['--h' as string]: String(h.h) }}>
              <span className="pd-cip-pika" aria-hidden />
              <b>{h.ime}</b>
              <small>{h.opis}</small>
            </Link>
          ))}
        </div>

        <p className="pd-opomba">{L('Nova, pogovorna izkušnja (v gradnji). Vsa obstoječa orodja ostanejo na voljo v meniju levo.', 'A new, conversational experience (in progress). All existing tools remain available in the left menu.')}</p>
      </div>

      <style jsx>{`
        .pd { position: relative; min-height: calc(100dvh - 3rem); overflow: hidden; }
        .pd-aurora { position: absolute; inset: 0; z-index: 0; pointer-events: none; filter: blur(60px); opacity: .55; }
        .pd-aurora i { position: absolute; display: block; border-radius: 50%; }
        .pd-aurora .a1 { width: 42vw; height: 42vw; top: -8vw; left: -6vw; background: radial-gradient(circle, oklch(72% .16 300 / .85), transparent 68%); animation: pdFloat 22s ease-in-out infinite; }
        .pd-aurora .a2 { width: 38vw; height: 38vw; top: 22vw; right: -8vw; background: radial-gradient(circle, oklch(78% .13 200 / .8), transparent 68%); animation: pdFloat 26s ease-in-out infinite reverse; }
        .pd-aurora .a3 { width: 34vw; height: 34vw; bottom: -10vw; left: 24vw; background: radial-gradient(circle, oklch(80% .12 150 / .75), transparent 68%); animation: pdFloat 30s ease-in-out infinite; }
        @keyframes pdFloat { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(2vw,-2vw) scale(1.06); } }

        .pd-vsebina { position: relative; z-index: 1; max-width: 58rem; margin: 0 auto; padding: clamp(1.4rem, 5vw, 3.2rem) clamp(.9rem, 4vw, 1.6rem) 4rem; }
        .pd-glava { display: flex; align-items: center; gap: .85rem; margin-bottom: .5rem; }
        .pd-orb { flex: none; width: 2.9rem; height: 2.9rem; border-radius: 50%; background: conic-gradient(from 210deg, oklch(70% .19 300), oklch(72% .16 200), oklch(80% .13 150), oklch(78% .17 25), oklch(70% .19 300)); box-shadow: 0 6px 20px oklch(60% .18 300 / .35), inset -3px -4px 8px oklch(100% 0 0 / .35), inset 3px 4px 8px oklch(30% .1 300 / .25); animation: pdOrb 8s ease-in-out infinite; }
        @keyframes pdOrb { 0%,100% { transform: translateY(0) rotate(0); } 50% { transform: translateY(-3px) rotate(8deg); } }
        .pd-eyebrow { margin: 0 0 .15rem; font: 800 .62rem var(--font-sans), sans-serif; letter-spacing: .18em; color: var(--purple, oklch(60% .2 297)); }
        .pd-naslov { margin: 0; font: 500 clamp(1.7rem, 4.6vw, 2.7rem)/1.08 var(--font-serif), Georgia, serif; font-synthesis: none; color: var(--ink, #1a1a1a); letter-spacing: -.01em; }
        .pd-uvod { margin: .1rem 0 1.5rem; font: 500 1.02rem/1.55 var(--font-sans), sans-serif; color: color-mix(in oklch, var(--ink, #1a1a1a) 62%, transparent); max-width: 38rem; }

        .pd-vnos { display: flex; flex-direction: column; gap: .5rem; background: rgba(255,255,255,.62); backdrop-filter: blur(16px) saturate(1.3); -webkit-backdrop-filter: blur(16px) saturate(1.3); border: 1px solid rgba(255,255,255,.7); border-radius: 1.15rem; padding: .9rem 1rem; box-shadow: 0 14px 44px oklch(40% .08 300 / .12); }
        .pd-vnos textarea { width: 100%; box-sizing: border-box; border: 0; outline: none; resize: none; background: transparent; font: 500 1rem/1.5 var(--font-sans), sans-serif; color: var(--ink, #1a1a1a); }
        .pd-vnos textarea::placeholder { color: color-mix(in oklch, var(--ink, #1a1a1a) 42%, transparent); }
        .pd-vnos-akc { display: flex; align-items: center; justify-content: flex-end; gap: .5rem; }
        .pd-mik { display: grid; place-items: center; width: 2.4rem; height: 2.4rem; border: 1px solid color-mix(in oklch, var(--ink, #1a1a1a) 12%, transparent); border-radius: 50%; background: #fff; color: color-mix(in oklch, var(--ink, #1a1a1a) 55%, transparent); cursor: not-allowed; opacity: .8; }
        .pd-poslji { display: inline-flex; align-items: center; gap: .45rem; border: 0; border-radius: 999px; padding: .65rem 1.3rem; background: var(--ink, #2a2620); color: var(--paper, #faf7f2); font: 700 .85rem var(--font-sans), sans-serif; cursor: pointer; transition: transform .15s ease, background .15s ease; }
        .pd-poslji:hover { transform: translateY(-1px); }

        .pd-hitre { display: grid; grid-template-columns: repeat(auto-fill, minmax(13.5rem, 1fr)); gap: .65rem; margin: 1.3rem 0 1.5rem; }
        .pd-cip { position: relative; display: flex; flex-direction: column; gap: .2rem; padding: .9rem 1rem .9rem 1.15rem; border: 1px solid rgba(255,255,255,.6); border-radius: 1rem; background: color-mix(in oklch, oklch(72% .14 var(--h)) 12%, rgba(255,255,255,.62)); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); text-decoration: none; transition: transform .16s ease, box-shadow .16s ease, background .16s ease; }
        .pd-cip:hover { transform: translateY(-2px); box-shadow: 0 12px 28px oklch(50% .1 var(--h) / .18); background: color-mix(in oklch, oklch(72% .14 var(--h)) 20%, rgba(255,255,255,.7)); }
        .pd-cip-pika { position: absolute; top: 1rem; right: 1rem; width: .55rem; height: .55rem; border-radius: 50%; background: oklch(65% .19 var(--h)); box-shadow: 0 0 0 4px oklch(65% .19 var(--h) / .18); }
        .pd-cip b { font: 700 .92rem var(--font-sans), sans-serif; color: var(--ink, #1a1a1a); }
        .pd-cip small { font: 500 .74rem var(--font-sans), sans-serif; color: color-mix(in oklch, var(--ink, #1a1a1a) 58%, transparent); }
        .pd-opomma, .pd-opomba { margin: 0; font: 500 .74rem var(--font-sans), sans-serif; color: color-mix(in oklch, var(--ink, #1a1a1a) 45%, transparent); }

        @media (max-width: 640px) { .pd-orb { width: 2.4rem; height: 2.4rem; } }
      `}</style>
    </div>
  );
}

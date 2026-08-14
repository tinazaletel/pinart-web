'use client';

/* PUPA DOM — pogovorni dom (Faza 1). Chat v OSPREDJU (sredina), podatki nadzorne
   plošče PLAVAJO okoli (ambient, glass), aurora v ozadju. »Moderno in sveže«.
   NOVA stran (/kalkulator/dom); obstoječe ostanejo nedotaknjene.
   Plavajoče številke so za zdaj PREDSTAVITVENE (koncept postavitve) — prava
   podatkovna povezava pride v naslednjem koraku. Kartice-v-pogovoru + glas = Faza 2.
   Glej memory: project_pupa_prvi_vmesnik, project_pupa_center_layout_ideja, project_flow_glass_aurora. */

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { lokalniOdgovori } from '@/lib/onboarding';

export default function PupaDom({ base = '' }: { base?: string }) {
  const jeEn = base === '/en';
  const L = (sl: string, en: string) => (jeEn ? en : sl);
  const [ime, setIme] = useState('');
  const [vnos, setVnos] = useState('');
  const [priponka, setPriponka] = useState<File | null>(null);
  const datotekaRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try { setIme((lokalniOdgovori().ime || '').trim()); } catch { /* ignore */ }
  }, []);

  const pozdrav = ime
    ? L(`Hej, ${ime}. Kaj želiš danes?`, `Hi, ${ime}. What's on today?`)
    : L('Hej. Kaj želiš danes?', "Hi. What's on today?");

  const posljiVnos = () => {
    const t = vnos.trim();
    if (typeof window === 'undefined') return;
    window.location.href = `${base}/kalkulator/orodje${t ? `?uvod=1&namig=${encodeURIComponent(t)}` : ''}`;
  };

  /* PLAVAJOČE kartice (ambient) — podatki, kot jih imamo na nadzorni plošči.
     poz = položaj okoli sredine (desktop); h = odtenek; d = zamik animacije. */
  const plava: { labela: string; vrednost: string; h: number; poz: string; d: number }[] = [
    { labela: L('Prihodek ta mesec', 'Revenue this month'), vrednost: '4.850 €', h: 150, poz: 'top:8%;left:3%', d: 0 },
    { labela: L('Aktivni projekti', 'Active projects'), vrednost: '3', h: 200, poz: 'top:30%;left:7%', d: 1.4 },
    { labela: L('Za plačilo', 'Awaiting payment'), vrednost: '1.350 €', h: 25, poz: 'bottom:12%;left:5%', d: 2.6 },
    { labela: L('Naloge danes', 'Tasks today'), vrednost: '4', h: 297, poz: 'top:10%;right:4%', d: .7 },
    { labela: L('Mesečni cilj', 'Monthly goal'), vrednost: '68 %', h: 60, poz: 'top:34%;right:8%', d: 2 },
    { labela: L('Nova sporočila', 'New messages'), vrednost: '2', h: 320, poz: 'bottom:14%;right:5%', d: 3.2 },
  ];

  /* hitre akcije v OBSTOJEČA orodja (kompaktno pod vnosom) */
  const hitre: { ime: string; href: string; h: number }[] = [
    { ime: L('Ponudba', 'Quote'), href: `${base}/kalkulator/orodje`, h: 297 },
    { ime: L('Račun', 'Invoice'), href: `${base}/kalkulator/racuni`, h: 200 },
    { ime: L('Strošek', 'Expense'), href: `${base}/kalkulator/stroski`, h: 60 },
    { ime: L('Pregled', 'Overview'), href: `${base}/kalkulator/pregled`, h: 150 },
    { ime: L('Naloge', 'Tasks'), href: `${base}/kalkulator/naloge`, h: 25 },
  ];

  return (
    <div className="pd">
      <div className="pd-aurora" aria-hidden><i className="a1" /><i className="a2" /><i className="a3" /></div>

      {/* PLAVAJOČE podatkovne kartice (desktop) */}
      <div className="pd-plava" aria-hidden>
        {plava.map((p, i) => (
          <div key={i} className="pd-kartica" style={{ ['--h' as string]: String(p.h), animationDelay: `${p.d}s`, ...pozStyle(p.poz) }}>
            <span className="pd-k-pika" />
            <b>{p.vrednost}</b>
            <small>{p.labela}</small>
          </div>
        ))}
      </div>

      {/* CHAT v OSPREDJU */}
      <div className="pd-center">
        <div className="pd-glava">
          <span className="pd-orb" aria-hidden />
          <div>
            <p className="pd-eyebrow">PUPA</p>
            <h1 className="pd-naslov">{pozdrav}</h1>
          </div>
        </div>
        <p className="pd-uvod">{L('Povej, kaj želiš ustvariti — Pupa uredi poslovni del.', 'Tell me what you want to create — Pupa handles the business part.')}</p>

        <div className="pd-vnos">
          {priponka && (
            <div className="pd-priponka">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21.44 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3.5 3.5 0 0 1 4.95 4.95l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
              <span>{priponka.name}</span>
              <button type="button" className="pd-priponka-x" onClick={() => { setPriponka(null); if (datotekaRef.current) datotekaRef.current.value = ''; }} aria-label={L('Odstrani prilogo', 'Remove attachment')}>×</button>
            </div>
          )}
          <input ref={datotekaRef} type="file" hidden onChange={e => setPriponka(e.target.files?.[0] ?? null)} />
          <textarea
            value={vnos}
            onChange={e => setVnos(e.target.value)}
            onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); posljiVnos(); } }}
            placeholder={L('npr. »Pripravi ponudbo za spletno stran za Marand, rok konec septembra«', 'e.g. “Prepare a quote for a website for Marand, deadline end of September”')}
            rows={2}
            aria-label={L('Napiši, kaj želiš', 'Write what you want')}
          />
          <div className="pd-vnos-akc">
            <button type="button" className="pd-add" onClick={() => datotekaRef.current?.click()} title={L('Naloži prilogo za pogovor', 'Upload an attachment to discuss')} aria-label={L('Dodaj prilogo', 'Add attachment')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
            </button>
            <div className="pd-vnos-desno">
              <button type="button" className="pd-mik" title={L('Glas (kmalu)', 'Voice (soon)')} aria-label={L('Glas', 'Voice')} disabled>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" /><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4" /></svg>
              </button>
              <button type="button" className="pd-poslji" onClick={posljiVnos}>{L('Začni', 'Start')} <span aria-hidden>→</span></button>
            </div>
          </div>
        </div>

        <div className="pd-hitre">
          {hitre.map(h => (
            <Link key={h.href} href={h.href} className="pd-cip" style={{ ['--h' as string]: String(h.h) }}>{h.ime}</Link>
          ))}
        </div>
        <p className="pd-opomba">{L('Pogovorni dom (v gradnji). Podatki okoli so predstavitveni; vsa orodja so v meniju levo.', 'Conversational home (in progress). Surrounding figures are illustrative; all tools are in the left menu.')}</p>
      </div>

      <style jsx>{`
        .pd { position: relative; min-height: calc(100dvh - 3rem); overflow: hidden; display: grid; place-items: center; }
        /* EDINO ozadje: fiksno čez cel zaslon (ne panel-v-panelu) */
        .pd-aurora { position: fixed; inset: 0; z-index: 0; pointer-events: none; filter: blur(70px); opacity: .5; }
        .pd-aurora i { position: absolute; display: block; border-radius: 50%; }
        .pd-aurora .a1 { width: 44vw; height: 44vw; top: -10vw; left: -8vw; background: radial-gradient(circle, oklch(72% .16 300 / .85), transparent 68%); animation: pdFloat 24s ease-in-out infinite; }
        .pd-aurora .a2 { width: 40vw; height: 40vw; top: 20vw; right: -10vw; background: radial-gradient(circle, oklch(78% .13 200 / .8), transparent 68%); animation: pdFloat 28s ease-in-out infinite reverse; }
        .pd-aurora .a3 { width: 36vw; height: 36vw; bottom: -12vw; left: 26vw; background: radial-gradient(circle, oklch(80% .12 150 / .75), transparent 68%); animation: pdFloat 32s ease-in-out infinite; }
        @keyframes pdFloat { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(2vw,-2vw) scale(1.06); } }

        .pd-plava { position: absolute; inset: 0; z-index: 1; pointer-events: none; display: none; }
        .pd-kartica { position: absolute; display: flex; flex-direction: column; gap: .1rem; min-width: 8.5rem; padding: .75rem .95rem; border: 1px solid rgba(255,255,255,.6); border-radius: .95rem; background: color-mix(in oklch, oklch(72% .13 var(--h)) 10%, rgba(255,255,255,.55)); backdrop-filter: blur(14px) saturate(1.2); -webkit-backdrop-filter: blur(14px) saturate(1.2); box-shadow: 0 12px 34px oklch(50% .1 var(--h) / .14); animation: pdBob 9s ease-in-out infinite; }
        .pd-k-pika { position: absolute; top: .8rem; right: .8rem; width: .5rem; height: .5rem; border-radius: 50%; background: oklch(65% .19 var(--h)); box-shadow: 0 0 0 4px oklch(65% .19 var(--h) / .18); }
        .pd-kartica b { font: 700 1.15rem var(--font-sans), sans-serif; color: var(--ink, #1a1a1a); }
        .pd-kartica small { font: 600 .66rem var(--font-sans), sans-serif; letter-spacing: .02em; color: color-mix(in oklch, var(--ink, #1a1a1a) 55%, transparent); }
        @keyframes pdBob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-9px); } }

        .pd-center { position: relative; z-index: 2; width: min(34rem, 92vw); padding: clamp(1.2rem, 4vw, 2rem); text-align: left; }
        .pd-glava { display: flex; align-items: center; gap: .8rem; margin-bottom: .4rem; }
        .pd-orb { flex: none; width: 3rem; height: 3rem; border-radius: 50%; background: conic-gradient(from 210deg, oklch(70% .19 300), oklch(72% .16 200), oklch(80% .13 150), oklch(78% .17 25), oklch(70% .19 300)); box-shadow: 0 8px 22px oklch(60% .18 300 / .38), inset -3px -4px 8px oklch(100% 0 0 / .35), inset 3px 4px 8px oklch(30% .1 300 / .25); animation: pdOrb 8s ease-in-out infinite; }
        @keyframes pdOrb { 0%,100% { transform: translateY(0) rotate(0); } 50% { transform: translateY(-3px) rotate(8deg); } }
        .pd-eyebrow { margin: 0 0 .15rem; font: 800 .62rem var(--font-sans), sans-serif; letter-spacing: .18em; color: var(--purple, oklch(60% .2 297)); }
        .pd-naslov { margin: 0; font: 500 clamp(1.6rem, 4.2vw, 2.4rem)/1.08 var(--font-serif), Georgia, serif; font-synthesis: none; color: var(--ink, #1a1a1a); letter-spacing: -.01em; }
        .pd-uvod { margin: .15rem 0 1.1rem; font: 500 .98rem/1.5 var(--font-sans), sans-serif; color: color-mix(in oklch, var(--ink, #1a1a1a) 60%, transparent); }

        .pd-vnos { display: flex; flex-direction: column; gap: .5rem; background: rgba(255,255,255,.66); backdrop-filter: blur(18px) saturate(1.35); -webkit-backdrop-filter: blur(18px) saturate(1.35); border: 1px solid rgba(255,255,255,.75); border-radius: 1.2rem; padding: .95rem 1rem; box-shadow: 0 18px 50px oklch(40% .08 300 / .16); }
        .pd-vnos textarea { width: 100%; box-sizing: border-box; border: 0; outline: none; resize: none; background: transparent; font: 500 1rem/1.5 var(--font-sans), sans-serif; color: var(--ink, #1a1a1a); }
        .pd-vnos textarea::placeholder { color: color-mix(in oklch, var(--ink, #1a1a1a) 42%, transparent); }
        .pd-vnos-akc { display: flex; align-items: center; justify-content: space-between; gap: .5rem; }
        .pd-vnos-desno { display: flex; align-items: center; gap: .5rem; }
        .pd-add { display: grid; place-items: center; width: 2.4rem; height: 2.4rem; border: 1px solid color-mix(in oklch, var(--ink, #1a1a1a) 12%, transparent); border-radius: 50%; background: #fff; color: color-mix(in oklch, var(--ink, #1a1a1a) 62%, transparent); cursor: pointer; transition: background .15s ease, color .15s ease, transform .15s ease; }
        .pd-add:hover { background: var(--ink, #2a2620); color: var(--paper, #faf7f2); transform: translateY(-1px); }
        .pd-priponka { display: inline-flex; align-items: center; gap: .4rem; align-self: flex-start; max-width: 100%; padding: .35rem .5rem .35rem .65rem; border: 1px solid color-mix(in oklch, var(--purple, oklch(66% .2 297)) 30%, transparent); border-radius: 999px; background: color-mix(in oklch, var(--purple, oklch(66% .2 297)) 8%, #fff); font: 600 .74rem var(--font-sans), sans-serif; color: var(--ink, #1a1a1a); }
        .pd-priponka span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 16rem; }
        .pd-priponka-x { display: grid; place-items: center; width: 1.15rem; height: 1.15rem; border: 0; border-radius: 50%; background: color-mix(in oklch, var(--ink, #1a1a1a) 10%, transparent); color: var(--ink, #1a1a1a); font-size: .8rem; line-height: 1; cursor: pointer; }
        .pd-mik { display: grid; place-items: center; width: 2.4rem; height: 2.4rem; border: 1px solid color-mix(in oklch, var(--ink, #1a1a1a) 12%, transparent); border-radius: 50%; background: #fff; color: color-mix(in oklch, var(--ink, #1a1a1a) 55%, transparent); cursor: not-allowed; opacity: .8; }
        .pd-poslji { display: inline-flex; align-items: center; gap: .45rem; border: 0; border-radius: 999px; padding: .65rem 1.35rem; background: var(--ink, #2a2620); color: var(--paper, #faf7f2); font: 700 .85rem var(--font-sans), sans-serif; cursor: pointer; transition: transform .15s ease; }
        .pd-poslji:hover { transform: translateY(-1px); }

        .pd-hitre { display: flex; flex-wrap: wrap; gap: .45rem; margin: 1rem 0 .9rem; }
        .pd-cip { padding: .45rem .9rem; border: 1px solid rgba(255,255,255,.6); border-radius: 999px; background: color-mix(in oklch, oklch(72% .14 var(--h)) 14%, rgba(255,255,255,.6)); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); font: 700 .78rem var(--font-sans), sans-serif; color: var(--ink, #1a1a1a); text-decoration: none; transition: transform .15s ease, box-shadow .15s ease; }
        .pd-cip:hover { transform: translateY(-1px); box-shadow: 0 8px 20px oklch(55% .12 var(--h) / .2); }
        .pd-opomba { margin: 0; font: 500 .72rem var(--font-sans), sans-serif; color: color-mix(in oklch, var(--ink, #1a1a1a) 45%, transparent); }

        /* plavajoče kartice le na širših zaslonih (na telefonu bi bile v napoto) */
        @media (min-width: 1024px) { .pd-plava { display: block; } }
      `}</style>
    </div>
  );
}

/* razčleni "top:8%;left:3%" v React style objekt */
function pozStyle(poz: string): React.CSSProperties {
  const s: React.CSSProperties = {};
  for (const del of poz.split(';')) {
    const [k, v] = del.split(':');
    if (k && v) (s as Record<string, string>)[k.trim()] = v.trim();
  }
  return s;
}

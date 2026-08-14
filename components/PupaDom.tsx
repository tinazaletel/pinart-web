'use client';

/* PUPA DOM — pogovorni dom (Faza 1). Chat v OSPREDJU (sredina), podatki nadzorne
   plošče PLAVAJO okoli (ambient, glass), aurora v ozadju. »Moderno in sveže«.
   NOVA stran (/kalkulator/dom); obstoječe ostanejo nedotaknjene.
   Plavajoče številke so za zdaj PREDSTAVITVENE (koncept postavitve) — prava
   podatkovna povezava pride v naslednjem koraku. Kartice-v-pogovoru + glas = Faza 2.
   Glej memory: project_pupa_prvi_vmesnik, project_pupa_center_layout_ideja, project_flow_glass_aurora. */

import { useEffect, useRef, useState } from 'react';
import { lokalniOdgovori } from '@/lib/onboarding';

export default function PupaDom({ base = '' }: { base?: string }) {
  const jeEn = base === '/en';
  const L = (sl: string, en: string) => (jeEn ? en : sl);
  const [ime, setIme] = useState('');
  const [vnos, setVnos] = useState('');
  const [priponka, setPriponka] = useState<File | null>(null);
  const datotekaRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const predlagaj = (t: string) => { setVnos(t); const el = textRef.current; if (el) { el.focus(); el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 220)}px`; } };

  /* AI način (ChatGPT spec): Pupa AI / Moj AI / Brez AI. Vidno ob vnosu, shranjeno.
     Za zdaj selektor izbere + zapomni način; prava Pupa/Moj AI pogovor = Faza 2/3. */
  const [aiNacin, setAiNacin] = useState<'pupa' | 'moj' | 'brez'>('pupa');
  const [aiOdprt, setAiOdprt] = useState(false);
  useEffect(() => {
    try { const v = localStorage.getItem('pinart-ai-nacin'); if (v === 'pupa' || v === 'moj' || v === 'brez') setAiNacin(v); } catch { /* ignore */ }
  }, []);
  const izberiAi = (n: 'pupa' | 'moj' | 'brez') => { setAiNacin(n); setAiOdprt(false); try { localStorage.setItem('pinart-ai-nacin', n); } catch { /* ignore */ } };
  const aiLabela = aiNacin === 'pupa' ? 'Pupa AI' : aiNacin === 'moj' ? L('Moj AI', 'My AI') : L('Brez AI', 'No AI');
  /* klik zunaj zapre meni (namesto fiksnega ozadja, ki je delalo težave z z-index) */
  const aiRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!aiOdprt) return;
    const zunaj = (e: MouseEvent) => { if (aiRef.current && !aiRef.current.contains(e.target as Node)) setAiOdprt(false); };
    document.addEventListener('mousedown', zunaj);
    return () => document.removeEventListener('mousedown', zunaj);
  }, [aiOdprt]);

  /* Glasovno narekovanje (Web Speech API) — deluje v Chromu; v Safari/Firefox ni
     podprto, zato tam gumb pokaže kratek namig. Besedilo pade v vnosno polje. */
  const [poslusam, setPoslusam] = useState(false);
  const [glasNamig, setGlasNamig] = useState('');
  const recRef = useRef<{ stop: () => void } | null>(null);
  const glas = () => {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const W = window as unknown as { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any };
    const SR = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!SR) { setGlasNamig(L('Glas trenutno deluje v brskalniku Chrome.', 'Voice currently works in Chrome.')); window.setTimeout(() => setGlasNamig(''), 3500); return; }
    if (poslusam && recRef.current) { recRef.current.stop(); return; }
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const rec: any = new SR();
    rec.lang = jeEn ? 'en-US' : 'sl-SI';
    rec.interimResults = true;
    rec.continuous = false;
    const osnova = vnos;
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    rec.onresult = (e: any) => { let t = ''; for (let i = e.resultIndex; i < e.results.length; i++) t += e.results[i][0].transcript; predlagaj((osnova ? `${osnova} ` : '') + t); };
    rec.onend = () => { setPoslusam(false); recRef.current = null; };
    rec.onerror = () => { setPoslusam(false); recRef.current = null; };
    recRef.current = rec; setPoslusam(true); rec.start();
  };

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
  /* klikljive plavajoče kartice (Tina želi VEČ); varni odmiki od robov (nič odrezano) */
  const plava: { labela: string; vrednost: string; h: number; poz: string; d: number; href: string }[] = [
    { labela: L('Prihodek ta mesec', 'Revenue this month'), vrednost: '4.850 €', h: 150, poz: 'top:9%;left:4%', d: 0, href: `${base}/kalkulator/racuni` },
    { labela: L('Aktivni projekti', 'Active projects'), vrednost: '3', h: 200, poz: 'top:35%;left:6%', d: 1.4, href: `${base}/kalkulator/projekti` },
    { labela: L('Za plačilo', 'Awaiting payment'), vrednost: '1.350 €', h: 25, poz: 'bottom:13%;left:5%', d: 2.6, href: `${base}/kalkulator/racuni` },
    { labela: L('Naloge danes', 'Tasks today'), vrednost: '4', h: 297, poz: 'top:9%;right:5%', d: .7, href: `${base}/kalkulator/naloge` },
    { labela: L('Mesečni cilj', 'Monthly goal'), vrednost: '68 %', h: 60, poz: 'top:35%;right:7%', d: 2, href: `${base}/kalkulator/cilji` },
    { labela: L('Nova sporočila', 'New messages'), vrednost: '2', h: 320, poz: 'bottom:13%;right:5%', d: 3.2, href: `${base}/kalkulator/komunikacija` },
  ];

  /* hitre akcije = lahki POGOVORNI predlogi (napolnijo vnos), ne le linki (ChatGPT) */
  const hitre: { ime: string; predlog: string; h: number }[] = [
    { ime: L('Pripravi ponudbo', 'Create a quote'), predlog: L('Pripravi ponudbo za ', 'Create a quote for '), h: 297 },
    { ime: L('Izdaj račun', 'Issue an invoice'), predlog: L('Izdaj račun za ', 'Issue an invoice for '), h: 200 },
    { ime: L('Dodaj strošek', 'Add an expense'), predlog: L('Dodaj strošek: ', 'Add an expense: '), h: 60 },
    { ime: L('Ustvari projekt', 'Start a project'), predlog: L('Ustvari nov projekt za ', 'Start a new project for '), h: 150 },
  ];

  return (
    <div className="pd">
      <div className="pd-aurora" aria-hidden><i className="a1" /><i className="a2" /><i className="a3" /></div>

      {/* PLAVAJOČE podatkovne kartice (desktop) */}
      <div className="pd-plava">
        {plava.map((p, i) => (
          <a key={i} href={p.href} className="pd-kartica" style={{ ['--h' as string]: String(p.h), animationDelay: `${p.d}s`, ...pozStyle(p.poz) }}>
            <span className="pd-k-pika" />
            <b>{p.vrednost}</b>
            <small>{p.labela}</small>
          </a>
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
          <div className="pd-vnos-vrh">
            <div className="pd-ai" ref={aiRef}>
              <button type="button" className="pd-ai-trig" onClick={() => setAiOdprt(o => !o)} aria-expanded={aiOdprt} aria-haspopup="menu">
                <svg className={`pd-ai-ikona pd-ai-${aiNacin}`} width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 2l1.7 5.3L19 9l-5.3 1.7L12 16l-1.7-5.3L5 9l5.3-1.7L12 2z" /><path d="M18.5 13l.9 2.6L22 16.5l-2.6.9-.9 2.6-.9-2.6L15 16.5l2.6-.9.9-2.6z" opacity=".65" /></svg>
                {aiLabela} <span className="pd-ai-chev" aria-hidden>▾</span>
              </button>
              {aiOdprt && (
                <div className="pd-ai-meni" role="menu">
                  <button type="button" role="menuitem" className={aiNacin === 'pupa' ? 'on' : ''} onClick={() => izberiAi('pupa')}><b>Pupa AI</b><small>{L('Vključena v paket — Pinart krije strošek.', 'Included in your plan — Pinart covers the cost.')}</small></button>
                  <button type="button" role="menuitem" className={aiNacin === 'moj' ? 'on' : ''} onClick={() => izberiAi('moj')}><b>{L('Moj AI', 'My AI')}</b><small>{L('Poveži svoj AI prek API ali MCP (kmalu). Morebitno porabo plačaš svojemu ponudniku.', 'Connect your own AI via API or MCP (soon). You pay any usage to your provider.')}</small></button>
                  <button type="button" role="menuitem" className={aiNacin === 'brez' ? 'on' : ''} onClick={() => izberiAi('brez')}><b>{L('Brez AI', 'No AI')}</b><small>{L('Klasični vprašalniki; nič ne gre zunanjemu AI.', 'Classic questionnaires; nothing goes to an external AI.')}</small></button>
                </div>
              )}
            </div>
          </div>
          {priponka && (
            <div className="pd-priponka">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21.44 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3.5 3.5 0 0 1 4.95 4.95l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
              <span>{priponka.name}</span>
              <button type="button" className="pd-priponka-x" onClick={() => { setPriponka(null); if (datotekaRef.current) datotekaRef.current.value = ''; }} aria-label={L('Odstrani prilogo', 'Remove attachment')}>×</button>
            </div>
          )}
          <input ref={datotekaRef} type="file" hidden onChange={e => setPriponka(e.target.files?.[0] ?? null)} />
          <textarea
            ref={textRef}
            value={vnos}
            onChange={e => { setVnos(e.target.value); const el = e.currentTarget; el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 220)}px`; }}
            onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); posljiVnos(); } }}
            placeholder={L('npr. »Pripravi ponudbo za spletno stran za kavarno Luna, rok konec septembra«', 'e.g. “Prepare a quote for a website for Café Luna, deadline end of September”')}
            rows={2}
            aria-label={L('Napiši, kaj želiš', 'Write what you want')}
          />
          <div className="pd-vnos-akc">
            <button type="button" className="pd-add" onClick={() => datotekaRef.current?.click()} title={L('Naloži prilogo za pogovor', 'Upload an attachment to discuss')} aria-label={L('Dodaj prilogo', 'Add attachment')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
            </button>
            <div className="pd-vnos-desno">
              <button type="button" className={`pd-mik${poslusam ? ' posluam' : ''}`} onClick={glas} title={poslusam ? L('Poslušam … klikni za konec', 'Listening … click to stop') : L('Govori', 'Speak')} aria-label={L('Glas', 'Voice')} aria-pressed={poslusam}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" /><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4" /></svg>
              </button>
              <button type="button" className="pd-poslji" onClick={posljiVnos}>{L('Začni', 'Start')} <span aria-hidden>→</span></button>
            </div>
          </div>
          {glasNamig && <p className="pd-glas-namig" role="status">{glasNamig}</p>}
        </div>

        {/* mobilni povzetek: kompromis — na telefonu ena čista vrstica namesto
            plavajočih kartic (te so le na namizju). Isti podatki, klikljivi. */}
        <div className="pd-povzetek">
          {plava.map((p, i) => (
            <a key={i} href={p.href} className="pd-pov-cip" style={{ ['--h' as string]: String(p.h) }}>
              <b>{p.vrednost}</b><span>{p.labela}</span>
            </a>
          ))}
        </div>

        <div className="pd-hitre">
          {hitre.map(h => (
            <button type="button" key={h.ime} className="pd-cip" style={{ ['--h' as string]: String(h.h) }} onClick={() => predlagaj(h.predlog)}>{h.ime}</button>
          ))}
        </div>
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

        /* position+z-index: backdrop-filter naredi .pd-vnos svoj stacking context;
           brez tega dvига čipi (tudi backdrop-filter) prekrijejo AI meni. */
        .pd-vnos { position: relative; z-index: 20; display: flex; flex-direction: column; gap: .5rem; background: rgba(255,255,255,.66); backdrop-filter: blur(18px) saturate(1.35); -webkit-backdrop-filter: blur(18px) saturate(1.35); border: 1px solid rgba(255,255,255,.75); border-radius: 1.2rem; padding: .95rem 1rem; box-shadow: 0 18px 50px oklch(40% .08 300 / .16); }
        .pd-vnos textarea { width: 100%; box-sizing: border-box; border: 0; outline: none; resize: none; background: transparent; font: 500 1rem/1.5 var(--font-sans), sans-serif; color: var(--ink, #1a1a1a); min-height: 3.1rem; max-height: 220px; overflow-y: auto; transition: height .08s ease; }
        .pd-vnos textarea::placeholder { color: color-mix(in oklch, var(--ink, #1a1a1a) 42%, transparent); }
        /* brez grdega oglatega fokus ringa na textarea — obarva se ROB celotnega polja */
        .pd-vnos textarea:focus, .pd-vnos textarea:focus-visible { outline: none; box-shadow: none; }
        .pd-vnos:focus-within { border-color: color-mix(in oklch, var(--purple, oklch(66% .2 297)) 55%, transparent); box-shadow: 0 0 0 3px color-mix(in oklch, var(--purple, oklch(66% .2 297)) 16%, transparent), 0 18px 50px oklch(40% .08 300 / .16); }
        .pd-vnos-akc { display: flex; align-items: center; justify-content: space-between; gap: .5rem; }
        .pd-vnos-desno { display: flex; align-items: center; gap: .5rem; }
        .pd-add { display: grid; place-items: center; width: 2.4rem; height: 2.4rem; border: 1px solid color-mix(in oklch, var(--ink, #1a1a1a) 12%, transparent); border-radius: 50%; background: #fff; color: color-mix(in oklch, var(--ink, #1a1a1a) 62%, transparent); cursor: pointer; transition: background .15s ease, color .15s ease, transform .15s ease; }
        .pd-add:hover { background: var(--ink, #2a2620); color: var(--paper, #faf7f2); transform: translateY(-1px); }
        .pd-priponka { display: inline-flex; align-items: center; gap: .4rem; align-self: flex-start; max-width: 100%; padding: .35rem .5rem .35rem .65rem; border: 1px solid color-mix(in oklch, var(--purple, oklch(66% .2 297)) 30%, transparent); border-radius: 999px; background: color-mix(in oklch, var(--purple, oklch(66% .2 297)) 8%, #fff); font: 600 .74rem var(--font-sans), sans-serif; color: var(--ink, #1a1a1a); }
        .pd-priponka span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 16rem; }
        .pd-priponka-x { display: grid; place-items: center; width: 1.15rem; height: 1.15rem; border: 0; border-radius: 50%; background: color-mix(in oklch, var(--ink, #1a1a1a) 10%, transparent); color: var(--ink, #1a1a1a); font-size: .8rem; line-height: 1; cursor: pointer; }
        .pd-mik { display: grid; place-items: center; width: 2.4rem; height: 2.4rem; border: 1px solid color-mix(in oklch, var(--ink, #1a1a1a) 12%, transparent); border-radius: 50%; background: #fff; color: color-mix(in oklch, var(--ink, #1a1a1a) 62%, transparent); cursor: pointer; transition: background .15s ease, color .15s ease, border-color .15s ease; }
        .pd-mik:hover { border-color: color-mix(in oklch, var(--purple, oklch(66% .2 297)) 40%, transparent); color: var(--purple, oklch(60% .2 297)); }
        .pd-mik.posluam { background: oklch(63% .2 25); border-color: transparent; color: #fff; animation: pdMik 1.1s ease-in-out infinite; }
        @keyframes pdMik { 0%,100% { box-shadow: 0 0 0 0 oklch(63% .2 25 / .5); } 50% { box-shadow: 0 0 0 7px oklch(63% .2 25 / 0); } }
        .pd-glas-namig { margin: .1rem 0 0; font: 500 .74rem var(--font-sans), sans-serif; color: color-mix(in oklch, var(--ink, #1a1a1a) 55%, transparent); }
        .pd-poslji { display: inline-flex; align-items: center; gap: .45rem; border: 0; border-radius: 999px; padding: .65rem 1.35rem; background: var(--ink, #2a2620); color: var(--paper, #faf7f2); font: 700 .85rem var(--font-sans), sans-serif; cursor: pointer; transition: transform .15s ease; }
        .pd-poslji:hover { transform: translateY(-1px); }

        /* AI način selektor (Pupa AI ▾) */
        .pd-vnos-vrh { display: flex; align-items: center; margin-bottom: .1rem; }
        .pd-ai { position: relative; z-index: 40; }
        .pd-ai-trig { display: inline-flex; align-items: center; gap: .35rem; padding: .3rem .65rem .3rem .55rem; border: 1px solid color-mix(in oklch, var(--purple, oklch(66% .2 297)) 32%, transparent); border-radius: 999px; background: color-mix(in oklch, var(--purple, oklch(66% .2 297)) 9%, #fff); color: var(--ink, #1a1a1a); font: 700 .74rem var(--font-sans), sans-serif; cursor: pointer; transition: background .15s ease; }
        .pd-ai-trig:hover { background: color-mix(in oklch, var(--purple, oklch(66% .2 297)) 15%, #fff); }
        .pd-ai-ikona { color: var(--purple, oklch(60% .2 297)); }
        .pd-ai-ikona.pd-ai-brez { color: color-mix(in oklch, var(--ink, #1a1a1a) 45%, transparent); }
        .pd-ai-chev { font-size: .58rem; opacity: .6; }
        .pd-ai-meni { position: absolute; z-index: 6; top: calc(100% + .4rem); left: 0; width: 17rem; max-width: 78vw; padding: .3rem; border: 1px solid color-mix(in oklch, var(--ink, #1a1a1a) 10%, transparent); border-radius: .85rem; background: #fff; box-shadow: 0 16px 42px oklch(30% .05 300 / .2); display: flex; flex-direction: column; gap: .1rem; }
        .pd-ai-meni button { display: flex; flex-direction: column; gap: .05rem; padding: .5rem .6rem; border: 0; border-radius: .55rem; background: none; text-align: left; cursor: pointer; }
        .pd-ai-meni button:hover { background: color-mix(in oklch, var(--purple, oklch(66% .2 297)) 8%, transparent); }
        .pd-ai-meni button.on { background: color-mix(in oklch, var(--purple, oklch(66% .2 297)) 13%, transparent); }
        .pd-ai-meni b { font: 700 .82rem var(--font-sans), sans-serif; color: var(--ink, #1a1a1a); }
        .pd-ai-meni small { font: 500 .7rem var(--font-sans), sans-serif; color: color-mix(in oklch, var(--ink, #1a1a1a) 55%, transparent); }
        /* klikljive plavajoče kartice: container ne blokira sredine, kartice so klik */
        .pd-kartica { pointer-events: auto; text-decoration: none; cursor: pointer; }
        .pd-kartica:hover { box-shadow: 0 18px 44px oklch(50% .1 var(--h) / .24); }
        /* mobilni povzetek (skrit na namizju, kjer plavajo kartice) */
        .pd-povzetek { display: flex; gap: .5rem; margin: .8rem 0 .2rem; overflow-x: auto; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
        .pd-povzetek::-webkit-scrollbar { display: none; }
        .pd-pov-cip { flex: none; display: inline-flex; align-items: baseline; gap: .35rem; padding: .5rem .75rem; border: 1px solid rgba(255,255,255,.6); border-radius: 999px; background: color-mix(in oklch, oklch(72% .14 var(--h)) 12%, rgba(255,255,255,.6)); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); text-decoration: none; white-space: nowrap; }
        .pd-pov-cip b { font: 700 .85rem var(--font-sans), sans-serif; color: var(--ink, #1a1a1a); }
        .pd-pov-cip span { font: 600 .68rem var(--font-sans), sans-serif; color: color-mix(in oklch, var(--ink, #1a1a1a) 55%, transparent); }
        @media (min-width: 1024px) { .pd-povzetek { display: none; } }

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

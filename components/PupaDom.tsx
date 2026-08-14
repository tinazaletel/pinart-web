'use client';

/* PUPA DOM — pogovorni začetni zaslon (Faza 1 nove smeri: pogovor = primarni vmesnik).
   NOVA stran (/kalkulator/dom); NE nadomešča obstoječih — te ostanejo nedotaknjene.
   Za zdaj: »Hej, {ime}. Kaj danes?« + hitre izbire (v obstoječa orodja) + vpisno okno.
   Kartice-v-pogovoru + prava Pupa (glas, kontekst) pridejo v naslednji fazi.
   Glej memory: project_pupa_prvi_vmesnik. */

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

  /* hitre izbire vodijo v OBSTOJEČA orodja (nič se ne podvaja) */
  const hitre: { ime: string; opis: string; href: string }[] = [
    { ime: L('Pripravi ponudbo', 'Create a quote'), opis: L('cena, obseg, pravice', 'price, scope, rights'), href: `${base}/kalkulator/orodje` },
    { ime: L('Izdaj račun', 'Issue an invoice'), opis: L('iz ponudbe ali na novo', 'from a quote or new'), href: `${base}/kalkulator/racuni` },
    { ime: L('Dodaj strošek', 'Add an expense'), opis: L('vodi v donosnost', 'feeds profitability'), href: `${base}/kalkulator/stroski` },
    { ime: L('Preglej poslovanje', 'Review the business'), opis: L('številke, cilji, stanje', 'numbers, goals, status'), href: `${base}/kalkulator/pregled` },
    { ime: L('Kaj moram danes?', 'What do I need today?'), opis: L('naloge in roki', 'tasks and deadlines'), href: `${base}/kalkulator/naloge` },
  ];

  /* Faza 1: vpisno okno vodi v ponudbo z uvodom (Pupa prevzame v naslednji fazi).
     Namerno NE trdim, da »Pupa« že razume prosti tekst — to je scaffold. */
  const posljiVnos = () => {
    const t = vnos.trim();
    if (typeof window === 'undefined') return;
    window.location.href = `${base}/kalkulator/orodje${t ? `?uvod=1&namig=${encodeURIComponent(t)}` : ''}`;
  };

  return (
    <div className="pd">
      <p className="pd-eyebrow">PUPA</p>
      <h1 className="pd-naslov">{pozdrav}</h1>
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
        <button type="button" className="pd-poslji" onClick={posljiVnos} disabled={false}>
          {L('Začni', 'Start')} <span aria-hidden>→</span>
        </button>
      </div>

      <div className="pd-hitre">
        {hitre.map(h => (
          <Link key={h.href + h.ime} href={h.href} className="pd-cip">
            <b>{h.ime}</b>
            <small>{h.opis}</small>
          </Link>
        ))}
      </div>

      <p className="pd-opomba">{L('Nova, pogovorna izkušnja (v gradnji). Vsa obstoječa orodja ostanejo na voljo v meniju levo.', 'A new, conversational experience (in progress). All existing tools remain available in the left menu.')}</p>

      <style jsx>{`
        .pd { max-width: 60rem; margin: 0 auto; padding: clamp(1rem, 4vw, 2.4rem) clamp(.9rem, 4vw, 1.6rem) 4rem; }
        .pd-eyebrow { margin: 0 0 .4rem; font: 800 .62rem var(--font-sans), sans-serif; letter-spacing: .16em; color: var(--purple, oklch(66% .2 297)); }
        .pd-naslov { margin: 0 0 .5rem; font: 800 clamp(1.7rem, 4.5vw, 2.6rem)/1.1 var(--font-serif, Georgia), serif; color: var(--ink, #1a1a1a); letter-spacing: -.01em; }
        .pd-uvod { margin: 0 0 1.4rem; font: 500 1rem/1.55 var(--font-sans), sans-serif; color: color-mix(in oklch, var(--ink, #1a1a1a) 66%, transparent); max-width: 40rem; }
        .pd-vnos { display: flex; gap: .6rem; align-items: stretch; background: #fff; border: 1px solid color-mix(in oklch, var(--ink, #1a1a1a) 12%, transparent); border-radius: 1rem; padding: .7rem .7rem .7rem 1rem; box-shadow: 0 10px 30px oklch(20% .03 55 / .06); }
        .pd-vnos textarea { flex: 1; min-width: 0; border: 0; outline: none; resize: none; background: transparent; font: 500 .95rem/1.5 var(--font-sans), sans-serif; color: var(--ink, #1a1a1a); }
        .pd-poslji { flex: none; align-self: flex-end; display: inline-flex; align-items: center; gap: .4rem; border: 0; border-radius: 999px; padding: .6rem 1.15rem; background: var(--ink, #2a2620); color: var(--paper, #faf7f2); font: 700 .82rem var(--font-sans), sans-serif; cursor: pointer; }
        .pd-poslji:hover { background: color-mix(in oklch, var(--ink, #2a2620) 88%, #000); }
        .pd-hitre { display: grid; grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr)); gap: .6rem; margin: 1.2rem 0 1.4rem; }
        .pd-cip { display: flex; flex-direction: column; gap: .15rem; padding: .8rem .95rem; border: 1px solid color-mix(in oklch, var(--ink, #1a1a1a) 10%, transparent); border-radius: .85rem; background: #fff; text-decoration: none; transition: border-color .15s ease, transform .15s ease, box-shadow .15s ease; }
        .pd-cip:hover { border-color: color-mix(in oklch, var(--purple, oklch(66% .2 297)) 45%, transparent); transform: translateY(-1px); box-shadow: 0 8px 22px oklch(20% .03 55 / .08); }
        .pd-cip b { font: 700 .9rem var(--font-sans), sans-serif; color: var(--ink, #1a1a1a); }
        .pd-cip small { font: 500 .74rem var(--font-sans), sans-serif; color: color-mix(in oklch, var(--ink, #1a1a1a) 55%, transparent); }
        .pd-opomba { margin: 0; font: 500 .74rem var(--font-sans), sans-serif; color: color-mix(in oklch, var(--ink, #1a1a1a) 45%, transparent); }
        @media (max-width: 640px) { .pd-vnos { flex-direction: column; } .pd-poslji { align-self: stretch; justify-content: center; } }
      `}</style>
    </div>
  );
}

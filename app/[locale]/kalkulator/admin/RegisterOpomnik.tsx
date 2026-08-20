'use client';

/* OPOMNIK: OSVEŽI REGISTER PODJETIJ
   Tabela public.podjetja je posnetek javnih zbirk (AJPES osveži dvakrat
   mesečno, FURS dnevno), zato sčasoma zastara — podjetje se preseli, dobi novo
   ime ali novo davčno. Ta kartica pove, kdaj je bila zadnja osvežitev, in ko
   mine 15 dni, opozori. Ukaz je izpisan zraven, da ga je mogoče kar prekopirati. */

import { useEffect, useState } from 'react';

const UKAZ = 'node scripts/osveziRegister.mjs';

type Stanje = { osvezeno: string | null; stevilo: number | null; opomba: string | null };

export default function RegisterOpomnik() {
  const [stanje, setStanje] = useState<Stanje | null>(null);
  const [kopirano, setKopirano] = useState(false);

  useEffect(() => {
    fetch('/api/kalkulator-admin/register')
      .then(r => (r.ok ? r.json() : null))
      .then(d => setStanje(d || { osvezeno: null, stevilo: null, opomba: null }))
      .catch(() => setStanje({ osvezeno: null, stevilo: null, opomba: null }));
  }, []);

  if (!stanje) return null;

  const cas = stanje.osvezeno ? new Date(stanje.osvezeno) : null;
  const dni = cas ? Math.floor((Date.now() - cas.getTime()) / 86400000) : null;
  /* AJPES osveži dvakrat mesečno, zato je 15 dni naravna meja */
  const zapoznelo = dni === null || dni >= 15;

  const barva = zapoznelo ? '#a4342a' : '#1a7f4b';
  const naslov = zapoznelo
    ? (cas ? 'Čas je za osvežitev registra' : 'Register še ni bil osvežen prek skripte')
    : 'Register podjetij je svež';

  const kopiraj = () => {
    navigator.clipboard?.writeText(UKAZ).then(() => {
      setKopirano(true);
      setTimeout(() => setKopirano(false), 2000);
    }).catch(() => { });
  };

  return (
    <div style={{
      background: '#fff', borderRadius: 16, padding: '1.1rem 1.3rem',
      boxShadow: '0 4px 18px rgba(17,17,17,.05)',
      borderLeft: `4px solid ${barva}`, marginTop: '1.4rem',
    }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.6rem', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <strong style={{ fontSize: '.95rem', color: barva }}>{naslov}</strong>
        <span style={{ fontSize: '.8rem', color: '#6b655d' }}>
          {cas
            ? `nazadnje ${cas.toLocaleDateString('sl-SI')} · pred ${dni} ${dni === 1 ? 'dnevom' : 'dnevi'}`
            : 'ni podatka o zadnji osvežitvi'}
        </span>
      </div>

      <p style={{ margin: '.5rem 0 0', fontSize: '.84rem', lineHeight: 1.5, color: '#4a453f' }}>
        Iskalnik podjetij dela iz posnetka javnih zbirk. AJPES osveži Poslovni register
        <b> dvakrat mesečno</b>, FURS sezname zavezancev dnevno — brez osvežitve ostanejo
        stara imena, naslovi in davčne.
        {stanje.stevilo ? <> Zadnjič uvoženih <b>{stanje.stevilo.toLocaleString('sl-SI')}</b> podjetij{stanje.opomba ? ` (${stanje.opomba})` : ''}.</> : null}
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem', alignItems: 'center', marginTop: '.7rem' }}>
        <code style={{
          padding: '.45rem .7rem', borderRadius: 8, background: '#F5F2EA',
          fontSize: '.78rem', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        }}>{UKAZ}</code>
        <button type="button" onClick={kopiraj} style={{
          padding: '.45rem .8rem', borderRadius: 8, border: '1px solid rgba(17,17,17,.15)',
          background: kopirano ? '#1a7f4b' : '#fff', color: kopirano ? '#fff' : '#111',
          font: '600 .78rem system-ui, sans-serif', cursor: 'pointer',
        }}>{kopirano ? 'Kopirano ✓' : 'Kopiraj ukaz'}</button>
        <span style={{ fontSize: '.76rem', color: '#6b655d' }}>
          poženeš v Terminalu, v mapi projekta — traja nekaj minut
        </span>
      </div>
    </div>
  );
}

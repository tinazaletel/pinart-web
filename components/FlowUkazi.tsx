'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';

/**
 * Hitri skok po orodju (⌘K). Namenoma samo navigacija — ne iskanje po vsebini.
 *
 * Iskanje po ponudbah in strankah bi moralo brati bazo in bi bilo pocasno ter
 * napacno v demo nacinu. Ko bo smiselno, se doda kot drugi razdelek; do takrat
 * je bolje imeti nekaj, kar vedno deluje, kot nekaj, kar vcasih ne najde.
 */

const CILJI: Array<{ pot: string; ime: string; skupina: string }> = [
  { pot: '/kalkulator/pregled', ime: 'Nadzorna plošča', skupina: '' },
  { pot: '/kalkulator/orodje', ime: 'Ponudba', skupina: 'Delo' },
  { pot: '/kalkulator/dolgorocno', ime: 'Dolgoročno sodelovanje', skupina: 'Delo' },
  { pot: '/kalkulator/pogodbe', ime: 'Pogodba', skupina: 'Delo' },
  { pot: '/kalkulator/racuni', ime: 'Računi', skupina: 'Delo' },
  { pot: '/kalkulator/stranke', ime: 'Stranke', skupina: 'Podatki' },
  { pot: '/kalkulator/ceniki', ime: 'Moji ceniki', skupina: 'Podatki' },
  { pot: '/kalkulator/stroski', ime: 'Stroški', skupina: 'Podatki' },
  { pot: '/kalkulator/cilji', ime: 'Cilji', skupina: 'Načrt' },
  { pot: '/kalkulator/cas', ime: 'Cena & čas', skupina: 'Načrt' },
  { pot: '/kalkulator/poslovni-nacrt', ime: 'Poslovni okvir', skupina: 'Načrt' },
  { pot: '/kalkulator/projekti', ime: 'Projekti', skupina: 'Drugo' },
  { pot: '/kalkulator/racunovodstvo', ime: 'Računovodstvo', skupina: 'Drugo' },
  { pot: '/kalkulator/profil', ime: 'Profil', skupina: 'Drugo' },
  { pot: '/kalkulator/nastavitve', ime: 'Nastavitve', skupina: 'Drugo' },
];

/* brez sumnikov in velikih crk, da "cas" najde "Cena & čas" */
const poenostavi = (v: string) => v.toLowerCase()
  .replace(/[čć]/g, 'c').replace(/š/g, 's').replace(/ž/g, 'z');

export default function FlowUkazi({ base }: { base: string }) {
  const router = useRouter();
  const [odprt, setOdprt] = useState(false);
  const [poizvedba, setPoizvedba] = useState('');
  const [izbran, setIzbran] = useState(0);
  const vnos = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const tipka = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); setOdprt(v => !v); setPoizvedba(''); setIzbran(0);
      }
      if (e.key === 'Escape') setOdprt(false);
    };
    window.addEventListener('keydown', tipka);
    return () => window.removeEventListener('keydown', tipka);
  }, []);

  useEffect(() => { if (odprt) vnos.current?.focus(); }, [odprt]);

  const najdeni = useMemo(() => {
    const q = poenostavi(poizvedba.trim());
    if (!q) return CILJI;
    return CILJI.filter(c => poenostavi(c.ime).includes(q) || poenostavi(c.skupina).includes(q));
  }, [poizvedba]);

  /* Ob odprtju zapri mobilni predal: ostal je odprt pod plastjo in ko si plast
     zaprla, si bila ujeta med dvema odprtima stvarema. */
  useEffect(() => {
    if (!odprt) return;
    document.querySelectorAll('details[open]').forEach(d => d.removeAttribute('open'));
  }, [odprt]);

  const pojdi = (pot: string) => { setOdprt(false); router.push(`${base}${pot}`); };

  return <>
    <button type="button" className={styles.ukazGumb} onClick={() => setOdprt(true)}
      aria-label="Hitri skok" title="Hitri skok (⌘K)">
      <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="9" cy="9" r="5.4" fill="none" stroke="currentColor" strokeWidth="1.7" /><path d="m13.2 13.2 3.2 3.2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
      <kbd>⌘K</kbd>
    </button>

    {/* PORTAL na <body>: okno je bilo otrok predala, zato ga je zapiranje predala
        skrilo skupaj z njim in prvi klik ni pokazal nicesar. */}
    {odprt && createPortal(
      <div className={styles.ukazPlast} role="dialog" aria-modal="true" aria-label="Hitri skok"
        onClick={e => { if (e.target === e.currentTarget) setOdprt(false); }}>
      <div className={styles.ukazOkno}>
        <button type="button" className={styles.ukazZapri} onClick={() => setOdprt(false)} aria-label="Zapri">×</button>
        <input ref={vnos} value={poizvedba} placeholder="Kam želiš?"
          onChange={e => { setPoizvedba(e.target.value); setIzbran(0); }}
          onKeyDown={e => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setIzbran(i => Math.min(i + 1, najdeni.length - 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setIzbran(i => Math.max(i - 1, 0)); }
            if (e.key === 'Enter' && najdeni[izbran]) { e.preventDefault(); pojdi(najdeni[izbran].pot); }
          }} />
        <ul>
          {najdeni.map((c, i) => (
            <li key={c.pot}>
              <button type="button" data-izbran={i === izbran} onMouseEnter={() => setIzbran(i)}
                onClick={() => pojdi(c.pot)}>
                <span>{c.ime}</span>{c.skupina && <small>{c.skupina}</small>}
              </button>
            </li>
          ))}
          {!najdeni.length && <li className={styles.ukazPrazno}>Ni zadetkov za »{poizvedba}«.</li>}
        </ul>
        </div>
      </div>,
      document.body,
    )}
  </>;
}

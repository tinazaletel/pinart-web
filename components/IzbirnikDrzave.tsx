'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

/* Spustni seznam drzav. Nadomesca domaci <datalist>, ki v Safariju ni zanesljiv in
   se tepe s Safarijevim samodejnim izpolnjevanjem stikov (ikona osebe cez polje).
   Tu izris nadziramo sami: puscica seznam odpre, tipkanje ga filtrira, tipkovnica dela. */

/* "Slovenija" in "slovenija" naj se ujameta; sumnike poenostavimo, da "sumnik" ni ovira. */
function poenostavi(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
}

export default function IzbirnikDrzave({
  id, value, onChange, placeholder, moznosti, ariaLabel,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  moznosti: string[];
  ariaLabel?: string;
}) {
  const [odprt, setOdprt] = useState(false);
  const [oznacen, setOznacen] = useState(-1);
  const ovoj = useRef<HTMLDivElement>(null);

  /* Ce je polje prazno ali ze natanko ustreza izbiri, pokazi cel seznam. */
  const zadetki = useMemo(() => {
    const q = poenostavi(value.trim());
    if (!q || moznosti.some(m => poenostavi(m) === q)) return moznosti;
    return moznosti.filter(m => poenostavi(m).includes(q));
  }, [value, moznosti]);

  useEffect(() => {
    if (!odprt) return;
    const klik = (e: MouseEvent) => { if (ovoj.current && !ovoj.current.contains(e.target as Node)) setOdprt(false); };
    document.addEventListener('mousedown', klik);
    return () => document.removeEventListener('mousedown', klik);
  }, [odprt]);

  function izberi(m: string) {
    onChange(m);
    setOdprt(false);
    setOznacen(-1);
  }

  function tipka(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') { setOdprt(false); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!odprt) { setOdprt(true); return; }
      const smer = e.key === 'ArrowDown' ? 1 : -1;
      setOznacen(i => {
        const n = zadetki.length;
        if (!n) return -1;
        return ((i < 0 ? (smer > 0 ? -1 : 0) : i) + smer + n) % n;
      });
      return;
    }
    if (e.key === 'Enter' && odprt && oznacen >= 0 && zadetki[oznacen]) {
      e.preventDefault();
      izberi(zadetki[oznacen]);
    }
  }

  return (
    <div className="drz-ovoj" ref={ovoj}>
      <input
        id={id}
        type="text"
        className="drz-vnos"
        role="combobox"
        aria-expanded={odprt}
        aria-controls={`${id}-seznam`}
        aria-autocomplete="list"
        aria-label={ariaLabel}
        autoComplete="off"          /* zadusi Safarijev predlog stikov cez polje */
        placeholder={placeholder}
        value={value}
        onChange={e => { onChange(e.target.value); setOdprt(true); setOznacen(-1); }}
        onFocus={() => setOdprt(true)}
        onKeyDown={tipka}
      />
      <button
        type="button"
        className="drz-puscica"
        tabIndex={-1}
        aria-label={odprt ? 'Zapri seznam držav' : 'Odpri seznam držav'}
        onClick={() => setOdprt(v => !v)}
      >
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5.5 7.5 4.5 4.5 4.5-4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>

      {odprt && zadetki.length > 0 && (
        <ul className="drz-seznam" id={`${id}-seznam`} role="listbox">
          {zadetki.map((m, i) => (
            <li key={m}>
              <button
                type="button"
                role="option"
                aria-selected={poenostavi(m) === poenostavi(value)}
                className={i === oznacen ? 'on' : ''}
                onMouseEnter={() => setOznacen(i)}
                onClick={() => izberi(m)}
              >{m}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

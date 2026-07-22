'use client';

import { useEffect, useState } from 'react';

/**
 * Tekoče merjenje časa, dostopno z VSEH strani.
 *
 * Merjenje je razbito na odseke, da je mogoča pavza:
 *   `nabrano`   = sekunde iz že zaključenih odsekov
 *   `startedAt` = začetek TEKOČEGA odseka (ob nadaljevanju se postavi na zdaj)
 *   `zacetekPrvic` = začetek celotnega merjenja, za izpis "od – do" v dnevniku
 *
 * Pretečeni čas se vsakič preračuna iz teh treh; v ozadju ne teče noben števec,
 * zato je pravilno tudi, če stran zapreš in se čez tri ure vrneš.
 */

export type TekoceMerjenje = {
  projectName: string;
  serviceName?: string;
  startedAt: string;
  zacetekPrvic?: string;
  nabrano?: number;
  pavza?: boolean;
  /* zahteva za ustavitev, oddana z druge strani (bližnjica v glavi) */
  ustavi?: boolean;
};

const KLJUC = 'pinart-tekoce-merjenje';
const DOGODEK = 'pinart-merjenje-sprememba';

export function preberiMerjenje(): TekoceMerjenje | null {
  if (typeof window === 'undefined') return null;
  try {
    const s = localStorage.getItem(KLJUC);
    if (!s) return null;
    const m = JSON.parse(s) as TekoceMerjenje;
    return m?.startedAt && m?.projectName ? m : null;
  } catch { return null; }
}

export function zapisiMerjenje(m: TekoceMerjenje | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (m) localStorage.setItem(KLJUC, JSON.stringify(m));
    else localStorage.removeItem(KLJUC);
  } catch { /* zasebno okno */ }
  window.dispatchEvent(new CustomEvent(DOGODEK));
}

/** Sekunde od začetka, brez časa, preživetega na pavzi. */
export function sekundeMerjenja(m: TekoceMerjenje | null): number {
  if (!m) return 0;
  const nabrano = m.nabrano || 0;
  if (m.pavza) return nabrano;
  return nabrano + Math.max(0, Math.floor((Date.now() - new Date(m.startedAt).getTime()) / 1000));
}

/** Pavza: tekoči odsek se zaključi in prišteje. Nadaljevanje: nov odsek. */
export function preklopiPavzo(): void {
  const m = preberiMerjenje();
  if (!m) return;
  if (m.pavza) {
    zapisiMerjenje({ ...m, pavza: false, startedAt: new Date().toISOString() });
  } else {
    zapisiMerjenje({ ...m, pavza: true, nabrano: sekundeMerjenja(m) });
  }
}

/** Ustavitev z druge strani: zastavico prebere stran "Cena & čas" in odpre potrditev. */
export function zahtevajUstavitev(): void {
  const m = preberiMerjenje();
  if (!m) return;
  zapisiMerjenje({ ...m, ustavi: true, pavza: true, nabrano: sekundeMerjenja(m) });
}

/** Vrne tekoče merjenje in pretečene sekunde; sekunde tečejo same. */
export function useTekoceMerjenje(): { merjenje: TekoceMerjenje | null; sekunde: number } {
  const [merjenje, setMerjenje] = useState<TekoceMerjenje | null>(null);
  const [sekunde, setSekunde] = useState(0);

  useEffect(() => {
    const osvezi = () => setMerjenje(preberiMerjenje());
    osvezi();
    window.addEventListener(DOGODEK, osvezi);
    window.addEventListener('storage', osvezi);
    return () => {
      window.removeEventListener(DOGODEK, osvezi);
      window.removeEventListener('storage', osvezi);
    };
  }, []);

  useEffect(() => {
    setSekunde(sekundeMerjenja(merjenje));
    if (!merjenje || merjenje.pavza) return;          /* na pavzi ni kaj teči */
    const id = window.setInterval(() => setSekunde(sekundeMerjenja(merjenje)), 1000);
    return () => window.clearInterval(id);
  }, [merjenje]);

  return { merjenje, sekunde };
}

export const zapisCasa = (s: number) =>
  [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map(v => String(v).padStart(2, '0')).join(':');

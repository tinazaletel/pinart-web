'use client';

import { useSyncExternalStore } from 'react';

/**
 * Skupni napredek za crto v zgornji vrstici (FlowTopBar).
 *
 * Crta mora ziveti v ISTEM elementu kot header, da se premika z njim (header
 * se ob drsenju skrije/pokaze). Header pa je svoja komponenta in ne pozna
 * koraka v kalkulatorju ali retainerju — zato ta drobni store: delovni prostor
 * objavi frakcijo (0..1), FlowTopBar jo prikaze. `null` = crte ni.
 */

let frakcija: number | null = null;
const poslusalci = new Set<() => void>();

export function nastaviNapredek(v: number | null): void {
  const nova = v === null ? null : Math.max(0, Math.min(1, v));
  if (nova === frakcija) return;
  frakcija = nova;
  poslusalci.forEach(f => f());
}

export function useFlowNapredek(): number | null {
  return useSyncExternalStore(
    (cb) => { poslusalci.add(cb); return () => poslusalci.delete(cb); },
    () => frakcija,
    () => null,
  );
}

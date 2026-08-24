'use client';

/* ALI ŽE VEMO, KAJ UPORABNICA IMA?
 *
 * Vsi delovni prostori berejo shrambo šele PO montaži (branje med renderjem
 * razbije hidracijo), prijavljenim pa FlowCloudBridge takoj zatem potegne
 * podatke še iz oblaka. Prvi izris je zato prazen — in če ta trenutek pokažemo
 * »Ni odprtih nalog« ali »0 €«, uporabnica vidi, da so podatki izginili.
 *
 * Prazno stanje sme trditi, da je prazno, šele ko RES vemo. Do takrat naj bo
 * tiho. Ta modul pove, kdaj je tisti trenutek.
 */

import { useEffect, useState } from 'react';

/* Isti ključ kot v components/FlowCloudBridge.tsx — postavi ga ob koncu
   začetne sinhronizacije. */
export const KLJUC_SEJE = 'pinart-flow-cloud-bridge-v1';

/* Če se oblak ne oglasi, po tem času nehamo čakati. Brez tega bi okvara
   sinhronizacije pomenila večen vrtiljak namesto podatkov. */
export const NAJVEC_CAKANJA_MS = 2500;

export function jeOblakSinhroniziran(): boolean {
  if (typeof window === 'undefined') return false;
  try { return window.sessionStorage.getItem(KLJUC_SEJE) === 'done'; } catch { return true; }
}

/**
 * true = smemo pokazati prazno stanje.
 *
 * Postane true, ko se začetna sinhronizacija konča, ko javi napako, ali ko
 * poteče NAJVEC_CAKANJA_MS. Neprijavljena uporabnica sinhronizacije nima, zato
 * jo reši prav ta iztek — in ker bere samo iz brskalnika, so podatki takrat
 * itak že tam.
 */
export function useOblakPripravljen(): boolean {
  const [pripravljen, setPripravljen] = useState(false);
  useEffect(() => {
    if (jeOblakSinhroniziran()) { setPripravljen(true); return; }
    const koncaj = () => setPripravljen(true);
    window.addEventListener('pinart-flow-change', koncaj);
    window.addEventListener('pinart-flow-sync-error', koncaj);
    const t = window.setTimeout(koncaj, NAJVEC_CAKANJA_MS);
    return () => {
      window.removeEventListener('pinart-flow-change', koncaj);
      window.removeEventListener('pinart-flow-sync-error', koncaj);
      window.clearTimeout(t);
    };
  }, []);
  return pripravljen;
}

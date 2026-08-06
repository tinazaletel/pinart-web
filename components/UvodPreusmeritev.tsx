'use client';

/* UvodPreusmeritev — ob PRVI prijavi novega uporabnika ga samodejno pelje v
   uvodni pogovor (kalkulator ?uvod=1), kjer se onboarding tako ali tako sam
   sproži (uvodKoncan===false). Po zaključku pogovora se vrne na nadzorno ploščo.

   Varovala:
   - zgodi se NAJVEČ ENKRAT na brskalnik (zastavica pinart-uvod-ponujen), da
     ne ujame uporabnika v zanko, če onboarding preskoči;
   - če je onboarding že opravljen (uvodKoncan===true v zapisu kalkulatorja),
     ne preusmerja;
   - vse v try/catch (zaseben način brez localStorage). */

import { useEffect } from 'react';

const PONUJEN = 'pinart-uvod-ponujen';
const K_KALK = 'pinart-kalkulator-v2';

export default function UvodPreusmeritev({ base }: { base: string }) {
  useEffect(() => {
    try {
      if (localStorage.getItem(PONUJEN)) return;               // že enkrat ponujeno na tem brskalniku
      let uvodKoncan = false;
      try { uvodKoncan = JSON.parse(localStorage.getItem(K_KALK) || '{}')?.uvodKoncan === true; } catch { /* prazno */ }
      localStorage.setItem(PONUJEN, new Date().toISOString());  // označi, da smo ponudili (tudi če je že končan)
      if (uvodKoncan) return;                                   // onboarding že opravljen — brez preusmeritve
      window.location.replace(`${base}/kalkulator/orodje?uvod=1`);
    } catch { /* brez localStorage — brez samodejne preusmeritve */ }
  }, [base]);

  return null;
}

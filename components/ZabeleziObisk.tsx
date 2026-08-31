'use client';

import { useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

/**
 * Zabelezi obisk prijavljenega uporabnika (engagement za beto). Klice RPC
 * `zabelezi_obisk` (security-definer, uporabi auth.uid()) ENKRAT na sejo (tab),
 * da se ob vsakem prehodu strani ne poziva znova. Anonimni obiskovalci nimajo
 * seje -> nic se ne zgodi. Bere ga admin panel (Vpisan? / Obiskov).
 *
 * ČAS NA STRANI (Tina, 31. 8. 2026): poleg odprtja stejemo tudi sekunde, kolikor
 * je zavihek VIDEN. Merimo samo takrat:
 *   - skrit zavihek ni obisk (glasba v ozadju, pozabljeno okno),
 *   - po petih minutah brez premika miske, tipke ali dotika stejemo, da je
 *     uporabnik odsel — sicer bi odprt zavihek cez noc pokazal osem ur branja.
 * Sestevek posljemo vsako minuto in ob odhodu s strani; vmesni zbir zivi samo v
 * pomnilniku, zato izguba ob zaprtju pomeni kvecjemu minuto manj.
 */
const KEY = 'pinart-obisk-zabelezen-v1';

/* Merilo: koliko casa naenkrat cakamo, preden sekunde posljemo. */
const POSLJI_NA = 60;
/* Po tolikem miru sklepamo, da uporabnika ni vec za zaslonom. */
const MIR_SEK = 300;

export default function ZabeleziObisk() {
  useEffect(() => {
    const supabase = createClient();
    let ziv = true;
    let prijavljen = false;
    let nabrano = 0;          // sekunde, ki se niso poslane
    let odZadnjeDejavnosti = 0;

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || !ziv) return;
        prijavljen = true;
        if (sessionStorage.getItem(KEY) !== '1') {
          const { error } = await supabase.rpc('zabelezi_obisk');
          if (!error) sessionStorage.setItem(KEY, '1');
        }
      } catch { /* tiho: belezenje obiska ni kriticno */ }
    })();

    const posljiSekunde = () => {
      if (!prijavljen || nabrano <= 0) return;
      const sek = Math.round(nabrano);
      nabrano = 0;
      /* Napake tu ne zdravimo: ce klic pade, je izgubljena minuta merjenja,
         kar uporabnika ne sme motiti niti za trenutek. */
      void supabase.rpc('zabelezi_cas', { sek }).then(() => undefined, () => undefined);
    };

    const dejavnost = () => { odZadnjeDejavnosti = 0; };
    const dogodki: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'mousemove'];
    dogodki.forEach(d => window.addEventListener(d, dejavnost, { passive: true }));

    const ura = window.setInterval(() => {
      if (!prijavljen) return;
      if (document.visibilityState !== 'visible') return;
      odZadnjeDejavnosti += 1;
      if (odZadnjeDejavnosti > MIR_SEK) return;   // uporabnika ni za zaslonom
      nabrano += 1;
      if (nabrano >= POSLJI_NA) posljiSekunde();
    }, 1000);

    /* Ob skritju zavihka in ob odhodu s strani posljemo, kar je ostalo. */
    const naSkritje = () => { if (document.visibilityState === 'hidden') posljiSekunde(); };
    document.addEventListener('visibilitychange', naSkritje);
    window.addEventListener('pagehide', posljiSekunde);

    return () => {
      ziv = false;
      posljiSekunde();
      window.clearInterval(ura);
      dogodki.forEach(d => window.removeEventListener(d, dejavnost));
      document.removeEventListener('visibilitychange', naSkritje);
      window.removeEventListener('pagehide', posljiSekunde);
    };
  }, []);

  return null;
}

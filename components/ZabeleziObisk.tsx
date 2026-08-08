'use client';

import { useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

/**
 * Zabelezi obisk prijavljenega uporabnika (engagement za beto). Klice RPC
 * `zabelezi_obisk` (security-definer, uporabi auth.uid()) ENKRAT na sejo (tab),
 * da se ob vsakem prehodu strani ne poziva znova. Anonimni obiskovalci nimajo
 * seje -> nic se ne zgodi. Bere ga admin panel (Vpisan? / Obiskov).
 */
const KEY = 'pinart-obisk-zabelezen-v1';

export default function ZabeleziObisk() {
  useEffect(() => {
    if (sessionStorage.getItem(KEY) === '1') return;
    const supabase = createClient();
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { error } = await supabase.rpc('zabelezi_obisk');
        if (!error) sessionStorage.setItem(KEY, '1');
      } catch { /* tiho: belezenje obiska ni kriticno */ }
    })();
  }, []);

  return null;
}

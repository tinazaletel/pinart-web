/* Zaprta beta / dodelitve: preverjanje, ali ima e-mail aktivno dodelitev v
   tabeli flow_dostop. Bere prek security-definer RPC flow_dostop_za, ki NE
   razkrije celega seznama — vrne samo aktivni zapis (znotraj obdobja) za dani
   e-mail. Isti helper uporablja middleware (zaklep) in getAccessTier (paket). */

export type DostopVrsta = 'tester' | 'nagrada' | 'popust';

export type Dodelitev = {
  vrsta: DostopVrsta;
  velja_od: string | null;
  velja_do: string | null;
  popust: number | null;
};

import type { SupabaseClient } from '@supabase/supabase-js';

type SupabaseLike = Pick<SupabaseClient, 'rpc'>;

/* Vrne aktivno dodelitev za e-mail ali null. SQL ze filtrira po obdobju. */
export async function aktivnaDodelitev(
  supabase: SupabaseLike,
  email: string | null | undefined,
): Promise<Dodelitev | null> {
  if (!email) return null;
  const { data, error } = await supabase.rpc('flow_dostop_za', { p_email: email });
  if (error || !Array.isArray(data) || !data[0]) return null;
  return data[0] as Dodelitev;
}

/* Ali dodelitev ODKLENE aplikacijo? Tester in nagrada da, popust ne (ta je le
   znizanje cene ob placilu, ne dostop). */
export function dodelitevOdklene(d: Dodelitev | null): boolean {
  return !!d && (d.vrsta === 'tester' || d.vrsta === 'nagrada');
}

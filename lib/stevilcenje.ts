import { createClient } from '@/utils/supabase/client';

export type VrstaStevilcenja = 'racun' | 'predracun';

/**
 * Pridobi naslednjo atomsko dodeljeno številko tik pred izdajo dokumenta.
 * UI naj te funkcije ne kliče ob odprtju osnutka, temveč samo ob izdaji.
 */
export async function naslednjaStevilka(kind: VrstaStevilcenja): Promise<string> {
  const { data, error } = await createClient().rpc('dodeli_stevilko', {
    p_vrsta: kind,
  });

  if (error) throw new Error(error.message || 'Številke dokumenta ni bilo mogoče dodeliti.');
  if (typeof data !== 'string' || !data.trim()) {
    throw new Error('Strežnik ni vrnil veljavne številke dokumenta.');
  }

  return data;
}

import { createClient } from '@/utils/supabase/client';
import { getOrganizationContext } from '@/lib/pinartFlowCloud';

export type VrstaStevilcenja = 'racun' | 'predracun';
export type NastavitevStevilcenja = { vrsta: VrstaStevilcenja; leto: number; zadnja: number; vzorec: string };

export const PRIVZETI_VZORCI: Record<VrstaStevilcenja, string> = {
  racun: '{leto}-{zaporedna}',
  predracun: 'P-{leto}-{zaporedna}',
};

export function napakaVzorca(vzorec: string): string | null {
  const cist = vzorec.trim();
  if (!cist.includes('{zaporedna}')) return 'Oblika mora vsebovati {zaporedna}.';
  const brezVeljavnih = cist.replaceAll('{leto}', '').replaceAll('{zaporedna}', '');
  if (/[{}]/.test(brezVeljavnih)) return 'Dovoljeni oznaki sta samo {leto} in {zaporedna}.';
  return null;
}

export function sestaviStevilko(vzorec: string, leto: number, zaporedna: number, sirina = 4): string {
  const napaka = napakaVzorca(vzorec);
  if (napaka) throw new Error(napaka);
  if (!Number.isInteger(leto) || leto < 2000 || leto > 9999) throw new Error('Leto mora biti med 2000 in 9999.');
  if (!Number.isInteger(zaporedna) || zaporedna < 0) throw new Error('Zaporedna številka ne sme biti negativna.');
  const niz = String(zaporedna).padStart(Math.max(1, Math.floor(sirina)), '0');
  return vzorec.trim().replaceAll('{leto}', String(leto)).replaceAll('{zaporedna}', niz);
}

export async function preberiStevilcenje(leto: number): Promise<NastavitevStevilcenja[]> {
  const kontekst = await getOrganizationContext();
  if (!kontekst) return [];
  const { data, error } = await createClient().from('document_counters')
    .select('leto,vrsta,zadnja,vzorec')
    .eq('organization_id', kontekst.organizationId)
    .eq('leto', leto);
  if (error) throw new Error(error.message || 'Številčenja ni bilo mogoče prebrati.');
  return (data || []).filter(v => v.vrsta === 'racun' || v.vrsta === 'predracun').map(v => ({
    vrsta: v.vrsta as VrstaStevilcenja,
    leto: Number(v.leto),
    zadnja: Number(v.zadnja) || 0,
    vzorec: String(v.vzorec || PRIVZETI_VZORCI[v.vrsta as VrstaStevilcenja]),
  }));
}

export async function nastaviStevilcenje(vrsta: VrstaStevilcenja, leto: number, zadnja: number, vzorec: string): Promise<void> {
  const napaka = napakaVzorca(vzorec);
  if (napaka) throw new Error(napaka);
  if (!Number.isInteger(zadnja) || zadnja < 0) throw new Error('Zadnja izdana številka mora biti celo število, večje ali enako 0.');
  const { error } = await createClient().rpc('nastavi_stevilcenje', {
    p_vrsta: vrsta, p_leto: leto, p_zadnja: zadnja, p_vzorec: vzorec.trim(),
  });
  if (error) throw new Error(error.message || 'Številčenja ni bilo mogoče shraniti.');
}

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

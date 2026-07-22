import { createClient } from '@/utils/supabase/server';
import { canUseFeature, type AccessTier, type FlowFeature } from './pinartFlowEntitlements';

/**
 * Strezniska preveritev pravic.
 *
 * Kljucavnica v meniju je samo videz — prava zascita mora biti tu, sicer
 * zadostuje, da nekdo v brskalniku popravi atribut ali odpre pot naravnost.
 *
 * Namenoma NE preusmerja: stran se izrise, a namesto delovnega prostora
 * pokaze, kaj funkcija naredi. Preusmeritev bi bila slepa ulica.
 */
export async function paketUporabnika(): Promise<AccessTier> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 'anonymous';

    const { data, error } = await supabase.rpc('current_organization_entitlements');
    if (error || !Array.isArray(data) || !data[0]) return 'free';

    const e = data[0] as { tier?: string; status?: string; valid_until?: string | null };
    const veljaven = e.status === 'active' || e.status === 'trialing';
    const potekel = e.valid_until ? new Date(e.valid_until).getTime() < Date.now() : false;
    return e.tier === 'pro' && veljaven && !potekel ? 'pro' : 'free';
  } catch {
    /* ce preveritev pade, ne odpiramo placljivih funkcij */
    return 'free';
  }
}

export async function smePorabiti(funkcija: FlowFeature): Promise<boolean> {
  return canUseFeature(await paketUporabnika(), funkcija);
}

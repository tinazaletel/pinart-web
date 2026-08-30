import { createAdminClient } from '@/utils/supabase/admin';
import { USTANOVNIH_MEST } from '@/lib/cenaNarocnine';

/**
 * Koliko ustanovnih mest je oddanih.
 *
 * Isto štetje kot na blagajni (app/api/stripe/checkout/route.ts): štejemo
 * zaklenjene cene, ne uporabnikov — ustanoven je tisti, ki mu je bila cena res
 * dodeljena.
 *
 * Ob napaki vrne POLNO število mest, ne nič. Tako cenik ob izpadu baze pokaže
 * uvodno ceno in ne ustanovne: obiskovalec, ki mu obljubimo 9 € in mu blagajna
 * zaračuna 15 €, je hujša napaka od obiskovalca, ki vidi 15 € in plača 9 €.
 */
export async function oddanihUstanovnih(): Promise<number> {
  try {
    const admin = createAdminClient();
    if (!admin) return USTANOVNIH_MEST;
    const { count, error } = await admin
      .from('organization_subscriptions')
      .select('organization_id', { count: 'exact', head: true })
      .eq('cena_ponudba', 'ustanovna');
    if (error || typeof count !== 'number') return USTANOVNIH_MEST;
    return count;
  } catch {
    return USTANOVNIH_MEST;
  }
}

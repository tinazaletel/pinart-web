import { createAdminClient } from '@/utils/supabase/admin';

/**
 * Seznam racunov za rocno dodelitev paketa.
 *
 * POZOR — to je edini del admina, ki NI anonimen. Analitika je namenoma
 * sestevek brez imen; tukaj pa je treba videti, komu paket dodeljujes, sicer
 * dodelitev ni mogoca. Zato je loceno od `podatki.ts` in vrne samo to, kar je
 * za dodelitev nujno: ime podjetja in trenutni paket. Brez e-poste.
 */

export type Racun = {
  id: string;
  ime: string;
  ustvarjen: string;
  paket: 'free' | 'pro';
  vir: string | null;      /* 'rocno' = podarjen, sicer placilni ponudnik */
};

export async function pridobiRacune(): Promise<{ racuni: Racun[]; napaka?: string }> {
  const baza = createAdminClient();
  if (!baza) return { racuni: [], napaka: 'Manjka SUPABASE_SERVICE_ROLE_KEY.' };

  const [org, narocnine] = await Promise.all([
    baza.from('organizations').select('id,name,created_at').order('created_at', { ascending: false }).limit(500),
    baza.from('organization_subscriptions').select('organization_id,tier,provider'),
  ]);

  if (org.error) return { racuni: [], napaka: org.error.message };

  const poId = new Map((narocnine.data || []).map(n => [String(n.organization_id), n]));

  return {
    racuni: (org.data || []).map(o => {
      const n = poId.get(String(o.id));
      return {
        id: String(o.id),
        ime: String(o.name || 'Brez imena'),
        ustvarjen: String(o.created_at),
        paket: n?.tier === 'pro' ? 'pro' : 'free',
        vir: n?.provider ? String(n.provider) : null,
      };
    }),
  };
}

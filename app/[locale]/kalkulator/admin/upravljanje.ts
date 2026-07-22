import { createAdminClient } from '@/utils/supabase/admin';

/**
 * Seznam racunov za rocno dodelitev paketa.
 *
 * POZOR — to je edini del admina, ki NI anonimen. Analitika je namenoma
 * sestevek brez imen; tukaj pa je treba videti, komu paket dodeljujes, sicer
 * dodelitev ni mogoca. Zato je loceno od `podatki.ts` in vrne samo to, kar je
 * za dodelitev nujno: ime podjetja, e-posto lastnika in trenutni paket.
 *
 * E-posta je nujna: nova podjetja se privzeto imenujejo "Moje podjetje", zato
 * po imenu ni mogoce lociti dveh racunov. Analitika ostaja brez nje.
 */

export type Racun = {
  id: string;
  ime: string;
  eposta: string;          /* lastnik racuna — brez tega racuna ni mogoce najti */
  ustvarjen: string;
  paket: 'free' | 'pro';
  vir: string | null;      /* 'rocno' = podarjen, sicer placilni ponudnik */
};

export async function pridobiRacune(): Promise<{ racuni: Racun[]; napaka?: string }> {
  const baza = createAdminClient();
  if (!baza) return { racuni: [], napaka: 'Manjka SUPABASE_SERVICE_ROLE_KEY.' };

  const [org, narocnine, clani, uporabniki] = await Promise.all([
    baza.from('organizations').select('id,name,created_at,owner_id').order('created_at', { ascending: false }).limit(500),
    baza.from('organization_subscriptions').select('organization_id,tier,provider'),
    baza.from('organization_members').select('organization_id,user_id,role'),
    /* e-poste so v auth.users in do njih pride samo service-role */
    baza.auth.admin.listUsers({ page: 1, perPage: 500 }),
  ]);

  if (org.error) return { racuni: [], napaka: org.error.message };

  const poId = new Map((narocnine.data || []).map(n => [String(n.organization_id), n]));
  const posta = new Map((uporabniki.data?.users || []).map(u => [String(u.id), String(u.email || '')]));
  /* lastnik podjetja; ce ga ni, prvi clan — da racun ni brez imena */
  const lastnik = new Map<string, string>();
  for (const c of clani.data || []) {
    const k = String(c.organization_id);
    if (c.role === 'owner' || !lastnik.has(k)) lastnik.set(k, String(c.user_id));
  }

  return {
    racuni: (org.data || []).map(o => {
      const n = poId.get(String(o.id));
      return {
        id: String(o.id),
        ime: String(o.name || 'Brez imena'),
        eposta: posta.get(String(o.owner_id)) || posta.get(lastnik.get(String(o.id)) || '') || '',
        ustvarjen: String(o.created_at),
        paket: n?.tier === 'pro' ? 'pro' : 'free',
        vir: n?.provider ? String(n.provider) : null,
      };
    }),
  };
}

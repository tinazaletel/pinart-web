import type { SupabaseClient } from '@supabase/supabase-js';

export type Clanstvo = { organization_id: string; role: string; disabled_at: string | null };
const MOC: Record<string, number> = { member: 1, admin: 2, owner: 3 };

const najmocnejse = (vrstice: Clanstvo[]): Clanstvo | null => {
  const aktivne = vrstice.filter(v => !v.disabled_at);
  return (aktivne.length ? aktivne : vrstice).sort((a, b) => (MOC[b.role] || 0) - (MOC[a.role] || 0))[0] || null;
};

/* Podvojene vrstice ne pomenijo vec laznega »nisi clan«. Za vsako organizacijo
   izberemo aktivno in najmocnejso vlogo: owner > admin > member. */
export async function preberiClanstva(admin: SupabaseClient, userId: string): Promise<Clanstvo[]> {
  const { data, error } = await admin.from('organization_members').select('organization_id,role,disabled_at').eq('user_id', userId);
  if (error) return [];
  const skupine = new Map<string, Clanstvo[]>();
  for (const row of data || []) {
    const zapis = { organization_id: String(row.organization_id), role: String(row.role), disabled_at: row.disabled_at ? String(row.disabled_at) : null };
    skupine.set(zapis.organization_id, [...(skupine.get(zapis.organization_id) || []), zapis]);
  }
  return [...skupine.values()].map(najmocnejse).filter((v): v is Clanstvo => Boolean(v));
}

export async function preberiClanstvo(admin: SupabaseClient, organizationId: string | null, userId: string): Promise<Clanstvo | null> {
  const clanstva = await preberiClanstva(admin, userId);
  return najmocnejse(organizationId ? clanstva.filter(v => v.organization_id === organizationId) : clanstva);
}

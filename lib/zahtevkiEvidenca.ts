/* ZAHTEVKI ZA POPRAVEK EVIDENCE — »pozabil sem se vpisati, videl me je Luka«.
 *
 * Zakaj zahtevek in ne kar popravek: evidenca delovnega časa je dokument. Če jo
 * lahko vsak tiho popravi za nazaj, ne pove ničesar — če je pa nihče ne more
 * popraviti, je napačna, ker ljudje res pozabijo pritisniti prihod. Pošteno jo
 * naredi SLED: kdo je prosil, kdaj, zakaj in kdo je odobril (Tina, 30. 8. 2026).
 *
 * Zapis v evidenco se zgodi šele ob odobritvi — do takrat so v zahtevku samo
 * PREDLAGANE vrednosti.
 */

import { createClient } from '@/utils/supabase/client';
import { getOrganizationContext } from '@/lib/pinartFlowCloud';
import { saveCloudPresence } from '@/lib/pinartPlanning';

export type Status = 'cakanje' | 'odobreno' | 'zavrnjeno';

export type Zahtevek = {
  id: string;
  userId: string;
  datum: string;
  prihod?: string;
  odhod?: string;
  malicaMin?: number;
  razlog: string;
  prica?: string;
  status: Status;
  odlocilId?: string;
  odlocenoOb?: string;
  ustvarjeno: string;
};

const izVrstice = (v: Record<string, unknown>): Zahtevek => ({
  id: String(v.id),
  userId: String(v.user_id),
  datum: String(v.entry_date),
  prihod: v.arrival ? String(v.arrival) : undefined,
  odhod: v.departure ? String(v.departure) : undefined,
  malicaMin: v.break_minutes != null ? Number(v.break_minutes) : undefined,
  razlog: String(v.reason || ''),
  prica: v.witness ? String(v.witness) : undefined,
  status: (String(v.status || 'cakanje') as Status),
  odlocilId: v.decided_by ? String(v.decided_by) : undefined,
  odlocenoOb: v.decided_at ? String(v.decided_at) : undefined,
  ustvarjeno: String(v.created_at || ''),
});

/** Vloži zahtevek za popravek. Vrne true ob uspehu. */
export async function vloziZahtevek(z: {
  datum: string; prihod?: string; odhod?: string; malicaMin?: number; razlog: string; prica?: string;
}): Promise<boolean> {
  const ctx = await getOrganizationContext();
  if (!ctx || !z.razlog.trim()) return false;
  const supa = createClient();
  const { error } = await supa.from('presence_change_requests').insert({
    organization_id: ctx.organizationId,
    user_id: ctx.userId,
    entry_date: z.datum,
    arrival: z.prihod || null,
    departure: z.odhod || null,
    break_minutes: z.malicaMin ?? null,
    reason: z.razlog.trim(),
    witness: z.prica?.trim() || null,
    status: 'cakanje',
  });
  if (error) return false;

  /* Skrbnik naj ne odkrije zahtevka po naključju: obvestilo gre takoj. Če
     pošiljanje ne uspe, zahtevek vseeno obstaja — vidi ga v seznamu. */
  void fetch('/api/evidenca/zahtevek-obvestilo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ datum: z.datum, razlog: z.razlog.trim(), prica: z.prica?.trim() || null,
      prihod: z.prihod || null, odhod: z.odhod || null }),
  }).catch(() => undefined);
  return true;
}

/** Zahtevki, ki jih vidim: svoje, skrbnik pa vse v podjetju (ureja RLS). */
export async function zahtevki(): Promise<Zahtevek[]> {
  const ctx = await getOrganizationContext();
  if (!ctx) return [];
  const supa = createClient();
  const { data, error } = await supa
    .from('presence_change_requests')
    .select('*')
    .eq('organization_id', ctx.organizationId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error || !data) return [];
  return (data as Array<Record<string, unknown>>).map(izVrstice);
}

/** Odobri ali zavrni. Ob odobritvi se predlog zapiše v evidenco. */
export async function odlociZahtevek(z: Zahtevek, odobri: boolean, opomba?: string): Promise<boolean> {
  const ctx = await getOrganizationContext();
  if (!ctx) return false;
  const supa = createClient();
  const { error } = await supa.from('presence_change_requests').update({
    status: odobri ? 'odobreno' : 'zavrnjeno',
    decided_by: ctx.userId,
    decided_at: new Date().toISOString(),
    decision_note: opomba?.trim() || null,
  }).eq('id', z.id);
  if (error) return false;

  if (odobri) {
    await saveCloudPresence({
      id: crypto.randomUUID(),
      datum: z.datum,
      prihod: z.prihod || '',
      odhod: z.odhod || '',
      odmorMin: z.malicaMin,
      vrsta: 'redno',
      /* V zapisu ostane, da gre za odobren popravek — brez tega bi bil videti
         kot navaden vnos. */
      opomba: `popravek odobren${z.prica ? ` · priča: ${z.prica}` : ''} · ${z.razlog}`,
    }, z.userId).catch(() => undefined);
  }
  return true;
}

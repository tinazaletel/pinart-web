/* MOJA VLOGA V ORGANIZACIJI — za pravice v evidenci delovnega časa.
 *
 * Evidenca po ZEPDSV ni navaden seznam: zapis o tem, kdaj je nekdo delal, je
 * dokument. Brisanje zato ni stvar vsakega uporabnika (Tina, 30. 8. 2026).
 *
 * Kdor je sam svoje podjetje, je lastnik in ima vse pravice — pravilo zaje le
 * ekipe, kjer sodelavec ne sme brisati svojih ur za nazaj.
 */

import { createClient } from '@/utils/supabase/client';
import { getOrganizationContext } from '@/lib/pinartFlowCloud';

export type Vloga = 'owner' | 'admin' | 'member';

export async function mojaVloga(): Promise<Vloga | null> {
  const ctx = await getOrganizationContext();
  if (!ctx) return null;
  const supa = createClient();
  const { data, error } = await supa
    .from('organization_members')
    .select('role')
    .eq('organization_id', ctx.organizationId)
    .eq('user_id', ctx.userId)
    .maybeSingle();
  if (error || !data) return null;
  const v = String((data as { role?: string }).role || '').toLowerCase();
  return v === 'owner' || v === 'admin' ? (v as Vloga) : 'member';
}

/** Sme brisati in popravljati tuje vnose v evidenci. */
export async function smemUrejatiEvidenco(): Promise<boolean> {
  const v = await mojaVloga();
  return v === 'owner' || v === 'admin';
}

export type Sodelavec = { id: string; ime: string; jaz?: boolean };

/* Sodelavci v moji organizaciji — za izbirnik nad evidenco.
 *
 * Bere prek /api/ekipa/clani in ne naravnost iz baze: imena in e-pošte živijo v
 * profiles in auth.users, ki jih RLS odjemalcu ne pokaže, zato jih strežnik
 * doda s service ključem. Prvi poskus (select profiles(...) iz brskalnika) je
 * tiho vračal prazen seznam in izbirnika ni bilo nikjer (Tina, 30. 8. 2026).
 */
export async function sodelavciEkipe(): Promise<Sodelavec[]> {
  try {
    const supa = createClient();
    const [odgovor, ctx, seja] = await Promise.all([
      fetch('/api/ekipa/clani'),
      getOrganizationContext(),
      supa.auth.getUser(),
    ]);
    if (!odgovor.ok) return [];
    /* Svoje ime poznamo tudi brez strežnika — v izbirniku ne sme nikoli pisati
       »zase«, ampak ime računa (Tina, 30. 8. 2026). */
    const meta = seja.data.user?.user_metadata as { full_name?: string; name?: string } | undefined;
    const mojeIme = (meta?.full_name || meta?.name || seja.data.user?.email?.split('@')[0] || '').trim();
    const j = await odgovor.json() as { clani?: Array<{ userId: string; fullName?: string; email?: string; isSelf?: boolean }> };
    return (j.clani || [])
      .map(c => {
        const jaz = (ctx?.userId && String(c.userId) === ctx.userId) || !!c.isSelf;
        return {
        id: String(c.userId),
        ime: (c.fullName || c.email || '').trim() || (jaz ? mojeIme : '') || 'sodelavec',
        /* Kdo sem jaz, določi MOJ id iz seje; zastavica s strežnika je rezerva. */
        jaz,
        };
      })
      .sort((a, b) => a.ime.localeCompare(b.ime, 'sl'));
  } catch {
    return [];
  }
}

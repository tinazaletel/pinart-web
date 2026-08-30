import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { omejiApi } from '@/lib/rate-limit';
import { preberiJson } from '@/lib/validacija';

export const dynamic = 'force-dynamic';

/* UKINITEV RAČUNA (pravica do izbrisa).
 *
 * Brisanje podatkov in ukinitev računa nista isto: prvo počisti orodja, drugo
 * odstrani osebo (Tina, 30. 8. 2026). Tu gre za drugo.
 *
 * Dve varovalki, ker je nepovratno:
 *   1. uporabnik mora prepisati svojo e-pošto — klik po nesreči ne zadošča,
 *   2. lastnik ekipe z drugimi člani računa ne more ukiniti, dokler lastništva
 *      ne prenese; sicer bi s sabo odnesel evidenco in dokumente sodelavcev.
 *
 * Podatki se pobrišejo prek `on delete cascade` na auth.users in organizations.
 */

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Prijava je potekla.' }, { status: 401 });

  const omejitev = await omejiApi(request, 'racun-ukini', 5, user.id);
  if (omejitev) return omejitev;

  const telo = await preberiJson<{ potrditev?: string }>(request);
  const vpisano = String(telo?.potrditev || '').trim().toLowerCase();
  if (!user.email || vpisano !== user.email.toLowerCase()) {
    return NextResponse.json({ error: 'Za potrditev prepiši svoj e-naslov.' }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: 'Ukinitev računa trenutno ni mogoča. Piši nam na tina@pinart.si.' }, { status: 503 });
  }

  /* Lastnik ekipe: najprej prenos lastništva, sicer bi z brisanjem odnesel
     podatke sodelavcev. Prenos je v Ekipa in dostop. */
  const { data: clanstva } = await admin
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id);

  for (const c of clanstva || []) {
    if (String(c.role) !== 'owner') continue;
    const { count } = await admin
      .from('organization_members')
      .select('user_id', { count: 'exact', head: true })
      .eq('organization_id', c.organization_id);
    if ((count || 0) > 1) {
      return NextResponse.json({
        error: 'Si lastnik ekipe z drugimi člani. Najprej prenesi lastništvo v Ekipa in dostop, potem lahko ukineš račun.',
      }, { status: 409 });
    }
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return NextResponse.json({ error: 'Računa ni bilo mogoče ukiniti. Piši nam na tina@pinart.si.' }, { status: 500 });

  await supabase.auth.signOut().catch(() => undefined);
  return NextResponse.json({ ok: true });
}

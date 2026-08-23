/* Kazalnik Pupine porabe — SAMO branje, nič ne šteje in nič ne blokira.
 *
 * Brez tega uporabnica za mesečno kapo izve šele, ko vanjo udari (429 iz
 * app/api/pupa). Meja, ki pride kot presenečenje sredi dela, izgleda kot
 * okvara — zato mora biti stanje vidno vnaprej.
 *
 * Vir je NAMENOMA isti kot v app/api/pupa: ista RPC (ai_usage_month_count) in
 * ista funkcija za kvoto (pupaMesecnaKvota). Drugačen vir bi pomenil, da se
 * številka na zaslonu in meja v zaledju prej ali slej razideta.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { omejiApi } from '@/lib/rate-limit';
import { pupaMesecnaKvota } from '@/lib/paketi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* Kapa se veže na koledarski mesec (date_trunc('month', now()) v RPC), zato je
   obnovitev prvi dan naslednjega meseca — enako kot izračuna app/api/pupa. */
function obnovitevKvote(): string {
  const zdaj = new Date();
  return new Date(Date.UTC(zdaj.getUTCFullYear(), zdaj.getUTCMonth() + 1, 1)).toISOString();
}

/* Neznana poraba NI napaka, ampak del pogodbe: vmesnik v tem primeru ne pokaže
   ničesar. FAIL-OPEN kot v app/api/pupa — če manjka migracija ali RPC, naj se
   Pupa vede kot prej in ne javlja 500 zaradi postranskega kazalnika. */
function neznano(obnovitev: string) {
  return NextResponse.json({ porabljeno: null, kvota: null, obnovitev });
}

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ napaka: 'Za uporabo Pupe se prijavi.' }, { status: 401 });
  }

  const omejitev = await omejiApi(request, 'pupa-poraba', 60, user.id);
  if (omejitev) return omejitev;

  const obnovitev = obnovitevKvote();

  try {
    const { data: entitlementRows, error: entitlementError } = await supabase.rpc('current_organization_entitlements');
    const entitlement = Array.isArray(entitlementRows) ? entitlementRows[0] : null;
    if (entitlementError || !entitlement?.organization_id) return neznano(obnovitev);

    /* Enak pogoj veljavnosti kot v app/api/pupa: komur Pupa ne dela, mu števec
       kvote ne pove nič uporabnega — raje ne pokažemo ničesar kot napačno mejo. */
    const validUntil = entitlement.valid_until ? new Date(String(entitlement.valid_until)).getTime() : null;
    const veljaven = (entitlement.status === 'active' || entitlement.status === 'trialing')
      && (!validUntil || validUntil >= Date.now());
    if (!veljaven) return neznano(obnovitev);

    const kvota = pupaMesecnaKvota(String(entitlement.tier));
    if (!Number.isFinite(kvota) || kvota <= 0) return neznano(obnovitev);

    const { data: monthCount, error } = await supabase.rpc('ai_usage_month_count', {
      p_organization_id: String(entitlement.organization_id),
    });
    if (error || typeof monthCount !== 'number') return neznano(obnovitev);

    return NextResponse.json({
      porabljeno: monthCount,
      kvota: Math.floor(kvota),
      obnovitev,
    });
  } catch {
    return neznano(obnovitev);
  }
}

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { jePotekla, potIzida } from '@/lib/obvescanje';

/* POTRDITEV PRIJAVE (dvojna privolitev).
 *
 * Do tega klika seznama ni: brez potrditve ne posljemo nicesar. Sele tu
 * nastane privolitev, ki jo znamo tudi dokazati — s casom in razlicico
 * pogojev, zapisano ob prijavi.
 *
 * Povezava je GET iz maila, zato brez prijave in brez piskotkov. */

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const zeton = new URL(request.url).searchParams.get('zeton') || '';
  const naStran = (stanje: 'potrjeno' | 'poteklo' | 'napaka', jezik = 'sl') =>
    NextResponse.redirect(new URL(potIzida(jezik, stanje), request.url));

  if (!zeton || zeton.length > 64) return naStran('napaka');
  const admin = createAdminClient();
  if (!admin) return naStran('napaka');

  const { data: prijava } = await admin
    .from('obvescanje_prijave').select('id, jezik, ustvarjeno, potrjeno_ob').eq('zeton', zeton).maybeSingle();
  if (!prijava) return naStran('napaka');

  const jezik = prijava.jezik === 'en' ? 'en' : 'sl';
  if (prijava.potrjeno_ob) return naStran('potrjeno', jezik);

  /* Nepotrjena prijava po roku ni vec veljavna — privolitve zanjo nimamo,
     zato zapis izbrisemo, namesto da bi ga potrdili za nazaj. */
  if (jePotekla(String(prijava.ustvarjeno), new Date())) {
    await admin.from('obvescanje_prijave').delete().eq('id', prijava.id);
    return naStran('poteklo', jezik);
  }

  const { error } = await admin
    .from('obvescanje_prijave').update({ potrjeno_ob: new Date().toISOString() }).eq('id', prijava.id);
  if (error) {
    console.error('Potrditev obvescanja ni uspela:', error.message);
    return naStran('napaka', jezik);
  }
  return naStran('potrjeno', jezik);
}

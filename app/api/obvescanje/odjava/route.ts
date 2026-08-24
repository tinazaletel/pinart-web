import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { omejiApi } from '@/lib/rate-limit';
import { jeEmail, preberiJson } from '@/lib/validacija';
import { normalizirajEmail, potIzida } from '@/lib/obvescanje';

/* ODJAVA — vrstico RES izbrise.
 *
 * Prej je odjava pocistila samo brskalnik tistega cloveka, njegov naslov pa
 * je ostal pri nas. Obljuba odjave, ki se ne izvede, je pred GDPR huja od
 * tega, da odjave sploh ne bi ponujali.
 *
 * En klik, brez prijave, brez vprasanja "ste prepricani" — odjava mora biti
 * lazja od prijave. */

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const zeton = new URL(request.url).searchParams.get('zeton') || '';
  const naStran = (stanje: 'odjavljeno' | 'napaka', jezik = 'sl') =>
    NextResponse.redirect(new URL(potIzida(jezik, stanje), request.url));

  if (!zeton || zeton.length > 64) return naStran('napaka');
  const admin = createAdminClient();
  if (!admin) return naStran('napaka');

  const { data: prijava } = await admin
    .from('obvescanje_prijave').select('id, jezik').eq('zeton', zeton).maybeSingle();
  /* Ze odjavljen naslov ne sme videti napake: zanj je izid isti — ni ga vec. */
  if (!prijava) return naStran('odjavljeno');

  const jezik = prijava.jezik === 'en' ? 'en' : 'sl';
  const { error } = await admin.from('obvescanje_prijave').delete().eq('id', prijava.id);
  if (error) {
    console.error('Odjava od obvescanja ni uspela:', error.message);
    return naStran('napaka', jezik);
  }
  return naStran('odjavljeno', jezik);
}

/* Odjava iz vmesnika (gumb v profilu), kjer zetona nimamo — poznamo pa
   e-naslov. Pot samo BRISE; ne pove, ali je naslov obstajal, zato z njo ni
   mogoce ugotavljati, kdo je na seznamu. */
export async function POST(request: Request) {
  const omejitev = await omejiApi(request, 'obvescanje-odjava', 5);
  if (omejitev) return omejitev;

  let telo: Record<string, unknown>;
  try { telo = await preberiJson(request, 2_000); }
  catch { return NextResponse.json({ ok: true }); }
  if (!jeEmail(telo.email)) return NextResponse.json({ ok: true });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ ok: true });
  const { error } = await admin
    .from('obvescanje_prijave').delete().eq('email', normalizirajEmail(String(telo.email)));
  if (error) console.error('Odjava po e-naslovu ni uspela:', error.message);
  return NextResponse.json({ ok: true });
}

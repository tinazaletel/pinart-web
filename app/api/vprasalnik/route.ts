import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { omejiApi } from '@/lib/rate-limit';
import { preberiJson, sporociloValidacije } from '@/lib/validacija';
import { ustvariZeton } from '@/lib/vprasalnikZeton';
import { ocistiVprasanja, privzetaVprasanja } from '@/lib/vprasalnik';

/* IZDAJA POVEZAVE ZA VPRAŠALNIK — samo za prijavljeno lastnico/skrbnico.
 *
 * Vse ostalo (seznam, urejanje vprašanj, branje odgovorov) teče neposredno
 * prek Supabase pod RLS; strežnik je potreben samo tam, kjer se dela ŽETON:
 * ta se zgosti in v bazo gre samo zgostitev, uporabnici pa se pokaže enkrat.
 */

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function kontekst(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { napaka: NextResponse.json({ napaka: 'Prijava je potekla.' }, { status: 401 }) };

  const omejitev = await omejiApi(request, 'vprasalnik-upravljanje', 40, user.id);
  if (omejitev) return { napaka: omejitev };

  const admin = createAdminClient();
  if (!admin) return { napaka: NextResponse.json({ napaka: 'Vprašalniki niso nastavljeni.' }, { status: 503 }) };

  const { data: clanstvo } = await admin.from('organization_members')
    .select('organization_id, role').eq('user_id', user.id).limit(1).maybeSingle();
  if (!clanstvo) return { napaka: NextResponse.json({ napaka: 'Podjetje ni povezano.' }, { status: 403 }) };
  /* Povezava navzven je odločitev lastnika ali skrbnika, ne vsakega člana. */
  if (!['owner', 'admin'].includes(String(clanstvo.role))) {
    return { napaka: NextResponse.json({ napaka: 'Za to dejanje nimaš dovoljenja.' }, { status: 403 }) };
  }
  return { admin, organizationId: String(clanstvo.organization_id) };
}

/* POST { naslov?, uvod?, vprasanja?, jeEn? } -> nov vprašalnik; žeton vrne ENKRAT */
export async function POST(request: Request) {
  const ctx = await kontekst(request);
  if ('napaka' in ctx) return ctx.napaka;

  let telo: { naslov?: unknown; uvod?: unknown; vprasanja?: unknown; jeEn?: unknown };
  try { telo = await preberiJson(request, 40_000); }
  catch (napaka) { return NextResponse.json({ napaka: sporociloValidacije(napaka) }, { status: 400 }); }

  const jeEn = telo.jeEn === true;
  const naslov = String(telo.naslov || '').trim().slice(0, 200)
    || (jeEn ? 'Project inquiry' : 'Povpraševanje za projekt');
  const uvod = String(telo.uvod || '').trim().slice(0, 2000) || null;
  const vprasanja = telo.vprasanja ? ocistiVprasanja(telo.vprasanja) : privzetaVprasanja(jeEn);
  if (!vprasanja.length) return NextResponse.json({ napaka: 'Vprašalnik brez vprašanj.' }, { status: 400 });

  const { zeton, zgostitev } = ustvariZeton();
  const { data, error } = await ctx.admin.from('vprasalniki').insert({
    organization_id: ctx.organizationId,
    naslov, uvod, vprasanja, zeton_zgostitev: zgostitev,
  }).select('id').single();

  if (error) return NextResponse.json({ napaka: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id, zeton });
}

/* PATCH { id } -> izda NOV žeton (stara povezava neha delati) */
export async function PATCH(request: Request) {
  const ctx = await kontekst(request);
  if ('napaka' in ctx) return ctx.napaka;

  let telo: { id?: unknown };
  try { telo = await preberiJson(request, 2_000); }
  catch (napaka) { return NextResponse.json({ napaka: sporociloValidacije(napaka) }, { status: 400 }); }

  const id = String(telo.id || '');
  if (!UUID.test(id)) return NextResponse.json({ napaka: 'Neveljaven vprašalnik.' }, { status: 400 });

  const { zeton, zgostitev } = ustvariZeton();
  const { error } = await ctx.admin.from('vprasalniki')
    .update({ zeton_zgostitev: zgostitev, updated_at: new Date().toISOString() })
    .eq('id', id).eq('organization_id', ctx.organizationId);

  if (error) return NextResponse.json({ napaka: error.message }, { status: 500 });
  return NextResponse.json({ zeton });
}

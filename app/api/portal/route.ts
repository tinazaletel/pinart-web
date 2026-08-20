import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { omejiApi } from '@/lib/rate-limit';
import { preberiJson, sporociloValidacije } from '@/lib/validacija';
import { ustvariPortalZeton } from '@/lib/portalZeton';

/* UPRAVLJANJE POVEZAV ZA STRANKO — samo za prijavljeno lastnico/admina.
   Javni ogled je drugje (/api/portal/[zeton]) in ne deli te poti, da se
   pravici ne moreta pomešati. */

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function kontekst(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { napaka: NextResponse.json({ napaka: 'Prijava je potekla.' }, { status: 401 }) };

  const omejitev = await omejiApi(request, 'portal-upravljanje', 40, user.id);
  if (omejitev) return { napaka: omejitev };

  const admin = createAdminClient();
  if (!admin) return { napaka: NextResponse.json({ napaka: 'Portal ni nastavljen.' }, { status: 503 }) };

  const { data: clanstvo } = await admin.from('organization_members')
    .select('organization_id, role').eq('user_id', user.id).limit(1).maybeSingle();
  if (!clanstvo) return { napaka: NextResponse.json({ napaka: 'Podjetje ni povezano.' }, { status: 403 }) };
  /* Deljenje NAVZVEN je odločitev lastnika — član povezave ne sme ustvariti. */
  if (!['owner', 'admin'].includes(String(clanstvo.role))) {
    return { napaka: NextResponse.json({ napaka: 'Za to dejanje nimaš dovoljenja.' }, { status: 403 }) };
  }
  return { admin, user, organizationId: String(clanstvo.organization_id) };
}

/* GET ?projekt=<external_id> -> povezave za ta projekt (brez žetonov) */
export async function GET(request: Request) {
  const ctx = await kontekst(request);
  if ('napaka' in ctx) return ctx.napaka;

  const projekt = new URL(request.url).searchParams.get('projekt') || '';
  if (!projekt) return NextResponse.json({ povezave: [] });

  const { data, error } = await ctx.admin.from('portal_dostopi')
    .select('id,prejemnik,created_at,expires_at,revoked_at,last_seen_at,ogledov')
    .eq('organization_id', ctx.organizationId)
    .eq('projekt_external_id', projekt)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ napaka: 'Povezav ni bilo mogoče prebrati.' }, { status: 500 });
  return NextResponse.json({ povezave: data ?? [] });
}

/* POST { projekt, prejemnik?, dni? } -> ustvari povezavo; žeton vrne ENKRAT */
export async function POST(request: Request) {
  const ctx = await kontekst(request);
  if ('napaka' in ctx) return ctx.napaka;

  let telo: { projekt?: unknown; prejemnik?: unknown; dni?: unknown };
  try {
    telo = await preberiJson(request, 4_000);
  } catch (e) {
    return NextResponse.json({ napaka: sporociloValidacije(e) }, { status: 400 });
  }
  const projekt = typeof telo.projekt === 'string' ? telo.projekt.trim() : '';
  const prejemnik = typeof telo.prejemnik === 'string' ? telo.prejemnik.trim().slice(0, 120) : '';
  const dni = Number(telo.dni);
  if (!projekt || projekt.length > 200) {
    return NextResponse.json({ napaka: 'Manjka projekt.' }, { status: 400 });
  }

  /* Projekt mora obstajati v TVOJI organizaciji — sicer bi povezava odprla tuj zapis. */
  const { data: obstaja } = await ctx.admin.from('projects')
    .select('id').eq('organization_id', ctx.organizationId).eq('external_id', projekt)
    .is('deleted_at', null).limit(1).maybeSingle();
  if (!obstaja) return NextResponse.json({ napaka: 'Projekta ni mogoče najti.' }, { status: 404 });

  const { zeton, zgostitev } = ustvariPortalZeton();
  const expires = Number.isFinite(dni) && dni > 0
    ? new Date(Date.now() + Math.min(dni, 365) * 86400000).toISOString()
    : null;

  const { error } = await ctx.admin.from('portal_dostopi').insert({
    organization_id: ctx.organizationId,
    projekt_external_id: projekt,
    zeton_zgostitev: zgostitev,
    prejemnik: prejemnik || null,
    created_by: ctx.user.id,
    expires_at: expires,
  });
  if (error) return NextResponse.json({ napaka: 'Povezave ni bilo mogoče ustvariti.' }, { status: 500 });

  /* Žeton se vrne SAMO tu in nikoli več — v bazi je le zgostitev. */
  return NextResponse.json({ zeton });
}

/* PATCH { id } -> prekliči povezavo (ne briše; ostane sled, komu si jo dala) */
export async function PATCH(request: Request) {
  const ctx = await kontekst(request);
  if ('napaka' in ctx) return ctx.napaka;

  let telo: { id?: unknown };
  try {
    telo = await preberiJson(request, 2_000);
  } catch (e) {
    return NextResponse.json({ napaka: sporociloValidacije(e) }, { status: 400 });
  }
  const id = typeof telo.id === 'string' ? telo.id : '';
  if (!UUID.test(id)) return NextResponse.json({ napaka: 'Neveljavna povezava.' }, { status: 400 });

  const { error } = await ctx.admin.from('portal_dostopi')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id).eq('organization_id', ctx.organizationId);
  if (error) return NextResponse.json({ napaka: 'Preklic ni uspel.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

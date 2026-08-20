import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { omejiApi } from '@/lib/rate-limit';
import { preberiJson, sporociloValidacije } from '@/lib/validacija';
import { pridobiZig, preveriZig, tsaNaslov } from '@/lib/casovniZig';

/* OVERJEN CASOVNI ZIG ZA ZAPIS V SEFU (RFC 3161).
   POST { zapisId } -> pri neodvisnem strezniku pridobi podpisan casovni zeton
   za zgostitev tega zapisa in ga shrani.
   GET  ?zapisId=... -> preveri ze shranjen zeton (cas + ujemanje zgostitve).

   Branje in pisanje gresta prek UPORABNIKOVEGA odjemalca, da velja RLS —
   zigosati je mogoce samo zapis, ki ga uporabnik po pravilih sme videti.
   Admin odjemalec je tu samo za rate-limit (ta si vodi svoje okno). */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Kontekst = { supabase: ReturnType<typeof createClient>; userId: string; organizationId: string };

async function kontekst(request: Request, pot: string, meja: number): Promise<Kontekst | { napaka: NextResponse }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { napaka: NextResponse.json({ napaka: 'Prijava je potekla.' }, { status: 401 }) };

  const omejitev = await omejiApi(request, pot, meja, user.id);
  if (omejitev) return { napaka: omejitev };

  /* Clanstvo beremo s service-role, ker RLS na organization_members ne sme
     odlocati o tem, ali je uporabnik sploh v organizaciji (vzorec iz
     app/api/portal/route.ts). */
  const admin = createAdminClient();
  if (!admin) return { napaka: NextResponse.json({ napaka: 'Sef ni nastavljen.' }, { status: 503 }) };
  const { data: clanstvo } = await admin.from('organization_members')
    .select('organization_id').eq('user_id', user.id).limit(1).maybeSingle();
  if (!clanstvo) return { napaka: NextResponse.json({ napaka: 'Podjetje ni povezano.' }, { status: 403 }) };

  return { supabase, userId: user.id, organizationId: String(clanstvo.organization_id) };
}

/* Lokalni Zapis.id je prost niz (npr. "1755720000000-42"), ne UUID — omejimo
   ga po dolzini in naboru znakov, da ne pride v poizvedbo kaj nepricakovanega. */
function veljavenZapisId(vrednost: unknown): string {
  const id = typeof vrednost === 'string' ? vrednost.trim() : '';
  return /^[\w.:-]{1,120}$/.test(id) ? id : '';
}

async function najdiZapis(ctx: Kontekst, zapisId: string) {
  return ctx.supabase.from('sef_zapisi')
    .select('id,zgostitev,zig_zeton,zig_cas,zig_streznik,zig_stanje')
    .eq('organization_id', ctx.organizationId)
    .eq('external_id', zapisId)
    .is('deleted_at', null)
    .limit(1).maybeSingle();
}

export async function POST(request: Request) {
  /* Vsak zig je zunanji klic na TSA, zato je meja nizja kot pri notranjih poteh. */
  const ctx = await kontekst(request, 'sef-casovni-zig', 20);
  if ('napaka' in ctx) return ctx.napaka;

  let telo: { zapisId?: unknown };
  try {
    telo = await preberiJson(request, 2_000);
  } catch (e) {
    return NextResponse.json({ napaka: sporociloValidacije(e) }, { status: 400 });
  }
  const zapisId = veljavenZapisId(telo.zapisId);
  if (!zapisId) return NextResponse.json({ napaka: 'Manjka zapis.' }, { status: 400 });

  const { data: zapis, error } = await najdiZapis(ctx, zapisId);
  if (error) return NextResponse.json({ napaka: 'Zapisa ni bilo mogoce prebrati.' }, { status: 500 });
  if (!zapis) return NextResponse.json({ napaka: 'Zapisa v sefu ni mogoce najti.' }, { status: 404 });

  /* Zig je nespremenljiv dokaz — ce ze obstaja, ga ne menjamo (nov zig bi
     pomenil poznejsi cas in bi dokaz oslabil, ne okrepil). */
  if (zapis.zig_stanje === 'overjeno' && zapis.zig_zeton) {
    return NextResponse.json({
      ze: true, stanje: 'overjeno', cas: zapis.zig_cas, streznik: zapis.zig_streznik,
    });
  }

  const zgostitev = String(zapis.zgostitev || '').trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(zgostitev)) {
    return NextResponse.json({ napaka: 'Zapis nima veljavne zgostitve.' }, { status: 400 });
  }

  try {
    /* ▸ EDINO MESTO, KJER GRE KAJ NAVZVEN ◂
       Na neodvisni streznik posljemo SAMO teh 32 bajtov zgostitve. Nikoli
       datoteke, imena datoteke, naslova dela, imena stranke, opomb ali id-ja
       organizacije. To je tudi bistvo funkcije: TSA potrdi CAS, ne izve pa,
       KAJ je bilo zigosano. Ce bi kdaj kdo hotel v ta klic dodati se kaj,
       to ni "izboljsava" — to je razkritje. */
    const zig = await pridobiZig(zgostitev);

    const { error: napakaZapisa } = await ctx.supabase.from('sef_zapisi').update({
      zig_zeton: zig.zetonBase64,
      zig_cas: zig.cas.toISOString(),
      zig_streznik: zig.streznik,
      zig_stanje: 'overjeno',
      updated_at: new Date().toISOString(),
    }).eq('id', zapis.id).eq('organization_id', ctx.organizationId);
    if (napakaZapisa) return NextResponse.json({ napaka: 'Ziga ni bilo mogoce shraniti.' }, { status: 500 });

    return NextResponse.json({
      stanje: 'overjeno',
      cas: zig.cas.toISOString(),
      streznik: zig.streznik,
      serijska: zig.serijska,
      zeton: zig.zetonBase64,
    });
  } catch (e) {
    const sporocilo = e instanceof Error ? e.message : 'Casovnega ziga ni bilo mogoce pridobiti.';
    /* Neuspeh zabelezimo, da vmesnik ve, da je bil poskus in kje je zastalo. */
    await ctx.supabase.from('sef_zapisi').update({
      zig_stanje: 'napaka',
      zig_streznik: tsaNaslov(),
      updated_at: new Date().toISOString(),
    }).eq('id', zapis.id).eq('organization_id', ctx.organizationId);
    return NextResponse.json({ stanje: 'napaka', napaka: sporocilo }, { status: 502 });
  }
}

/* GET ?zapisId=... — PREVERJANJE: iz shranjenega zetona preberi cas in
   zgostitev ter ju primerjaj z zapisom. Uporabnica mora znati dokazati, ne le
   shraniti. Kriptografski podpis TSA preveri openssl (docs/SEF-casovni-zig.md). */
export async function GET(request: Request) {
  const ctx = await kontekst(request, 'sef-casovni-zig-preveri', 60);
  if ('napaka' in ctx) return ctx.napaka;

  const zapisId = veljavenZapisId(new URL(request.url).searchParams.get('zapisId'));
  if (!zapisId) return NextResponse.json({ napaka: 'Manjka zapis.' }, { status: 400 });

  const { data: zapis, error } = await najdiZapis(ctx, zapisId);
  if (error) return NextResponse.json({ napaka: 'Zapisa ni bilo mogoce prebrati.' }, { status: 500 });
  if (!zapis) return NextResponse.json({ napaka: 'Zapisa v sefu ni mogoce najti.' }, { status: 404 });
  if (!zapis.zig_zeton) return NextResponse.json({ stanje: zapis.zig_stanje || 'caka' });

  const izid = preveriZig(zapis.zig_zeton, String(zapis.zgostitev || ''));
  /* Žeton vrnemo vedno — brez njega uporabnica ne more nič dokazati tretji
     osebi (openssl ts -verify). Ni skrivnost: vsebuje le zgostitev in čas. */
  return NextResponse.json(izid.ujema
    ? { stanje: 'overjeno', ujema: true, cas: izid.cas.toISOString(), serijska: izid.serijska, politika: izid.politika, streznik: zapis.zig_streznik, zgostitev: zapis.zgostitev, zeton: zapis.zig_zeton }
    : { stanje: 'napaka', ujema: false, napaka: izid.napaka, cas: izid.cas?.toISOString() ?? null, streznik: zapis.zig_streznik, zgostitev: zapis.zgostitev, zeton: zapis.zig_zeton });
}

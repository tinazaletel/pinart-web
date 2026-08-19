import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { omejiApi } from '@/lib/rate-limit';
import { preberiJson, sporociloValidacije } from '@/lib/validacija';
import { OBSEGI, ustvariNovKljuc, type Obseg } from '@/lib/apiKljuc';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/*
  UPRAVLJANJE API KLJUCEV (zaledje nastavitev).

  Te tri poti so zascitene s PRIJAVO UPORABNIKA (piskotek + `organization_members`),
  NIKOLI z API kljucem — s kljucem ni mogoce izdati novega kljuca ali si pogledati
  ostalih. Tako preklic enega kljuca res zapre vrata.

  Uporabljamo uporabnikov (RLS) odjemalec, ne service-role: politike v migraciji
  20260820030000 dovolijo branje/pisanje samo adminu/lastniku, zato baza preveri
  pravico se enkrat, tudi ce bi se v spodnjem preverjanju vloge zataknilo.
*/

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Najvec hkrati veljavnih kljucev na organizacijo — meja proti nabiranju pozabljenih kljucev. */
const NAJVEC_VELJAVNIH = 20;

type Kontekst = { organizationId: string; role: string };

async function kontekst(supabase: ReturnType<typeof createClient>, userId: string): Promise<Kontekst | null> {
  const { data } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', userId)
    .limit(1);
  const vrstica = data?.[0];
  return vrstica ? { organizationId: String(vrstica.organization_id), role: String(vrstica.role) } : null;
}

type Preverba =
  | { napaka: NextResponse; supabase?: undefined; ctx?: undefined }
  | { napaka?: undefined; supabase: ReturnType<typeof createClient>; ctx: Kontekst };

/** Prijava + skrbniska vloga. Vrne kontekst ali pripravljen odgovor z napako. */
async function zahtevajAdmina(request: Request, pot: string, meja: number): Promise<Preverba> {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { napaka: NextResponse.json({ error: 'Prijava je potekla.' }, { status: 401 }) };
  }
  const omejitev = await omejiApi(request, pot, meja, user.id);
  if (omejitev) return { napaka: omejitev };

  const ctx = await kontekst(supabase, user.id);
  if (!ctx) return { napaka: NextResponse.json({ error: 'Podjetje ni povezano.' }, { status: 403 }) };
  if (ctx.role !== 'owner' && ctx.role !== 'admin') {
    return { napaka: NextResponse.json({ error: 'API ključe ureja le skrbnik podjetja.' }, { status: 403 }) };
  }
  return { supabase, ctx };
}

/* Zgostitve NIKOLI ni v izbranih stolpcih — niti admin je ne potrebuje videti. */
const STOLPCI = 'id, ime, predpona, obseg, created_at, last_used_at, revoked_at';

function preslikaj(v: Record<string, unknown>) {
  return {
    id: String(v.id),
    ime: v.ime ? String(v.ime) : '',
    predpona: v.predpona ? String(v.predpona) : '',
    obseg: Array.isArray(v.obseg) ? v.obseg.map((o) => String(o)) : [],
    ustvarjen: v.created_at ? String(v.created_at) : null,
    zadnjaRaba: v.last_used_at ? String(v.last_used_at) : null,
    preklican: v.revoked_at ? String(v.revoked_at) : null,
  };
}

/** Seznam kljucev organizacije — brez zgostitev in brez celih kljucev. */
export async function GET(request: Request) {
  const { napaka, supabase, ctx } = await zahtevajAdmina(request, 'kljuci-seznam', 40);
  if (napaka) return napaka;

  const { data, error } = await supabase!
    .from('api_kljuci')
    .select(STOLPCI)
    .eq('organization_id', ctx!.organizationId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('API kljuci: branje seznama ni uspelo:', error.message);
    return NextResponse.json({ error: 'Ključev ni bilo mogoče prebrati.' }, { status: 500 });
  }

  return NextResponse.json({ kljuci: (data || []).map(preslikaj) });
}

/** Ustvari nov kljuc. Cel kljuc je v odgovoru ENKRAT in nikjer drugje. */
export async function POST(request: Request) {
  const { napaka, supabase, ctx } = await zahtevajAdmina(request, 'kljuci-ustvari', 10);
  if (napaka) return napaka;

  let telo: { ime?: unknown; obseg?: unknown };
  try { telo = await preberiJson(request, 5_000); }
  catch (error) { return NextResponse.json({ error: sporociloValidacije(error) }, { status: 400 }); }

  const ime = String(telo.ime ?? '').trim().slice(0, 80) || 'API ključ';

  /* Obseg: samo znane oznake, brez podvojitev; brez navedbe = najmanj pravic. */
  const zahtevanObseg = Array.isArray(telo.obseg) ? telo.obseg.map((o) => String(o)) : ['branje'];
  const neznan = zahtevanObseg.find((o) => !(OBSEGI as readonly string[]).includes(o));
  if (neznan) return NextResponse.json({ error: 'Neveljaven obseg pravic.' }, { status: 400 });
  const obseg: Obseg[] = Array.from(new Set(zahtevanObseg)) as Obseg[];
  if (!obseg.length) obseg.push('branje');

  const { count } = await supabase!
    .from('api_kljuci')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', ctx!.organizationId)
    .is('revoked_at', null);
  if ((count ?? 0) >= NAJVEC_VELJAVNIH) {
    return NextResponse.json(
      { error: `Preveč veljavnih ključev (največ ${NAJVEC_VELJAVNIH}). Najprej prekliči kakšnega.` },
      { status: 400 },
    );
  }

  const { kljuc, predpona, zgostitev } = ustvariNovKljuc();
  const { data, error } = await supabase!
    .from('api_kljuci')
    .insert({ organization_id: ctx!.organizationId, ime, predpona, zgostitev, obseg })
    .select(STOLPCI)
    .single();
  if (error) {
    /* Sporocilo baze gre v dnevnik, kljuc NIKOLI — niti ob napaki. */
    console.error('API kljuci: ustvarjanje ni uspelo:', error.message);
    return NextResponse.json({ error: 'Ključa ni bilo mogoče ustvariti.' }, { status: 500 });
  }

  return NextResponse.json({
    kljuc,
    opozorilo: 'Ključ je prikazan samo zdaj. Shrani ga na varno — pozneje ga ni mogoče znova prikazati.',
    zapis: preslikaj(data as Record<string, unknown>),
  });
}

/** Preklic kljuca. Vrstica ostane (sled), samo dobi `revoked_at`. */
export async function DELETE(request: Request) {
  const { napaka, supabase, ctx } = await zahtevajAdmina(request, 'kljuci-preklic', 20);
  if (napaka) return napaka;

  let telo: { id?: unknown };
  try { telo = await preberiJson(request, 5_000); }
  catch (error) { return NextResponse.json({ error: sporociloValidacije(error) }, { status: 400 }); }

  const id = String(telo.id ?? '').trim();
  if (!UUID.test(id)) return NextResponse.json({ error: 'Neveljaven ključ.' }, { status: 400 });

  const { data, error } = await supabase!
    .from('api_kljuci')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', ctx!.organizationId)
    .is('revoked_at', null)
    .select(STOLPCI)
    .maybeSingle();
  if (error) {
    console.error('API kljuci: preklic ni uspel:', error.message);
    return NextResponse.json({ error: 'Ključa ni bilo mogoče preklicati.' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Ključa ni ali je že preklican.' }, { status: 404 });

  return NextResponse.json({ zapis: preslikaj(data as Record<string, unknown>) });
}

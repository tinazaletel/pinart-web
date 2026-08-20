import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { omejiApi } from '@/lib/rate-limit';
import { preberiJson, sporociloValidacije } from '@/lib/validacija';
import { preberiClanstvo } from '@/lib/clanstvo';

/* VRSTA NALOG — vmesnik do odloženega dela.
 *
 * Tu se naloga samo ZAPIŠE. Nihče je tukaj ne opravi; to naredi urnik
 * (app/api/cron/agent-naloge). Zato je odziv hiter tudi za deset nalog in
 * uporabnica lahko takoj zapre okno.
 */

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_BESEDILO = 8_000;
const MAX_NAENKRAT = 20;

/* Kar vidi vmesnik. Skrivnosti (connection secret) tu ni in je ne sme biti. */
const POLJA = 'id,besedilo,connection_id,projekt_external_id,stanje,odgovor,napaka,model,poskusi,created_at,zacetek,konec';

async function kontekst(request: Request, pot: string, meja: number) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { napaka: NextResponse.json({ napaka: 'Prijava je potekla.' }, { status: 401 }) };

  const omejitev = await omejiApi(request, pot, meja, user.id);
  if (omejitev) return { napaka: omejitev };

  const admin = createAdminClient();
  if (!admin) return { napaka: NextResponse.json({ napaka: 'Vrsta nalog ni nastavljena.' }, { status: 503 }) };

  const clanstvo = await preberiClanstvo(admin, null, user.id);
  if (!clanstvo || clanstvo.disabled_at) {
    return { napaka: NextResponse.json({ napaka: 'Podjetje ni povezano.' }, { status: 403 }) };
  }
  return { admin, user, organizationId: String(clanstvo.organization_id) };
}

/* GET -> zadnje naloge te uporabnice. Vmesnik to kliče v zanki, zato je
   poizvedba ozka in omejena. */
export async function GET(request: Request) {
  const ctx = await kontekst(request, 'agent-naloge-branje', 240);
  if ('napaka' in ctx) return ctx.napaka;

  const { data, error } = await ctx.admin.from('agent_naloge')
    .select(POLJA)
    .eq('organization_id', ctx.organizationId)
    .eq('user_id', ctx.user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(60);

  if (error) return NextResponse.json({ napaka: 'Nalog ni bilo mogoče prebrati.' }, { status: 500 });
  return NextResponse.json({ naloge: data ?? [] });
}

/* POST { naloge: [{ besedilo, connectionId?, projekt? }] } -> zapiše v vrsto */
export async function POST(request: Request) {
  const ctx = await kontekst(request, 'agent-naloge-vpis', 60);
  if ('napaka' in ctx) return ctx.napaka;

  let telo: { naloge?: unknown };
  try { telo = await preberiJson(request, 200_000); }
  catch (error) { return NextResponse.json({ napaka: sporociloValidacije(error) }, { status: 400 }); }

  if (!Array.isArray(telo.naloge) || telo.naloge.length === 0) {
    return NextResponse.json({ napaka: 'Ni nalog za zagon.' }, { status: 400 });
  }
  if (telo.naloge.length > MAX_NAENKRAT) {
    return NextResponse.json({ napaka: `Naenkrat lahko oddaš največ ${MAX_NAENKRAT} nalog.` }, { status: 400 });
  }

  const vrstice: Record<string, unknown>[] = [];
  for (const surova of telo.naloge as Record<string, unknown>[]) {
    const besedilo = typeof surova?.besedilo === 'string' ? surova.besedilo.trim() : '';
    if (!besedilo || besedilo.length > MAX_BESEDILO) {
      return NextResponse.json({ napaka: 'Naloga je prazna ali predolga.' }, { status: 400 });
    }
    const connectionId = typeof surova?.connectionId === 'string' ? surova.connectionId : '';
    if (connectionId && !UUID.test(connectionId)) {
      return NextResponse.json({ napaka: 'Izvajalec ni veljaven.' }, { status: 400 });
    }
    const projekt = typeof surova?.projekt === 'string' ? surova.projekt.slice(0, 120) : '';
    vrstice.push({
      organization_id: ctx.organizationId,
      user_id: ctx.user.id,
      besedilo,
      connection_id: connectionId || null,
      projekt_external_id: projekt || null,
    });
  }

  /* Povezave preverimo PREDEN karkoli zapišemo — sicer bi naloga obvisela v
     vrsti in šele urnik bi ugotovil, da izvajalca ni. */
  const povezave = Array.from(new Set(vrstice.map(v => v.connection_id).filter(Boolean))) as string[];
  if (povezave.length) {
    const { data: najdene } = await ctx.admin.from('organization_ai_connections')
      .select('id').eq('organization_id', ctx.organizationId).in('id', povezave);
    if ((najdene?.length ?? 0) !== povezave.length) {
      return NextResponse.json({ napaka: 'Ena od izbranih povezav ne obstaja.' }, { status: 400 });
    }
  }

  const { data, error } = await ctx.admin.from('agent_naloge').insert(vrstice).select(POLJA);
  if (error) return NextResponse.json({ napaka: 'Nalog ni bilo mogoče shraniti.' }, { status: 500 });
  return NextResponse.json({ naloge: data ?? [] });
}

/* PATCH { id, dejanje: 'preklici' | 'izbrisi' } */
export async function PATCH(request: Request) {
  const ctx = await kontekst(request, 'agent-naloge-vpis', 60);
  if ('napaka' in ctx) return ctx.napaka;

  let telo: { id?: unknown; dejanje?: unknown };
  try { telo = await preberiJson(request, 2_000); }
  catch (error) { return NextResponse.json({ napaka: sporociloValidacije(error) }, { status: 400 }); }

  const id = typeof telo.id === 'string' ? telo.id : '';
  const dejanje = telo.dejanje === 'izbrisi' ? 'izbrisi' : 'preklici';
  if (!UUID.test(id)) return NextResponse.json({ napaka: 'Naloga ni veljavna.' }, { status: 400 });

  const sprememba = dejanje === 'izbrisi'
    ? { deleted_at: new Date().toISOString() }
    : { stanje: 'preklicano', konec: new Date().toISOString() };

  /* Lastništvo je del pogoja, ne ločeno preverjanje — tako tudi podtaknjen
     tuj id ne zadene ničesar. Naloge, ki že teče, ne prekličemo na pol:
     ponudnik je klican in odgovor bo prišel. */
  let poizvedba = ctx.admin.from('agent_naloge').update(sprememba)
    .eq('id', id).eq('user_id', ctx.user.id).eq('organization_id', ctx.organizationId);
  if (dejanje === 'preklici') poizvedba = poizvedba.eq('stanje', 'caka');

  const { error } = await poizvedba;
  if (error) return NextResponse.json({ napaka: 'Spremembe ni bilo mogoče shraniti.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

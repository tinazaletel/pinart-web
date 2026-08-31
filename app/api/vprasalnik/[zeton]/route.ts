import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createAdminClient } from '@/utils/supabase/admin';
import { omejiApi } from '@/lib/rate-limit';
import { odgovorNaslov, posiljatelj } from '@/lib/posiljatelj';
import { preberiJson, sporociloValidacije } from '@/lib/validacija';
import { jeVeljavnaOblika, zgostiZeton } from '@/lib/vprasalnikZeton';
import { izlusciKontakt, preveriOdgovore, type Vprasanje } from '@/lib/vprasalnik';

/* JAVNA POT VPRAŠALNIKA — stranka brez prijave.
 *
 * Zakaj gre pisanje skozi strežnik in ne neposredno v bazo: javen INSERT bi
 * pomenil, da lahko kdorkoli na internetu piše v tabelo. Tu najprej preverimo
 * žeton (po zgostitvi), šele nato pišemo s service-role ključem — enak vzorec
 * kot portal za stranko.
 *
 * Odgovori so lahko obsežni, zato je meja klicev nizka in vezana na IP.
 */

export const dynamic = 'force-dynamic';

/* Obvestilo o novem odgovoru. Namenoma NE vsebuje odgovorov samih: e-posta ni
   sifrirana od konca do konca, vsebina povprasevanja pa je poslovni podatek
   stranke — v pismu je zato samo, da je odgovor prisel, in kdo ga je oddal. */
async function obvesti(
  admin: ReturnType<typeof createAdminClient>,
  organizationId: string,
  naslovVprasalnika: string,
  kontakt: { ime?: string; eposta?: string; podjetje?: string },
): Promise<void> {
  const kljuc = process.env.RESEND_API_KEY;
  if (!admin || !kljuc) return;

  const { data: skrbniki } = await admin
    .from('organization_members')
    .select('user_id, role')
    .eq('organization_id', organizationId)
    .in('role', ['owner', 'admin']);

  const naslovi: string[] = [];
  for (const s of skrbniki || []) {
    try {
      const { data } = await admin.auth.admin.getUserById(String(s.user_id));
      if (data?.user?.email) naslovi.push(data.user.email);
    } catch { /* brez e-poste pac ne obvestimo */ }
  }
  if (!naslovi.length) return;

  const kdo = kontakt.podjetje || kontakt.ime || 'Nekdo';
  await new Resend(kljuc).emails.send({
    from: posiljatelj(),
    to: naslovi,
    replyTo: kontakt.eposta || odgovorNaslov(),
    subject: `Nov odgovor na vprašalnik — ${kdo}`,
    text: [
      `${kdo} je izpolnil vprašalnik »${naslovVprasalnika}«.`,
      kontakt.eposta ? `E-naslov: ${kontakt.eposta}` : '',
      '',
      'Odgovore prebereš v Flowu: Marketing → Vprašalniki → Odgovori.',
    ].filter(Boolean).join('\n'),
  });
}

async function najdi(zeton: string) {
  if (!jeVeljavnaOblika(zeton)) return { napaka: NextResponse.json({ napaka: 'Povezava ni veljavna.' }, { status: 404 }) };
  const admin = createAdminClient();
  if (!admin) return { napaka: NextResponse.json({ napaka: 'Vprašalniki niso nastavljeni.' }, { status: 503 }) };

  const { data } = await admin.from('vprasalniki')
    .select('id, organization_id, naslov, uvod, vprasanja, odprt, projekt')
    .eq('zeton_zgostitev', zgostiZeton(zeton))
    .maybeSingle();

  if (!data) return { napaka: NextResponse.json({ napaka: 'Povezava ni veljavna.' }, { status: 404 }) };
  return { admin, vprasalnik: data };
}

/* GET -> vprašanja za izris obrazca (brez podatkov podjetja) */
export async function GET(request: Request, { params }: { params: Promise<{ zeton: string }> }) {
  const omejitev = await omejiApi(request, 'vprasalnik-javni-ogled', 60);
  if (omejitev) return omejitev;

  const { zeton } = await params;
  const najdba = await najdi(zeton);
  if ('napaka' in najdba) return najdba.napaka;
  const v = najdba.vprasalnik;

  if (!v.odprt) return NextResponse.json({ zaprt: true, naslov: v.naslov }, { status: 200 });
  return NextResponse.json({
    naslov: v.naslov,
    uvod: v.uvod,
    vprasanja: v.vprasanja as Vprasanje[],
  });
}

/* POST { odgovori } -> zapiše odgovor */
export async function POST(request: Request, { params }: { params: Promise<{ zeton: string }> }) {
  /* Nizka meja: obrazec se odda enkrat, ne petdesetkrat na minuto. */
  const omejitev = await omejiApi(request, 'vprasalnik-oddaja', 10);
  if (omejitev) return omejitev;

  const { zeton } = await params;
  const najdba = await najdi(zeton);
  if ('napaka' in najdba) return najdba.napaka;
  const v = najdba.vprasalnik;
  if (!v.odprt) return NextResponse.json({ napaka: 'Vprašalnik je zaprt.' }, { status: 410 });

  let telo: { odgovori?: unknown; jeEn?: unknown };
  try { telo = await preberiJson(request, 60_000); }
  catch (napaka) { return NextResponse.json({ napaka: sporociloValidacije(napaka) }, { status: 400 }); }

  const izid = preveriOdgovore(v.vprasanja as Vprasanje[], telo.odgovori, telo.jeEn === true);
  if (!izid.ok) return NextResponse.json({ napake: izid.napake }, { status: 400 });

  const kontakt = izlusciKontakt(izid.odgovori);
  const { error } = await najdba.admin.from('vprasalnik_odgovori').insert({
    vprasalnik_id: v.id,
    organization_id: v.organization_id,
    /* Odgovor podeduje projekt vprasalnika: tako pristane pri projektu in ne
       na skupnem kupu (Tina, 31. 8. 2026). */
    projekt: v.projekt ?? null,
    odgovori: izid.odgovori,
    ime: kontakt.ime ?? null,
    eposta: kontakt.eposta ?? null,
    podjetje: kontakt.podjetje ?? null,
  });

  if (error) return NextResponse.json({ napaka: 'Oddaja ni uspela.' }, { status: 500 });

  /* Odgovor, ki ga nihce ne vidi, je izgubljena stranka: obvestimo lastnike in
     skrbnike takoj. Ce poste ni nastavljene, tiho odnehamo — odgovor je v bazi
     in ga uporabnica vidi v Marketingu (Tina, 31. 8. 2026). */
  void obvesti(najdba.admin, v.organization_id, v.naslov, kontakt).catch(() => undefined);

  return NextResponse.json({ ok: true });
}

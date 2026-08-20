import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { omejiApi } from '@/lib/rate-limit';
import { jeVeljavnaOblika, zgostiZeton } from '@/lib/portalZeton';

/* JAVNI OGLED PROJEKTA — brez prijave, po žetonu iz povezave.
 *
 * Kar stranka vidi, je določeno TUKAJ in nikjer drugje. Namenoma sestavljamo
 * odgovor iz izbranih polj namesto da bi filtrirali cel zapis: filter se da po
 * nesreči odstraniti, seznam polj pa je viden na prvi pogled.
 *
 * NE vračamo: ponudb, pogodb, računov, stroškov, cenika, notranjega klepeta z
 * ekipo, internih opomb. Klepeta tu sploh ne beremo — koda zanj ne obstaja, kar
 * je močnejše od pogoja, ki bi ga kdo lahko odstranil.
 */

export const dynamic = 'force-dynamic';

type Povezava = { id?: string; naslov?: string; url?: string };
type Cilj = { id?: string; besedilo?: string };

export async function GET(request: Request, { params }: { params: Promise<{ zeton: string }> }) {
  const { zeton } = await params;

  /* Omejitev po IP: brez prijave je to edina obramba pred ugibanjem na silo. */
  const omejitev = await omejiApi(request, 'portal-ogled', 60);
  if (omejitev) return omejitev;

  if (!jeVeljavnaOblika(zeton)) {
    return NextResponse.json({ napaka: 'Povezava ni veljavna.' }, { status: 404 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ napaka: 'Portal ni nastavljen.' }, { status: 503 });

  const { data: dostop } = await admin.from('portal_dostopi')
    .select('id,organization_id,projekt_external_id,expires_at,revoked_at,ogledov')
    .eq('zeton_zgostitev', zgostiZeton(zeton))
    .limit(1).maybeSingle();

  /* Neveljaven, preklican in potekel žeton dajo ENAK odgovor — sicer bi se dalo
     ugotavljati, katere povezave obstajajo. */
  const potekel = dostop?.expires_at ? new Date(dostop.expires_at).getTime() < Date.now() : false;
  if (!dostop || dostop.revoked_at || potekel) {
    return NextResponse.json({ napaka: 'Povezava ni veljavna.' }, { status: 404 });
  }

  const { data: projekt } = await admin.from('projects')
    .select('external_id,title,status,faza,data,client_id')
    .eq('organization_id', dostop.organization_id)
    .eq('external_id', dostop.projekt_external_id)
    .is('deleted_at', null)
    .limit(1).maybeSingle();
  if (!projekt) return NextResponse.json({ napaka: 'Povezava ni veljavna.' }, { status: 404 });

  const d = (projekt.data && typeof projekt.data === 'object' ? projekt.data : {}) as Record<string, unknown>;

  /* Ime studia, da stranka ve, čigav projekt gleda. */
  const { data: org } = await admin.from('organizations')
    .select('name').eq('id', dostop.organization_id).limit(1).maybeSingle();

  /* Beležka ogleda je postranska — če pade, ogled vseeno uspe. */
  void admin.from('portal_dostopi')
    .update({ last_seen_at: new Date().toISOString(), ogledov: (dostop.ogledov || 0) + 1 })
    .eq('id', dostop.id).then(() => undefined, () => undefined);

  return NextResponse.json({
    studio: org?.name || '',
    projekt: {
      naslov: projekt.title || '',
      status: projekt.status || '',
      zacetek: typeof d.zacetek === 'string' ? d.zacetek : '',
      rok: typeof d.rok === 'string' ? d.rok : '',
    },
    brief: {
      opisStranke: typeof d.opisStranke === 'string' ? d.opisStranke : '',
      panoga: typeof d.panoga === 'string' ? d.panoga : '',
      ciljnaSkupina: typeof d.ciljnaSkupina === 'string' ? d.ciljnaSkupina : '',
      dizajnZelje: typeof d.dizajnZelje === 'string' ? d.dizajnZelje : '',
      voice: typeof d.voice === 'string' ? d.voice : '',
      konkurenca: typeof d.konkurenca === 'string' ? d.konkurenca : '',
    },
    cilji: Array.isArray(d.cilji)
      ? (d.cilji as Cilj[]).map(c => String(c?.besedilo || '')).filter(Boolean)
      : [],
    povezave: Array.isArray(d.povezave)
      ? (d.povezave as Povezava[])
        .filter(p => p && typeof p.url === 'string' && /^https?:\/\//i.test(p.url))
        .map(p => ({ naslov: String(p.naslov || p.url), url: String(p.url) }))
      : [],
  });
}

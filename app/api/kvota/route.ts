import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { preberiClanstvo } from '@/lib/clanstvo';
import { omejiApi } from '@/lib/rate-limit';
import { KVOTE, stanjeKvote } from '@/lib/kvota';
import type { PaketId } from '@/lib/paketi';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VELIKOST_STRANI = 1000;

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ napaka: 'Prijava je potekla.' }, { status: 401 });

  const omejitev = await omejiApi(request, 'kvota-prostora', 60, user.id);
  if (omejitev) return omejitev;

  const organizationId = new URL(request.url).searchParams.get('organizationId');
  if (!organizationId || !UUID.test(organizationId)) {
    return NextResponse.json({ napaka: 'Organizacija ni veljavna.' }, { status: 400 });
  }
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ napaka: 'Preverjanje prostora trenutno ni na voljo.' }, { status: 503 });
  if (!await preberiClanstvo(admin, organizationId, user.id)) {
    return NextResponse.json({ napaka: 'Nimaš dostopa do te organizacije.' }, { status: 403 });
  }

  const { data: narocnina } = await admin
    .from('organization_subscriptions')
    .select('tier,status,valid_until')
    .eq('organization_id', organizationId)
    .maybeSingle();
  const veljavna = narocnina?.status === 'active' || narocnina?.status === 'trialing' || narocnina?.status === 'past_due';
  const kandidat = veljavna ? String(narocnina?.tier || 'free') : 'free';
  const paket: PaketId = kandidat === 'premium' || kandidat === 'pro' ? kandidat : 'free';
  const kvota = KVOTE[paket];

  let porabljeno = 0;
  for (let od = 0; ; od += VELIKOST_STRANI) {
    const { data, error } = await admin
      .from('document_files')
      .select('size_bytes')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .range(od, od + VELIKOST_STRANI - 1);
    if (error) return NextResponse.json({ napaka: 'Porabe prostora ni bilo mogoče prebrati.' }, { status: 500 });
    for (const vrstica of data || []) porabljeno += Math.max(0, Number(vrstica.size_bytes) || 0);
    if ((data || []).length < VELIKOST_STRANI) break;
  }

  return NextResponse.json({ porabljeno, kvota, stanje: stanjeKvote(porabljeno, kvota) });
}

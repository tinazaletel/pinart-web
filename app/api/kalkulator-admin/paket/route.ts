import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * Rocna dodelitev paketa. Rabi se za troje:
 *   · Tina kot ustanoviteljica ima Pro trajno
 *   · testerji in sodelavci dobijo dostop brez placila
 *   · popravek, ce placilo pade skozi ali ga je treba vrniti
 *
 * ZASCITA: isti piskotek kot pregled poslovanja (KALKULATOR_ADMIN_GESLO).
 * Brez tega bi lahko kdorkoli poslal zahtevo in si dodelil Pro — zato se
 * geslo preveri TU, na strezniku, ne v vmesniku.
 */
export async function POST(request: Request) {
  const geslo = process.env.KALKULATOR_ADMIN_GESLO;
  const c = await cookies();
  if (!geslo || c.get('pinart_admin')?.value !== geslo) {
    return NextResponse.json({ error: 'Ni dovoljenja' }, { status: 401 });
  }

  const baza = createAdminClient();
  if (!baza) return NextResponse.json({ error: 'Baza ni nastavljena' }, { status: 500 });

  let body: { organizationId?: string; paket?: string; opomba?: string } = {};
  try { body = await request.json(); } catch { /* prazno telo zavrnemo spodaj */ }

  const organizationId = String(body.organizationId || '');
  const paket = body.paket === 'pro' ? 'pro' : 'free';
  if (!organizationId) return NextResponse.json({ error: 'Manjka podjetje' }, { status: 400 });

  /* upsert, ker vrstice za podjetje morda se ni; valid_until pustimo prazen =
     brez poteka, kar je ravno namen podarjenega paketa */
  const { error } = await baza.from('organization_subscriptions').upsert({
    organization_id: organizationId,
    tier: paket,
    status: 'active',
    valid_until: null,
    provider: paket === 'pro' ? 'rocno' : null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'organization_id' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

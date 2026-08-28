import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { preberiClanstvo } from '@/lib/clanstvo';
import { omejiApi } from '@/lib/rate-limit';
import { stripeZahtevek, StripeNapaka, stripeKljuc } from '@/lib/stripeKlic';

/* PORTAL ZA STRANKE — odpoved, menjava kartice, računi.
 *
 * Zakaj Stripov portal in ne lasten vmesnik: odpoved mora biti vsaj tako
 * preprosta kot naročilo. Gumb, ki odpre poštni odjemalec, temu ne zadosti —
 * in v EU je to tudi pravna zahteva, ne le vljudnost. Stripe ima vse to že
 * zgrajeno in vzdrževano; mi le odpremo vrata.
 *
 * Portal odpremo za KUPCA, ki je zapisan na naročnini organizacije. Iz telesa
 * zahtevka ne jemljemo ničesar — sicer bi lahko kdo odprl tuj portal.
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  const omejitev = await omejiApi(request, 'stripe-portal', 20);
  if (omejitev) return omejitev;

  if (!stripeKljuc()) return NextResponse.json({ napaka: 'Plačila še niso nastavljena' }, { status: 503 });

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ napaka: 'Ni prijave' }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ napaka: 'Baza ni nastavljena' }, { status: 500 });

  const clanstvo = await preberiClanstvo(admin, null, user.id);
  if (!clanstvo) return NextResponse.json({ napaka: 'Uporabnik ni v nobeni organizaciji' }, { status: 400 });

  const { data: narocnina } = await admin
    .from('organization_subscriptions')
    .select('provider,provider_customer_id')
    .eq('organization_id', clanstvo.organization_id)
    .maybeSingle();

  /* Ročno podarjen paket nima Stripovega kupca — tam portala ni kaj odpreti in
     je pošteno tako povedati, namesto da bi vrnili prazno stran. */
  if (narocnina?.provider !== 'stripe' || !narocnina?.provider_customer_id) {
    return NextResponse.json({ napaka: 'Ta paket ni bil kupljen prek Stripa, zato portala ni. Piši nam in uredimo osebno.', brezPortala: true }, { status: 409 });
  }

  try {
    const osnova = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
    const seja = await stripeZahtevek<{ url: string }>('/billing_portal/sessions', {
      metoda: 'POST',
      polja: { customer: narocnina.provider_customer_id, return_url: `${osnova}/kalkulator/paket` },
    });
    return NextResponse.json({ url: seja.url });
  } catch (napaka) {
    const sporocilo = napaka instanceof StripeNapaka ? napaka.message : 'Portala ni bilo mogoče odpreti';
    return NextResponse.json({ napaka: sporocilo }, { status: 502 });
  }
}

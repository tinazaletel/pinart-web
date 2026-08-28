import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { preberiClanstvo } from '@/lib/clanstvo';
import { preberiJson, sporociloValidacije } from '@/lib/validacija';
import { omejiApi } from '@/lib/rate-limit';
import { dolociPonudbo, cenaZa, type Obdobje } from '@/lib/cenaNarocnine';
import { lookupKeyZa, type PlacljivPaket } from '@/lib/stripeCene';
import { idLestvice, stripeZahtevek, StripeNapaka, stripeKljuc } from '@/lib/stripeKlic';

/* ZAČETEK NAROČNINE — ustvari Stripovo blagajno in vrne povezavo nanjo.
 *
 * Kaj se tu NE zgodi: nič se ne zapiše o paketu. Blagajniška seja ni plačilo.
 * Človek jo lahko odpre in zapre, kartica lahko pade, banka lahko zahteva
 * potrditev, ki je nikoli ne da. Paket dodeli šele webhook, ko Stripe pove, da
 * je denar res prišel. Če bi paket zapisali tu, bi ga dobil vsak, ki klikne.
 *
 * Katera cena velja, se prav tako določi TU, na strežniku, iz števila že
 * oddanih ustanovnih mest in današnjega datuma — ne iz tega, kar pošlje
 * brskalnik. Sicer bi si vsak lahko izbral ustanovno ceno kar sam.
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  const omejitev = await omejiApi(request, 'stripe-checkout', 20);
  if (omejitev) return omejitev;

  if (!stripeKljuc()) return NextResponse.json({ napaka: 'Plačila še niso nastavljena' }, { status: 503 });

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ napaka: 'Ni prijave' }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ napaka: 'Baza ni nastavljena' }, { status: 500 });

  let telo: { paket?: string; obdobje?: string };
  try { telo = await preberiJson(request, 2_000); }
  catch (napaka) { return NextResponse.json({ napaka: sporociloValidacije(napaka) }, { status: 400 }); }

  const paket = (telo.paket === 'premium' || telo.paket === 'pro' ? telo.paket : null) as PlacljivPaket | null;
  const obdobje = (telo.obdobje === 'mesec' || telo.obdobje === 'leto' ? telo.obdobje : null) as Obdobje | null;
  if (!paket || !obdobje) return NextResponse.json({ napaka: 'Neveljaven paket ali obdobje' }, { status: 400 });

  /* Organizacija prijavljenega. Naročnina visi na njej, ne na osebi — sicer bi
     ob prenosu lastništva paket ostal pri prejšnjem lastniku. */
  const clanstvo = await preberiClanstvo(admin, null, user.id);
  if (!clanstvo) return NextResponse.json({ napaka: 'Uporabnik ni v nobeni organizaciji' }, { status: 400 });
  const organizationId = clanstvo.organization_id;

  /* Kdor že plačuje, ne sme začeti druge naročnine — dobil bi dva obračuna za
     isto stvar. Zamenjava paketa gre pozneje skozi Stripov portal. */
  const { data: obstojeca } = await admin
    .from('organization_subscriptions')
    .select('tier,status,provider_subscription_id')
    .eq('organization_id', organizationId)
    .maybeSingle();
  if (obstojeca && obstojeca.tier !== 'free' && ['active', 'trialing', 'past_due'].includes(String(obstojeca.status))) {
    return NextResponse.json({ napaka: 'Naročnina je že aktivna', zeNarocen: true }, { status: 409 });
  }

  /* Koliko ustanovnih mest je oddanih. Štejemo zaklenjene cene, ne uporabnikov:
     ustanoven je tisti, ki mu je bila cena res dodeljena. */
  const { count } = await admin
    .from('organization_subscriptions')
    .select('organization_id', { count: 'exact', head: true })
    .eq('cena_ponudba', 'ustanovna');

  const ponudba = dolociPonudbo(new Date(), count ?? 0);
  const kljuc = lookupKeyZa(ponudba, paket, obdobje);
  if (!kljuc) {
    /* Ne izmišljamo si nadomestne cene. Če lestvice ni, te ponudbe ta hip ne
       prodajamo in je pošteno tako povedati. */
    return NextResponse.json({ napaka: 'Te ponudbe trenutno ne prodajamo', ponudba, paket, obdobje }, { status: 409 });
  }

  try {
    const priceId = await idLestvice(kljuc);
    if (!priceId) return NextResponse.json({ napaka: `V Stripu ni lestvice »${kljuc}«` }, { status: 500 });

    const osnova = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
    const seja = await stripeZahtevek<{ id: string; url: string }>('/checkout/sessions', {
      metoda: 'POST',
      polja: {
        mode: 'subscription',
        /* Managed Payments = Stripe je prodajalec na računu (Merchant of Record).
           Davek po jurisdikciji kupca obračuna in odvede on, ne mi — kar je za
           prodajo v ZDA in po EU edina izvedljiva pot brez lastne davčne
           registracije v vsaki državi posebej. Cena tega je 3,5 % povrh običajne
           provizije.

           Pogoj, ki ni očiten in nas je 27. 8. 2026 ustavil: vsak izdelek mora
           imeti davčno kodo (txcd_10103001 — SaaS, poslovna raba). Brez nje
           Stripe sejo zavrne z »the product tax code is missing«. Ko boste
           ustvarjali ŽIVE izdelke, mora biti koda nastavljena tudi tam. */
        'managed_payments[enabled]': 'true',
        'line_items[0][price]': priceId,
        'line_items[0][quantity]': 1,
        success_url: `${osnova}/kalkulator/paket?placilo=uspesno&seja={CHECKOUT_SESSION_ID}`,
        cancel_url: `${osnova}/kalkulator/paket?placilo=preklicano`,
        customer_email: user.email || undefined,
        /* client_reference_id preživi celotno pot skozi Stripe in se vrne v
           webhooku — po njem vemo, čigav paket dodeliti. */
        client_reference_id: organizationId,
        metadata: { organization_id: organizationId, paket, obdobje, ponudba, user_id: user.id },
        /* Isti podatki še na naročnino: seja po nekaj urah poteče, naročnina
           ostane, in ob podaljšanjih je edino, kar še imamo. */
        subscription_data: { metadata: { organization_id: organizationId, paket, obdobje, ponudba } },
      },
    });

    return NextResponse.json({
      url: seja.url,
      /* za prikaz na gumbu — ista številka, kot jo bo videl na blagajni */
      ponudba,
      cena: cenaZa(ponudba, paket, obdobje),
    });
  } catch (napaka) {
    const sporocilo = napaka instanceof StripeNapaka ? napaka.message : 'Blagajne ni bilo mogoče odpreti';
    return NextResponse.json({ napaka: sporocilo }, { status: 502 });
  }
}

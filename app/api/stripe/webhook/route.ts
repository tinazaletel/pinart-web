import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { preveriPodpis } from '@/lib/stripePodpis';
import { razberiLookup } from '@/lib/stripeCene';
import { stripeZahtevek } from '@/lib/stripeKlic';

/* STRIPOV WEBHOOK — edino mesto, kjer se paket dodeli.
 *
 * Vse, kar je tu zapisano, je prebrano iz Stripovega odgovora, nikoli iz
 * zahtevka brskalnika. Tudi znesek: preberemo lestvico na naročnini in njeno
 * ceno, ne tega, kar je uporabnik videl na gumbu. Če se razideta, velja Stripe
 * — tam je denar.
 *
 * cena_znesek je znesek NA OBRAČUN, tak kot na računu: 15,00 pri mesečni in
 * 180,00 pri letni naročnini. Mesečno ceno se izpelje iz cena_obdobje. Dogovor
 * je tak zato, ker mora zapis ustrezati računu, ki ga človek dobi.
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* Stripova stanja so širša od naših. Karkoli ni jasno delujoče, pade na
   'canceled' — raje komu prehitro odvzamemo paket, kot da bi ga kdo imel
   zastonj zaradi stanja, ki ga ne razumemo. */
const STANJE: Record<string, 'active' | 'trialing' | 'past_due' | 'canceled'> = {
  active: 'active',
  trialing: 'trialing',
  past_due: 'past_due',
  unpaid: 'past_due',
};

type Narocnina = {
  id: string;
  status: string;
  customer: string;
  current_period_end?: number;
  metadata?: Record<string, string>;
  items?: { data: { price?: { lookup_key?: string; unit_amount?: number; currency?: string; recurring?: { interval?: string } } }[] };
};

/* Naročnino vedno preberemo znova pri Stripu, tudi če je bila v dogodku.
   Dogodek je posnetek trenutka pošiljanja; če se je med potjo kaj spremenilo
   ali je dostava zamujala, je svež podatek pravilnejši. */
async function preberiNarocnino(id: string): Promise<Narocnina | null> {
  try { return await stripeZahtevek<Narocnina>(`/subscriptions/${id}`, { polja: { 'expand[0]': 'items.data.price' } }); }
  catch { return null; }
}

async function zapisi(narocnina: Narocnina): Promise<{ ok: boolean; razlog?: string }> {
  const admin = createAdminClient();
  if (!admin) return { ok: false, razlog: 'baza ni nastavljena' };

  const organizationId = narocnina.metadata?.organization_id;
  if (!organizationId) return { ok: false, razlog: 'naročnina nima organization_id' };

  const cena = narocnina.items?.data?.[0]?.price;
  const razbrano = razberiLookup(cena?.lookup_key);
  /* Ponudbo vzamemo iz metapodatkov seje (določil jo je strežnik ob začetku),
     ker en lookup key lahko pripada dvema ponudbama — premium_letno je uvodna
     in redna hkrati. Ključ pove paket in obdobje, ne pa, po kateri ponudbi je
     bila cena zaklenjena. */
  const ponudba = narocnina.metadata?.ponudba || razbrano?.ponudba || null;
  const paket = razbrano?.paket || (narocnina.metadata?.paket === 'pro' ? 'pro' : narocnina.metadata?.paket === 'premium' ? 'premium' : null);
  if (!paket) return { ok: false, razlog: `neznana lestvica ${cena?.lookup_key || '(brez ključa)'}` };

  const stanje = STANJE[narocnina.status] || 'canceled';
  const jeZiva = stanje !== 'canceled';
  const obdobje = razbrano?.obdobje || (cena?.recurring?.interval === 'year' ? 'leto' : 'mesec');

  const { error } = await admin.from('organization_subscriptions').upsert({
    organization_id: organizationId,
    tier: jeZiva ? paket : 'free',
    status: stanje,
    valid_until: narocnina.current_period_end ? new Date(narocnina.current_period_end * 1000).toISOString() : null,
    provider: 'stripe',
    provider_customer_id: typeof narocnina.customer === 'string' ? narocnina.customer : null,
    provider_subscription_id: narocnina.id,
    cena_ponudba: ponudba,
    cena_znesek: typeof cena?.unit_amount === 'number' ? cena.unit_amount / 100 : null,
    cena_valuta: cena?.currency ? cena.currency.toUpperCase() : null,
    cena_obdobje: obdobje,
    cena_lookup_key: cena?.lookup_key || null,
    cena_zaklenjena_ob: new Date().toISOString(),
    /* veljavna_do ostane NULL: ustanovna in uvodna cena velja trajno ob
       neprekinjeni naročnini. Ni pozabljeno, je obljuba. */
    prekinjena: !jeZiva,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'organization_id' });

  if (error) return { ok: false, razlog: error.message };
  return { ok: true };
}

export async function POST(request: Request) {
  /* Surovo telo, znak za znak — razčlenjeno in nazaj sestavljeno se podpis ne
     ujema nikoli. */
  const surovo = await request.text();
  const glava = request.headers.get('stripe-signature') || '';
  const skrivnost = process.env.STRIPE_WEBHOOK_SECRET || '';

  const izid = preveriPodpis(surovo, glava, skrivnost, Math.floor(Date.now() / 1000));
  if (!izid.ok) {
    /* 400 in nič drugega. Kdor pošlje neveljaven podpis, ne sme iz odgovora
       izvedeti ničesar o tem, kaj bi bilo pravilno. */
    console.warn('[stripe] zavrnjen webhook:', izid.razlog);
    return NextResponse.json({ napaka: 'Neveljaven podpis' }, { status: 400 });
  }

  let dogodek: { type?: string; data?: { object?: any } };
  try { dogodek = JSON.parse(surovo); }
  catch { return NextResponse.json({ napaka: 'Neveljavno telo' }, { status: 400 }); }

  const vrsta = String(dogodek.type || '');
  const predmet = dogodek.data?.object || {};

  try {
    if (vrsta === 'checkout.session.completed') {
      /* Plačilo je potrjeno šele ob 'paid'. Seja je lahko dokončana tudi, ko
         banka plačilo še obdeluje. */
      if (predmet.payment_status && predmet.payment_status !== 'paid' && predmet.payment_status !== 'no_payment_required') {
        return NextResponse.json({ prejeto: true, preskoceno: 'plačilo še ni potrjeno' });
      }
      const id = typeof predmet.subscription === 'string' ? predmet.subscription : predmet.subscription?.id;
      if (!id) return NextResponse.json({ prejeto: true, preskoceno: 'seja brez naročnine' });
      const narocnina = await preberiNarocnino(id);
      if (!narocnina) return NextResponse.json({ napaka: 'Naročnine ni bilo mogoče prebrati' }, { status: 500 });
      /* Seja pozna organizacijo tudi takrat, kadar je na naročnini ni. */
      narocnina.metadata = {
        ...(narocnina.metadata || {}),
        organization_id: narocnina.metadata?.organization_id || predmet.metadata?.organization_id || predmet.client_reference_id || '',
        ponudba: narocnina.metadata?.ponudba || predmet.metadata?.ponudba || '',
      };
      const r = await zapisi(narocnina);
      if (!r.ok) { console.error('[stripe] zapis ni uspel:', r.razlog); return NextResponse.json({ napaka: r.razlog }, { status: 500 }); }
      return NextResponse.json({ prejeto: true });
    }

    if (vrsta === 'customer.subscription.updated' || vrsta === 'customer.subscription.deleted') {
      const narocnina = await preberiNarocnino(String(predmet.id || ''));
      const zapis = narocnina || (predmet as Narocnina);
      /* Ob izbrisu Stripe naročnine ne vrne več — takrat velja predmet iz
         dogodka, ki ima pravo stanje 'canceled'. */
      const r = await zapisi(vrsta === 'customer.subscription.deleted' ? { ...zapis, status: 'canceled' } : zapis);
      if (!r.ok) { console.error('[stripe] zapis ni uspel:', r.razlog); return NextResponse.json({ napaka: r.razlog }, { status: 500 }); }
      return NextResponse.json({ prejeto: true });
    }
  } catch (napaka) {
    console.error('[stripe] napaka pri obdelavi', vrsta, napaka);
    /* 500 pomeni, da bo Stripe poskusil znova — kar hočemo, kadar je bila
       napaka naša (baza, omrežje), ne uporabnikova. */
    return NextResponse.json({ napaka: 'Napaka pri obdelavi' }, { status: 500 });
  }

  /* Dogodkov, ki jih ne obravnavamo, ne štejemo za napako — sicer bi jih
     Stripe pošiljal znova in znova. */
  return NextResponse.json({ prejeto: true, neobravnavan: vrsta });
}

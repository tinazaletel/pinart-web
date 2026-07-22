import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * Anonimni dogodek uporabe: kaj se v orodju odpre, dokonča, izvozi.
 *
 * KAJ SE ZAPIŠE: ime dogodka, pot, groba naprava, jezik, ali je oseba vpisana,
 * in naključni id seje (da 40 klikov ene osebe ni videti kot 40 uporabnikov).
 *
 * KAJ SE NE ZAPIŠE — in pot tega niti ne sprejme: e-pošta, ime, IP naslov,
 * vsebina ponudb in pogodb, imena strank, ure iz zasebnega dnevnika.
 * Polja so trdo našteta spodaj; karkoli drugega, kar pride v `lastnosti`,
 * se pretvori v število ali kratek niz, tako da tja ne more zaiti besedilo
 * ponudbe ali podatki naročnika.
 */

const DOVOLJENA_IMENA = new Set([
  'orodje_odprto', 'vprasalnik_zacet', 'vprasalnik_koncan', 'cena_izracunana',
  'ponudba_ustvarjena', 'ponudba_izvozena', 'racun_ustvarjen', 'pogodba_ustvarjena',
  'retainer_odprt', 'retainer_ustvarjen', 'landing_odprt', 'prijava_odprta',
  'racun_ustvarjen_nov', 'nadgradnja_kliknjena', 'pomoc_odprta',
  /* uvodna nastavitev: podrocja, izkusnje in trg — brez njih so zbrane cene
     kup stevilk brez konteksta in primerjava s trgom ni mogoca */
  'onboarding_koncan',
]);

/* Vrednosti skrcimo: stevilo, true/false ali najvec 40 znakov brez presledkov
   na zacetku/koncu. Tako v `lastnosti` ne more pristati cel odstavek besedila. */
function ocisti(vrednost: unknown): string | number | boolean | null {
  if (typeof vrednost === 'number') return Number.isFinite(vrednost) ? vrednost : null;
  if (typeof vrednost === 'boolean') return vrednost;
  if (typeof vrednost === 'string') return vrednost.trim().slice(0, 40) || null;
  return null;
}

export async function POST(request: Request) {
  const baza = createAdminClient();
  if (!baza) return NextResponse.json({ ok: false, reason: 'not-configured' });

  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { /* prazno telo odbijemo spodaj */ }

  const ime = String(body.ime ?? '');
  if (!DOVOLJENA_IMENA.has(ime)) {
    return NextResponse.json({ error: 'Unknown event' }, { status: 400 });
  }

  const surove = (body.lastnosti && typeof body.lastnosti === 'object')
    ? body.lastnosti as Record<string, unknown> : {};
  const lastnosti: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(surove).slice(0, 12)) {
    const c = ocisti(v);
    if (c !== null) lastnosti[k.slice(0, 30)] = c;
  }

  const { error } = await baza.from('dogodki').insert({
    ime,
    pot: String(body.pot ?? '').slice(0, 120) || null,
    /* id seje sme biti samo nakljucni niz iz brskalnika, ne e-posta ali uid */
    seja: String(body.seja ?? '').replace(/[^a-z0-9-]/gi, '').slice(0, 40) || null,
    naprava: body.naprava === 'mobile' ? 'mobile' : 'desktop',
    jezik: String(body.jezik ?? '').slice(0, 5) || null,
    paket: body.paket === 'pro' ? 'pro' : body.paket === 'free' ? 'free' : 'anon',
    lastnosti,
  });

  return NextResponse.json({ ok: !error });
}

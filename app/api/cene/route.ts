import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * Anonimna cenovna tocka iz kalkulatorja — skupna baza cen na trgu.
 * Zapis NE vsebuje osebnih podatkov (ne imena, ne maila, ne IP) in jih
 * namenoma ne sprejme: polja so trdo nasteta in tipizirana tukaj.
 *
 * Cilj: cez pol leta Google Sheet pokaze mediano cen po storitvi,
 * izkusnjah in trgu — pregled, ki ga nima nihce drug.
 *
 * Nastavitev: Vercel env GOOGLE_SHEETS_CENE_WEBHOOK_URL (locen Apps
 * Script webhook, glej docs/CENE-WEBHOOK.md). Dokler ni nastavljen,
 * pot tiho vrne ok:false in nic se ne izgubi razen te tocke.
 *
 * ZASCITA PRED ZASTRUPITVIJO BAZE (obe env-gated — dokler nista nastavljeni,
 * se pot obnasa kot prej):
 *  - TURNSTILE_SECRET_KEY: nevidno preverjanje Cloudflare Turnstile; surovi
 *    POST-bot brez veljavnega zetona je zavrnjen (403).
 *  - Zdravorazumske meje: nemogoce vrednosti (npr. logo za 3 € ali 500.000 €)
 *    sploh ne pridejo v bazo.
 */

/* Meje verjetnih zneskov (v EUR, interna valuta). Absurdi = zavrnjeno. */
const MIN_IZVEDBA = 20;
const MAX_IZVEDBA = 300_000;
const MAX_PRAVICE = 2_000_000;

export async function POST(request: Request) {
  const endpoint = process.env.GOOGLE_SHEETS_CENE_WEBHOOK_URL;
  const baza = createAdminClient();
  /* Supabase je zdaj glavna shramba, Sheet ostane neobvezen. Ce ni ne enega
     ne drugega, se pot obnasa kot prej: tiho ne stori nicesar. */
  if (!endpoint && !baza) return NextResponse.json({ ok: false, reason: 'not-configured' });

  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { /* prazen zapis odbijemo spodaj */ }

  /* ── nevidna bot-zascita (Turnstile) ─────────────────────────────────
     Aktivna sele, ko je vpisan TURNSTILE_SECRET_KEY. Do takrat preskocimo,
     da med razvojem nic ne blokira. */
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (secret) {
    const token = String(body.turnstileToken ?? '');
    if (!token) {
      return NextResponse.json({ error: 'Missing bot-check token' }, { status: 403 });
    }
    const verdict = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ secret, response: token }),
      },
    ).then(r => r.json()).catch(() => ({ success: false }));
    if (!verdict?.success) {
      return NextResponse.json({ error: 'Bot check failed' }, { status: 403 });
    }
  }

  const zapis = {
    submittedAt: new Date().toISOString(),
    storitve: Array.isArray(body.storitve)
      ? (body.storitve as unknown[]).slice(0, 20).map(String).join(' + ')
      : '',
    izkusnje: String(body.izkusnje ?? ''),
    mojTrg: String(body.mojTrg ?? ''),
    trgNarocnika: String(body.trgNarocnika ?? ''),
    raba: String(body.raba ?? ''),
    izvedbaEUR: Number(body.izvedbaEUR) || 0,
    praviceEUR: Number(body.praviceEUR) || 0,
    valuta: String(body.valuta ?? 'eur'),
    /* zastavica kakovosti: ali je uporabnik cene prilagodil (bolj realen
       signal) ali so privzete. Bool → 'da'/'ne' za lazji pregled v tabeli. */
    prilagojeno: body.prilagojeno ? 'da' : 'ne',
  };

  /* ── zdravorazumske meje: absurdi ne pridejo v bazo ─────────────────── */
  if (!zapis.storitve || zapis.izvedbaEUR < MIN_IZVEDBA || zapis.izvedbaEUR > MAX_IZVEDBA) {
    return NextResponse.json({ error: 'Out of range' }, { status: 400 });
  }
  if (zapis.praviceEUR < 0 || zapis.praviceEUR > MAX_PRAVICE) {
    return NextResponse.json({ error: 'Out of range' }, { status: 400 });
  }

  /* ── zapis v Supabase (glavna shramba) ──────────────────────────────────
     Brez uporabnikovega id-ja, e-poste in IP-ja: cenovna tocka je namenoma
     nepovezljiva z osebo. "paket" pove le, ali je bila oseba vpisana. */
  let vBazi = false;
  if (baza) {
    const storitve = Array.isArray(body.storitve)
      ? (body.storitve as unknown[]).slice(0, 20).map(String)
      : [];
    const { error } = await baza.from('cenovne_tocke').insert({
      storitve,
      izkusnje: zapis.izkusnje || null,
      moj_trg: zapis.mojTrg || null,
      trg_narocnika: zapis.trgNarocnika || null,
      raba: zapis.raba || null,
      izvedba_eur: zapis.izvedbaEUR,
      pravice_eur: zapis.praviceEUR,
      valuta: zapis.valuta,
      prilagojeno: zapis.prilagojeno === 'da',
      vir: body.vir === 'retainer' ? 'retainer' : 'orodje',
      paket: body.paket === 'pro' ? 'pro' : body.paket === 'free' ? 'free' : 'anon',
    });
    vBazi = !error;
  }

  /* Sheet ostane, dokler ga Tina ne ugasne — dvojni zapis nic ne stane. */
  let vSheetu = false;
  if (endpoint) {
    vSheetu = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(zapis),
      redirect: 'follow',
    }).then(r => r.ok).catch(() => false);
  }

  return NextResponse.json({ ok: vBazi || vSheetu });
}

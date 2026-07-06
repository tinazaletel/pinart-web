import { NextResponse } from 'next/server';

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
 */
export async function POST(request: Request) {
  const endpoint = process.env.GOOGLE_SHEETS_CENE_WEBHOOK_URL;
  if (!endpoint) return NextResponse.json({ ok: false, reason: 'not-configured' });

  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { /* prazen zapis odbijemo spodaj */ }

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
  };
  if (!zapis.storitve || zapis.izvedbaEUR <= 0) {
    return NextResponse.json({ error: 'Empty record' }, { status: 400 });
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(zapis),
    redirect: 'follow',
  });

  return NextResponse.json({ ok: response.ok });
}

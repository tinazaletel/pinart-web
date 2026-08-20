import { createHash, randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createAdminClient } from '@/utils/supabase/admin';
import { omejiApi } from '@/lib/rate-limit';
import { jeEmail, omejenNiz, preberiJson, sporociloValidacije } from '@/lib/validacija';
import { posiljatelj } from '@/lib/posiljatelj';
import { VPRASANJA_PO_STORITVI } from '@/lib/vprasanjaPoStoritvi';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
type Params = { params: { slug: string } };

const ip = (request: Request) => request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
const ipHash = (request: Request) => createHash('sha256').update(`${process.env.API_RATE_LIMIT_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || 'pinart'}:${ip(request)}`).digest('hex');
const esc = (v: string) => v.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export async function GET(request: Request, { params }: Params) {
  if (!SLUG.test(params.slug)) return NextResponse.json({ napaka: 'Obrazec ne obstaja.' }, { status: 404 });
  const omejitev = await omejiApi(request, 'povprasevanje-ogled', 60);
  if (omejitev) return omejitev;
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ napaka: 'Obrazec trenutno ni na voljo.' }, { status: 503 });
  const { data } = await admin.from('organizations').select('name').eq('inquiry_slug', params.slug).maybeSingle();
  return data ? NextResponse.json({ studio: data.name }) : NextResponse.json({ napaka: 'Obrazec ne obstaja.' }, { status: 404 });
}

export async function POST(request: Request, { params }: Params) {
  if (!SLUG.test(params.slug)) return NextResponse.json({ napaka: 'Obrazec ne obstaja.' }, { status: 404 });
  const omejitev = await omejiApi(request, 'povprasevanje-oddaja', 5);
  if (omejitev) return omejitev;
  let body: Record<string, unknown>;
  try { body = await preberiJson(request, 48_000); }
  catch (error) { return NextResponse.json({ napaka: sporociloValidacije(error) }, { status: 400 }); }
  if (typeof body.website === 'string' && body.website.trim()) return NextResponse.json({ ok: true });
  const ime = typeof body.ime === 'string' ? body.ime.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const storitev = typeof body.storitev === 'string' ? body.storitev.trim().slice(0, 80) : '';
  const odgovori = body.odgovori && typeof body.odgovori === 'object' && !Array.isArray(body.odgovori) ? body.odgovori as Record<string, unknown> : null;
  const katalog = VPRASANJA_PO_STORITVI[storitev];
  if (!omejenNiz(ime, 160, true) || !jeEmail(email) || !katalog || !odgovori || Object.keys(odgovori).length > 40) {
    return NextResponse.json({ napaka: 'Preveri ime, e-naslov in odgovore.' }, { status: 400 });
  }
  const cistiOdgovori: Record<string, string | string[]> = {};
  const dovoljeniKljuci = new Set(katalog.flatMap(v => [v.id, `${v.id}-drugo`]));
  for (const [kljuc, vrednost] of Object.entries(odgovori)) {
    if (!dovoljeniKljuci.has(kljuc)) continue;
    if (!/^[a-z0-9-]{1,80}$/i.test(kljuc)) continue;
    if (typeof vrednost === 'string') cistiOdgovori[kljuc] = vrednost.trim().slice(0, 2000);
    else if (Array.isArray(vrednost)) cistiOdgovori[kljuc] = vrednost.slice(0, 20).map(v => String(v).slice(0, 300));
  }
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ napaka: 'Obrazec trenutno ni na voljo.' }, { status: 503 });
  const { data: org } = await admin.from('organizations').select('id,name,owner_id').eq('inquiry_slug', params.slug).maybeSingle();
  if (!org) return NextResponse.json({ napaka: 'Obrazec ne obstaja.' }, { status: 404 });

  const podatki = { storitev, odgovori: cistiOdgovori };
  /* Osnutek uporablja isti podatkovni model ponudb kot kalkulator; odgovori postanejo pregledljiv obseg. */
  const skupniId = randomUUID();
  const oznake = new Map(katalog.flatMap(v => [[v.id, v.label], [`${v.id}-drugo`, `${v.label} — drugo`]]));
  const scope = Object.entries(cistiOdgovori).map(([k, v]) => `${oznake.get(k) || k}: ${Array.isArray(v) ? v.join(', ') : v}`).filter(v => v.length > 2);
  const { error: inquiryError } = await admin.rpc('sprejmi_povprasevanje', {
    p_organization_id: org.id, p_podatki: podatki, p_ime: ime, p_email: email,
    p_ip_hash: ipHash(request), p_client_external_id: `povprasevanje-${skupniId}`,
    p_offer_external_id: `povprasevanje-${randomUUID()}`,
    p_offer_title: `Povpraševanje · ${storitev}`, p_scope: scope,
  });
  if (inquiryError) return NextResponse.json({ napaka: 'Povpraševanja in osnutka ponudbe ni bilo mogoče shraniti.' }, { status: 500 });

  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    try {
      const { data: owner } = await admin.auth.admin.getUserById(org.owner_id);
      if (owner.user?.email) await new Resend(apiKey).emails.send({ from: posiljatelj(), to: owner.user.email, replyTo: email, subject: `Novo povpraševanje · ${ime}`, html: `<p>V Flow je prispelo novo povpraševanje za <b>${esc(storitev)}</b>.</p><p><b>${esc(ime)}</b> · ${esc(email)}</p><p>Osnutek ponudbe je pripravljen za pregled.</p>` });
    } catch (error) { console.error('Obvestila o povpraševanju ni bilo mogoče poslati:', error instanceof Error ? error.message : error); }
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}

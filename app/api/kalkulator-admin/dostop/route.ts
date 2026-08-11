import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/utils/supabase/admin';
import { preberiJson, sporociloValidacije } from '@/lib/validacija';

/**
 * Upravljanje dodelitev zaprte bete (tabela flow_dostop): testerji, nagrajenci
 * z obdobjem in zabelezeni popusti.
 *   GET    -> seznam vseh dodelitev
 *   POST   -> dodaj/uredi (upsert po e-mailu)
 *   DELETE -> odstrani po e-mailu
 *
 * ZASCITA: isti piskotek kot pregled poslovanja (KALKULATOR_ADMIN_GESLO).
 * Service-role obide RLS, zato se geslo preveri TU, na strezniku.
 */

async function preveriGeslo(): Promise<boolean> {
  const geslo = process.env.KALKULATOR_ADMIN_GESLO;
  const c = await cookies();
  return !!geslo && c.get('pinart_admin')?.value === geslo;
}

const VRSTE = ['tester', 'nagrada', 'popust'] as const;
type Vrsta = (typeof VRSTE)[number];

function ociEmail(v: unknown): string {
  return String(v || '').trim().toLowerCase();
}
function ociDatum(v: unknown): string | null {
  const s = String(v || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

export async function GET() {
  if (!(await preveriGeslo())) return NextResponse.json({ error: 'Ni dovoljenja' }, { status: 401 });
  const baza = createAdminClient();
  if (!baza) return NextResponse.json({ error: 'Baza ni nastavljena' }, { status: 500 });

  const { data, error } = await baza
    .from('flow_dostop')
    .select('email, vrsta, velja_od, velja_do, popust, opomba, dodan')
    .order('dodan', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  /* Obogati z auth podatki: ali se je e-mail dejansko vpisal (obstaja uporabnik)
     in kdaj je bil zadnji vpis. Stevila obiskov ne belezimo (analitika je anonimna).
     listUsers je pri zaprti beti majhen; perPage=1000 zadosca. */
  const authMap = new Map<string, { id: string; vpisan: boolean; zadnji_vpis: string | null }>();
  try {
    const { data: au } = await baza.auth.admin.listUsers({ page: 1, perPage: 1000 });
    for (const u of au?.users ?? []) {
      if (u.email) authMap.set(u.email.toLowerCase(), { id: u.id, vpisan: true, zadnji_vpis: u.last_sign_in_at ?? null });
    }
  } catch { /* auth ni dosegljiv -> vrstice brez vpis podatka */ }

  /* Obiski (engagement): dni aktivnosti + skupaj odprtij, po user_id. Ce tabele
     'obiski' se ni (migracija nepognana), tiho -> stolpca ostaneta prazna. */
  const obiskiMap = new Map<string, { dni: number; odprtij: number }>();
  try {
    const { data: ob } = await baza.from('obiski').select('user_id, dni, odprtij');
    for (const o of ob ?? []) obiskiMap.set(o.user_id, { dni: o.dni ?? 0, odprtij: o.odprtij ?? 0 });
  } catch { /* tabela morda se ne obstaja */ }

  const vrstice = (data ?? []).map((d) => {
    const u = authMap.get(String(d.email || '').toLowerCase());
    const ob = u ? obiskiMap.get(u.id) : undefined;
    return { ...d, vpisan: !!u, zadnji_vpis: u?.zadnji_vpis ?? null, dni: ob?.dni ?? null, odprtij: ob?.odprtij ?? null };
  });
  return NextResponse.json({ vrstice });
}

export async function POST(request: Request) {
  if (!(await preveriGeslo())) return NextResponse.json({ error: 'Ni dovoljenja' }, { status: 401 });
  const baza = createAdminClient();
  if (!baza) return NextResponse.json({ error: 'Baza ni nastavljena' }, { status: 500 });

  let body: Record<string, unknown>;
  try { body = await preberiJson(request, 4_000); }
  catch (error) { return NextResponse.json({ error: sporociloValidacije(error) }, { status: 400 }); }

  const email = ociEmail(body.email);
  if (!email || !email.includes('@')) return NextResponse.json({ error: 'Neveljaven e-mail' }, { status: 400 });

  const vrsta: Vrsta = VRSTE.includes(body.vrsta as Vrsta) ? (body.vrsta as Vrsta) : 'tester';
  const velja_od = ociDatum(body.velja_od);
  const velja_do = ociDatum(body.velja_do);
  const popustNum = Number(body.popust);
  const popust = vrsta === 'popust' && Number.isFinite(popustNum)
    ? Math.max(0, Math.min(100, Math.round(popustNum)))
    : null;
  const opomba = String(body.opomba || '').trim().slice(0, 200) || null;

  const { error } = await baza.from('flow_dostop').upsert({
    email, vrsta, velja_od, velja_do, popust, opomba,
  }, { onConflict: 'email' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!(await preveriGeslo())) return NextResponse.json({ error: 'Ni dovoljenja' }, { status: 401 });
  const baza = createAdminClient();
  if (!baza) return NextResponse.json({ error: 'Baza ni nastavljena' }, { status: 500 });

  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { /* prazno */ }
  const email = ociEmail(body.email);
  if (!email) return NextResponse.json({ error: 'Manjka e-mail' }, { status: 400 });

  const { error } = await baza.from('flow_dostop').delete().eq('email', email);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

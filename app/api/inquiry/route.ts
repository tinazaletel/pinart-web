import { NextResponse } from 'next/server';
import { jeEmail, omejenNiz, preberiJson, sporociloValidacije } from '@/lib/validacija';
import { omejiApi } from '@/lib/rate-limit';
import { createAdminClient } from '@/utils/supabase/admin';

export async function POST(request: Request) {
  const omejitev = await omejiApi(request, 'inquiry', 10);
  if (omejitev) return omejitev;

  const endpoint = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  let body: Record<string, unknown>;
  try { body = await preberiJson(request, 8_000); }
  catch (error) { return NextResponse.json({ error: sporociloValidacije(error) }, { status: 400 }); }

  if (body.website) return NextResponse.json({ ok: true });
  if (!omejenNiz(body.name, 120, true) || !jeEmail(body.email) || !omejenNiz(body.brief, 5000, true)) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  /* Neobvezna polja obrazca: podjetje, proracun, termin. Ce niso poslana ali so
     predolga, gredo naprej kot prazen niz — obrazec zaradi njih ne pade. */
  const neobvezno = (v: unknown, meja = 160) => (omejenNiz(v, meja) ? String(v) : '');
  /* NAJPREJ K NAM, sele nato naprej. Doslej je povprasevanje obstajalo samo,
     dokler je delal Googlov skript; ce je padel, je stranka izginila brez
     sledu in tega ni videl nihce (Tina, 3. 9. 2026). Zapis se zgodi tudi,
     kadar webhook ni nastavljen — takrat je to edina kopija. */
  const admin = createAdminClient();
  let zapisId: string | null = null;
  if (admin) {
    const { data } = await admin.from('povprasevanja').insert({
      ime: String(body.name), email: String(body.email), brief: String(body.brief),
      podjetje: neobvezno(body.company) || null,
      proracun: neobvezno(body.budget) || null,
      termin: neobvezno(body.timing) || null,
      vrsta: neobvezno(body.type, 60) || null,
      jezik: neobvezno(body.locale, 10) || null,
      vir: neobvezno(body.source, 60) || null,
    }).select('id').maybeSingle();
    zapisId = data?.id ? String(data.id) : null;
  }

  const oznaci = async (posredovano: boolean, napaka?: string) => {
    if (!admin || !zapisId) return;
    await admin.from('povprasevanja')
      .update({ posredovano, napaka: napaka || null }).eq('id', zapisId);
  };

  if (!endpoint) {
    await oznaci(false, 'GOOGLE_SHEETS_WEBHOOK_URL ni nastavljen');
    /* Povprasevanje JE shranjeno, zato obiskovalcu ne lazemo, da je padlo. */
    if (zapisId) return NextResponse.json({ ok: true });
    return NextResponse.json({ error: 'Google Sheets webhook is not configured' }, { status: 503 });
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    /* Pošlji SAMO potrjena polja (ne cel body) — da nevalidirane dodatne
       ključe iz zahteve ne posredujemo naprej na Google Sheets webhook.
       Podjetje, proracun in termin so med utrjevanjem izpadli, zato je bila
       zadeva maila "… undefined", Proracun in Rok pa "-" (Tina, 1. 9. 2026). */
    body: JSON.stringify({
      name: String(body.name), email: String(body.email), brief: String(body.brief),
      company: neobvezno(body.company),
      budget: neobvezno(body.budget),
      timing: neobvezno(body.timing),
      /* Skrita polja obrazca — skripta iz njih sestavi zadevo in loci vir. */
      type: neobvezno(body.type, 60),
      locale: neobvezno(body.locale, 10),
      source: neobvezno(body.source, 60),
      submittedAt: new Date().toISOString(),
    }),
    redirect: 'follow',
  });

  if (!response.ok) {
    await oznaci(false, `Webhook je vrnil ${response.status}`);
    /* Ce imamo kopijo, je povprasevanje pri nas in ni izgubljeno. */
    if (zapisId) return NextResponse.json({ ok: true });
    return NextResponse.json({ error: 'Submission failed' }, { status: 502 });
  }
  await oznaci(true);
  return NextResponse.json({ ok: true });
}

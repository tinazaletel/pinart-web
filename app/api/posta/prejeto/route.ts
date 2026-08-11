import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { omejiApi } from '@/lib/rate-limit';

/* Sprejem DOHODNE e-pošte (inbound). Cloudflare Email Worker razčleni prispeli
   mail, izlušči token iz prejemnikovega naslova (<token>@pinartflow.com) in
   POST-a sem kot JSON. Tu:
     1) preverimo skupno skrivnost INBOUND_SECRET (glava x-inbound-secret),
     2) po tokenu poiščemo projekt (project_inbox -> organization + project),
     3) zapišemo v project_mail (direction='in') prek service-role odjemalca
        (obide RLS, ker pošiljatelj NI prijavljen uporabnik).
   De-dup po (organization_id, message_id) ureja unikatni indeks — podvojen
   webhook (23505) tiho preskočimo. Nič se ne zruši, če manjkajo env ključi. */

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const secret = process.env.INBOUND_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Sprejem pošte še ni nastavljen (manjka INBOUND_SECRET).' }, { status: 503 });
  }
  if (request.headers.get('x-inbound-secret') !== secret) {
    return NextResponse.json({ error: 'Neavtorizirano.' }, { status: 401 });
  }
  const omejitev = await omejiApi(request, 'posta-prejeto', 60);
  if (omejitev) return omejitev;

  let b: {
    token?: string; from?: string; to?: string; subject?: string;
    text?: string; html?: string; messageId?: string; inReplyTo?: string;
  };
  try {
    b = await request.json();
  } catch {
    return NextResponse.json({ error: 'Neveljaven zahtevek.' }, { status: 400 });
  }

  const token = String(b.token || '').trim();
  if (!token) return NextResponse.json({ error: 'Manjka token.' }, { status: 400 });

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Baza ni nastavljena (manjka SUPABASE_SERVICE_ROLE_KEY).' }, { status: 503 });
  }

  /* token -> projekt */
  const { data: inbox, error: inboxErr } = await supabase
    .from('project_inbox')
    .select('organization_id, project_external_id')
    .eq('token', token)
    .maybeSingle();
  if (inboxErr) return NextResponse.json({ error: 'Napaka baze.' }, { status: 500 });
  if (!inbox) return NextResponse.json({ error: 'Neznan token.' }, { status: 404 });

  const text = String(b.text || '');
  const summary = text.replace(/\s+/g, ' ').trim().slice(0, 140);

  const { error: insErr } = await supabase.from('project_mail').insert({
    organization_id: inbox.organization_id,
    project_external_id: inbox.project_external_id,
    direction: 'in',
    from_email: String(b.from || '').slice(0, 320) || null,
    to_emails: b.to ? [String(b.to).slice(0, 320)] : [],
    subject: String(b.subject || '').slice(0, 300) || null,
    body_text: text || null,
    body_html: String(b.html || '') || null,
    summary: summary || null,
    message_id: String(b.messageId || '').slice(0, 500) || null,
    in_reply_to: String(b.inReplyTo || '').slice(0, 500) || null,
  });

  /* 23505 = podvojen (organization_id, message_id): mail že imamo, tiho OK */
  if (insErr && insErr.code !== '23505') {
    return NextResponse.json({ error: 'Zapis ni uspel.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { omejiApi } from '@/lib/rate-limit';
import { jeEmail, preberiJson, sporociloValidacije } from '@/lib/validacija';
import { preberiClanstvo } from '@/lib/clanstvo';
import { odgovorNaslov } from '@/lib/posiljatelj';

type SendRequest = { recipient?: string; downloadUrl?: string; periodStart?: string; periodEnd?: string; demo?: boolean };

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Prijava je potekla.' }, { status: 401 });
  const omejitev = await omejiApi(request, 'racunovodstvo-send', 10, user.id);
  if (omejitev) return omejitev;

  let body: SendRequest;
  try { body = await preberiJson<SendRequest>(request, 8_000); }
  catch (error) { return NextResponse.json({ error: sporociloValidacije(error) }, { status: 400 }); }
  if (body.demo === true) {
    return NextResponse.json({ error: 'V predstavitvenem načinu pošiljanje ni dovoljeno.' }, { status: 403 });
  }
  const recipient = body.recipient?.trim().toLowerCase();
  if (!recipient || !jeEmail(recipient) || !body.downloadUrl || !body.periodStart || !body.periodEnd) {
    return NextResponse.json({ error: 'Manjkajo podatki za pošiljanje.' }, { status: 400 });
  }
  let downloadUrl: URL;
  try { downloadUrl = new URL(body.downloadUrl); } catch { return NextResponse.json({ error: 'Povezava ni veljavna.' }, { status: 400 }); }
  const supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname;
  if (downloadUrl.protocol !== 'https:' || downloadUrl.hostname !== supabaseHost || !downloadUrl.pathname.includes('/storage/v1/object/sign/business-documents/')) {
    return NextResponse.json({ error: 'Povezava do dokumenta ni veljavna.' }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.periodStart) || !/^\d{4}-\d{2}-\d{2}$/.test(body.periodEnd)) {
    return NextResponse.json({ error: 'Obdobje ni veljavno.' }, { status: 400 });
  }

  const membership = await preberiClanstvo(supabase, null, user.id);
  const organizationId = membership && !membership.disabled_at ? membership.organization_id : null;
  if (!organizationId) return NextResponse.json({ error: 'Podjetje ni povezano.' }, { status: 403 });
  const { data: settings } = await supabase.from('organization_settings').select('accounting_email').eq('organization_id', organizationId).maybeSingle();
  if (!settings?.accounting_email || String(settings.accounting_email).trim().toLowerCase() !== recipient) {
    return NextResponse.json({ error: 'Prejemnik se ne ujema z nastavitvami podjetja.' }, { status: 403 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ACCOUNTING_FROM_EMAIL;
  if (!apiKey || !from) return NextResponse.json({ error: 'E-poštno pošiljanje še ni konfigurirano.' }, { status: 503 });

  const result = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [recipient],
      /* Racunovodkinja bo na paket ODGOVORILA (vprasanja, manjkajoci racuni).
         Odgovor mora do posiljatelja, ne na noreply, kjer ga Worker zavrne. */
      reply_to: user.email || odgovorNaslov(),
      subject: `Računovodski paket ${body.periodStart}–${body.periodEnd}`,
      html: `<p>Pozdravljeni,</p><p>pripravljen je računovodski paket za obdobje <strong>${body.periodStart}–${body.periodEnd}</strong>.</p><p><a href="${downloadUrl.toString().replace(/&/g, '&amp;').replace(/"/g, '&quot;')}">Varno prenesi ZIP paket</a></p><p>Povezava je časovno omejena.</p>`,
    }),
  });
  if (!result.ok) return NextResponse.json({ error: 'Pošiljanje ni uspelo.' }, { status: 502 });
  return NextResponse.json({ sent: true });
}

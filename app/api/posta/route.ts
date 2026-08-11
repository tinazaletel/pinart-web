import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { omejiApi } from '@/lib/rate-limit';
import { jeEmail, omejenNiz, preberiJson, sporociloValidacije } from '@/lib/validacija';

/* Strežniško pošiljanje e-pošte prek Resend. Ključ RESEND_API_KEY bere SAMO
   strežnik (nikoli klient). "From" naslov nastavi RESEND_FROM (npr.
   "Pinart Flow <racuni@pinart.si>"); dokler domena ni potrjena v Resend,
   se za test uporabi privzeti onboarding@resend.dev (pošlje le lastniku računa).
   Če ključa ni, vrne 503 z jasnim sporočilom — nič se ne zruši. */

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Prijava je potekla.' }, { status: 401 });
  }
  const omejitev = await omejiApi(request, 'posta', 10, user.id);
  if (omejitev) return omejitev;

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || 'Pinart Flow <onboarding@resend.dev>';

  let body: {
    to?: string | string[];
    subject?: string;
    html?: string;
    replyTo?: string;
    organizationId?: string;
    idempotencyKey?: string;
    demo?: boolean;
  };
  try {
    body = await preberiJson(request, 100_000);
  } catch (error) {
    return NextResponse.json({ error: sporociloValidacije(error) }, { status: 400 });
  }

  if (body.demo === true) {
    return NextResponse.json({ error: 'V predstavitvenem načinu pošiljanje ni dovoljeno.' }, { status: 403 });
  }

  const idempotencyKey = String(body.idempotencyKey || '').trim();
  if (!/^[a-zA-Z0-9._:-]{8,200}$/.test(idempotencyKey)) {
    return NextResponse.json({ error: 'Manjka veljaven ključ pošiljanja.' }, { status: 400 });
  }

  let membershipQuery = supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id);
  if (body.organizationId) membershipQuery = membershipQuery.eq('organization_id', body.organizationId);
  const { data: memberships } = await membershipQuery.limit(1);
  const organizationId = memberships?.[0]?.organization_id;
  if (!organizationId) {
    return NextResponse.json({ error: 'Podjetje ni povezano.' }, { status: 403 });
  }

  /* en prejemnik (niz) ali več (polje) — vsak mora biti veljaven e-mail */
  const prejemniki = (Array.isArray(body.to) ? body.to : body.to ? [body.to] : [])
    .map((e) => String(e).trim())
    .filter(Boolean);
  const vsiVeljavni = prejemniki.length > 0 && prejemniki.every(jeEmail);
  if (!vsiVeljavni || !body.subject || !body.html) {
    return NextResponse.json({ error: 'Manjka veljaven prejemnik, zadeva ali vsebina.' }, { status: 400 });
  }
  if (prejemniki.length > 50) {
    return NextResponse.json({ error: 'Preveč prejemnikov (največ 50).' }, { status: 400 });
  }
  if (!omejenNiz(body.subject, 300, true) || !omejenNiz(body.html, 90_000, true)) {
    return NextResponse.json({ error: 'Zadeva ali vsebina ni veljavna.' }, { status: 400 });
  }
  if (body.replyTo && !jeEmail(body.replyTo.trim())) {
    return NextResponse.json({ error: 'Naslov za odgovor ni veljaven.' }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: 'Evidenca pošiljanja ni konfigurirana.' }, { status: 503 });
  }
  const { data: existing } = await admin
    .from('mail_log')
    .select('id,status,provider_id')
    .eq('organization_id', organizationId)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();
  if (existing?.status === 'sent') {
    return NextResponse.json({ ok: true, id: existing.provider_id, duplicate: true });
  }
  if (existing?.status === 'pending') {
    return NextResponse.json({ error: 'To sporočilo se že pošilja.' }, { status: 409 });
  }

  const logPayload = {
    organization_id: organizationId,
    user_id: user.id,
    idempotency_key: idempotencyKey,
    recipients: prejemniki,
    subject: body.subject.trim(),
    status: 'pending',
    provider_id: null,
    error_code: null,
    updated_at: new Date().toISOString(),
  };
  const { data: claimed, error: claimError } = existing
    ? await admin.from('mail_log').update(logPayload).eq('id', existing.id).eq('status', 'failed').select('id').maybeSingle()
    : await admin.from('mail_log').insert(logPayload).select('id').maybeSingle();
  if (claimError || !claimed) {
    return NextResponse.json({ error: 'To sporočilo se že obdeluje.' }, { status: 409 });
  }

  const zakljuciDnevnik = async (status: 'sent' | 'failed', providerId?: string, errorCode?: string) => {
    await admin.from('mail_log').update({
      status,
      provider_id: providerId || null,
      error_code: errorCode || null,
      updated_at: new Date().toISOString(),
    }).eq('id', claimed.id);
  };
  if (!apiKey) {
    await zakljuciDnevnik('failed', undefined, 'provider_not_configured');
    return NextResponse.json(
      { error: 'Pošiljanje e-pošte še ni nastavljeno (manjka RESEND_API_KEY).' },
      { status: 503 },
    );
  }

  const resend = new Resend(apiKey);
  try {
    const { data, error } = await resend.emails.send({
      from,
      to: prejemniki,
      subject: body.subject,
      html: body.html,
      ...(body.replyTo ? { replyTo: body.replyTo } : {}),
    });
    if (error) {
      await zakljuciDnevnik('failed', undefined, 'provider_rejected');
      console.error('Resend je zavrnil pošiljanje:', error.message || 'neznana napaka');
      return NextResponse.json({ error: 'Pošiljanje ni uspelo.' }, { status: 502 });
    }
    await zakljuciDnevnik('sent', data?.id);
    return NextResponse.json({ ok: true, id: data?.id });
  } catch (error) {
    await zakljuciDnevnik('failed', undefined, 'provider_exception');
    console.error('Pošiljanje e-pošte ni uspelo:', error instanceof Error ? error.message : 'neznana napaka');
    return NextResponse.json({ error: 'Napaka pri pošiljanju e-pošte.' }, { status: 502 });
  }
}

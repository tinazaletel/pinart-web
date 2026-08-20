import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { omejiApi } from '@/lib/rate-limit';
import { jeEmail, omejenNiz, preberiJson, sporociloValidacije } from '@/lib/validacija';
import { zagotoviInboxToken } from '@/lib/inboxToken';
import { posiljatelj } from '@/lib/posiljatelj';
import { preberiClanstvo } from '@/lib/clanstvo';

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
  const from = posiljatelj();

  let body: {
    to?: string | string[];
    subject?: string;
    html?: string;
    replyTo?: string;
    organizationId?: string;
    projectExternalId?: string;
    clientId?: string;
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

  const membership = await preberiClanstvo(supabase, body.organizationId || null, user.id);
  const organizationId = membership && !membership.disabled_at ? membership.organization_id : null;
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
  if (body.projectExternalId !== undefined && !omejenNiz(body.projectExternalId, 200, true)) {
    return NextResponse.json({ error: 'Projekt ni veljaven.' }, { status: 400 });
  }
  if (body.clientId !== undefined && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.clientId)) {
    return NextResponse.json({ error: 'Stranka ni veljavna.' }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: 'Evidenca pošiljanja ni konfigurirana.' }, { status: 503 });
  }
  if (body.clientId) {
    const { data: client } = await admin
      .from('clients')
      .select('id')
      .eq('id', body.clientId)
      .eq('organization_id', organizationId)
      .maybeSingle();
    if (!client) {
      return NextResponse.json({ error: 'Stranka ni povezana s tem podjetjem.' }, { status: 403 });
    }
  }
  const { data: existing } = await admin
    .from('mail_log')
    .select('id,status,provider_id')
    .eq('organization_id', organizationId)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();
  if (existing?.status === 'sent') {
    return NextResponse.json({ ok: true, id: existing.provider_id, messageId: existing.provider_id, duplicate: true });
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
    const projectExternalId = body.projectExternalId?.trim();
    /* Vsak mail, POSLAN IZ FLOW-a, dobi inbox token za reply-to, da odgovori
       pridejo NAZAJ v Flow (skupna Komunikacija). Projekt je NEOBVEZEN — brez
       njega gre v skupni org nabiralnik ('__skupno__'). NE pobiramo tujih mailov
       iz Gmaila; ujamemo LE odgovore na naše pošte (gredo na token@domeno).
       Če je klicatelj eksplicitno podal replyTo, ga spoštujemo (npr. odvetnik). */
    const projRef = projectExternalId || '__skupno__';
    let replyTo = body.replyTo?.trim();
    let replyRef = ''; /* pod katerim projRef je bil token dejansko ustvarjen (diagnostika) */
    if (!replyTo) {
      /* FAIL-SOFT + FALLBACK: najprej poskusi projektni token; če pade (npr. manjka
         grant ali RLS), pade NAZAJ na skupni '__skupno__' token, ki zanesljivo dela —
         tako odgovori VEDNO pridejo nazaj v Flow (vsaj v skupno Komunikacijo), ne v
         osebni Gmail. Če vse pade, se mail vseeno pošlje (le brez token reply-to). */
      const inboundDomain = (process.env.INBOUND_DOMAIN || 'pinartflow.com').trim().toLowerCase();
      if (/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(inboundDomain)) {
        const kandidati = projRef === '__skupno__' ? ['__skupno__'] : [projRef, '__skupno__'];
        for (const ref of kandidati) {
          try {
            const token = await zagotoviInboxToken(organizationId, ref);
            if (token) { replyTo = `${token}@${inboundDomain}`; replyRef = ref; break; }
          } catch (tokErr) {
            console.error(`Inbox token (${ref}) ni uspel:`, tokErr instanceof Error ? tokErr.message : tokErr);
          }
        }
      }
    }
    console.log(`[posta] send org=${organizationId} projRef=${projRef} replyRef=${replyRef || '-'} replyTo=${replyTo ? replyTo.replace(/@.*/, '@…') : '(brez)'}`);
    const { data, error } = await resend.emails.send({
      from,
      to: prejemniki,
      subject: body.subject,
      html: body.html,
      ...(replyTo ? { replyTo } : {}),
    });
    if (error) {
      await zakljuciDnevnik('failed', undefined, 'provider_rejected');
      console.error('Resend je zavrnil pošiljanje:', error.message || 'neznana napaka');
      return NextResponse.json({ error: 'Pošiljanje ni uspelo.' }, { status: 502 });
    }
    const messageId = data?.id;
    await zakljuciDnevnik('sent', messageId);

    /* Zapiši POSLANO v project_mail (projektni ali skupni), da se prikaže v
       Komunikaciji. Fail-soft: če zapis ne uspe, mail je že poslan — ne rušimo. */
    try {
      const { error: projectMailError } = await admin.from('project_mail').insert({
        organization_id: organizationId,
        project_external_id: projRef,
        client_id: body.clientId || null,
        direction: 'out',
        from_email: from,
        to_emails: prejemniki,
        subject: body.subject.trim(),
        body_html: body.html,
        body_text: body.html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
        message_id: messageId,
        occurred_at: new Date().toISOString(),
      });
      if (projectMailError && projectMailError.code !== '23505') {
        console.error('Poslanega maila ni bilo mogoče zapisati:', projectMailError.message);
      }
    } catch (e) {
      console.error('project_mail zapis ni uspel:', e instanceof Error ? e.message : e);
    }

    return NextResponse.json({ ok: true, id: messageId, messageId });
  } catch (error) {
    await zakljuciDnevnik('failed', undefined, 'provider_exception');
    console.error('Pošiljanje e-pošte ni uspelo:', error instanceof Error ? error.message : 'neznana napaka');
    return NextResponse.json({ error: 'Napaka pri pošiljanju e-pošte.' }, { status: 502 });
  }
}

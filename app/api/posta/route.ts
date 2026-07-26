import { NextResponse } from 'next/server';
import { Resend } from 'resend';

/* Strežniško pošiljanje e-pošte prek Resend. Ključ RESEND_API_KEY bere SAMO
   strežnik (nikoli klient). "From" naslov nastavi RESEND_FROM (npr.
   "Pinart Flow <racuni@pinart.si>"); dokler domena ni potrjena v Resend,
   se za test uporabi privzeti onboarding@resend.dev (pošlje le lastniku računa).
   Če ključa ni, vrne 503 z jasnim sporočilom — nič se ne zruši. */

export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || 'Pinart Flow <onboarding@resend.dev>';

  let body: { to?: string | string[]; subject?: string; html?: string; replyTo?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Neveljaven zahtevek.' }, { status: 400 });
  }

  /* en prejemnik (niz) ali več (polje) — vsak mora biti veljaven e-mail */
  const prejemniki = (Array.isArray(body.to) ? body.to : body.to ? [body.to] : [])
    .map((e) => String(e).trim())
    .filter(Boolean);
  const epostaRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const vsiVeljavni = prejemniki.length > 0 && prejemniki.every((e) => epostaRe.test(e));
  if (!vsiVeljavni || !body.subject || !body.html) {
    return NextResponse.json({ error: 'Manjka veljaven prejemnik, zadeva ali vsebina.' }, { status: 400 });
  }
  if (prejemniki.length > 50) {
    return NextResponse.json({ error: 'Preveč prejemnikov (največ 50).' }, { status: 400 });
  }
  if (body.subject.length > 300) {
    return NextResponse.json({ error: 'Zadeva je predolga.' }, { status: 400 });
  }
  if (!apiKey) {
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
      return NextResponse.json({ error: error.message || 'Pošiljanje ni uspelo.' }, { status: 502 });
    }
    return NextResponse.json({ ok: true, id: data?.id });
  } catch {
    return NextResponse.json({ error: 'Napaka pri pošiljanju e-pošte.' }, { status: 502 });
  }
}

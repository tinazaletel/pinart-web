import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@/utils/supabase/server';
import { omejiApi } from '@/lib/rate-limit';
import { jeEmail, preberiJson, sporociloValidacije } from '@/lib/validacija';

/* Vabilo v ekipo (organizacijo) — Faza 2 večuporabniškega sloja.
   Admin/owner organizacije ustvari vabilo:
   - vpis v organization_invitations (RLS: samo admin sme — glej migracijo),
   - povabljencu se pošlje e-pošta s povezavo /kalkulator/ekipa/sprejmi?token=…
   Povabljenec se prijavi (Google ali geslo) in unovči token prek RPC
   accept_organization_invitation -> postane član (organization_members).
   Migracija: supabase/migrations/20260817180000_organization_invitations.sql
   Ključ RESEND_API_KEY bere SAMO strežnik. Če e-pošta ni nastavljena, vabilo
   VSEENO nastane in vrnemo povezavo, da jo lahko admin deli ročno. */

const DOVOLJENE_VLOGE = new Set(['admin', 'member']);

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string),
  );
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Prijava je potekla.' }, { status: 401 });
  }
  const omejitev = await omejiApi(request, 'ekipa-vabi', 20, user.id);
  if (omejitev) return omejitev;

  let body: { email?: string; role?: string; organizationId?: string };
  try {
    body = await preberiJson(request, 10_000);
  } catch (error) {
    return NextResponse.json({ error: sporociloValidacije(error) }, { status: 400 });
  }

  const email = String(body.email || '').trim().toLowerCase();
  if (!jeEmail(email)) {
    return NextResponse.json({ error: 'Vnesi veljaven e-naslov.' }, { status: 400 });
  }
  const role = DOVOLJENE_VLOGE.has(String(body.role)) ? String(body.role) : 'member';

  /* Organizacija, kjer je klicatelj admin ali owner (samo ti smejo vabiti). */
  let membershipQuery = supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .in('role', ['owner', 'admin']);
  if (body.organizationId) membershipQuery = membershipQuery.eq('organization_id', body.organizationId);
  const { data: memberships } = await membershipQuery.limit(1);
  const organizationId = memberships?.[0]?.organization_id;
  if (!organizationId) {
    return NextResponse.json({ error: 'Za povabilo članov potrebuješ skrbniške pravice.' }, { status: 403 });
  }

  /* Prepiši morebitno staro NEpotrjeno vabilo (unikatni delni indeks na
     (organizacija, lower(email)) where accepted_at is null). */
  await supabase
    .from('organization_invitations')
    .delete()
    .eq('organization_id', organizationId)
    .is('accepted_at', null)
    .eq('email', email);

  const { data: created, error: insertError } = await supabase
    .from('organization_invitations')
    .insert({ organization_id: organizationId, email, role, invited_by: user.id })
    .select('token')
    .single();
  if (insertError || !created?.token) {
    if (insertError && (insertError as { code?: string }).code === '23505') {
      return NextResponse.json({ error: 'Ta e-naslov je že povabljen (vabilo čaka na sprejem).' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Vabila ni bilo mogoče ustvariti.' }, { status: 500 });
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', organizationId)
    .maybeSingle();
  const imePodjetja = String(org?.name || 'ekipo').trim() || 'ekipo';

  const origin = (request.headers.get('origin') || 'https://pinart.si').replace(/\/$/, '');
  const povezava = `${origin}/kalkulator/ekipa/sprejmi?token=${created.token}`;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      ok: true, email, povezava, poslano: false,
      opozorilo: 'E-pošta ni nastavljena — povezavo za sprejem deli ročno.',
    });
  }

  const from = process.env.RESEND_FROM || 'Pinart Flow <onboarding@resend.dev>';
  const resend = new Resend(apiKey);
  const html = `<div style="font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a"><p>Živjo,</p><p>povabljen/a si v ekipo <b>${escapeHtml(imePodjetja)}</b> na <b>Pinart Flow</b>.</p><p>Za sprejem se prijavi s tem e-naslovom (<b>${escapeHtml(email)}</b>) — z Googlom ali z geslom — in potrdi vabilo:</p><p><a href="${povezava}" style="display:inline-block;background:#2A2035;color:#fff;text-decoration:none;padding:11px 20px;border-radius:10px;font-weight:600">Sprejmi vabilo</a></p><p style="color:#666;font-size:13px">Če gumb ne dela, odpri: ${povezava}</p><p style="color:#999;font-size:12px">Povezava velja 14 dni. Če vabila nisi pričakoval/a, ga preprosto prezri.</p></div>`;
  try {
    const rez = await resend.emails.send({ from, to: [email], subject: `Povabilo v ekipo — ${imePodjetja}`, html });
    if (rez.error) {
      return NextResponse.json({ ok: true, email, povezava, poslano: false, opozorilo: 'Vabilo ustvarjeno, e-pošte ni bilo mogoče poslati.' });
    }
    return NextResponse.json({ ok: true, email, poslano: true });
  } catch {
    return NextResponse.json({ ok: true, email, povezava, poslano: false, opozorilo: 'Vabilo ustvarjeno, e-pošte ni bilo mogoče poslati.' });
  }
}

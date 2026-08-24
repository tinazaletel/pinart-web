import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@/utils/supabase/server';
import { omejiApi } from '@/lib/rate-limit';
import { jeEmail, preberiJson, sporociloValidacije } from '@/lib/validacija';
import { mejaSedezev, planOznaka } from '@/lib/ekipaSedezi';
import { odgovorNaslov, posiljatelj } from '@/lib/posiljatelj';

/* Vabilo v ekipo (organizacijo) — Faza 2 večuporabniškega sloja.
   Admin/owner organizacije ustvari vabilo:
   - vpis v organization_invites (obstoječa tabela, migracija 20260811090100),
   - povabljencu se pošlje e-pošta s povezavo /kalkulator/ekipa/sprejmi?token=…
   Povabljenec se prijavi Z ISTIM e-naslovom (Google/geslo) in unovči token prek
   RPC accept_organization_invite -> postane član (organization_members). Ta RPC
   strogo preveri, da se e-pošta prijavljenega ujema z vabilom.
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
    .from('organization_invites')
    .delete()
    .eq('organization_id', organizationId)
    .is('accepted_at', null)
    .ilike('email', email);

  /* Faza 5 — sedeži po planu: sedež = član + čakajoče vabilo. Če je zasedenih
     >= meja za plan organizacije, novega vabila ne dovolimo. */
  const { data: sub } = await supabase
    .from('organization_subscriptions')
    .select('tier')
    .eq('organization_id', organizationId)
    .maybeSingle();
  const plan = String(sub?.tier || 'free');
  const meja = mejaSedezev(plan);
  const [{ count: steviloClanov }, { count: steviloVabil }] = await Promise.all([
    supabase.from('organization_members').select('user_id', { count: 'exact', head: true }).eq('organization_id', organizationId),
    supabase.from('organization_invites').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).is('accepted_at', null).gt('expires_at', new Date().toISOString()),
  ]);
  const zasedeni = (steviloClanov || 0) + (steviloVabil || 0);
  if (zasedeni >= meja) {
    return NextResponse.json(
      { error: `Dosežena meja sedežev (${meja}) za ${planOznaka(plan)} paket. Za več članov nadgradi paket.` },
      { status: 403 },
    );
  }

  const { data: created, error: insertError } = await supabase
    .from('organization_invites')
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

  /* Povezava za sprejem MORA kazati na javno domeno — vabilo, ustvarjeno z
     localhosta, bi sicer povabljencu poslalo localhost link, ki mu ne dela. */
  const rawOrigin = (request.headers.get('origin') || '').replace(/\/$/, '');
  const origin = !rawOrigin || rawOrigin.includes('localhost') || rawOrigin.includes('127.0.0.1')
    ? 'https://www.pinartflow.com'
    : rawOrigin;
  const povezava = `${origin}/kalkulator/ekipa/sprejmi?token=${created.token}`;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      ok: true, email, povezava, poslano: false,
      opozorilo: 'E-pošta ni nastavljena — povezavo za sprejem deli ročno.',
    });
  }

  const from = posiljatelj();
  const resend = new Resend(apiKey);
  const html = `<div style="font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a"><p>Živjo,</p><p>povabljen/a si v ekipo <b>${escapeHtml(imePodjetja)}</b> na <b>Pinart Flow</b>.</p><p>Za sprejem se prijavi s tem e-naslovom (<b>${escapeHtml(email)}</b>) — z Googlom ali z geslom — in potrdi vabilo:</p><p><a href="${povezava}" style="display:inline-block;background:#2A2035;color:#fff;text-decoration:none;padding:11px 20px;border-radius:10px;font-weight:600">Sprejmi vabilo</a></p><p style="color:#666;font-size:13px">Če gumb ne dela, odpri: ${povezava}</p><p style="color:#999;font-size:12px">Povezava velja 7 dni. Če vabila nisi pričakoval/a, ga preprosto prezri.</p></div>`;
  try {
    /* Odgovor na vabilo naj pride vabitelju, ne na noreply (tam ga Worker zavrne). */
    const rez = await resend.emails.send({ from, to: [email], replyTo: user.email || odgovorNaslov(), subject: `Povabilo v ekipo — ${imePodjetja}`, html });
    if (rez.error) {
      /* Pokazi PRAVI razlog (npr. neveljaven kljuc, nepreverjena domena, zavrnjen
         prejemnik) — splosno sporocilo je onemogocalo diagnozo. */
      console.error('EKIPA vabilo — Resend napaka:', rez.error);
      return NextResponse.json({
        ok: true, email, povezava, poslano: false,
        opozorilo: `Vabilo ustvarjeno, e-pošte ni bilo mogoče poslati: ${String(rez.error.message || rez.error)}`,
      });
    }
    return NextResponse.json({ ok: true, email, poslano: true });
  } catch (error) {
    console.error('EKIPA vabilo — klic ni uspel:', error);
    return NextResponse.json({
      ok: true, email, povezava, poslano: false,
      opozorilo: `Vabilo ustvarjeno, e-pošte ni bilo mogoče poslati: ${error instanceof Error ? error.message : 'neznana napaka'}`,
    });
  }
}

/* Preklic čakajočega vabila (admin). RLS na organization_invites je admin-only,
   zato izbris teče kar prek uporabnikovega (RLS) clienta. */
export async function DELETE(request: Request) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Prijava je potekla.' }, { status: 401 });
  const omejitev = await omejiApi(request, 'ekipa-vabi-del', 20, user.id);
  if (omejitev) return omejitev;

  let body: { inviteId?: string };
  try { body = await preberiJson(request, 5_000); }
  catch (error) { return NextResponse.json({ error: sporociloValidacije(error) }, { status: 400 }); }
  const inviteId = String(body.inviteId || '').trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(inviteId)) {
    return NextResponse.json({ error: 'Neveljavno vabilo.' }, { status: 400 });
  }

  const { error: delError } = await supabase
    .from('organization_invites')
    .delete()
    .eq('id', inviteId);
  if (delError) return NextResponse.json({ error: 'Vabila ni bilo mogoče preklicati.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

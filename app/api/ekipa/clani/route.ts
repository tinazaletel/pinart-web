import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { omejiApi } from '@/lib/rate-limit';
import { preberiJson, sporociloValidacije } from '@/lib/validacija';
import { mejaSedezev, planOznaka } from '@/lib/ekipaSedezi';
import { preberiClanstvo } from '@/lib/clanstvo';

/* Seznam ekipe v oblaku (Faza 3).
   Člane in čakajoča vabila preberemo prek UPORABNIKOVEGA (RLS) clienta — tako
   deluje TUDI brez service-role ključa (npr. lokalni dev):
     - organization_members: politika "members read memberships" (član vidi svoj org),
     - organization_invites: politika "admins read invites" (vidi le admin).
   E-pošte/imena članov (iz auth.users/profiles, ki jih RLS klientu ne izpostavi)
   dodamo LE, če je na voljo admin (service-role) client — sicer prikažemo vsaj
   svojo e-pošto. Brez ključa panel še vedno deluje, le tuje e-pošte so skrite. */

async function resolveContext(supabase: ReturnType<typeof createClient>, userId: string) {
  const row = await preberiClanstvo(supabase, null, userId);
  return row && !row.disabled_at ? { organizationId: row.organization_id, role: row.role } : null;
}

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Prijava je potekla.' }, { status: 401 });
  const omejitev = await omejiApi(request, 'ekipa-clani', 40, user.id);
  if (omejitev) return omejitev;

  const ctx = await resolveContext(supabase, user.id);
  if (!ctx) return NextResponse.json({ error: 'Podjetje ni povezano.' }, { status: 403 });
  const jeAdmin = ctx.role === 'owner' || ctx.role === 'admin';

  /* Člani prek RLS clienta (deluje brez service ključa). */
  const { data: memberRows } = await supabase
    .from('organization_members')
    .select('user_id, role, created_at')
    .eq('organization_id', ctx.organizationId)
    .order('created_at', { ascending: true });
  const rows = memberRows || [];
  const userIds = rows.map((r) => String(r.user_id));

  /* E-pošte/imena SAMO če je admin client na voljo (best-effort obogatitev). */
  const imenaById = new Map<string, string>();
  const emailById = new Map<string, string>();
  const admin = createAdminClient();
  if (admin && userIds.length) {
    const { data: profileRows } = await admin.from('profiles').select('id, full_name').in('id', userIds);
    (profileRows || []).forEach((p: { id: string; full_name: string | null }) => imenaById.set(String(p.id), p.full_name || ''));
    await Promise.all(userIds.map(async (uid) => {
      try {
        const { data: u } = await admin.auth.admin.getUserById(uid);
        if (u?.user?.email) emailById.set(uid, u.user.email);
      } catch { /* e-pošta ni kljucna */ }
    }));
  }
  /* Svojo e-pošto poznamo vedno (iz seje) — tudi brez admin ključa. */
  if (user.email) emailById.set(user.id, user.email);

  const clani = rows.map((r) => {
    const uid = String(r.user_id);
    return { userId: uid, email: emailById.get(uid) || '', fullName: imenaById.get(uid) || '', role: String(r.role), isSelf: uid === user.id };
  });

  /* Čakajoča vabila — prek RLS clienta (admin read policy); deluje brez service ključa. */
  let vabila: { id: string; email: string; role: string; expiresAt: string }[] = [];
  if (jeAdmin) {
    const { data: inviteRows } = await supabase
      .from('organization_invites')
      .select('id, email, role, expires_at')
      .eq('organization_id', ctx.organizationId)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });
    vabila = (inviteRows || []).map((i) => ({ id: String(i.id), email: String(i.email), role: String(i.role), expiresAt: String(i.expires_at) }));
  }

  /* Faza 5 — zasedenost sedežev po planu (za prikaz »X / Y sedežev«). */
  const { data: sub } = await supabase
    .from('organization_subscriptions')
    .select('tier')
    .eq('organization_id', ctx.organizationId)
    .maybeSingle();
  const plan = String(sub?.tier || 'free');
  const sedezi = { zasedeni: rows.length + vabila.length, meja: mejaSedezev(plan), plan, planOznaka: planOznaka(plan) };

  return NextResponse.json({ jeAdmin, clani, vabila, sedezi, brezKljuca: !admin });
}

export async function DELETE(request: Request) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Prijava je potekla.' }, { status: 401 });
  const omejitev = await omejiApi(request, 'ekipa-odstrani', 20, user.id);
  if (omejitev) return omejitev;

  let body: { userId?: string };
  try { body = await preberiJson(request, 5_000); }
  catch (error) { return NextResponse.json({ error: sporociloValidacije(error) }, { status: 400 }); }
  const targetId = String(body.userId || '').trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(targetId)) {
    return NextResponse.json({ error: 'Neveljaven član.' }, { status: 400 });
  }

  const ctx = await resolveContext(supabase, user.id);
  if (!ctx || (ctx.role !== 'owner' && ctx.role !== 'admin')) {
    return NextResponse.json({ error: 'Za urejanje ekipe potrebuješ skrbniške pravice.' }, { status: 403 });
  }
  if (targetId === user.id) return NextResponse.json({ error: 'Sebe ne moreš odstraniti.' }, { status: 400 });

  /* Preveri cilja prek RLS clienta (član vidi članstva svojega orga). */
  const target = await preberiClanstvo(supabase, ctx.organizationId, targetId);
  if (!target) return NextResponse.json({ error: 'Član ni v tej ekipi.' }, { status: 404 });
  if (String(target.role) === 'owner') return NextResponse.json({ error: 'Lastnika organizacije ni mogoče odstraniti.' }, { status: 400 });

  /* Izbris prek RLS clienta — politika "admins manage memberships" dovoli adminu. */
  const { error: delError } = await supabase
    .from('organization_members')
    .delete()
    .eq('organization_id', ctx.organizationId)
    .eq('user_id', targetId);
  if (delError) return NextResponse.json({ error: 'Člana ni bilo mogoče odstraniti.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

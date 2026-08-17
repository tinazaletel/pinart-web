import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { omejiApi } from '@/lib/rate-limit';
import { preberiJson, sporociloValidacije } from '@/lib/validacija';

/* Seznam ekipe v oblaku (Faza 3). E-pošte članov so v auth.users (RLS jih klientu
   ne izpostavi), zato jih preberemo strežniško prek admin (service_role) clienta.
   - GET: člani (organization_members + profil + e-pošta) + čakajoča vabila (samo admin).
   - DELETE: admin odstrani člana (user_id v body); ownerja in sebe ne more odstraniti. */

async function resolveContext(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', userId)
    .limit(1);
  const row = data?.[0];
  return row ? { organizationId: String(row.organization_id), role: String(row.role) } : null;
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

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: 'Ekipa v oblaku ni konfigurirana.' }, { status: 503 });

  const { data: memberRows } = await admin
    .from('organization_members')
    .select('user_id, role, created_at')
    .eq('organization_id', ctx.organizationId)
    .order('created_at', { ascending: true });
  const rows = memberRows || [];
  const userIds = rows.map((r) => String(r.user_id));

  const { data: profileRows } = userIds.length
    ? await admin.from('profiles').select('id, full_name').in('id', userIds)
    : { data: [] as { id: string; full_name: string | null }[] };
  const imenaById = new Map((profileRows || []).map((p) => [String(p.id), p.full_name || '']));

  /* E-pošta iz auth.users prek admin API (na člana; za majhne ekipe povsem OK). */
  const clani = await Promise.all(rows.map(async (r) => {
    const uid = String(r.user_id);
    let email = '';
    try {
      const { data: u } = await admin.auth.admin.getUserById(uid);
      email = u?.user?.email || '';
    } catch { /* e-pošta ni kljucna za prikaz */ }
    return { userId: uid, email, fullName: imenaById.get(uid) || '', role: String(r.role), isSelf: uid === user.id };
  }));

  /* Čakajoča vabila vidi samo admin (RLS na organization_invites je admin-only). */
  let vabila: { id: string; email: string; role: string; expiresAt: string }[] = [];
  if (jeAdmin) {
    const { data: inviteRows } = await admin
      .from('organization_invites')
      .select('id, email, role, expires_at')
      .eq('organization_id', ctx.organizationId)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });
    vabila = (inviteRows || []).map((i) => ({ id: String(i.id), email: String(i.email), role: String(i.role), expiresAt: String(i.expires_at) }));
  }

  return NextResponse.json({ jeAdmin, clani, vabila });
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

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: 'Ekipa v oblaku ni konfigurirana.' }, { status: 503 });

  const { data: target } = await admin
    .from('organization_members')
    .select('role')
    .eq('organization_id', ctx.organizationId)
    .eq('user_id', targetId)
    .maybeSingle();
  if (!target) return NextResponse.json({ error: 'Član ni v tej ekipi.' }, { status: 404 });
  if (String(target.role) === 'owner') return NextResponse.json({ error: 'Lastnika organizacije ni mogoče odstraniti.' }, { status: 400 });

  const { error: delError } = await admin
    .from('organization_members')
    .delete()
    .eq('organization_id', ctx.organizationId)
    .eq('user_id', targetId);
  if (delError) return NextResponse.json({ error: 'Člana ni bilo mogoče odstraniti.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

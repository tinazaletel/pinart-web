import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import { preberiJson, sporociloValidacije } from '@/lib/validacija';

type IzbrisRequest = { confirm?: string; userId?: string };

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Prijava je potekla.' }, { status: 401 });

  let body: IzbrisRequest;
  try { body = await preberiJson<IzbrisRequest>(request, 2_000); }
  catch (error) { return NextResponse.json({ error: sporociloValidacije(error) }, { status: 400 }); }

  if (body.userId && body.userId !== user.id) {
    return NextResponse.json({ error: 'Brisanje tujega računa ni dovoljeno.' }, { status: 403 });
  }
  if (body.confirm !== 'IZBRIŠI') {
    return NextResponse.json({ error: 'Za potrditev vpiši IZBRIŠI.' }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: 'Brisanje ni konfigurirano.' }, { status: 503 });
  const now = new Date().toISOString();

  const { data: deletionRequest, error: auditError } = await admin.from('user_data_requests').insert({
    user_id: user.id,
    request_type: 'delete',
    status: 'pending',
    metadata: { mode: 'soft-delete' },
  }).select('id').single();
  if (auditError || !deletionRequest) {
    return NextResponse.json({ error: 'Zahteve ni bilo mogoče zabeležiti.' }, { status: 500 });
  }

  const { error: profileError } = await admin.from('profiles').update({ deleted_at: now }).eq('id', user.id);
  const { error: membershipError } = await admin.from('organization_members').update({ disabled_at: now }).eq('user_id', user.id);
  if (profileError || membershipError) {
    await admin.from('user_data_requests').update({ status: 'failed', completed_at: now }).eq('id', deletionRequest.id);
    return NextResponse.json({ error: 'Računa ni bilo mogoče označiti za izbris.' }, { status: 500 });
  }

  const { error: authError } = await admin.auth.admin.updateUserById(user.id, { ban_duration: '876000h' });
  if (authError) {
    await admin.from('user_data_requests').update({
      status: 'failed', completed_at: now, metadata: { mode: 'soft-delete', auth_error: true },
    }).eq('id', deletionRequest.id);
    return NextResponse.json({ error: 'Dostopa ni bilo mogoče dokončno onemogočiti.' }, { status: 500 });
  }

  const { error: completedAuditError } = await admin
    .from('user_data_requests')
    .update({ status: 'completed', completed_at: now })
    .eq('id', deletionRequest.id);
  if (completedAuditError) {
    return NextResponse.json({
      error: 'Dostop je onemogočen, zaključka zahteve pa ni bilo mogoče zabeležiti.',
    }, { status: 500 });
  }
  return NextResponse.json({ ok: true, deletedAt: now, mode: 'soft-delete' });
}

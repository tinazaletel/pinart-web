import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';

const ORGANIZACIJSKE_TABELE = [
  'clients', 'offers', 'contracts', 'invoices', 'expenses', 'retainers',
  'business_goals', 'business_canvases', 'business_plans', 'organization_settings',
  'accounting_exports', 'document_files', 'document_audit', 'project_mail',
  'private_time_entries', 'dogodki', 'chat_thread', 'ai_usage', 'mail_log',
] as const;

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Prijava je potekla.' }, { status: 401 });

  const zahtevaniUporabnik = new URL(request.url).searchParams.get('userId');
  if (zahtevaniUporabnik && zahtevaniUporabnik !== user.id) {
    return NextResponse.json({ error: 'Dostop do tujega izvoza ni dovoljen.' }, { status: 403 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: 'Izvoz ni konfiguriran.' }, { status: 503 });

  const { data: memberships, error: membershipError } = await admin
    .from('organization_members')
    .select('*')
    .eq('user_id', user.id);
  if (membershipError) return NextResponse.json({ error: 'Izvoza ni bilo mogoče pripraviti.' }, { status: 500 });

  const organizationIds = (memberships || []).map(row => String(row.organization_id));
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).maybeSingle();
  const { data: organizations } = organizationIds.length
    ? await admin.from('organizations').select('*').in('id', organizationIds)
    : { data: [] };

  const podatki: Record<string, unknown[]> = {};
  for (const tabela of ORGANIZACIJSKE_TABELE) {
    if (!organizationIds.length) {
      podatki[tabela] = [];
      continue;
    }
    const { data, error } = await admin.from(tabela).select('*').in('organization_id', organizationIds);
    if (error) {
      return NextResponse.json({ error: `Izvoz tabele ${tabela} ni uspel.` }, { status: 500 });
    }
    podatki[tabela] = data || [];
  }

  await admin.from('user_data_requests').insert({
    user_id: user.id,
    request_type: 'export',
    status: 'completed',
    completed_at: new Date().toISOString(),
    metadata: { organization_count: organizationIds.length },
  });

  return NextResponse.json({
    format: 'pinart-flow-export',
    version: 1,
    exportedAt: new Date().toISOString(),
    user: { id: user.id, email: user.email, profile },
    organizations: organizations || [],
    memberships: memberships || [],
    flow: podatki,
  }, {
    headers: { 'Content-Disposition': `attachment; filename="pinart-flow-${new Date().toISOString().slice(0, 10)}.json"` },
  });
}


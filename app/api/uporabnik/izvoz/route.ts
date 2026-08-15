import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import { omejiApi } from '@/lib/rate-limit';

const ORGANIZACIJSKE_TABELE = [
  'clients', 'offers', 'contracts', 'invoices', 'expenses', 'retainers',
  'business_goals', 'business_canvases', 'business_plans', 'organization_settings',
  'accounting_exports', 'document_files', 'document_audit', 'project_mail',
  'organization_subscriptions', 'mail_log',
] as const;

const OSEBNE_TABELE = [
  'private_time_entries', 'presence_entries', 'ai_usage', 'user_data_requests',
] as const;

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Prijava je potekla.' }, { status: 401 });

  const omejitev = await omejiApi(request, 'uporabnik-izvoz', 10, user.id);
  if (omejitev) return omejitev;

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
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();
  if (profileError) return NextResponse.json({ error: 'Profila ni bilo mogoče izvoziti.' }, { status: 500 });

  const { data: organizations, error: organizationsError } = organizationIds.length
    ? await admin.from('organizations').select('*').in('id', organizationIds)
    : { data: [], error: null };
  if (organizationsError) {
    return NextResponse.json({ error: 'Organizacij ni bilo mogoče izvoziti.' }, { status: 500 });
  }

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

  for (const tabela of OSEBNE_TABELE) {
    const { data, error } = await admin.from(tabela).select('*').eq('user_id', user.id);
    if (error) {
      return NextResponse.json({ error: `Izvoz tabele ${tabela} ni uspel.` }, { status: 500 });
    }
    podatki[tabela] = data || [];
  }

  // Inbound token je varnostna poverilnica in ne sodi v prenosljiv izvoz.
  const { data: projectInbox, error: projectInboxError } = organizationIds.length
    ? await admin
      .from('project_inbox')
      .select('id, organization_id, project_external_id, created_at')
      .in('organization_id', organizationIds)
    : { data: [], error: null };
  if (projectInboxError) {
    return NextResponse.json({ error: 'Izvoz projektnih naslovov ni uspel.' }, { status: 500 });
  }
  podatki.project_inbox = projectInbox || [];

  // Klepet je lahko med uporabniki različnih organizacij. Izvozimo le niti,
  // kjer je prijavljeni uporabnik udeleženec, ne vseh niti njegove organizacije.
  const userEmail = user.email?.trim().toLowerCase();
  const { data: chatParticipants, error: chatParticipantsError } = userEmail
    ? await admin.from('chat_participant').select('*').ilike('email', userEmail)
    : { data: [], error: null };
  if (chatParticipantsError) {
    return NextResponse.json({ error: 'Izvoz udeležb v klepetih ni uspel.' }, { status: 500 });
  }
  const threadIds = [...new Set((chatParticipants || []).map(row => String(row.thread_id)))];
  const { data: chatThreads, error: chatThreadsError } = threadIds.length
    ? await admin.from('chat_thread').select('*').in('id', threadIds)
    : { data: [], error: null };
  const { data: chatMessages, error: chatMessagesError } = threadIds.length
    ? await admin.from('chat_message').select('*').in('thread_id', threadIds)
    : { data: [], error: null };
  if (chatThreadsError || chatMessagesError) {
    return NextResponse.json({ error: 'Izvoz klepetov ni uspel.' }, { status: 500 });
  }
  podatki.chat_participant = chatParticipants || [];
  podatki.chat_thread = chatThreads || [];
  podatki.chat_message = chatMessages || [];

  const { error: auditError } = await admin.from('user_data_requests').insert({
    user_id: user.id,
    request_type: 'export',
    status: 'completed',
    completed_at: new Date().toISOString(),
    metadata: { organization_count: organizationIds.length },
  });
  if (auditError) {
    return NextResponse.json({ error: 'Izvoza ni bilo mogoče zabeležiti.' }, { status: 500 });
  }

  return NextResponse.json({
    format: 'pinart-flow-export',
    version: 1,
    exportedAt: new Date().toISOString(),
    user: { id: user.id, email: user.email, profile },
    organizations: organizations || [],
    memberships: memberships || [],
    flow: podatki,
  }, {
    headers: {
      'Cache-Control': 'private, no-store',
      'Content-Disposition': `attachment; filename="pinart-flow-${new Date().toISOString().slice(0, 10)}.json"`,
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

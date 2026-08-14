import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { decryptAiSecret } from '@/lib/aiConnections';
import { testAiProvider } from '@/lib/aiProviderClient';
import { omejiApi } from '@/lib/rate-limit';
import { preberiJson, sporociloValidacije } from '@/lib/validacija';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ADMIN_ROLES = new Set(['owner', 'admin']);

export async function POST(request: Request, { params }: { params: { id: string } }) {
  let body: { organizationId?: unknown };
  try {
    body = await preberiJson(request, 2_000);
  } catch (error) {
    return NextResponse.json({ error: sporociloValidacije(error) }, { status: 400 });
  }
  const organizationId = typeof body.organizationId === 'string' ? body.organizationId : '';
  if (!UUID.test(params.id) || !UUID.test(organizationId)) {
    return NextResponse.json({ error: 'Povezava ali podjetje ni veljavno.' }, { status: 400 });
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Prijava je potekla.' }, { status: 401 });
  const limited = await omejiApi(request, 'ai-povezava-test', 10, user.id);
  if (limited) return limited;

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: 'Povezave AI niso konfigurirane.' }, { status: 503 });
  const { data: membership } = await admin.from('organization_members')
    .select('role,disabled_at').eq('organization_id', organizationId).eq('user_id', user.id).maybeSingle();
  if (!membership || membership.disabled_at || !ADMIN_ROLES.has(membership.role)) {
    return NextResponse.json({ error: 'Za to dejanje nimaš dovoljenja.' }, { status: 403 });
  }

  const { data: connection } = await admin.from('organization_ai_connections')
    .select('provider,model,endpoint_url,encrypted_secret')
    .eq('id', params.id).eq('organization_id', organizationId).maybeSingle();
  if (!connection) return NextResponse.json({ error: 'Povezave ni bilo mogoče najti.' }, { status: 404 });
  if (connection.provider === 'custom-mcp') {
    return NextResponse.json({ error: 'Preverjanje MCP povezav še ni podprto.' }, { status: 400 });
  }

  const testedAt = new Date().toISOString();
  try {
    await testAiProvider(connection, decryptAiSecret(connection.encrypted_secret));
    await admin.from('organization_ai_connections').update({
      status: 'verified', last_tested_at: testedAt, last_error: null,
    }).eq('id', params.id).eq('organization_id', organizationId);
    return NextResponse.json({ ok: true, testedAt });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : 'Povezave ni bilo mogoče preveriti.';
    await admin.from('organization_ai_connections').update({
      status: 'error', last_tested_at: testedAt, last_error: message,
    }).eq('id', params.id).eq('organization_id', organizationId);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

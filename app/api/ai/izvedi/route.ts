import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { decryptAiSecret, normalizeAiPermissions } from '@/lib/aiConnections';
import { runAiProvider } from '@/lib/aiProviderClient';
import { omejiApi } from '@/lib/rate-limit';
import { preberiJson, sporociloValidacije } from '@/lib/validacija';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RunBody = { organizationId?: unknown; connectionId?: unknown; prompt?: unknown };

export async function POST(request: Request) {
  let body: RunBody;
  try {
    body = await preberiJson(request, 40_000);
  } catch (error) {
    return NextResponse.json({ error: sporociloValidacije(error) }, { status: 400 });
  }
  const organizationId = typeof body.organizationId === 'string' ? body.organizationId : '';
  const connectionId = typeof body.connectionId === 'string' ? body.connectionId : '';
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (!UUID.test(organizationId) || !UUID.test(connectionId) || !prompt || prompt.length > 32_000) {
    return NextResponse.json({ error: 'Zahteva za AI ni veljavna.' }, { status: 400 });
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Prijava je potekla.' }, { status: 401 });
  const limited = await omejiApi(request, 'ai-izvedi', 20, user.id);
  if (limited) return limited;

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: 'Povezave AI niso konfigurirane.' }, { status: 503 });
  const { data: membership } = await admin.from('organization_members')
    .select('disabled_at').eq('organization_id', organizationId).eq('user_id', user.id).maybeSingle();
  if (!membership || membership.disabled_at) {
    return NextResponse.json({ error: 'Za to dejanje nimaš dovoljenja.' }, { status: 403 });
  }

  const { data: connection } = await admin.from('organization_ai_connections')
    .select('provider,model,endpoint_url,encrypted_secret,permissions,status')
    .eq('id', connectionId).eq('organization_id', organizationId).maybeSingle();
  if (!connection) return NextResponse.json({ error: 'Povezave ni bilo mogoče najti.' }, { status: 404 });
  if (connection.status === 'disabled') return NextResponse.json({ error: 'Povezava je izklopljena.' }, { status: 409 });
  if (connection.provider === 'custom-mcp') {
    return NextResponse.json({ error: 'Izvajanje prek MCP povezave še ni podprto.' }, { status: 400 });
  }
  const permissions = normalizeAiPermissions(connection.permissions);
  if (!permissions.read || !permissions.draft) {
    return NextResponse.json({ error: 'Povezava nima dovoljenja za pripravo vsebine.' }, { status: 403 });
  }

  try {
    const result = await runAiProvider(connection, decryptAiSecret(connection.encrypted_secret), prompt);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : 'AI zahteve ni bilo mogoče izvesti.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

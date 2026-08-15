import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { omejenNiz, preberiJson, sporociloValidacije } from '@/lib/validacija';
import { omejiApi } from '@/lib/rate-limit';
import {
  encryptAiSecret,
  isAiConnectionType,
  isAiProvider,
  isSafeAiEndpoint,
  maskAiSecret,
  normalizeAiPermissions,
} from '@/lib/aiConnections';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ADMIN_ROLES = new Set(['owner', 'admin']);

type ConnectionBody = {
  organizationId?: string;
  connectionType?: unknown;
  provider?: unknown;
  label?: unknown;
  model?: unknown;
  endpointUrl?: unknown;
  secret?: unknown;
  permissions?: unknown;
};

async function context(request: Request, requireAdmin = false, requestedOrganizationId?: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Prijava je potekla.' }, { status: 401 }) };

  const organizationId = requestedOrganizationId
    ?? new URL(request.url).searchParams.get('organizationId');
  if (!organizationId || !UUID.test(organizationId)) {
    return { error: NextResponse.json({ error: 'Izberi veljavno podjetje.' }, { status: 400 }) };
  }
  const admin = createAdminClient();
  if (!admin) return { error: NextResponse.json({ error: 'Povezave AI niso konfigurirane.' }, { status: 503 }) };

  const { data: membership } = await admin
    .from('organization_members')
    .select('role,disabled_at')
    .eq('organization_id', organizationId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!membership || membership.disabled_at || (requireAdmin && !ADMIN_ROLES.has(membership.role))) {
    return { error: NextResponse.json({ error: 'Za to dejanje nimaš dovoljenja.' }, { status: 403 }) };
  }
  return { admin, user, organizationId };
}

export async function GET(request: Request) {
  const ctx = await context(request);
  if ('error' in ctx) return ctx.error;
  const omejitev = await omejiApi(request, 'ai-povezave', 30, ctx.user.id);
  if (omejitev) return omejitev;
  const { data, error } = await ctx.admin
    .from('organization_ai_connections')
    .select('id,connection_type,provider,label,model,endpoint_url,secret_hint,permissions,status,last_tested_at,last_error,created_at,updated_at')
    .eq('organization_id', ctx.organizationId)
    .order('created_at');
  if (error) return NextResponse.json({ error: 'Povezav ni bilo mogoče prebrati.' }, { status: 500 });
  return NextResponse.json({ connections: data ?? [] });
}

export async function POST(request: Request) {
  let body: ConnectionBody;
  try {
    body = await preberiJson(request, 20_000);
  } catch (error) {
    return NextResponse.json({ error: sporociloValidacije(error) }, { status: 400 });
  }
  const organizationId = typeof body.organizationId === 'string' ? body.organizationId : '';
  const ctx = await context(request, true, organizationId);
  if ('error' in ctx) return ctx.error;
  const omejitev = await omejiApi(request, 'ai-povezave', 30, ctx.user.id);
  if (omejitev) return omejitev;

  const label = typeof body.label === 'string' ? body.label.trim() : '';
  const model = typeof body.model === 'string' ? body.model.trim() : null;
  const endpointUrl = typeof body.endpointUrl === 'string' ? body.endpointUrl.trim() : null;
  const secret = typeof body.secret === 'string' ? body.secret.trim() : '';
  if (!isAiConnectionType(body.connectionType) || !isAiProvider(body.provider)
      || !omejenNiz(label, 100, true) || (model !== null && !omejenNiz(model, 150))
      || !isSafeAiEndpoint(endpointUrl) || !secret || secret.length > 8_192) {
    return NextResponse.json({ error: 'Podatki povezave niso veljavni.' }, { status: 400 });
  }
  if (body.connectionType === 'mcp' && !endpointUrl) {
    return NextResponse.json({ error: 'Za MCP povezavo je potreben varen HTTPS naslov.' }, { status: 400 });
  }

  let encryptedSecret: string;
  try {
    encryptedSecret = encryptAiSecret(secret);
  } catch {
    return NextResponse.json({ error: 'Varno shranjevanje ključev ni konfigurirano.' }, { status: 503 });
  }

  const { data, error } = await ctx.admin
    .from('organization_ai_connections')
    .insert({
      organization_id: ctx.organizationId,
      connection_type: body.connectionType,
      provider: body.provider,
      label,
      model: model || null,
      endpoint_url: endpointUrl || null,
      encrypted_secret: encryptedSecret,
      secret_hint: maskAiSecret(secret),
      permissions: normalizeAiPermissions(body.permissions),
      created_by: ctx.user.id,
    })
    .select('id,connection_type,provider,label,model,endpoint_url,secret_hint,permissions,status,created_at,updated_at')
    .single();
  if (error) {
    const duplicate = error.code === '23505';
    return NextResponse.json(
      { error: duplicate ? 'Povezava s tem imenom že obstaja.' : 'Povezave ni bilo mogoče shraniti.' },
      { status: duplicate ? 409 : 500 },
    );
  }
  return NextResponse.json({ connection: data }, { status: 201 });
}

export async function DELETE(request: Request) {
  const ctx = await context(request, true);
  if ('error' in ctx) return ctx.error;
  const omejitev = await omejiApi(request, 'ai-povezave', 30, ctx.user.id);
  if (omejitev) return omejitev;
  const id = new URL(request.url).searchParams.get('id');
  if (!id || !UUID.test(id)) return NextResponse.json({ error: 'Povezava ni veljavna.' }, { status: 400 });
  const { error } = await ctx.admin
    .from('organization_ai_connections')
    .delete()
    .eq('id', id)
    .eq('organization_id', ctx.organizationId);
  if (error) return NextResponse.json({ error: 'Povezave ni bilo mogoče odstraniti.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

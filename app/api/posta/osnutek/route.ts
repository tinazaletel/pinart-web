import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { decryptAiSecret, normalizeAiPermissions } from '@/lib/aiConnections';
import { runAiProvider } from '@/lib/aiProviderClient';
import { buildMailReplyPrompt, replySubject } from '@/lib/mailAiDraft';
import { omejiApi } from '@/lib/rate-limit';
import { preberiJson, sporociloValidacije } from '@/lib/validacija';
import { preberiClanstvo } from '@/lib/clanstvo';

export const runtime = 'nodejs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type DraftBody = {
  organizationId?: unknown;
  sourceMailId?: unknown;
  engine?: unknown;
  connectionId?: unknown;
  instructions?: unknown;
};

export async function POST(request: Request) {
  let body: DraftBody;
  try {
    body = await preberiJson(request, 12_000);
  } catch (error) {
    return NextResponse.json({ error: sporociloValidacije(error) }, { status: 400 });
  }

  const organizationId = typeof body.organizationId === 'string' ? body.organizationId : '';
  const sourceMailId = typeof body.sourceMailId === 'string' ? body.sourceMailId : '';
  const engine = body.engine === 'pupa' || body.engine === 'connection' ? body.engine : null;
  const connectionId = typeof body.connectionId === 'string' ? body.connectionId : '';
  const instructions = typeof body.instructions === 'string' ? body.instructions.trim() : '';
  if (!UUID.test(organizationId) || !UUID.test(sourceMailId) || !engine || instructions.length > 4_000) {
    return NextResponse.json({ error: 'Zahteva za osnutek ni veljavna.' }, { status: 400 });
  }
  if (engine === 'connection' && !UUID.test(connectionId)) {
    return NextResponse.json({ error: 'Izberi veljavno povezavo AI.' }, { status: 400 });
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Prijava je potekla.' }, { status: 401 });
  const limited = await omejiApi(request, 'posta-ai-osnutek', 15, user.id);
  if (limited) return limited;

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: 'Poštno zaledje ni konfigurirano.' }, { status: 503 });
  const membership = await preberiClanstvo(admin, organizationId, user.id);
  if (!membership || membership.disabled_at) {
    return NextResponse.json({ error: 'Za to dejanje nimaš dovoljenja.' }, { status: 403 });
  }

  const { data: sourceMail } = await admin.from('project_mail')
    .select('id,project_external_id,client_id,from_email,subject,body_text,message_id')
    .eq('id', sourceMailId).eq('organization_id', organizationId)
    .eq('direction', 'in').is('deleted_at', null).maybeSingle();
  if (!sourceMail) return NextResponse.json({ error: 'Prejetega sporočila ni bilo mogoče najti.' }, { status: 404 });
  if (!sourceMail.from_email) {
    return NextResponse.json({ error: 'Sporočilo nima naslova za odgovor.' }, { status: 409 });
  }

  const prompt = buildMailReplyPrompt({
    fromEmail: sourceMail.from_email,
    subject: sourceMail.subject,
    bodyText: sourceMail.body_text,
  }, instructions);

  let aiConnectionId: string | null = null;
  let generatedBy: 'pupa' | 'connected-ai';
  let generatedText: string;
  try {
    if (engine === 'connection') {
      const { data: connection } = await admin.from('organization_ai_connections')
        .select('provider,model,endpoint_url,encrypted_secret,permissions,status')
        .eq('id', connectionId).eq('organization_id', organizationId).maybeSingle();
      if (!connection || connection.status === 'disabled') {
        return NextResponse.json({ error: 'Povezava AI ni na voljo.' }, { status: 404 });
      }
      if (connection.provider === 'custom-mcp') {
        return NextResponse.json({ error: 'MCP povezava še ne podpira mail osnutkov.' }, { status: 400 });
      }
      const permissions = normalizeAiPermissions(connection.permissions);
      if (!permissions.read || !permissions.draft) {
        return NextResponse.json({ error: 'Povezava nima dovoljenja za pripravo osnutkov.' }, { status: 403 });
      }
      generatedText = (await runAiProvider(connection, decryptAiSecret(connection.encrypted_secret), prompt)).text;
      aiConnectionId = connectionId;
      generatedBy = 'connected-ai';
    } else {
      const { data: rows, error } = await supabase.rpc('current_organization_entitlements');
      const entitlement = Array.isArray(rows) ? rows[0] : null;
      const validUntil = entitlement?.valid_until ? new Date(String(entitlement.valid_until)).getTime() : null;
      const allowed = !error && entitlement?.organization_id === organizationId
        && entitlement?.tier === 'pro'
        && (entitlement.status === 'active' || entitlement.status === 'trialing')
        && (!validUntil || validUntil >= Date.now());
      if (!allowed) return NextResponse.json({ error: 'Pupa je na voljo v paketu Pro.' }, { status: 403 });
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) return NextResponse.json({ error: 'Pupa trenutno ni konfigurirana.' }, { status: 503 });
      generatedText = (await runAiProvider({
        provider: 'anthropic',
        model: process.env.PUPA_MODEL || 'claude-sonnet-5',
        endpoint_url: null,
      }, apiKey, prompt)).text;
      generatedBy = 'pupa';
    }
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : 'Osnutka ni bilo mogoče pripraviti.';
    return NextResponse.json({ error: message }, { status: 502 });
  }

  if (!generatedText.trim()) {
    return NextResponse.json({ error: 'AI je vrnil prazen osnutek.' }, { status: 502 });
  }
  const now = new Date().toISOString();
  const { data: draft, error: insertError } = await admin.from('project_mail').insert({
    organization_id: organizationId,
    project_external_id: sourceMail.project_external_id,
    client_id: sourceMail.client_id,
    direction: 'out',
    from_email: null,
    to_emails: [sourceMail.from_email],
    subject: replySubject(sourceMail.subject),
    body_text: generatedText.trim(),
    body_html: null,
    in_reply_to: sourceMail.message_id,
    occurred_at: now,
    is_draft: true,
    source_mail_id: sourceMail.id,
    ai_connection_id: aiConnectionId,
    draft_generated_by: generatedBy,
  }).select('*').single();
  if (insertError) {
    console.error('Shranjevanje AI mail osnutka ni uspelo:', insertError.message);
    return NextResponse.json({ error: 'Osnutka ni bilo mogoče shraniti.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, draft });
}

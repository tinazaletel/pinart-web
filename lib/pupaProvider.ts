import type { AiProvider } from '@/lib/aiConnections';
import type { StoredAiConnection } from '@/lib/aiProviderClient';

const PONUDNIKI = new Set<AiProvider>(['openai', 'anthropic', 'google', 'mistral', 'openai-compatible']);

export function pupaProviderConfig(env: Record<string, string | undefined> = process.env): { connection: StoredAiConnection; secret: string } | null {
  const raw = (env.PUPA_PROVIDER || 'anthropic').trim().toLowerCase() as AiProvider;
  if (!PONUDNIKI.has(raw)) throw new Error('PUPA_PROVIDER ni podprt.');
  const ponudnikovKljuc = raw === 'openai' ? env.OPENAI_API_KEY
    : raw === 'anthropic' ? env.ANTHROPIC_API_KEY
      : raw === 'google' ? (env.GOOGLE_AI_API_KEY || env.GEMINI_API_KEY)
        : raw === 'mistral' ? env.MISTRAL_API_KEY : undefined;
  const secret = (env.PUPA_API_KEY || ponudnikovKljuc || '').trim();
  if (!secret) return null;
  const endpoint_url = raw === 'openai-compatible' ? (env.PUPA_ENDPOINT_URL || '').trim() || null : null;
  if (raw === 'openai-compatible' && !endpoint_url) throw new Error('Za PUPA_PROVIDER=openai-compatible manjka PUPA_ENDPOINT_URL.');
  return { connection: { provider: raw, model: env.PUPA_MODEL?.trim() || null, endpoint_url }, secret };
}

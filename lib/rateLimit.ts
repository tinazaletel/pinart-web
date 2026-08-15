import { createHash, randomUUID } from 'node:crypto';

type RpcResult<T> = PromiseLike<{ data: T | null; error: { message?: string } | null }>;

type RpcClient = {
  rpc: (name: string, params: Record<string, unknown>) => RpcResult<unknown>;
};

export type AiRateLimitResult = {
  allowed: boolean;
  requestId: string;
};

export function hashIp(ip: string): string {
  const salt = process.env.AI_RATE_LIMIT_SALT || process.env.ANTHROPIC_API_KEY || 'pinart-flow';
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex');
}

export async function checkAiRateLimit(
  supabase: RpcClient,
  organizationId: string,
  ipHash: string,
  limit = 30,
  windowSeconds = 3600,
  model = 'unknown',
): Promise<AiRateLimitResult> {
  const requestId = randomUUID();
  const { data, error } = await supabase.rpc('ai_rate_check', {
    p_organization_id: organizationId,
    p_ip_hash: ipHash,
    p_limit: limit,
    p_window_seconds: windowSeconds,
    p_request_id: requestId,
    p_model: model,
  });

  if (error) throw new Error(error.message || 'AI rate-limit check failed');
  return { allowed: data === true, requestId };
}

export async function recordAiTokens(
  supabase: RpcClient,
  requestId: string,
  tokens: number,
): Promise<void> {
  const { error } = await supabase.rpc('ai_usage_set_tokens', {
    p_request_id: requestId,
    p_tokens: Math.max(0, Math.round(tokens)),
  });
  if (error) throw new Error(error.message || 'AI usage update failed');
}

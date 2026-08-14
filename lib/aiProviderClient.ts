import { isIP } from 'node:net';
import { lookup } from 'node:dns/promises';
import type { AiProvider } from '@/lib/aiConnections';

const TIMEOUT_MS = 15_000;
const MAX_PROMPT = 32_000;
const MAX_RESPONSE = 64_000;

export type StoredAiConnection = {
  provider: AiProvider;
  model: string | null;
  endpoint_url: string | null;
};

type AiResult = { text: string; model?: string };

type ProviderConfig = {
  testUrl: string;
  runUrl: string;
  headers: Record<string, string>;
  model: string;
  format: 'openai' | 'anthropic' | 'google' | 'compatible';
};

function isPrivateIpv4(address: string): boolean {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return true;
  const [a, b] = parts;
  return a === 0 || a === 10 || a === 127
    || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168) || a >= 224;
}

function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 4) return isPrivateIpv4(address);
  const normalized = address.toLowerCase();
  return normalized === '::' || normalized === '::1'
    || normalized.startsWith('fc') || normalized.startsWith('fd')
    || normalized.startsWith('fe8') || normalized.startsWith('fe9')
    || normalized.startsWith('fea') || normalized.startsWith('feb')
    || normalized.startsWith('::ffff:127.') || normalized.startsWith('::ffff:10.')
    || normalized.startsWith('::ffff:192.168.');
}

async function assertPublicEndpoint(rawUrl: string): Promise<URL> {
  const url = new URL(rawUrl);
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new Error('Povezava mora uporabljati varen HTTPS naslov.');
  }
  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error('Naslov povezave ni dovoljen.');
  }
  return url;
}

function appendPath(base: string, path: string): string {
  const url = new URL(base.endsWith('/') ? base : `${base}/`);
  const basePath = url.pathname.replace(/\/$/, '');
  url.pathname = `${basePath}${path}`;
  return url.toString();
}

function providerConfig(connection: StoredAiConnection, secret: string): ProviderConfig {
  switch (connection.provider) {
    case 'openai':
      return {
        testUrl: 'https://api.openai.com/v1/models',
        runUrl: 'https://api.openai.com/v1/responses',
        headers: { Authorization: `Bearer ${secret}` },
        model: connection.model || 'gpt-4.1-mini',
        format: 'openai' as const,
      };
    case 'anthropic':
      return {
        testUrl: 'https://api.anthropic.com/v1/models',
        runUrl: 'https://api.anthropic.com/v1/messages',
        headers: { 'x-api-key': secret, 'anthropic-version': '2023-06-01' },
        model: connection.model || 'claude-sonnet-4-20250514',
        format: 'anthropic' as const,
      };
    case 'google':
      return {
        testUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
        runUrl: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(connection.model || 'gemini-2.5-flash')}:generateContent`,
        headers: { 'x-goog-api-key': secret },
        model: connection.model || 'gemini-2.5-flash',
        format: 'google' as const,
      };
    case 'mistral':
      return {
        testUrl: 'https://api.mistral.ai/v1/models',
        runUrl: 'https://api.mistral.ai/v1/chat/completions',
        headers: { Authorization: `Bearer ${secret}` },
        model: connection.model || 'mistral-small-latest',
        format: 'compatible' as const,
      };
    case 'openai-compatible': {
      if (!connection.endpoint_url) throw new Error('Manjka naslov ponudnika.');
      return {
        testUrl: appendPath(connection.endpoint_url, '/models'),
        runUrl: appendPath(connection.endpoint_url, '/chat/completions'),
        headers: { Authorization: `Bearer ${secret}` },
        model: connection.model || '',
        format: 'compatible' as const,
      };
    }
    default:
      throw new Error('MCP povezava se preverja z MCP odjemalcem.');
  }
}

async function safeFetch(url: string, init: RequestInit, customEndpoint = false): Promise<Response> {
  if (customEndpoint) await assertPublicEndpoint(url);
  return fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS), redirect: 'error' });
}

function safeProviderError(status: number): string {
  if (status === 401 || status === 403) return 'Ključ ni veljaven ali nima dovoljenja.';
  if (status === 429) return 'Ponudnik je začasno omejil število zahtev.';
  return `Ponudnik je vrnil napako (${status}).`;
}

export async function testAiProvider(connection: StoredAiConnection, secret: string): Promise<void> {
  const config = providerConfig(connection, secret);
  const response = await safeFetch(config.testUrl, {
    method: 'GET',
    headers: { Accept: 'application/json', ...config.headers },
  }, connection.provider === 'openai-compatible');
  if (!response.ok) throw new Error(safeProviderError(response.status));
}

export async function runAiProvider(
  connection: StoredAiConnection,
  secret: string,
  prompt: string,
): Promise<AiResult> {
  const input = prompt.trim();
  if (!input || input.length > MAX_PROMPT) throw new Error('Navodilo je prazno ali predolgo.');
  const config = providerConfig(connection, secret);
  if (!config.model) throw new Error('Za povezavo izberi model.');

  let body: Record<string, unknown>;
  if (config.format === 'openai') {
    body = { model: config.model, input, max_output_tokens: 2_000 };
  } else if (config.format === 'anthropic') {
    body = { model: config.model, max_tokens: 2_000, messages: [{ role: 'user', content: input }] };
  } else if (config.format === 'google') {
    body = { contents: [{ role: 'user', parts: [{ text: input }] }] };
  } else {
    body = { model: config.model, messages: [{ role: 'user', content: input }], max_tokens: 2_000 };
  }

  const response = await safeFetch(config.runUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...config.headers },
    body: JSON.stringify(body),
  }, connection.provider === 'openai-compatible');
  if (!response.ok) throw new Error(safeProviderError(response.status));
  const raw = await response.text();
  if (raw.length > MAX_RESPONSE) throw new Error('Odgovor ponudnika je predolg.');
  const data = JSON.parse(raw) as Record<string, any>;

  let text = '';
  if (config.format === 'openai') text = data.output_text || data.output?.flatMap((item: any) => item.content || []).map((item: any) => item.text || '').join('') || '';
  else if (config.format === 'anthropic') text = data.content?.map((item: any) => item.text || '').join('') || '';
  else if (config.format === 'google') text = data.candidates?.[0]?.content?.parts?.map((item: any) => item.text || '').join('') || '';
  else text = data.choices?.[0]?.message?.content || '';
  if (!text.trim()) throw new Error('Ponudnik ni vrnil besedilnega odgovora.');
  return { text: text.trim(), model: config.model };
}

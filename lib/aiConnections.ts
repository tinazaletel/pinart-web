import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

export const AI_CONNECTION_TYPES = ['api', 'mcp'] as const;
export const AI_PROVIDERS = [
  'openai',
  'anthropic',
  'google',
  'mistral',
  'openai-compatible',
  'custom-mcp',
] as const;

export type AiConnectionType = typeof AI_CONNECTION_TYPES[number];
export type AiProvider = typeof AI_PROVIDERS[number];

export type AiConnectionPermissions = {
  read: boolean;
  draft: boolean;
  send: boolean;
  delete: boolean;
};

export const DEFAULT_AI_PERMISSIONS: AiConnectionPermissions = {
  read: true,
  draft: true,
  send: false,
  delete: false,
};

const VERSION = 'v1';

function encryptionKey(): Buffer {
  const raw = process.env.AI_CREDENTIALS_ENCRYPTION_KEY?.trim();
  if (!raw) throw new Error('AI_CREDENTIALS_ENCRYPTION_KEY ni nastavljen.');

  const key = /^[0-9a-f]{64}$/i.test(raw)
    ? Buffer.from(raw, 'hex')
    : Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error('AI_CREDENTIALS_ENCRYPTION_KEY mora vsebovati 32 bajtov.');
  }
  return key;
}

export function encryptAiSecret(secret: string): string {
  if (!secret.trim() || secret.length > 8_192) throw new Error('Skrivnost ni veljavna.');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join('.');
}

export function decryptAiSecret(payload: string): string {
  const [version, ivPart, tagPart, encryptedPart] = payload.split('.');
  if (version !== VERSION || !ivPart || !tagPart || !encryptedPart) {
    throw new Error('Šifrirana skrivnost ni veljavna.');
  }
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivPart, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedPart, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

export function maskAiSecret(secret: string): string {
  const trimmed = secret.trim();
  return trimmed.length <= 4 ? '••••' : `••••${trimmed.slice(-4)}`;
}

export function isAiConnectionType(value: unknown): value is AiConnectionType {
  return typeof value === 'string' && AI_CONNECTION_TYPES.includes(value as AiConnectionType);
}

export function isAiProvider(value: unknown): value is AiProvider {
  return typeof value === 'string' && AI_PROVIDERS.includes(value as AiProvider);
}

export function normalizeAiPermissions(value: unknown): AiConnectionPermissions {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...DEFAULT_AI_PERMISSIONS };
  const input = value as Record<string, unknown>;
  return {
    read: input.read !== false,
    draft: input.draft !== false,
    send: input.send === true,
    delete: input.delete === true,
  };
}

export function isSafeAiEndpoint(value: string | null | undefined): boolean {
  if (!value) return true;
  if (value.length > 2_048) return false;
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
    if (url.protocol !== 'https:' || url.username || url.password) return false;
    if (['localhost', '0.0.0.0', '::1'].includes(hostname)) return false;
    if (hostname.endsWith('.localhost') || hostname.endsWith('.local')
        || hostname.endsWith('.internal') || hostname.endsWith('.lan')) return false;
    return true;
  } catch {
    return false;
  }
}

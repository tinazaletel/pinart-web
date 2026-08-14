import { afterEach, describe, expect, it } from 'vitest';
import {
  decryptAiSecret,
  encryptAiSecret,
  isSafeAiEndpoint,
  normalizeAiPermissions,
} from '@/lib/aiConnections';

const originalKey = process.env.AI_CREDENTIALS_ENCRYPTION_KEY;

afterEach(() => {
  if (originalKey === undefined) delete process.env.AI_CREDENTIALS_ENCRYPTION_KEY;
  else process.env.AI_CREDENTIALS_ENCRYPTION_KEY = originalKey;
});

describe('AI povezave', () => {
  it('šifrira in pravilno odšifrira poverilnico', () => {
    process.env.AI_CREDENTIALS_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
    const encrypted = encryptAiSecret('skrivni-api-kljuc');
    expect(encrypted).not.toContain('skrivni-api-kljuc');
    expect(decryptAiSecret(encrypted)).toBe('skrivni-api-kljuc');
  });

  it('zavrne nevaren endpoint', () => {
    expect(isSafeAiEndpoint('https://agent.example.com/mcp')).toBe(true);
    expect(isSafeAiEndpoint('http://agent.example.com/mcp')).toBe(false);
    expect(isSafeAiEndpoint('https://localhost/mcp')).toBe(false);
    expect(isSafeAiEndpoint('https://agent.local/mcp')).toBe(false);
    expect(isSafeAiEndpoint('https://user:pass@agent.example.com/mcp')).toBe(false);
    expect(isSafeAiEndpoint('ni-url')).toBe(false);
  });

  it('ne vključi nevarnih dovoljenj brez izrecne izbire', () => {
    expect(normalizeAiPermissions({ read: true })).toEqual({
      read: true,
      draft: true,
      send: false,
      delete: false,
    });
  });
});

import { describe, expect, it } from 'vitest';
import { pupaProviderConfig } from '@/lib/pupaProvider';

describe('Pupin ponudnik', () => {
  it('ni vezan na Anthropic in sprejme OpenAI nastavitev', () => {
    const config = pupaProviderConfig({ PUPA_PROVIDER: 'openai', PUPA_API_KEY: 'skrivnost', PUPA_MODEL: 'gpt-test' });
    expect(config?.connection).toMatchObject({ provider: 'openai', model: 'gpt-test' });
  });

  it('ohrani zdruzljiv privzeti Anthropic kljuc', () => {
    expect(pupaProviderConfig({ ANTHROPIC_API_KEY: 'stari-kljuc' })?.connection.provider).toBe('anthropic');
  });
});

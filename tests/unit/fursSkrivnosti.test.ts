import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { odsifrirajFursSkrivnost, sifrirajFursSkrivnost } from '@/lib/fursSkrivnosti';

describe('FURS skrivnosti', () => {
  it('zasebni ključ šifrira in pravilno odšifrira', () => {
    const kljuc = randomBytes(32);
    const sifrirano = sifrirajFursSkrivnost('ZELO SKRIVEN KLJUČ', kljuc);
    expect(sifrirano.vsebina).not.toContain('SKRIVEN');
    expect(odsifrirajFursSkrivnost(sifrirano, kljuc)).toBe('ZELO SKRIVEN KLJUČ');
  });

  it('spremembo šifrirane vsebine zazna', () => {
    const kljuc = randomBytes(32);
    const sifrirano = sifrirajFursSkrivnost('skrivnost', kljuc);
    const pokvarjeno = { ...sifrirano, vsebina: Buffer.from('pokvarjeno').toString('base64') };
    expect(() => odsifrirajFursSkrivnost(pokvarjeno, kljuc)).toThrow();
  });
});

import { describe, expect, it } from 'vitest';
import { hashPogodbe, hashZetona, varenPosnetekPogodbe } from '@/lib/podpisPogodbe';

describe('podpis pogodbe', () => {
  it('isti posnetek vedno dobi isti SHA-256 hash', () => {
    expect(hashPogodbe('<p>Pogodba A</p>')).toBe(hashPogodbe('<p>Pogodba A</p>'));
    expect(hashPogodbe('<p>Pogodba A</p>')).not.toBe(hashPogodbe('<p>Pogodba B</p>'));
    expect(hashPogodbe('a')).toMatch(/^[a-f0-9]{64}$/);
  });

  it('zetona ne hrani v izvirni obliki in odstrani izvedljiv HTML', () => {
    expect(hashZetona('skrivni-zeton')).not.toContain('skrivni-zeton');
    expect(varenPosnetekPogodbe('<script>alert(1)</script><p onclick="x()">Vsebina</p>')).toBe('<p>Vsebina</p>');
  });
});

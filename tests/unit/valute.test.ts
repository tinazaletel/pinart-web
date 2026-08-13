import { describe, it, expect } from 'vitest';
import { VALUTE_RACUN, valutaZnak } from '@/lib/valute';

/* Seznam valut za dokumente. Preprosto, a se uporablja povsod (račun/retainer/ponudba),
   zato varovalo pred podvojenimi id-ji in pred izgubo privzetka (€). */
describe('valute — integriteta seznama', () => {
  it('ni podvojenih id-jev valut', () => {
    const ids = VALUTE_RACUN.map(v => v.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('vsaka valuta ima neprazen znak in ime', () => {
    for (const v of VALUTE_RACUN) {
      expect(v.znak.length, v.id).toBeGreaterThan(0);
      expect(v.ime.length, v.id).toBeGreaterThan(0);
    }
  });

  it('EUR je v seznamu (privzetek za Slovenijo)', () => {
    expect(VALUTE_RACUN.some(v => v.id === 'eur')).toBe(true);
  });
});

describe('valute — valutaZnak', () => {
  it('vrne pravi znak za znane id-je', () => {
    expect(valutaZnak('eur')).toBe('€');
    expect(valutaZnak('usd')).toBe('$');
    expect(valutaZnak('gbp')).toBe('£');
  });

  it('pade nazaj na € za neznan id', () => {
    expect(valutaZnak('neznana')).toBe('€');
    expect(valutaZnak('')).toBe('€');
  });
});

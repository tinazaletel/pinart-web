import { describe, expect, it } from 'vitest';
import { napakaVzorca, sestaviStevilko } from '@/lib/stevilcenje';

describe('vzorec številčenja', () => {
  it('zahteva zaporedno', () => expect(napakaVzorca('{leto}')).toContain('{zaporedna}'));
  it('zavrne prazen vzorec', () => expect(napakaVzorca('')).not.toBeNull());
  it('dovoli leto in zaporedno', () => expect(napakaVzorca('{leto}-{zaporedna}')).toBeNull());
  it('dovoli vzorec brez leta', () => expect(napakaVzorca('R-{zaporedna}')).toBeNull());
  it('zavrne neznano oznako', () => expect(napakaVzorca('{leto}-{mesec}-{zaporedna}')).not.toBeNull());
  it('zavrne nedokončano oznako', () => expect(napakaVzorca('{leto-{zaporedna}')).not.toBeNull());
});

describe('predogled številke', () => {
  it('zamenja leto in zaporedno', () => expect(sestaviStevilko('{leto}-{zaporedna}', 2026, 15)).toBe('2026-0015'));
  it('ohrani literalno predpono', () => expect(sestaviStevilko('P-{leto}/{zaporedna}', 2026, 7)).toBe('P-2026/0007'));
  it('omogoča prikaz brez vodilnih ničel', () => expect(sestaviStevilko('{leto}-{zaporedna}', 2026, 15, 1)).toBe('2026-15'));
  it('ne odreže daljše številke', () => expect(sestaviStevilko('{zaporedna}', 2026, 12345, 4)).toBe('12345'));
  it('sprejme spodnjo mejo leta', () => expect(sestaviStevilko('{leto}-{zaporedna}', 2000, 1)).toBe('2000-0001'));
  it('sprejme zgornjo mejo leta', () => expect(sestaviStevilko('{leto}-{zaporedna}', 9999, 1)).toBe('9999-0001'));
  it('zavrne leto pod mejo', () => expect(() => sestaviStevilko('{zaporedna}', 1999, 1)).toThrow());
  it('zavrne leto nad mejo', () => expect(() => sestaviStevilko('{zaporedna}', 10000, 1)).toThrow());
  it('zavrne negativno zaporedno', () => expect(() => sestaviStevilko('{zaporedna}', 2026, -1)).toThrow());
  it('zavrne decimalno zaporedno', () => expect(() => sestaviStevilko('{zaporedna}', 2026, 1.5)).toThrow());
});

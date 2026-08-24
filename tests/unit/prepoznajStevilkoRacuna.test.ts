import { describe, expect, it } from 'vitest';
import { prepoznajStevilkoRacuna, uporabiOblikoStevilke } from '@/lib/prepoznajStevilkoRacuna';

describe('prepoznavanje oblike zadnjega računa', () => {
  it.each([
    ['2026-14', '2026-15', '{leto}-{zaporedna}', 2],
    ['14/2026', '15/2026', '{zaporedna}/{leto}', 2],
    ['2026/0014', '2026/0015', '{leto}/{zaporedna}', 4],
    ['R-2026-009', 'R-2026-010', 'R-{leto}-{zaporedna}', 3],
    ['14-2026-R', '15-2026-R', '{zaporedna}-{leto}-R', 2],
    ['2026.99', '2026.100', '{leto}.{zaporedna}', 2],
    [' 2026-0001 ', '2026-0002', '{leto}-{zaporedna}', 4],
    ['INV/2026/7', 'INV/2026/8', 'INV/{leto}/{zaporedna}', 1],
  ])('%s → %s', (vnos, naslednja, oblika, sirina) => {
    expect(prepoznajStevilkoRacuna(vnos, 2026)).toMatchObject({ naslednja, oblika, sirina });
  });

  it.each(['', '14', '2025-14', '2026-14-2', '2026-2026-14'])('ne ugiba pri %s', vnos => {
    expect(prepoznajStevilkoRacuna(vnos, 2026)).toBeNull();
  });

  it('strežniško zaporedje prikaže brez vsiljenih vodilnih ničel', () => {
    const oblika = prepoznajStevilkoRacuna('14/2026', 2026)!;
    expect(uporabiOblikoStevilke('2026-0015', oblika)).toBe('15/2026');
  });
});

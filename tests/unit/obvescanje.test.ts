import { describe, expect, it } from 'vitest';
import { jePotekla, normalizirajEmail, potIzida, potrditvenoPisemce, ustvariZeton, POTRDITEV_VELJA_DNI } from '@/lib/obvescanje';

describe('normalizirajEmail', () => {
  it('iz iste osebe ne naredi dveh zapisov', () => {
    expect(normalizirajEmail('  Tina@Pinart.SI ')).toBe('tina@pinart.si');
  });
});

describe('ustvariZeton', () => {
  it('je dovolj dolg, da ga ni mogoce uganiti', () => {
    let n = 0;
    const zeton = ustvariZeton(() => `aaaaaaaa-bbbb-cccc-dddd-eeeeeeee${n++}`);
    expect(zeton).toHaveLength(40);
    expect(zeton).not.toContain('-');
  });
});

describe('jePotekla', () => {
  const zdaj = new Date('2026-09-01T00:00:00Z');
  it('sveza prijava ne potece', () => {
    expect(jePotekla('2026-08-30T00:00:00Z', zdaj)).toBe(false);
  });
  it('po roku potece', () => {
    expect(jePotekla('2026-08-01T00:00:00Z', zdaj)).toBe(true);
  });
  it('na dan roka se ne potece', () => {
    const meja = new Date(zdaj.getTime() - POTRDITEV_VELJA_DNI * 86_400_000).toISOString();
    expect(jePotekla(meja, zdaj)).toBe(false);
  });
  it('pokvarjen datum ne izbrise zapisa', () => {
    expect(jePotekla('nekaj-ni-datum', zdaj)).toBe(false);
  });
});

describe('potIzida', () => {
  it('slovenska pot je brez predpone', () => {
    expect(potIzida('sl', 'potrjeno')).toBe('/obvescanje?stanje=potrjeno');
  });
  it('angleska pot ima /en', () => {
    expect(potIzida('en', 'odjavljeno')).toBe('/en/obvescanje?stanje=odjavljeno');
  });
});

describe('potrditvenoPisemce', () => {
  it('vsebuje povezavo', () => {
    expect(potrditvenoPisemce('https://pinartflow.com/x', 'sl').html).toContain('https://pinartflow.com/x');
  });
  it('pove, da brez potrditve ne posljemo nicesar', () => {
    expect(potrditvenoPisemce('https://x', 'sl').html).toContain('brez potrditve');
    expect(potrditvenoPisemce('https://x', 'en').html).toContain('without a confirmation');
  });
});

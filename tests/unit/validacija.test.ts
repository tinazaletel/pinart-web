import { describe, it, expect } from 'vitest';
import { jeEmail, omejenNiz } from '@/lib/validacija';

/* Čiste, brez-stranskih-učinkov validacijske funkcije. Robni primeri, da se
   pravila (dolžina, oblika e-pošte, obveznost) ne razrahljajo ob prihodnjih spremembah. */
describe('validacija — jeEmail', () => {
  it('sprejme veljavne naslove', () => {
    expect(jeEmail('tina@pinart.si')).toBe(true);
    expect(jeEmail('a@b.co')).toBe(true);
    expect(jeEmail('ime.priimek@sub.domena.com')).toBe(true);
  });

  it('zavrne neveljavne oblike', () => {
    expect(jeEmail('brez-afne.com')).toBe(false);
    expect(jeEmail('dve@@afni.com')).toBe(false);
    expect(jeEmail('presledek @domena.com')).toBe(false);
    expect(jeEmail('brez@domene')).toBe(false);
    expect(jeEmail('@domena.com')).toBe(false);
    expect(jeEmail('')).toBe(false);
  });

  it('zavrne ne-nize', () => {
    expect(jeEmail(undefined)).toBe(false);
    expect(jeEmail(null)).toBe(false);
    expect(jeEmail(123)).toBe(false);
    expect(jeEmail({})).toBe(false);
  });

  it('zavrne predolg naslov (> 254 znakov)', () => {
    const dolg = 'a'.repeat(250) + '@b.com'; // 256 znakov
    expect(jeEmail(dolg)).toBe(false);
  });
});

describe('validacija — omejenNiz', () => {
  it('sprejme niz znotraj omejitve', () => {
    expect(omejenNiz('pozdrav', 10)).toBe(true);
    expect(omejenNiz('', 10)).toBe(true); // prazen dovoljen, če ni obvezen
  });

  it('zavrne niz nad omejitvijo', () => {
    expect(omejenNiz('predolg niz', 5)).toBe(false);
  });

  it('meja je vključujoča (length === najvec je OK)', () => {
    expect(omejenNiz('abcde', 5)).toBe(true);
  });

  it('obvezen: prazen ali sam presledek pade', () => {
    expect(omejenNiz('', 10, true)).toBe(false);
    expect(omejenNiz('   ', 10, true)).toBe(false);
    expect(omejenNiz('x', 10, true)).toBe(true);
  });

  it('zavrne ne-nize', () => {
    expect(omejenNiz(undefined, 10)).toBe(false);
    expect(omejenNiz(42, 10)).toBe(false);
    expect(omejenNiz(null, 10, true)).toBe(false);
  });
});

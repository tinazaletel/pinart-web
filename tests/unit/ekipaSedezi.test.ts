import { describe, it, expect } from 'vitest';
import { SEDEZI_PO_PLANU, mejaSedezev, planOznaka } from '@/lib/ekipaSedezi';

/* Sedeži po planu (Faza 5 večuporabniškega sloja). Meje so nastavljive, a se
   uporabljajo za zaklep dodajanja članov — test varuje pred tiho spremembo, ki bi
   npr. free planu odprla pro število sedežev ali obratno. */
describe('ekipaSedezi — mejaSedezev', () => {
  it('vrne pravo mejo za znana plana', () => {
    expect(mejaSedezev('free')).toBe(SEDEZI_PO_PLANU.free);
    expect(mejaSedezev('pro')).toBe(SEDEZI_PO_PLANU.pro);
  });

  it('pro ima strogo več sedežev kot free', () => {
    expect(SEDEZI_PO_PLANU.pro).toBeGreaterThan(SEDEZI_PO_PLANU.free);
  });

  it('neznan / prazen plan pade na free mejo', () => {
    expect(mejaSedezev('enterprise')).toBe(SEDEZI_PO_PLANU.free);
    expect(mejaSedezev('')).toBe(SEDEZI_PO_PLANU.free);
    expect(mejaSedezev('PRO')).toBe(SEDEZI_PO_PLANU.free); // občutljivo na velike črke
  });

  it('null / undefined pade na free mejo', () => {
    expect(mejaSedezev(null)).toBe(SEDEZI_PO_PLANU.free);
    expect(mejaSedezev(undefined)).toBe(SEDEZI_PO_PLANU.free);
  });

  it('meje so pozitivna cela števila', () => {
    for (const meja of Object.values(SEDEZI_PO_PLANU)) {
      expect(Number.isInteger(meja)).toBe(true);
      expect(meja).toBeGreaterThan(0);
    }
  });
});

describe('ekipaSedezi — planOznaka', () => {
  it('pro dobi »Napredni«', () => {
    expect(planOznaka('pro')).toBe('Napredni');
  });

  it('vse ostalo (free / neznano / prazno) dobi »Brezplačni«', () => {
    expect(planOznaka('free')).toBe('Brezplačni');
    expect(planOznaka('enterprise')).toBe('Brezplačni');
    expect(planOznaka('')).toBe('Brezplačni');
    expect(planOznaka(null)).toBe('Brezplačni');
    expect(planOznaka(undefined)).toBe('Brezplačni');
  });

  it('je občutljiv na velike črke (samo točno »pro« šteje)', () => {
    expect(planOznaka('Pro')).toBe('Brezplačni');
    expect(planOznaka('PRO')).toBe('Brezplačni');
  });
});

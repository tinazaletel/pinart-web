import { describe, it, expect } from 'vitest';
import { VLOGE, vlogaOznaka } from '@/lib/sodelavci';
import type { UporabniskaVloga } from '@/lib/naloge';

/* Vloge sodelavcev (admin / vodja / clan) za razdelek »Sodelavci« in Task Manager.
   vlogaOznaka je čista preslikava koda -> oznaka; test varuje pred izgubo vloge iz
   seznama (kar bi vrnilo surovo kodo v UI namesto lepe oznake). */

const VSE_VLOGE: UporabniskaVloga[] = ['admin', 'vodja', 'clan'];

describe('sodelavci — VLOGE seznam', () => {
  it('pokrije natanko tri znane vloge, brez podvojitev', () => {
    const kode = VLOGE.map(v => v.vloga);
    expect(new Set(kode)).toEqual(new Set(VSE_VLOGE));
    expect(kode.length).toBe(VSE_VLOGE.length);
  });

  it('vsaka vloga ima neprazno oznako in opis', () => {
    for (const v of VLOGE) {
      expect(v.oznaka.length, v.vloga).toBeGreaterThan(0);
      expect(v.opis.length, v.vloga).toBeGreaterThan(0);
    }
  });
});

describe('sodelavci — vlogaOznaka', () => {
  it('vrne pravo oznako za znane vloge', () => {
    expect(vlogaOznaka('admin')).toBe('Admin');
    expect(vlogaOznaka('vodja')).toBe('Vodja');
    expect(vlogaOznaka('clan')).toBe('Član');
  });

  it('oznaka ustreza vnosu v VLOGE za vsako vlogo', () => {
    for (const v of VLOGE) {
      expect(vlogaOznaka(v.vloga)).toBe(v.oznaka);
    }
  });

  it('neznana vloga pade nazaj na surovo kodo', () => {
    // fallback: `|| v` -> vrne vhod, če vloga ni v seznamu
    expect(vlogaOznaka('neznana' as UporabniskaVloga)).toBe('neznana');
  });
});

import { describe, it, expect } from 'vitest';
import { urediDanes, dniMed, pripisRoka, NAJVEC_VRSTIC, type DanesVrstica } from '@/lib/danes';

/* Pravila prioritete za seznam »Danes« na nadzorni plosci.
   Codexova pripomba (23. 8. 2026): pravila zapisi v teste PREDEN nastane
   seznam, sicer bo vrstni red nakljucen in tega ne bo nihce opazil. */

const v = (id: string, vrsta: DanesVrstica['vrsta'], dniDoRoka?: number): DanesVrstica =>
  ({ id, vrsta, dejanje: `Naredi ${id}`, pripis: '', kam: '/', dniDoRoka });

describe('urediDanes — vrstni red po nujnosti', () => {
  it('zamujeno je pred vsem ostalim', () => {
    const r = urediDanes([v('c', 'priloznost'), v('a', 'zamujeno', -3), v('b', 'rokDanes', 0)]);
    expect(r.map(x => x.id)).toEqual(['a', 'b', 'c']);
  });

  it('stranka, ki caka, je pred nasim rokom danes', () => {
    const r = urediDanes([v('rok', 'rokDanes', 0), v('stranka', 'strankaCaka', -2)]);
    expect(r[0].id).toBe('stranka');
  });

  it('drzi celotno lestvico, tudi ce pride v obratnem vrstnem redu', () => {
    const r = urediDanes([
      v('7', 'priloznost'), v('6', 'mojaNaloga'), v('5', 'rokKmalu', 4),
      v('4', 'dokumentCaka'), v('3', 'rokDanes', 0), v('2', 'strankaCaka', -1), v('1', 'zamujeno', -9),
    ]);
    expect(r.map(x => x.id)).toEqual(['1', '2', '3', '4', '5', '6', '7']);
  });
});

describe('urediDanes — znotraj iste vrste', () => {
  it('bolj zamujeno je visje', () => {
    const r = urediDanes([v('en', 'zamujeno', -1), v('deset', 'zamujeno', -10)]);
    expect(r.map(x => x.id)).toEqual(['deset', 'en']);
  });

  it('blizji rok je visje', () => {
    const r = urediDanes([v('cez5', 'rokKmalu', 5), v('cez2', 'rokKmalu', 2)]);
    expect(r.map(x => x.id)).toEqual(['cez2', 'cez5']);
  });

  it('vrstica brez roka pade ZA tiste z rokom', () => {
    const r = urediDanes([v('brez', 'mojaNaloga'), v('zrokom', 'mojaNaloga', 3)]);
    expect(r.map(x => x.id)).toEqual(['zrokom', 'brez']);
  });
});

describe('urediDanes — dolzina', () => {
  it('nikoli ne vrne vec kot NAJVEC_VRSTIC', () => {
    const veliko = Array.from({ length: 20 }, (_, i) => v(String(i), 'mojaNaloga', i));
    expect(urediDanes(veliko)).toHaveLength(NAJVEC_VRSTIC);
  });

  it('ko odreze, obdrzi NAJNUJNEJSE in zavrze nenujno', () => {
    const vrstice = [
      ...Array.from({ length: 8 }, (_, i) => v(`p${i}`, 'priloznost')),
      v('nujno', 'zamujeno', -2),
    ];
    expect(urediDanes(vrstice).map(x => x.id)).toContain('nujno');
  });

  it('prazen vhod vrne prazen seznam (prazno stanje se izpise v vmesniku)', () => {
    expect(urediDanes([])).toEqual([]);
  });
});

describe('dniMed', () => {
  it('sesteje cele dni, ne ur', () => {
    expect(dniMed('2026-08-23T23:00:00', '2026-08-24T01:00:00')).toBe(1);
  });
  it('vrne negativno za pretekli datum', () => {
    expect(dniMed('2026-08-23', '2026-08-20')).toBe(-3);
  });
  it('isti dan je 0', () => {
    expect(dniMed('2026-08-23T08:00:00', '2026-08-23T20:00:00')).toBe(0);
  });
  it('neveljaven datum vrne null, da vrstica ne nastane', () => {
    expect(dniMed('2026-08-23', 'jutri')).toBeNull();
  });
});

describe('pripisRoka', () => {
  it('pove zamudo v dnevih', () => { expect(pripisRoka(-3)).toBe('zamuda 3 dni'); });
  it('ednina pri enem dnevu', () => { expect(pripisRoka(-1)).toBe('zamuda 1 dan'); });
  it('danes in jutri sta besedi, ne stevilki', () => {
    expect(pripisRoka(0)).toBe('danes');
    expect(pripisRoka(1)).toBe('jutri');
  });
  it('prihodnost cez vec dni', () => { expect(pripisRoka(5)).toBe('čez 5 dni'); });
  it('anglesko', () => {
    expect(pripisRoka(-3, true)).toBe('3 days overdue');
    expect(pripisRoka(0, true)).toBe('today');
  });
});

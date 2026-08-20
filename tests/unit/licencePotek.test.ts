import { describe, expect, it } from 'vitest';
import { izracunajLicencoDo, jeLicencaKmalu, jeLicencaPotekla } from '@/lib/licencePotek';

describe('potek licenc', () => {
  it('izbere najzgodnejšo časovno omejeno pravico', () => {
    expect(izracunajLicencoDo('2026-01-15T12:00:00Z', [
      { prenos: 'licenca', trajanje: '3' },
      { prenos: 'neizkljucni', trajanje: '6m' },
    ])).toBe('2026-07-15');
  });

  it('izključno in trajno pravico izpusti', () => {
    expect(izracunajLicencoDo('2026-01-15', [
      { prenos: 'izkljucni', trajanje: '3' },
      { prenos: 'licenca', trajanje: 'neomejeno' },
    ])).toBeUndefined();
  });

  it('prepozna poteklo in rok v naslednjih 60 dneh', () => {
    expect(jeLicencaPotekla('2026-06-01', '2026-08-20')).toBe(true);
    expect(jeLicencaKmalu('2026-10-01', '2026-08-20')).toBe(true);
    expect(jeLicencaKmalu('2026-11-01', '2026-08-20')).toBe(false);
  });
});

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

import { sestaviDanes } from '@/lib/danes';

/* Sestavljanje vrstic iz virov. Datum je vbrizgan, zato so testi stabilni. */
const DANES = '2026-08-23';

describe('sestaviDanes — naloge', () => {
  it('zamujena naloga je zamuda, ne opomba', () => {
    const [r] = sestaviDanes({ naloge: [{ naslov: 'Prototip', stolpec: 'todo', rok: '2026-08-20' }] }, DANES);
    expect(r.vrsta).toBe('zamujeno');
    expect(r.pripis).toBe('zamuda 3 dni');
  });

  it('rok danes', () => {
    const [r] = sestaviDanes({ naloge: [{ naslov: 'Prototip', stolpec: 'todo', rok: DANES }] }, DANES);
    expect(r.vrsta).toBe('rokDanes');
  });

  it('koncana naloga ne pride na seznam', () => {
    expect(sestaviDanes({ naloge: [{ naslov: 'X', stolpec: 'done', rok: '2026-08-01' }] }, DANES)).toHaveLength(0);
  });

  it('rok cez mesec ni "danes"', () => {
    expect(sestaviDanes({ naloge: [{ naslov: 'X', stolpec: 'todo', rok: '2026-09-30' }] }, DANES)).toHaveLength(0);
  });

  it('naloga brez roka je moje delo', () => {
    const [r] = sestaviDanes({ naloge: [{ naslov: 'X', stolpec: 'todo' }] }, DANES);
    expect(r.vrsta).toBe('mojaNaloga');
    expect(r.dniDoRoka).toBeUndefined();
  });
});

describe('sestaviDanes — posta', () => {
  const prejeto = { id: 'm1', smer: 'prejeto' as const, prejemniki: ['ana@rokusklett.si'], zadeva: 'Gradiva', datum: '2026-08-19' };

  it('prejeto brez odgovora pomeni, da stranka caka', () => {
    const [r] = sestaviDanes({ posta: [prejeto] }, DANES);
    expect(r.vrsta).toBe('strankaCaka');
    expect(r.dejanje).toContain('Odgovori');
    expect(r.dejanje).toContain('ana@rokusklett.si');
  });

  it('ce smo po njem odgovorili, vrstice ni', () => {
    const odgovor = { id: 'm2', smer: 'poslano' as const, prejemniki: ['ana@rokusklett.si'], zadeva: 'Re: Gradiva', datum: '2026-08-20' };
    expect(sestaviDanes({ posta: [prejeto, odgovor] }, DANES)).toHaveLength(0);
  });

  it('odgovor PRED prejetim ne steje kot odgovor', () => {
    const star = { id: 'm0', smer: 'poslano' as const, prejemniki: ['ana@rokusklett.si'], zadeva: 'Staro', datum: '2026-08-10' };
    expect(sestaviDanes({ posta: [prejeto, star] }, DANES)).toHaveLength(1);
  });

  it('vceraj prejeto se ni cakanje', () => {
    expect(sestaviDanes({ posta: [{ ...prejeto, datum: '2026-08-22' }] }, DANES)).toHaveLength(0);
  });

  it('osnutki in kos se ne stejejo', () => {
    expect(sestaviDanes({ posta: [{ ...prejeto, osnutek: true }] }, DANES)).toHaveLength(0);
    expect(sestaviDanes({ posta: [{ ...prejeto, izbrisano: '2026-08-20' }] }, DANES)).toHaveLength(0);
  });
});

describe('sestaviDanes — racuni', () => {
  it('zapadel neplacan racun zahteva opomnik', () => {
    const [r] = sestaviDanes({ racuni: [{ id: 'r1', number: '2026-014', client: 'Rokus', paid: false, date: '2026-08-01', dueDays: 15 }] }, DANES);
    expect(r.vrsta).toBe('zamujeno');
    expect(r.dejanje).toContain('Pošlji opomnik');
    expect(r.dejanje).toContain('2026-014');
  });

  it('placan racun ne pride na seznam', () => {
    expect(sestaviDanes({ racuni: [{ id: 'r1', client: 'X', paid: true, date: '2026-07-01', dueDays: 15 }] }, DANES)).toHaveLength(0);
  });

  it('rok cez nekaj dni je spremljanje, ne opomnik', () => {
    const [r] = sestaviDanes({ racuni: [{ id: 'r2', client: 'X', paid: false, date: '2026-08-20', dueDays: 5 }] }, DANES);
    expect(r.vrsta).toBe('rokKmalu');
    expect(r.dejanje).toContain('Spremljaj');
  });
});

describe('sestaviDanes — ponudbe', () => {
  it('poslana ponudba, ki molci, caka na nas', () => {
    const [r] = sestaviDanes({ ponudbe: [{ id: 'p1', title: 'Prenova', client: 'Rokus', date: '2026-08-10', status: 'sent' }] }, DANES);
    expect(r.vrsta).toBe('dokumentCaka');
    expect(r.dejanje).toContain('Preveri ponudbo');
  });

  it('osnutek ali sprejeta ponudba ne prideta na seznam', () => {
    expect(sestaviDanes({ ponudbe: [{ id: 'p1', title: 'X', client: 'Y', date: '2026-08-01', status: 'draft' }] }, DANES)).toHaveLength(0);
    expect(sestaviDanes({ ponudbe: [{ id: 'p2', title: 'X', client: 'Y', date: '2026-08-01', status: 'accepted' }] }, DANES)).toHaveLength(0);
  });

  it('vceraj poslana ponudba se ne molci', () => {
    expect(sestaviDanes({ ponudbe: [{ id: 'p3', title: 'X', client: 'Y', date: '2026-08-22', status: 'sent' }] }, DANES)).toHaveLength(0);
  });
});

describe('sestaviDanes — prazno', () => {
  it('brez virov vrne prazen seznam', () => {
    expect(sestaviDanes({}, DANES)).toEqual([]);
  });
});

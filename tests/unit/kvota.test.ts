import { describe, expect, it } from 'vitest';
import { KVOTE, besediloKvote, jeSeProstora, odstotekKvote, stanjeKvote } from '@/lib/kvota';

describe('kvota prostora', () => {
  it('ima dogovorjene meje paketov', () => {
    expect(KVOTE.free).toBe(100 * 1024 * 1024);
    expect(KVOTE.premium).toBe(1024 * 1024 * 1024);
    expect(KVOTE.pro).toBe(5 * 1024 * 1024 * 1024);
  });
  it('sprejme datoteko pod mejo', () => expect(jeSeProstora(79, 100, 20)).toBe(true));
  it('sprejme datoteko natanko do meje', () => expect(jeSeProstora(80, 100, 20)).toBe(true));
  it('zavrne datoteko čez mejo', () => expect(jeSeProstora(99, 100, 2)).toBe(false));
  it('zavrne novo datoteko pri polni kvoti', () => expect(jeSeProstora(100, 100, 1)).toBe(false));
  it('ničelna kvota nima prostora', () => expect(jeSeProstora(0, 0, 0)).toBe(false));
  it('negativno porabo obravnava kot nič', () => expect(jeSeProstora(-5, 100, 100)).toBe(true));
  it('negativen dodatek obravnava kot nič', () => expect(jeSeProstora(50, 100, -5)).toBe(true));
  it('odstotek pri ničelni kvoti je nič', () => expect(odstotekKvote(10, 0)).toBe(0));
  it('odstotek ne pade pod nič', () => expect(odstotekKvote(-1, 100)).toBe(0));
  it('odstotek ne preseže sto', () => expect(odstotekKvote(120, 100)).toBe(100));
  it('79 odstotkov je še v redu', () => expect(stanjeKvote(79, 100)).toBe('ok'));
  it('80 odstotkov opozori', () => expect(stanjeKvote(80, 100)).toBe('opozorilo'));
  it('99 odstotkov opozori', () => expect(stanjeKvote(99, 100)).toBe('opozorilo'));
  it('100 odstotkov je polno', () => expect(stanjeKvote(100, 100)).toBe('polno'));
  it('poraba čez mejo je polna', () => expect(stanjeKvote(101, 100)).toBe('polno'));
  it('ničelna kvota je polna', () => expect(stanjeKvote(0, 0)).toBe('polno'));
  it('slovensko besedilo uporablja skupni prikaz velikosti', () => expect(besediloKvote(82 * 1024 * 1024, 100 * 1024 * 1024)).toBe('Porabila si 82 MB od 100 MB'));
  it('angleško besedilo uporablja skupni prikaz velikosti', () => expect(besediloKvote(82 * 1024 * 1024, 100 * 1024 * 1024, true)).toBe('You have used 82 MB of 100 MB'));
});

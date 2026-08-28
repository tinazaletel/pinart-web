import { describe, expect, it } from 'vitest';
import { povzetekNalog, odgovorONalogah, jeVprasanjeONalogah, kontekstNalog, vrsticaDanes, oblika } from '@/lib/pupaNaloge';
import type { Naloga } from '@/lib/naloge';

const n = (del: Partial<Naloga> & { naslov: string }): Naloga => ({
  id: del.naslov, stolpec: 'todo', created: '2026-08-01T00:00:00.000Z', ...del,
});

const NALOGE: Naloga[] = [
  n({ naslov: 'Ponudba Inovis', rok: '2026-08-20' }),
  n({ naslov: 'Klic z Majo', rok: '2026-08-26' }),
  n({ naslov: 'Popravki CGP', rok: '2026-08-27', stolpec: 'in_progress' }),
  n({ naslov: 'Brez roka' }),
  n({ naslov: 'Ze koncana', stolpec: 'done', rok: '2026-08-10', updatedAt: '2026-08-26T09:00:00.000Z' }),
];

describe('pupa bere naloge', () => {
  const p = povzetekNalog(NALOGE, '2026-08-26');

  it('presteje odprte, zamujene, danasnje in jutrisnje', () => {
    expect(p.odprte).toBe(4);
    expect(p.zamujene.map(x => x.naslov)).toEqual(['Ponudba Inovis']);
    expect(p.danes.map(x => x.naslov)).toEqual(['Klic z Majo']);
    expect(p.jutri.map(x => x.naslov)).toEqual(['Popravki CGP']);
    expect(p.brezRoka).toBe(1);
    expect(p.vTeku).toBe(1);
    expect(p.koncaneDanes).toBe(1);
  });

  it('koncane naloge ne steje med odprte', () => {
    expect(p.odprte).toBe(NALOGE.filter(x => x.stolpec !== 'done').length);
  });

  it('odgovor navede stevilke IN naslove, ne le stevila', () => {
    const o = odgovorONalogah(p);
    expect(o).toContain('4');
    expect(o).toContain('Ponudba Inovis');
    expect(o).toContain('Klic z Majo');
  });

  it('brez odprtih nalog odgovori jasno', () => {
    const prazen = povzetekNalog([], '2026-08-26');
    expect(odgovorONalogah(prazen)).toContain('Nimaš odprtih nalog');
    expect(odgovorONalogah(prazen, true)).toContain('no open tasks');
  });

  it('anglescina uporabi angleske izraze', () => {
    expect(odgovorONalogah(p, true)).toContain('open');
    expect(odgovorONalogah(p, true)).toContain('overdue');
  });

  it('prepozna vprasanje o nalogah in pusti drugo pri miru', () => {
    expect(jeVprasanjeONalogah('Koliko odprtih taskov mi je še ostalo?')).toBe(true);
    expect(jeVprasanjeONalogah('kaj je zamujeno?')).toBe(true);
    expect(jeVprasanjeONalogah('How many tasks are due today?')).toBe(true);
    expect(jeVprasanjeONalogah('Pripravi ponudbo za kavarno Luna')).toBe(false);
    expect(jeVprasanjeONalogah('Kolikšna je poštena cena logotipa?')).toBe(false);
  });

  it('kontekst za AI je kratek in prazen, kadar ni nicesar', () => {
    expect(kontekstNalog(p)).toContain('4 odprtih');
    expect(kontekstNalog(povzetekNalog([], '2026-08-26'))).toBe('');
  });
});

describe('vrstica »kaj te danes caka«', () => {
  it('slovenske oblike so pravilne', () => {
    expect(oblika(1, ['a', 'b', 'c', 'd'])).toBe('a');
    expect(oblika(2, ['a', 'b', 'c', 'd'])).toBe('b');
    expect(oblika(3, ['a', 'b', 'c', 'd'])).toBe('c');
    expect(oblika(5, ['a', 'b', 'c', 'd'])).toBe('d');
  });

  it('nasteje samo tisto, cesar je kaj', () => {
    const v = vrsticaDanes({ zamujene: 2, danes: 3, neplacani: 1 });
    expect(v).toBe('Danes: 2 zamujeni nalogi, 3 naloge zapadejo danes, 1 neplačan račun.');
    expect(vrsticaDanes({ zamujene: 0, danes: 1, neplacani: 0 })).toBe('Danes: 1 naloga zapade danes.');
  });

  it('kadar ni nicesar, to tudi pise', () => {
    expect(vrsticaDanes({ zamujene: 0, danes: 0, neplacani: 0 })).toBe('Danes te ne čaka nič nujnega.');
    expect(vrsticaDanes({ zamujene: 0, danes: 0, neplacani: 0 }, true)).toBe('Nothing urgent today.');
  });
});

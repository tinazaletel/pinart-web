import { describe, expect, it } from 'vitest';
import { povzetekNalog, odgovorONalogah, jeVprasanjeONalogah, kontekstNalog } from '@/lib/pupaNaloge';
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

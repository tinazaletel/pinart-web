import { describe, it, expect } from 'vitest';
import { kajTeCaka, opisPrve, vrsticaOpomnika, PONUDBA_TIHO_DNI, LICENCA_OPOZORILO_DNI } from '@/lib/teCaka';

const DANES = new Date('2026-08-29T12:00:00Z');
const pred = (dni: number) => new Date(DANES.getTime() - dni * 86400000).toISOString().slice(0, 10);
const cez = (dni: number) => new Date(DANES.getTime() + dni * 86400000).toISOString().slice(0, 10);

describe('opomniki', () => {
  it('zamujen račun se šteje, plačan ne', () => {
    const r = kajTeCaka({ invoices: [
      { client: 'Rokus', amount: 250, paid: false, status: 'sent', date: pred(20), dueDays: 8 },
      { client: 'Luna', amount: 100, paid: true, status: 'paid', date: pred(40), dueDays: 8 },
    ] }, DANES);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ vrsta: 'racun', kdo: 'Rokus', dni: 12 });
  });

  it('osnutek računa ni opomnik', () => {
    /* Osnutek ni bil poslan — nikogar ne moreš opominjati za nekaj, česar ni dobil. */
    expect(kajTeCaka({ invoices: [{ client: 'X', paid: false, status: 'draft', date: pred(60) }] }, DANES)).toHaveLength(0);
  });

  it('ponudba šteje šele po dogovorjenem tihem obdobju', () => {
    const tik = kajTeCaka({ offers: [{ client: 'A', status: 'sent', date: pred(PONUDBA_TIHO_DNI - 1) }] }, DANES);
    const cez = kajTeCaka({ offers: [{ client: 'A', status: 'sent', date: pred(PONUDBA_TIHO_DNI) }] }, DANES);
    expect(tik).toHaveLength(0);
    expect(cez).toHaveLength(1);
  });

  it('sprejeta ali zavrnjena ponudba ni več opomnik', () => {
    expect(kajTeCaka({ offers: [
      { client: 'A', status: 'accepted', date: pred(60) },
      { client: 'B', status: 'rejected', date: pred(60) },
    ] }, DANES)).toHaveLength(0);
  });

  it('podpisana pogodba izpade, nepodpisana ostane', () => {
    const r = kajTeCaka({ contracts: [
      { client: 'A', status: 'signed', date: pred(30) },
      { client: 'B', status: 'review', date: pred(30) },
    ] }, DANES);
    expect(r.map(x => x.kdo)).toEqual(['B']);
  });

  it('licenca opozori pred potekom, ne po njem', () => {
    const r = kajTeCaka({ offers: [
      { client: 'Kora', status: 'accepted', date: pred(300), licencaDo: cez(18) },
      { client: 'Stara', status: 'accepted', date: pred(400), licencaDo: pred(5) },
      { client: 'Daleč', status: 'accepted', date: pred(10), licencaDo: cez(LICENCA_OPOZORILO_DNI + 5) },
    ] }, DANES);
    expect(r.map(x => x.kdo)).toEqual(['Kora']);
    expect(r[0].dni).toBe(18);
  });

  it('najbolj zamujeno je na vrhu', () => {
    const r = kajTeCaka({ invoices: [
      { client: 'Mlad', paid: false, status: 'sent', date: pred(12), dueDays: 8 },
      { client: 'Star', paid: false, status: 'sent', date: pred(60), dueDays: 8 },
    ] }, DANES);
    expect(r[0].kdo).toBe('Star');
  });

  it('prazni podatki ne vržejo ničesar', () => {
    expect(kajTeCaka({}, DANES)).toEqual([]);
    expect(kajTeCaka({ invoices: [{ client: 'X', paid: false, status: 'sent', date: 'ni datum' }] }, DANES)).toEqual([]);
  });

  it('vrstica se bere kot opravilo: datum, dejanje, ime', () => {
    /* »30. avg · Pošlji opomin za račun · Rokus Klett« — ne poročilo o stanju,
       ampak kaj je treba narediti. */
    const v = vrsticaOpomnika({ vrsta: 'racun', kdo: 'Rokus Klett', dni: 12, datum: '2026-08-17' });
    expect(v).toContain('Pošlji opomin za račun');
    expect(v).toContain('Rokus Klett');
    expect(v.split(' · ')).toHaveLength(3);
  });

  it('vrstica pri ponudbi doda naslov ponudbe', () => {
    const v = vrsticaOpomnika({ vrsta: 'ponudba', kdo: 'Zeleni val', dni: 14, datum: '2026-08-15', naslov: 'Ilustracije' });
    expect(v).toContain('Preveri ponudbo Ilustracije');
  });

  it('račun nosi datum ROKA, ne datuma izdaje', () => {
    const r = kajTeCaka({ invoices: [{ client: 'A', paid: false, status: 'sent', date: pred(20), dueDays: 8 }] }, DANES);
    expect(r[0].datum).toBe(pred(12));
  });

  it('opis prve pove ime in koliko dni', () => {
    expect(opisPrve({ vrsta: 'racun', kdo: 'Rokus', dni: 12, datum: '2026-08-17' })).toBe('Rokus — račun zamuja 12 dni');
    expect(opisPrve({ vrsta: 'licenca', kdo: 'Kora', dni: 18, datum: '2026-09-16' }, true)).toBe('Kora — licence expires in 18 d');
    expect(opisPrve(undefined)).toBe('');
  });
});

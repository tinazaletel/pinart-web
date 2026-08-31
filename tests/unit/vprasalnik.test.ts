import { describe, expect, it } from 'vitest';
import {
  izlusciKontakt, ocistiVprasanja, preveriOdgovore, privzetaVprasanja, type Vprasanje,
} from '@/lib/vprasalnik';

/* Vprašalnik izpolnjuje nekdo, ki ni uporabnik Flowa in ga ne poznamo. Zato je
   preverjanje na strežniku edina resnična obramba — te teste ima. */

const V: Vprasanje[] = [
  { id: 'eposta', tip: 'kratko', besedilo: 'E-naslov', obvezno: true },
  { id: 'opis', tip: 'dolgo', besedilo: 'Opis' },
  { id: 'proracun', tip: 'izbira', besedilo: 'Proračun', moznosti: ['Do 1.000 €', 'Nad 7.000 €'] },
  { id: 'storitve', tip: 'vec', besedilo: 'Kaj?', obvezno: true, moznosti: ['Logotip', 'Spletna stran'] },
  { id: 'rok', tip: 'datum', besedilo: 'Rok' },
];

describe('ocistiVprasanja', () => {
  it('zavrže vprašanja brez besedila in neznane tipe popravi na kratko', () => {
    const ven = ocistiVprasanja([
      { id: 'a', tip: 'izmisljen', besedilo: 'Ime' },
      { id: 'b', tip: 'kratko', besedilo: '   ' },
    ]);
    expect(ven).toHaveLength(1);
    expect(ven[0].tip).toBe('kratko');
  });

  it('podvojene id-je razdvoji, ker se odgovor veže nanje', () => {
    const ven = ocistiVprasanja([
      { id: 'ime', tip: 'kratko', besedilo: 'Prvo' },
      { id: 'ime', tip: 'kratko', besedilo: 'Drugo' },
    ]);
    expect(ven[0].id).not.toBe(ven[1].id);
  });

  it('možnosti obdrži samo pri izbiri in več izbirah', () => {
    const ven = ocistiVprasanja([{ id: 'a', tip: 'kratko', besedilo: 'X', moznosti: ['a', 'b'] }]);
    expect(ven[0].moznosti).toBeUndefined();
  });
});

describe('preveriOdgovore', () => {
  it('zahteva obvezna polja', () => {
    const izid = preveriOdgovore(V, {});
    expect(izid.ok).toBe(false);
    if (!izid.ok) {
      expect(izid.napake.map(n => n.id).sort()).toEqual(['eposta', 'storitve']);
    }
  });

  it('zavrne izbiro, ki je ni med možnostmi', () => {
    const izid = preveriOdgovore(V, { eposta: 'a@b.si', storitve: ['Logotip'], proracun: 'Milijon' });
    expect(izid.ok).toBe(false);
    if (!izid.ok) expect(izid.napake[0].id).toBe('proracun');
  });

  it('zavrne neveljaven e-naslov in neveljaven datum', () => {
    const a = preveriOdgovore(V, { eposta: 'ni-naslov', storitve: ['Logotip'] });
    expect(a.ok).toBe(false);
    const b = preveriOdgovore(V, { eposta: 'a@b.si', storitve: ['Logotip'], rok: '31. 8. 2026' });
    expect(b.ok).toBe(false);
    if (!b.ok) expect(b.napake[0].id).toBe('rok');
  });

  it('pri več izbirah obdrži samo ponujene možnosti', () => {
    const izid = preveriOdgovore(V, { eposta: 'a@b.si', storitve: ['Logotip', 'Podtaknjeno'] });
    expect(izid.ok).toBe(true);
    if (izid.ok) expect(izid.odgovori.storitve).toEqual(['Logotip']);
  });

  it('dolg odgovor obreže, da en vnos ne napolni baze', () => {
    const izid = preveriOdgovore(V, { eposta: 'a@b.si', storitve: ['Logotip'], opis: 'x'.repeat(9000) });
    expect(izid.ok).toBe(true);
    if (izid.ok) expect(String(izid.odgovori.opis)).toHaveLength(4000);
  });
});

describe('privzeta vprašanja', () => {
  it('so veljavna tudi po čiščenju in imajo obvezen e-naslov', () => {
    const v = privzetaVprasanja();
    expect(ocistiVprasanja(v)).toHaveLength(v.length);
    expect(v.find(x => x.id === 'eposta')?.obvezno).toBe(true);
  });
});

describe('izlusciKontakt', () => {
  it('vzame ime, e-pošto in podjetje iz odgovorov', () => {
    expect(izlusciKontakt({ oseba: 'Ana Novak', eposta: 'a@b.si', podjetje: 'Inovis', opis: 'x' }))
      .toEqual({ ime: 'Ana Novak', eposta: 'a@b.si', podjetje: 'Inovis' });
  });
});

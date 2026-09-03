import { describe, expect, it } from 'vitest';
import { stevilkaIzOdgovora, PRIMERJAVA_FLAGSHIP } from '@/lib/vprasalnikPrimerjava';
import { PANOGE, panogaZa } from '@/lib/vprasalnikPanoge';
import { okvirZa, imaRazpon } from '@/lib/trzniOkvir';

describe('stevilkaIzOdgovora', () => {
  it.each([
    ['15', 15],
    ['15 EUR', 15],
    ['800€', 800],
    ['450,50', 450.5],
    ['1.200', 1200],           /* pika kot tisočica, ne decimalka */
    ['1.200,50', 1200.5],
    ['700-900', 800],          /* razpon -> povprečje */
    ['700 do 900', 800],
    ['  120  ', 120],
    ['', null],
    ['ne vem', null],
    ['0', null],               /* 0 ni veljaven znesek */
  ])('"%s" -> %s', (vhod, izid) => {
    expect(stevilkaIzOdgovora(vhod)).toBe(izid);
  });
});

/* Ta primerjava NIKOLI ne sme prikazati napačne — molk je boljši od
   izmišljene primerjave. Test lovi dve stvari: da vprašanje s tem ID-jem
   še obstaja (če kdo besedilo popravi, se povezava tiho izgubi), in da
   ima izbrana storitev v raziskavi dovolj kakovosten razpon. */
describe('primerjava s trznim povprecjem: vsak flagship drzi', () => {
  for (const [panogaId, flagship] of Object.entries(PRIMERJAVA_FLAGSHIP)) {
    it(`${panogaId}: vprašanje obstaja in ima okvir`, () => {
      const panoga = panogaZa(panogaId);
      expect(panoga).not.toBeNull();
      const vprasanje = panoga!.sklopi.flatMap(s => s.vprasanja).find(v => v.id === flagship.vprasanjeId);
      expect(vprasanje, `vprašanje "${flagship.vprasanjeId}" ne obstaja več v ${panogaId}`).toBeDefined();
      const okvir = okvirZa(flagship.storitev);
      expect(okvir, `ni tržnega okvira za "${flagship.storitev}"`).not.toBeNull();
      expect(imaRazpon(okvir), `"${flagship.storitev}" nima dovolj kakovostnega razpona (A/B)`).toBe(true);
    });
  }

  it('vsaka panoga v PRIMERJAVA_FLAGSHIP je resnicna panoga', () => {
    const idji = new Set(PANOGE.map(p => p.id));
    for (const panogaId of Object.keys(PRIMERJAVA_FLAGSHIP)) {
      expect(idji.has(panogaId)).toBe(true);
    }
  });
});

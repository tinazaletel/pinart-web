import { describe, it, expect } from 'vitest';
import { usmeri, odgovorBrezAi, CILJI } from '@/lib/pupaUsmerjanje';

describe('Pupa brez modela', () => {
  it('vprašanje o ceni pelje v kalkulator', () => {
    expect(usmeri('koliko naj zaračunam za logotip')[0].id).toBe('kalkulator');
  });

  it('razume sklanjatve in šumnike', () => {
    /* »pogodbo« in »POGODBA« morata najti isto kot »pogodba«. */
    expect(usmeri('rabim pogodbo')[0].id).toBe('pogodbe');
    expect(usmeri('POGODBE za stranko')[0].id).toBe('pogodbe');
    expect(usmeri('kje je evidenca delovnega časa')[0].id).toBe('evidenca');
  });

  it('loči štoparico od evidence časa', () => {
    /* Dve različni stvari, ki se obe imenujeta »čas« — evidenca je zakonska
       prisotnost, štoparica pa ure na projektu. */
    expect(usmeri('zabeležiti moram prihod in odhod')[0].id).toBe('evidenca');
    expect(usmeri('koliko ur sem porabila na projektu')[0].id).toBe('cas');
  });

  it('vrne največ tri predloge', () => {
    expect(usmeri('cena ponudba racun stranka projekt pogodba').length).toBeLessThanOrEqual(3);
  });

  it('ob praznem ali prekratkem vprašanju ne ugiba', () => {
    expect(usmeri('')).toEqual([]);
    expect(usmeri('a')).toEqual([]);
  });

  it('kadar se nič ne ujame, ponudi razpotje namesto izsiljenega zadetka', () => {
    const izid = odgovorBrezAi('kakšno je vreme jutri', '', false);
    expect(izid.predlogi).toHaveLength(3);
    expect(izid.predlogi.map(p => p.pot)).toContain('/kalkulator/orodje');
  });

  it('poti dobijo jezikovno predpono', () => {
    const izid = odgovorBrezAi('rabim račun', '/en', true);
    expect(izid.predlogi[0].pot.startsWith('/en/')).toBe(true);
    expect(izid.odgovor).toMatch(/AI key/);
  });

  it('vsak cilj ima obe jezikovni različici in pot', () => {
    for (const c of CILJI) {
      expect(c.ime && c.imeEn && c.opis && c.opisEn).toBeTruthy();
      expect(c.pot.startsWith('/kalkulator/')).toBe(true);
      expect(c.kljucne.length).toBeGreaterThan(2);
    }
  });

  it('ključne besede so brez šumnikov in velikih črk', () => {
    /* Sicer se z normaliziranim vprašanjem nikoli ne ujamejo. */
    for (const c of CILJI) {
      for (const k of c.kljucne) expect(k).toBe(k.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''));
    }
  });
});

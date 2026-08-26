import { describe, expect, it } from 'vitest';
import {
  CENIK,
  USTANOVNIH_MEST,
  UVODNA_DO,
  cenaZa,
  dolociPonudbo,
  ohraniZaklenjenoCeno,
  zakleniCeno,
  valutaZaDrzavo,
} from '@/lib/cenaNarocnine';

describe('katera ponudba pripada novemu narocniku', () => {
  it('prvih 50 dobi ustanovno ceno', () => {
    expect(dolociPonudbo('2026-09-01', 0)).toBe('ustanovna');
    expect(dolociPonudbo('2026-09-01', 49)).toBe('ustanovna');
  });

  it('petdeseti je se ustanovni, enainpetdeseti ni', () => {
    expect(dolociPonudbo('2026-09-01', USTANOVNIH_MEST - 1)).toBe('ustanovna');
    expect(dolociPonudbo('2026-09-01', USTANOVNIH_MEST)).toBe('uvodna');
  });

  it('po zasedenih mestih velja uvodna do vkljucno zadnjega dne', () => {
    expect(dolociPonudbo(UVODNA_DO, 50)).toBe('uvodna');
  });

  it('dan po roku je redna', () => {
    expect(dolociPonudbo('2026-11-01', 50)).toBe('redna');
  });

  it('ustanovna mesta veljajo tudi po roku uvodne', () => {
    expect(dolociPonudbo('2027-03-01', 10)).toBe('ustanovna');
  });

  it('neveljaven datum pade na REDNO, ne na ugodnejso', () => {
    expect(dolociPonudbo('ni datum', 50)).toBe('redna');
  });

  it('nesmiselno stevilo clanov ne razdaja ustanovnih mest', () => {
    expect(dolociPonudbo('2026-09-01', Number.NaN)).toBe('uvodna');
    expect(dolociPonudbo('2026-09-01', -5)).toBe('ustanovna');
  });
});

describe('cene', () => {
  it('brezplacni paket je vedno 0', () => {
    expect(cenaZa('redna', 'free', 'mesec')).toBe(0);
    expect(cenaZa('ustanovna', 'free', 'leto')).toBe(0);
  });

  it('redna mesecna je visja od letne', () => {
    expect(CENIK.redna.premium.mesec).toBeGreaterThan(CENIK.redna.premium.leto);
    expect(CENIK.redna.pro.mesec).toBeGreaterThan(CENIK.redna.pro.leto);
  });

  it('uvodna ni drazja od redne mesecne', () => {
    expect(CENIK.uvodna.premium.mesec).toBeLessThan(CENIK.redna.premium.mesec);
    expect(CENIK.uvodna.pro.mesec).toBeLessThan(CENIK.redna.pro.mesec);
  });

  it('ustanovna je najnizja povsod', () => {
    expect(CENIK.ustanovna.premium.mesec).toBeLessThan(CENIK.uvodna.premium.mesec);
    expect(CENIK.ustanovna.pro.mesec).toBeLessThan(CENIK.uvodna.pro.mesec);
  });
});

describe('zaklep cene ob prijavi', () => {
  it('zapise ponudbo, znesek in valuto', () => {
    const c = zakleniCeno('premium', 'mesec', '2026-09-01', 0);
    expect(c).toEqual({ ponudba: 'ustanovna', paket: 'premium', obdobje: 'mesec', znesek: 9, valuta: 'EUR', veljaDo: null });
  });

  it('po zasedenih mestih zaklene uvodno', () => {
    expect(zakleniCeno('pro', 'mesec', '2026-09-01', 50)?.znesek).toBe(29);
  });

  it('po roku zaklene redno', () => {
    expect(zakleniCeno('pro', 'mesec', '2026-12-01', 50)?.znesek).toBe(39);
  });

  it('veljaDo je null — obljuba je trajna ob neprekinjeni narocnini', () => {
    expect(zakleniCeno('premium', 'leto', '2026-09-01', 0)?.veljaDo).toBeNull();
  });
});

describe('kdaj zaklenjena cena obvelja', () => {
  it('aktivna in neprekinjena obdrzi ceno', () => {
    expect(ohraniZaklenjenoCeno('active', false)).toBe(true);
  });

  it('prekinjena jo izgubi, tudi ce je zdaj spet aktivna', () => {
    expect(ohraniZaklenjenoCeno('active', true)).toBe(false);
  });

  it('preklicana narocnina je ne obdrzi', () => {
    expect(ohraniZaklenjenoCeno('canceled', false)).toBe(false);
  });

  it('zamuda pri placilu je se ne vzame', () => {
    expect(ohraniZaklenjenoCeno('past_due', false)).toBe(true);
  });
});

describe('valuta obiskovalca', () => {
  it('ZDA dobijo dolarski cenik, ostali evrskega', () => {
    expect(valutaZaDrzavo('US')).toBe('USD');
    expect(valutaZaDrzavo('us')).toBe('USD');
    expect(valutaZaDrzavo('SI')).toBe('EUR');
    expect(valutaZaDrzavo('')).toBe('EUR');
    expect(valutaZaDrzavo(null)).toBe('EUR');
    expect(valutaZaDrzavo(undefined)).toBe('EUR');
  });

  it('dolarski cenik je svoj, ne preracun evrskega', () => {
    expect(cenaZa('redna', 'premium', 'mesec', 'USD')).toBe(24);
    expect(cenaZa('redna', 'pro', 'leto', 'USD')).toBe(39);
    expect(cenaZa('ustanovna', 'premium', 'mesec', 'USD')).toBe(15);
    /* brez valute ostane evrski — obstojeci klici se ne smejo spremeniti */
    expect(cenaZa('redna', 'premium', 'mesec')).toBe(19);
  });
});

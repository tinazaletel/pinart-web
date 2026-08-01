import { describe, it, expect } from 'vitest';
import { PRICING_SERVICES, PODROCJA, podrocjeZaIme } from '@/lib/pricingCatalog';

/* Celovitost cenovnega kataloga. Ti testi ujamejo tiho napako: nekdo doda/preimenuje
   storitev ali jo pozabi uvrstiti v področje -> kalkulator jo napačno združi ali
   izpusti iz cene. (Točno to se je že zgodilo: "dizajnsistem" je bil brez področja.) */
describe('cenovni katalog — celovitost', () => {
  it('vsaka storitev ima pozitivno osnovno ceno', () => {
    for (const s of PRICING_SERVICES) {
      expect(s.osnova, s.id).toBeGreaterThan(0);
    }
  });

  it('ni podvojenih id-jev storitev', () => {
    const ids = PRICING_SERVICES.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('vsaka storitev pripada NATANKO enemu področju', () => {
    for (const s of PRICING_SERVICES) {
      const areas = PODROCJA.filter(p => p.storitve.includes(s.id));
      expect(areas.length, `${s.id} je v ${areas.length} področjih (mora biti 1)`).toBe(1);
    }
  });

  it('vsak id v področjih obstaja v katalogu storitev', () => {
    const znani = new Set(PRICING_SERVICES.map(s => s.id));
    for (const p of PODROCJA) {
      for (const id of p.storitve) {
        expect(znani.has(id), `${id} v področju ${p.id} ne obstaja v katalogu`).toBe(true);
      }
    }
  });

  it('podrocjeZaIme najde pravo področje po imenu storitve', () => {
    expect(podrocjeZaIme('Spletna stran')?.id).toBe('splet');
    expect(podrocjeZaIme('Logotip + osnovna identiteta')?.id).toBe('graficno');
    expect(podrocjeZaIme('Social media vodenje')?.id).toBe('marketing');
    expect(podrocjeZaIme('Neobstoječa storitev')).toBeUndefined();
  });
});

import { describe, expect, it } from 'vitest';
import {
  PRAV_VPRASANJA, PRAV_STALNE, vprasanjaZa, osnovnaVprasanja, dodatnaVprasanja,
  povzetekUporabe, nedogovorjena,
} from '@/lib/praviceVprasanja';

/* Vprasalnik o obsegu uporabe je podatek, ne koda — zato ga preverjamo kot
   podatek. Napacen vnos v tabeli bi sicer tiho ustvaril vprasanje brez
   odgovorov ali odgovor, ki nikamor ne gre. */
describe('pravice: vprasanja po storitvah', () => {
  const vsi = Object.entries(PRAV_VPRASANJA);

  it('vsaka storitev ima vprasanja in vsako vprasanje vsaj dve moznosti', () => {
    expect(vsi.length).toBeGreaterThan(0);
    vsi.forEach(([sid, vprasanja]) => {
      expect(vprasanja.length, sid).toBeGreaterThan(0);
      vprasanja.forEach(v => {
        expect(v.opcije.length, `${sid}/${v.id}`).toBeGreaterThanOrEqual(2);
      });
    });
  });

  it('id-ji vprasanj in moznosti so znotraj storitve enolicni', () => {
    vsi.forEach(([sid, vprasanja]) => {
      const idji = vprasanja.map(v => v.id);
      expect(new Set(idji).size, sid).toBe(idji.length);
      vprasanja.forEach(v => {
        const oi = v.opcije.map(o => o.id);
        expect(new Set(oi).size, `${sid}/${v.id}`).toBe(oi.length);
      });
    });
  });

  it('vsako vprasanje ima slovensko in anglesko besedilo', () => {
    vsi.forEach(([sid, vprasanja]) => {
      vprasanja.forEach(v => {
        expect(v.sl.trim(), `${sid}/${v.id}`).not.toBe('');
        expect(v.en.trim(), `${sid}/${v.id}`).not.toBe('');
        v.opcije.forEach(o => {
          expect(o.sl.trim(), `${sid}/${v.id}/${o.id}`).not.toBe('');
          expect(o.en.trim(), `${sid}/${v.id}/${o.id}`).not.toBe('');
        });
      });
    });
  });

  it('noben odgovor ne gre v ceno — samo v ponudbo, pogodbo ali zapis', () => {
    vsi.forEach(([sid, vprasanja]) => {
      vprasanja.forEach(v => {
        expect(['ponudba', 'pogodba', 'zapis'], `${sid}/${v.id}`).toContain(v.kam);
      });
    });
  });

  it('na storitev so najvec tri osnovna vprasanja', () => {
    vsi.forEach(([sid]) => {
      expect(osnovnaVprasanja(sid).length, sid).toBeLessThanOrEqual(3);
      expect(osnovnaVprasanja(sid).length + dodatnaVprasanja(sid).length).toBe(vprasanjaZa(sid).length);
    });
  });

  it('povsod sta na voljo »Se ni dogovorjeno« in »Drugo«', () => {
    expect(PRAV_STALNE.map(o => o.id).sort()).toEqual(['drugo', 'nedogovorjeno']);
  });

  it('neznana storitev nima vprasanj in ne pade', () => {
    expect(vprasanjaZa('taksne-storitve-ni')).toEqual([]);
    expect(povzetekUporabe('taksne-storitve-ni', undefined)).toBe('');
  });
});

describe('pravice: povzetek uporabe za ponudbo', () => {
  it('sestavi stavek samo iz odgovorov, ki gredo v ponudbo', () => {
    const povz = povzetekUporabe('logo', { 'kje': 'splet + tisk', 'kdo': 'narocnik' });
    expect(povz).toContain('Kje bo naročnik uporabljal logotip?');
    expect(povz.toLowerCase()).toContain('splet in družbena omrežja');
    expect(povz.toLowerCase()).toContain('samo naročnik');
  });

  it('brez odgovorov ne izpise nicesar', () => {
    expect(povzetekUporabe('logo', {})).toBe('');
  });

  it('anglesko besedilo uporabi angleske nazive', () => {
    const povz = povzetekUporabe('logo', { 'kje': 'splet' }, true);
    expect(povz).toContain('Where will the client use the logo?');
    expect(povz.toLowerCase()).toContain('web and social media');
  });
});

describe('pravice: nedogovorjeno ni privolitev', () => {
  it('prazen odgovor steje kot nedogovorjen', () => {
    const manjka = nedogovorjena('logo', {});
    expect(manjka.length).toBe(vprasanjaZa('logo').length);
  });

  it('izrecno »Se ni dogovorjeno« prav tako steje kot nedogovorjen', () => {
    const manjka = nedogovorjena('logo', { 'kje': 'nedogovorjeno' });
    expect(manjka.some(v => v.id === 'kje')).toBe(true);
  });

  it('odgovorjeno vprasanje izpade s seznama', () => {
    const manjka = nedogovorjena('logo', { 'kje': 'splet' });
    expect(manjka.some(v => v.id === 'kje')).toBe(false);
  });
});

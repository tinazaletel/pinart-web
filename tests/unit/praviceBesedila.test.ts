import { describe, expect, it } from 'vitest';
import { POGODBA_PRAVICE_DODATEK, stavekBrezDoplacila, stavekPravicVPonudbi } from '../../lib/praviceBesedila';

/* Tri stanja kljukice pri pravicah morajo v dokumentu dobiti vsako svoj
   stavek. Neoznaceno NI »brez pravic« (Tina, 26. 8. 2026). */

const osnova = { obseg: 'splet in tisk', vrsta: 'izključni prenos', trajanje: '3 leta', znesek: '300 €' };

describe('pravice: stavki v ponudbi', () => {
  it('posebej = locena postavka z zneskom', () => {
    const s = stavekPravicVPonudbi({ ...osnova, nacin: 'posebej' }, false);
    expect(s).toContain('ločena postavka: 300 €');
    expect(s).toContain('splet in tisk');
    expect(s).toContain('izključni prenos, 3 leta');
    expect(stavekPravicVPonudbi({ ...osnova, nacin: 'posebej' }, true)).toContain('separate item: 300 €');
  });

  it('vkljuceno = v ceni storitve, brez zneska', () => {
    const s = stavekPravicVPonudbi({ ...osnova, nacin: 'vkljuceno' }, false);
    expect(s).toContain('vključene v ceno storitve');
    expect(s).not.toContain('300 €');
    expect(stavekPravicVPonudbi({ ...osnova, nacin: 'vkljuceno' }, true)).toContain('included in the service price');
  });

  it('neoznaceno = pravica uporabe brez doplacila, ne brez pravic', () => {
    const s = stavekPravicVPonudbi({ ...osnova, nacin: undefined }, false);
    expect(s).toBe(stavekBrezDoplacila(false));
    expect(s).toContain('brez ločenega doplačila');
    expect(s).toContain('dogovori posebej');
    expect(s).not.toContain('300 €');
    expect(stavekBrezDoplacila(true)).toContain('no separate charge');
  });

  it('licenca: znesek je lahko besedilo (prek letne licence)', () => {
    expect(stavekPravicVPonudbi({ ...osnova, nacin: 'posebej', znesek: 'prek letne licence' }, false))
      .toContain('ločena postavka: prek letne licence');
  });

  it('pogodbeni dodatek obstaja v obeh jezikih in omenja moralne pravice', () => {
    expect(POGODBA_PRAVICE_DODATEK.sl).toContain('Moralne avtorske pravice ostanejo avtorju');
    expect(POGODBA_PRAVICE_DODATEK.en).toContain('Moral rights remain with the author');
    expect(POGODBA_PRAVICE_DODATEK.sl).not.toMatch(/<|>/);
  });
});

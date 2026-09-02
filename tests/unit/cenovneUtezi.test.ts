import { describe, expect, it } from 'vitest';
import {
  BREZ_DOPLACILA, cenaVrstice, ENOTE_IZ_IZBIRE, opozorilo, predlogZaProracun,
  preveriUtezi, proracunIzOdgovora, utezZaStoritev, zaokrozi50,
} from '@/lib/cenovneUtezi';
import { VPRASANJA_PO_STORITVI } from '@/lib/vprasanjaPoStoritvi';

/* Uteži so vezane na TOČNO besedilo izbire v vprašalniku. Če kdo besedilo
   spremeni, utež tiho neha delovati — cena se ne premakne in nihče ne opazi.
   Ta test je edino, kar to ujame. */
describe('uteži se ujemajo z vprašalnikom', () => {
  it('vsaka utež ima svoje vprašanje in svojo izbiro', () => {
    expect(preveriUtezi(VPRASANJA_PO_STORITVI)).toEqual([]);
  });
});

/* Za vsak primer računamo tudi ceno vrstice, kot jo vidi uporabnica, ker se
   je prav tam skrivala napaka: vsota vrstic se ni ujemala s končno ceno. */
const cena = (sid: string, osnova: number, odgovori: Record<string, string>) => {
  const enote: Record<string, number> = {};
  for (const [k, v] of Object.entries(odgovori)) {
    const n = ENOTE_IZ_IZBIRE[v];
    if (n !== undefined) enote[k] = n;
  }
  return utezZaStoritev(sid, osnova, odgovori, enote);
};

describe('obseg dela premakne ceno', () => {
  it('logo: trije predlogi množijo, raziskava se prišteje', () => {
    const u = cena('logo', 650, {
      predlogi: '3 predlogi',
      raziskava: 'Osnovna raziskava (splet, konkurenca, reference)',
    });
    expect(u.mult).toBeCloseTo(1.25);
    expect(u.dodatki).toBe(250);
    expect(u.cena).toBe(1063);
    expect(u.razclenitev).toHaveLength(2);
  });

  it('logo: brez izbir ostane osnovna cena in razčlenitev je prazna', () => {
    const u = cena('logo', 650, {});
    expect(u.cena).toBe(650);
    expect(u.mult).toBe(1);
    expect(u.razclenitev).toEqual([]);
  });

  it('publikacija: prelom se računa na stran, prvih osem je v osnovi', () => {
    const u = cena('publikacija', 700, { strani: '33 do 96' });
    expect(u.cena).toBe(2100);
    expect(u.razclenitev[0].opis).toContain('/ stran');
  });

  it('publikacija: "samo prelom" zniža tudi delo po straneh, ne le zasnove', () => {
    const u = cena('publikacija', 700, {
      strani: '33 do 96', obseg: 'Samo prelom (postavitev vsebine)',
    });
    expect(u.cena).toBe(840);
  });

  it('publikacija: priprava za tisk ne sme stati kot oblikovanje', () => {
    const u = cena('publikacija', 700, {
      strani: '33 do 96', obseg: 'Samo priprava za tisk',
    });
    expect(u.cena / 64).toBeLessThan(6);
  });

  it('fotografija: dan množi, paket in retuše se prištejejo', () => {
    const u = cena('fotografija', 450, { trajanje: '1 dan', post: 'Nad 50', retuse: 'Do 6' });
    expect(u.mult).toBeCloseTo(1.5);
    expect(u.dodatki).toBe(1010);
    expect(u.cena).toBe(1685);
  });
});

/* Ponudba mora biti seštevljiva. Če vrstice ne dajo končne cene, uporabnica
   pošlje naročniku dokument, ki si sam sebi nasprotuje. */
describe('vrstice se seštejejo v ceno dela', () => {
  const primeri: Array<[string, string, number, Record<string, string>, number]> = [
    ['logo', 'logo', 650, { predlogi: '3 predlogi', raziskava: 'Osnovna raziskava (splet, konkurenca, reference)' }, 1],
    ['fotografija', 'fotografija', 450, { trajanje: '1 dan', post: 'Nad 50', retuse: 'Do 6' }, 1],
    ['publikacija', 'publikacija', 700, { strani: '33 do 96' }, 1],
    ['logo x3', 'logo', 650, { predlogi: '3 predlogi' }, 3],
  ];

  it.each(primeri)('%s: količina × cena vrstice = prispevek k delu', (_ime, sid, osnova, odgovori, kolicina) => {
    const mult = 1.3;
    const u = cena(sid, osnova * kolicina, odgovori);
    const naEnoto = cenaVrstice(u.cena - u.dodatki, u.dodatki, mult, kolicina);
    const vrstica = naEnoto * kolicina;
    expect(vrstica).toBe(zaokrozi50(vrstica));
    expect(Math.abs(vrstica - ((u.cena - u.dodatki) * mult + u.dodatki))).toBeLessThanOrEqual(25 * kolicina);
  });

  it('cena vrstice je vedno večkratnik 50', () => {
    for (let k = 1; k <= 6; k += 1) {
      expect(cenaVrstice(913, 137, 1.17, k) % 50).toBe(0);
    }
  });
});

/* Klik, ki ne premakne cene, mora biti vseeno viden — sicer ni mogoče ločiti
   "ta odgovor ne vpliva" od "ta odgovor se ni upošteval". */
describe('izbira brez učinka se vseeno izpiše', () => {
  it('dva kroga popravkov: cena enaka, v razčlenitvi pa piše', () => {
    const brez = cena('logo', 650, { predlogi: '3 predlogi' });
    const z = cena('logo', 650, { predlogi: '3 predlogi', popravki: '2 kroga' });
    expect(z.cena).toBe(brez.cena);
    expect(z.razclenitev).toHaveLength(brez.razclenitev.length + 1);
    expect(z.razclenitev.find(x => x.vprasanje === 'popravki')?.opis).toBe(BREZ_DOPLACILA);
  });

  it('publikacija do 8 strani: prelom je v osnovi, a se vidi', () => {
    const u = cena('publikacija', 700, { strani: 'Do 8' });
    expect(u.cena).toBe(700);
    expect(u.razclenitev[0].opis).toBe(BREZ_DOPLACILA);
  });

  it('neodgovorjeno vprašanje ostane skrito', () => {
    expect(cena('logo', 650, {}).razclenitev).toEqual([]);
  });

  it('nevtralna izbira ne pokvari razdelitve učinka med množitelje', () => {
    const u = cena('logo', 650, { predlogi: '3 predlogi', popravki: '2 kroga' });
    const mult = u.razclenitev.filter(x => x.opis.startsWith('×'));
    expect(mult).toHaveLength(1);
    expect(mult[0].ucinek).toBe(163);
  });
});

describe('varovalka opozori, ne reže', () => {
  it('opozori, ko se nabere preveč izbir', () => {
    const u = cena('logo', 650, {
      predlogi: '15 predlogov',
      raziskava: 'Poglobljena raziskava in razvoj smeri',
      oblikaSkice: 'Obsežno raziskovanje, deset ali več skic',
    });
    expect(u.cena).toBe(3510);
    expect(opozorilo('logo', u.cena, u.mult)).toContain('veliko izbir');
  });

  it('opozori, ko cena preseže tržni razpon', () => {
    expect(opozorilo('fotografija', 4000, 1)).toContain('trg');
  });

  it('pri običajni ceni molči', () => {
    expect(opozorilo('logo', 1063, 1.25)).toBeNull();
  });
});

/* Proračun na ceno NE sme vplivati — sicer kalkulator sidra delo na
   naročnikovo željo. Mora pa povedati razliko in kaj z njo. */
describe('proračun naročnika', () => {
  const R = 'Osnovna raziskava (splet, konkurenca, reference)';
  const polna = { predlogi: '3 predlogi', popravki: '2 kroga', raziskava: R };

  it.each([
    ['Do 400 €', 400],
    ['400 € do 1000 €', 1000],
    ['1.000 € do 2.000 €', 2000],
    ['Nad 2.000 €', null],
    ['Še ne vem', null],
    ['600', 600],
    ['', null],
  ])('iz odgovora "%s" razbere mejo %s', (odgovor, meja) => {
    expect(proracunIzOdgovora(odgovor as string)).toBe(meja);
  });

  it('proračun ne spremeni cene', () => {
    const brez = cena('logo', 650, polna);
    const z = cena('logo', 650, { ...polna, budget: 'Do 400 €' });
    expect(z.cena).toBe(brez.cena);
  });

  it('ko delo presega proračun, pove razliko in kaj odvzeti', () => {
    const p = predlogZaProracun('logo', 650, { ...polna, budget: '400 € do 1000 €' }, {});
    expect(p).not.toBeNull();
    expect(p!.meja).toBe(1000);
    expect(p!.razlika).toBe(63);
    expect(p!.odvzemi).toEqual([R]);
    expect(p!.preostane).toBe(813);
    expect(p!.zadosca).toBe(true);
  });

  it('pove tudi, kadar krčenje ne zadošča', () => {
    const p = predlogZaProracun('logo', 650, { ...polna, budget: 'Do 400 €' }, {});
    expect(p!.zadosca).toBe(false);
    expect(p!.preostane).toBe(650);
  });

  it('molči, kadar je delo v okviru proračuna', () => {
    expect(predlogZaProracun('logo', 650, { ...polna, budget: 'Nad 2.000 €' }, {})).toBeNull();
    expect(predlogZaProracun('logo', 650, { ...polna, budget: '1.000 € do 2.000 €' }, {})).toBeNull();
    expect(predlogZaProracun('logo', 650, polna, {})).toBeNull();
  });
});

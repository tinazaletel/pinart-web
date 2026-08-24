import { describe, expect, it } from 'vitest';
import {
  NAJVEC_BAJTOV_DATOTEKA,
  NAJVEC_BAJTOV_SKUPAJ,
  NAJVEC_PRIPONK,
  berljivaVelikost,
  jePrepovedanaDatoteka,
  jeSeProstor,
  jeSlika,
  koncnicaDatoteke,
  preveriPriponke,
  preveriPriponko,
  skupnaVelikost,
  varnoImePriponke,
} from '@/lib/priponke';

const MB = 1024 * 1024;
const dat = (ime: string, velikost = 1024) => ({ ime, velikost });

describe('končnica datoteke', () => {
  it('vzame zadnjo končnico in jo zniža v male črke', () => {
    expect(koncnicaDatoteke('Ponudba.PDF')).toBe('pdf');
    expect(koncnicaDatoteke('arhiv.tar.gz')).toBe('gz');
  });

  it('vrne prazno za datoteke brez končnice in za pikaste datoteke', () => {
    expect(koncnicaDatoteke('brezkoncnice')).toBe('');
    expect(koncnicaDatoteke('.gitignore')).toBe('');
    expect(koncnicaDatoteke('konec.')).toBe('');
  });
});

describe('prepovedane končnice', () => {
  it('zavrne vseh šest izvršljivih končnic', () => {
    for (const k of ['exe', 'bat', 'cmd', 'sh', 'js', 'msi']) {
      expect(jePrepovedanaDatoteka(`nekaj.${k}`)).toBe(true);
    }
  });

  it('spusti navadne poslovne datoteke', () => {
    for (const ime of ['ponudba.pdf', 'logo.png', 'tabela.xlsx', 'pogodba.docx']) {
      expect(jePrepovedanaDatoteka(ime)).toBe(false);
    }
  });

  it('ujame dvojno končnico in zaključno piko (pogodba.pdf.exe, virus.exe.)', () => {
    expect(jePrepovedanaDatoteka('pogodba.pdf.exe')).toBe(true);
    expect(jePrepovedanaDatoteka('virus.exe.')).toBe(true);
    expect(jePrepovedanaDatoteka('VIRUS.EXE')).toBe(true);
    /* obratno pa NE sme pasti: js sredi imena je nedolžen */
    expect(jePrepovedanaDatoteka('moj.js.pdf')).toBe(false);
  });
});

describe('berljiva velikost', () => {
  it('zapiše bajte, kilobajte in megabajte', () => {
    expect(berljivaVelikost(0)).toBe('0 B');
    expect(berljivaVelikost(999)).toBe('999 B');
    expect(berljivaVelikost(1024)).toBe('1 kB');
    expect(berljivaVelikost(1536)).toBe('1,5 kB');
    expect(berljivaVelikost(10 * MB)).toBe('10 MB');
    expect(berljivaVelikost(20 * MB)).toBe('20 MB');
  });

  it('prenese nesmiselne vrednosti in upošteva ločilo decimalke', () => {
    expect(berljivaVelikost(Number.NaN)).toBe('0 B');
    expect(berljivaVelikost(-5)).toBe('0 B');
    expect(berljivaVelikost(1536, '.')).toBe('1.5 kB');
  });
});

describe('varno ime priponke', () => {
  it('odreže pot in obdrži samo ime datoteke', () => {
    expect(varnoImePriponke('/etc/passwd')).toBe('passwd');
    expect(varnoImePriponke('C:\\Users\\Tina\\ponudba.pdf')).toBe('ponudba.pdf');
  });

  it('ne dovoli izhoda iz mape in vodilnih pik', () => {
    expect(varnoImePriponke('../../skrivnost.pdf')).toBe('skrivnost.pdf');
    expect(varnoImePriponke('...')).toBe('');
    expect(varnoImePriponke('   ')).toBe('');
  });
});

describe('ena priponka', () => {
  it('spusti navadno datoteko', () => {
    expect(preveriPriponko(dat('ponudba.pdf', 250 * 1024))).toEqual({ veljavno: true });
  });

  it('zavrne prazno datoteko in datoteko brez imena', () => {
    expect(preveriPriponko(dat('ponudba.pdf', 0)).veljavno).toBe(false);
    expect(preveriPriponko(dat('', 100)).veljavno).toBe(false);
  });

  it('zavrne datoteko čez 10 MB, 10 MB natanko pa spusti', () => {
    expect(preveriPriponko(dat('video.zip', NAJVEC_BAJTOV_DATOTEKA)).veljavno).toBe(true);
    const prevelika = preveriPriponko(dat('video.zip', NAJVEC_BAJTOV_DATOTEKA + 1));
    expect(prevelika.veljavno).toBe(false);
    expect(prevelika.napaka).toContain('10 MB');
  });

  it('zavrne izvršljivo datoteko s pojasnilom', () => {
    const izid = preveriPriponko(dat('namestitev.msi', 2048));
    expect(izid.veljavno).toBe(false);
    expect(izid.napaka).toContain('.msi');
  });
});

describe('seznam priponk', () => {
  it('spusti pet datotek, šesto zavrne', () => {
    const pet = Array.from({ length: NAJVEC_PRIPONK }, (_, i) => dat(`slika-${i}.png`, 1024));
    expect(preveriPriponke(pet).veljavno).toBe(true);
    const sest = preveriPriponke([...pet, dat('slika-6.png', 1024)]);
    expect(sest.veljavno).toBe(false);
    expect(sest.napaka).toContain('5');
  });

  it('sešteje velikosti in zavrne skupno več kot 20 MB', () => {
    const tri = [dat('a.pdf', 9 * MB), dat('b.pdf', 9 * MB), dat('c.pdf', 3 * MB)];
    expect(skupnaVelikost(tri)).toBe(21 * MB);
    const izid = preveriPriponke(tri);
    expect(izid.veljavno).toBe(false);
    expect(izid.skupaj).toBe(21 * MB);
    expect(izid.napaka).toContain('20 MB');
  });

  it('20 MB natanko je še v redu', () => {
    const dve = [dat('a.pdf', 10 * MB), dat('b.pdf', 10 * MB)];
    const izid = preveriPriponke(dve);
    expect(izid.veljavno).toBe(true);
    expect(izid.skupaj).toBe(NAJVEC_BAJTOV_SKUPAJ);
  });

  it('prazen seznam je veljaven, ena slaba datoteka pa podre celoto', () => {
    expect(preveriPriponke([])).toEqual({ veljavno: true, skupaj: 0 });
    expect(preveriPriponke([dat('ok.pdf', 1024), dat('zagon.bat', 512)]).veljavno).toBe(false);
  });
});

describe('prostor za novo datoteko', () => {
  it('pove, kdaj je meja dosežena', () => {
    const stiri = Array.from({ length: 4 }, (_, i) => dat(`d-${i}.pdf`, MB));
    expect(jeSeProstor(stiri, MB)).toBe(true);
    expect(jeSeProstor([...stiri, dat('peta.pdf', MB)], MB)).toBe(false);
    expect(jeSeProstor([dat('a.pdf', 19 * MB)], 2 * MB)).toBe(false);
    expect(jeSeProstor([], 0)).toBe(true);
  });
});

describe('predogled slike', () => {
  it('prepozna sliko po MIME in po končnici, SVG pa ne', () => {
    expect(jeSlika({ ime: 'posnetek.png', mime: 'image/png' })).toBe(true);
    expect(jeSlika({ ime: 'skica.JPG' })).toBe(true);
    expect(jeSlika({ ime: 'risba.svg', mime: 'image/svg+xml' })).toBe(false);
    expect(jeSlika({ ime: 'ponudba.pdf', mime: 'application/pdf' })).toBe(false);
    expect(jeSlika({})).toBe(false);
  });
});

describe('zavrnitev pove, kaj naj uporabnica naredi', () => {
  it('SVG dobi svojo razlago in pot naprej (zip)', () => {
    const izid = preveriPriponko({ ime: 'logotip.svg', velikost: 12_000 });
    expect(izid.veljavno).toBe(false);
    expect(izid.napaka).toContain('.zip');
    expect(izid.napaka).not.toContain('izvršljiv');
  });

  it('svgz je obravnavan enako kot svg', () => {
    expect(preveriPriponko({ ime: 'risba.svgz', velikost: 900 }).napaka).toContain('.zip');
  });

  it('izvrsljiva datoteka NE dobi nasveta, naj jo stisne', () => {
    const izid = preveriPriponko({ ime: 'namesti.exe', velikost: 2_000 });
    expect(izid.veljavno).toBe(false);
    expect(izid.napaka).not.toContain('.zip');
    expect(izid.napaka).toContain('povezavo');
  });

  it('zip s svg vsebino je dovoljen — nevarnost je izris, ne datoteka', () => {
    expect(preveriPriponko({ ime: 'logotipi.zip', velikost: 200_000 }).veljavno).toBe(true);
  });
});

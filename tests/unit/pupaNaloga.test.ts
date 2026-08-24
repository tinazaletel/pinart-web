import { describe, it, expect } from 'vitest';
import { jeNamenNaloge, razcleniNalogo, OZNAKA_PUPA } from '@/lib/pupaNaloga';

/* Vsi testi imajo VBRIZGAN današnji dan, sicer bi rezultat plaval z dnevom izvajanja.
   PON = ponedeljek, 24. 8. 2026; PET = petek, 28. 8. 2026. */
const PON = new Date(2026, 7, 24);
const PET = new Date(2026, 7, 28);

describe('jeNamenNaloge — kdaj Pupa sploh ponudi zapis naloge', () => {
  it('prepozna slovenske ukaze (tudi z nagovorom)', () => {
    expect(jeNamenNaloge('dodaj nalogo: pokliči tiskarno')).toBe(true);
    expect(jeNamenNaloge('Pupa, ustvari nalogo pokliči tiskarno')).toBe(true);
    expect(jeNamenNaloge('Hej Pupa, dodaj mi novo nalogo pokliči tiskarno')).toBe(true);
    expect(jeNamenNaloge('Nova naloga: pokliči tiskarno')).toBe(true);
  });

  it('prepozna angleške ukaze', () => {
    expect(jeNamenNaloge('add a task: call the printer')).toBe(true);
    expect(jeNamenNaloge('create task call the printer')).toBe(true);
  });

  it('navaden pogovor ni ukaz — Pupa ne sme ugibati', () => {
    expect(jeNamenNaloge('kaj naj danes delam?')).toBe(false);
    expect(jeNamenNaloge('kako dodam nalogo v Naloge?')).toBe(false);
    expect(jeNamenNaloge('dodaj strošek za kavo')).toBe(false);
    expect(jeNamenNaloge('')).toBe(false);
    expect(jeNamenNaloge('   ')).toBe(false);
  });
});

describe('razcleniNalogo — naslov', () => {
  it('iz ukaza z rokom razbere naslov, rok in privzeti stolpec', () => {
    const o = razcleniNalogo('Pupa, dodaj nalogo: pokliči Rokus Klett do petka', PON);
    expect(o).not.toBeNull();
    expect(o?.naslov).toBe('Pokliči Rokus Klett');
    expect(o?.rok).toBe('2026-08-28');
    expect(o?.rokIzraz).toBe('do petka');
    expect(o?.stolpec).toBe('todo');
  });

  it('nova naloga je označena, da jo je ustvarila Pupa', () => {
    const o = razcleniNalogo('dodaj nalogo pripravi moodboard', PON);
    expect(o?.oznake).toEqual([OZNAKA_PUPA]);
  });

  it('besedilo brez roka ostane brez roka (nič se ne izmišlja)', () => {
    const o = razcleniNalogo('ustvari nalogo pripravi moodboard', PON);
    expect(o?.naslov).toBe('Pripravi moodboard');
    expect(o?.rok).toBeUndefined();
    expect(o?.rokIzraz).toBeUndefined();
  });

  it('prazen vnos vrne null', () => {
    expect(razcleniNalogo('', PON)).toBeNull();
    expect(razcleniNalogo('    ', PON)).toBeNull();
  });

  it('ukaz brez naslova vrne null (ni kaj potrjevati)', () => {
    expect(razcleniNalogo('dodaj nalogo', PON)).toBeNull();
    expect(razcleniNalogo('dodaj nalogo: do petka', PON)).toBeNull();
  });

  it('druge vrstice postanejo opis, prva je naslov', () => {
    const o = razcleniNalogo('dodaj nalogo: pokliči tiskarno\nvprašaj za rok in ceno', PON);
    expect(o?.naslov).toBe('Pokliči tiskarno');
    expect(o?.opis).toBe('vprašaj za rok in ceno');
  });
});

describe('razcleniNalogo — rok', () => {
  it('izrecen datum brez letnice velja za letos', () => {
    expect(razcleniNalogo('dodaj nalogo oddaj poročilo do 15. 9.', PON)?.rok).toBe('2026-09-15');
    expect(razcleniNalogo('dodaj nalogo oddaj poročilo do 3.10.2026', PON)?.rok).toBe('2026-10-03');
  });

  it('datum, ki je letos že mimo, pomeni prihodnje leto', () => {
    expect(razcleniNalogo('dodaj nalogo plačaj članarino do 5.1.', PON)?.rok).toBe('2027-01-05');
  });

  it('nemogoč datum se ne upošteva', () => {
    const o = razcleniNalogo('dodaj nalogo preveri 31.2.', PON);
    expect(o?.rok).toBeUndefined();
  });

  it('danes / jutri / čez toliko dni', () => {
    expect(razcleniNalogo('dodaj nalogo pošlji ponudbo jutri', PON)?.rok).toBe('2026-08-25');
    expect(razcleniNalogo('dodaj nalogo pošlji ponudbo danes', PON)?.rok).toBe('2026-08-24');
    expect(razcleniNalogo('dodaj nalogo pošlji ponudbo čez 3 dni', PON)?.rok).toBe('2026-08-27');
    expect(razcleniNalogo('dodaj nalogo pošlji ponudbo čez 2 tedna', PON)?.rok).toBe('2026-09-07');
  });

  it('dnevi v tednu — s šumniki in v vseh sklonih', () => {
    expect(razcleniNalogo('dodaj nalogo oddaj račun do četrtka', PON)?.rok).toBe('2026-08-27');
    expect(razcleniNalogo('dodaj nalogo sestanek v sredo', PON)?.rok).toBe('2026-08-26');
  });

  it('isti dan v tednu pomeni danes, ne čez teden', () => {
    expect(razcleniNalogo('dodaj nalogo oddaj račun do petka', PET)?.rok).toBe('2026-08-28');
  });

  it('»naslednji petek« je teden kasneje', () => {
    expect(razcleniNalogo('dodaj nalogo oddaj račun naslednji petek', PON)?.rok).toBe('2026-09-04');
  });

  it('konec tedna / meseca / naslednji teden', () => {
    expect(razcleniNalogo('dodaj nalogo uredi galerijo do konca tedna', PON)?.rok).toBe('2026-08-28');
    expect(razcleniNalogo('dodaj nalogo uredi galerijo do konca meseca', PON)?.rok).toBe('2026-08-31');
    expect(razcleniNalogo('dodaj nalogo uredi galerijo naslednji teden', PON)?.rok).toBe('2026-08-31');
  });

  it('dan v tednu brez predloga ni rok (ime ostane v naslovu)', () => {
    const o = razcleniNalogo('dodaj nalogo pokliči Nedeljo Novak', PON);
    expect(o?.rok).toBeUndefined();
    expect(o?.naslov).toBe('Pokliči Nedeljo Novak');
  });

  it('angleški vnos', () => {
    const o = razcleniNalogo('add a task: call the printer tomorrow', PON);
    expect(o?.naslov).toBe('Call the printer');
    expect(o?.rok).toBe('2026-08-25');
  });
});

describe('razcleniNalogo — projekt', () => {
  it('»za projekt X« se odreže iz naslova in postane projekt', () => {
    const o = razcleniNalogo('dodaj nalogo pripravi logotip za projekt Rokus Klett', PON, ['Rokus Klett']);
    expect(o?.naslov).toBe('Pripravi logotip');
    expect(o?.projekt).toBe('Rokus Klett');
  });

  it('ime obstoječega projekta v besedilu nalogo naveže, naslova pa ne okrni', () => {
    const o = razcleniNalogo('dodaj nalogo pokliči Rokus Klett do petka', PON, ['Rokus Klett']);
    expect(o?.naslov).toBe('Pokliči Rokus Klett');
    expect(o?.projekt).toBe('Rokus Klett');
  });

  it('neznan projekt se vseeno zapiše (prosto ime)', () => {
    const o = razcleniNalogo('dodaj nalogo pripravi skice na projektu Kavarna Luna', PON, ['Rokus Klett']);
    expect(o?.naslov).toBe('Pripravi skice');
    expect(o?.projekt).toBe('Kavarna Luna');
  });

  it('brez projekta ostane polje prazno', () => {
    expect(razcleniNalogo('dodaj nalogo pripravi skice', PON, ['Rokus Klett'])?.projekt).toBeUndefined();
  });
});

import { describe, it, expect } from 'vitest';
import { okvirZa, imaRazpon, zapisRazpona, zapisVirov, zaupanje, TRZNI_OKVIRI } from '@/lib/trzniOkvir';
import { VIRI_CEN } from '@/lib/trzniOkviriViri';

/* Imena ponudnikov v odjemalca NE gredo — tu jih beremo naravnost iz ustvarjene
   datoteke, ker test teče na strežniku in mora preveriti prav njih. */
const viriZa = (id: string) => VIRI_CEN[id] || [];

describe('tržni okvir', () => {
  it('za spletno stran vrne razpon z mediano', () => {
    const o = okvirZa('web')!;
    expect(o.kakovost).toBe('A');
    expect(zapisRazpona(o)).toBe('590–1.500 €');
    expect(o.mediana).toBe(1200);
  });

  it('pri storitvah z enoto enoto tudi izpiše', () => {
    /* Brez enote je »20–30 €« za publikacijo zavajajoče — to je cena na stran. */
    expect(zapisRazpona(okvirZa('publikacija')!)).toBe('20–30 € / stran');
    expect(zapisRazpona(okvirZa('interier')!)).toBe('15–45 € / m²');
    expect(zapisRazpona(okvirZa('smm')!)).toBe('290–790 € / mesec');
  });

  it('pri C in D razpona ne izračuna', () => {
    /* Raziskava tam izrecno pravi, da poštene mediane ni. Lažno natančna
       številka bi bila slabša od odkritega »tega še ne vemo«. */
    for (const id of ['dizajnsistem', 'seo', 'arhitektura', 'direkcija', 'produktni']) {
      const o = okvirZa(id)!;
      expect(imaRazpon(o)).toBe(false);
      expect(zapisRazpona(o)).toBeNull();
    }
  });

  it('neznane storitve ne izmisli', () => {
    expect(okvirZa('nekaj-cisto-desetega')).toBeNull();
    expect(okvirZa(null)).toBeNull();
  });

  it('število virov se ujema z dejanskimi viri', () => {
    /* Napačna številka tu pomeni, da napišemo »6 preverjenih virov«, ob kliku
       pa se jih pokaže pet — kar podre prav tisto, čemur ta funkcija služi. */
    for (const id of Object.keys(TRZNI_OKVIRI)) {
      const viri = viriZa(id);
      if (viri.length) expect(okvirZa(id)!.virov).toBe(viri.length);
    }
  });

  it('vsak vir z razponom ima vsaj eno povezavo na objavljen cenik', () => {
    for (const id of Object.keys(TRZNI_OKVIRI)) {
      const o = okvirZa(id)!;
      if (!imaRazpon(o)) continue;
      expect(viriZa(id).some((v: { url: string | null }) => v.url), `${id} nima nobene povezave`).toBe(true);
    }
  });

  it('razpon nikoli ne teče navzdol', () => {
    for (const id of Object.keys(TRZNI_OKVIRI)) {
      const o = okvirZa(id)!;
      if (imaRazpon(o)) expect(o.od).toBeLessThanOrEqual(o.do);
    }
  });

  it('mediana leži znotraj razpona', () => {
    for (const id of Object.keys(TRZNI_OKVIRI)) {
      const o = okvirZa(id)!;
      if (imaRazpon(o) && typeof o.mediana === 'number') {
        expect(o.mediana).toBeGreaterThanOrEqual(o.od);
        expect(o.mediana).toBeLessThanOrEqual(o.do);
      }
    }
  });

  it('zapis virov sklanja po slovensko', () => {
    const o = okvirZa('web')!;
    expect(zapisVirov({ ...o, virov: 1 })).toContain('1 preverjen vir ·');
    expect(zapisVirov({ ...o, virov: 2 })).toContain('2 preverjena vira');
    expect(zapisVirov({ ...o, virov: 3 })).toContain('3 preverjeni viri');
    expect(zapisVirov({ ...o, virov: 6 })).toContain('6 preverjenih virov');
    expect(zapisVirov(o)).toContain('posodobljeno 22. 8. 2026');
  });

  it('ko bo vir lastna baza, se besedilo spremeni samo od sebe', () => {
    const o = { ...okvirZa('web')!, vir: 'baza' as const, virov: 128 };
    expect(zapisVirov(o)).toContain('128 ponudb v Flowu');
  });

  it('stopnja zaupanja je izpeljana iz kakovosti dokazov', () => {
    expect(zaupanje(okvirZa('web')!)).toContain('visoka');
    expect(zaupanje(okvirZa('logo')!)).toContain('srednja');
    expect(zaupanje(okvirZa('seo')!)).toContain('nizka');
    expect(zaupanje(okvirZa('direkcija')!)).toContain('ni podatka');
  });
});

import { describe, expect, it } from 'vitest';
import {
  izberiAjpesNaslov,
  manjkajoAjpesPoverilnice,
  preveriAjpesZahtevo,
  soapActionIzOvojnice,
} from '@/app/api/podjetja/ajpes/logika';
import { PROFIPO_PRODUKCIJA, PROFIPO_TEST, zahtevaGetCompanyList } from '@/lib/ajpesProfipo';

describe('AJPES pot: izbira naslova', () => {
  it('privzeto in ob neznani vrednosti uporablja testni naslov', () => {
    expect(izberiAjpesNaslov(undefined)).toBe(PROFIPO_TEST);
    expect(izberiAjpesNaslov('true')).toBe(PROFIPO_TEST);
  });

  it('produkcijo uporabi samo ob izrecni vrednosti 1', () => {
    expect(izberiAjpesNaslov('1')).toBe(PROFIPO_PRODUKCIJA);
  });
});

describe('AJPES pot: plačljiva točka', () => {
  it('seznam ne potrebuje potrditve', () => {
    expect(preveriAjpesZahtevo({ metoda: 'seznam' })).toBeNull();
  });

  it('podatke brez izrecne potrditve zavrne', () => {
    expect(preveriAjpesZahtevo({ metoda: 'podatki', potrjenoPorabiTocko: false })).toContain('točko');
    expect(preveriAjpesZahtevo({ metoda: 'podatki', potrjenoPorabiTocko: 'true' })).toContain('točko');
  });

  it('potrjene in popolne podatke sprejme', () => {
    expect(preveriAjpesZahtevo({
      metoda: 'podatki', potrjenoPorabiTocko: true, maticna: '12345678',
      nabor: 'OS', leto: 2025, vrstaLp: 'LP',
    })).toBeNull();
  });
});

describe('AJPES pot: poverilnice in SOAPAction', () => {
  it('zazna obe vrsti manjkajočih poverilnic', () => {
    expect(manjkajoAjpesPoverilnice(undefined, 'geslo')).toBe(true);
    expect(manjkajoAjpesPoverilnice('uporabnik', '')).toBe(true);
    expect(manjkajoAjpesPoverilnice('uporabnik', 'geslo')).toBe(false);
  });

  it('SOAPAction izpelje iz imenskega prostora ovojnice', () => {
    const ovoj = zahtevaGetCompanyList({ uporabnik: 'u', geslo: 'g' });
    expect(soapActionIzOvojnice(ovoj, 'GetCompanyList'))
      .toBe('http://www.ajpes.si/wsProFipo/ProFipo/GetCompanyList');
  });
});

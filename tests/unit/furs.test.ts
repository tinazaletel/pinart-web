import { generateKeyPairSync, X509Certificate } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  fursCas,
  fursCasZaZoi,
  izberiFursOkolje,
  izracunajZoi,
  nizZaZoi,
  podpisiJws,
  sestaviZahtevoProstora,
  sestaviZahtevoRacuna,
  vsebinaKode,
  type FursRacun,
} from '@/lib/furs';

const cas = new Date(2026, 8, 1, 14, 5, 6);
const racun: FursRacun = {
  davcnaStevilka: '12345678',
  casIzdaje: cas,
  zaporednaStevilka: '15',
  poslovniProstor: 'STUDIO1',
  elektronskaNaprava: 'FLOW1',
  znesek: 123.4,
  davcnaStevilkaOperaterja: '12345678',
};

describe('FURS jedro', () => {
  it('oblikuje čas po FURS pravilih', () => {
    expect(fursCas(cas)).toBe('2026-09-01T14:05:06');
    expect(fursCasZaZoi(cas)).toBe('01.09.2026 14:05:06');
  });

  it('sestavi natančen vhod za ZOI', () => {
    expect(nizZaZoi(racun)).toBe('1234567801.09.2026 14:05:0615STUDIO1FLOW1123.40');
  });

  it('zavrne vodilno ničlo v FURS zaporedni številki', () => {
    expect(() => nizZaZoi({ ...racun, zaporednaStevilka: '0015' })).toThrow(/vodilnih ničel/);
  });

  it('izračuna stabilen 32-mestni ZOI', () => {
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const a = izracunajZoi(racun, privateKey);
    const b = izracunajZoi(racun, privateKey);
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(a).toBe(b);
  });

  it('sestavi 60-mestno vsebino kode s kontrolno številko', () => {
    const koda = vsebinaKode('48c7d8888809f95edae149fa14e17a43', '12345678', cas);
    expect(koda).toMatch(/^\d{60}$/);
    expect(Number(koda[59])).toBe([...koda.slice(0, 59)].reduce((v, z) => v + Number(z), 0) % 10);
  });

  it('sestavi uradno JSON strukturo računa', () => {
    const zahteva = sestaviZahtevoRacuna({
      ...racun,
      davki: [{ stopnja: 22, osnova: 101.15, davek: 22.25 }],
    }, '48c7d8888809f95edae149fa14e17a43', cas, '4e64a93a-40fa-4c02-afb1-488534b85e4c');
    expect(zahteva.InvoiceRequest.Invoice.InvoiceIdentifier).toEqual({
      BusinessPremiseID: 'STUDIO1', ElectronicDeviceID: 'FLOW1', InvoiceNumber: '15',
    });
    expect(zahteva.InvoiceRequest.Invoice.TaxesPerSeller).toEqual([{ VAT: [{ TaxRate: 22, TaxableAmount: 101.15, TaxAmount: 22.25 }] }]);
  });

  it('podpiše JWS z RS256', () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const token = podpisiJws({ test: true }, { subject_name: 'CN=Test', issuer_name: 'CN=Test CA', serial: '1' }, privateKey);
    expect(token.split('.')).toHaveLength(3);
    expect(() => new X509Certificate(publicKey.export({ type: 'spki', format: 'pem' }) as string)).toThrow();
  });

  it('serijsko številko certifikata v JWS ohrani kot točen JSON številski literal', () => {
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const token = podpisiJws({ test: true }, {
      subject_name: 'CN=Test', issuer_name: 'CN=Test CA', serial: '2575988469811686647',
    }, privateKey);
    const glava = Buffer.from(token.split('.')[0], 'base64url').toString('utf8');
    expect(glava).toContain('"serial":2575988469811686647');
    expect(glava).not.toContain('"serial":"');
  });

  it('produkcijo zahteva izrecno', () => {
    expect(izberiFursOkolje(undefined, false)).toBe('test');
    expect(() => izberiFursOkolje('produkcija', false)).toThrow(/ni izrecno omogočeno/);
    expect(izberiFursOkolje('produkcija', true)).toBe('produkcija');
  });

  it('sestavi prijavo nepremičnega poslovnega prostora', () => {
    const zahteva = sestaviZahtevoProstora({
      davcnaStevilka: '12345678', poslovniProstor: 'STUDIO1',
      vrsta: 'nepremicni',
      katastrskaObcina: 365, stevilkaStavbe: 12, stevilkaDelaStavbe: 3,
      ulica: 'Tržaška cesta', hisnaStevilka: '24', obcina: 'Ljubljana', kraj: 'Ljubljana',
      postnaStevilka: '1000', datumVeljavnosti: '2026-09-01', davcnaStevilkaProizvajalca: '87654321',
    }, cas, '4e64a93a-40fa-4c02-afb1-488534b85e4c');
    expect(zahteva.BusinessPremiseRequest.BusinessPremise.BPIdentifier.RealEstateBP?.PropertyID.BuildingNumber).toBe(12);
    expect(zahteva.BusinessPremiseRequest.Header.DateTime).toMatch(/Z$/);
  });

  it('za telefon ali Tap to Pay prijavi premični prostor C brez katastra', () => {
    const zahteva = sestaviZahtevoProstora({
      vrsta: 'premicni', tip: 'C', davcnaStevilka: '12345678', poslovniProstor: 'TELEFON1',
      datumVeljavnosti: '2026-09-01', davcnaStevilkaProizvajalca: '87654321',
    }, cas);
    expect(zahteva.BusinessPremiseRequest.BusinessPremise.BPIdentifier).toEqual({ PremiseType: 'C' });
  });
});

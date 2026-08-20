import { describe, expect, it } from 'vitest';
import { preberiZeton, preveriZig, sestaviZahtevo, tsaNaslov, TSA_PRIVZETI } from '@/lib/casovniZig';

/* Casovni zig (RFC 3161) — testi tecejo BREZ mreze.
   Pripravki so ustvarjeni lokalno z openssl (lastna testna TSA):
     openssl ts -query -data delo.txt -sha256 -cert -out req.tsq
     openssl ts -reply -queryfile req.tsq -config tsa.cnf -section tsa_config -out resp.tsr
   Tako preverimo oboje: da nasa zahteva ustreza bajt-za-bajt openssl-jevi in da
   znamo iz pravega odgovora TSA prebrati cas in zgostitev. */

/* SHA-256 datoteke, ki je bila zigosana v pripravku */
const ZGOSTITEV = 'c94e654002d9efd7ffb71199f8289da490d10f0206db2759e74e136bc77632c4';

/* openssl ts -query ... (nonce 0x5CC680D4F8A81EC0, certReq = true) */
const ZAHTEVA_OPENSSL_HEX =
  '30430201013031300d060960864801650304020105000420'
  + 'c94e654002d9efd7ffb71199f8289da490d10f0206db2759e74e136bc77632c4'
  + '02085cc680d4f8a81ec00101ff';

/* cel TimeStampResp lokalne testne TSA (status granted + podpisan zeton) */
const ODGOVOR_TSA = [
  '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',
  'xlbR/dYQzfRSSrs0ROPUyj3G2eNVHrzxCw==',].join('');

describe('sestaviZahtevo', () => {
  it('sestavi enak DER kot openssl ts -query', () => {
    const { zahteva, nonce } = sestaviZahtevo(ZGOSTITEV, Buffer.from('5cc680d4f8a81ec0', 'hex'));
    expect(zahteva.toString('hex')).toBe(ZAHTEVA_OPENSSL_HEX);
    expect(nonce).toBe('6685172349071269568');
  });

  it('zavrne vse, kar ni SHA-256 zgostitev', () => {
    expect(() => sestaviZahtevo('ni-zgostitev')).toThrow();
    expect(() => sestaviZahtevo(ZGOSTITEV.slice(0, 40))).toThrow();
  });
});

describe('preberiZeton', () => {
  it('prebere cas, zgostitev in serijsko stevilko iz odgovora TSA', () => {
    const podatki = preberiZeton(ODGOVOR_TSA);
    expect(podatki.zgostitev).toBe(ZGOSTITEV);
    expect(podatki.algoritem).toBe('2.16.840.1.101.3.4.2.1');
    expect(podatki.cas.toISOString()).toBe('2026-08-20T20:38:22.000Z');
    expect(podatki.serijska).toBe('2');
    expect(podatki.nonce).toBe('6685172349071269568');
  });

  it('zavrne prazen ali skvarjen zeton', () => {
    expect(() => preberiZeton('')).toThrow();
    expect(() => preberiZeton(Buffer.from('nekaj cisto drugega').toString('base64'))).toThrow();
  });
});

describe('preveriZig', () => {
  it('potrdi ujemanje z zgostitvijo zapisa', () => {
    const izid = preveriZig(ODGOVOR_TSA, ZGOSTITEV);
    expect(izid.ujema).toBe(true);
    if (izid.ujema) expect(izid.cas.toISOString()).toBe('2026-08-20T20:38:22.000Z');
  });

  it('javi neujemanje, ce zgostitev zapisa ni tista iz zetona', () => {
    const izid = preveriZig(ODGOVOR_TSA, 'a'.repeat(64));
    expect(izid.ujema).toBe(false);
    if (!izid.ujema) expect(izid.zgostitev).toBe(ZGOSTITEV);
  });
});

describe('tsaNaslov', () => {
  it('vzame TSA_URL, ce je https', () => {
    process.env.TSA_URL = 'https://tsa.primer.si/tsr';
    expect(tsaNaslov()).toBe('https://tsa.primer.si/tsr');
    delete process.env.TSA_URL;
  });

  it('pade na privzeti streznik pri praznem ali ne-https naslovu', () => {
    process.env.TSA_URL = 'http://tsa.primer.si/tsr';
    expect(tsaNaslov()).toBe(TSA_PRIVZETI);
    delete process.env.TSA_URL;
    expect(tsaNaslov()).toBe(TSA_PRIVZETI);
  });
});

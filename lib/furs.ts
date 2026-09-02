import {
  createHash,
  createSign,
  createVerify,
  randomUUID,
  X509Certificate,
  type KeyLike,
} from 'node:crypto';

export type FursOkolje = 'test' | 'produkcija';
export type FursNacinPlacila = 'gotovina' | 'kartica' | 'drugo_gotovinsko';

export type FursDavcnaPostavka = {
  stopnja: number;
  osnova: number;
  davek: number;
};

export type FursRacun = {
  davcnaStevilka: string;
  casIzdaje: Date;
  zaporednaStevilka: string;
  poslovniProstor: string;
  elektronskaNaprava: string;
  znesek: number;
  znesekPlacila?: number;
  davki?: FursDavcnaPostavka[];
  davcnaStevilkaOperaterja?: string;
  tujaDavcnaStevilkaOperaterja?: string;
  naknadnaPrijava?: boolean;
  stevilcenje?: 'B' | 'C';
};

export type FursGlavaPotrdila = {
  subject_name: string;
  issuer_name: string;
  serial: number | string;
};

type FursProstorOsnova = {
  davcnaStevilka: string;
  poslovniProstor: string;
  datumVeljavnosti: string;
  davcnaStevilkaProizvajalca: string;
  opomba?: string;
};

export type FursNepremicniProstor = FursProstorOsnova & {
  vrsta: 'nepremicni';
  katastrskaObcina: number;
  stevilkaStavbe: number;
  stevilkaDelaStavbe: number;
  ulica: string;
  hisnaStevilka: string;
  dodatekHisneStevilke?: string;
  obcina: string;
  kraj: string;
  postnaStevilka: string;
};

export type FursPremicniProstor = FursProstorOsnova & {
  vrsta: 'premicni';
  tip: 'A' | 'B' | 'C';
};

export type FursPoslovniProstor = FursNepremicniProstor | FursPremicniProstor;

export const FURS_NASLOVI = {
  test: 'https://blagajne-test.fu.gov.si:9002/v1/cash_registers/invoices',
  produkcija: 'https://blagajne.fu.gov.si:9003/v1/cash_registers/invoices',
} as const;

export const FURS_NASLOVI_PROSTORI = {
  test: 'https://blagajne-test.fu.gov.si:9002/v1/cash_registers/invoices/register',
  produkcija: 'https://blagajne.fu.gov.si:9003/v1/cash_registers/invoices/register',
} as const;

const OZNAKA = /^[0-9A-Za-z]{1,20}$/;
const DAVCNA = /^\d{8}$/;
const ZAPOREDNA = /^[1-9]\d*$/;
const ZOI = /^[0-9a-f]{32}$/i;

function deliLjubljana(cas: Date): Record<string, string> {
  if (Number.isNaN(cas.getTime())) throw new Error('Čas izdaje računa ni veljaven.');
  return Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Ljubljana', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(cas).map((del) => [del.type, del.value]));
}

function koncniZnesek(n: number): number {
  if (!Number.isFinite(n)) throw new Error('Znesek računa ni veljaven.');
  return Math.round(n * 100) / 100;
}

/** Lokalni čas računa; FURS sporočilo ne uporablja oznake časovnega pasu. */
export function fursCas(cas: Date): string {
  const d = deliLjubljana(cas);
  return `${d.year}-${d.month}-${d.day}T${d.hour}:${d.minute}:${d.second}`;
}

/** Oblika je izrecno predpisana za vhod v izračun ZOI. */
export function fursCasZaZoi(cas: Date): string {
  const d = deliLjubljana(cas);
  return `${d.day}.${d.month}.${d.year} ${d.hour}:${d.minute}:${d.second}`;
}

export function preveriFursRacun(racun: FursRacun): void {
  if (!DAVCNA.test(racun.davcnaStevilka)) throw new Error('Davčna številka izdajatelja mora imeti 8 številk.');
  if (!ZAPOREDNA.test(racun.zaporednaStevilka)) throw new Error('FURS zaporedna številka mora biti pozitivno celo število brez vodilnih ničel.');
  if (!OZNAKA.test(racun.poslovniProstor)) throw new Error('Oznaka poslovnega prostora sme vsebovati 1–20 črk ali številk.');
  if (!OZNAKA.test(racun.elektronskaNaprava)) throw new Error('Oznaka elektronske naprave sme vsebovati 1–20 črk ali številk.');
  if (racun.davcnaStevilkaOperaterja && !DAVCNA.test(racun.davcnaStevilkaOperaterja)) {
    throw new Error('Davčna številka operaterja mora imeti 8 številk.');
  }
  koncniZnesek(racun.znesek);
  fursCas(racun.casIzdaje);
}

export function nizZaZoi(racun: FursRacun): string {
  preveriFursRacun(racun);
  return [
    racun.davcnaStevilka,
    fursCasZaZoi(racun.casIzdaje),
    racun.zaporednaStevilka,
    racun.poslovniProstor,
    racun.elektronskaNaprava,
    koncniZnesek(racun.znesek).toFixed(2),
  ].join('');
}

export function izracunajZoi(racun: FursRacun, zasebniKljuc: string | KeyLike, geslo?: string): string {
  const podpis = createSign('RSA-SHA256');
  podpis.update(nizZaZoi(racun), 'utf8');
  podpis.end();
  const podpisaniBajti = podpis.sign(typeof zasebniKljuc === 'string'
    ? { key: zasebniKljuc, passphrase: geslo }
    : zasebniKljuc);
  return createHash('md5').update(podpisaniBajti).digest('hex');
}

/** 60-mestna vsebina QR/PDF417/Code128, ne sama slika kode. */
export function vsebinaKode(zoi: string, davcnaStevilka: string, casIzdaje: Date): string {
  if (!ZOI.test(zoi)) throw new Error('ZOI mora biti 32-mestni šestnajstiški zapis.');
  if (!DAVCNA.test(davcnaStevilka)) throw new Error('Davčna številka mora imeti 8 številk.');
  const decimalniZoi = BigInt(`0x${zoi}`).toString(10).padStart(39, '0');
  const d = deliLjubljana(casIzdaje);
  const cas = `${d.year.slice(-2)}${d.month}${d.day}${d.hour}${d.minute}${d.second}`;
  const brezKontrole = decimalniZoi + davcnaStevilka + cas;
  const kontrola = [...brezKontrole].reduce((vsota, znak) => vsota + Number(znak), 0) % 10;
  return brezKontrole + kontrola;
}

export function sestaviZahtevoRacuna(racun: FursRacun, zoi: string, zdaj = new Date(), messageId = randomUUID()) {
  preveriFursRacun(racun);
  if (!ZOI.test(zoi)) throw new Error('ZOI ni veljaven.');
  const davki = (racun.davki || []).map((d) => ({
    TaxRate: koncniZnesek(d.stopnja),
    TaxableAmount: koncniZnesek(d.osnova),
    TaxAmount: koncniZnesek(d.davek),
  }));
  return {
    InvoiceRequest: {
      Header: { MessageID: messageId, DateTime: fursCas(zdaj) },
      Invoice: {
        TaxNumber: Number(racun.davcnaStevilka),
        IssueDateTime: fursCas(racun.casIzdaje),
        NumberingStructure: racun.stevilcenje || 'B',
        InvoiceIdentifier: {
          BusinessPremiseID: racun.poslovniProstor,
          ElectronicDeviceID: racun.elektronskaNaprava,
          InvoiceNumber: racun.zaporednaStevilka,
        },
        InvoiceAmount: koncniZnesek(racun.znesek),
        PaymentAmount: koncniZnesek(racun.znesekPlacila ?? racun.znesek),
        ...(davki.length ? { TaxesPerSeller: [{ VAT: davki }] } : {}),
        ...(racun.davcnaStevilkaOperaterja
          ? { OperatorTaxNumber: Number(racun.davcnaStevilkaOperaterja) }
          : racun.tujaDavcnaStevilkaOperaterja
            ? { ForeignOperatorTaxNumber: racun.tujaDavcnaStevilkaOperaterja }
            : {}),
        ProtectedID: zoi,
        ...(racun.naknadnaPrijava ? { SubsequentSubmit: true } : {}),
      },
    },
  };
}

export function sestaviZahtevoProstora(prostor: FursPoslovniProstor, zdaj = new Date(), messageId = randomUUID()) {
  if (!DAVCNA.test(prostor.davcnaStevilka) || !DAVCNA.test(prostor.davcnaStevilkaProizvajalca)) throw new Error('Davčna številka ni veljavna.');
  if (!OZNAKA.test(prostor.poslovniProstor)) throw new Error('Oznaka poslovnega prostora ni veljavna.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(prostor.datumVeljavnosti)) throw new Error('Datum veljavnosti ni veljaven.');
  if (prostor.vrsta === 'nepremicni') {
    if (![prostor.katastrskaObcina, prostor.stevilkaStavbe, prostor.stevilkaDelaStavbe].every(Number.isInteger)) throw new Error('Podatki o nepremičnini niso veljavni.');
    if (!/^\d{4}$/.test(prostor.postnaStevilka)) throw new Error('Poštna številka ni veljavna.');
    if (![prostor.ulica, prostor.hisnaStevilka, prostor.obcina, prostor.kraj].every((v) => v.trim())) throw new Error('Naslov poslovnega prostora ni popoln.');
  } else if (!['A', 'B', 'C'].includes(prostor.tip)) {
    throw new Error('Vrsta premičnega poslovnega prostora ni veljavna.');
  }
  const identifikator = prostor.vrsta === 'premicni'
    ? { PremiseType: prostor.tip }
    : {
        RealEstateBP: {
          PropertyID: {
            CadastralNumber: prostor.katastrskaObcina,
            BuildingNumber: prostor.stevilkaStavbe,
            BuildingSectionNumber: prostor.stevilkaDelaStavbe,
          },
          Address: {
            Street: prostor.ulica.trim(), HouseNumber: prostor.hisnaStevilka.trim(),
            ...(prostor.dodatekHisneStevilke?.trim() ? { HouseNumberAdditional: prostor.dodatekHisneStevilke.trim() } : {}),
            Community: prostor.obcina.trim(), City: prostor.kraj.trim(), PostalCode: prostor.postnaStevilka,
          },
        },
      };
  return {
    BusinessPremiseRequest: {
      Header: { MessageID: messageId, DateTime: zdaj.toISOString().replace(/\.\d{3}Z$/, 'Z') },
      BusinessPremise: {
        TaxNumber: Number(prostor.davcnaStevilka),
        BusinessPremiseID: prostor.poslovniProstor,
        BPIdentifier: identifikator,
        ValidityDate: prostor.datumVeljavnosti,
        SoftwareSupplier: [{ TaxNumber: Number(prostor.davcnaStevilkaProizvajalca) }],
        ...(prostor.opomba?.trim() ? { SpecialNotes: prostor.opomba.trim() } : {}),
      },
    },
  };
}

function base64url(vrednost: string | Buffer): string {
  return Buffer.from(vrednost).toString('base64url');
}

export function podatkiPotrdila(certifikatPem: string): FursGlavaPotrdila {
  const certifikat = new X509Certificate(certifikatPem);
  const serialHex = certifikat.serialNumber.replace(/:/g, '');
  return {
    subject_name: certifikat.subject.replace(/\n/g, ','),
    issuer_name: certifikat.issuer.replace(/\n/g, ','),
    serial: BigInt(`0x${serialHex}`).toString(10),
  };
}

export function podpisiJws(
  vsebina: unknown,
  glava: FursGlavaPotrdila,
  zasebniKljuc: string | KeyLike,
  geslo?: string,
): string {
  const serial = String(glava.serial);
  if (!/^\d+$/.test(serial)) throw new Error('Serijska številka certifikata ni veljavna.');
  /* Serijske številke certifikatov presegajo varno območje JavaScripta. FURS
     zahteva JSON število, zato ga zapišemo kot točen decimalni literal. */
  const glavaJson = `{"alg":"RS256","subject_name":${JSON.stringify(glava.subject_name)},"issuer_name":${JSON.stringify(glava.issuer_name)},"serial":${serial}}`;
  const kodiranaGlava = base64url(glavaJson);
  const kodiranaVsebina = base64url(JSON.stringify(vsebina));
  const vhod = `${kodiranaGlava}.${kodiranaVsebina}`;
  const podpis = createSign('RSA-SHA256');
  podpis.update(vhod, 'utf8');
  podpis.end();
  const podpisaniBajti = podpis.sign(typeof zasebniKljuc === 'string'
    ? { key: zasebniKljuc, passphrase: geslo }
    : zasebniKljuc);
  return `${vhod}.${podpisaniBajti.toString('base64url')}`;
}

export function razcleniInPreveriJws(token: string): { glava: Record<string, unknown>; vsebina: Record<string, unknown> } {
  const deli = token.split('.');
  if (deli.length !== 3) throw new Error('Odgovor FURS nima veljavne oblike JWS.');
  const glava = JSON.parse(Buffer.from(deli[0], 'base64url').toString('utf8')) as Record<string, unknown>;
  const x5c = Array.isArray(glava.x5c) ? glava.x5c[0] : undefined;
  if (typeof x5c !== 'string' || !x5c) throw new Error('Odgovor FURS nima podpisnega certifikata.');
  const certifikat = new X509Certificate(`-----BEGIN CERTIFICATE-----\n${x5c.match(/.{1,64}/g)?.join('\n')}\n-----END CERTIFICATE-----`);
  const preverjanje = createVerify('RSA-SHA256');
  preverjanje.update(`${deli[0]}.${deli[1]}`, 'utf8');
  preverjanje.end();
  if (!preverjanje.verify(certifikat.publicKey, Buffer.from(deli[2], 'base64url'))) {
    throw new Error('Podpis odgovora FURS ni veljaven.');
  }
  const vsebina = JSON.parse(Buffer.from(deli[1], 'base64url').toString('utf8')) as Record<string, unknown>;
  return { glava, vsebina };
}

export function izberiFursOkolje(vrednost: string | undefined, dovoljenaProdukcija: boolean): FursOkolje {
  if (vrednost === 'produkcija') {
    if (!dovoljenaProdukcija) throw new Error('Produkcijsko FURS okolje ni izrecno omogočeno.');
    return 'produkcija';
  }
  return 'test';
}

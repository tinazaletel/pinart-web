/* OVERJEN CASOVNI ZIG (RFC 3161) — dokaz, KDAJ je zgostitev obstajala.
   ─────────────────────────────────────────────────────────────────────────────
   Sef avtorstva zna izracunati zgostitev (SHA-256) datoteke, a datum ob zapisu
   postavimo MI. Tak datum je pravno sibek: kdor nam ne verjame, upraviceno
   ugovarja, da smo si ga izmislili. RFC 3161 to resi tako, da zgostitev poslje
   NEODVISNEMU strezniku (TSA), ta pa vrne casovni zeton, podpisan s svojim
   certifikatom. Zeton lahko preveri KDORKOLI, tudi brez Flowa (openssl).

   KAJ GRE NAVZVEN: samo 32 bajtov zgostitve. Nikoli datoteka, ime datoteke,
   ime stranke, opis dela ali karkoli drugega. To ni le varnostna omejitev,
   ampak bistvo funkcije — TSA ne izve, KAJ si zigosal, potrdi le, da je nekdo
   ob tem casu ze poznal to zgostitev.

   ZAKAJ BREZ KNJIZNICE: TimeStampReq je zelo majhna ASN.1/DER struktura
   (verzija + zgostitev + nonce), branje odgovora pa je sprehod po nekaj
   ugnezdenih SEQUENCE-ih do TSTInfo. pkijs/node-forge bi za to prinesla veliko
   odvisnost, ki bi jo morali vzdrzevati. Kriptografskega podpisa tu NE
   preverjamo (za to je openssl in veriga certifikatov TSA) — glej
   docs/SEF-casovni-zig.md.

   Modul je namenjen strezniku (uporablja node:crypto in Buffer). */

import { randomBytes } from 'node:crypto';

/* Privzeti brezplacni streznik. FreeTSA je javna, brezplacna TSA z RFC 3161
   koncno tocko /tsr in objavljenim certifikatom (potreben za preverjanje).
   Zamenljiv prek TSA_URL — npr. ce podjetje kupi kvalificirano (eIDAS) TSA. */
export const TSA_PRIVZETI = 'https://freetsa.org/tsr';

export function tsaNaslov(): string {
  const iz = (process.env.TSA_URL || '').trim();
  if (!iz) return TSA_PRIVZETI;
  /* Samo https — zig, ki bi ga lahko kdo po poti zamenjal, ni dokaz. */
  if (!/^https:\/\//i.test(iz)) return TSA_PRIVZETI;
  return iz;
}

/* ── DER: zapisovanje ──────────────────────────────────────────────────────── */

const SEQUENCE = 0x30;
const INTEGER = 0x02;
const OCTET_STRING = 0x04;
const NULL_TAG = 0x05;
const OID_TAG = 0x06;
const BOOLEAN = 0x01;

function derDolzina(n: number): Buffer {
  if (n < 0x80) return Buffer.from([n]);
  const bajti: number[] = [];
  let ostanek = n;
  while (ostanek > 0) { bajti.unshift(ostanek & 0xff); ostanek >>= 8; }
  return Buffer.from([0x80 | bajti.length, ...bajti]);
}

function der(tag: number, vsebina: Buffer): Buffer {
  return Buffer.concat([Buffer.from([tag]), derDolzina(vsebina.length), vsebina]);
}

/* Pozitiven INTEGER: vodilni bit ne sme biti 1, sicer bi bilo stevilo negativno. */
function pozitivnoTelo(vrednost: Buffer | number): Buffer {
  let telo = typeof vrednost === 'number' ? Buffer.from([vrednost]) : Buffer.from(vrednost);
  while (telo.length > 1 && telo[0] === 0x00 && (telo[1] & 0x80) === 0) telo = telo.subarray(1);
  if (telo[0] & 0x80) telo = Buffer.concat([Buffer.from([0x00]), telo]);
  return telo;
}

function derInteger(vrednost: Buffer | number): Buffer {
  return der(INTEGER, pozitivnoTelo(vrednost));
}

/* AlgorithmIdentifier za SHA-256: OID 2.16.840.1.101.3.4.2.1 + NULL parametri. */
const OID_SHA256 = '2.16.840.1.101.3.4.2.1';
const OID_SHA256_DER = Buffer.from([0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x02, 0x01]);
const OID_SIGNED_DATA = '1.2.840.113549.1.7.2';
const OID_TST_INFO = '1.2.840.113549.1.9.16.1.4';

/* Sestavi TimeStampReq (DER) za dano SHA-256 zgostitev v hex zapisu.
   TimeStampReq ::= SEQUENCE {
     version INTEGER { v1(1) },
     messageImprint MessageImprint,
     reqPolicy TSAPolicyId OPTIONAL,
     nonce INTEGER OPTIONAL,
     certReq BOOLEAN DEFAULT FALSE,
     extensions [0] IMPLICIT Extensions OPTIONAL } */
export function sestaviZahtevo(zgostitevHex: string, nonce?: Buffer): { zahteva: Buffer; nonce: string } {
  const surova = zgostitevIzHex(zgostitevHex);
  const nonceTelo = pozitivnoTelo(nonce ?? randomBytes(8));
  const messageImprint = der(SEQUENCE, Buffer.concat([
    der(SEQUENCE, Buffer.concat([der(OID_TAG, OID_SHA256_DER), der(NULL_TAG, Buffer.alloc(0))])),
    der(OCTET_STRING, surova),
  ]));
  const zahteva = der(SEQUENCE, Buffer.concat([
    derInteger(1),
    messageImprint,
    der(INTEGER, nonceTelo),
    /* certReq = true: TSA naj v zeton vlozi svoj certifikat, da je zeton
       preverljiv sam zase (openssl ts -verify brez iskanja certifikata). */
    der(BOOLEAN, Buffer.from([0xff])),
  ]));
  return { zahteva, nonce: steviloIzInteger(nonceTelo) };
}

function zgostitevIzHex(hex: string): Buffer {
  const ocisceno = (hex || '').trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(ocisceno)) throw new Error('Zgostitev ni veljavna SHA-256 (64 hex znakov).');
  return Buffer.from(ocisceno, 'hex');
}

/* ── DER: branje ───────────────────────────────────────────────────────────── */

type Element = { tag: number; vsebina: Buffer };

function beriElement(buf: Buffer, odmik: number): { el: Element; naslednji: number } {
  if (odmik + 2 > buf.length) throw new Error('Okrnjen DER zapis.');
  const tag = buf[odmik];
  let p = odmik + 1;
  let dolzina = buf[p++];
  if (dolzina & 0x80) {
    const stBajtov = dolzina & 0x7f;
    if (stBajtov === 0 || stBajtov > 4) throw new Error('Nepodprta DER dolzina.');
    dolzina = 0;
    for (let i = 0; i < stBajtov; i++) dolzina = (dolzina << 8) | buf[p++];
  }
  if (p + dolzina > buf.length) throw new Error('Okrnjen DER zapis.');
  return { el: { tag, vsebina: buf.subarray(p, p + dolzina) }, naslednji: p + dolzina };
}

function otroci(vsebina: Buffer): Element[] {
  const seznam: Element[] = [];
  let odmik = 0;
  while (odmik < vsebina.length) {
    const { el, naslednji } = beriElement(vsebina, odmik);
    seznam.push(el);
    odmik = naslednji;
  }
  return seznam;
}

function oidVBesedilo(vsebina: Buffer): string {
  if (!vsebina.length) return '';
  const deli = [Math.floor(vsebina[0] / 40), vsebina[0] % 40];
  let trenutni = 0;
  for (let i = 1; i < vsebina.length; i++) {
    trenutni = trenutni * 128 + (vsebina[i] & 0x7f);
    if (!(vsebina[i] & 0x80)) { deli.push(trenutni); trenutni = 0; }
  }
  return deli.join('.');
}

function steviloIzInteger(vsebina: Buffer): string {
  let hex = vsebina.toString('hex').replace(/^(00)+/, '');
  if (!hex) hex = '0';
  return BigInt(`0x${hex}`).toString();
}

/* GeneralizedTime: YYYYMMDDHHMMSS[.fff]Z — TSA vedno v UTC. */
function beriGeneralizedTime(vsebina: Buffer): Date {
  const s = vsebina.toString('latin1').trim();
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\.\d+)?Z$/.exec(s);
  if (!m) throw new Error('Cas ziga ni v pricakovani obliki.');
  const milisekunde = m[7] ? Math.round(Number(m[7]) * 1000) : 0;
  const cas = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6]), milisekunde);
  if (Number.isNaN(cas)) throw new Error('Cas ziga ni veljaven datum.');
  return new Date(cas);
}

/* ── Branje odgovora ───────────────────────────────────────────────────────── */

export type ZigPodatki = {
  cas: Date;
  /* zgostitev, ki jo je TSA zigosala (mora biti ista, kot smo jo poslali) */
  zgostitev: string;
  algoritem: string;
  serijska: string;
  politika: string;
  nonce?: string;
};

/* Iz TimeStampResp (ali golega zetona) izlusci TSTInfo.
   TimeStampResp ::= SEQUENCE { status PKIStatusInfo, timeStampToken ContentInfo OPT }
   ContentInfo   ::= SEQUENCE { contentType OID, [0] EXPLICIT SignedData }
   SignedData    ::= SEQUENCE { version, digestAlgorithms SET, encapContentInfo, ... }
   encapContentInfo ::= SEQUENCE { eContentType OID, [0] EXPLICIT OCTET STRING } */
function najdiTstInfo(odgovor: Buffer): Buffer {
  const { el: zunanji } = beriElement(odgovor, 0);
  if (zunanji.tag !== SEQUENCE) throw new Error('Odgovor TSA ni SEQUENCE.');
  const vrh = otroci(zunanji.vsebina);
  if (!vrh.length) throw new Error('Odgovor TSA je prazen.');

  let contentInfo: Element;
  if (vrh[0].tag === OID_TAG) {
    /* gol zeton (ContentInfo) */
    contentInfo = zunanji;
  } else {
    /* cel TimeStampResp: najprej preveri status */
    const status = otroci(vrh[0].vsebina)[0];
    if (!status || status.tag !== INTEGER) throw new Error('Manjka status odgovora TSA.');
    const koda = Number(steviloIzInteger(status.vsebina));
    /* 0 = granted, 1 = grantedWithMods; vse ostalo je zavrnitev. */
    if (koda !== 0 && koda !== 1) throw new Error(`TSA je zahtevo zavrnila (status ${koda}).`);
    if (vrh.length < 2) throw new Error('TSA ni vrnila zetona.');
    contentInfo = vrh[1];
  }

  const ci = otroci(contentInfo.vsebina);
  if (ci.length < 2 || ci[0].tag !== OID_TAG) throw new Error('Zeton ni ContentInfo.');
  if (oidVBesedilo(ci[0].vsebina) !== OID_SIGNED_DATA) throw new Error('Zeton ni CMS SignedData.');
  const signedData = otroci(ci[1].vsebina)[0];
  if (!signedData || signedData.tag !== SEQUENCE) throw new Error('SignedData manjka.');

  const sd = otroci(signedData.vsebina);
  /* version, digestAlgorithms, encapContentInfo, ... */
  const encap = sd[2];
  if (!encap || encap.tag !== SEQUENCE) throw new Error('encapContentInfo manjka.');
  const en = otroci(encap.vsebina);
  if (!en.length || en[0].tag !== OID_TAG || oidVBesedilo(en[0].vsebina) !== OID_TST_INFO) {
    throw new Error('Vsebina zetona ni TSTInfo.');
  }
  const ovoj = en[1];
  if (!ovoj) throw new Error('TSTInfo manjka.');
  const oktet = otroci(ovoj.vsebina)[0];
  if (!oktet || oktet.tag !== OCTET_STRING) throw new Error('TSTInfo ni OCTET STRING.');
  return oktet.vsebina;
}

/* TSTInfo ::= SEQUENCE { version, policy OID, messageImprint, serialNumber,
     genTime GeneralizedTime, accuracy OPT, ordering DEFAULT FALSE, nonce OPT,
     tsa [0] OPT, extensions [1] OPT } */
export function preberiZeton(zetonBase64: string): ZigPodatki {
  const odgovor = Buffer.from(zetonBase64, 'base64');
  if (!odgovor.length) throw new Error('Zeton je prazen.');
  const tstInfo = najdiTstInfo(odgovor);
  const { el } = beriElement(tstInfo, 0);
  if (el.tag !== SEQUENCE) throw new Error('TSTInfo ni SEQUENCE.');
  const polja = otroci(el.vsebina);
  if (polja.length < 5) throw new Error('TSTInfo je nepopoln.');

  const politika = polja[1].tag === OID_TAG ? oidVBesedilo(polja[1].vsebina) : '';
  const imprint = otroci(polja[2].vsebina);
  const algOtroci = otroci(imprint[0].vsebina);
  const algoritem = algOtroci[0] ? oidVBesedilo(algOtroci[0].vsebina) : '';
  const zgostitev = imprint[1] ? imprint[1].vsebina.toString('hex') : '';
  const serijska = steviloIzInteger(polja[3].vsebina);
  const cas = beriGeneralizedTime(polja[4].vsebina);

  /* nonce je edini INTEGER med neobveznimi polji za genTime */
  let nonce: string | undefined;
  for (let i = 5; i < polja.length; i++) {
    if (polja[i].tag === INTEGER) { nonce = steviloIzInteger(polja[i].vsebina); break; }
  }

  return { cas, zgostitev, algoritem, serijska, politika, nonce };
}

export type Preverjeno =
  | { ujema: true; cas: Date; zgostitev: string; serijska: string; politika: string }
  | { ujema: false; napaka: string; cas?: Date; zgostitev?: string };

/* PREVERJANJE: iz shranjenega zetona preberi cas in zgostitev ter ju primerjaj
   s pricakovano zgostitvijo. To dokaze, da se zeton nanasa na TO delo — ne le,
   da nek zeton obstaja. Kriptografski podpis TSA preveri openssl (glej docs). */
export function preveriZig(zetonBase64: string, pricakovanaZgostitev: string): Preverjeno {
  let podatki: ZigPodatki;
  try {
    podatki = preberiZeton(zetonBase64);
  } catch (e) {
    return { ujema: false, napaka: e instanceof Error ? e.message : 'Zetona ni bilo mogoce prebrati.' };
  }
  const pricakovana = (pricakovanaZgostitev || '').trim().toLowerCase();
  if (podatki.algoritem !== OID_SHA256) {
    return { ujema: false, napaka: 'Zeton ni SHA-256.', cas: podatki.cas, zgostitev: podatki.zgostitev };
  }
  if (!pricakovana || podatki.zgostitev !== pricakovana) {
    return { ujema: false, napaka: 'Zgostitev v zetonu se ne ujema z zapisom.', cas: podatki.cas, zgostitev: podatki.zgostitev };
  }
  return { ujema: true, cas: podatki.cas, zgostitev: podatki.zgostitev, serijska: podatki.serijska, politika: podatki.politika };
}

/* ── Pridobitev ziga ───────────────────────────────────────────────────────── */

export type PridobljenZig = {
  zetonBase64: string;
  cas: Date;
  streznik: string;
  serijska: string;
};

/* Poslje SAMO 32 bajtov zgostitve na TSA in vrne podpisan zeton.
   Klicatelj mora paziti, da v zgostitevHex ne pride nic drugega kot SHA-256. */
export async function pridobiZig(zgostitevHex: string, naslov = tsaNaslov(), casovnaOmejitevMs = 15_000): Promise<PridobljenZig> {
  const { zahteva, nonce } = sestaviZahtevo(zgostitevHex);

  const prekini = new AbortController();
  const ura = setTimeout(() => prekini.abort(), casovnaOmejitevMs);
  let odgovor: Response;
  try {
    odgovor = await fetch(naslov, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/timestamp-query',
        Accept: 'application/timestamp-reply',
      },
      body: new Uint8Array(zahteva),
      signal: prekini.signal,
      cache: 'no-store',
    });
  } catch (e) {
    throw new Error(
      (e as { name?: string })?.name === 'AbortError'
        ? 'Streznik za casovni zig se ni odzval pravocasno.'
        : 'Streznika za casovni zig ni bilo mogoce doseci.',
    );
  } finally {
    clearTimeout(ura);
  }

  if (!odgovor.ok) throw new Error(`Streznik za casovni zig je vrnil napako (${odgovor.status}).`);
  const surovo = Buffer.from(await odgovor.arrayBuffer());
  if (!surovo.length) throw new Error('Streznik za casovni zig je vrnil prazen odgovor.');
  if (surovo.length > 200_000) throw new Error('Odgovor streznika za casovni zig je nepricakovano velik.');

  /* Shranimo CEL TimeStampResp — tak zapis prebere `openssl ts -verify -in`. */
  const zetonBase64 = surovo.toString('base64');
  const podatki = preberiZeton(zetonBase64);

  if (podatki.zgostitev !== zgostitevHex.trim().toLowerCase()) {
    throw new Error('TSA je zigosala drugo zgostitev — zig zavrnjen.');
  }
  /* Nonce zascititi pred podtaknjenim starim zetonom: ce ga TSA vrne, se mora
     ujemati s tistim, ki smo ga poslali. FreeTSA ga vraca. */
  if (podatki.nonce && podatki.nonce !== nonce) {
    throw new Error('Nonce se ne ujema — zig zavrnjen.');
  }

  return { zetonBase64, cas: podatki.cas, streznik: naslov, serijska: podatki.serijska };
}

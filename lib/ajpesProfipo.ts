/**
 * AJPES proFi=Po (wsProFipo) — sestava zahtevkov in razčlenjevanje odgovorov.
 *
 * Servis je SOAP/XML in star: poverilnici potujeta kot parametra v telesu
 * zahtevka, zato ta datoteka NIKOLI ne sme priti v brskalnik — uporablja se
 * izključno v strežniških poteh.
 *
 * Zakaj ločena, čista datoteka: klic v omrežje se ne da testirati brez porabe
 * točk (ena točka = eno podjetje), razčlenjevanje pa se mora dati preveriti
 * brez klica. Zato so tu SAMO čiste funkcije nad nizi; omrežje živi drugje.
 *
 * Poraba točk (potrjeno pisno, 27. 8. 2026): točka se odšteje ob PRVEM
 * vpogledu za kombinacijo matična + vrsta poročila + leto + shema. GetCompanyList
 * in GetCompanyModifiedList sta seznama že plačanega in točk ne porabita —
 * zato je GetCompanyList pravi klic za preizkus povezave.
 */

import { XMLParser } from 'fast-xml-parser';

export const PROFIPO_TEST = 'https://wwwt.ajpes.si/wsProFipo/wsProFipo.asmx';
export const PROFIPO_PRODUKCIJA = 'https://www.ajpes.si/wsProFipo/wsProFipo.asmx';
const IMENSKI_PROSTOR = 'http://www.ajpes.si/wsProFipo/ProFipo/';

/** OS = ožja shema (Mini), SS = širša (Mega). Kupljena je OS. */
export type ProfipoNabor = 'OS' | 'SS';
/** JOLP = javna objava, LP = letno poročilo, RLP/KLP/LPN = revidirano, konsolidirano, nerevidirano. */
export type ProfipoVrstaLp = 'JOLP' | 'LP' | 'RLP' | 'KLP' | 'LPN';

const esc = (v: string) =>
  String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const ovoj = (metoda: string, telo: string) =>
  `<?xml version="1.0" encoding="utf-8"?>`
  + `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"`
  + ` xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">`
  + `<soap:Body><${metoda} xmlns="${IMENSKI_PROSTOR}">${telo}</${metoda}></soap:Body></soap:Envelope>`;

export type Poverilnice = { uporabnik: string; geslo: string };

/** Podatki o enem poslovnem subjektu. PORABI TOČKO ob prvem klicu za kombinacijo. */
export function zahtevaGetData(p: Poverilnice & {
  maticna: string; nabor: ProfipoNabor; leto: string | number; vrstaLp: ProfipoVrstaLp;
}): string {
  return ovoj('GetData',
    `<uporabnik>${esc(p.uporabnik)}</uporabnik><geslo>${esc(p.geslo)}</geslo>`
    + `<maticna>${esc(p.maticna)}</maticna><nabor>${esc(p.nabor)}</nabor>`
    + `<leto>${esc(String(p.leto))}</leto><vrstaLp>${esc(p.vrstaLp)}</vrstaLp>`);
}

/** Seznam vsega, kar je uporabnik ŽE plačal. Brez porabe točk. */
export function zahtevaGetCompanyList(p: Poverilnice): string {
  return ovoj('GetCompanyList', `<uporabnik>${esc(p.uporabnik)}</uporabnik><geslo>${esc(p.geslo)}</geslo>`);
}

/** Katere že prevzete matične so se v obdobju spremenile. Brez porabe točk. */
export function zahtevaGetCompanyModifiedList(p: Poverilnice & { datumOd: string; datumDo: string }): string {
  return ovoj('GetCompanyModifiedList',
    `<uporabnik>${esc(p.uporabnik)}</uporabnik><geslo>${esc(p.geslo)}</geslo>`
    + `<datumOd>${esc(p.datumOd)}</datumOd><datumDo>${esc(p.datumDo)}</datumDo>`);
}

/** Katera letna poročila obstajajo za matično številko. */
export function zahtevaGetAnnualReportType(p: Poverilnice & { maticna: string }): string {
  return ovoj('GetAnnualReportType',
    `<uporabnik>${esc(p.uporabnik)}</uporabnik><geslo>${esc(p.geslo)}</geslo><maticna>${esc(p.maticna)}</maticna>`);
}

/* ── razčlenjevanje ─────────────────────────────────────────────────────── */

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  removeNSPrefix: true,
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: true,
});

export type ProfipoNapaka = { id: string; opis: string };

export type ProfipoRacun = {
  stevilka: string;
  banka?: string;
  odprt?: string;
  zaprt?: string;
  /* Evidenca neporavnanih obveznosti iz RTR — po domace BLOKADA racuna.
     Prav to je podatek, zaradi katerega se preverjanje stranke splaca. */
  neporavnane?: boolean;
  tuji?: boolean;
};

/** Protest menice iz Registra protestiranih menic (RPM). */
export type ProfipoProtest = { protest?: string; vpisan?: string; izbrisan?: string };

export type ProfipoPostavka = { aop?: string; opis?: string; vrednost?: string };

/** Objava iz insolvenčnih postopkov (eInsolv) — element ObjavaIns v shemi. */
export type ProfipoInsolvencnaObjava = { objavljeno?: string; dejanje?: string; postopek?: string; procesnoDejanje?: string };
/** Objava po ZGD (eZGD) — element ObjavaZgd. */
export type ProfipoZgdObjava = { objavljeno?: string; vrsta?: string };

export type ProfipoPodjetje = {
  maticna: string;
  naziv?: string;
  kratkoIme?: string;
  oblika?: string;
  davcna?: string;
  zavezanecDdv?: boolean;
  skd?: string;
  vpisan?: string;
  velikost?: string;
  naslov?: string;
  obcina?: string;
  regija?: string;
  zastopniki: { ime: string; vrsta?: string }[];
  druzbeniki: { ime: string }[];
  racuni: ProfipoRacun[];
  leto?: string;
  vrstaLp?: string;
  postavke: ProfipoPostavka[];
  kazalniki: ProfipoPostavka[];
  /** Kazalnik tveganja iz letnega poročila, kadar ga AJPES vrne. */
  kazalnikTveganja?: string;
  /** Objave iz insolvenčnih postopkov. Prazno = v odgovoru jih ni bilo. */
  insolvencni: ProfipoInsolvencnaObjava[];
  /** Objave po ZGD (statusne spremembe). */
  zgdObjave: ProfipoZgdObjava[];
  /** Protesti menic (RPM). */
  protesti: ProfipoProtest[];
  /** Neporavnane obveznosti v zadnjih 12 mesecih (PRS/eno12m). */
  neporavnaneZadnjih12m?: boolean;
  /** Ali ima subjekt vsaj en ODPRT transakcijski račun (zaprti imajo datum zaprtja). */
  imaOdprtRacun: boolean;
  /** Ali je kateri od računov v evidenci neporavnanih obveznosti (blokada). */
  imaBlokado: boolean;
  /** Ali je v odgovoru vsaj ena insolvenčna objava — za opozorilo v kartoteki. */
  imaInsolvencneObjave: boolean;
};

const vSeznam = <T,>(v: T | T[] | undefined): T[] =>
  v === undefined || v === null ? [] : Array.isArray(v) ? v : [v];

const besedilo = (v: unknown): string | undefined => {
  if (v === undefined || v === null) return undefined;
  if (typeof v === 'string') return v.trim() || undefined;
  if (typeof v === 'object' && '#text' in (v as Record<string, unknown>)) {
    return String((v as Record<string, unknown>)['#text']).trim() || undefined;
  }
  return undefined;
};

/** Napaka pride v istem ovoju kot podatki — v atributih elementa Ident. */
function napakaIz(ident: Record<string, unknown> | undefined): ProfipoNapaka | undefined {
  if (!ident) return undefined;
  const id = ident['@idNapake'];
  if (id === undefined || id === null || id === '') return undefined;
  /* Opis je OTROK elementa Ident, ne atribut — v vzorcu AJPES-a je
     <Ident idNapake="12"><OpisNapake>…</OpisNapake></Ident>. */
  const opis = besedilo(ident['OpisNapake']) ?? besedilo(ident['@OpisNapake']) ?? 'Neznana napaka.';
  return { id: String(id), opis };
}

function telesoOdgovora(xml: string, koren: string): Record<string, unknown> | undefined {
  const d = parser.parse(xml) as Record<string, any>;
  const body = d?.Envelope?.Body;
  if (!body) return undefined;
  const odziv = body[`${koren}Response`];
  return odziv?.[`${koren}Result`];
}

/** Podatki o podjetju iz GetData. */
export function razcleniGetData(xml: string): { napaka?: ProfipoNapaka; podjetje?: ProfipoPodjetje } {
  const rez = telesoOdgovora(xml, 'GetData');
  if (!rez) return { napaka: { id: 'razclenitev', opis: 'Odgovora ni bilo mogoče razčleniti.' } };
  const napaka = napakaIz(rez['Ident'] as Record<string, unknown>);
  if (napaka) return { napaka };

  const ps = rez['PS'] as Record<string, any> | undefined;
  if (!ps) return { napaka: { id: 'prazno', opis: 'Odgovor ne vsebuje podatkov o subjektu.' } };

  const lp = (Array.isArray(ps.LP) ? ps.LP[0] : ps.LP) as Record<string, any> | undefined;
  const prs = ps.PRS as Record<string, any> | undefined;
  const naslov = prs?.Naslov as Record<string, any> | undefined;

  /* Shema pozna DVA zapisa racunov: RTR (rn/dOdprt/dZaprt/PPS) in TRR
     (TrrRn/TrrOdprt/TrrZaprt/TrrPps). Beremo oba, sicer bi pri delu odgovorov
     ostali brez racunov. */
  const racuni: ProfipoRacun[] = [
    ...vSeznam<Record<string, any>>(ps.RTR).map(r => ({
      stevilka: String(r['@rn'] ?? ''),
      banka: besedilo(r.PPS),
      odprt: r['@dOdprt'] ? String(r['@dOdprt']) : undefined,
      zaprt: r['@dZaprt'] ? String(r['@dZaprt']) : undefined,
      /* »eno« = evidenca neporavnanih obveznosti; prisotnost pomeni blokado. */
      neporavnane: r['@eno'] !== undefined ? String(r['@eno']).toLowerCase() !== 'false' : undefined,
    })),
    ...vSeznam<Record<string, any>>(ps.TRR).map(r => ({
      stevilka: String(r['@TrrRn'] ?? ''),
      banka: besedilo(r.TrrPpsNaziv) || besedilo(r.TrrPps),
      odprt: r['@TrrOdprt'] ? String(r['@TrrOdprt']) : undefined,
      zaprt: r['@TrrZaprt'] ? String(r['@TrrZaprt']) : undefined,
      tuji: true,
    })),
  ].filter(r => r.stevilka);

  const insolvencni: ProfipoInsolvencnaObjava[] = vSeznam<Record<string, any>>(ps.ObjavaIns).map(o => ({
    objavljeno: o['@dObjava'] ? String(o['@dObjava']) : undefined,
    dejanje: o['@dDejanje'] ? String(o['@dDejanje']) : undefined,
    postopek: besedilo(o.TipPostopka),
    procesnoDejanje: besedilo(o.TipProcesnegaDejanja),
  }));

  const protesti: ProfipoProtest[] = vSeznam<Record<string, any>>(ps.RPM).map(o => ({
    protest: o['@pm'] !== undefined ? String(o['@pm']) : undefined,
    vpisan: o['@dVpis'] ? String(o['@dVpis']) : undefined,
    izbrisan: o['@dIzbris'] ? String(o['@dIzbris']) : undefined,
  }));

  const zgdObjave: ProfipoZgdObjava[] = vSeznam<Record<string, any>>(ps.ObjavaZgd).map(o => ({
    objavljeno: o['@dObjava'] ? String(o['@dObjava']) : undefined,
    vrsta: besedilo(o.VrstaObjave),
  }));

  const postavke: ProfipoPostavka[] = vSeznam<Record<string, any>>(lp?.LpPod).map(v => ({
    aop: v['@lAop'] ? String(v['@lAop']) : undefined,
    opis: besedilo(v.LOpis),
    vrednost: v['@lPod'] !== undefined ? String(v['@lPod']) : undefined,
  }));

  const kazalniki: ProfipoPostavka[] = vSeznam<Record<string, any>>(lp?.Kaz).map(v => ({
    aop: v['@kAop'] ? String(v['@kAop']) : undefined,
    opis: besedilo(v.KOpis),
    vrednost: v['@kPod'] !== undefined ? String(v['@kPod']) : undefined,
  }));

  const kraj = [besedilo(naslov?.Ulica), besedilo(naslov?.Kraj)].filter(Boolean).join(', ');

  return {
    podjetje: {
      maticna: String(ps['@maticna'] ?? ''),
      /* Shema piše PopolnoIme/KratkoIme, vzorec v navodilu pa Popolnoime —
         beremo obe obliki, da nas velika crka ne pusti brez naziva. */
      naziv: besedilo(prs?.PopolnoIme) || besedilo(prs?.Popolnoime) || besedilo(lp?.Naziv),
      kratkoIme: besedilo(prs?.KratkoIme) || besedilo(prs?.Kratkoime),
      oblika: besedilo(prs?.Oblika),
      davcna: prs?.['@davcna'] ? String(prs['@davcna']) : undefined,
      zavezanecDdv: prs?.['@idDDV'] ? true : undefined,
      skd: prs?.['@gd'] ? String(prs['@gd']) : (lp?.['@skd'] ? String(lp['@skd']) : undefined),
      vpisan: prs?.['@dVpis'] ? String(prs['@dVpis']) : undefined,
      velikost: besedilo(lp?.Velikost),
      naslov: kraj || undefined,
      obcina: besedilo(lp?.Obcina) || besedilo(naslov?.Obcina),
      regija: besedilo(lp?.Regija),
      zastopniki: vSeznam<Record<string, any>>(prs?.Zastopnik).map(z => ({
        ime: [besedilo(z.Ime), besedilo(z.Priimek)].filter(Boolean).join(' '),
        vrsta: besedilo(z.VrstaZastopnika),
      })).filter(z => z.ime),
      druzbeniki: vSeznam<Record<string, any>>(prs?.Druzbenik).map(d => ({
        ime: [besedilo(d.Ime), besedilo(d.Priimek)].filter(Boolean).join(' '),
      })).filter(d => d.ime),
      racuni,
      leto: lp?.['@leto'] ? String(lp['@leto']) : undefined,
      vrstaLp: lp?.['@vrsta'] ? String(lp['@vrsta']) : undefined,
      postavke,
      kazalniki,
      kazalnikTveganja: besedilo(lp?.KazalnikTveganja),
      insolvencni,
      zgdObjave,
      protesti,
      neporavnaneZadnjih12m: prs?.['@eno12m'] !== undefined
        ? String(prs['@eno12m']).toLowerCase() !== 'false'
        : undefined,
      imaOdprtRacun: racuni.some(r => !r.zaprt),
      imaBlokado: racuni.some(r => r.neporavnane === true),
      imaInsolvencneObjave: insolvencni.length > 0,
    },
  };
}

export type ProfipoVnos = { maticna: string; nabor: string; vrstaLp: string; leto: string };

/** Seznam iz GetCompanyList / GetCompanyModifiedList / GetAnnualReportType. */
export function razcleniSeznam(xml: string, metoda: 'GetCompanyList' | 'GetCompanyModifiedList' | 'GetAnnualReportType'): {
  napaka?: ProfipoNapaka; vnosi: ProfipoVnos[];
} {
  const rez = telesoOdgovora(xml, metoda);
  if (!rez) return { napaka: { id: 'razclenitev', opis: 'Odgovora ni bilo mogoče razčleniti.' }, vnosi: [] };
  const napaka = napakaIz(rez['Ident'] as Record<string, unknown>);
  if (napaka) return { napaka, vnosi: [] };
  const vnosi = vSeznam<Record<string, any>>(rez['Spr'] as Record<string, any> | Record<string, any>[] | undefined).map(v => ({
    maticna: String(v['@maticna'] ?? ''),
    nabor: String(v['@nabor'] ?? ''),
    vrstaLp: String(v['@vrsta_LP'] ?? v['@vrsta'] ?? ''),
    leto: String(v['@leto'] ?? ''),
  })).filter(v => v.maticna);
  return { vnosi };
}

/** Ali za to kombinacijo že imamo plačan dostop — točke se ne odštejejo znova. */
export function zeImamo(vnosi: ProfipoVnos[], iskano: { maticna: string; nabor: string; vrstaLp: string; leto: string }): boolean {
  return vnosi.some(v =>
    v.maticna === iskano.maticna
    && v.nabor === iskano.nabor
    && v.leto === String(iskano.leto)
    && (v.vrstaLp === iskano.vrstaLp || !v.vrstaLp));
}

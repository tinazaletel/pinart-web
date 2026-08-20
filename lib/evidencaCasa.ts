/* EVIDENCA DELOVNEGA ČASA (ZEPDSV)
   ================================
   To NI štoparica. Štoparica (TaskManagerWorkspace, /kalkulator/cas) meri,
   KOLIKO časa je šlo na projekt — za ceno in za analizo. Evidenca po ZEPDSV
   beleži nekaj drugega: KDAJ je človek delal (prihod, odmor, odhod) in zakaj
   ga ni bilo. Zakonska obveznost, ne poslovna analitika, zato ločen modul in
   ločena shramba — štoparice se tu ne dotikamo.

   Zakonska podlaga: Zakon o evidencah na področju dela in socialne varnosti
   (ZEPDSV), 18. člen, po noveli ZEPDSV-A, ki velja od 20. 11. 2023. Zahtevani
   podatki, ki jih ta modul zna izračunati ali zabeležiti:
     - število ur (dnevno, tedensko, mesečno) in tekoči seštevek po obdobju,
     - čas prihoda in odhoda (novost novele),
     - izraba in obseg odmora (novost novele),
     - nadurno delo,
     - neopravljene ure z nadomestilom (dopust, bolniška) in razlog odsotnosti,
     - ure v posebnih pogojih: nočno, nedeljsko in praznično delo.
   Kar je izven dosega te datoteke, je pošteno našteto v README poročilu —
   predvsem trajna hramba (evidenca je listina trajne vrednosti) in seznanitev
   delavca s podatki do plačilnega dne.

   Shramba je lokalna (localStorage), sinhronizacija v oblak pa je v
   lib/evidencaCasaOblak.ts — isti vzorec kot projekti in dnevnik. Ključ se
   NAMENOMA začne s "pinart-", ker FlowCloudBridge ob preklopu računa čisti
   samo predponi "pinart-" in "pinflow". */

export type VrstaDneva = 'delo' | 'dopust' | 'bolniska' | 'praznik' | 'prosto';

export type DelovniDan = {
  /* YYYY-MM-DD — hkrati identiteta zapisa: en koledarski dan = ena vrstica.
     Zato ni ločenega id-ja; datum je stabilen na vseh napravah in prepreči,
     da bi isti dan, vpisan na dveh napravah, nastal dvakrat. */
  datum: string;
  prihod?: string;         // HH:MM
  odhod?: string;          // HH:MM
  odmorMinute?: number;    // obseg odmora v minutah (ZEPDSV zahteva obseg, ne le "da/ne")
  vrsta: VrstaDneva;
  /* razlog odsotnosti ali pripomba (npr. "izredni dopust — selitev") */
  opomba?: string;
  /* čas zadnje spremembe (ISO) — ob sporu z oblakom zmaga novejši */
  updatedAt?: string;
  /* nagrobnik: izbris potuje v oblak, namesto da bi zapis tiho izginil */
  deletedAt?: string;
};

export const VRSTE_DNEVA: VrstaDneva[] = ['delo', 'dopust', 'bolniska', 'praznik', 'prosto'];

const VRSTA_SL: Record<VrstaDneva, string> = {
  delo: 'Delo',
  dopust: 'Dopust',
  bolniska: 'Bolniška',
  praznik: 'Praznik',
  prosto: 'Prosto',
};

const VRSTA_EN: Record<VrstaDneva, string> = {
  delo: 'Work',
  dopust: 'Annual leave',
  bolniska: 'Sick leave',
  praznik: 'Public holiday',
  prosto: 'Non-working',
};

export const vrstaLabel = (v: VrstaDneva, jeEn = false): string => (jeEn ? VRSTA_EN : VRSTA_SL)[v] || v;

/* ── ČAS ─────────────────────────────────────────────────────────────────── */

/* Sprejme "8:30", "830", "8.30", "08:30" in vrne minute od polnoči. Prijazno
   branje je tu bistveno: vnos mora biti hiter (klik v celico, "830", tab). */
export function naMinute(vnos?: string | null): number | null {
  if (!vnos) return null;
  const s = String(vnos).trim().replace(/[.,]/g, ':');
  if (!s) return null;
  let ure: number;
  let minute: number;
  if (s.includes(':')) {
    const [u, m] = s.split(':');
    ure = Number(u);
    minute = Number(m || 0);
  } else if (/^\d{3,4}$/.test(s)) {
    ure = Number(s.slice(0, s.length - 2));
    minute = Number(s.slice(-2));
  } else if (/^\d{1,2}$/.test(s)) {
    ure = Number(s);
    minute = 0;
  } else {
    return null;
  }
  if (!Number.isFinite(ure) || !Number.isFinite(minute)) return null;
  if (ure < 0 || ure > 23 || minute < 0 || minute > 59) return null;
  return ure * 60 + minute;
}

/* minute od polnoči -> "08:30" (za polje) */
export function vUro(minute: number | null): string {
  if (minute === null || !Number.isFinite(minute)) return '';
  const u = Math.floor(minute / 60);
  const m = Math.round(minute % 60);
  return `${String(u).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/* trajanje v minutah -> "8:30" (za prikaz vsot; brez vodilne ničle, ker gre za
   trajanje in ne za uro dneva) */
export function trajanje(minute: number): string {
  if (!Number.isFinite(minute) || minute <= 0) return '0:00';
  const u = Math.floor(minute / 60);
  const m = Math.round(minute % 60);
  return `${u}:${String(m).padStart(2, '0')}`;
}

/* Normalizacija ob izgubi fokusa: kar je razumljivo, se zapiše lepo; kar ni,
   se izbriše (raje prazno kot napačen podatek v zakonski evidenci). */
export const normalizirajUro = (vnos: string): string => vUro(naMinute(vnos));

/* ── DNEVNI IZRAČUN ──────────────────────────────────────────────────────── */

export const PRAG_DAN_MINUTE = 8 * 60;
export const PRAG_TEDEN_MINUTE = 40 * 60;

/* Prisotnost v minutah = odhod - prihod (nočna izmena čez polnoč šteje kot
   naslednji dan), brez odmora. Odmor se po ZDR-1 ne šteje v delovni čas, zato
   ga odštejemo — obseg pa evidenca vseeno hrani, ker ga zakon izrecno zahteva. */
export function minuteDela(d: DelovniDan): number {
  const od = naMinute(d.prihod);
  const doU = naMinute(d.odhod);
  if (od === null || doU === null) return 0;
  const konec = doU >= od ? doU : doU + 24 * 60;   // izmena čez polnoč
  const bruto = konec - od;
  const odmor = Math.max(0, Number(d.odmorMinute) || 0);
  return Math.max(0, bruto - odmor);
}

export const ureDela = (d: DelovniDan): number => minuteDela(d) / 60;

/* Nadure nad 8 ur na dan. Tedenski prag se šteje posebej (glej tedenskeVsote),
   ker sta to po zakonu dve različni omejitvi in se ne seštevata. */
export const nadureDneva = (d: DelovniDan): number => Math.max(0, minuteDela(d) - PRAG_DAN_MINUTE);

/* Prekrivanje delovnega intervala z nočnim časom (22:00-06:00). Interval
   razgrnemo na premico 0..48 h, da izmena čez polnoč pravilno zajame oba
   nočna odseka. Odmor se tu ne odšteva — ne vemo, kdaj je bil. */
export function nocneMinute(d: DelovniDan): number {
  const od = naMinute(d.prihod);
  const doU = naMinute(d.odhod);
  if (od === null || doU === null) return 0;
  const konec = doU >= od ? doU : doU + 24 * 60;
  /* nočni pasovi na premici 0..48 h */
  const pasovi: [number, number][] = [[0, 6 * 60], [22 * 60, 30 * 60], [46 * 60, 48 * 60]];
  return pasovi.reduce((vsota, [a, b]) => vsota + Math.max(0, Math.min(konec, b) - Math.max(od, a)), 0);
}

/* ── KOLEDAR ────────────────────────────────────────────────────────────── */

/* Vse računamo v UTC, da poletni/zimski čas ne premakne dneva za eno mesto —
   pri evidenci bi to pomenilo napačen dan v tednu in napačno "nedeljsko delo". */
const vDatum = (datum: string): Date => {
  const [l, m, d] = datum.split('-').map(Number);
  return new Date(Date.UTC(l, (m || 1) - 1, d || 1));
};

export const datumNiz = (l: number, m: number, d: number): string =>
  `${l}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/* 0 = nedelja … 6 = sobota */
export const danVTednu = (datum: string): number => vDatum(datum).getUTCDay();

export const jeVikend = (datum: string): boolean => {
  const d = danVTednu(datum);
  return d === 0 || d === 6;
};

export const jeNedelja = (datum: string): boolean => danVTednu(datum) === 0;

const DNEVI_SL = ['ned', 'pon', 'tor', 'sre', 'čet', 'pet', 'sob'];
const DNEVI_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const imeDneva = (datum: string, jeEn = false): string =>
  (jeEn ? DNEVI_EN : DNEVI_SL)[danVTednu(datum)] || '';

const MESECI_SL = ['januar', 'februar', 'marec', 'april', 'maj', 'junij', 'julij', 'avgust', 'september', 'oktober', 'november', 'december'];
const MESECI_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const imeMeseca = (mesec: number, jeEn = false): string =>
  (jeEn ? MESECI_EN : MESECI_SL)[Math.max(0, Math.min(11, mesec - 1))] || '';

/* ISO oznaka tedna ("2026-W34"). Potrebna za tedenski prag 40 ur, ki ne sme
   biti vezan na koledarski mesec. */
export function isoTeden(datum: string): string {
  const t = vDatum(datum);
  const dan = t.getUTCDay() || 7;                 // pon=1 … ned=7
  t.setUTCDate(t.getUTCDate() + 4 - dan);         // četrtek istega tedna
  const zacetek = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const stevilka = Math.ceil(((t.getTime() - zacetek.getTime()) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(stevilka).padStart(2, '0')}`;
}

export function dneviMeseca(leto: number, mesec: number): string[] {
  const stDni = new Date(Date.UTC(leto, mesec, 0)).getUTCDate();
  return Array.from({ length: stDni }, (_, i) => datumNiz(leto, mesec, i + 1));
}

/* ── SLOVENSKI PRAZNIKI ─────────────────────────────────────────────────── */

/* Velikonočna nedelja po Gaussovi (anonimni gregorijanski) formuli. Seznama za
   posamezna leta namenoma NI: tabela mora biti pravilna tudi leta 2031, ne da
   bi kdo osveževal konstanto. */
export function velikaNoc(leto: number): string {
  const a = leto % 19;
  const b = Math.floor(leto / 100);
  const c = leto % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mesec = Math.floor((h + l - 7 * m + 114) / 31);
  const dan = ((h + l - 7 * m + 114) % 31) + 1;
  return datumNiz(leto, mesec, dan);
}

const premakni = (datum: string, dni: number): string => {
  const t = vDatum(datum);
  t.setUTCDate(t.getUTCDate() + dni);
  return datumNiz(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
};

/* Dela PROSTI dnevi v Sloveniji (Zakon o praznikih in dela prostih dnevih).
   Prazniki, ki NISO dela prosti (15. 9. priključitev Primorske, 23. 11. Maister,
   17. 8. Prekmurje), tu namenoma niso — na evidenco ur ne vplivajo. */
export function prazniki(leto: number, jeEn = false): Map<string, string> {
  const vn = velikaNoc(leto);
  const seznam: [string, string, string][] = [
    [datumNiz(leto, 1, 1), 'novo leto', 'New Year'],
    [datumNiz(leto, 1, 2), 'novo leto', 'New Year'],
    [datumNiz(leto, 2, 8), 'Prešernov dan', "Prešeren Day"],
    [vn, 'velikonočna nedelja', 'Easter Sunday'],
    [premakni(vn, 1), 'velikonočni ponedeljek', 'Easter Monday'],
    [datumNiz(leto, 4, 27), 'dan upora proti okupatorju', 'Day of Uprising Against Occupation'],
    [datumNiz(leto, 5, 1), 'praznik dela', 'Labour Day'],
    [datumNiz(leto, 5, 2), 'praznik dela', 'Labour Day'],
    [premakni(vn, 49), 'binkoštna nedelja', 'Whit Sunday'],
    [datumNiz(leto, 6, 25), 'dan državnosti', 'Statehood Day'],
    [datumNiz(leto, 8, 15), 'Marijino vnebovzetje', 'Assumption Day'],
    [datumNiz(leto, 10, 31), 'dan reformacije', 'Reformation Day'],
    [datumNiz(leto, 11, 1), 'dan spomina na mrtve', 'Day of Remembrance'],
    [datumNiz(leto, 12, 25), 'božič', 'Christmas Day'],
    [datumNiz(leto, 12, 26), 'dan samostojnosti in enotnosti', 'Independence and Unity Day'],
  ];
  return new Map(seznam.map(([datum, sl, en]) => [datum, jeEn ? en : sl]));
}

export const imePraznika = (datum: string, jeEn = false): string | undefined =>
  prazniki(Number(datum.slice(0, 4)), jeEn).get(datum);

export const jePraznik = (datum: string): boolean => prazniki(Number(datum.slice(0, 4))).has(datum);

/* Kaj naj piše v vrstici, dokler uporabnik ne vpiše ničesar. Praznik in vikend
   se ne obravnavata kot "delo", da ne štejeta v pričakovani fond ur. */
export function privzetaVrsta(datum: string): VrstaDneva {
  if (jePraznik(datum)) return 'praznik';
  if (jeVikend(datum)) return 'prosto';
  return 'delo';
}

export const prazenDan = (datum: string): DelovniDan => ({ datum, vrsta: privzetaVrsta(datum) });

/* ── POVZETKI ───────────────────────────────────────────────────────────── */

export type TedenskaVsota = { teden: string; minute: number; nadure: number };

/* Tedenske vsote po ISO tednih. Vhod naj bo CELOTEN seznam (ne samo mesec),
   sicer bi teden, ki gre čez mesec, izgubil polovico ur in tedenske nadure bi
   bile prenizke. */
export function tedenskeVsote(dnevi: DelovniDan[]): TedenskaVsota[] {
  const poTednu = new Map<string, number>();
  dnevi.forEach(d => {
    if (d.deletedAt) return;
    poTednu.set(isoTeden(d.datum), (poTednu.get(isoTeden(d.datum)) || 0) + minuteDela(d));
  });
  return Array.from(poTednu.entries())
    .map(([teden, minute]) => ({ teden, minute, nadure: Math.max(0, minute - PRAG_TEDEN_MINUTE) }))
    .sort((a, b) => a.teden.localeCompare(b.teden));
}

export type MesecniPovzetek = {
  minute: number;              // skupaj opravljenih minut
  nadureDnevne: number;        // nad 8 h na dan
  nadureTedenske: number;      // nad 40 h na teden (tedni, ki segajo v ta mesec)
  dniDela: number;
  dniDopusta: number;
  dniBolniske: number;
  dniPraznika: number;
  nedeljskeMinute: number;
  praznicneMinute: number;
  nocneMinute: number;
};

/* mesec = 1..12. `vsi` je celoten seznam (za pravilne tedenske nadure), `dnevi`
   pa je izbor tega meseca — obakrat brez nagrobnikov. */
export function mesecniPovzetek(leto: number, mesec: number, vsi: DelovniDan[]): MesecniPovzetek {
  const predpona = `${leto}-${String(mesec).padStart(2, '0')}`;
  const zivi = vsi.filter(d => !d.deletedAt);
  const meseca = zivi.filter(d => d.datum.startsWith(predpona));

  /* Teden, ki straddla dva meseca, se šteje CEL — nadure so tedenska kategorija
     in jih ni mogoče pošteno razpoloviti. To je zavestna izbira, ne napaka. */
  const tedniMeseca = new Set(meseca.map(d => isoTeden(d.datum)));
  const nadureTedenske = tedenskeVsote(zivi)
    .filter(t => tedniMeseca.has(t.teden))
    .reduce((v, t) => v + t.nadure, 0);

  return {
    minute: meseca.reduce((v, d) => v + minuteDela(d), 0),
    nadureDnevne: meseca.reduce((v, d) => v + nadureDneva(d), 0),
    nadureTedenske,
    dniDela: meseca.filter(d => d.vrsta === 'delo' && minuteDela(d) > 0).length,
    dniDopusta: meseca.filter(d => d.vrsta === 'dopust').length,
    dniBolniske: meseca.filter(d => d.vrsta === 'bolniska').length,
    dniPraznika: meseca.filter(d => d.vrsta === 'praznik').length,
    nedeljskeMinute: meseca.filter(d => jeNedelja(d.datum)).reduce((v, d) => v + minuteDela(d), 0),
    praznicneMinute: meseca.filter(d => jePraznik(d.datum)).reduce((v, d) => v + minuteDela(d), 0),
    nocneMinute: meseca.reduce((v, d) => v + nocneMinute(d), 0),
  };
}

/* ── IZVOZ ──────────────────────────────────────────────────────────────── */

/* Inšpektor sme zahtevati izpis; CSV je najmanjši skupni imenovalec (odpre ga
   vsak računovodski program in Excel). Ločilo je podpičje, ker slovenski Excel
   vejico bere kot decimalko, BOM pa doda klicatelj ob shranjevanju. */
export function vCsv(leto: number, mesec: number, vsi: DelovniDan[], jeEn = false): string {
  const L = (sl: string, en: string) => (jeEn ? en : sl);
  const glava = [
    L('Datum', 'Date'), L('Dan', 'Day'), L('Prihod', 'Start'), L('Odmor (min)', 'Break (min)'),
    L('Odhod', 'End'), L('Ure', 'Hours'), L('Nadure nad 8h', 'Overtime over 8h'),
    L('Nočne ure', 'Night hours'), L('Vrsta', 'Type'), L('Opomba', 'Note'),
  ];
  const zapisi = new Map(vsi.filter(d => !d.deletedAt).map(d => [d.datum, d]));
  const vrstice = dneviMeseca(leto, mesec).map(datum => {
    const d = zapisi.get(datum) || prazenDan(datum);
    const praznik = imePraznika(datum, jeEn);
    const opomba = [d.opomba, praznik].filter(Boolean).join(' · ');
    return [
      datum,
      imeDneva(datum, jeEn),
      d.prihod || '',
      d.odmorMinute ? String(d.odmorMinute) : '',
      d.odhod || '',
      trajanje(minuteDela(d)),
      trajanje(nadureDneva(d)),
      trajanje(nocneMinute(d)),
      vrstaLabel(d.vrsta, jeEn),
      opomba,
    ];
  });

  const p = mesecniPovzetek(leto, mesec, vsi);
  const vsota = [
    [],
    [L('SKUPAJ', 'TOTAL'), '', '', '', '', trajanje(p.minute), trajanje(p.nadureDnevne), trajanje(p.nocneMinute), '', ''],
    [L('Nadure nad 40h/teden', 'Overtime over 40h/week'), trajanje(p.nadureTedenske)],
    [L('Dnevi dopusta', 'Annual leave days'), String(p.dniDopusta)],
    [L('Dnevi bolniške', 'Sick leave days'), String(p.dniBolniske)],
    [L('Nedeljsko delo', 'Sunday work'), trajanje(p.nedeljskeMinute)],
    [L('Praznično delo', 'Public holiday work'), trajanje(p.praznicneMinute)],
  ];

  const ubezi = (v: string) => (/[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return [glava, ...vrstice, ...vsota].map(v => v.map(c => ubezi(String(c ?? ''))).join(';')).join('\n');
}

/* ── SHRAMBA ────────────────────────────────────────────────────────────── */

const KLJUC = 'pinart-evidenca-casa';
export const DOGODEK = 'pinart-evidenca-casa-change';

const preberiSurovo = (): DelovniDan[] => {
  if (typeof window === 'undefined') return [];
  try {
    const s = JSON.parse(localStorage.getItem(KLJUC) || '[]');
    return Array.isArray(s) ? (s as DelovniDan[]).filter(d => d && typeof d.datum === 'string') : [];
  } catch { return []; }
};

/* Vsi zapisi VKLJUČNO z nagrobniki — samo za sinhronizacijo. */
export const preberiEvidencoVse = (): DelovniDan[] => preberiSurovo();

/* Živi zapisi, urejeni po datumu — za vmesnik. */
export const preberiEvidenco = (): DelovniDan[] =>
  preberiSurovo().filter(d => !d.deletedAt).sort((a, b) => a.datum.localeCompare(b.datum));

export function zapisiEvidencoVse(dnevi: DelovniDan[]): void {
  if (typeof window === 'undefined') return;
  try {
    /* en dan = ena vrstica; ob podvojitvi obdrži novejšo */
    const poDatumu = new Map<string, DelovniDan>();
    dnevi.forEach(d => {
      if (!d || !d.datum) return;
      const obstojec = poDatumu.get(d.datum);
      if (!obstojec || cas(d) >= cas(obstojec)) poDatumu.set(d.datum, d);
    });
    const urejeni = Array.from(poDatumu.values()).sort((a, b) => a.datum.localeCompare(b.datum));
    localStorage.setItem(KLJUC, JSON.stringify(urejeni));
    /* Javi spremembo, da jo FlowCloudBridge pošlje v oblak. Dogodek namesto
       neposrednega klica, ker bi uvoz lib/evidencaCasaOblak tu naredil krog. */
    window.dispatchEvent(new CustomEvent(DOGODEK));
  } catch (e) {
    console.error('Napaka pri shranjevanju evidence časa:', e);
  }
}

/* Zapisi brez updatedAt (ročno uvoženi) se štejejo za najstarejše, da jih oblak
   ne prepiše po nesreči. */
export const cas = (d: DelovniDan): number => {
  const t = d.updatedAt ? Date.parse(d.updatedAt) : NaN;
  return Number.isNaN(t) ? 0 : t;
};

/* Primerjalno jedro brez časovnih žigov — da ponoven zapis nespremenjenega dne
   ne osveži updatedAt in s tem po nepotrebnem ne "zmaga" nad oblakom. */
const jedro = (d: DelovniDan): string =>
  JSON.stringify([d.datum, d.prihod || '', d.odhod || '', d.odmorMinute || 0, d.vrsta, d.opomba || '']);

/* Shrani en dan (upsert po datumu). Vrne posodobljen seznam živih zapisov. */
export function shraniDan(dan: DelovniDan): DelovniDan[] {
  const vsi = preberiEvidencoVse();
  const obstojec = vsi.find(d => d.datum === dan.datum);
  const nespremenjen = obstojec && !obstojec.deletedAt && jedro(obstojec) === jedro(dan);
  const posodobljen: DelovniDan = nespremenjen
    ? obstojec
    : { ...dan, deletedAt: undefined, updatedAt: new Date().toISOString() };
  if (!nespremenjen) {
    zapisiEvidencoVse([...vsi.filter(d => d.datum !== dan.datum), posodobljen]);
  }
  return preberiEvidenco();
}

/* Mehko brisanje — nagrobnik, da izbris potuje v oblak. */
export function izbrisiDan(datum: string): DelovniDan[] {
  const vsi = preberiEvidencoVse();
  const obstojec = vsi.find(d => d.datum === datum);
  if (!obstojec) return preberiEvidenco();
  const zdaj = new Date().toISOString();
  zapisiEvidencoVse([...vsi.filter(d => d.datum !== datum), { ...obstojec, deletedAt: zdaj, updatedAt: zdaj }]);
  return preberiEvidenco();
}

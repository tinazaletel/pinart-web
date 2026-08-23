/* PUPA ZNA USTVARITI NALOGO — razčlenjevanje prostega besedila v OSNUTEK naloge.
   ============================================================================
   Zakaj je to čista funkcija v lib/ in ne kar v komponenti:
   - razčlenjevanje je edini del, ki se lahko zmoti (»do petka« ni vedno rok),
     zato mora biti preverljivo s testi — brez brskalnika in brez omrežja;
   - AI klica namenoma NI: preprosto ujemanje vzorcev je dovolj, deluje tudi
     brez povezave, nič ne stane in ob istem vnosu vedno vrne isto (šele to
     naredi test smiseln);
   - `danes` je VBRIZGAN parameter (isto kot lib/danes.ts): `new Date()` med
     renderjem razbije hidracijo, test pa bi bil odvisen od dneva izvajanja.

   Funkcija NIČESAR ne zapiše. Vrne samo osnutek, ki ga vmesnik pokaže v
   potrditveni kartici — zapis v shrambo se zgodi šele, ko uporabnica klikne
   »Ustvari«. To je pogoj: Pupa ne sme zapisati nič, česar ni nihče videl. */

import type { NalogaStolpec } from '@/lib/naloge';

export type PupaNalogaOsnutek = {
  naslov: string;
  /* preostale vrstice vnosa — kar ni naslov, je opis (ne izgubimo ničesar) */
  opis?: string;
  /* rok v obliki YYYY-MM-DD (enako kot Naloga.rok in <input type="date">) */
  rok?: string;
  /* kos besedila, iz katerega je rok razbran (»do petka«) — da uporabnica v
     kartici vidi, ZAKAJ je Pupa izbrala ta datum, in lahko popravi */
  rokIzraz?: string;
  /* prosto ime projekta (Naloga.projectId je prosto besedilo, ne ključ) */
  projekt?: string;
  stolpec: NalogaStolpec;
  oznake: string[];
};

/* Oznaka, ki pove, da naloge ni vpisal človek v Naloge, ampak Pupa iz pogovora.
   Vidna je na kartici naloge in po njej se da filtrirati. */
export const OZNAKA_PUPA = 'pupa';

/* ── pomožno: primerjava brez šumnikov in velikih črk ──────────────────────
   Vzorce iščemo na POENOSTAVLJENI kopiji (»četrtka« → »cetrtka«), naslov pa
   režemo iz IZVIRNIKA. Zato mora poenostavitev ohraniti dolžino niza —
   sicer bi se indeksi zamaknili in naslov bi se odrezal na napačnem mestu. */
const SUMNIKI: Record<string, string> = { 'č': 'c', 'ć': 'c', 'š': 's', 'ž': 'z', 'đ': 'd' };

export const poenostavi = (s: string): string =>
  Array.from(s)
    .map((z) => {
      const mala = z.toLowerCase();
      /* varovalo: če se dolžina ob pomanjšanju spremeni (npr. turški »İ«),
         raje pustimo izvirni znak, da indeksi ostanejo poravnani */
      if (mala.length !== z.length) return z;
      return SUMNIKI[mala] ?? mala;
    })
    .join('');

/* ── pomožno: dnevi ───────────────────────────────────────────────────────── */

const naDan = (v: Date | string): Date => {
  const d = v instanceof Date ? v : new Date(v);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

const plusDni = (d: Date, n: number): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/* YYYY-MM-DD po LOKALNEM času — toISOString() bi pri nas datum zamaknil za dan nazaj. */
const isoDan = (d: Date): string => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/* getDay(): 0 = nedelja … 6 = sobota */
const DNEVI_SL: Record<string, number> = {
  ponedeljek: 1, ponedeljka: 1,
  torek: 2, torka: 2,
  sreda: 3, srede: 3, sredo: 3,
  cetrtek: 4, cetrtka: 4,
  petek: 5, petka: 5,
  sobota: 6, sobote: 6, soboto: 6,
  nedelja: 0, nedelje: 0, nedeljo: 0,
};
const DNEVI_EN: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
};

/* Prvi tak dan od danes naprej. Če je danes že ta dan, velja DANES —
   »pokliči do petka« v petek pomeni še danes, ne čez teden. */
const doDneva = (danes: Date, dan: number): Date => plusDni(danes, (dan - danes.getDay() + 7) % 7);

/* Ponedeljek prihodnjega tedna (teden se pri nas začne s ponedeljkom). */
const naslednjiPonedeljek = (danes: Date): Date => {
  const odPonedeljka = (danes.getDay() + 6) % 7; /* 0 = pon … 6 = ned */
  return plusDni(danes, 7 - odPonedeljka);
};

/* ── vzorci za rok ────────────────────────────────────────────────────────
   Vsak vzorec vrne datum ali null (null = ujelo se je nekaj, kar ni datum,
   npr. 31.2.). Vzorci tečejo po poenostavljeni kopiji besedila. */
type RokPravilo = { re: RegExp; datum: (m: RegExpExecArray, danes: Date) => Date | null };

const PRAVILA: RokPravilo[] = [
  /* 15.9. · 15. 9. 2026 · do 3.10.2026 */
  {
    re: /(?:\b(?:do|za|rok)\s+)?(\d{1,2})\s*\.\s*(\d{1,2})\s*\.(?:\s*(\d{4}))?/g,
    datum: (m, danes) => {
      const dan = Number(m[1]);
      const mesec = Number(m[2]);
      const leto = m[3] ? Number(m[3]) : danes.getFullYear();
      if (mesec < 1 || mesec > 12 || dan < 1 || dan > 31) return null;
      const d = new Date(leto, mesec - 1, dan);
      if (d.getMonth() !== mesec - 1) return null; /* npr. 31. 2. ne obstaja */
      /* brez letnice in datum je že mimo → mislila je prihodnje leto */
      if (!m[3] && d.getTime() < danes.getTime()) return new Date(leto + 1, mesec - 1, dan);
      return d;
    },
  },
  /* 2026-09-15 (kopirano iz drugih orodij) */
  {
    re: /(?:\b(?:do|za|rok)\s+)?(\d{4})-(\d{2})-(\d{2})\b/g,
    datum: (m) => {
      const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
      return d.getMonth() === Number(m[2]) - 1 ? d : null;
    },
  },
  /* danes · jutri · pojutrišnjem */
  {
    re: /\b(?:do\s+)?(danes|jutri|pojutrisnjem)\b/g,
    datum: (m, danes) => plusDni(danes, m[1] === 'jutri' ? 1 : m[1] === 'pojutrisnjem' ? 2 : 0),
  },
  { re: /\b(?:by\s+)?(today|tomorrow)\b/g, datum: (m, danes) => plusDni(danes, m[1] === 'tomorrow' ? 1 : 0) },
  /* čez 3 dni · čez 2 tedna */
  {
    re: /\bcez\s+(\d{1,3})\s*(dan|dneva|dni|dneve|teden|tedna|tedne|tednov)\b/g,
    datum: (m, danes) => plusDni(danes, Number(m[1]) * (m[2].startsWith('ted') ? 7 : 1)),
  },
  { re: /\bin\s+(\d{1,3})\s*(day|days|week|weeks)\b/g, datum: (m, danes) => plusDni(danes, Number(m[1]) * (m[2].startsWith('week') ? 7 : 1)) },
  /* do konca tedna → petek tega tedna */
  { re: /\b(?:do\s+)?konca?\s+tedna\b/g, datum: (_m, danes) => doDneva(danes, 5) },
  { re: /\b(?:by\s+)?(?:the\s+)?end\s+of\s+(?:the\s+)?week\b/g, datum: (_m, danes) => doDneva(danes, 5) },
  /* do konca meseca → zadnji dan tekočega meseca */
  { re: /\b(?:do\s+)?konca?\s+meseca\b/g, datum: (_m, danes) => new Date(danes.getFullYear(), danes.getMonth() + 1, 0) },
  { re: /\b(?:by\s+)?(?:the\s+)?end\s+of\s+(?:the\s+)?month\b/g, datum: (_m, danes) => new Date(danes.getFullYear(), danes.getMonth() + 1, 0) },
  /* naslednji / prihodnji teden → ponedeljek prihodnjega tedna */
  { re: /\b(?:do\s+)?(?:naslednji|prihodnji)\s+teden\b/g, datum: (_m, danes) => naslednjiPonedeljek(danes) },
  { re: /\bnext\s+week\b/g, datum: (_m, danes) => naslednjiPonedeljek(danes) },
  /* dnevi v tednu — vedno s predlogom (do/v/za/na/ta) ALI z »naslednji«, da
     ime podjetja (»Sreda d.o.o.«) ne postane rok */
  {
    re: /\b(?:(?:do|v|za|na|ta|to)\s+(?:(naslednj\w+|prihodnj\w+)\s+)?|(naslednj\w+|prihodnj\w+)\s+)(ponedeljek|ponedeljka|torek|torka|sreda|srede|sredo|cetrtek|cetrtka|petek|petka|sobota|sobote|soboto|nedelja|nedelje|nedeljo)\b/g,
    datum: (m, danes) => {
      const dan = DNEVI_SL[m[3]];
      if (dan === undefined) return null;
      const osnovni = doDneva(danes, dan);
      /* »naslednji petek« = teden kasneje kot prvi naslednji petek */
      return m[1] || m[2] ? plusDni(osnovni, 7) : osnovni;
    },
  },
  {
    re: /\b(?:by|on|this|next)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/g,
    datum: (m, danes) => {
      const dan = DNEVI_EN[m[1]];
      if (dan === undefined) return null;
      const osnovni = doDneva(danes, dan);
      return /^next\b/.test(m[0]) ? plusDni(osnovni, 7) : osnovni;
    },
  },
];

type NajdenRok = { rok: string; izraz: string; zacetek: number; konec: number };

/* Poišče rok v besedilu. Ko se ujame več vzorcev, obvelja PRVI po vrsti v
   besedilu (pri enakem začetku daljši) — daljši zapis je bolj določen. */
export function najdiRok(besedilo: string, danes: Date | string): NajdenRok | null {
  const dan0 = naDan(danes);
  const iskalno = poenostavi(besedilo);
  let najboljsi: NajdenRok | null = null;

  for (const pravilo of PRAVILA) {
    const re = new RegExp(pravilo.re.source, pravilo.re.flags);
    let m: RegExpExecArray | null;
    while ((m = re.exec(iskalno)) !== null) {
      if (m[0].length === 0) { re.lastIndex++; continue; }
      const d = pravilo.datum(m, dan0);
      if (!d) continue;
      const kandidat: NajdenRok = {
        rok: isoDan(d),
        izraz: besedilo.slice(m.index, m.index + m[0].length).trim(),
        zacetek: m.index,
        konec: m.index + m[0].length,
      };
      const boljsi = !najboljsi
        || kandidat.zacetek < najboljsi.zacetek
        || (kandidat.zacetek === najboljsi.zacetek && kandidat.konec > najboljsi.konec);
      if (boljsi) najboljsi = kandidat;
    }
  }
  return najboljsi;
}

/* ── vzorci za projekt ────────────────────────────────────────────────────
   Zahtevamo izrecno besedo »projekt« s predlogom, ker bi sicer »pripravi
   projekt za Rokusa« ime projekta odrezalo iz naslova naloge. */
const PROJEKT_PRAVILA: RegExp[] = [
  /\b(?:za|na|pri)\s+projekt(?:u|a)?\s+([^,;\n]+)/g,
  /\bprojekt\s*[:=]\s*([^,;\n]+)/g,
  /\b(?:for|on)\s+(?:the\s+)?project\s+([^,;\n]+)/g,
];

type NajdenProjekt = { projekt: string; zacetek: number; konec: number } | null;

function najdiProjekt(besedilo: string, znaniProjekti: string[]): NajdenProjekt {
  const iskalno = poenostavi(besedilo);

  for (const vzorec of PROJEKT_PRAVILA) {
    const re = new RegExp(vzorec.source, vzorec.flags);
    const m = re.exec(iskalno);
    if (!m || !m[1].trim()) continue;
    const surovo = besedilo.slice(m.index + m[0].indexOf(m[1]), m.index + m[0].length).trim();
    /* če se ujema z obstoječim projektom, prevzamemo NJEGOV zapis imena —
       da se naloga v Nalogah filtrira pod istim projektom, ne pod dvojnikom */
    const znan = znaniProjekti.find((p) => poenostavi(p) === poenostavi(surovo));
    return { projekt: znan || surovo, zacetek: m.index, konec: m.index + m[0].length };
  }

  /* Brez izrecnega vzorca: če se v besedilu pojavi ime obstoječega projekta,
     nalogo NANJ le navežemo — imena iz naslova NE režemo, ker je tam del
     smisla (»pokliči Rokus Klett« ostane cel stavek). */
  for (const p of znaniProjekti) {
    const ime = poenostavi(p.trim());
    if (ime.length < 3) continue;
    if (iskalno.includes(ime)) return { projekt: p.trim(), zacetek: -1, konec: -1 };
  }
  return null;
}

/* ── prepoznava namena ────────────────────────────────────────────────────── */

/* Nagovor (»Pupa,« / »Hej Pupa,«) ni del ukaza — odrežemo ga pred vsem drugim. */
const NAGOVOR = /^(?:hej|zivjo|zdravo|hi|hey|ej)?[\s,]*pupa[\s,]*/;
const UKAZ_SL = /^(?:prosim[\s,]+)?(?:(?:dodaj|ustvari|naredi|zapisi|vpisi|odpri)\s+(?:mi\s+)?(?:se\s+)?(?:eno\s+)?(?:novo\s+)?nalog[ao]|nov[ao]\s+nalog[ao])\b[\s:,.\-–—]*/;
const UKAZ_EN = /^(?:please[\s,]+)?(?:(?:add|create|make|log)\s+(?:a\s+|an\s+|new\s+)*task|new\s+task)\b[\s:,.\-–—]*/;

/* Odreže nagovor in ukaz; vrne { ostanek, jeUkaz }. */
function odreziUkaz(vnos: string): { ostanek: string; jeUkaz: boolean } {
  let ostanek = vnos.trim();
  const brezNagovora = poenostavi(ostanek).replace(NAGOVOR, '');
  ostanek = ostanek.slice(ostanek.length - brezNagovora.length);

  for (const ukaz of [UKAZ_SL, UKAZ_EN]) {
    const m = ukaz.exec(poenostavi(ostanek));
    if (m) return { ostanek: ostanek.slice(m[0].length), jeUkaz: true };
  }
  return { ostanek, jeUkaz: false };
}

/* Ali je uporabnica JASNO naročila novo nalogo (»dodaj nalogo …«, »create task …«)?
   Vse drugo ostane navaden pogovor — Pupa ne sme ugibati in zapisovati na pamet. */
export function jeNamenNaloge(vnos: string): boolean {
  if (!vnos || !vnos.trim()) return false;
  return odreziUkaz(vnos).jeUkaz;
}

/* ── čiščenje naslova ─────────────────────────────────────────────────────── */

const pocisti = (s: string): string =>
  s.replace(/\s{2,}/g, ' ')
    .replace(/^[\s,;:.\-–—]+/, '')
    .replace(/[\s,;:.\-–—]+$/, '')
    .trim();

/* Naslov naloge se v seznamu bere kot vrstica, zato velika začetnica. */
const velikaZacetnica = (s: string): string => (s ? s.charAt(0).toLocaleUpperCase('sl-SI') + s.slice(1) : s);

/* ── glavna funkcija ──────────────────────────────────────────────────────── */

/**
 * Iz prostega besedila sestavi OSNUTEK naloge (naslov, po možnosti rok in projekt).
 * Vrne null, kadar naslova ni — takrat ni kaj potrjevati in vmesnik raje odpre Naloge.
 *
 * @param vnos          kar je uporabnica napisala Pupi
 * @param danes         vbrizgan današnji dan (brez njega ni testljivo in ruši hidracijo)
 * @param znaniProjekti imena obstoječih projektov, da se naloga naveže na pravega
 */
export function razcleniNalogo(
  vnos: string,
  danes: Date | string,
  znaniProjekti: string[] = [],
): PupaNalogaOsnutek | null {
  if (!vnos || !vnos.trim()) return null;

  const { ostanek } = odreziUkaz(vnos);

  /* prva neprazna vrstica = naslov, ostalo = opis (dolg vnos se ne izgubi) */
  const vrstice = ostanek.split('\n');
  const prvaIdx = vrstice.findIndex((v) => v.trim().length > 0);
  if (prvaIdx === -1) return null;
  let naslov = vrstice[prvaIdx];
  const opis = pocisti(vrstice.slice(prvaIdx + 1).join('\n').trim());

  /* rok najprej — izraz (»do petka«) se iz naslova odreže, sicer ostane v njem */
  const rok = najdiRok(naslov, danes);
  if (rok) naslov = naslov.slice(0, rok.zacetek) + ' ' + naslov.slice(rok.konec);

  const projekt = najdiProjekt(naslov, znaniProjekti);
  if (projekt && projekt.zacetek >= 0) naslov = naslov.slice(0, projekt.zacetek) + ' ' + naslov.slice(projekt.konec);

  naslov = velikaZacetnica(pocisti(naslov));
  if (!naslov) return null;

  return {
    naslov,
    opis: opis || undefined,
    rok: rok?.rok,
    rokIzraz: rok?.izraz,
    projekt: projekt?.projekt,
    /* nova naloga vedno pristane med »Za narediti« — Pupa ničesar ne premika */
    stolpec: 'todo',
    oznake: [OZNAKA_PUPA],
  };
}

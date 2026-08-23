/* SEZNAM »DANES« — kaj čaka nate, urejeno po nujnosti.
   ====================================================
   Tinina zahteva (23. 8. 2026): na nadzorni plošči naj bo prvi blok seznam
   tega, kar čaka nate — ne koledar prihodnjih dogodkov.

   Codexova pripomba, ki jo ta modul upošteva: vrstica mora povedati DEJANJE,
   ne stanja. Ne »Račun 2026-014 · zapadel«, ampak »Pošlji opomnik za račun
   2026-014 · zapadel 3 dni«. Iz stanja mora človek sam ugotoviti, kaj naj
   naredi; iz dejanja ne rabi ugotavljati ničesar.

   Zato je to ČISTA funkcija z vbrizganim datumom: pravila prioritete se dajo
   preveriti s testi (lib/__tests__/danes.test.ts), sicer bi bil vrstni red
   naključen in tega ne bi nihče opazil. Datum je parameter tudi zato, ker
   `new Date()` med renderjem razbije hidracijo — glej docs pattern.  */

export type DanesVrsta =
  | 'zamujeno'        /* rok je mimo */
  | 'strankaCaka'     /* nekdo čaka na naš odgovor */
  | 'rokDanes'        /* zapade danes */
  | 'dokumentCaka'    /* dokument čaka na našo potezo */
  | 'rokKmalu'        /* zapade v nekaj dneh */
  | 'mojaNaloga'      /* lastno delo brez roka */
  | 'priloznost';     /* ni nujno, a se splača */

/* Nižja številka = višje na seznamu. Vrstni red je Tinin (23. 8. 2026). */
const TEZA: Record<DanesVrsta, number> = {
  zamujeno: 1,
  strankaCaka: 2,
  rokDanes: 3,
  dokumentCaka: 4,
  rokKmalu: 5,
  mojaNaloga: 6,
  priloznost: 7,
};

export type DanesVrstica = {
  id: string;
  vrsta: DanesVrsta;
  /* besedilo se ZAČNE z glagolom: »Odgovori …«, »Pošlji …«, »Preglej …« */
  dejanje: string;
  /* desni pripis: »zapadel 3 dni«, »danes«, »čez 5 dni« */
  pripis: string;
  kam: string;
  /* koliko dni do roka; negativno = zamuda. Brez roka = undefined. */
  dniDoRoka?: number;
};

export const NAJVEC_VRSTIC = 8;

/* ── čas ─────────────────────────────────────────────────────────────────── */

const naDan = (v: string | Date): Date | null => {
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

/** Cela števila dni med dnevoma; negativno pomeni, da je datum že mimo. */
export function dniMed(od: string | Date, do_: string | Date): number | null {
  const a = naDan(od);
  const b = naDan(do_);
  if (!a || !b) return null;
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** »zapadel 3 dni« / »danes« / »jutri« / »čez 5 dni« */
export function pripisRoka(dni: number, jeEn = false): string {
  if (dni < 0) {
    const n = Math.abs(dni);
    return jeEn ? `${n} ${n === 1 ? 'day' : 'days'} overdue` : `zamuda ${n} ${n === 1 ? 'dan' : 'dni'}`;
  }
  if (dni === 0) return jeEn ? 'today' : 'danes';
  if (dni === 1) return jeEn ? 'tomorrow' : 'jutri';
  return jeEn ? `in ${dni} days` : `čez ${dni} dni`;
}

/* ── razvrščanje ─────────────────────────────────────────────────────────── */

/**
 * Uredi po nujnosti in odreži na NAJVEC_VRSTIC.
 * Znotraj iste vrste je prej tisto, kar ima bližji (ali bolj zamujen) rok;
 * vrstice brez roka gredo za tistimi z rokom, da nujno ne pade pod nenujno.
 */
export function urediDanes(vrstice: DanesVrstica[], najvec = NAJVEC_VRSTIC): DanesVrstica[] {
  return [...vrstice]
    .sort((a, b) => {
      const t = TEZA[a.vrsta] - TEZA[b.vrsta];
      if (t !== 0) return t;
      const ar = a.dniDoRoka;
      const br = b.dniDoRoka;
      if (ar == null && br == null) return a.dejanje.localeCompare(b.dejanje, 'sl');
      if (ar == null) return 1;
      if (br == null) return -1;
      return ar - br;
    })
    .slice(0, najvec);
}

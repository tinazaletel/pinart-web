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
  /* druga vrstica: čigavo je — stranka, naslovnik, projekt. Brez nje so vrstice
     videti vse enake, ker se razlikujejo samo po imenu v oklepaju. */
  podnaslov?: string;
  /* desni pripis: »zapadel 3 dni«, »danes«, »čez 5 dni« */
  pripis: string;
  kam: string;
  /* koliko dni do roka; negativno = zamuda. Brez roka = undefined. */
  dniDoRoka?: number;
  /* datum, na katerega se vrstica nanasa (ISO) — za datumski zetonu levo. */
  datum?: string;
};

export const NAJVEC_VRSTIC = 8;

/* Koliko vrstic iste vrste sme priti na vrh seznama, preden pridejo na vrsto
   druge. Brez tega ena sama vrsta poje cel seznam. */
export const NAJVEC_ENAKIH = 2;

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
  const urejene = [...vrstice].sort((a, b) => {
    const t = TEZA[a.vrsta] - TEZA[b.vrsta];
    if (t !== 0) return t;
    const ar = a.dniDoRoka;
    const br = b.dniDoRoka;
    if (ar == null && br == null) return a.dejanje.localeCompare(b.dejanje, 'sl');
    if (ar == null) return 1;
    if (br == null) return -1;
    return ar - br;
  });

  /* Brez omejitve po vrsti seznam poje ena sama vrsta: sest zapadlih racunov
     istega narocnika je zasedlo vseh osem mest in seznam je bil videti, kot da
     kaze vedno isto. Najprej vzamemo najvec NAJVEC_ENAKIH od vsake vrste, sele
     ce mest se ostane, jih dopolnimo po prvotnem vrstnem redu. */
  const izbrane: DanesVrstica[] = [];
  const steviloPoVrsti = new Map<DanesVrsta, number>();
  for (const v of urejene) {
    if (izbrane.length >= najvec) break;
    const doslej = steviloPoVrsti.get(v.vrsta) || 0;
    if (doslej >= NAJVEC_ENAKIH) continue;
    steviloPoVrsti.set(v.vrsta, doslej + 1);
    izbrane.push(v);
  }
  if (izbrane.length < najvec) {
    const ze = new Set(izbrane.map(v => v.id));
    for (const v of urejene) {
      if (izbrane.length >= najvec) break;
      if (!ze.has(v.id)) izbrane.push(v);
    }
  }
  return izbrane;
}

/* ── sestavljanje vrstic iz virov ────────────────────────────────────────── */

/* Vhodi so NAMENOMA ozki (samo polja, ki jih rabimo), ne celi tipi iz shrambe:
   funkcija ostane testljiva brez izmišljanja celih ponudb in računov. */
export type DanesViri = {
  naloge?: Array<{ id?: string; naslov: string; stolpec: string; rok?: string }>;
  posta?: Array<{ id: string; smer: 'poslano' | 'prejeto'; prejemniki: string[]; zadeva: string; datum: string; osnutek?: boolean; izbrisano?: string }>;
  racuni?: Array<{ id: string; number?: string; client: string; paid: boolean; date: string; dueDays?: number }>;
  ponudbe?: Array<{ id: string; title: string; client: string; date: string; status: string }>;
};

/* Koliko dni naprej štejemo kot »kmalu« in po koliko dneh molka stranka »čaka«. */
const KMALU_DNI = 7;
const CAKA_DNI = 2;
const PONUDBA_TIHA_DNI = 5;

/**
 * Iz virov sestavi vrstice za seznam »Danes«.
 * `danes` je vbrizgan, da je funkcija testljiva in da se datum ne računa med
 * renderjem (hidracija). Vrne NEurejen seznam — vrstni red naredi urediDanes.
 */
export function sestaviDanes(viri: DanesViri, danes: string | Date, jeEn = false): DanesVrstica[] {
  const L = (sl: string, en: string) => (jeEn ? en : sl);
  const ven: DanesVrstica[] = [];

  /* Naloge: rok odloči, kako nujne so; brez roka so »moje delo«. */
  for (const [i, n] of (viri.naloge || []).entries()) {
    if (n.stolpec === 'done') continue;
    const dni = n.rok ? dniMed(danes, n.rok) : null;
    const vrsta: DanesVrsta = dni == null ? 'mojaNaloga'
      : dni < 0 ? 'zamujeno'
      : dni === 0 ? 'rokDanes'
      : dni <= KMALU_DNI ? 'rokKmalu'
      : 'mojaNaloga';
    if (dni != null && dni > KMALU_DNI) continue;   /* daleč v prihodnosti ni »danes« */
    ven.push({
      id: `naloga-${n.id || i}`,
      vrsta,
      dejanje: `${L('Poskrbi za', 'Take care of')} ${n.naslov}`,
      pripis: dni == null ? L('brez roka', 'no deadline') : pripisRoka(dni, jeEn),
      datum: n.rok,
      kam: '/kalkulator/naloge',
      dniDoRoka: dni ?? undefined,
    });
  }

  /* Pošta: prejeto sporočilo, na katero po njem ni šel noben naš odgovor
     istemu naslovu, pomeni, da nekdo čaka na nas. */
  const posta = (viri.posta || []).filter(v => !v.osnutek && !v.izbrisano);
  const zadnjiOdgovor = new Map<string, number>();
  for (const v of posta) {
    if (v.smer !== 'poslano') continue;
    const t = new Date(v.datum).getTime();
    for (const p of v.prejemniki) {
      const k = p.trim().toLowerCase();
      if (!zadnjiOdgovor.has(k) || t > (zadnjiOdgovor.get(k) as number)) zadnjiOdgovor.set(k, t);
    }
  }
  for (const v of posta) {
    if (v.smer !== 'prejeto') continue;
    const kdo = (v.prejemniki[0] || '').trim();
    const prejeto = new Date(v.datum).getTime();
    if (Number.isNaN(prejeto)) continue;
    const odgovor = zadnjiOdgovor.get(kdo.toLowerCase());
    if (odgovor != null && odgovor >= prejeto) continue;   /* smo že odgovorili */
    const dni = dniMed(danes, v.datum);
    if (dni == null || dni > 0) continue;
    const cakaDni = Math.abs(dni);
    if (cakaDni < CAKA_DNI) continue;                      /* danes ali včeraj še ni čakanje */
    ven.push({
      id: `posta-${v.id}`,
      vrsta: 'strankaCaka',
      dejanje: `${L('Odgovori', 'Reply to')} ${kdo || v.zadeva}`,
      podnaslov: kdo && v.zadeva ? v.zadeva : undefined,
      pripis: L(`čaka ${cakaDni} dni`, `waiting ${cakaDni} days`),
      datum: v.datum,
      kam: '/kalkulator/komunikacija',
      dniDoRoka: dni,
    });
  }

  /* Računi: neplačan račun po zapadlosti je zamuda, ne opomba. */
  for (const r of viri.racuni || []) {
    if (r.paid) continue;
    const rok = new Date(r.date);
    if (Number.isNaN(rok.getTime())) continue;
    rok.setDate(rok.getDate() + (r.dueDays ?? 15));
    const dni = dniMed(danes, rok);
    if (dni == null || dni > KMALU_DNI) continue;
    const oznaka = r.number ? `${L('račun', 'invoice')} ${r.number}` : L('račun', 'invoice');
    ven.push({
      id: `racun-${r.id}`,
      vrsta: dni < 0 ? 'zamujeno' : dni === 0 ? 'rokDanes' : 'rokKmalu',
      dejanje: dni < 0
        ? `${L('Pošlji opomnik za', 'Send a reminder for')} ${oznaka}`
        : `${L('Spremljaj', 'Watch')} ${oznaka}`,
      podnaslov: r.client,
      pripis: pripisRoka(dni, jeEn),
      datum: rok.toISOString().slice(0, 10),
      kam: '/kalkulator/racuni',
      dniDoRoka: dni,
    });
  }

  /* Ponudbe: poslana ponudba, ki več dni molči, čaka na našo potezo. */
  for (const p of viri.ponudbe || []) {
    if (p.status !== 'sent') continue;
    const dni = dniMed(danes, p.date);
    if (dni == null || dni > -PONUDBA_TIHA_DNI) continue;
    ven.push({
      id: `ponudba-${p.id}`,
      vrsta: 'dokumentCaka',
      dejanje: `${L('Preveri ponudbo', 'Follow up on the offer')} ${p.title}`,
      podnaslov: p.client,
      pripis: L(`poslana pred ${Math.abs(dni)} dni`, `sent ${Math.abs(dni)} days ago`),
      datum: p.date,
      kam: '/kalkulator/projekti',
      dniDoRoka: dni,
    });
  }

  return ven;
}

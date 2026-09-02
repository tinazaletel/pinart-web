/* UTEŽI ZA OBSEG DELA
 *
 * Doslej so odgovori na podrobnosti šli samo v besedilo ponudbe, na ceno pa
 * niso vplivali — trije predlogi so stali enako kot en, raziskava se ni poznala
 * nikjer (Luka, 1. 9. 2026: "na desni bi pričakoval, da bo nova cena že
 * prikazana, pa ni"). Tu so uteži, ki to popravijo.
 *
 * TRI VRSTE, ker delo ni ene vrste:
 *   mult    — obseg osnovnega dela ceno POMNOŽI (več predlogov, več dni)
 *   dodatek — dodatno opravljeno delo se PRIŠTEJE v evrih (raziskava, retuša)
 *   naEnoto — ponavljajoče se delo se računa na kos (prelom strani)
 *
 * Zakaj ne vse kot množitelj: pri publikaciji bi množitelj znova zaračunal
 * zasnovo predloge, ki je narejena enkrat. Pri 96 straneh je razlika 800 €.
 *
 * VIR vrednosti je raziskovalni model za slovenski trg 2026 in Tinini popravki;
 * ko pridejo odgovori izvajalcev, jih povozijo. Vrednosti so v EUR brez DDV in
 * se nanašajo na osnovo storitve iz cenika, ne na končno ceno.
 */

export type Utez =
  | { vrsta: 'mult'; vrednost: number }
  | { vrsta: 'dodatek'; vrednost: number }
  | { vrsta: 'naEnoto'; vrednost: number; vkljuceno: number; enota: string };

/* storitev -> id vprašanja -> natančna izbira -> utež */
export const UTEZI: Record<string, Record<string, Record<string, Utez>>> = {
  logo: {
    predlogi: {
      '1–2 predloga': { vrsta: 'mult', vrednost: 1 },
      '3 predlogi':   { vrsta: 'mult', vrednost: 1.25 },
      '6 predlogov':  { vrsta: 'mult', vrednost: 1.85 },
      '10 predlogov': { vrsta: 'mult', vrednost: 2.6 },
      '15 predlogov': { vrsta: 'mult', vrednost: 3.4 },
    },
    popravki: {
      '1 krog':                 { vrsta: 'mult', vrednost: 0.95 },
      '2 kroga':                { vrsta: 'mult', vrednost: 1 },
      '3 krogi':                { vrsta: 'mult', vrednost: 1.12 },
      'Neomejeno do potrditve': { vrsta: 'mult', vrednost: 1.45 },
    },
    raziskava: {
      'Naročnik jo prinese':                          { vrsta: 'mult', vrednost: 1 },
      'Pošljem mu vprašalnik in zberem podatke':      { vrsta: 'dodatek', vrednost: 100 },
      'Osnovna raziskava (splet, konkurenca, reference)': { vrsta: 'dodatek', vrednost: 250 },
      'Poglobljena raziskava in razvoj smeri':        { vrsta: 'dodatek', vrednost: 700 },
    },
    oblikaSkice: {
      'Samo digitalno, brez skic':                  { vrsta: 'mult', vrednost: 1 },
      'Ročne skice, nekaj smeri':                   { vrsta: 'dodatek', vrednost: 250 },
      'Obsežno raziskovanje, deset ali več skic':   { vrsta: 'dodatek', vrednost: 600 },
    },
  },

  cgp: {
    smeri: {
      '1–2 predloga': { vrsta: 'mult', vrednost: 1 },
      '3 predlogi':   { vrsta: 'mult', vrednost: 1.2 },
      '6 predlogov':  { vrsta: 'mult', vrednost: 1.85 },
      '10 predlogov': { vrsta: 'mult', vrednost: 2.6 },
      '15 predlogov': { vrsta: 'mult', vrednost: 3.4 },
    },
    raziskava: {
      'Naročnik jo prinese':                          { vrsta: 'mult', vrednost: 1 },
      'Pošljem mu vprašalnik in zberem podatke':      { vrsta: 'dodatek', vrednost: 150 },
      'Osnovna raziskava (splet, konkurenca, reference)': { vrsta: 'dodatek', vrednost: 400 },
      'Poglobljena raziskava in razvoj smeri':        { vrsta: 'dodatek', vrednost: 900 },
    },
    oblikaSkice: {
      'Samo digitalno, brez skic':                { vrsta: 'mult', vrednost: 1 },
      'Ročne skice, nekaj smeri':                 { vrsta: 'dodatek', vrednost: 400 },
      'Obsežno raziskovanje, deset ali več skic': { vrsta: 'dodatek', vrednost: 900 },
    },
  },

  publikacija: {
    /* Prelom se računa NA STRAN: prvih osem je v osnovi, vsaka nadaljnja +25 €.
       Množitelj bi znova zaračunal zasnovo predloge. */
    strani: {
      'Do 8':     { vrsta: 'naEnoto', vrednost: 25, vkljuceno: 8, enota: 'stran' },
      '9 do 32':  { vrsta: 'naEnoto', vrednost: 25, vkljuceno: 8, enota: 'stran' },
      '33 do 96': { vrsta: 'naEnoto', vrednost: 25, vkljuceno: 8, enota: 'stran' },
      'Nad 96':   { vrsta: 'naEnoto', vrednost: 25, vkljuceno: 8, enota: 'stran' },
    },
    jeziki: {
      '1':          { vrsta: 'mult', vrednost: 1 },
      '2':          { vrsta: 'mult', vrednost: 1.45 },
      '3 ali več':  { vrsta: 'mult', vrednost: 1.9 },
    },
    obseg: {
      'Kreativa od nič':                    { vrsta: 'mult', vrednost: 1 },
      'Preoblikovanje po obstoječem dizajnu': { vrsta: 'mult', vrednost: 0.7 },
      'Samo prelom (postavitev vsebine)':   { vrsta: 'mult', vrednost: 0.4 },
      'Samo priprava za tisk':              { vrsta: 'mult', vrednost: 0.12 },
    },
  },

  fotografija: {
    trajanje: {
      'Pol dneva':      { vrsta: 'mult', vrednost: 1 },
      '1 dan':          { vrsta: 'mult', vrednost: 1.5 },
      '2 ali več dni':  { vrsta: 'mult', vrednost: 2.75 },
    },
    post: {
      'Do 20':  { vrsta: 'mult', vrednost: 1 },
      '30':     { vrsta: 'dodatek', vrednost: 150 },
      '50':     { vrsta: 'dodatek', vrednost: 400 },
      'Nad 50': { vrsta: 'dodatek', vrednost: 650 },
    },
    retuse: {
      'Brez, samo osnovna obdelava': { vrsta: 'mult', vrednost: 1 },
      'Do 3':        { vrsta: 'dodatek', vrednost: 180 },
      'Do 6':        { vrsta: 'dodatek', vrednost: 360 },
      '10 ali več':  { vrsta: 'dodatek', vrednost: 600 },
    },
  },

  render3d: {
    raziskava: {
      'Naročnik jo prinese':                          { vrsta: 'mult', vrednost: 1 },
      'Pošljem mu vprašalnik in zberem podatke':      { vrsta: 'dodatek', vrednost: 80 },
      'Osnovna raziskava (splet, konkurenca, reference)': { vrsta: 'dodatek', vrednost: 150 },
      'Poglobljena raziskava in razvoj smeri':        { vrsta: 'dodatek', vrednost: 400 },
    },
  },
};

/* Iz izbire razberemo predstavniško število enot. Uporabnica izbere razpon
   ("33 do 96"), ne točnega števila, zato vzamemo sredino razpona — in to
   povemo v razčlenitvi, da ni videti kot natančen podatek. */
export const ENOTE_IZ_IZBIRE: Record<string, number> = {
  'Do 8': 8, '9 do 32': 24, '33 do 96': 64, 'Nad 96': 120,
};

export type Prispevek = { vprasanje: string; izbira: string; opis: string; ucinek: number };

/* Izbira, ki cene ne premakne, se VSEENO izpise. Brez tega ni mogoce lociti
   "ta odgovor ne vpliva" od "ta odgovor se ni upostevs" — klik izgleda
   spregledan (Tina, 3. 9. 2026). */
export const BREZ_DOPLACILA = 'brez doplačila';

/* Izračuna utež za eno vrstico ponudbe.
 *   osnova   — cena storitve iz cenika
 *   odgovori — kar je uporabnica izbrala (id vprašanja -> izbira)
 *   kolicina — pri naEnoto: dejansko število enot, če ga poznamo
 * Vrne končno ceno vrstice IN razčlenitev, da je v vmesniku vidno, kaj je ceno
 * premaknilo. Razčlenitev je varovalka: kdor vidi vzrok, napako najde sam. */
export function utezZaStoritev(
  sid: string,
  osnova: number,
  odgovori: Record<string, string>,
  enote?: Record<string, number>,
): { cena: number; mult: number; dodatki: number; razclenitev: Prispevek[] } {
  const tabela = UTEZI[sid];
  if (!tabela) return { cena: osnova, mult: 1, dodatki: 0, razclenitev: [] };

  let mult = 1;
  let dodatki = 0;   /* pribitki za DODATNO delo — stojijo zunaj mnoziteljev */
  let naEnoto = 0;   /* delo, ki raste s stevilom enot — je del osnove */
  const razclenitev: Prispevek[] = [];

  for (const [vprasanje, izbire] of Object.entries(tabela)) {
    const izbrano = (odgovori[vprasanje] || '').trim();
    if (!izbrano) continue;
    const u = izbire[izbrano];
    if (!u) continue;

    if (u.vrsta === 'mult') {
      if (u.vrednost === 1) {
        razclenitev.push({ vprasanje, izbira: izbrano, opis: BREZ_DOPLACILA, ucinek: 0 });
        continue;
      }
      mult *= u.vrednost;
      razclenitev.push({ vprasanje, izbira: izbrano,
        opis: `×${u.vrednost.toString().replace('.', ',')}`, ucinek: 0 });
    } else if (u.vrsta === 'dodatek') {
      dodatki += u.vrednost;
      razclenitev.push({ vprasanje, izbira: izbrano,
        opis: `+${u.vrednost} €`, ucinek: u.vrednost });
    } else {
      const n = Math.max(0, (enote?.[vprasanje] ?? u.vkljuceno) - u.vkljuceno);
      if (!n) {
        razclenitev.push({ vprasanje, izbira: izbrano, opis: BREZ_DOPLACILA, ucinek: 0 });
        continue;
      }
      const znesek = n * u.vrednost;
      naEnoto += znesek;
      razclenitev.push({ vprasanje, izbira: izbrano,
        opis: `${n} × ${u.vrednost} € / ${u.enota}`, ucinek: znesek });
    }
  }

  /* Vrstni red je pomemben. Prelom 64 strani JE osnovno delo, zato ga
     "samo prelom" ali "samo priprava za tisk" mora znizati enako kot zasnovo —
     sicer bi priprava za tisk stala 23 EUR na stran. Raziskava in retuse pa so
     dodatno delo in se ne mnozijo z obsegom. */
  const zMultiplikatorjem = (osnova + naEnoto) * mult;
  for (const p of razclenitev) {
    if (p.opis.startsWith('×')) p.ucinek = 0;
  }
  if (mult !== 1) {
    const stMult = razclenitev.filter(x => x.opis.startsWith('×')).length;
    razclenitev.forEach(p => {
      if (p.opis.startsWith('×')) p.ucinek = Math.round((zMultiplikatorjem - (osnova + naEnoto)) / stMult);
    });
  }

  return { cena: Math.round(zMultiplikatorjem + dodatki), mult, dodatki, razclenitev };
}

/* Zaokrozevanje cen v kalkulatorju: na 50 EUR navzgor ali navzdol. */
export const zaokrozi50 = (n: number) => Math.round(n / 50) * 50;

/* Cena ENE vrstice ponudbe, na enoto in zaokrozena.
 * Tu zivi zato, ker mora biti pravilo eno samo: cena dela je vsota vrstic
 * (kolicina x cena), zato mora vsak, ki racuna vrstico, racunati enako.
 * Prej sta bila dva locena izracuna in ponudba se ni sestela. */
export function cenaVrstice(osnovaZUtezjo: number, dodatki: number, mult: number, kolicina: number): number {
  const kol = Math.max(1, Math.round(kolicina));
  return zaokrozi50((osnovaZUtezjo * mult + dodatki) / kol);
}

/* VAROVALKA. Ne reže cene — samo pove, da je nekaj nenavadno.
 *   · zmnožek množiteljev čez 3 pomeni, da se je nabralo veliko izbir
 *   · cena nad zgornjim robom trga za to storitev */
export const TRZNI_RAZPON: Record<string, [number, number]> = {
  logo: [500, 2500], cgp: [1200, 5000], publikacija: [350, 3500],
  fotografija: [250, 2000], render3d: [300, 3000], embalaza: [425, 2500],
};

export function opozorilo(sid: string, cena: number, mult: number, jeEn = false): string | null {
  if (mult > 3) {
    return jeEn
      ? 'Many choices are stacked here. Check that each one is right.'
      : 'Nabralo se je veliko izbir. Preveri, ali je vsaka res prava.';
  }
  const razpon = TRZNI_RAZPON[sid];
  if (razpon && cena > razpon[1]) {
    return jeEn
      ? `Above what the market usually pays for this (${razpon[0]}–${razpon[1]} €). Check the choices.`
      : `Nad tem, kar trg za to običajno plača (${razpon[0]}–${razpon[1]} €). Preveri izbire.`;
  }
  return null;
}

/* VAROVALKA. Uteži so vezane na TOCNO besedilo izbire v vprašalniku. Ce kdo
   besedilo v lib/vprasanjaPoStoritvi.ts spremeni, utez tiho neha delovati in
   cena se ne premakne — brez napake, brez sledi. Zato v razvoju preverimo
   ujemanje ob nalaganju; v produkciji se blok odstrani. */
export function preveriUtezi(
  vprasanja: Record<string, { id: string; izbire?: string[] }[]>,
): string[] {
  const tezave: string[] = [];
  for (const [sid, po] of Object.entries(UTEZI)) {
    const dej = vprasanja[sid];
    if (!dej) { tezave.push(`utezi: storitve "${sid}" ni v vprasalniku`); continue; }
    for (const [qid, izbire] of Object.entries(po)) {
      const q = dej.find(x => x.id === qid);
      if (!q) { tezave.push(`utezi: ${sid} nima vprasanja "${qid}"`); continue; }
      for (const izbira of Object.keys(izbire)) {
        if (!(q.izbire || []).includes(izbira)) {
          tezave.push(`utezi: ${sid}.${qid} — izbire "${izbira}" ni vec med moznostmi`);
        }
      }
    }
  }
  return tezave;
}

if (process.env.NODE_ENV === 'development') {
  import('@/lib/vprasanjaPoStoritvi')
    .then(m => preveriUtezi(m.VPRASANJA_PO_STORITVI).forEach(t => console.warn(t)))
    .catch(() => {});
}

/* ── PRORACUN NAROCNIKA ──────────────────────────────────────────────────
 * Proracun na ceno NE vpliva — ce bi jo znizal, bi kalkulator sidral tvoje
 * delo na narocnikovo zeljo, kar je natanko tisto, cemur se hoce izogniti.
 * Mora pa imeti vidno posledico: kadar je delo drazje od proracuna, povemo
 * razliko in KATERO IZBIRO odvzeti, da se ceni priblizas. Torej predlog za
 * krcenje obsega, ne popust (Tina, 3. 9. 2026).
 */

/** Zgornja meja iz odgovora o proracunu; null, kadar meje ni ("Nad 2.000 €",
 *  "Še ne vem") ali je odgovor neuporaben. */
export function proracunIzOdgovora(odgovor: string): number | null {
  const t = (odgovor || '').trim();
  if (!t) return null;
  if (/^(nad|over)\b/i.test(t)) return null;         /* proracun je NAD -> ni omejitve */
  if (/ne vem|not sure/i.test(t)) return null;
  /* "1.000 € do 2.000 €" in "1000 € do 2000 €" morata dati isto. */
  const stevilke = t.replace(/[.\u00A0\u202F ](?=\d{3}\b)/g, '').match(/\d+/g);
  if (!stevilke) return null;
  const meja = Math.max(...stevilke.map(Number));
  return Number.isFinite(meja) && meja > 0 ? meja : null;
}

export type PredlogKrcenja = {
  meja: number;
  razlika: number;
  /** izbire, ki jih je treba opustiti, po vrsti od najdrazje */
  odvzemi: string[];
  /** cena, ki ostane, ko jih odvzames */
  preostane: number;
  /** ali se s tem sploh spravi pod mejo */
  zadosca: boolean;
};

/** Kaj odvzeti, da se delo priblizа proracunu. Ceno vsakic PREracunamo, ne
 *  odstevamo — mnozitelji se sestevljajo in odstevanje bi lagalo. */
export function predlogZaProracun(
  sid: string,
  osnova: number,
  odgovori: Record<string, string>,
  enote?: Record<string, number>,
): PredlogKrcenja | null {
  const meja = proracunIzOdgovora(odgovori.budget || '');
  if (!meja) return null;
  const polna = utezZaStoritev(sid, osnova, odgovori, enote);
  if (polna.cena <= meja) return null;

  const odvzemi: string[] = [];
  let preostali = { ...odgovori };
  let cena = polna.cena;
  for (let i = 0; i < 8; i += 1) {
    const u = utezZaStoritev(sid, osnova, preostali, enote);
    cena = u.cena;
    if (cena <= meja) break;
    const najdrazji = u.razclenitev
      .filter(x => x.ucinek > 0)
      .sort((a, b) => b.ucinek - a.ucinek)[0];
    if (!najdrazji) break;
    odvzemi.push(najdrazji.izbira);
    const brez = { ...preostali };
    delete brez[najdrazji.vprasanje];
    preostali = brez;
    cena = utezZaStoritev(sid, osnova, preostali, enote).cena;
  }
  return {
    meja,
    razlika: polna.cena - meja,
    odvzemi,
    preostane: cena,
    zadosca: cena <= meja,
  };
}

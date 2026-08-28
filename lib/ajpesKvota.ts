/* KVOTA AJPES PREGLEDOV — dnevna in mesečna, na organizacijo.
 *
 * Enote za proFi=Po kupi Pinart, ne uporabnik: 200 jih je in vsi plačniki
 * črpajo iz istega paketa. Brez omejitve bi en sam uporabnik z uvoženimi
 * tristo strankami porabil vso zalogo v eni seji — pri 15 € na mesec to ni
 * vprašanje pravičnosti, ampak marže.
 *
 * Dve meji, ker vsaka lovi svojo napako: mesečna varuje zalogo, dnevna pa
 * ustavi navdušenje prvega dne, ko človek odkrije funkcijo in preveri vse
 * stranke zapored.
 *
 * Ponovni pregled iste kombinacije (matična + leto + shema) se v kvoto NE
 * šteje — AJPES ga tudi ne zaračuna drugič.
 */

import type { PaketId } from '@/lib/paketi';

export type Kvota = { dan: number; mesec: number };

export const AJPES_KVOTE: Record<PaketId, Kvota> = {
  /* Brezplačni paket pregleda nima — v ceniku je naveden pri Premiumu. */
  free: { dan: 0, mesec: 0 },
  premium: { dan: 5, mesec: 20 },
  pro: { dan: 15, mesec: 60 },
};

export function kvotaZa(paket: string): Kvota {
  return AJPES_KVOTE[paket as PaketId] ?? AJPES_KVOTE.free;
}

export type IzidKvote =
  | { dovoljeno: true; ostanekDanes: number; ostanekMesec: number }
  | { dovoljeno: false; razlog: 'paket' | 'dan' | 'mesec'; sporocilo: string };

/**
 * Ali sme organizacija opraviti še en pregled.
 *
 * `zeVzeto` pomeni, da smo to kombinacijo že prevzeli — takrat je klic
 * brezplačen in gre mimo obeh mej.
 */
export function preveriKvoto(
  paket: string,
  porabljenoDanes: number,
  porabljenoMesec: number,
  zeVzeto = false,
): IzidKvote {
  const kvota = kvotaZa(paket);
  if (zeVzeto) return { dovoljeno: true, ostanekDanes: Math.max(0, kvota.dan - porabljenoDanes), ostanekMesec: Math.max(0, kvota.mesec - porabljenoMesec) };

  if (kvota.mesec <= 0) {
    return { dovoljeno: false, razlog: 'paket', sporocilo: 'Preverjanje strank v AJPES je vključeno v paketih Premium in Pro.' };
  }
  if (porabljenoMesec >= kvota.mesec) {
    return { dovoljeno: false, razlog: 'mesec', sporocilo: `Ta mesec si porabila vseh ${kvota.mesec} pregledov. Nova kvota začne teči prvega v mesecu.` };
  }
  if (porabljenoDanes >= kvota.dan) {
    return { dovoljeno: false, razlog: 'dan', sporocilo: `Danes si porabila vseh ${kvota.dan} pregledov. Jutri jih je spet ${kvota.dan}.` };
  }
  return {
    dovoljeno: true,
    ostanekDanes: kvota.dan - porabljenoDanes - 1,
    ostanekMesec: kvota.mesec - porabljenoMesec - 1,
  };
}

/** Začetek današnjega dne in tekočega meseca v ISO — meji za štetje. */
export function mejiObdobij(zdaj: Date): { odDanes: string; odMeseca: string } {
  const d = new Date(zdaj.getFullYear(), zdaj.getMonth(), zdaj.getDate());
  const m = new Date(zdaj.getFullYear(), zdaj.getMonth(), 1);
  return { odDanes: d.toISOString(), odMeseca: m.toISOString() };
}

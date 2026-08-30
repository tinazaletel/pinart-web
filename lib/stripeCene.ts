/* STRIPOVE LESTVICE — kateri ključ pripada kateri ponudbi.
 *
 * Zakaj lookup key in ne price_… ID: ID je v peskovniku in v živo različen.
 * Če bi jih pisali v kodo, bi bilo treba ob prehodu v živo zamenjati šest
 * nizov v šestih datotekah — in ravno to je razred napake, ki se opazi šele,
 * ko prvi človek plača napačno ceno. Lookup key je v obeh okoljih isti; ob
 * prehodu v živo se v Stripu ustvarijo iste lestvice z istimi ključi in v
 * kodi se ne spremeni nič.
 *
 * null pomeni »ta kombinacija v Stripu nima lestvice«. To NI ista stvar kot
 * napaka: klicatelj mora null obravnavati kot »te ponudbe ne prodajamo«, ne kot
 * okvaro. Tako je pri ustanovnem Pro, ki ga nikoli nismo oglaševali.
 *
 * Redni mesečni lestvici (19 € / 39 €) sta v živem Stripu nastali 29. 8. 2026,
 * torej pred iztekom uvodne ponudbe — da po 31. 10. mesečni nakup ne pade skozi.
 * V peskovniku ju je treba ustvariti z ISTIMA ključema, sicer testni nakup redne
 * mesečne naročnine ne bo našel cene.
 */

import type { PaketId } from '@/lib/paketi';
import type { Obdobje, Ponudba } from '@/lib/cenaNarocnine';

export type PlacljivPaket = Exclude<PaketId, 'free'>;

export const LOOKUP: Record<Ponudba, Record<PlacljivPaket, Record<Obdobje, string | null>>> = {
  ustanovna: {
    /* Ustanovna ponudba velja samo za Premium — Pro ustanovne lestvice v Stripu
       ni. Cenik jo sicer pozna (9 €), a je nikoli nismo oglaševali. */
    premium: { mesec: 'premium_ustanovna', leto: 'premium_ustanovna_letno' },
    pro: { mesec: null, leto: null },
  },
  uvodna: {
    premium: { mesec: 'premium_mesecno', leto: 'premium_letno' },
    pro: { mesec: 'pro_mesecno', leto: 'pro_letno' },
  },
  redna: {
    /* Do 30. 8. 2026 sta si uvodna in redna delili letno lestvico, ker je bila
       številka ista. Z redno letno 18 € oz. 35 € na mesec to ne drži več —
       redna ima svoji lestvici, torej so ključi štirje, ne dva. */
    premium: { mesec: 'premium_mesecno_redna', leto: 'premium_letno_redna' },
    pro: { mesec: 'pro_mesecno_redna', leto: 'pro_letno_redna' },
  },
};

/** Lookup key za dano kombinacijo; null, kadar te lestvice (še) ni. */
export function lookupKeyZa(ponudba: Ponudba, paket: PaketId, obdobje: Obdobje): string | null {
  if (paket === 'free') return null;
  return LOOKUP[ponudba]?.[paket]?.[obdobje] ?? null;
}

/* Obratna smer: iz ključa, ki ga vrne Stripe, nazaj v naše pojme.
 *
 * To je jedro poštenosti webhooka. Kaj je človek kupil, NE beremo iz tega, kar
 * pošlje brskalnik — brskalnik lahko laže. Beremo lookup key s Stripovega
 * potrdila in ga tu prevedemo nazaj. Če ključa ne poznamo, ne ugibamo. */
export type Razbrano = { ponudba: Ponudba; paket: PlacljivPaket; obdobje: Obdobje };

export function razberiLookup(kljuc: string | null | undefined): Razbrano | null {
  if (!kljuc) return null;
  for (const ponudba of Object.keys(LOOKUP) as Ponudba[]) {
    for (const paket of Object.keys(LOOKUP[ponudba]) as PlacljivPaket[]) {
      for (const obdobje of ['mesec', 'leto'] as Obdobje[]) {
        if (LOOKUP[ponudba][paket][obdobje] === kljuc) return { ponudba, paket, obdobje };
      }
    }
  }
  return null;
}

/* Odkar ima redna ponudba svoje letne lestvice, je vsak ključ enoličen in
   razberiLookup ne more zgrešiti. Funkcija ostaja kot varovalka: ponudbo naj
   še naprej določa ura naročila, ne ključ, da nas morebitna prihodnja delitev
   lestvice ne ujame tako, kot nas je skoraj premium_letno. */
export function kljucUstrezaPonudbi(kljuc: string, ponudba: Ponudba, paket: PlacljivPaket, obdobje: Obdobje): boolean {
  return LOOKUP[ponudba]?.[paket]?.[obdobje] === kljuc;
}

/** Vsi ključi, ki jih koda pričakuje v Stripu — za preverjanje ob zagonu. */
export function vsiKljuci(): string[] {
  const v = new Set<string>();
  for (const ponudba of Object.keys(LOOKUP) as Ponudba[])
    for (const paket of Object.keys(LOOKUP[ponudba]) as PlacljivPaket[])
      for (const obdobje of ['mesec', 'leto'] as Obdobje[]) {
        const k = LOOKUP[ponudba][paket][obdobje];
        if (k) v.add(k);
      }
  return [...v].sort();
}

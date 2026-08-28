/* STRIPOVE LESTVICE — kateri ključ pripada kateri ponudbi.
 *
 * Zakaj lookup key in ne price_… ID: ID je v peskovniku in v živo različen.
 * Če bi jih pisali v kodo, bi bilo treba ob prehodu v živo zamenjati šest
 * nizov v šestih datotekah — in ravno to je razred napake, ki se opazi šele,
 * ko prvi človek plača napačno ceno. Lookup key je v obeh okoljih isti; ob
 * prehodu v živo se v Stripu ustvarijo iste lestvice z istimi ključi in v
 * kodi se ne spremeni nič.
 *
 * null pomeni »ta kombinacija v Stripu še nima lestvice«. To NI ista stvar kot
 * napaka: redne cene (19 € / 39 € mesečno) namenoma še ne obstajajo, ker se do
 * 31. 10. 2026 nihče ne more nanje naročiti. Klicatelj mora null obravnavati
 * kot »te ponudbe zdaj ne prodajamo«, ne kot okvaro.
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
    /* Letna redna cena je ISTA številka kot uvodna letna (15 € oz. 29 € na
       mesec), zato si delita lestvico. Mesečna redna (19 € / 39 €) svoje
       lestvice še nima — nastane naj šele ob izteku uvodne ponudbe. */
    premium: { mesec: null, leto: 'premium_letno' },
    pro: { mesec: null, leto: 'pro_letno' },
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

/* premium_letno nosita dve ponudbi (uvodna in redna). Iskanje zgoraj vrne
   prvo najdeno, kar bi pomenilo, da bi človek, ki se novembra naroči po redni
   ceni, v bazi obveljal za »uvodnega«. Zato ponudbo določi ura naročila, ne
   ključ — ta funkcija samo pove, ali je ključ za to ponudbo sploh veljaven. */
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

/* PODPIS STRIPOVEGA WEBHOOKA — edina stvar, ki loči plačilo od zahtevka.
 *
 * Naslov webhooka je javen. Kdorkoli ga pozna, lahko pošlje »plačano je« in si
 * dodeli Pro. Edino, kar to prepreči, je podpis: Stripe telo zahtevka podpiše
 * s skupno skrivnostjo, mi pa isti izračun ponovimo in primerjamo.
 *
 * Trije deli, in vsak od njih je bil že kdo tuja napaka:
 *
 *  1. Podpisano je SUROVO telo, znak za znak. Če ga prej razčlenimo v JSON in
 *     nazaj v niz, se preslednice premaknejo in podpis ne bo veljal nikoli.
 *  2. Primerjava mora biti časovno enakomerna. Navadni === se ustavi ob prvem
 *     različnem znaku, iz razlik v času pa se da podpis uganiti znak za znakom.
 *  3. Časovni žig mora biti svež. Brez tega je star, enkrat prestrežen zahtevek
 *     mogoče poslati še leta pozneje in bo še vedno pravilno podpisan.
 *
 * Funkcija je čista — čas vstopa kot parameter, da je preverljiva v testu.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

export type IzidPodpisa = { ok: true } | { ok: false; razlog: string };

/* Glava je oblike: t=1614000000,v1=abc…,v1=def… (podpisov je lahko več,
   kadar se skrivnost menja — dovolj je, da se ujema en sam). */
export function razcleniGlavo(glava: string): { cas: number | null; podpisi: string[] } {
  let cas: number | null = null;
  const podpisi: string[] = [];
  for (const del of String(glava || '').split(',')) {
    const [ime, vrednost] = del.split('=', 2);
    if (!ime || !vrednost) continue;
    if (ime.trim() === 't') { const n = Number(vrednost.trim()); if (Number.isFinite(n)) cas = n; }
    if (ime.trim() === 'v1') podpisi.push(vrednost.trim());
  }
  return { cas, podpisi };
}

const enakaVarno = (a: string, b: string): boolean => {
  const x = Buffer.from(a, 'utf8');
  const y = Buffer.from(b, 'utf8');
  /* timingSafeEqual vrže, če se dolžini razlikujeta — dolžino torej primerjamo
     posebej. Sama dolžina podpisa ni skrivnost (vedno 64 znakov). */
  return x.length === y.length && timingSafeEqual(x, y);
};

export function preveriPodpis(
  surovoTelo: string,
  glava: string,
  skrivnost: string,
  zdajSek: number,
  dovoljenZamikSek = 300,
): IzidPodpisa {
  if (!skrivnost) return { ok: false, razlog: 'STRIPE_WEBHOOK_SECRET ni nastavljen' };
  const { cas, podpisi } = razcleniGlavo(glava);
  if (cas == null) return { ok: false, razlog: 'v glavi ni časovnega žiga' };
  if (!podpisi.length) return { ok: false, razlog: 'v glavi ni podpisa' };
  if (Math.abs(zdajSek - cas) > dovoljenZamikSek) return { ok: false, razlog: 'časovni žig je prestar' };

  const pricakovan = createHmac('sha256', skrivnost).update(`${cas}.${surovoTelo}`, 'utf8').digest('hex');
  if (!podpisi.some(p => enakaVarno(p, pricakovan))) return { ok: false, razlog: 'podpis se ne ujema' };
  return { ok: true };
}

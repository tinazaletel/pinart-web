/* PRIMERJAVA S TRZNIM POVPRECJEM na zahvalnem zaslonu vprasalnika.
 *
 * Zakaj obstaja: izpolnjevanje 40 vprasanj brez nicesar nazaj je enosmerna
 * cesta — Tina je predlagala nagrado, da se cloveku vsaj malo vrne. Primerjava
 * z DRUGIMI ZIVIMI TESTERJI ne pride v postev iz dveh razlogov: danes jih je
 * premalo, da bi bila primerjava karkoli drugega kot sum, in vsaka taka
 * primerjava bi trla ob obljubo na prvem zaslonu ("cen ne pokazem posamicno").
 * Namesto tega primerjamo z lib/trzniOkvir.ts — Tinino LASTNO raziskavo z 86
 * viri, ki je ze javna (ista stevilka, ki jo kalkulator kaze ob ceni). Tako
 * primerjava deluje od prvega odgovora naprej in nikoli ne razkrije tuje
 * stevilke (Tina, 3. 9. 2026).
 *
 * VSAK VNOS JE ROCNO PREVERJEN, da se obseg vprasanja ujema z obsegom, ki ga
 * meri raziskava (glej opombo pri vsakem TRZNI_OKVIRI vnosu v trzniOkvir.ts):
 *   grafika      -> "prelom" stran (raziskava izrecno meri SAMO prelom)
 *   fotografija  -> "cel dan" (raziskava meri snemalni dan)
 *   marketing    -> "eno druzbeno omrezje/mesec" (raziskava izkljuci video)
 *   it           -> "predstavitvena stran" (raziskava izrecno izkljuci trgovino/aplikacijo)
 * Namenoma IZPUSCENO: logotip (raziskava izrecno izkljuci "goli znak", prvo
 * vprasanje pa ne pove, ali gre za logotip z identiteto ali brez); interier
 * (vprasanje sprasuje NACIN obracuna, ne stevilke same); 3D in arhitektura
 * (raziskava ima tam samo 1-2 vira — prešibko za primerjavo).
 */

export const PRIMERJAVA_FLAGSHIP: Record<string, { vprasanjeId: string; storitev: string }> = {
  grafika: { vprasanjeId: 'tiskovine-koliko-zaracunas-na-stran-ko-gre-s-18', storitev: 'publikacija' },
  fotografija: { vprasanjeId: 'osnovna-cena-koliko-za-cel-dan-do-8-ur-5', storitev: 'fotografija' },
  marketing: { vprasanjeId: 'druzbena-omrezja-koliko-zaracunas-za-vodenj-5', storitev: 'smm' },
  it: { vprasanjeId: 'spletna-stran-koliko-zaracunas-za-preproste-5', storitev: 'web' },
};

/** Izlusci eno predstavniško število iz prostega odgovora ("800", "450,50",
 *  "1.200", "700 do 900" -> povprečje). Vrne null, če ni česa razbrati —
 *  raje brez primerjave kot izmišljeno število. */
export function stevilkaIzOdgovora(niz: string): number | null {
  const kosi = (niz || '').match(/\d[\d.,]*\d|\d/g);
  if (!kosi || !kosi.length) return null;
  const razberi = (s: string): number => {
    if (/^\d{1,3}(\.\d{3})+$/.test(s)) return Number(s.replace(/\./g, ''));      /* 1.200 = tisočica */
    if (s.includes(',')) return Number(s.replace(/\./g, '').replace(',', '.'));  /* 1.200,50 */
    return Number(s);
  };
  const stevilke = kosi.map(razberi).filter(n => Number.isFinite(n) && n > 0);
  if (!stevilke.length) return null;
  return stevilke.length >= 2 ? (stevilke[0] + stevilke[1]) / 2 : stevilke[0];
}

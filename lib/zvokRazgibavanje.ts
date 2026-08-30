/* ZVOK RAZGIBAVANJA — jingle in podlaga, oba v MODULU, ne v komponenti.
 *
 * Zakaj v modulu (Tina, 30. 8. 2026: »ustavila sem, a zvok gre dalje«):
 * predvajalnik, ki ga ustvari izris komponente, preživi njen odhod. Ob vsakem
 * ponovnem izrisu — med razvojem se to zgodi ob vsaki spremembi kode — je tako
 * ostal igrati star `Audio`, na katerega ni kazal noben gumb. Tu sta oba
 * predvajalnika ena sama, deljena med vsemi izrisi, zato jih `ustavi()` vedno
 * doseže.
 *
 * Nikoli oba hkrati: `naVrsti` pove, kdo igra. Ugibanje iz `currentTime` je
 * prej pomenilo, da je podlaga stekla čez jingle, ker je bil ta v prvih
 * trenutkih še na ničli.
 */

import { GLASBA, JINGLE } from '@/lib/razgibavanje';

let uvod: HTMLAudioElement | null = null;
let podlaga: HTMLAudioElement | null = null;
let naVrsti: 'uvod' | 'podlaga' | null = null;

function pripravi(): void {
  if (typeof window === 'undefined' || podlaga) return;

  podlaga = new Audio(GLASBA);
  podlaga.loop = true;
  podlaga.volume = 0.3;

  uvod = new Audio(JINGLE);
  uvod.volume = 0.5;
  uvod.onended = () => {
    if (naVrsti !== 'uvod') return;         // vmes smo že ustavili
    naVrsti = 'podlaga';
    void podlaga?.play().catch(() => {});
  };
}

/** Začne od začetka: jingle, za njim podlaga v zanki. */
export function zaigraj(): void {
  ustavi();
  pripravi();
  if (!uvod || !podlaga) return;
  naVrsti = 'uvod';
  void uvod.play().catch(() => {
    /* Brskalnik zna prvo predvajanje zavrniti; takrat vsaj podlaga. */
    naVrsti = 'podlaga';
    void podlaga?.play().catch(() => {});
  });
}

export function pavziraj(): void {
  uvod?.pause();
  podlaga?.pause();
}

/** Nadaljuje natanko tistega, ki je bil na vrsti. */
export function nadaljuj(): void {
  if (naVrsti === 'uvod') void uvod?.play().catch(() => {});
  else if (naVrsti === 'podlaga') void podlaga?.play().catch(() => {});
}

export function ustavi(): void {
  [uvod, podlaga].forEach(a => { if (a) { a.pause(); a.currentTime = 0; } });
  naVrsti = null;
}

/** Ali kaj igra — za varovalko ob odhodu s strani. */
export function igra(): boolean {
  return naVrsti !== null;
}

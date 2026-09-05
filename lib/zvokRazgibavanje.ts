/* ZVOK RAZGIBAVANJA — jingle in podlaga, oba na OKNU, ne v komponenti in ne v
 * modulu.
 *
 * Prva različica ju je držala v komponenti: predvajalnik, ki ga ustvari izris,
 * preživi njen odhod, zato je ob ponovnem izrisu ostal igrati star `Audio`, na
 * katerega ni kazal noben gumb (Tina, 30. 8. 2026: »ustavila sem, a zvok gre
 * dalje«).
 *
 * Druga različica ju je držala v modulu — a modul ni večen: ob osvežitvi kode
 * med razvojem se izvede znova in dobi PRAZNA predvajalnika, medtem ko stara,
 * igrajoča, ostaneta v pomnilniku. Takrat `ustavi()` ustavi napačna dva in
 * glasba teče naprej, čeprav je vaje konec (Tina, 30. 8. 2026: »banner se je
 * iztekel in izginil, muska pa ne«).
 *
 * Okno je edino, kar preživi oboje: vsaka kopija modula gleda v isto shrambo.
 *
 * Nikoli oba hkrati: `naVrsti` pove, kdo igra. Ugibanje iz `currentTime` je
 * prej pomenilo, da je podlaga stekla čez jingle, ker je bil ta v prvih
 * trenutkih še na ničli.
 */

import { GLASBA, JINGLE } from '@/lib/razgibavanje';

type Shramba = {
  uvod: HTMLAudioElement | null;
  podlaga: HTMLAudioElement | null;
  naVrsti: 'uvod' | 'podlaga' | null;
};

const KLJUC = '__pinartRazgibavanjeZvok';

function shramba(): Shramba | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as Record<string, Shramba | undefined>;
  if (!w[KLJUC]) w[KLJUC] = { uvod: null, podlaga: null, naVrsti: null };
  return w[KLJUC]!;
}

function pripravi(s: Shramba): void {
  if (s.podlaga) return;

  s.podlaga = new Audio(GLASBA);
  s.podlaga.loop = true;
  s.podlaga.volume = 0.3;

  s.uvod = new Audio(JINGLE);
  s.uvod.volume = 0.5;
  s.uvod.onended = () => {
    if (s.naVrsti !== 'uvod') return;         // vmes smo že ustavili
    s.naVrsti = 'podlaga';
    void s.podlaga?.play().catch(() => {});
  };
}

/** Začne od začetka: jingle, za njim podlaga v zanki. */
export function zaigraj(): void {
  const s = shramba();
  if (!s) return;
  ustavi();
  pripravi(s);
  if (!s.uvod || !s.podlaga) return;
  s.naVrsti = 'uvod';
  void s.uvod.play().catch(() => {
    /* Brskalnik zna prvo predvajanje zavrniti; takrat vsaj podlaga. */
    s.naVrsti = 'podlaga';
    void s.podlaga?.play().catch(() => {});
  });
}

export function pavziraj(): void {
  const s = shramba();
  s?.uvod?.pause();
  s?.podlaga?.pause();
}

/** Nadaljuje natanko tistega, ki je bil na vrsti; če ni bil nihče (zvok
    vklopljen sredi vaje ali po osvežitvi), začne od začetka — prej je
    »nadaljevanje« brez igralca pomenilo tišino brez razloga (Tina, 5. 9. 2026). */
export function nadaljuj(): void {
  const s = shramba();
  if (!s) return;
  if (s.naVrsti === 'uvod') void s.uvod?.play().catch(() => {});
  else if (s.naVrsti === 'podlaga') void s.podlaga?.play().catch(() => {});
  else zaigraj();
}

export function ustavi(): void {
  const s = shramba();
  if (!s) return;
  [s.uvod, s.podlaga].forEach(a => { if (a) { a.pause(); a.currentTime = 0; } });
  s.naVrsti = null;
}

/** Ali kaj igra — za varovalko ob odhodu s strani. */
export function igra(): boolean {
  return shramba()?.naVrsti != null;
}

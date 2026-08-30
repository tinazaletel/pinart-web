/* POVEZAVE ZA PODPORO — ena na jezik.
 *
 * Stripov Payment Link nosi svoj naslov in opis, in ta sta v enem jeziku.
 * Slovenska povezava angleško govorečemu pokaže slovensko stran, kar je
 * nerodno; ko bo jezikov osem, bi bilo nevzdržno.
 *
 * Zato preslikava jezik → povezava. Dodajanje jezika je ena vrstica: v Stripu
 * narediš Payment Link v tistem jeziku in ga vpišeš sem. Dokler povezave za
 * jezik ni, se uporabi privzeta — bolje slovenska stran kot noben gumb.
 */

export const PODPORA_POVEZAVE: Record<string, string> = {
  sl: 'https://buy.stripe.com/8x2cN79fXcJs6ezgnfefC00',
  en: 'https://buy.stripe.com/aFaeVfeAh7p87iD5IBefC01',
  /* de: '…', it: '…' — vpiši, ko povezava obstaja */
};

export const PODPORA_PRIVZETI_JEZIK = 'sl';

export function podporaPovezava(locale: string | undefined | null): string {
  const jezik = String(locale || '').slice(0, 2).toLowerCase();
  return PODPORA_POVEZAVE[jezik] || PODPORA_POVEZAVE[PODPORA_PRIVZETI_JEZIK];
}

/** Ali za ta jezik obstaja svoja povezava (za kasnejšo statistiko in opozorila). */
export function imaSvojoPovezavo(locale: string | undefined | null): boolean {
  const jezik = String(locale || '').slice(0, 2).toLowerCase();
  return Boolean(PODPORA_POVEZAVE[jezik]);
}

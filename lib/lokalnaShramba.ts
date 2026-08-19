/* LOKALNA SHRAMBA, LOČENA PO UPORABNIKU
 *
 * Projekti, naloge in sestanki živijo (tudi) v localStorage. Ta je vezan na
 * BRSKALNIK, ne na račun — zato je 19. 8. 2026 povabljena sodelavka po prijavi
 * na lastničinem telefonu videla njene projekte in naloge. Baza je bila ves
 * čas pravilna; šlo je za ostanke v brskalniku.
 *
 * Brisanje ob menjavi računa ni rešitev: naloge in sestanki NISO v oblaku,
 * zato bi jih brisanje trajno uničilo. Namesto tega dobi vsak račun svoj
 * predal — ključu pripnemo id prijavljenega uporabnika.
 *
 * Id beremo iz zaznamka, ki ga FlowCloudBridge postavi ob prijavi, ker morajo
 * te shrambe delovati SINHRONO (komponente berejo localStorage ob montaži in
 * ne morejo čakati na odgovor strežnika).
 */

export const MARKER_UPORABNIK = 'pinart-zadnji-uporabnik';

/** Trenutni uporabnik ali 'gost', če prijave (še) ni. */
export function trenutniUporabnik(): string {
  if (typeof window === 'undefined') return 'gost';
  try {
    return localStorage.getItem(MARKER_UPORABNIK) || 'gost';
  } catch {
    return 'gost';
  }
}

/** Ključ, ločen po računu: »pinflow_projekti« -> »pinflow_projekti::<id>«. */
export function kljucUporabnika(osnova: string): string {
  return `${osnova}::${trenutniUporabnik()}`;
}

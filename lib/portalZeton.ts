import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/* ŽETON ZA PORTAL STRANKE — samo strežniška raba.
 *
 * Stranka pride brez prijave, zato je žeton v povezavi edino, kar jo loči od
 * kogarkoli drugega. Zato:
 *   · 32 naključnih bajtov (base64url) — ugibanje ni izvedljivo,
 *   · v bazi hranimo SHA-256 zgostitev, ne žetona (kdor dobi bazo, ne dobi
 *     delujočih povezav),
 *   · iskanje po unique indeksu zgostitve je v konstantnem času glede na
 *     vsebino, zato časovnega kanala ni.
 *
 * Zgoščevanje brez soli je tu pravilno: žeton je 256-bitna naključna vrednost,
 * ne geslo — slovarskega napada ni, počasna funkcija bi le upočasnila vsak
 * ogled strani.
 */

export const PORTAL_PREDPONA = 'pp_';

export function ustvariPortalZeton(): { zeton: string; zgostitev: string } {
  const zeton = PORTAL_PREDPONA + randomBytes(32).toString('base64url');
  return { zeton, zgostitev: zgostiZeton(zeton) };
}

export function zgostiZeton(zeton: string): string {
  return createHash('sha256').update(zeton).digest('hex');
}

/** Oblika žetona še pred poizvedbo v bazo — nič neveljavnega ne pride do nje. */
export function jeVeljavnaOblika(zeton: string): boolean {
  return /^pp_[A-Za-z0-9_-]{43}$/.test(zeton);
}

/** Primerjava dveh zgostitev v konstantnem času (za morebitno ročno rabo). */
export function enakiZgostitvi(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

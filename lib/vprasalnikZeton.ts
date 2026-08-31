import { createHash, randomBytes } from 'node:crypto';
import { ZETON_PREDPONA } from '@/lib/vprasalnik';

/* ŽETON VPRAŠALNIKA — samo strežniška raba, isti vzorec kot portal za stranko
 * (lib/portalZeton.ts): 32 naključnih bajtov v povezavi, v bazi pa samo
 * SHA-256 zgostitev. Kdor dobi bazo, ne dobi delujočih povezav.
 *
 * Zgoščevanje brez soli je tu pravilno: žeton je 256-bitna naključna vrednost,
 * ne geslo — slovarskega napada ni.
 */

export function ustvariZeton(): { zeton: string; zgostitev: string } {
  const zeton = ZETON_PREDPONA + randomBytes(32).toString('base64url');
  return { zeton, zgostitev: zgostiZeton(zeton) };
}

export function zgostiZeton(zeton: string): string {
  return createHash('sha256').update(zeton).digest('hex');
}

/** Oblika žetona še pred poizvedbo v bazo — nič neveljavnega ne pride do nje. */
export function jeVeljavnaOblika(zeton: string): boolean {
  return /^vp_[A-Za-z0-9_-]{43}$/.test(zeton);
}

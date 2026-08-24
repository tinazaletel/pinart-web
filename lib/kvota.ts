import { berljivaVelikost } from '@/lib/priponke';
import type { PaketId } from '@/lib/paketi';

const MB = 1024 * 1024;
const GB = 1024 * MB;

export const KVOTE: Record<PaketId, number> = {
  free: 100 * MB,
  premium: GB,
  pro: 5 * GB,
};

const nenegativno = (vrednost: number) => Number.isFinite(vrednost) ? Math.max(0, vrednost) : 0;

export function jeSeProstora(porabljeno: number, kvota: number, dodatek: number): boolean {
  const meja = nenegativno(kvota);
  if (meja <= 0) return false;
  return nenegativno(porabljeno) + nenegativno(dodatek) <= meja;
}

export function odstotekKvote(porabljeno: number, kvota: number): number {
  const meja = nenegativno(kvota);
  if (meja <= 0) return 0;
  return Math.min(100, Math.max(0, nenegativno(porabljeno) / meja * 100));
}

export function stanjeKvote(porabljeno: number, kvota: number): 'ok' | 'opozorilo' | 'polno' {
  const meja = nenegativno(kvota);
  if (meja <= 0 || nenegativno(porabljeno) >= meja) return 'polno';
  return odstotekKvote(porabljeno, meja) >= 80 ? 'opozorilo' : 'ok';
}

export function besediloKvote(porabljeno: number, kvota: number, jeEn = false): string {
  const poraba = berljivaVelikost(nenegativno(porabljeno), jeEn ? '.' : ',');
  const meja = berljivaVelikost(nenegativno(kvota), jeEn ? '.' : ',');
  return jeEn ? `You have used ${poraba} of ${meja}` : `Porabila si ${poraba} od ${meja}`;
}

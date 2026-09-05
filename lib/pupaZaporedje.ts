'use client';

/* PUPA PRIPRAVI ZAPOREDJE — pogovor namesto praznega obrazca.
 *
 * Tinina zahteva (1. 9. 2026): »s Pupo se pogovarjam in mi odpre ta panel in
 * notri mi da podatke, jaz pa rečem: ne, daj še to, pa to popravi.« Torej ni
 * orodje, ki ga odpreš in izpolniš, ampak predlog, ki ga popravljaš.
 *
 * Pupa vrne SAMO JSON; tu ga izluščimo in preverimo. Ce vrne kaj drugega
 * (razlago, opravicilo, kodni blok), vzamemo prvi objekt v besedilu — model
 * se pri strogi obliki vcasih zmoti, uporabnica pa ne sme videti napake.
 */

import type { KampanjaKorak } from './marketing';

export type PupaPredlog = {
  naslov: string;
  koraki: KampanjaKorak[];
  /** Ena poved, ki jo pokažemo uporabnici nad panelom. */
  povzetek?: string;
};

const OBLIKA = `Odgovori SAMO z JSON objektom, brez uvoda, brez razlage in brez kodnih blokov:
{"naslov":"ime kampanje","povzetek":"ena poved, kaj si pripravila","koraki":[{"zamikDni":0,"naslov":"naslov sporocila","besedilo":"besedilo sporocila"}]}
Pravila: zamikDni je celo stevilo dni od zacetka kampanje (prvi korak je obicajno 0);
korakov naj bo od 2 do 5; besedila naj bodo v slovenscini, topla in kratka (najvec 6 povedi),
brez oglatih oklepajev in brez izmisljenih podatkov o stranki.`;

function izlusciJson(besedilo: string): unknown | null {
  const brezOgraje = besedilo.replace(/```json/gi, '').replace(/```/g, '').trim();
  try { return JSON.parse(brezOgraje); } catch { /* poskusimo najti objekt v besedilu */ }
  const zac = brezOgraje.indexOf('{');
  const kon = brezOgraje.lastIndexOf('}');
  if (zac === -1 || kon <= zac) return null;
  try { return JSON.parse(brezOgraje.slice(zac, kon + 1)); } catch { return null; }
}

function ocistiPredlog(surovo: unknown): PupaPredlog | null {
  if (!surovo || typeof surovo !== 'object') return null;
  const o = surovo as Record<string, unknown>;
  const koraki = Array.isArray(o.koraki) ? o.koraki : [];
  const ocisceni: KampanjaKorak[] = koraki
    .map(k => (k && typeof k === 'object' ? k as Record<string, unknown> : {}))
    .map(k => ({
      zamikDni: Math.max(0, Math.round(Number(k.zamikDni) || 0)),
      naslov: String(k.naslov || '').slice(0, 120),
      besedilo: String(k.besedilo || '').slice(0, 2000),
    }))
    .filter(k => k.naslov || k.besedilo)
    .slice(0, 8);
  if (!ocisceni.length) return null;
  return {
    naslov: String(o.naslov || '').slice(0, 120),
    povzetek: o.povzetek ? String(o.povzetek).slice(0, 300) : undefined,
    koraki: ocisceni,
  };
}

async function vprasaj(vprasanje: string, kontekst: string): Promise<{ predlog?: PupaPredlog; napaka?: string }> {
  try {
    const r = await fetch('/api/pupa', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ vprasanje, kontekst }),
    });
    const d = await r.json();
    if (d.napaka) return { napaka: String(d.napaka) };
    if (d.brezKljuca) return { napaka: String(d.odgovor || '') };
    const predlog = ocistiPredlog(izlusciJson(String(d.odgovor || '')));
    if (!predlog) return { napaka: 'Pupa je odgovorila, a predloga nisem razumel. Poskusi povedati bolj konkretno.' };
    return { predlog };
  } catch {
    return { napaka: 'Pupa se ni odzvala. Poskusi znova.' };
  }
}

/** Prvi predlog iz proste zahteve (»pripravi dobrodošlico za Rokusa«). */
export function pripraviZaporedje(zahteva: string, kontekst: string) {
  return vprasaj(
    `Pripravi zaporedje e-poštnih sporočil za stranko. Zahteva uporabnika ali uporabnice: "${zahteva}".\n\n${OBLIKA}`,
    kontekst,
  );
}

/** Popravek že pripravljenega zaporedja (»drugo sporočilo daj čez teden«). */
export function popraviZaporedje(navodilo: string, trenutno: PupaPredlog, kontekst: string) {
  return vprasaj(
    `To je trenutno zaporedje: ${JSON.stringify(trenutno)}.\n`
    + `Uporabnica želi popravek: "${navodilo}".\n`
    + `Vrni CELO popravljeno zaporedje, ne le spremenjenega koraka.\n\n${OBLIKA}`,
    kontekst,
  );
}

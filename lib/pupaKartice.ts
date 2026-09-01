'use client';

/* ŽIVE KARTICE — kar Pupa gradi, se vidi okoli pogovora.
 *
 * Tinina zahteva (1. 9. 2026, 02:10): »tako kot te plavajoče kartice izginejo in
 * se pojavijo nove — če delam projekt, se napiše Projekt pa Brief, in potem se
 * kartice širijo, stvari se dopisujejo, združujejo. Izgleda kot live thinking.«
 *
 * Zato kartice na Pupinem domu niso več fiksen seznam števcev, ampak stanje
 * dela, ki nastaja. Pupa ga spreminja z UKAZI, ne z besedilom: na konec odgovora
 * pripne strojni blok, ki ga uporabnica nikoli ne vidi.
 *
 * Zakaj ukazi in ne cel seznam: če bi Pupa vsakič vrnila vse kartice, bi ob
 * vsakem odgovoru vse odplavale in se znova pojavile. Z ukazi se premakne samo
 * tisto, kar se je res spremenilo — in to je razlika med »živo« in »utripa«.
 */

export type ZivaKartica = {
  id: string;
  labela: string;
  vrednost: string;
  vrstice?: string[];
  /** Barvni ton kartice (isti zapis kot pri obstoječih karticah doma). */
  h: number;
};

type Ukaz =
  | { ukaz: 'dodaj' | 'posodobi'; id: string; labela?: string; vrednost?: string; vrstice?: string[] }
  | { ukaz: 'odstrani'; id: string };

const ZACETEK = '[KARTICE]';
const KONEC = '[/KARTICE]';

/* Toni so isti kot pri obstoječih karticah; nova kartica dobi naslednjega po
   vrsti, da se barve ne ponavljajo druga ob drugi. */
const TONI = [297, 200, 150, 25, 60, 320, 250];

export const NAVODILO_KARTIC = `
Ob koncu odgovora VEDNO pripni strojni blok s karticami, ki povzemajo, kaj gradiva. Uporabnica ga ne vidi.
Oblika (brez besedila okoli, na koncu odgovora):
[KARTICE]{"kartice":[{"ukaz":"dodaj","id":"projekt","labela":"Projekt","vrednost":"Kavarna Luna","vrstice":["rok: konec septembra","spletna stran"]}]}[/KARTICE]
Pravila:
- »dodaj« za novo kartico, »posodobi« za obstojeco (isti id), »odstrani«, ko stvar ni vec del pogovora.
- id je kratek in stalen: projekt, stranka, brief, ponudba, roki, cena, naloge.
- labela je ena beseda ali dve; vrednost je kratka (ime stranke, znesek, stevilo).
- vrstice so najvec tri, vsaka najvec sest besed.
- Ce se ni nic spremenilo, vrni {"kartice":[]}.
`.trim();

/** Loči odgovor za uporabnico od strojnega bloka. */
export function izlusciKartice(besedilo: string): { besedilo: string; ukazi: Ukaz[] } {
  const zac = besedilo.indexOf(ZACETEK);
  if (zac === -1) return { besedilo, ukazi: [] };
  const kon = besedilo.indexOf(KONEC, zac);
  const surovo = besedilo.slice(zac + ZACETEK.length, kon === -1 ? undefined : kon).trim();
  const cisto = (besedilo.slice(0, zac) + (kon === -1 ? '' : besedilo.slice(kon + KONEC.length))).trim();
  try {
    const podatki = JSON.parse(surovo) as { kartice?: unknown };
    const seznam = Array.isArray(podatki.kartice) ? podatki.kartice : [];
    const ukazi = seznam
      .map(v => (v && typeof v === 'object' ? v as Record<string, unknown> : null))
      .filter((v): v is Record<string, unknown> => Boolean(v) && typeof v!.id === 'string')
      .map(v => {
        const id = String(v.id).slice(0, 40);
        if (v.ukaz === 'odstrani') return { ukaz: 'odstrani', id } as Ukaz;
        return {
          ukaz: v.ukaz === 'posodobi' ? 'posodobi' : 'dodaj',
          id,
          labela: v.labela ? String(v.labela).slice(0, 40) : undefined,
          vrednost: v.vrednost !== undefined ? String(v.vrednost).slice(0, 40) : undefined,
          vrstice: Array.isArray(v.vrstice)
            ? v.vrstice.slice(0, 3).map(x => String(x).slice(0, 60))
            : undefined,
        } as Ukaz;
      });
    return { besedilo: cisto, ukazi };
  } catch {
    /* Če blok ni razumljiv, ga samo odrežemo — uporabnica ne sme videti JSON. */
    return { besedilo: cisto, ukazi: [] };
  }
}

/** Novo stanje kartic po Pupinih ukazih. Vrstni red obstoječih se ohrani. */
export function uporabiUkaze(trenutne: ZivaKartica[], ukazi: Ukaz[]): ZivaKartica[] {
  let izid = [...trenutne];
  for (const u of ukazi) {
    if (u.ukaz === 'odstrani') {
      izid = izid.filter(k => k.id !== u.id);
      continue;
    }
    const obstoj = izid.findIndex(k => k.id === u.id);
    if (obstoj >= 0) {
      const stara = izid[obstoj];
      izid[obstoj] = {
        ...stara,
        labela: u.labela ?? stara.labela,
        vrednost: u.vrednost ?? stara.vrednost,
        /* Vrstice se DOPISUJEJO, ne prepisujejo: Pupa doda, kar je novega,
           kartica pa raste — tako je videti, da se stvar gradi. */
        vrstice: u.vrstice
          ? [...new Set([...(stara.vrstice || []), ...u.vrstice])].slice(0, 4)
          : stara.vrstice,
      };
      continue;
    }
    izid.push({
      id: u.id,
      labela: u.labela || u.id,
      vrednost: u.vrednost || '',
      vrstice: u.vrstice,
      h: TONI[izid.length % TONI.length],
    });
  }
  /* Šest kartic je zgornja meja: prostor okoli pogovora je omejen, najstarejša
     odplava. */
  return izid.slice(-6);
}

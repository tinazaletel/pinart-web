/* PRAVICE V PONUDBI IN POGODBI — besedila treh stanj.
 *
 * Model »predlagaj → potrdi« (Tina, 26. 8. 2026): pri vsaki storitvi Flow
 * predlaga znesek pravic, uporabnica s kljukico potrdi, kljukica pa pove, KAKO
 * gre v ponudbo. Neoznačeno pomeni brez ločenega doplačila, NE brez pravic —
 * naročnik delo sme uporabljati za dogovorjeni namen. Dokumenti so ta tretja
 * stanja do 4. 9. 2026 molčali: ponudba je izpisala samo storitve z zneskom,
 * pogodba pa se je sklicevala na ponudbo. Besedila je potrdila Tina 4. 9. 2026.
 *
 * Pravno besedilo: gre v paket za odvetnika kot vsa druga.
 */

export type PraviceNacin = 'posebej' | 'vkljuceno' | undefined;

export type PraviceVrsticaZaStavek = {
  nacin: PraviceNacin;
  /** dogovorjeni obseg uporabe, npr. »splet in tisk« */
  obseg: string;
  /** vrsta prenosa, npr. »izključni prenos« */
  vrsta: string;
  /** trajanje, npr. »3 leta« */
  trajanje: string;
  /** znesek z valuto ali »prek letne licence« */
  znesek: string;
};

/** Stavek za eno storitev v razdelku Avtorske pravice ponudbe (brez uvodne pike). */
export function stavekPravicVPonudbi(p: PraviceVrsticaZaStavek, jeEn: boolean): string {
  const podrobno = `${p.vrsta}, ${p.trajanje}`;
  if (p.nacin === 'posebej') {
    return jeEn
      ? `usage rights for ${p.obseg} (${podrobno}) are a separate item: ${p.znesek}`
      : `pravice uporabe za ${p.obseg} (${podrobno}) so ločena postavka: ${p.znesek}`;
  }
  if (p.nacin === 'vkljuceno') {
    return jeEn
      ? `usage rights for ${p.obseg} (${podrobno}) are included in the service price`
      : `pravice uporabe za ${p.obseg} (${podrobno}) so vključene v ceno storitve`;
  }
  return stavekBrezDoplacila(jeEn);
}

/** Neoznačeno stanje — velja za storitev ali za celo ponudbo, kadar nič ni ločena postavka. */
export function stavekBrezDoplacila(jeEn: boolean): string {
  return jeEn
    ? 'the client acquires the right to use the work for the agreed purpose at no separate charge; broader or exclusive use is agreed separately'
    : 'naročnik pridobi pravico uporabe dela za dogovorjeni namen brez ločenega doplačila; širša ali izključna uporaba se dogovori posebej';
}

/** Dodatek k členu o avtorskih pravicah v pogodbi — ista logika kot v ponudbi. */
export const POGODBA_PRAVICE_DODATEK = {
  sl: 'Kjer ponudba pravic ne navaja posebej, naročnik pridobi pravico uporabe dela za dogovorjeni namen brez ločenega doplačila; širša ali izključna uporaba se dogovori posebej. Moralne avtorske pravice ostanejo avtorju.',
  en: 'Where the offer does not list rights separately, the client acquires the right to use the work for the agreed purpose at no separate charge; broader or exclusive use is agreed separately. Moral rights remain with the author.',
};

/* CENA NAROČNINE — katera ponudba komu pripada in po kateri ceni.
 *
 * Zakaj to sploh obstaja: uporabnici obljubimo, da »cena ostane enaka ves čas
 * neprekinjene naročnine«. Če bi ceno ob vsakem obračunu brali iz veljavnega
 * cenika, bi jim prvi dvig ceno tiho povišal in obljuba bi padla. Zato se cena
 * ob prijavi IZRAČUNA tu, nato pa ZAPIŠE na naročnino (organization_subscriptions)
 * in se od tam bere do konca naročnine.
 *
 * Vse funkcije so čiste: datum in število ustanovnih članov vstopata kot
 * parametra, nikoli new Date() med izvajanjem (glej DESIGN.md, točka 10).
 *
 * Ameriški cenik je od 26. 8. 2026 tu (Tina: »za američane druge cene«).
 * Davek in obračun v valuti prevzame Merchant of Record (Paddle / Lemon
 * Squeezy), številke pa morajo biti naše — sicer bi ameriški obiskovalec videl
 * evrsko ceno, preračunano po dnevnem tečaju, in nikoli iste številke dvakrat.
 */

import type { PaketId } from '@/lib/paketi';

export type Obdobje = 'mesec' | 'leto';

/* Katera od treh ravni ponudbe velja za novega naročnika. */
export type Ponudba = 'ustanovna' | 'uvodna' | 'redna';

/* Koliko ustanovnih članov sprejmemo, preden ponudba ugasne. */
export const USTANOVNIH_MEST = 50;

/* Zadnji dan, ko je uvodna cena še na voljo (vključno). */
export const UVODNA_DO = '2026-10-31';

/* Cene v evrih na mesec. Pri letnem plačilu je to cena na mesec, obračunana
   enkrat letno — številka, ki jo uporabnica vidi, ne skupni znesek. */
export const CENIK: Record<Ponudba, Record<Exclude<PaketId, 'free'>, Record<Obdobje, number>>> = {
  ustanovna: {
    premium: { mesec: 9, leto: 9 },
    pro: { mesec: 9, leto: 9 },
  },
  uvodna: {
    premium: { mesec: 15, leto: 15 },
    pro: { mesec: 29, leto: 29 },
  },
  redna: {
    premium: { mesec: 19, leto: 15 },
    pro: { mesec: 39, leto: 29 },
  },
};

/* Cene v dolarjih na mesec. Niso preracun evrskih — ameriski B2B trg prenese
   visjo ceno, zato so zaokrozene na svoje stopnice (predlog 26. 8. 2026). */
export const CENIK_USD: Record<Ponudba, Record<Exclude<PaketId, 'free'>, Record<Obdobje, number>>> = {
  ustanovna: {
    premium: { mesec: 15, leto: 15 },
    pro: { mesec: 29, leto: 29 },
  },
  uvodna: {
    premium: { mesec: 19, leto: 19 },
    pro: { mesec: 39, leto: 39 },
  },
  redna: {
    premium: { mesec: 24, leto: 19 },
    pro: { mesec: 49, leto: 39 },
  },
};

export type Valuta = 'EUR' | 'USD';

/** Cenik za dano valuto. Privzeto evrski — ameriski samo, kadar ga izrecno zahtevamo. */
export function cenikZa(valuta: Valuta = 'EUR') {
  return valuta === 'USD' ? CENIK_USD : CENIK;
}

export const ZNAK_VALUTE: Record<Valuta, string> = { EUR: '€', USD: '$' };

/**
 * Katera valuta pripada obiskovalcu iz dane drzave (koda ISO-3166, npr. »US«).
 *
 * Prikaz doloci LOKACIJA, obracun pa placilno sredstvo — kartica z americko
 * banko pri Merchant of Record vseeno pade v dolarje, tudi ce je stran
 * pokazala evre. Zato je to samo prikaz in nikoli zapis na narocnino.
 */
export function valutaZaDrzavo(koda?: string | null): Valuta {
  return (koda || '').trim().toUpperCase() === 'US' ? 'USD' : 'EUR';
}

const naDan = (v: string | Date): string => {
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * Katera ponudba pripada nekomu, ki se naroči na dani dan.
 *
 * Vrstni red je namenoma tak: ustanovna mesta se porabijo prva, uvodna velja do
 * vključno UVODNA_DO, po tem redna. Neveljaven datum pade na redno — nikoli na
 * ugodnejšo, da napaka ne razdaja popustov.
 */
export function dolociPonudbo(danes: string | Date, steviloUstanovnih: number): Ponudba {
  const dan = naDan(danes);
  if (!dan) return 'redna';
  const zasedenih = Number.isFinite(steviloUstanovnih) ? Math.max(0, Math.floor(steviloUstanovnih)) : USTANOVNIH_MEST;
  if (zasedenih < USTANOVNIH_MEST) return 'ustanovna';
  return dan <= UVODNA_DO ? 'uvodna' : 'redna';
}

/** Cena na mesec za dano ponudbo, paket in obdobje (privzeto v evrih). */
export function cenaZa(ponudba: Ponudba, paket: PaketId, obdobje: Obdobje, valuta: Valuta = 'EUR'): number | null {
  if (paket === 'free') return 0;
  const zaPonudbo = cenikZa(valuta)[ponudba];
  if (!zaPonudbo) return null;
  const zaPaket = zaPonudbo[paket];
  if (!zaPaket) return null;
  return zaPaket[obdobje] ?? null;
}

/* Zapis, ki gre na naročnino ob prijavi. Od tu naprej je cena zaklenjena. */
export type ZaklenjenaCena = {
  ponudba: Ponudba;
  paket: PaketId;
  obdobje: Obdobje;
  znesek: number;
  valuta: 'EUR';
  /* null pomeni TRAJNO ob neprekinjeni naročnini (ustanovna in uvodna). */
  veljaDo: string | null;
};

export function zakleniCeno(
  paket: PaketId,
  obdobje: Obdobje,
  danes: string | Date,
  steviloUstanovnih: number,
): ZaklenjenaCena | null {
  const ponudba = dolociPonudbo(danes, steviloUstanovnih);
  const znesek = cenaZa(ponudba, paket, obdobje);
  if (znesek == null) return null;
  return { ponudba, paket, obdobje, znesek, valuta: 'EUR', veljaDo: null };
}

/**
 * Ali sme naročnina obdržati zaklenjeno ceno?
 *
 * Obljuba velja samo ob NEPREKINJENI naročnini. Če je bila enkrat odpovedana in
 * se človek pozneje vrne, velja takratna redna cena — to je zapisano tudi v
 * ceniku, zato mora koda ravnati enako.
 */
export function ohraniZaklenjenoCeno(stanje: string, jeBilaPrekinjena: boolean): boolean {
  return !jeBilaPrekinjena && (stanje === 'active' || stanje === 'trialing' || stanje === 'past_due');
}

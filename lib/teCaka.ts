/* KAJ TE ČAKA — koliko stvari visi na tebi, brez modela in brez omrežja.
 *
 * Nadzorna plošča ima seznam »Kaj čaka nate«; Pupin dom pa je imel samo števce
 * (»250 € za plačilo«), ki povedo stanje, ne pa dejanja. Ta izračun premosti
 * razliko: prešteje, koliko stvari zares čaka, da prvi mehurček lahko pove
 * »Te čaka 3« namesto »Naloge danes 0« (Tina, 29. 8. 2026).
 *
 * Čista funkcija: datum vstopa kot parameter, nikoli new Date() med izvajanjem.
 */

export type VrstaCakanja = 'racun' | 'ponudba' | 'pogodba' | 'licenca';

export type Cakajoce = {
  vrsta: VrstaCakanja;
  kdo: string;
  /* Koliko dni že čaka (pri licenci: koliko dni je še do poteka). */
  dni: number;
  /* Datum, ki šteje: rok plačila, dan pošiljanja, dan poteka licence. */
  datum: string;
  /* Naslov ponudbe ali pogodbe, kadar obstaja — da vrstica pove, o čem teče. */
  naslov?: string;
};

export type ZaCakanje = {
  invoices?: { client?: string; amount?: number; paid?: boolean; status?: string; date?: string; dueDays?: number }[];
  offers?: { client?: string; title?: string; status?: string; date?: string; licencaDo?: string }[];
  contracts?: { client?: string; status?: string; date?: string }[];
};

const dan = 24 * 60 * 60 * 1000;

const razlikaDni = (od: string | undefined, danes: Date): number | null => {
  if (!od) return null;
  const d = new Date(od);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((danes.getTime() - d.getTime()) / dan);
};

/* Po koliko dneh brez odgovora je ponudba »v čakanju«. Prej ni vljudno
   priganjati, pozneje pa je posel že hladen. */
export const PONUDBA_TIHO_DNI = 10;
/* Koliko dni pred potekom licence je vredno opozoriti. */
export const LICENCA_OPOZORILO_DNI = 30;

export function kajTeCaka(podatki: ZaCakanje, danes: Date): Cakajoce[] {
  const izid: Cakajoce[] = [];

  /* Zamujeni računi — rok je datum izdaje plus dogovorjeni dnevi. */
  for (const r of podatki.invoices || []) {
    if (r.paid || r.status === 'paid' || r.status === 'draft' || r.status === 'cancelled') continue;
    const odIzdaje = razlikaDni(r.date, danes);
    if (odIzdaje == null) continue;
    const zamuda = odIzdaje - (Number.isFinite(r.dueDays) ? Number(r.dueDays) : 8);
    if (zamuda > 0) {
      const rok = new Date(new Date(r.date as string).getTime() + (Number.isFinite(r.dueDays) ? Number(r.dueDays) : 8) * dan);
      izid.push({ vrsta: 'racun', kdo: r.client || '', dni: zamuda, datum: rok.toISOString().slice(0, 10) });
    }
  }

  /* Poslane ponudbe brez odgovora. Osnutki in že odgovorjene ne štejejo. */
  for (const p of podatki.offers || []) {
    if (p.status !== 'sent') continue;
    const cakaZe = razlikaDni(p.date, danes);
    if (cakaZe != null && cakaZe >= PONUDBA_TIHO_DNI) izid.push({ vrsta: 'ponudba', kdo: p.client || '', dni: cakaZe, datum: String(p.date), naslov: p.title });
  }

  /* Pogodbe, ki še niso podpisane. */
  for (const p of podatki.contracts || []) {
    if (p.status === 'signed' || p.status === 'active') continue;
    const cakaZe = razlikaDni(p.date, danes);
    if (cakaZe != null && cakaZe >= 3) izid.push({ vrsta: 'pogodba', kdo: p.client || '', dni: cakaZe, datum: String(p.date) });
  }

  /* Licence pred potekom — priložnost za podaljšanje, ne opozorilo. */
  for (const p of podatki.offers || []) {
    if (!p.licencaDo) continue;
    const doPoteka = -(razlikaDni(p.licencaDo, danes) ?? -9999);
    if (doPoteka >= 0 && doPoteka <= LICENCA_OPOZORILO_DNI) izid.push({ vrsta: 'licenca', kdo: p.client || '', dni: doPoteka, datum: String(p.licencaDo), naslov: p.title });
  }

  /* Najbolj zamujeno na vrh; pri licencah tisto, kar poteče najprej. */
  return izid.sort((a, b) => (a.vrsta === 'licenca' ? -a.dni : a.dni) < (b.vrsta === 'licenca' ? -b.dni : b.dni) ? 1 : -1);
}

/** Kratek opis prve stvari — za namig ob številki. */
export function opisPrve(c: Cakajoce | undefined, jeEn = false): string {
  if (!c) return '';
  const kdo = c.kdo || (jeEn ? 'a client' : 'stranka');
  if (c.vrsta === 'racun') return jeEn ? `${kdo} — invoice overdue ${c.dni} d` : `${kdo} — račun zamuja ${c.dni} dni`;
  if (c.vrsta === 'ponudba') return jeEn ? `${kdo} — quote sent ${c.dni} d ago` : `${kdo} — ponudba poslana pred ${c.dni} dnevi`;
  if (c.vrsta === 'pogodba') return jeEn ? `${kdo} — contract unsigned` : `${kdo} — pogodba ni podpisana`;
  return jeEn ? `${kdo} — licence expires in ${c.dni} d` : `${kdo} — licenca poteče čez ${c.dni} dni`;
}

/* Vrstica v obliki »30. avg · Pošlji opomin za račun · Rokus Klett«.
 * Datum in dejanje spredaj, ime zadaj — tako se seznam bere kot opravilnik,
 * ne kot poročilo o stanju (Tina, 29. 8. 2026). */
const DEJANJE: Record<VrstaCakanja, [string, string]> = {
  racun: ['Pošlji opomin za račun', 'Send a reminder for the invoice'],
  ponudba: ['Preveri ponudbo', 'Follow up on the offer'],
  pogodba: ['Uredi podpis pogodbe', 'Chase the contract signature'],
  licenca: ['Podaljšaj licenco', 'Renew the licence'],
};

export function vrsticaOpomnika(c: Cakajoce, jeEn = false): string {
  const d = new Date(c.datum);
  const datum = Number.isNaN(d.getTime())
    ? ''
    : new Intl.DateTimeFormat(jeEn ? 'en-GB' : 'sl-SI', { day: 'numeric', month: 'short' }).format(d).replace('.', '');
  const dejanje = DEJANJE[c.vrsta][jeEn ? 1 : 0] + (c.naslov ? ` ${c.naslov}` : '');
  return [datum, dejanje, c.kdo].filter(Boolean).join(' · ');
}

/* Kam pelje posamezna vrstica — račun k računom, ponudba k projektom,
   pogodba k pogodbam, licenca k stranki. Klik naj pripelje tja, kjer se stvar
   uredi, ne na skupni pregled (Tina, 29. 8. 2026). */
const POT: Record<VrstaCakanja, string> = {
  racun: '/kalkulator/racuni',
  ponudba: '/kalkulator/projekti',
  pogodba: '/kalkulator/pogodbe',
  licenca: '/kalkulator/stranke',
};

export function potOpomnika(c: Cakajoce, base = ''): string {
  return `${base}${POT[c.vrsta]}`;
}

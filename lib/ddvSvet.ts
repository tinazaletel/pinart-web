/* DDV svetovalec — iz OPISA postavke predlaga znižano stopnjo DDV (SLO):
   - knjige / publikacije / časopisi: 5 % (super-znižana, ZDDV-1, od 2020)
   - živila / zdravila / voda ...: 9,5 % (znižana)
   - ostalo: 22 % (splošna)
   To je POMOČ, ne davčni nasvet — stopnjo naj uporabnica potrdi z računovodstvom.
   Deljeno med računom (InvoiceWorkspace) in ponudbo (KalkulatorApp). */

export type DdvPredlog = { stopnja: string; razlog: string } | null;

const SKUPINE: { kljucne: string[]; stopnja: string; razlog: string }[] = [
  { kljucne: ['knjig', 'učbenik', 'ucbenik', 'publikacij', 'revij', 'časopis', 'casopis', 'monografij', 'zbornik', 'slikanic', 'brošur', 'brosur', 'katalog'], stopnja: '5', razlog: 'Knjige/publikacije imajo v SLO znižano stopnjo DDV (5 %).' },
  { kljucne: ['živil', 'zivil', 'hrana', 'prehran', 'sadje', 'zelenjav', 'kruh', 'pijač', 'pijac'], stopnja: '9.5', razlog: 'Živila imajo znižano stopnjo DDV (9,5 %).' },
  { kljucne: ['zdravil', 'medicin'], stopnja: '9.5', razlog: 'Zdravila imajo znižano stopnjo DDV (9,5 %).' },
  { kljucne: ['vstopnic', 'prireditev', 'koncert', 'muzej', 'razstav'], stopnja: '9.5', razlog: 'Vstopnice za prireditve imajo znižano stopnjo DDV (9,5 %).' },
];

/* vrne predlog, ČE opis nakazuje znižano stopnjo IN se razlikuje od trenutne; sicer null */
export function predlagajDdv(opis: string, trenutna: string): DdvPredlog {
  const o = (opis || '').toLocaleLowerCase('sl-SI');
  if (!o.trim()) return null;
  for (const s of SKUPINE) {
    if (s.kljucne.some(k => o.includes(k))) {
      return trenutna === s.stopnja ? null : { stopnja: s.stopnja, razlog: s.razlog };
    }
  }
  return null;
}

export const DDV_DISCLAIMER = 'Predlog, ne davčni nasvet — stopnjo potrdi z računovodstvom.';

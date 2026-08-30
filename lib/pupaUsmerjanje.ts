/* PUPA BREZ MODELA — usmerjanje namesto opravičila.
 *
 * Doslej je Pupa brez AI ključa rekla samo »ne morem do svojih možganov« in
 * uporabnik je ostal praznih rok. Za usmerjanje pa model sploh ni potreben:
 * dovolj je poznati Flow. Brezplačni paket tako dobi nekaj koristnega, Premium
 * brez priklopljenega ključa pa ne obtiči.
 *
 * Vse je čisto in brez omrežja — funkcija dobi vprašanje in vrne cilje.
 * Namenoma NE ugiba: če se nič ne ujame, ponudi glavna orodja, ne pa
 * najbližjega zadetka po sili.
 */

export type Cilj = {
  id: string;
  pot: string;          /* brez jezikovne predpone */
  ime: string;
  imeEn: string;
  opis: string;
  opisEn: string;
  kljucne: string[];    /* poenostavljeno: male črke, brez šumnikov */
};

/* Šumnike odstranimo, da »ponudba« najde tudi »ponudbo« in »POGODBA« najde
   »pogodbe«. Isti prijem kot pri iskalniku podjetij. */
export const poenoti = (s: string): string =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export const CILJI: Cilj[] = [
  { id: 'kalkulator', pot: '/kalkulator/orodje', ime: 'Kalkulator cene', imeEn: 'Price calculator',
    opis: 'Izračun cene projekta in priprava ponudbe.', opisEn: 'Work out a price and prepare a quote.',
    kljucne: ['cena', 'ceno', 'koliko', 'zaracunam', 'zaracunati', 'ponudba', 'ponudbo', 'izracun', 'kalkulator', 'oceni', 'ocena', 'predracun'] },
  { id: 'pogodbe', pot: '/kalkulator/pogodbe', ime: 'Pogodbe', imeEn: 'Contracts',
    opis: 'Pogodbe, podpis in avtorske pravice.', opisEn: 'Contracts, signing and copyright.',
    kljucne: ['pogodba', 'pogodbo', 'pogodbe', 'podpis', 'podpisati', 'avtorske', 'pravice', 'licenca', 'licenco'] },
  { id: 'racuni', pot: '/kalkulator/racuni', ime: 'Računi', imeEn: 'Invoices',
    opis: 'Izdaja računov in pregled plačil.', opisEn: 'Issue invoices and track payments.',
    kljucne: ['racun', 'racune', 'racuni', 'faktura', 'placilo', 'placila', 'neplacano', 'opomin', 'ddv'] },
  { id: 'stranke', pot: '/kalkulator/stranke', ime: 'Stranke', imeEn: 'Clients',
    opis: 'Kartoteka strank, kontakti in dnevnik.', opisEn: 'Client records, contacts and journal.',
    kljucne: ['stranka', 'stranke', 'naroc', 'narocnik', 'kontakt', 'kontakti', 'crm', 'podjetje'] },
  { id: 'projekti', pot: '/kalkulator/projekti', ime: 'Projekti', imeEn: 'Projects',
    opis: 'Projekti, dokumenti in stanje dela.', opisEn: 'Projects, documents and status.',
    kljucne: ['projekt', 'projekti', 'projekta', 'delo', 'arhiv', 'mapa'] },
  { id: 'cas', pot: '/kalkulator/cas', ime: 'Štoparica', imeEn: 'Timer',
    opis: 'Merjenje časa na projektu.', opisEn: 'Track time spent on a project.',
    kljucne: ['stoparica', 'koliko ur', 'porabil', 'porabljen', 'merjenje casa', 'ure na projektu', 'ure', 'uro'] },
  { id: 'evidenca', pot: '/kalkulator/evidenca-casa', ime: 'Evidenca časa', imeEn: 'Attendance log',
    opis: 'Prisotnost po ZEPDSV — prihod, malica, odhod.', opisEn: 'Legal attendance log — arrival, break, departure.',
    kljucne: ['evidenca', 'prisotnost', 'zepdsv', 'prihod', 'odhod', 'malica', 'delovni cas'] },
  { id: 'stroski', pot: '/kalkulator/stroski', ime: 'Stroški', imeEn: 'Costs',
    opis: 'Stroški in kaj ti ostane.', opisEn: 'Costs and what is left.',
    kljucne: ['strosek', 'stroski', 'izdatek', 'odhodki', 'nabava'] },
  { id: 'cilji', pot: '/kalkulator/cilji', ime: 'Cilji', imeEn: 'Goals',
    opis: 'Mesečni cilji in prihodki.', opisEn: 'Monthly goals and revenue.',
    kljucne: ['cilj', 'cilji', 'prihodek', 'prihodki', 'promet', 'zasluzek'] },
  { id: 'koledar', pot: '/kalkulator/koledar', ime: 'Koledar', imeEn: 'Calendar',
    opis: 'Roki, sestanki in obveznosti.', opisEn: 'Deadlines, meetings and commitments.',
    kljucne: ['koledar', 'rok', 'roki', 'sestanek', 'termin', 'datum'] },
  { id: 'naloge', pot: '/kalkulator/naloge', ime: 'Naloge', imeEn: 'Tasks',
    opis: 'Naloge in podnaloge.', opisEn: 'Tasks and subtasks.',
    kljucne: ['naloga', 'naloge', 'opravilo', 'seznam', 'todo'] },
  { id: 'sef', pot: '/kalkulator/sef', ime: 'Sef avtorstva', imeEn: 'Authorship vault',
    opis: 'Časovni žig, ki dokaže, kdaj je delo nastalo.', opisEn: 'Timestamp proving when the work existed.',
    kljucne: ['sef', 'avtorstvo', 'dokaz', 'zig', 'zascita', 'kraja'] },
  { id: 'ceniki', pot: '/kalkulator/ceniki', ime: 'Ceniki', imeEn: 'Price lists',
    opis: 'Tvoje cenovne osnove in profili.', opisEn: 'Your price bases and profiles.',
    kljucne: ['cenik', 'ceniki', 'postavka', 'urna', 'tarifa'] },
  { id: 'paket', pot: '/kalkulator/paket', ime: 'Paket in naročnina', imeEn: 'Plan and subscription',
    opis: 'Kateri paket imaš in kako ga urediš.', opisEn: 'Your plan and how to manage it.',
    kljucne: ['paket', 'narocnina', 'narocnino', 'nadgradnja', 'premium', 'odpoved'] },
];

/** Cilji, ki se ujemajo z vprašanjem, urejeni po številu zadetkov. Največ trije. */
export function usmeri(vprasanje: string): Cilj[] {
  const v = poenoti(String(vprasanje || ''));
  if (v.trim().length < 2) return [];
  const zadetki = CILJI
    .map(c => ({ c, tock: c.kljucne.reduce((n, k) => n + (v.includes(k) ? k.length : 0), 0) }))
    .filter(z => z.tock > 0)
    .sort((a, b) => b.tock - a.tock)
    .slice(0, 3)
    .map(z => z.c);
  return zadetki;
}

/* Kadar se nič ne ujame, ponudimo to, kar ljudje rabijo najpogosteje —
   raje pošten razpotje kot izsiljen zadetek. */
const PRIVZETI = ['kalkulator', 'stranke', 'racuni'];

export function odgovorBrezAi(vprasanje: string, base: string, jeEn = false): {
  odgovor: string;
  predlogi: { ime: string; pot: string; opis: string }[];
} {
  const najdeni = usmeri(vprasanje);
  const cilji = najdeni.length ? najdeni : CILJI.filter(c => PRIVZETI.includes(c.id));
  const uvod = najdeni.length
    ? (jeEn ? 'I can’t think right now — no AI key is connected. But I know where this lives:'
            : 'Trenutno ne morem razmišljati, ker ni priklopljenega AI ključa. Vem pa, kje se to naredi:')
    : (jeEn ? 'I can’t think right now — no AI key is connected. Here is where most things start:'
            : 'Trenutno ne morem razmišljati, ker ni priklopljenega AI ključa. Tu se večina stvari začne:');
  return {
    odgovor: uvod,
    predlogi: cilji.map(c => ({
      ime: jeEn ? c.imeEn : c.ime,
      opis: jeEn ? c.opisEn : c.opis,
      pot: `${base}${c.pot}`,
    })),
  };
}

/**
 * Paketi — EN vir za landing in za stran v aplikaciji.
 *
 * Prej so bili zapisani samo v FlowLanding. Ko sta cenik in aplikacija dva
 * seznama, se prej ali slej razideta in uporabnik na eni strani vidi drugo
 * obljubo kot na drugi.
 *
 * Stevilke se od 26. 8. 2026 NE vpisujejo tu, ampak berejo iz
 * lib/cenaNarocnine.ts (CENIK / CENIK_USD) — tam je cena, po kateri se tudi
 * zaracuna. Tri mesta s tremi cenami so nas ze enkrat ujela.
 */

export type PaketId = 'free' | 'premium' | 'pro';

/* Finančna varovalka za Pupo na Pinartovem AI računu. Meje so na
   organizacijo in koledarski mesec; lasten AI (/api/ai/izvedi) jih ne uporablja. */
export const PUPA_MESECNE_KVOTE: Record<PaketId, number> = {
  free: 0,
  premium: 0,
  pro: 800,
};

export function pupaMesecnaKvota(paket: string): number {
  return PUPA_MESECNE_KVOTE[paket as PaketId] ?? 0;
}

/* eslint-disable-next-line @typescript-eslint/consistent-type-imports */
import { CENIK, CENIK_USD, UVODNA_DO } from '@/lib/cenaNarocnine';

/* Datum uvodne cene, zapisan po slovensko (»31. 10. 2026«) za prikaz. */
const uvodnaDoSl = (() => { const [l, m, d] = UVODNA_DO.split('-'); return `${Number(d)}. ${Number(m)}. ${l}`; })();
const uvodnaDoEn = (() => { const d = new Date(UVODNA_DO + 'T00:00:00Z'); return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }); })();

export type Paket = {
  id: PaketId;
  ime: string;
  imeEn?: string;
  za: string;
  zaEn?: string;
  cena: string;
  enota: string;
  enotaEn?: string;
  /* prečrtana redna cena, kadar velja uvodna oz. ustanovna */
  redna?: string;
  /* ista cena v dolarjih — ameriski trg ima svoje stopnice, ne preracuna */
  cenaUsd?: string;
  rednaUsd?: string;
  ustanovna?: string;
  ustanovnaEn?: string;
  /* drobni tisk pod ceno (kdaj se uvodna izteče in kaj velja potem) */
  opomba?: string;
  opombaEn?: string;
  znacka?: string;
  znackaEn?: string;
  kmalu?: boolean;
  vkljuceno: string[];
  vkljucenoEn?: string[];
};

export const PAKETI: Paket[] = [
  {
    id: 'free',
    ime: 'Brezplačno',
    imeEn: 'Free',
    za: 'Za začetek in enkratne projekte',
    zaEn: 'For getting started and one-off projects',
    cena: '0', enota: '€ za vedno', enotaEn: '€ forever',
    vkljuceno: [
      'Kalkulator poštenih cen',
      'Tri različice ponudbe za stranko',
      'Izračun avtorskih pravic in licence',
      'Oblikovana in urejljiva ponudba',
      'Izvoz v e-pošto / PDF',
      'Shranjene ponudbe v oblaku',
      'Oštevilčenje ponudb',
    ],
    vkljucenoEn: [
      'Fair price calculator',
      'Three quote versions for the client',
      'Copyright and licensing calculation',
      'Designed, editable quote',
      'Export to email / PDF',
      'Quotes saved in the cloud',
      'Quote numbering',
    ],
  },
  {
    id: 'premium',
    ime: 'Premium',
    imeEn: 'Premium',
    za: 'Za redno delo s strankami',
    zaEn: 'For regular client work',
    cena: String(CENIK.uvodna.premium.mesec), enota: '€ / mesec', enotaEn: '€ / month', redna: String(CENIK.redna.premium.mesec),
    cenaUsd: String(CENIK_USD.uvodna.premium.mesec), rednaUsd: String(CENIK_USD.redna.premium.mesec),
    ustanovna: `Ustanovna cena ${CENIK.ustanovna.premium.mesec} €/mesec za prvih 50`,
    ustanovnaEn: `Founding price $${CENIK_USD.ustanovna.premium.mesec}/month for the first 50`,
    opomba: `Uvodna cena velja do ${uvodnaDoSl}, nato ${CENIK.redna.premium.mesec} €/mesec.`,
    opombaEn: `Introductory price until ${uvodnaDoEn}, then $${CENIK_USD.redna.premium.mesec}/month.`,
    znacka: 'Najbolj priljubljeno',
    znackaEn: 'Most popular',
    vkljuceno: [
      'Vse iz Brezplačno',
      'Shranjene ponudbe, pogodbe, računi',
      'Dolgoročni retainerji',
      'Kartoteka strank',
      'Stroški in cilji',
      'Časovnik in donosnost dela',
      'Nadzorna plošča',
    ],
    vkljucenoEn: [
      'Everything in Free',
      'Saved quotes, contracts, invoices',
      'Long-term retainers',
      'Client records',
      'Costs and goals',
      'Time tracking and work profitability',
      'Dashboard',
    ],
  },
  {
    id: 'pro',
    ime: 'Pro',
    imeEn: 'Pro',
    za: 'Za polno poslovanje',
    zaEn: 'For full-scale business',
    cena: String(CENIK.uvodna.pro.mesec), enota: '€ / mesec', enotaEn: '€ / month', redna: String(CENIK.redna.pro.mesec),
    cenaUsd: String(CENIK_USD.uvodna.pro.mesec), rednaUsd: String(CENIK_USD.redna.pro.mesec),
    ustanovna: 'Uvodna cena',
    ustanovnaEn: 'Introductory price',
    opomba: `Velja do ${uvodnaDoSl}, nato ${CENIK.redna.pro.mesec} €/mesec (${CENIK.redna.pro.leto} € ob letnem plačilu).`,
    opombaEn: `Until ${uvodnaDoEn}, then $${CENIK_USD.redna.pro.mesec}/month ($${CENIK_USD.redna.pro.leto} billed yearly).`,
    znacka: 'Kmalu', znackaEn: 'Coming soon', kmalu: true,
    vkljuceno: [
      'Vse iz Premium',
      'Primerjava s trgom — koliko za to zaračunajo drugi',
      'Celoten analitični pregled — prihodki in dobiček po strankah',
      'Sinhronizacija med vsemi orodji',
      'Poslovni okvir in davki',
      'Posredovanje računovodstvu (izvoz)',
      'AI agent (beta)',
      'Sodelavci z dostopom samo do izbranih projektov',
      'MCP & API dostop (kmalu)',
      'Prednostna podpora',
    ],
    vkljucenoEn: [
      'Everything in Premium',
      'Market comparison — what others charge for this',
      'Full analytics overview — revenue and profit per client',
      'Sync across all tools',
      'Business framework and taxes',
      'Hand-off to accounting (export)',
      'AI agent (beta)',
      'Collaborators with access to selected projects only',
      'MCP & API access (coming soon)',
      'Priority support',
    ],
  },
];

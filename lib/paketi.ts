/**
 * Paketi — EN vir za landing in za stran v aplikaciji.
 *
 * Prej so bili zapisani samo v FlowLanding. Ko sta cenik in aplikacija dva
 * seznama, se prej ali slej razideta in uporabnik na eni strani vidi drugo
 * obljubo kot na drugi.
 */

export type PaketId = 'free' | 'premium' | 'pro';

export type Paket = {
  id: PaketId;
  ime: string;
  imeEn?: string;
  za: string;
  zaEn?: string;
  cena: string;
  enota: string;
  enotaEn?: string;
  /* prečrtana redna cena, kadar velja ustanovna */
  redna?: string;
  ustanovna?: string;
  ustanovnaEn?: string;
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
    cena: '5', enota: '€ / mesec', enotaEn: '€ / month', redna: '9',
    ustanovna: 'Ustanovna cena za prvih 50 — za vedno',
    ustanovnaEn: 'Founding price for the first 50 — forever',
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
    cena: '19', enota: '€ / mesec', enotaEn: '€ / month',
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

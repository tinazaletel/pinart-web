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
  za: string;
  cena: string;
  enota: string;
  /* prečrtana redna cena, kadar velja ustanovna */
  redna?: string;
  ustanovna?: string;
  znacka?: string;
  kmalu?: boolean;
  vkljuceno: string[];
};

export const PAKETI: Paket[] = [
  {
    id: 'free',
    ime: 'Brezplačno',
    za: 'Za začetek in enkratne projekte',
    cena: '0', enota: '€ za vedno',
    vkljuceno: [
      'Kalkulator poštenih cen',
      'Tri različice ponudbe za stranko',
      'Izračun avtorskih pravic in licence',
      'Oblikovana in urejljiva ponudba',
      'Izvoz v e-pošto / PDF',
      'Shranjene ponudbe v oblaku',
      'Oštevilčenje ponudb',
    ],
  },
  {
    id: 'premium',
    ime: 'Premium',
    za: 'Za redno delo s strankami',
    cena: '5', enota: '€ / mesec', redna: '9',
    ustanovna: 'Ustanovna cena za prvih 50 — za vedno',
    znacka: 'Najbolj priljubljeno',
    vkljuceno: [
      'Vse iz Brezplačno',
      'Shranjene ponudbe, pogodbe, računi',
      'Dolgoročni retainerji',
      'Kartoteka strank',
      'Stroški in cilji',
      'Časovnik in donosnost dela',
      'Nadzorna plošča',
    ],
  },
  {
    id: 'pro',
    ime: 'Pro',
    za: 'Za polno poslovanje',
    cena: '19', enota: '€ / mesec',
    znacka: 'Kmalu', kmalu: true,
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
  },
];

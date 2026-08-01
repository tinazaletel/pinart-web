/* Pupa Copilot — pregled ponudbe. ČISTA (pure) svetovalna logika: dobi posnetek
   ponudbe (CopilotVhod) in vrne seznam nasvetov (Nasvet[]). NE piše ponudbe —
   samo opozori. Diferenciacija Flow: nasveti temeljijo na Flow znanju (cene +
   pravice), ne generičnem AI. Sestavljanje vhoda iz kalkulatorjevega `r`+state
   je v KalkulatorApp (sestaviVhod). Testirano v tests/unit/copilot.test.ts. */

export type Nasvet = {
  id: string;
  resnost: 'opozorilo' | 'predlog';
  besedilo: string;
};

export type CopilotPravVrstica = {
  sid: string;
  ime: string;
  prenos: 'izkljucni' | 'neizkljucni' | 'licenca';
  tantiema?: number;      // % — nastavljena le pri receptu 'tantieme'
  obsegMult: number;
};

export type CopilotVhod = {
  izbraniSkupaj: number;       // cena izbranega paketa (paketi[izbrani].skupaj)
  referencaDelo: number;       // izpeljan tržni benchmark izvedbe (glej sestaviVhod)
  delo: number;                // r.delo — izvedba
  pravice: number;             // r.pravice — enkratni odkup pravic (0 pri 'licenca')
  licenca: number;             // r.licenca — letna licenca
  prenos: 'izkljucni' | 'neizkljucni' | 'licenca';
  raba: 'znamka' | 'projekt';
  popustPct: number;
  trgMult: number;             // že clampan 0.7–2.2
  ddvZavezanec: boolean;
  izbraniPaketId: string;      // 'osnovni' | 'priporoceni' | 'premium'
  trgNarocnikaIme: string;     // za besedilo
  glavnaStoritevIme: string;   // za besedilo
  praviceVrstice: CopilotPravVrstica[];
};

/* storitve, ki se prodajajo kot izdelek (naklada) -> smiselne tantieme */
const NAKLADA = new Set(['embalaza', 'ilustracija', 'publikacija', 'produktni', 'logo', 'cgp']);
/* digitalne storitve -> licenca je pogosto preozka */
const DIGITAL = new Set(['web', 'uxui', 'aplikacija', 'dizajnsistem']);

/* Vrne svetovalne nasvete za dano ponudbo. Deterministično, brez side-effectov. */
export function pregledCopilot(v: CopilotVhod): Nasvet[] {
  const nasveti: Nasvet[] = [];

  // 1) cena pod trgom
  if (v.referencaDelo > 0 && v.izbraniSkupaj > 0 && v.izbraniSkupaj < v.referencaDelo * 0.8) {
    const pct = Math.round((1 - v.izbraniSkupaj / v.referencaDelo) * 100);
    nasveti.push({ id: 'pod-trgom', resnost: 'predlog',
      besedilo: `Ta ponudba je približno ${pct}% pod tem, kar za ${v.glavnaStoritevIme.toLowerCase()} na trgu ${v.trgNarocnikaIme} običajno zaračunamo. Če ni posebnega razloga (dober znanec, portfelj), predlagam, da jo malo dvigneš — tvoje delo je vredno več.` });
  }

  // 2) manjka avtorska licenca (znamka, brez pravic)
  if (v.prenos !== 'licenca' && v.pravice === 0 && v.raba === 'znamka') {
    nasveti.push({ id: 'manjka-pravice', resnost: 'opozorilo',
      besedilo: 'Naročnik dobi delo za celotno znamko, a v ceni ni postavke za avtorske pravice — pravic nisi zaračunala. Vključi odkup ali licenco, sicer podariš najdražji del.' });
  }

  // 3) licenca izbrana, a znesek 0
  if (v.prenos === 'licenca' && v.licenca === 0) {
    nasveti.push({ id: 'licenca-brez-pravic', resnost: 'opozorilo',
      besedilo: 'Izbrala si model »samo licenca«, a letni znesek licence je 0. Bodisi vpiši letno licenco bodisi preklopi na enkratni odkup — drugače pravice niso pokrite.' });
  }

  // 4) osnovni paket pri velikem obsegu -> premalo revizij
  if (v.izbraniPaketId === 'osnovni' && v.referencaDelo > 0 && v.delo > v.referencaDelo * 1.2) {
    nasveti.push({ id: 'ni-revizij', resnost: 'predlog',
      besedilo: 'Pri tem obsegu je Osnovni paket z le 1 krogom popravkov tvegan — pri večjih projektih se popravki hitro namnožijo. Razmisli o Priporočenem (2 kroga) ali dodaj postavko za dodatne revizije.' });
  }

  // 5) izdelek z izključnim odkupom brez tantiem
  const izdelekBrezTantiem = v.praviceVrstice.find(pv => pv.prenos === 'izkljucni' && NAKLADA.has(pv.sid) && !pv.tantiema);
  if (izdelekBrezTantiem) {
    nasveti.push({ id: 'tantieme-namesto-odkupa', resnost: 'predlog',
      besedilo: `Pri »${izdelekBrezTantiem.ime}« gre za delo, ki se bo prodajalo. Namesto enkratnega odkupa razmisli o tantiemah (% od neto veleprodaje) — če se izdelek dobro prodaja, zaslužiš skupaj z naročnikom.` });
  }

  // 6) digitalna storitev z ozko licenco
  const ozkaDigital = v.praviceVrstice.find(pv => DIGITAL.has(pv.sid) && pv.prenos === 'licenca' && pv.obsegMult <= 1);
  if (ozkaDigital) {
    nasveti.push({ id: 'boljsa-licenca-digital', resnost: 'predlog',
      besedilo: `Za digitalno rabo pri »${ozkaDigital.ime}« je licenca ozka. Če bo naročnik delo uporabljal dolgoročno, predlagaj izključni prenos ali daljše trajanje — bolje pokrije dejansko rabo.` });
  }

  // 7) previsok popust
  if (v.popustPct >= 20) {
    nasveti.push({ id: 'previsok-popust', resnost: 'predlog',
      besedilo: `Popust ${Math.round(v.popustPct)}% je velik zalogaj. Če ga daješ zavestno (zvestoba, večletni projekt), super — sicer raje znižaj obseg kot ceno, da ne razvrednotiš dela.` });
  }

  // 8) trg naročnika ob varovalki (cena morda ne odraža njegovega trga)
  if (v.trgMult >= 2.19 || v.trgMult <= 0.71) {
    const drazji = v.trgMult >= 2.19;
    nasveti.push({ id: 'trg-neprilagojen', resnost: 'predlog',
      besedilo: `Trg naročnika (${v.trgNarocnikaIme}) je precej ${drazji ? 'dražji' : 'cenejši'} od tvojega, a varovalka omejuje prilagoditev cene. Za tuje naročnike premisli, ali cena res odraža njihov trg.` });
  }

  // 9) DDV pri visokem znesku (mehko)
  if (!v.ddvZavezanec && (v.delo + v.pravice) > 5000) {
    nasveti.push({ id: 'ddv-nepotrjen', resnost: 'predlog',
      besedilo: 'Pri tem znesku preveri status DDV z računovodstvom — če presežeš prag zavezanosti, mora biti DDV na ponudbi.' });
  }

  return nasveti;
}

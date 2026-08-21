/* POSLOVNI NAČRT — vprašanja, stroškovne kategorije in preverjanje popolnosti.
 *
 * Tina, 21. 8. 2026: »sedaj se ti iz canvasa izpiše avtomatsko poslovni načrt,
 * ki je tako beden, da ni res. Za poslovni načrt naj bo svoja stran kot Pupa
 * live in te mora vprašati še kup zelo strokovnih in specifičnih vprašanj.
 * Mora videti, da si premalo stroškov vpisal, in te vprašati, koliko te stane
 * oblak, najemnina, oglaševanje …«
 *
 * Zakaj je bil prejšnji izpis slab: Business Canvas je devet polj proze. V njem
 * ni ene same številke, poslovni načrt pa je v jedru dokument o številkah —
 * koliko stane, koliko prinese, kdaj se izide. Iz canvasa se torej NE da
 * izpeljati načrta; iz njega se da izpeljati le kazalo.
 *
 * Zato je tu vprašalnik, ne generator. Vprašanja so NAMENOMA fiksna in
 * strokovna: to je tisti del, ki ga uporabnica sama ne zna postaviti, in prav
 * zato deluje tudi brez AI. Model po želji pomaga formulirati odgovore, ni pa
 * pogoj — glej docs/CODEX-NALOGE-vprasalnik.md.
 */

export type VprasanjeTip = 'besedilo' | 'znesek' | 'stevilo' | 'odstotek';

export type NacrtVprasanje = {
  id: string;
  sekcija: string;
  vprasanje: string;
  /* Konkreten primer. Prazno okno z naslovom »Ton glasu« ne pomaga nikomur. */
  pomoc: string;
  tip: VprasanjeTip;
  /* Brez teh načrt ni načrt, ampak esej. */
  kljucno?: boolean;
};

export type NacrtOdgovori = Record<string, string>;

/* ── STROŠKOVNE KATEGORIJE ────────────────────────────────────────────────
 * Seznam je merilo popolnosti. Kdor navede dva stroška, ni naredil načrta —
 * pozabil je na tiste, ki tiho tečejo vsak mesec in prav ti potopijo izračun.
 * Zneski so MESEČNI; letne stroške delimo z 12 že ob vnosu.
 */
export type StrosekKategorija = {
  id: string;
  ime: string;
  /* Zakaj sprašujemo — da vprašanje ne zveni kot birokracija. */
  zakaj: string;
  primer: string;
  /* Nekatere kategorije marsikoga ne zadevajo (npr. najemnina pri delu od
     doma). Takih ne štejemo kot manjkajoče, če jih izrecno označi z 0. */
  pogosto: boolean;
};

export const STROSKI_KATEGORIJE: StrosekKategorija[] = [
  { id: 'najemnina', ime: 'Najemnina in obratovalni stroški', zakaj: 'Največji fiksni strošek pri vsakem, ki ni doma.', primer: 'npr. 450 € pisarna + 90 € elektrika, voda, smeti', pogosto: true },
  { id: 'oblak', ime: 'Oblak, gostovanje in domene', zakaj: 'Tečejo tiho vsak mesec in se sešteje več, kot kdo misli.', primer: 'npr. Vercel 20 $, Supabase 25 $, domene 3 €', pogosto: true },
  { id: 'programska', ime: 'Programska oprema in licence', zakaj: 'Adobe, Figma, AI naročnine — pri kreativcih pogosto največja postavka po plači.', primer: 'npr. Adobe 70 €, Figma 15 €, ChatGPT 20 €', pogosto: true },
  { id: 'racunovodstvo', ime: 'Računovodstvo in pravne storitve', zakaj: 'Fiksen strošek, ki ga v prvem načrtu skoraj vsi pozabijo.', primer: 'npr. 120 € mesečno', pogosto: true },
  { id: 'oglasevanje', ime: 'Oglaševanje in marketing', zakaj: 'Brez tega v načrtu se rast ne da razložiti — stranke ne pridejo same.', primer: 'npr. 200 € oglasi + 50 € orodja', pogosto: true },
  { id: 'place', ime: 'Plače, prispevki ali lastni prejemek', zakaj: 'Tudi če si sama: če se v načrtu ne plačaš, načrt laže.', primer: 'npr. 1.500 € bruto zase', pogosto: true },
  { id: 'podizvajalci', ime: 'Podizvajalci in zunanji sodelavci', zakaj: 'Spremenljiv strošek, ki raste s prihodkom — mora biti ločen od fiksnih.', primer: 'npr. 500 € povprečno na mesec', pogosto: true },
  { id: 'oprema', ime: 'Oprema in njena zamenjava', zakaj: 'Računalnik ni enkraten strošek, ampak strošek, razdeljen na tri leta.', primer: 'npr. 3.000 € / 36 mesecev = 83 €', pogosto: true },
  { id: 'telefon', ime: 'Telefon in internet', zakaj: 'Majhno, a fiksno.', primer: 'npr. 45 €', pogosto: true },
  { id: 'zavarovanja', ime: 'Zavarovanja', zakaj: 'Poklicna odgovornost je pri delu za tuje naročnike pogosto pogodbena zahteva.', primer: 'npr. 40 €', pogosto: false },
  { id: 'izobrazevanje', ime: 'Izobraževanje in literatura', zakaj: 'V stroki, kjer se orodja menjajo vsako leto, to ni luksuz.', primer: 'npr. 50 €', pogosto: false },
  { id: 'potni', ime: 'Potni stroški in prevoz', zakaj: 'Sestanki, snemanja, konference.', primer: 'npr. 120 €', pogosto: false },
  { id: 'banka', ime: 'Bančni in plačilni stroški', zakaj: 'Provizije plačilnih ponudnikov pri spletni prodaji niso zanemarljive.', primer: 'npr. 25 € + 2,9 % od prodaje', pogosto: false },
  { id: 'rezerva', ime: 'Rezerva za nepredvideno', zakaj: 'Načrt brez rezerve je napoved, ne načrt. Priporočeno 5–10 % vseh stroškov.', primer: 'npr. 150 €', pogosto: true },
];

/* ── VPRAŠANJA PO SEKCIJAH ──────────────────────────────────────────────── */
export const NACRT_VPRASANJA: NacrtVprasanje[] = [
  { id: 'kaj', sekcija: 'Povzetek', vprasanje: 'V enem stavku — kaj prodajaš in komu?', pomoc: 'npr. Celostne grafične podobe za male ponudnike hrane v Sloveniji.', tip: 'besedilo', kljucno: true },
  { id: 'zakaj_ti', sekcija: 'Povzetek', vprasanje: 'Zakaj bi kdo izbral tebe a ne konkurenta?', pomoc: 'Ne »kakovost in zanesljivost«. Nekaj, česar drugi ne morejo reči.', tip: 'besedilo', kljucno: true },
  { id: 'faza', sekcija: 'Povzetek', vprasanje: 'V kateri fazi si — ideja, prve stranke, ali že tečeš?', pomoc: 'npr. Tri leta poslujem, letos širim na tuji trg.', tip: 'besedilo' },

  { id: 'problem', sekcija: 'Problem in rešitev', vprasanje: 'Kateri problem stranke rešuješ in kaj jo stane, če ga ne reši?', pomoc: 'npr. Izgublja posel, ker izgleda ljubiteljsko — pri javnih razpisih odpade.', tip: 'besedilo', kljucno: true },
  { id: 'kako_danes', sekcija: 'Problem in rešitev', vprasanje: 'Kako to rešujejo danes, brez tebe?', pomoc: 'npr. Canva in nečakinja. Ali agencija za trikrat več denarja.', tip: 'besedilo' },

  { id: 'segment', sekcija: 'Trg', vprasanje: 'Kdo točno je tvoja stranka? Panoga, velikost, kdo odloča.', pomoc: 'npr. Lastniki kavarn in butičnih pekarn, 1–10 zaposlenih, odloča lastnik sam.', tip: 'besedilo', kljucno: true },
  { id: 'velikost_trga', sekcija: 'Trg', vprasanje: 'Koliko takih strank je v tvojem dosegu?', pomoc: 'Ni treba na deset natančno. »Okoli 800 v Sloveniji« je dovolj — pomembno je, da veš red velikosti.', tip: 'besedilo' },
  { id: 'zakaj_zdaj', sekcija: 'Trg', vprasanje: 'Zakaj je zdaj pravi čas za to?', pomoc: 'npr. Nova zakonodaja, nova navada strank, novo orodje, ki to omogoča.', tip: 'besedilo' },

  { id: 'konkurenti', sekcija: 'Konkurenca', vprasanje: 'Naštej tri konkurente in ceno, po kateri prodajajo.', pomoc: 'npr. Studio A ~2.000 €, freelancer B ~600 €, Canva 0 €.', tip: 'besedilo', kljucno: true },
  { id: 'vrzel', sekcija: 'Konkurenca', vprasanje: 'Kje je vrzel, ki jo lahko zasedeš?', pomoc: 'npr. Nihče ne dela paketov za odpiranje lokala v enem mesecu.', tip: 'besedilo' },

  { id: 'model', sekcija: 'Poslovni model', vprasanje: 'Kako zaslužiš — projektno, mesečno, po uri, licenčnina?', pomoc: 'npr. 70 % projektno, 30 % mesečno vzdrževanje.', tip: 'besedilo', kljucno: true },
  { id: 'povprecen_posel', sekcija: 'Poslovni model', vprasanje: 'Koliko znaša povprečen posel?', pomoc: 'v evrih, npr. 1800', tip: 'znesek', kljucno: true },
  { id: 'poslov_mesecno', sekcija: 'Poslovni model', vprasanje: 'Koliko takih poslov realno zapreš na mesec?', pomoc: 'Bodi konservativna. Načrt, ki predpostavlja poln koledar, ni načrt.', tip: 'stevilo', kljucno: true },
  { id: 'ponavljajoci', sekcija: 'Poslovni model', vprasanje: 'Koliko prihodka na mesec je ponavljajočega?', pomoc: 'Vzdrževanja, retainerji, licence. Če nič, napiši 0.', tip: 'znesek' },
  { id: 'rast', sekcija: 'Poslovni model', vprasanje: 'Za koliko odstotkov na mesec načrtuješ rast prihodka?', pomoc: 'Bodi trezna: 3–5 % na mesec je že lepa rast. 20 % je pravljica.', tip: 'odstotek', kljucno: true },

  { id: 'kanali', sekcija: 'Prodaja', vprasanje: 'Od kod pridejo stranke?', pomoc: 'npr. 60 % priporočila, 30 % Instagram, 10 % razpisi.', tip: 'besedilo', kljucno: true },
  { id: 'cikel', sekcija: 'Prodaja', vprasanje: 'Koliko časa mine od prvega stika do podpisa?', pomoc: 'npr. Tri tedne. Pri javnih naročilih tri mesece.', tip: 'besedilo' },
  { id: 'strosek_stranke', sekcija: 'Prodaja', vprasanje: 'Koliko te stane pridobitev ene stranke?', pomoc: 'Oglasi in tvoj čas, deljeno s številom pridobljenih. Če ne veš, oceni.', tip: 'znesek' },

  { id: 'ekipa', sekcija: 'Ekipa in operativa', vprasanje: 'Kdo dela in kaj počne? Vključi sebe.', pomoc: 'npr. Jaz oblikovanje in prodaja, zunanji razvijalec po potrebi.', tip: 'besedilo', kljucno: true },
  { id: 'ozko_grlo', sekcija: 'Ekipa in operativa', vprasanje: 'Kaj te ustavi, če se posel podvoji jutri?', pomoc: 'npr. Sama ne zmorem več kot štiri projekte hkrati.', tip: 'besedilo' },

  { id: 'mejniki', sekcija: 'Načrt', vprasanje: 'Trije mejniki za naslednjih dvanajst mesecev, z datumi.', pomoc: 'npr. Do 1. 12. deset plačljivih strank. Do marca prvi tuji naročnik.', tip: 'besedilo', kljucno: true },
  { id: 'tveganja', sekcija: 'Načrt', vprasanje: 'Kaj gre lahko narobe in kaj boš takrat naredila?', pomoc: 'Načrt brez tveganj bere kot oglas. Napiši dve resnični.', tip: 'besedilo', kljucno: true },
  { id: 'kapital', sekcija: 'Načrt', vprasanje: 'Koliko denarja imaš na voljo za zagon oziroma koliko mesecev zdržiš brez prihodka?', pomoc: 'npr. 8.000 € prihrankov, zdržim šest mesecev.', tip: 'besedilo', kljucno: true },
];

export const SEKCIJE = Array.from(new Set(NACRT_VPRASANJA.map(v => v.sekcija))).concat('Stroški', 'Izračun');

/* ── IZRAČUN ──────────────────────────────────────────────────────────────
 * Preprosto, a pošteno: mesečni fiksni stroški, mesečni prihodek, razlika in
 * prag rentabilnosti. To je tisti del, zaradi katerega je načrt sploh vreden
 * branja — vse ostalo je kontekst k tem trem številkam.
 */
export type NacrtIzracun = {
  strosekMesecno: number;
  prihodekMesecno: number;
  razlika: number;
  /* Koliko poslov na mesec je potrebnih, da si na ničli. */
  poslovZaNiclo: number | null;
  manjkajoceKategorije: StrosekKategorija[];
};

const stevilka = (v: string | undefined): number => {
  if (!v) return 0;
  const n = Number(String(v).replace(/[^0-9,.-]/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

export const izracunaj = (odgovori: NacrtOdgovori): NacrtIzracun => {
  const strosekMesecno = STROSKI_KATEGORIJE.reduce((v, k) => v + stevilka(odgovori[`strosek_${k.id}`]), 0);
  const povprecen = stevilka(odgovori.povprecen_posel);
  const poslov = stevilka(odgovori.poslov_mesecno);
  const prihodekMesecno = povprecen * poslov + stevilka(odgovori.ponavljajoci);
  /* Ponavljajoči prihodek že pokrije del stroškov, zato ga odštejemo, preden
     računamo, koliko NOVIH poslov je še potrebnih. */
  const zaPokriti = Math.max(0, strosekMesecno - stevilka(odgovori.ponavljajoci));
  return {
    strosekMesecno,
    prihodekMesecno,
    razlika: prihodekMesecno - strosekMesecno,
    poslovZaNiclo: povprecen > 0 ? Math.ceil(zaPokriti / povprecen) : null,
    manjkajoceKategorije: STROSKI_KATEGORIJE.filter(k => k.pogosto && (odgovori[`strosek_${k.id}`] ?? '') === ''),
  };
};

/* ── POPOLNOST ────────────────────────────────────────────────────────────
 * Ne štejemo odstotka izpolnjenih polj, ampak povemo, KAJ manjka. Odstotek je
 * merilo za vestnost; seznam manjkajočega je merilo za uporabnost.
 */
export type Manko = { id: string; besedilo: string; resnost: 'kljucno' | 'priporoceno' };

export const preveriPopolnost = (odgovori: NacrtOdgovori): Manko[] => {
  const manjka: Manko[] = [];

  for (const v of NACRT_VPRASANJA) {
    if ((odgovori[v.id] ?? '').trim()) continue;
    manjka.push({ id: v.id, besedilo: v.vprasanje, resnost: v.kljucno ? 'kljucno' : 'priporoceno' });
  }

  const izr = izracunaj(odgovori);
  for (const k of izr.manjkajoceKategorije) {
    manjka.push({ id: `strosek_${k.id}`, besedilo: `Koliko te stane: ${k.ime.toLowerCase()}? ${k.zakaj}`, resnost: 'kljucno' });
  }

  /* Posebno opozorilo, ki ga je Tina izrecno zahtevala: premalo vpisanih
     stroškov. Pet ali manj kategorij pomeni, da nekaj tiho teče neevidentirano. */
  const vpisanih = STROSKI_KATEGORIJE.filter(k => (odgovori[`strosek_${k.id}`] ?? '') !== '').length;
  if (vpisanih > 0 && vpisanih < 6) {
    manjka.unshift({
      id: 'premalo_stroskov',
      besedilo: `Vpisala si ${vpisanih} stroškovnih kategorij. Pravi načrt jih ima navadno vsaj deset — sicer izračun pokaže dobiček, ki ga v resnici ni.`,
      resnost: 'kljucno',
    });
  }

  return manjka;
};

export const odstotekIzpolnjenosti = (odgovori: NacrtOdgovori): number => {
  const vsa = NACRT_VPRASANJA.length + STROSKI_KATEGORIJE.filter(k => k.pogosto).length;
  const izpolnjenih = NACRT_VPRASANJA.filter(v => (odgovori[v.id] ?? '').trim()).length
    + STROSKI_KATEGORIJE.filter(k => k.pogosto && (odgovori[`strosek_${k.id}`] ?? '') !== '').length;
  return Math.round((izpolnjenih / vsa) * 100);
};

/* ── PREDLOG IZ CANVASA ───────────────────────────────────────────────────
 * Canvas ne more napisati načrta, lahko pa prihrani nekaj tipkanja. Zato ga
 * uporabimo SAMO kot predizpolnitev besedilnih polj — nikoli za številke.
 */
/* ── PROJEKCIJA ZA GRAF ───────────────────────────────────────────────────
 * Dvanajst mesecev: prihodek raste po vpisani stopnji, fiksni stroški stojijo.
 * Namenoma preprosto — natančnejši model bi dal videz gotovosti, ki je ni.
 */
export type Mesec = { mesec: number; prihodek: number; strosek: number };

export const projekcija = (odgovori: NacrtOdgovori, mesecev = 12): Mesec[] => {
  const izr = izracunaj(odgovori);
  const rast = stevilka(odgovori.rast) / 100;
  return Array.from({ length: mesecev }, (_, i) => ({
    mesec: i + 1,
    prihodek: Math.round(izr.prihodekMesecno * Math.pow(1 + rast, i)),
    strosek: Math.round(izr.strosekMesecno),
  }));
};

/* Prvi mesec, ko prihodek preseže stroške (ali null, če v obdobju ne). */
export const mesecPreloma = (odgovori: NacrtOdgovori, mesecev = 24): number | null => {
  const p = projekcija(odgovori, mesecev).find(m => m.prihodek >= m.strosek && m.strosek > 0);
  return p ? p.mesec : null;
};

export const izCanvasa = (bloki: Record<string, string> | undefined): NacrtOdgovori => {
  if (!bloki) return {};
  const o: NacrtOdgovori = {};
  if (bloki.value) o.kaj = bloki.value;
  if (bloki.segments) o.segment = bloki.segments;
  if (bloki.channels) o.kanali = bloki.channels;
  if (bloki.activities) o.ekipa = bloki.activities;
  if (bloki.revenue) o.model = bloki.revenue;
  return o;
};

const KLJUC = 'pinart-poslovni-nacrt';

export const preberiNacrt = (canvasId: string): NacrtOdgovori => {
  if (typeof window === 'undefined') return {};
  try {
    const vsi = JSON.parse(localStorage.getItem(KLJUC) || '{}') as Record<string, NacrtOdgovori>;
    return vsi[canvasId] || {};
  } catch { return {}; }
};

export const shraniNacrt = (canvasId: string, odgovori: NacrtOdgovori): void => {
  if (typeof window === 'undefined') return;
  try {
    const vsi = JSON.parse(localStorage.getItem(KLJUC) || '{}') as Record<string, NacrtOdgovori>;
    vsi[canvasId] = odgovori;
    localStorage.setItem(KLJUC, JSON.stringify(vsi));
    window.dispatchEvent(new CustomEvent('pinart-poslovni-nacrt-change'));
  } catch { /* polno */ }
};

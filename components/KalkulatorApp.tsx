'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  PenNib, Palette, Browser, Megaphone, BookOpen, Package,
  PaintBrush, Compass, Sparkle, Plus, Camera, TextT,
  CopySimple, DownloadSimple, FileText, FloppyDisk, PaintBucket,
  PersonSimple, TextAa, TextB, UploadSimple,
} from '@phosphor-icons/react';

/* Pinartov javni kalkulator cen za kreativce.
   Model: izvedba (osnove x izkusnje x trg narocnika/moj trg x velikost x dodatki)
        + avtorske pravice (% dobicka narocnika, omejeno kot % izvedbe)
        + alternativa: letna licenca (% odkupa pravic)
   Trije paketi (osnovni / priporoceni / premium), profili cen, regije,
   zajem kontakta (ime+email) ob shranjevanju/prenosu -> /api/inquiry. */

type Storitev = { id: string; ime: string; osnova: number };
type TonPonudbe = 'formalno' | 'toplo' | 'direktno';

const STORITVE: Storitev[] = [
  { id: 'logo',        ime: 'Logotip + osnovna identiteta', osnova: 1200 },
  { id: 'cgp',         ime: 'Celostna grafična podoba',     osnova: 2500 },
  { id: 'web',         ime: 'Spletna stran',                osnova: 3500 },
  { id: 'kampanja',    ime: 'Kampanja / oglasni vizuali',   osnova: 1500 },
  { id: 'publikacija', ime: 'Publikacija / tiskovina',      osnova: 1300 },
  { id: 'embalaza',    ime: 'Embalaža / produkt',           osnova: 1800 },
  { id: 'ilustracija', ime: 'Ilustracija / vizualni svet',  osnova: 1400 },
  { id: 'direkcija',   ime: 'Kreativna direkcija',          osnova: 900  },
  { id: 'fotografija', ime: 'Fotografiranje',               osnova: 650  },
  { id: 'copy',        ime: 'Besedila / copywriting',       osnova: 700  },
];

const IZKUSNJE = [
  { id: 'zacetnik',    ime: 'Začetnik',    opis: 'do 3 leta',         mult: 0.7 },
  { id: 'samostojen',  ime: 'Samostojen',  opis: '3 do 8 let',        mult: 1   },
  { id: 'strokovnjak', ime: 'Strokovnjak', opis: '8+ let, reference', mult: 1.4 },
];

/* Raven cen po trgih: vpliva na privzete osnove (tvoj trg)
   in na razmerje, ko delas za trg z drugacno ravnjo (trg narocnika). */
const TRGI = [
  { id: 'si',   ime: 'Slovenija / srednja EU',  lvl: 1    },
  { id: 'west', ime: 'Zahodna Evropa',          lvl: 1.4  },
  { id: 'us',   ime: 'ZDA / UK / Skandinavija', lvl: 1.8  },
  { id: 'east', ime: 'Vzhodna EU / Balkan',     lvl: 0.8  },
  { id: 'mena', ime: 'Bližnji vzhod / Afrika',  lvl: 0.6  },
  { id: 'asia', ime: 'Azija / Južna Amerika',   lvl: 0.55 },
];

const DODATKI = [
  { id: 'nujno',    ime: 'Nujen rok',               opis: '+25 %', mult: 0.25 },
  { id: 'varianta', ime: 'Dodatna idejna varianta', opis: '+15 %', mult: 0.15 },
];

const TONI: { id: TonPonudbe; ime: string }[] = [
  { id: 'formalno', ime: 'Formalno' },
  { id: 'toplo', ime: 'Toplo profesionalno' },
  { id: 'direktno', ime: 'Neformalno' },
];

type ProjektnoVprasanje = { id: string; label: string; placeholder?: string; izbire?: string[]; vec?: boolean; svoje?: string };

const VPRASANJA_PO_STORITVI: Record<string, ProjektnoVprasanje[]> = {
  logo: [
    { id: 'cilj', label: 'Kaj mora nov znak sporočati?', placeholder: 'npr. bolj premium, bolj zaupanja vredno, bolj igrivo' },
    { id: 'kompleksnost', label: 'Kako kompleksen naj bo logotip?', izbire: ['Enostaven napis ali znak', 'Znak + tipografija (kombiniran)', 'Družina znakov / več različic'] },
    { id: 'uporaba', label: 'Kje se bo najpogosteje uporabljal?', placeholder: 'splet, embalaža, tabla, app ikona, vozila ...' },
    { id: 'omejitve', label: 'Ali že obstajajo barve, pisave ali simboli, ki morajo ostati?' },
    { id: 'budget', label: 'Kakšen je okvirni budget naročnika?', izbire: ['Do 1.000 €', '1.000 do 2.500 €', 'Nad 2.500 €', 'Še ne vem'], svoje: 'ali vpiši svoj znesek ...' },
  ],
  cgp: [
    { id: 'stanje', label: 'Ali že obstaja logotip ali predhodni CGP?', izbire: ['Začenjamo iz nič', 'Imamo samo logotip', 'Imamo star CGP'] },
    { id: 'tip-projekta', label: 'Gre za novo identiteto ali osvežitev obstoječe?', izbire: ['Nova identiteta', 'Osvežitev obstoječe', 'Razširitev sistema'] },
    { id: 'smeri', label: 'Koliko različnih kreativnih smeri pričakuješ?', izbire: ['1 jasna smer', '2 predloga', '3 predlogi', '6 širših raziskav'] },
    { id: 'stil', label: 'Ali že veš, kakšen slog želiš?', izbire: ['Minimalistično', 'Retro', 'Editorial', 'Luksuzno', 'Igrivo', 'Tehnološko', 'Organsko', 'Drzno', 'Še ne vem'], vec: true },
    { id: 'omejitve', label: 'Ali obstajajo barve, tipografije ali ideje, ki jih je treba upoštevati?', placeholder: 'npr. imamo moodboard, kupljeno pisavo, barvno paleto, primer znamk, ki so nam všeč' },
    { id: 'obseg', label: 'Na katerih materialih mora identiteta delovati?', placeholder: 'vizitke, embalaža, splet, družbena omrežja, prezentacije, tabla, vozila ...' },
    { id: 'budget', label: 'Kakšen je okvirni budget naročnika?', izbire: ['Do 2.500 €', '2.500 do 5.000 €', 'Nad 5.000 €', 'Še ne vem'], svoje: 'ali vpiši svoj znesek ...' },
    { id: 'opomba', label: 'Opomba (neobvezno)', placeholder: 'karkoli, kar naj upoštevam vnaprej ...' },
  ],
  web: [
    { id: 'tip', label: 'Kaj ustvarjamo ali prenavljamo?', izbire: ['Nova spletna stran', 'Prenova (redesign)', 'Landing page', 'Portfolio', 'Spletna trgovina', 'Custom aplikacija'], vec: true },
    { id: 'stil', label: 'Kakšne so oblikovalske preference ali reference?', placeholder: 'stil, barve, primeri strani, občutek znamke, kaj jim je všeč / ni všeč ...' },
    { id: 'kompleksnost', label: 'Kako kompleksen je projekt?' },
    { id: 'strani', label: 'Koliko podstrani ali ključnih ekranov pričakuješ?', placeholder: 'npr. 5 podstrani + kontakt + blog' },
    { id: 'funkcije', label: 'Katere funkcionalnosti so nujne?' },
    { id: 'budget', label: 'Kakšen je okvirni budget?' },
    { id: 'rok', label: 'Kdaj mora stran zaživeti?', placeholder: 'npr. v 1 mesecu, 2-3 meseci, do dogodka, ni nujno ...' },
    { id: 'dodatno', label: 'Ali potrebuješ dodatne storitve?' },
    { id: 'vsebina', label: 'Kdo pripravi besedila, slike in strukturo vsebine?' },
  ],
  kampanja: [
    { id: 'kanali', label: 'Na katerih kanalih bo kampanja tekla?', placeholder: 'Meta, Google, tisk, outdoor, email, TikTok ...' },
    { id: 'formati', label: 'Katere formate potrebuješ?', placeholder: 'story, feed, bannerji, tiskani oglasi, plakati ...' },
    { id: 'cilj', label: 'Kaj je glavni cilj kampanje?', placeholder: 'prodaja, awareness, prijave, launch, rebranding ...' },
  ],
  publikacija: [
    { id: 'strani', label: 'Koliko strani in kakšen format?', placeholder: 'npr. A4, 32 strani, tisk + PDF' },
    { id: 'gradiva', label: 'Ali so teksti, slike in grafi že pripravljeni?' },
    { id: 'tisk', label: 'Ali vključuje pripravo za tisk in komunikacijo s tiskarjem?' },
  ],
  embalaza: [
    { id: 'izdelki', label: 'Za koliko izdelkov ali okusov/variant gre?' },
    { id: 'tehnika', label: 'Ali že obstaja dieline / tehnična skica embalaže?' },
    { id: 'trg', label: 'Kje se bo izdelek prodajal?', placeholder: 'splet, trgovine, lekarne, premium butik, HoReCa ...' },
  ],
  ilustracija: [
    { id: 'stil', label: 'Kakšen slog ilustracije želiš?', placeholder: 'editorial, otroško, luksuzno, tehnično, 3D, ročno ...' },
    { id: 'kolicina', label: 'Koliko ilustracij ali likov potrebuješ?' },
    { id: 'pravice', label: 'Kje in koliko časa se bodo ilustracije uporabljale?' },
  ],
  direkcija: [
    { id: 'vloga', label: 'Kaj naj kreativna direkcija pokrije?', placeholder: 'koncept, moodboard, izbor ekipe, art direction, nadzor izvedbe ...' },
    { id: 'ekipa', label: 'Kdo je že v ekipi in koga je treba še vključiti?' },
    { id: 'trajanje', label: 'Gre za enkraten sprint ali daljše sodelovanje?' },
  ],
  fotografija: [
    { id: 'tip', label: 'Kaj se fotografira?', placeholder: 'produkti, portreti, prostor, kampanja, dogodek ...' },
    { id: 'dan', label: 'Koliko snemalnih dni in lokacij pričakuješ?' },
    { id: 'post', label: 'Koliko retuširanih fotografij mora biti predanih?' },
  ],
  copy: [
    { id: 'kanal', label: 'Za kateri kanal nastajajo besedila?', placeholder: 'splet, kampanja, email, social, PR, naming ...' },
    { id: 'kolicina', label: 'Koliko besedil ali strani potrebuješ?' },
    { id: 'ton', label: 'Kakšen ton znamke želiš?', placeholder: 'formalno, toplo, drzno, strokovno, igrivo ...' },
  ],
};

const WEB_FUNKCIONALNOSTI = [
  'CMS / urejanje vsebin',
  'Kontaktni obrazci',
  'Večjezičnost',
  'Blog / novice',
  'SEO osnova',
  'Newsletter prijava',
  'E-trgovina / plačila',
  'Booking / rezervacije',
  'Članski dostop / prijava',
  'Animacije',
  'Analitika',
  'Integracije z zunanjimi orodji',
];

const WEB_KOMPLEKSNOST = [
  'Osnovna predstavitvena stran',
  'Standardna poslovna stran',
  'Napredna stran z več funkcijami',
  'Kompleksna aplikacija / portal',
];

const WEB_BUDGETI = [
  'do 2.500 €',
  '2.500-5.000 €',
  '5.000-10.000 €',
  '10.000-25.000 €',
  '25.000 €+',
  'Ne vem še',
];

const WEB_DODATNE_STORITVE = [
  'Hosting / domena',
  'Vzdrževanje',
  'SEO optimizacija',
  'Copywriting',
  'Fotografija / video',
  'Migracija vsebin',
  'Izobraževanje za urejanje',
  'Dostopnost / WCAG pregled',
];

/* Kje preveris prihodke/dobicek narocnika po trgih — za vrednostno oceno.
   Javni registri dajo osnovne podatke; prihodke zasebnih podjetij pogosto
   le ocenis (D&B, LinkedIn stevilo zaposlenih). Zadnja dva sta univerzalna. */
const REGISTRI: Record<string, { ime: string; url: string }[]> = {
  si: [
    { ime: 'bizi.si', url: 'https://www.bizi.si' },
    { ime: 'AJPES (javne objave)', url: 'https://www.ajpes.si/jolp/' },
  ],
  west: [
    { ime: 'OpenCorporates', url: 'https://opencorporates.com' },
    { ime: 'North Data (DACH)', url: 'https://www.northdata.com' },
  ],
  us: [
    { ime: 'SEC EDGAR (javne družbe)', url: 'https://www.sec.gov/cgi-bin/browse-edgar' },
    { ime: 'UK Companies House', url: 'https://find-and-update.company-information.service.gov.uk' },
  ],
  east: [
    { ime: 'OpenCorporates', url: 'https://opencorporates.com' },
    { ime: 'Bisnode / Dun & Bradstreet', url: 'https://www.dnb.com' },
  ],
  mena: [
    { ime: 'Digital Egypt / GAFI', url: 'https://www.gafi.gov.eg' },
    { ime: 'Dun & Bradstreet', url: 'https://www.dnb.com' },
  ],
  asia: [
    { ime: 'OpenCorporates', url: 'https://opencorporates.com' },
    { ime: 'Dun & Bradstreet', url: 'https://www.dnb.com' },
  ],
};
/* Vedno na voljo, ne glede na trg: */
const REGISTRI_UNIV = [
  { ime: 'LinkedIn (št. zaposlenih kot približek)', url: 'https://www.linkedin.com/search/results/companies/' },
];

/* Katalog podrobnih postavk za "+ dodaj": iskanje po imenu, kolicina, cena.
   Cene so osnove za slovenski trg; ob dodajanju se prilagodijo tvojemu trgu. */
const KATALOG = [
  { id: 'anim-logo',    ime: 'Animacija logotipa',                cena: 450 },
  { id: 'anim-ikone',   ime: 'SVG animacija ikon (kos)',          cena: 90  },
  { id: 'ikone-set',    ime: 'Set ikon / piktogramov (kos)',      cena: 60  },
  { id: 'media-paket',  ime: 'Media paket za družbena omrežja',   cena: 650 },
  { id: 'viral-ad',     ime: 'Viralni video oglas',               cena: 900 },
  { id: 'banner-set',   ime: 'Set spletnih pasic (bannerjev)',    cena: 380 },
  { id: 'naslovnice',   ime: 'Naslovnice za družbena omrežja',    cena: 180 },
  { id: 'email-predloga', ime: 'E-mail predloga (newsletter)',    cena: 320 },
  { id: 'landing',      ime: 'Pristajalna stran (landing page)',  cena: 950 },
  { id: 'predstavitev', ime: 'Predloga za predstavitev (deck)',   cena: 480 },
  { id: 'vizitke',      ime: 'Vizitke in dopisni papir',          cena: 260 },
  { id: 'plakat',       ime: 'Plakat / oglas za tisk',            cena: 340 },
  { id: 'brosura',      ime: 'Brošura (na stran)',                cena: 85  },
  { id: 'embalaza-var', ime: 'Dodatna varianta embalaže',         cena: 520 },
  { id: 'foto-dir',     ime: 'Art direkcija fotografiranja (dan)', cena: 700 },
  { id: 'brand-book',   ime: 'Razširjen brand priročnik',         cena: 850 },
  { id: 'foto-produkt', ime: 'Fotografiranje produktov (dan)',    cena: 600 },
  { id: 'foto-portret', ime: 'Fotografiranje portretov / ekipe',  cena: 450 },
  { id: 'foto-dogodek', ime: 'Fotografiranje dogodka (dan)',      cena: 550 },
  { id: 'retusa',       ime: 'Obdelava / retuša fotografij (kos)', cena: 25 },
  { id: 'ai-vizuali',   ime: 'AI generiranje fotografij / vizualov (paket)', cena: 350 },
  { id: 'reel',         ime: 'Kratki video / reel (kos)',         cena: 350 },
  { id: 'copy-web',     ime: 'Pisanje besedil za splet (na stran)', cena: 120 },
  { id: 'pr-clanek',    ime: 'PR članek / sporočilo za javnost',  cena: 250 },
  { id: 'naming',       ime: 'Naming / slogan',                   cena: 400 },
  { id: 'scenarij',     ime: 'Scenarij za video / oglas',         cena: 300 },
  { id: 'seo-opisi',    ime: 'SEO opisi izdelkov (kos)',          cena: 30 },
];

type Postavka = { id: string; ime: string; cena: number; kolicina: number };

const brezSumnikov = (s: string) =>
  s.toLowerCase().replace(/č/g, 'c').replace(/š/g, 's').replace(/ž/g, 'z');

const PAKETI = [
  { id: 'osnovni',     ime: 'Osnovni',     mult: 0.75, opis: 'ožji obseg, 1 krog popravkov, osnovni formati' },
  { id: 'priporoceni', ime: 'Priporočeni', mult: 1,    opis: 'poln obseg, 2 kroga popravkov, vsi formati' },
  { id: 'premium',     ime: 'Premium',     mult: 1.35, opis: 'razširjen obseg, 3 krogi popravkov, dodatna varianta, prednostni odziv' },
];

function velikostIzPrometa(promet: number) {
  if (!promet || promet <= 0) return { mult: 1,   opis: 'mikro (brez podatka)' };
  if (promet < 100_000)       return { mult: 1,   opis: 'mikro podjetje' };
  if (promet < 1_000_000)     return { mult: 1.5, opis: 'malo podjetje' };
  if (promet < 10_000_000)    return { mult: 2.5, opis: 'srednje podjetje' };
  return                        { mult: 4,   opis: 'veliko podjetje' };
}

const zaokrozi = (n: number) => Math.round(n / 50) * 50;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const ponudbaVHtml = (s: string): string =>
  s.split('\n\n')
    .map((block): string => {
      const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
      if (!lines.length) return '';
      if (lines.every(l => /^─+$/.test(l))) return '<hr>';

      const first = lines[0];
      if (first.startsWith('PONUDBA:')) {
        return `<h1>${escapeHtml(first.replace('PONUDBA:', '').trim())}</h1>`;
      }
      if (/^(OBSEG|DODATNE INFORMACIJE|IZBERITE PAKET|POGOJI)$/.test(first)) {
        const rest = lines.slice(1);
        const body: string = rest.length ? ponudbaVHtml(rest.join('\n')) : '';
        return `<h2>${escapeHtml(first)}</h2>${body}`;
      }
      if (lines.every(l => l.startsWith('·'))) {
        return `<ul>${lines.map(l => `<li>${escapeHtml(l.replace(/^·\s*/, ''))}</li>`).join('')}</ul>`;
      }
      if (lines.length >= 2 && /^[A-ZČŠŽ\s]+/.test(first) && first.includes('·')) {
        const [title, ...rest] = lines;
        const [, name = title, price = ''] = title.match(/^(.+?)\s*·\s*(.+)$/) ?? [];
        return `<div class="offer-package"><div class="offer-package-head"><h3>${escapeHtml(name.trim())}</h3><strong>${escapeHtml(price.trim())}</strong></div>${rest.map(l => `<p>${escapeHtml(l)}</p>`).join('')}</div>`;
      }
      return `<p>${lines.map(escapeHtml).join('<br>')}</p>`;
    })
    .join('');

/* Valuta ponudbe: cene so interno v EUR, prikaz in ponudba pa v izbrani
   valuti (priblizen preracun, zaokrozen na 50). */
const VALUTE = [
  { id: 'eur', znak: '€', fx: 1    },
  { id: 'usd', znak: '$', fx: 1.1  },
  { id: 'gbp', znak: '£', fx: 0.85 },
];

/* Privzeti trg iz casovnega pasu obiskovalca — brez streznika in piskotkov. */
function zaznajTrg(): string {
  let tz = '';
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch { /* star brskalnik */ }
  if (/Ljubljana|Vienna|Prague|Bratislava|Budapest|Warsaw|Zagreb/.test(tz)) return 'si';
  if (/Belgrade|Sarajevo|Skopje|Sofia|Bucharest|Podgorica|Tirane|Kyiv|Kiev|Chisinau|Riga|Vilnius|Tallinn|Istanbul|Moscow|Minsk/.test(tz)) return 'east';
  if (/London|Dublin|Stockholm|Oslo|Copenhagen|Helsinki|Reykjavik|America\/|US\/|Canada|Australia|Auckland/.test(tz)) return 'us';
  if (/Paris|Berlin|Amsterdam|Brussels|Madrid|Rome|Lisbon|Zurich|Luxembourg|Monaco|Andorra/.test(tz)) return 'west';
  if (/Africa\/|Cairo|Beirut|Riyadh|Dubai|Tehran|Jerusalem|Baghdad|Amman|Damascus|Kuwait|Qatar|Bahrain|Muscat/.test(tz)) return 'mena';
  if (/Asia\/|Pacific\/|Indian\//.test(tz)) return 'asia';
  return 'si';
}

const K_NAST = 'pinart-kalkulator-v2';
const K_PROFILI = 'pinart-kalkulator-profili';
const K_LEAD = 'pinart-kalkulator-kontakt';

type Profil = {
  osnove: Record<string, number>;
  mojTrg: string;
  izkusnje: string;
  postavke?: Postavka[];
  mojeStoritve?: Storitev[];
};

export default function KalkulatorApp({ locale = 'sl' }: { locale?: string }) {
  /* Vstopno soglasje (kot Paperform): pogoji pred prvo uporabo orodja.
     Sprejem se shrani lokalno; ob naslednjih obiskih se ne prikaze vec. */
  const [pogojiOk, setPogojiOk] = useState<boolean | null>(null);
  useEffect(() => {
    try {
      /* ?soglasje v URL ponastavi sprejem — za testiranje in ponoven ogled */
      if (new URL(window.location.href).searchParams.has('soglasje')) {
        localStorage.removeItem('pinart-kalk-pogoji-ok');
      }
      setPogojiOk(localStorage.getItem('pinart-kalk-pogoji-ok') === '1');
    } catch { setPogojiOk(true); }
  }, []);
  const sprejmiPogoje = () => {
    try { localStorage.setItem('pinart-kalk-pogoji-ok', '1'); } catch { /* ignoriraj */ }
    setPogojiOk(true);
  };

  /* carovnik: en korak naenkrat, fade-in from bottom (nuSchool slog) */
  const editorRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [korak, setKorak] = useState(0);
  const [izbrane, setIzbrane] = useState<Set<string>>(new Set(['cgp']));
  /* raba dela: 'znamka' = celotna znamka (bilanca podjetja),
     'projekt' = dolocen izdelek/projekt (pricakovani izkupicek projekta) */
  const [raba, setRaba] = useState<'znamka' | 'projekt'>('znamka');
  const [projPrihodek, setProjPrihodek] = useState('');
  const [projDobicek, setProjDobicek] = useState('');
  const [izkusnje, setIzkusnje] = useState('samostojen');
  const [mojTrg, setMojTrg] = useState('si');
  const [trgNarocnika, setTrgNarocnika] = useState('si');
  const [promet, setPromet] = useState('');
  const [dobicek, setDobicek] = useState('');
  const [dodatki, setDodatki] = useState<Set<string>>(new Set());
  const [popust, setPopust] = useState('');
  const [postavke, setPostavke] = useState<Postavka[]>([]);
  const [iskanje, setIskanje] = useState('');
  const [kazemDodaj, setKazemDodaj] = useState(false);
  const [kazemCene, setKazemCene] = useState(false);
  const [mojeStoritve, setMojeStoritve] = useState<Storitev[]>([]);
  const [novaIme, setNovaIme] = useState('');
  const [novaCena, setNovaCena] = useState('');
  const [valuta, setValuta] = useState('eur');
  const [valutaRocna, setValutaRocna] = useState(false);
  const [ponudnik, setPonudnik] = useState({ ime: '', davcna: '', email: '', telefon: '', naslov: '' });
  const [predklic, setPredklic] = useState('+386');
  const [ddvZavezanec, setDdvZavezanec] = useState(false);
  const [ddvStopnja, setDdvStopnja] = useState('22');
  const [besedilo, setBesedilo] = useState('');
  const [besediloHtml, setBesediloHtml] = useState('');
  const [rocnoBesedilo, setRocnoBesedilo] = useState(false);
  const [tonPonudbe, setTonPonudbe] = useState<TonPonudbe>('toplo');
  const [odgovori, setOdgovori] = useState<Record<string, string>>({});
  const [osnove, setOsnove] = useState<Record<string, number>>({});
  const [profili, setProfili] = useState<Record<string, Profil>>({});
  const [kopirano, setKopirano] = useState(false);
  const [kazemZajem, setKazemZajem] = useState<null | 'prenos' | 'profil'>(null);
  const [imeProfila, setImeProfila] = useState('');
  const [leadIme, setLeadIme] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [kazemDostopnost, setKazemDostopnost] = useState(false);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(K_NAST) || '{}');
      if (s.osnove) setOsnove(s.osnove);
      if (s.izkusnje) setIzkusnje(s.izkusnje);
      if (s.mojTrg) {
        setMojTrg(s.mojTrg);
        setTrgNarocnika(s.mojTrg);
      } else {
        const z = zaznajTrg();
        setMojTrg(z);
        setTrgNarocnika(z);
      }
      if (s.mojeStoritve) setMojeStoritve(s.mojeStoritve);
      if (s.valuta) { setValuta(s.valuta); setValutaRocna(true); }
      if (s.ponudnik) {
        setPonudnik(s.ponudnik);
        const m = /^(\+\d{1,4})\s*(.*)$/.exec(s.ponudnik.telefon || '');
        if (m) { setPredklic(m[1]); setPonudnik({ ...s.ponudnik, telefon: m[2] }); }
      }
      if (s.postavke) setPostavke(s.postavke);
      if (s.predklic) setPredklic(s.predklic);
      if (s.ddvZavezanec) setDdvZavezanec(true);
      if (s.ddvStopnja) setDdvStopnja(String(s.ddvStopnja));
      setProfili(JSON.parse(localStorage.getItem(K_PROFILI) || '{}'));
      const l = JSON.parse(localStorage.getItem(K_LEAD) || 'null');
      if (l) { setLeadIme(l.ime || ''); setLeadEmail(l.email || ''); }
    } catch { /* prazno */ }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(K_NAST, JSON.stringify({
        osnove, izkusnje, mojTrg, mojeStoritve, ponudnik, postavke,
        ddvZavezanec, ddvStopnja, predklic,
        valuta: valutaRocna ? valuta : undefined,
      }));
    } catch { /* ignoriraj */ }
  }, [osnove, izkusnje, mojTrg, mojeStoritve, valuta, valutaRocna, ponudnik, postavke, ddvZavezanec, ddvStopnja, predklic]);

  /* valuta sledi trgu narocnika, dokler je uporabnik ne izbere sam */
  useEffect(() => {
    if (!valutaRocna) setValuta(trgNarocnika === 'us' ? 'usd' : 'eur');
  }, [trgNarocnika, valutaRocna]);

  const vseStoritve = useMemo(() => [...STORITVE, ...mojeStoritve], [mojeStoritve]);
  const vfx = VALUTE.find(v => v.id === valuta) ?? VALUTE[0];
  const val = (n: number) => zaokrozi(n * vfx.fx).toLocaleString('sl-SI') + ' ' + vfx.znak;

  const trg = (id: string) => TRGI.find(t => t.id === id) ?? TRGI[0];

  /* privzeta osnova, prilagojena mojemu trgu; rocno nastavljena jo povozi */
  const osnovaZa = (s: Storitev) =>
    osnove[s.id] > 0 ? osnove[s.id] : zaokrozi(s.osnova * trg(mojTrg).lvl);

  const r = useMemo(() => {
    const sez = vseStoritve.filter(s => izbrane.has(s.id));
    if (!sez.length) return null;

    const p = Number(promet) || 0;
    const d = Number(dobicek) || 0;
    const pp = Number(projPrihodek) || 0;
    const pd = Number(projDobicek) || 0;
    /* projektna raba: velikost podjetja ne napihuje izvedbe — vrednost
       se zajame skozi pravice/tantieme od izkupicka projekta */
    const vel = raba === 'projekt'
      ? { mult: 1, opis: 'projektna raba' }
      : velikostIzPrometa(p);
    const izk = IZKUSNJE.find(i => i.id === izkusnje) ?? IZKUSNJE[1];
    const fakDod = DODATKI.filter(x => dodatki.has(x.id)).reduce((a, x) => a + x.mult, 0);

    /* bogatejsi trg placa vec, revnejsi manj; nikoli pod 70 % in nikoli cez 220 % */
    const trgMult = clamp(trg(trgNarocnika).lvl / trg(mojTrg).lvl, 0.7, 2.2);

    const vsotaStoritev = sez.reduce((a, s) => a + osnovaZa(s), 0);
    const vsotaPostavk = postavke.reduce((a, x) => a + x.cena * x.kolicina, 0);
    const mult = izk.mult * vel.mult * trgMult * (1 + fakDod);
    const delo = zaokrozi((vsotaStoritev + vsotaPostavk) * mult);

    /* Razclemba za CSV/racunovodski uvoz — vsota vrstic = delo (priporoceni paket). */
    const vrsticeIzvedbe = [
      ...sez.map(s => ({ ime: s.ime, kolicina: 1, cena: zaokrozi(osnovaZa(s) * mult) })),
      ...postavke.map(x => ({ ime: x.ime, kolicina: x.kolicina, cena: zaokrozi(x.cena * mult) })),
    ];

    /* pravice: znamka = 1 % letnega dobicka podjetja;
       projekt = 10 % pricakovanega dobicka projekta (ali 2 % prihodka) */
    const surove = raba === 'projekt'
      ? (pd > 0 ? pd * 0.10 : pp * 0.02)
      : (d > 0 ? d * 0.01 : p * 0.002);
    const pravice = zaokrozi(clamp(surove, delo * 0.25, delo * 3));
    const licenca = zaokrozi(pravice * 0.2);
    const tantiemePct = 5; /* alternativa pri projektni rabi: % od prodaje letno */

    const popustPct = clamp(Number(popust) || 0, 0, 50);
    const paketi = PAKETI.map(pk => {
      const redna = zaokrozi(delo * pk.mult) + pravice;
      return { ...pk, redna, skupaj: popustPct ? zaokrozi(redna * (1 - popustPct / 100)) : redna };
    });

    return {
      sez, vel, izk, trgMult, delo, pravice, licenca, paketi, popustPct,
      vrsticeIzvedbe, raba, tantiemePct,
      dobicekPodan: raba === 'projekt' ? pd > 0 : d > 0,
    };
  }, [izbrane, izkusnje, mojTrg, trgNarocnika, promet, dobicek, dodatki, osnove, popust, postavke, vseStoritve, raba, projPrihodek, projDobicek]);

  const skupineVprasanj = useMemo(() => {
    return vseStoritve
      .filter(s => izbrane.has(s.id))
      .map(s => ({
        id: s.id,
        storitev: s.ime,
        vprasanja: (VPRASANJA_PO_STORITVI[s.id] ?? []).map(v => ({ ...v, storitev: s.ime, key: `${s.id}:${v.id}` })),
      }))
      .filter(s => s.vprasanja.length);
  }, [izbrane, vseStoritve]);

  const aktivnaVprasanja = useMemo(() => skupineVprasanj.flatMap(s => s.vprasanja), [skupineVprasanj]);

  const prviPoVprasanjih = 1 + skupineVprasanj.length;
  const izkusnjeStep = prviPoVprasanjih;
  const mojTrgStep = prviPoVprasanjih + 1;
  const narocnikStep = prviPoVprasanjih + 2;
  const rabaStep = prviPoVprasanjih + 3;
  const posebnostiStep = prviPoVprasanjih + 4;
  const cenaStep = prviPoVprasanjih + 5;
  const podatkiStep = prviPoVprasanjih + 6;
  const ponudbaStep = prviPoVprasanjih + 7;
  const KORAKOV = ponudbaStep + 1;
  const trenutnaSkupina = korak > 0 && korak < prviPoVprasanjih ? skupineVprasanj[korak - 1] : null;

  const ponudba = useMemo(() => {
    if (!r) return '';
    const danes = new Date();
    const velja = new Date(danes.getTime() + 30 * 864e5);
    const dat = (x: Date) => `${x.getDate()}. ${x.getMonth() + 1}. ${x.getFullYear()}`;
    const crta = '──────────────────────────────────';
    const st = clamp(Number(ddvStopnja) || 22, 0, 30);
    /* zneski z DDV: natancno zaokrozeni, ne na 50 */
    const zDdv = (n: number) =>
      Math.round(n * vfx.fx * (1 + st / 100)).toLocaleString('sl-SI') + ' ' + vfx.znak;

    /* Glava ponudbe je VEDNO prisotna — prazna polja pokazejo oglate
       oklepaje, ki uporabnika pozovejo, naj izpolni razdelek 01. */
    const v: string[] = [];
    v.push(ponudnik.ime.trim() || '[Ime / podjetje — izpolni v razdelku 01]');
    v.push(ponudnik.naslov.trim() || '[Naslov]');
    const kontakt = [
      ponudnik.davcna.trim() && 'Davčna št.: ' + ponudnik.davcna.trim(),
      ponudnik.telefon.trim() && 'Tel.: ' + predklic + ' ' + ponudnik.telefon.trim(),
      ponudnik.email.trim(),
    ].filter(Boolean).join(' · ');
    v.push(kontakt || '[Davčna št. · Telefon · Email]');
    v.push('');
    v.push(`PONUDBA: ${r.sez.map(s => s.ime).join(', ')}`);
    v.push('Datum: ' + dat(danes) + ' · Ponudba velja do: ' + dat(velja));
    v.push('Naročnik: [ime podjetja]');
    v.push('');
    if (tonPonudbe === 'formalno') {
      v.push('Spoštovani,');
      v.push('v nadaljevanju pošiljam strukturirano ponudbo za dogovorjeni obseg kreativnih storitev.');
    } else if (tonPonudbe === 'direktno') {
      v.push('Pozdravljeni,');
      v.push('spodaj je predlog obsega, paketov in cene. Izberite paket, ki najbolj ustreza tempu in ambiciji projekta.');
    } else {
      v.push('Pozdravljeni,');
      v.push('hvala za povpraševanje. Pripravila sem tri možnosti, da lahko lažje izberemo pravi obseg za projekt.');
    }
    v.push('');
    v.push('OBSEG');
    r.sez.forEach(s => v.push(`· ${s.ime}`));
    postavke.forEach(x => v.push(`· ${x.ime}${x.kolicina > 1 ? ' × ' + x.kolicina : ''}`));
    v.push('· [dopolni po potrebi]');
    const dodatniOdgovori = aktivnaVprasanja
      .map(vp => ({
        ...vp,
        odgovor: [odgovori[vp.key], odgovori[vp.key + ':drugo']]
          .map(vrednost => (vrednost || '').trim())
          .filter(Boolean)
          .join(' · '),
      }))
      .filter(vp => vp.odgovor);
    if (dodatniOdgovori.length) {
      v.push('');
      v.push('DODATNE INFORMACIJE');
      dodatniOdgovori.forEach(vp => v.push(`· ${vp.label}: ${vp.odgovor}`));
    }
    v.push('');
    v.push('IZBERITE PAKET');
    v.push('');
    r.paketi.forEach(p => {
      v.push(`${p.ime.toUpperCase()}  ·  ${val(p.skupaj)}${ddvZavezanec ? `  (z DDV ${zDdv(p.skupaj)})` : ''}`);
      v.push(`  ${p.opis}`);
      v.push('');
    });
    v.push(crta);
    if (r.popustPct) {
      v.push(`V cenah je že upoštevan ${r.popustPct} % popust (redna cena paketa Priporočeni: ${val(r.paketi[1].redna)}).`);
      v.push('');
    }
    v.push('Vsaka cena vključuje izvedbo in enkratni prenos materialnih');
    v.push(`avtorskih pravic za dogovorjeno rabo (${val(r.pravice)} vrednosti).`);
    v.push(`Alternativa odkupu pravic: letna licenca ${val(r.licenca)} / leto${
      r.raba === 'projekt' ? ` ali tantieme ${r.tantiemePct} % od prodaje, obračunano letno` : ''
    }.`);
    v.push('');
    v.push(ddvZavezanec
      ? `DDV: cene so brez DDV; ob izstavitvi računa se obračuna ${st} % DDV.`
      : 'DDV ni obračunan na podlagi 1. odstavka 94. člena ZDDV-1.');
    v.push('');
    v.push('POGOJI');
    v.push('· 40 % avans ob potrditvi, preostanek ob predaji');
    v.push('· popravki nad vključenimi krogi: po urni postavki');
    v.push('· pravice veljajo za navedenega naročnika in navedeno rabo;');
    v.push('  prenos na tretjo osebo ali širša raba se dogovori posebej');
    v.push('· moralne avtorske pravice ostanejo avtorju (navedba avtorstva)');
    v.push('');
    if (tonPonudbe === 'formalno') {
      v.push('Za dodatna vprašanja ali prilagoditev obsega sem vam na voljo.');
      v.push('Veselim se vašega odziva.');
    } else if (tonPonudbe === 'direktno') {
      v.push('Če obseg ustreza, lahko naslednji korak začnemo s potrditvijo paketa in avansom.');
      v.push('Za prilagoditve sem na voljo.');
    } else {
      v.push('Hvala za povpraševanje in izkazano zaupanje. Veselim se');
      v.push('morebitnega sodelovanja, za vsa vprašanja pa sem z veseljem');
      v.push('na voljo.');
    }
    v.push('');
    v.push(ponudnik.ime.trim() || '[Ime]');
    return v.join('\n');
  }, [r, valuta, ponudnik, ddvZavezanec, ddvStopnja, postavke, vfx, predklic, tonPonudbe, aktivnaVprasanja, odgovori]);

  /* Generirano besedilo je izhodisce; uporabnik ga lahko prosto ureja.
     Dokler ga ne uredi, sledi izracunu; po rocnem posegu ga ne prepisujemo. */
  useEffect(() => {
    if (!rocnoBesedilo) {
      const html = ponudbaVHtml(ponudba);
      setBesedilo(ponudba);
      setBesediloHtml(html);
      if (editorRef.current) editorRef.current.innerHTML = html;
    }
  }, [ponudba, rocnoBesedilo]);

  useEffect(() => {
    if (korak === ponudbaStep && editorRef.current && !rocnoBesedilo) {
      editorRef.current.innerHTML = besediloHtml || ponudbaVHtml(besedilo);
    }
  }, [korak, ponudbaStep, besediloHtml, besedilo, rocnoBesedilo]);

  /* Anonimna cenovna tocka za skupno bazo cen na trgu: enkrat na sejo,
     ko uporabnik pride do koraka "Tvoja cena". Brez osebnih podatkov —
     samo kategorije in stevilke (trda ograja v app/api/cene/route.ts). */
  useEffect(() => {
    if (korak !== cenaStep || !r) return;
    try {
      if (sessionStorage.getItem('pinart-cene-poslano')) return;
      sessionStorage.setItem('pinart-cene-poslano', '1');
      fetch('/api/cene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storitve: r.sez.map(s => s.ime),
          izkusnje,
          mojTrg,
          trgNarocnika,
          raba: r.raba,
          izvedbaEUR: r.delo,
          praviceEUR: r.pravice,
          valuta,
        }),
      }).catch(() => {});
    } catch { /* zasebni nacin brskalnika ipd. */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [korak, cenaStep]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [korak]);

  const predlogi = useMemo(() => {
    const q = brezSumnikov(iskanje.trim());
    if (!q) return KATALOG.slice(0, 6);
    let zadetki = KATALOG.filter(k => brezSumnikov(k.ime).includes(q));
    // Slovenske koncnice: "fotografiranje" ne najde "fotografiranja" —
    // ce ni zadetkov, isci se s krajsanim korenom besede.
    if (!zadetki.length && q.length > 4) {
      const koren = q.slice(0, Math.max(4, q.length - 3));
      zadetki = KATALOG.filter(k => brezSumnikov(k.ime).includes(koren));
    }
    return zadetki.slice(0, 6);
  }, [iskanje]);

  const dodajIzKataloga = (k: (typeof KATALOG)[number]) => {
    setPostavke(p => [...p, {
      id: k.id + '-' + p.length,
      ime: k.ime,
      cena: zaokrozi(k.cena * trg(mojTrg).lvl) || k.cena,
      kolicina: 1,
    }]);
    setIskanje('');
    setKazemDodaj(false);
  };

  const dodajSvojo = () => {
    const ime = iskanje.trim();
    if (!ime) return;
    setPostavke(p => [...p, { id: 'svoja-' + p.length, ime, cena: 100, kolicina: 1 }]);
    setIskanje('');
    setKazemDodaj(false);
  };

  const uredi = (id: string, polje: 'cena' | 'kolicina', vrednost: number) => {
    setPostavke(p => p.map(x => x.id === id ? { ...x, [polje]: Math.max(polje === 'kolicina' ? 1 : 0, vrednost) } : x));
  };

  const odstrani = (id: string) => setPostavke(p => p.filter(x => x.id !== id));

  const dodajStoritev = () => {
    const ime = novaIme.trim();
    const cena = Number(novaCena) || 0;
    if (!ime || cena <= 0) return;
    const id = 'moja-' + Date.now();
    setMojeStoritve(m => [...m, { id, ime, osnova: cena }]);
    setIzbrane(z => new Set(z).add(id));
    setNovaIme('');
    setNovaCena('');
  };

  const izbrisiStoritev = (id: string) => {
    setMojeStoritve(m => m.filter(s => s.id !== id));
    setIzbrane(z => { const n = new Set(z); n.delete(id); return n; });
  };

  const preklopi = (set: Set<string>, id: string, fn: (s: Set<string>) => void) => {
    const n = new Set(set);
    if (n.has(id)) n.delete(id); else n.add(id);
    fn(n);
  };

  const preklopiOdgovor = (key: string, vrednost: string) => {
    const izbraneVrednosti = (odgovori[key] || '').split(' · ').filter(Boolean);
    const n = izbraneVrednosti.includes(vrednost)
      ? izbraneVrednosti.filter(v => v !== vrednost)
      : [...izbraneVrednosti, vrednost];
    setOdgovori({ ...odgovori, [key]: n.join(' · ') });
  };

  const sinhronizirajEditor = () => {
    const html = editorRef.current?.innerHTML || '';
    const text = editorRef.current?.innerText || '';
    setBesediloHtml(html);
    setBesedilo(text);
    setRocnoBesedilo(true);
  };

  const oblikuj = (ukaz: string, vrednost?: string) => {
    editorRef.current?.focus();
    document.execCommand(ukaz, false, vrednost);
    sinhronizirajEditor();
  };

  const uvoziPredlogo = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result || '');
      const html = /\.html?$/i.test(file.name) ? raw : ponudbaVHtml(raw);
      setBesediloHtml(html);
      setBesedilo(raw);
      setRocnoBesedilo(true);
      if (editorRef.current) editorRef.current.innerHTML = html;
    };
    reader.readAsText(file);
  };

  const kopiraj = async () => {
    const html = editorRef.current?.innerHTML || besediloHtml || ponudbaVHtml(besedilo);
    const text = editorRef.current?.innerText || besedilo;
    try {
      if ('ClipboardItem' in window) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': new Blob([html], { type: 'text/html' }),
            'text/plain': new Blob([text], { type: 'text/plain' }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(text);
      }
    }
    catch {
      const t = document.createElement('textarea');
      t.value = text; document.body.appendChild(t); t.select();
      document.execCommand('copy'); t.remove();
    }
    setKopirano(true);
    setTimeout(() => setKopirano(false), 1500);
  };

  const imamKontakt = leadIme.trim().length > 1 && /\S+@\S+\.\S+/.test(leadEmail);

  const posljiKontakt = (namen: string) => {
    /* fire-and-forget: kontakt pade v isti Google Sheet kot povprasevanja */
    try {
      localStorage.setItem(K_LEAD, JSON.stringify({ ime: leadIme, email: leadEmail }));
      fetch('/api/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: leadIme, email: leadEmail,
          brief: `Kalkulator cen: ${namen}`, source: 'kalkulator',
        }),
      }).catch(() => {});
    } catch { /* ignoriraj */ }
  };

  const prenesi = () => {
    const html = editorRef.current?.innerHTML || besediloHtml || ponudbaVHtml(besedilo);
    const doc = `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><title>Ponudba</title><style>body{font-family:Arial,sans-serif;max-width:760px;margin:40px auto;line-height:1.55;color:#111}p{margin:0 0 1rem}</style></head><body>${html}</body></html>`;
    const blob = new Blob([doc], { type: 'text/html;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ponudba-pinart-kalkulator.html';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  };

  /* CSV za uvoz v racunovodski program (postavka, kolicina, cena, znesek).
     Skoraj vsak program (racuni, e-racuni) uvozi CSV. Znesek je v EUR
     (interna valuta), da se v racunu ne izgubi zaradi priblizkov tecaja. */
  const prenesiCsv = () => {
    if (!r) return;
    const q = (s: string) => '"' + String(s).replace(/"/g, '""') + '"';
    const vr: string[][] = [['Postavka', 'Kolicina', 'Cena EUR', 'Znesek EUR']];
    r.vrsticeIzvedbe.forEach(x => vr.push([x.ime, String(x.kolicina), String(x.cena), String(x.cena * x.kolicina)]));
    vr.push(['Avtorske pravice (enkratni prenos)', '1', String(r.pravice), String(r.pravice)]);
    const skupaj = r.vrsticeIzvedbe.reduce((a, x) => a + x.cena * x.kolicina, 0) + r.pravice;
    vr.push(['SKUPAJ (priporoceni paket, brez DDV)', '', '', String(skupaj)]);
    const csv = '﻿' + vr.map(row => row.map(q).join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'ponudba-pinart-postavke.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  };

  const zahtevaKontakt = (kaj: 'prenos' | 'profil') => {
    if (imamKontakt && kaj === 'prenos') { posljiKontakt('prenos ponudbe'); prenesi(); return; }
    setKazemZajem(kaj);
  };

  const potrdiZajem = () => {
    if (!imamKontakt) return;
    if (kazemZajem === 'prenos') { posljiKontakt('prenos ponudbe'); prenesi(); setKazemZajem(null); }
  };

  const shraniProfil = () => {
    const ime = imeProfila.trim() || 'Moje cene';
    const nov = { ...profili, [ime]: { osnove, mojTrg, izkusnje, postavke, mojeStoritve } };
    setProfili(nov);
    try { localStorage.setItem(K_PROFILI, JSON.stringify(nov)); } catch { /* poln */ }
    if (imamKontakt) posljiKontakt(`shranjen profil "${ime}"`);
    setKazemZajem(null);
    setImeProfila('');
  };

  const naloziProfil = (ime: string) => {
    const p = profili[ime];
    if (!p) return;
    setOsnove(p.osnove); setMojTrg(p.mojTrg); setIzkusnje(p.izkusnje);
    if (p.postavke) setPostavke(p.postavke);
    if (p.mojeStoritve) setMojeStoritve(p.mojeStoritve);
  };

  const izbrisiProfil = (ime: string) => {
    const nov = { ...profili };
    delete nov[ime];
    setProfili(nov);
    try { localStorage.setItem(K_PROFILI, JSON.stringify(nov)); } catch { /* poln */ }
  };

  /* ── carovnik: navigacija ─────────────────────────────────────────── */
  useEffect(() => {
    setKorak(k => Math.min(k, KORAKOV - 1));
  }, [KORAKOV]);

  const naprej = () => {
    if (korak === 0 && !r) return;
    setKorak(k => Math.min(KORAKOV - 1, k + 1));
  };
  const nazaj = () => setKorak(k => Math.max(0, k - 1));

  const naEnter = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    const t = e.target as HTMLElement;
    if (/^(TEXTAREA|SELECT|BUTTON|A)$/.test(t.tagName)) return;
    if (t.closest('.iskalnik') || t.closest('.cene') || t.closest('.zajem')) return;
    naprej();
  };

  /* ikone storitev (Phosphor, strokeWidth poenoten prek weight) */
  const IKONE: Record<string, React.ReactNode> = {
    logo:        <PenNib size={19} />,
    cgp:         <Palette size={19} />,
    web:         <Browser size={19} />,
    kampanja:    <Megaphone size={19} />,
    publikacija: <BookOpen size={19} />,
    embalaza:    <Package size={19} />,
    ilustracija: <PaintBrush size={19} />,
    direkcija:   <Compass size={19} />,
    fotografija: <Camera size={19} />,
    copy:        <TextT size={19} />,
  };
  const ikonaZa = (id: string) => IKONE[id] ?? <Sparkle size={19} />;

  const naslovKoraka = korak === 0 ? 'Kaj ustvarjaš?'
    : trenutnaSkupina ? trenutnaSkupina.storitev
      : korak === izkusnjeStep ? 'Koliko izkušenj imaš?'
        : korak === mojTrgStep ? 'Kje delaš?'
          : korak === narocnikStep ? 'Od kod je naročnik?'
            : korak === rabaStep ? 'Kako bo naročnik uporabljal tvoje delo?'
              : korak === posebnostiStep ? 'Posebnosti projekta?'
                : korak === cenaStep ? 'Tvoja cena.'
                  : korak === podatkiStep ? 'Tvoji podatki za ponudbo'
                    : 'Tvoja ponudba.';

  const opisKoraka = korak === 0 ? 'Izbereš lahko eno ali več storitev.'
    : trenutnaSkupina ? 'Več o projektu. Odgovori pomagajo določiti obseg ponudbe; lahko jih preskočiš.'
      : korak === mojTrgStep ? 'Tvoj trg nastavi privzete osnove na tam običajno raven.'
        : korak === narocnikStep ? 'Bogatejši trg plača več, revnejši manj. Valuta sledi trgu.'
          : korak === rabaStep ? 'To je vprašanje, ki ga druga orodja ne postavijo.'
            : korak === posebnostiStep ? 'Vse je neobvezno; pusti prazno in pojdi naprej.'
              : korak === podatkiStep ? 'Izpolniš enkrat, orodje si zapomni.'
                : korak === ponudbaStep ? 'Besedilo lahko poljubno urejaš in dopišeš.'
                  : '';

  return (
    <div className="cw" onKeyDown={naEnter}>
      <style>{`
        .cw { min-height: 100dvh; display: flex; flex-direction: column; color: var(--ink); font-weight: 300; }

        .cw .soglasje { position: fixed; inset: 0; z-index: 60; background: rgba(245,242,234,.55); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); display: flex; align-items: center; justify-content: center; padding: 1.5rem; }
        .cw .soglasje-kartica { max-width: 540px; background: var(--paper); border: 1px solid rgba(17,17,17,.25); border-radius: 16px; padding: clamp(1.6rem, 4vw, 2.6rem); box-shadow: 0 24px 80px rgba(17,17,17,.12); }
        .cw .soglasje-kartica h2 { font-family: var(--font-serif), Didot, serif; font-weight: 500; font-size: clamp(1.7rem, 4.5vw, 2.4rem); line-height: 1.05; margin: 0 0 1.1rem; }
        .cw .soglasje-kartica ul { margin: 0 0 1.8rem; padding-left: 0; list-style: none; }
        .cw .soglasje-kartica li { font-size: 1.02rem; font-weight: 400; line-height: 1.65; color: var(--ink); margin-bottom: .8rem; }
        .cw .soglasje-gumbi { display: flex; align-items: center; gap: 1.4rem; flex-wrap: wrap; }
        .cw .napredek { position: fixed; top: 0; left: 0; right: 0; height: 3px; background: rgba(17,17,17,.1); z-index: 40; }
        .cw .napredek i { display: block; height: 100%; background: var(--ink); transition: width .5s cubic-bezier(.16,1,.3,1); }

        .cw .glava { position: fixed; top: 5.2rem; left: 0; right: 0; display: flex; align-items: center; justify-content: space-between; padding: .9rem clamp(1.2rem, 4vw, 3rem) 2.2rem; z-index: 30; pointer-events: none; }
        .cw .glava a { font-size: .74rem; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: rgba(17,17,17,.72); text-decoration: none; }
        .cw .glava a:hover { color: var(--ink); }
        .cw .glava a { pointer-events: auto; }

        .cw .oder { flex: 1; display: flex; align-items: center; justify-content: center; padding: 9rem clamp(1.2rem, 4vw, 3rem) 9rem; }
        .cw .korak-vsebina { width: 100%; max-width: 880px; animation: cwVstop .55s cubic-bezier(.16,1,.3,1) both; }
        @keyframes cwVstop { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .cw .korak-vsebina { animation: none; } }

        .cw h1 { position: relative; font-family: var(--font-serif), Didot, serif; font-weight: 500; font-size: clamp(2.6rem, 7vw, 4.6rem); line-height: 1; letter-spacing: -.012em; margin: 0 0 .8rem; }
        .cw .h1-step { position: absolute; top: .42rem; right: calc(100% + .75rem); font-family: var(--font-sans), system-ui, sans-serif; font-size: .72rem; line-height: 1; font-weight: 800; letter-spacing: .16em; color: rgba(17,17,17,.55); }
        .cw .sub-vrsta { display: flex; justify-content: space-between; align-items: baseline; gap: 2rem; margin: 0 0 2.4rem; flex-wrap: wrap; }
        .cw .sub { font-size: clamp(1rem, 1.6vw, 1.2rem); line-height: 1.6; color: rgba(17,17,17,.72); margin: 0; max-width: 52ch; min-width: 0; }

        .cw .opts { display: flex; flex-wrap: wrap; gap: .55rem; }
        .cw .pill { padding: .8rem 1.3rem; border: 1px solid rgba(17,17,17,.25); border-radius: 999px; cursor: pointer; font-size: 1rem; background: transparent; font-family: inherit; font-weight: 400; color: var(--ink); transition: border-color .18s ease, background .18s ease, color .18s ease; text-align: left; line-height: 1.25; }
        .cw .pill small { display: block; font-size: .82rem; color: rgba(17,17,17,.82); font-weight: 400; margin-top: .1rem; }
        .cw .pill:hover { border-color: var(--ink); }
        .cw .pill.on { background: var(--ink); color: var(--paper); border-color: var(--ink); }
        .cw .pill.on small { color: rgba(245,242,234,.92); }
        .cw .pill:focus-visible { outline: 2px solid var(--ink); outline-offset: 3px; }
        .cw .pill { display: inline-flex; align-items: center; gap: .65rem; }
        .cw .pill .pi { display: inline-flex; flex: none; opacity: .8; }
        .cw .pill.on .pi { opacity: 1; }
        .cw .pill.dodaj { border-style: dashed; border-color: rgba(17,17,17,.55); font-weight: 500; }

        .cw .izbira { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; max-width: 760px; }
        @media (max-width: 640px) { .cw .izbira { grid-template-columns: 1fr; } }
        .cw .izbira button { text-align: left; border: 1px solid rgba(17,17,17,.25); background: transparent; border-radius: 14px; padding: 1.4rem 1.5rem; cursor: pointer; font-family: inherit; color: var(--ink); transition: border-color .18s ease, background .18s ease, color .18s ease; }
        .cw .izbira button h3 { margin: 0 0 .3rem; font-family: var(--font-serif), serif; font-weight: 500; font-size: 1.3rem; }
        .cw .izbira button p { margin: 0; font-size: .85rem; line-height: 1.55; color: rgba(17,17,17,.68); font-weight: 300; }
        .cw .izbira button.on { background: var(--ink); border-color: var(--ink); color: var(--paper); }
        .cw .izbira button.on p { color: rgba(245,242,234,.82); }

        .cw .numgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-top: 2rem; max-width: 640px; }
        @media (max-width: 560px) { .cw .numgrid { grid-template-columns: 1fr; gap: 1.4rem; } }
        .cw .polje label { display: block; font-size: .72rem; font-weight: 600; letter-spacing: .16em; text-transform: uppercase; color: rgba(17,17,17,.7); margin-bottom: .3rem; }
        .cw .polje input { width: 100%; border: none; border-bottom: 1px solid rgba(17,17,17,.45); background: transparent; font-family: var(--font-sans), system-ui, sans-serif; font-weight: 600; font-size: 1.1rem; padding: .35rem 0 .5rem; color: var(--ink); border-radius: 0; }
        .cw .polje input:focus { outline: none; border-bottom: 2px solid var(--ink); margin-bottom: -1px; }
        .cw .polje input::placeholder { color: rgba(17,17,17,.42); font-weight: 400; font-size: 1rem; }
        .cw .polje select { width: 100%; border: none; border-bottom: 1px solid rgba(17,17,17,.45); background: transparent; font-family: var(--font-sans), system-ui, sans-serif; font-weight: 600; font-size: 1.05rem; padding: .35rem 1.6rem .5rem 0; color: var(--ink); border-radius: 0; appearance: none; -webkit-appearance: none; cursor: pointer; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%23111' stroke-width='1.5'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right .2rem center; }
        .cw .tel-vrsta { display: flex; gap: .8rem; align-items: baseline; }
        .cw .tel-vrsta select { width: 6.2rem; flex: none; }
        .cw .polje select:focus { outline: none; border-bottom: 2px solid var(--ink); margin-bottom: -1px; }

        .cw .hint { font-size: .8rem; color: rgba(17,17,17,.68); margin-top: 1.2rem; line-height: 1.65; max-width: 60ch; }
        .cw .hint a { color: var(--ink); }

        .cw .op-edit { display: inline-flex; align-items: center; gap: .45rem; border: none; background: none; cursor: pointer; font-family: inherit; font-weight: 600; font-size: .72rem; letter-spacing: .16em; text-transform: uppercase; color: rgba(17,17,17,.75); padding: 0; white-space: nowrap; }
        .cw .op-edit:hover { color: var(--ink); }
        .cw .cene { margin-top: 1.2rem; }
        .cw .basegrid { display: grid; grid-template-columns: 1fr 120px; gap: .7rem 1rem; align-items: baseline; font-size: .92rem; max-width: 460px; }
        .cw .basegrid input { width: 100%; border: none; border-bottom: 1px solid rgba(17,17,17,.45); background: transparent; font-family: var(--font-sans), system-ui, sans-serif; font-weight: 600; font-size: .98rem; padding: .1rem 0 .2rem; color: var(--ink); text-align: right; border-radius: 0; }
        .cw .basegrid input:focus { outline: none; border-bottom: 2px solid var(--ink); }
        .cw .brisi { border: none; background: none; cursor: pointer; font-family: inherit; font-size: .95rem; color: var(--ink); opacity: .5; padding: 0 .35rem; }
        .cw .brisi:hover { opacity: 1; }

        .cw .iskalnik { margin-top: 1.4rem; max-width: 460px; }
        .cw .isk-glava { display: flex; justify-content: space-between; align-items: baseline; gap: 1rem; }
        .cw .predlogi { border-bottom: 1px solid rgba(17,17,17,.14); }
        .cw .predlogi button { display: flex; justify-content: space-between; gap: 1rem; width: 100%; text-align: left; border: none; border-top: 1px solid rgba(17,17,17,.1); background: none; font-family: inherit; font-size: .92rem; font-weight: 300; color: var(--ink); padding: .65rem .1rem; cursor: pointer; }
        .cw .predlogi button:hover { opacity: .55; }
        .cw .predlogi button span { color: rgba(17,17,17,.65); white-space: nowrap; }
        .cw .predlogi .svoja { font-weight: 500; }

        .cw .postavke { margin-top: 1.6rem; max-width: 540px; }
        .cw .postavka { display: grid; grid-template-columns: 1fr 3.2rem 5rem auto auto; gap: .7rem; align-items: baseline; border-bottom: 1px solid rgba(17,17,17,.12); padding: .5rem 0; font-size: .92rem; }
        .cw .postavka input { border: none; border-bottom: 1px solid rgba(17,17,17,.45); background: transparent; font-family: var(--font-sans), system-ui, sans-serif; font-weight: 600; font-size: .95rem; padding: 0 0 .15rem; color: var(--ink); text-align: right; border-radius: 0; width: 100%; }
        .cw .postavka input:focus { outline: none; border-bottom: 2px solid var(--ink); }
        .cw .postavka .enota { color: rgba(17,17,17,.65); font-size: .85rem; }
        .cw .postavka button { border: none; background: none; cursor: pointer; font-family: inherit; font-size: 1rem; color: var(--ink); opacity: .45; padding: 0 .2rem; }
        .cw .postavka button:hover { opacity: 1; }

        .cw .vprasanja { display: grid; gap: 1rem; max-width: 760px; }
        .cw .vp { border-top: 1px solid rgba(17,17,17,.16); padding-top: 1rem; }
        .cw .vp small { display: block; margin-bottom: .35rem; font-size: .68rem; letter-spacing: .14em; text-transform: uppercase; color: rgba(17,17,17,.5); font-weight: 700; }
        .cw .vp label { display: block; margin-bottom: .55rem; font-weight: 600; color: var(--ink); }
        .cw .vp textarea { min-height: 84px; font-family: var(--font-sans), system-ui, sans-serif; font-size: .95rem; line-height: 1.55; background: rgba(255,255,255,.38); padding: .9rem 1rem; }
        .cw .vp .vp-svoje { width: 100%; max-width: 320px; border: none; border-bottom: 1px solid rgba(17,17,17,.45); background: transparent; font-family: var(--font-sans), system-ui, sans-serif; font-weight: 600; font-size: 1rem; padding: .3rem 0 .4rem; color: var(--ink); border-radius: 0; }
        .cw .vp .vp-svoje:focus { outline: none; border-bottom: 2px solid var(--ink); margin-bottom: -1px; }
        .cw .vp .vp-svoje::placeholder { color: rgba(17,17,17,.45); font-weight: 400; }
        .cw .checkgrid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .45rem .7rem; margin: .15rem 0 .75rem; }
        .cw .checkgrid label { display: flex; align-items: flex-start; gap: .5rem; margin: 0; font-size: .9rem; line-height: 1.35; font-weight: 400; cursor: pointer; }
        .cw .checkgrid input { margin-top: .15rem; accent-color: var(--ink); }
        .cw .choicegrid { display: flex; flex-wrap: wrap; gap: .45rem; margin: .15rem 0 .2rem; }
        .cw .choicegrid button { border: 1px solid rgba(17,17,17,.22); background: rgba(255,255,255,.28); color: var(--ink); border-radius: 999px; padding: .55rem .85rem; font-family: inherit; font-size: .86rem; cursor: pointer; }
        .cw .choicegrid button.on { background: var(--ink); border-color: var(--ink); color: var(--paper); }

        .cw .paketi { display: grid; grid-template-columns: 1fr 1.15fr 1fr; margin-top: .6rem; border-top: 1px solid rgba(17,17,17,.18); }
        @media (max-width: 640px) { .cw .paketi { grid-template-columns: 1fr; } }
        .cw .paket { padding: 1.7rem 1.4rem 1.8rem; border-bottom: 1px solid rgba(17,17,17,.18); }
        .cw .paket + .paket { border-left: 1px solid rgba(17,17,17,.18); }
        @media (max-width: 640px) { .cw .paket + .paket { border-left: none; } }
        .cw .paket.mid { background: var(--ink); color: var(--paper); }
        .cw .paket h3 { margin: 0; font-size: .7rem; letter-spacing: .2em; text-transform: uppercase; font-weight: 600; opacity: .85; }
        .cw .paket .redna { font-family: var(--font-serif), serif; font-size: 1.05rem; text-decoration: line-through; opacity: .62; margin-top: .5rem; margin-bottom: -.4rem; }
        .cw .paket .znesek { font-family: var(--font-serif), Didot, serif; font-size: clamp(2rem, 4.5vw, 2.6rem); font-weight: 500; margin: .5rem 0 .55rem; letter-spacing: -.01em; }
        .cw .paket p { margin: 0; font-size: .8rem; line-height: 1.6; opacity: .8; }
        .cw .paket.mid p { opacity: .88; }
        .cw .razlaga { font-size: .85rem; color: rgba(17,17,17,.72); line-height: 1.75; margin: 1.5rem 0 0; max-width: 64ch; }
        .cw .razlaga b { color: var(--ink); font-weight: 600; }

        .cw textarea { width: 100%; min-height: 320px; border: 1px solid rgba(17,17,17,.25); background: rgba(255,255,255,.5); font-family: ui-monospace, Menlo, monospace; font-size: .8rem; line-height: 1.6; padding: 1.4rem; resize: vertical; color: var(--ink); border-radius: 0; }
        .cw textarea:focus { outline: none; border-color: var(--ink); }
        .cw .tonbar { display: inline-flex; flex-wrap: nowrap; gap: .3rem; align-items: center; max-width: 100%; margin: .1rem 0 .75rem; padding: .25rem; border: 1px solid rgba(17,17,17,.16); border-radius: 999px; background: rgba(255,255,255,.34); }
        .cw .tonbar button { height: 2rem; border: none; border-radius: 999px; background: transparent; color: rgba(17,17,17,.68); padding: 0 .85rem; font-family: var(--font-sans), system-ui, sans-serif; font-size: .72rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; white-space: nowrap; cursor: pointer; }
        .cw .tonbar button:hover { color: var(--ink); background: rgba(17,17,17,.05); }
        .cw .tonbar button.on { background: var(--ink); color: var(--paper); }
        @media (max-width: 560px) {
          .cw .tonbar { display: flex; overflow-x: auto; }
          .cw .tonbar button { flex: 1 0 auto; }
        }
        .cw .orodjarna { display: flex; flex-wrap: wrap; gap: .45rem; align-items: center; margin: 1rem 0 .8rem; }
        .cw .tool { min-height: 2.25rem; display: inline-flex; align-items: center; gap: .4rem; border: 1px solid rgba(17,17,17,.22); background: rgba(255,255,255,.32); color: var(--ink); border-radius: 999px; padding: 0 .75rem; font-family: inherit; font-weight: 600; font-size: .78rem; cursor: pointer; }
        .cw .tool:hover { border-color: var(--ink); }
        .cw .barvica { width: 1.35rem; height: 1.35rem; border-radius: 999px; border: 1px solid rgba(17,17,17,.22); cursor: pointer; }
        .cw .editor { width: 100%; min-height: 340px; border: 1px solid rgba(17,17,17,.25); background: rgba(255,255,255,.52); padding: 1.35rem; color: var(--ink); font-family: var(--font-sans), system-ui, sans-serif; font-size: .94rem; line-height: 1.62; overflow: auto; }
        .cw .editor:focus { outline: none; border-color: var(--ink); }
        .cw .editor b, .cw .editor strong { font-weight: 900; color: var(--ink); }
        .cw .editor h1 b, .cw .editor h1 strong { font-weight: 900; }
        .cw .editor h1 { margin: 0 0 1.1rem; font-family: var(--font-serif), Didot, serif; font-size: clamp(2rem, 5vw, 3.4rem); line-height: .98; font-weight: 500; letter-spacing: -.01em; }
        .cw .editor h2 { margin: 1.7rem 0 .65rem; font-size: .76rem; line-height: 1.2; font-weight: 800; letter-spacing: .18em; text-transform: uppercase; border-top: 1px solid rgba(17,17,17,.18); padding-top: .75rem; }
        .cw .editor h3 { margin: 0 0 .45rem; font-family: var(--font-serif), Didot, serif; font-size: clamp(1.25rem, 3vw, 1.75rem); line-height: 1.1; font-weight: 500; }
        .cw .editor p { margin: 0 0 .95rem; max-width: 72ch; }
        .cw .editor ul { margin: 0 0 1.1rem; padding-left: 1.15rem; }
        .cw .editor li { margin: .25rem 0; }
        .cw .editor hr { border: 0; border-top: 1px solid rgba(17,17,17,.2); margin: 1rem 0; }
        .cw .editor .offer-package { border: 1px solid rgba(17,17,17,.18); background: rgba(236,230,213,.34); padding: .95rem 1rem; margin: .65rem 0; }
        .cw .editor .offer-package-head { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; margin-bottom: .35rem; }
        .cw .editor .offer-package h3 { margin: 0; font-family: var(--font-sans), system-ui, sans-serif; font-size: .78rem; line-height: 1.2; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }
        .cw .editor .offer-package strong { font-family: var(--font-serif), Didot, serif; font-size: 1.35rem; line-height: 1; font-weight: 500; white-space: nowrap; }
        .cw .editor .offer-package p { margin-bottom: 0; max-width: none; color: rgba(17,17,17,.72); }
        .cw .btnvrsta { display: flex; gap: 1.4rem; flex-wrap: wrap; margin-top: 1.2rem; align-items: center; }
        .cw .gumb { font-family: inherit; font-size: .82rem; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; cursor: pointer; border-radius: 999px; padding: .95rem 2.2rem; border: 1px solid var(--ink); background: var(--ink); color: var(--paper); transition: opacity .18s ease; display: inline-flex; align-items: center; justify-content: center; gap: .45rem; }
        .cw .gumb:hover { opacity: .78; }
        .cw .gumb:disabled { opacity: .35; cursor: default; }
        .cw .povezava { font-family: inherit; font-size: .88rem; font-weight: 500; cursor: pointer; border: none; background: none; color: var(--ink); text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: .28em; padding: 0; display: inline-flex; align-items: center; gap: .38rem; }
        .cw .povezava:hover { opacity: .6; }

        .cw .zajem { border-top: 1px solid rgba(17,17,17,.18); margin-top: 1.8rem; padding-top: 1.4rem; max-width: 400px; }
        .cw .zajem p { margin: 0 0 1rem; font-size: .85rem; line-height: 1.65; color: rgba(17,17,17,.75); }
        .cw .zajem .polje { margin-bottom: 1rem; }
        .cw .zajem .polje input { font-size: 1.1rem; font-family: inherit; }
        .cw .profili { display: flex; flex-wrap: wrap; gap: .5rem; margin-top: 1.4rem; }
        .cw .profil { display: inline-flex; align-items: center; gap: .3rem; border: 1px solid rgba(17,17,17,.25); border-radius: 999px; padding: .35rem .5rem .35rem .95rem; font-size: .84rem; }
        .cw .profil button { border: none; background: none; cursor: pointer; font-size: .84rem; padding: .15rem .35rem; font-family: inherit; color: var(--ink); opacity: .6; }
        .cw .profil button:hover { opacity: 1; }

        .cw .noga { position: fixed; bottom: 0; left: 0; right: 0; display: flex; justify-content: center; padding: 1rem clamp(1.2rem, 4vw, 3rem) 1.1rem; background: linear-gradient(to top, var(--paper) 70%, transparent); z-index: 30; }
        .cw .noga .noga-c { width: 100%; display: flex; align-items: center; justify-content: center; gap: 1rem; }
        .cw .noga .noga-gumbi { display: flex; align-items: center; gap: .8rem; }
        .cw .gumb-nazaj { width: 3.1rem; height: 3.1rem; border-radius: 999px; border: 1px solid var(--ink); background: transparent; color: var(--ink); font-size: 1.15rem; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: background .18s ease, color .18s ease; flex: none; }
        .cw .gumb-nazaj:hover { background: var(--ink); color: var(--paper); }
        .cw .noga .nazaj-g { font-family: inherit; font-size: .82rem; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; border: none; background: none; cursor: pointer; color: rgba(17,17,17,.72); padding: .6rem 0; }
        .cw .noga .nazaj-g:hover { color: var(--ink); }
        .cw .a11y { position: fixed; left: clamp(1.2rem, 4vw, 3rem); bottom: 1.05rem; z-index: 35; }
        .cw .a11y-btn { width: 2.8rem; height: 2.8rem; border-radius: 999px; border: 1px solid rgba(17,17,17,.28); background: color-mix(in oklab, var(--paper) 92%, white); color: var(--ink); display: inline-flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 .7rem 1.8rem rgba(17,17,17,.08); }
        .cw .a11y-btn:hover { border-color: var(--ink); }
        .cw .a11y-panel { position: absolute; left: 0; bottom: 3.4rem; width: min(27rem, calc(100vw - 2.4rem)); max-height: min(70dvh, 34rem); overflow: auto; border: 1px solid rgba(17,17,17,.22); background: color-mix(in oklab, var(--paper) 98%, white); padding: 1rem 1.1rem; box-shadow: 0 1rem 2.4rem rgba(17,17,17,.14); }
        .cw .a11y-panel h2 { margin: 0 0 .7rem; font-family: var(--font-sans), system-ui, sans-serif; font-size: .82rem; line-height: 1.2; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; color: var(--ink); }
        .cw .a11y-panel h3 { margin: .9rem 0 .35rem; font-family: var(--font-sans), system-ui, sans-serif; font-size: .82rem; line-height: 1.25; font-weight: 800; color: var(--ink); }
        .cw .a11y-panel p { margin: 0 0 .6rem; font-size: .9rem; line-height: 1.5; color: rgba(17,17,17,.9); }
        .cw .a11y-panel ul { margin: 0; padding-left: 1.05rem; }
        .cw .a11y-panel li { margin: .34rem 0; font-size: .9rem; line-height: 1.48; color: rgba(17,17,17,.9); }
        .cw .a11y-close { position: absolute; top: .85rem; right: .9rem; border: none; background: none; padding: .2rem; font-family: inherit; font-size: 1rem; line-height: 1; cursor: pointer; color: var(--ink); }
        @media (max-width: 760px) {
          .cw .glava { background: var(--paper); padding-top: .75rem; padding-bottom: .75rem; }
          .cw .glava a { color: var(--ink); }
          .cw .oder { align-items: flex-start; padding-top: 10.4rem; padding-bottom: 8rem; }
          .cw h1 { padding-left: 1.65rem; font-size: clamp(2.15rem, 11vw, 2.85rem); line-height: .98; margin-bottom: .6rem; }
          .cw .h1-step { position: absolute; top: 0; left: calc(-1 * clamp(1.2rem, 4vw, 3rem)); width: 2.15rem; height: 2.05rem; display: inline-flex; align-items: center; justify-content: center; background: var(--ink); color: var(--paper); border-radius: 0 .35rem .35rem 0; font-size: .62rem; letter-spacing: .08em; }
          .cw .sub-vrsta { margin-bottom: 1.7rem; gap: .8rem; flex-wrap: nowrap; align-items: baseline; }
          .cw .sub { flex: 1 1 auto; font-size: .94rem; line-height: 1.5; }
          .cw .sub-vrsta .op-edit { margin-left: auto; text-align: right; flex: none; white-space: nowrap; justify-content: flex-end; line-height: 1.25; font-size: .66rem; letter-spacing: .13em; }
          .cw .opts { display: flex; flex-wrap: wrap; gap: .45rem; }
          .cw .pill { min-width: 0; flex: 1 1 calc(50% - .45rem); padding: .62rem .68rem; gap: .42rem; font-size: .78rem; line-height: 1.18; border-radius: 1.25rem; }
          .cw .pill small { font-size: .66rem; line-height: 1.2; }
          .cw .pill .pi svg { width: 15px; height: 15px; }
          .cw .a11y { bottom: 5.4rem; }
          .cw .noga .noga-gumbi { gap: .55rem; }
        }
        @media (max-width: 420px) {
          .cw .noga .gumb { padding-left: 1.35rem; padding-right: 1.35rem; }
        }
      `}</style>

      {pogojiOk === false && (
        <div className="soglasje" role="dialog" aria-modal="true" aria-label="Pogoji uporabe">
          <div className="soglasje-kartica">
            <h2>Samo troje, preden začneš</h2>
            <ul>
              <li>Priporočene cene so pametno izhodišče, ne uradni cenik: nastale so iz izkušenj, tržno bazo pa šele gradimo. Svobodno jih prilagodi — končna cena v tvojih ponudbah je vedno tvoja odločitev in tvoja odgovornost.</li>
              <li>Tvoje cene, postavke in podatki ostanejo shranjeni samo v tvojem brskalniku.</li>
              <li>Ob prikazu izračuna anonimno zabeležimo izbrane kategorije in zneske (brez imena, e-naslova ali IP). S tem skupaj gradimo prvo statistiko cen za kreativce: ko bo baza dovolj velika, boš videl, koliko kolegi s podobnimi izkušnjami dejansko računajo. Nihče drug tega podatka danes nima.</li>
            </ul>
            <div className="soglasje-gumbi" style={{ justifyContent: 'space-between' }}>
              <a className="povezava" href={`/${locale}/kalkulator/pogoji`}>Preberi celotne pogoje</a>
              <button type="button" className="gumb" onClick={sprejmiPogoje}>Razumem, gremo →</button>
            </div>
          </div>
        </div>
      )}

      <div className="napredek" aria-hidden><i style={{ width: `${((korak + 1) / KORAKOV) * 100}%` }} /></div>

      <div className="a11y">
        {kazemDostopnost && (
          <div className="a11y-panel" role="dialog" aria-label="Dostopnost">
            <button type="button" className="a11y-close" aria-label="Zapri dostopnost" onClick={() => setKazemDostopnost(false)}>×</button>
            <h2>Dostopnost</h2>
            <p>Kalkulator je zasnovan tako, da ga lahko uporabljaš z miško, dotikom, tipkovnico ali podpornimi tehnologijami.</p>
            <h3>Tipkovnica</h3>
            <ul>
              <li>Tab premika fokus med polji, izbirami in gumbi.</li>
              <li>Enter premakne kalkulator na naslednji korak, ko nisi v večvrstičnem besedilnem polju.</li>
              <li>Shift + Tab premakne fokus nazaj.</li>
            </ul>
            <h3>Bralniki zaslona in prikaz</h3>
            <ul>
              <li>Glavna polja in gumbi imajo opisne oznake.</li>
              <li>Stran podpira povečavo brskalnika in sistemske nastavitve za večji tekst.</li>
              <li>Animacije spoštujejo nastavitev za zmanjšano gibanje.</li>
            </ul>
            <h3>Glasovni ukazi</h3>
            <ul>
              <li><strong>macOS:</strong> System Settings → Accessibility → Voice Control → Turn on Voice Control.</li>
              <li>iPhone/iPad: Settings → Accessibility → Voice Control.</li>
              <li><strong>Windows:</strong> Settings → Accessibility → Speech ali Voice access.</li>
              <li>Ko je funkcija vključena, lahko rečeš na primer “Click Naprej”, “Click Nazaj” ali “Show numbers”.</li>
            </ul>
          </div>
        )}
        <button
          type="button"
          className="a11y-btn"
          aria-label="Dostopnost"
          aria-expanded={kazemDostopnost}
          onClick={() => setKazemDostopnost(v => !v)}
        >
          <PersonSimple size={22} weight="bold" />
        </button>
      </div>

      <div className="glava">
        <a href={`/${locale}/kalkulator`}>← Predstavitev</a>
      </div>

      <div className="oder">
        <div className="korak-vsebina" key={korak}>
          <h1><span className="h1-step">{String(korak + 1).padStart(2, '0')}</span>{naslovKoraka}</h1>
          {(opisKoraka || korak === 0) && (
            <div className="sub-vrsta">
              <p className="sub">{opisKoraka}</p>
              {korak === 0 && (
                <button type="button" className="op-edit" onClick={() => setKazemCene(!kazemCene)} aria-expanded={kazemCene}>
                  {kazemCene ? '✕ Zapri cene' : '✎ Nastavi svoje cene'}
                </button>
              )}
            </div>
          )}

          {korak === 0 && kazemCene && (
            <div className="cene" style={{ marginBottom: '1.8rem' }}>
              <div className="isk-glava" style={{ marginBottom: '.9rem', maxWidth: '460px' }}>
                <span style={{ fontSize: '.72rem', fontWeight: 600, letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(17,17,17,.7)' }}>
                  Tvoje osnovne cene
                </span>
                <button type="button" className="op-edit" onClick={() => setKazemCene(false)}>✕ Zapri</button>
              </div>
              <div className="basegrid">
                {vseStoritve.map(s => (
                  <div key={s.id} style={{ display: 'contents' }}>
                    <div>
                      {s.ime}
                      {s.id.startsWith('moja-') && (
                        <button type="button" className="brisi" title={'Izbriši storitev ' + s.ime}
                          onClick={() => izbrisiStoritev(s.id)}>×</button>
                      )}
                    </div>
                    <input type="number" min={0} step={50} value={osnovaZa(s)} aria-label={'Osnovna cena: ' + s.ime}
                      onChange={e => setOsnove({ ...osnove, [s.id]: Number(e.target.value) || 0 })} />
                  </div>
                ))}
                <div style={{ display: 'contents' }}>
                  <input type="text" placeholder="Tvoja storitev (npr. 3D vizualizacija)"
                    value={novaIme} onChange={e => setNovaIme(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') dodajStoritev(); }}
                    aria-label="Ime nove storitve" style={{ textAlign: 'left', fontFamily: 'inherit', fontSize: '.92rem' }} />
                  <input type="number" min={0} step={50} placeholder="cena"
                    value={novaCena} onChange={e => setNovaCena(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') dodajStoritev(); }}
                    aria-label="Osnovna cena nove storitve" />
                </div>
              </div>
              <button type="button" className="povezava" style={{ marginTop: '.9rem' }} onClick={dodajStoritev}>
                + dodaj svojo storitev
              </button>
            </div>
          )}

          {korak === 0 && (
            <>
              <div className="opts">
                {vseStoritve.map(s => (
                  <button key={s.id} type="button"
                    className={'pill' + (izbrane.has(s.id) ? ' on' : '')}
                    onClick={() => preklopi(izbrane, s.id, setIzbrane)}>
                    <span className="pi" aria-hidden>{ikonaZa(s.id)}</span>
                    <span>{s.ime}<small>od {val(osnovaZa(s))}</small></span>
                  </button>
                ))}
                <button type="button" className="pill dodaj" onClick={() => setKazemDodaj(!kazemDodaj)}>
                  <span className="pi" aria-hidden><Plus size={19} /></span>
                  <span>dodaj postavko<small>foto, video, AI, besedila, svoje …</small></span>
                </button>
              </div>

              {kazemDodaj && (
                <div className="iskalnik">
                  <div className="polje">
                    <div className="isk-glava">
                      <label htmlFor="cw-iskanje">Poišči ali vpiši svojo postavko</label>
                      <button type="button" className="op-edit" style={{ marginTop: 0 }}
                        onClick={() => { setKazemDodaj(false); setIskanje(''); }}>✕ Zapri</button>
                    </div>
                    <input id="cw-iskanje" autoFocus placeholder="npr. animacija ikon"
                      value={iskanje} onChange={e => setIskanje(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && predlogi.length) dodajIzKataloga(predlogi[0]); }} />
                  </div>
                  <div className="predlogi">
                    {predlogi.map(k => (
                      <button key={k.id} type="button" onClick={() => dodajIzKataloga(k)}>
                        {k.ime}<span>{val(zaokrozi(k.cena * trg(mojTrg).lvl) || k.cena)}</span>
                      </button>
                    ))}
                    {iskanje.trim() && !predlogi.some(k => brezSumnikov(k.ime) === brezSumnikov(iskanje.trim())) && (
                      <button type="button" className="svoja" onClick={dodajSvojo}>
                        + dodaj »{iskanje.trim()}« kot svojo postavko
                      </button>
                    )}
                  </div>
                </div>
              )}

              {postavke.length > 0 && (
                <div className="postavke">
                  {postavke.map(x => (
                    <div key={x.id} className="postavka">
                      <span>{x.ime}</span>
                      <input type="number" min={1} step={1} value={x.kolicina} aria-label={'Količina: ' + x.ime}
                        onChange={e => uredi(x.id, 'kolicina', Number(e.target.value) || 1)} />
                      <input type="number" min={0} step={10} value={x.cena} aria-label={'Cena: ' + x.ime}
                        onChange={e => uredi(x.id, 'cena', Number(e.target.value) || 0)} />
                      <span className="enota">€</span>
                      <button type="button" title="Odstrani" onClick={() => odstrani(x.id)}>×</button>
                    </div>
                  ))}
                </div>
              )}

            </>
          )}

          {trenutnaSkupina && (
            <>
              <div className="vprasanja">
                {trenutnaSkupina.vprasanja.map(vp => (
                  <div key={vp.key} className="vp">
                    <label htmlFor={'cw-vp-' + vp.key}>{vp.label}</label>
                    {vp.izbire ? (
                      <div className="choicegrid">
                        {vp.izbire.map(vrednost => {
                          const izbrane_v = vp.vec ? (odgovori[vp.key] || '').split(' + ').filter(Boolean) : [];
                          const aktiven = vp.vec ? izbrane_v.includes(vrednost) : odgovori[vp.key] === vrednost;
                          const nova = vp.vec
                            ? (aktiven ? izbrane_v.filter(x => x !== vrednost) : [...izbrane_v, vrednost]).join(' + ')
                            : (aktiven ? '' : vrednost);
                          return (
                            <button
                              key={vrednost}
                              type="button"
                              className={aktiven ? 'on' : ''}
                              onClick={() => setOdgovori({ ...odgovori, [vp.key]: nova })}
                            >
                              {vp.vec && aktiven ? '✓ ' : ''}{vrednost}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                    {vp.izbire && vp.svoje ? (
                      <input
                        id={'cw-vp-' + vp.key + '-svoje'}
                        type="text"
                        className="vp-svoje"
                        placeholder={vp.svoje}
                        aria-label={vp.label + ' (svoj vnos)'}
                        style={{ marginTop: '.6rem' }}
                        value={vp.izbire.includes(odgovori[vp.key] || '') ? '' : (odgovori[vp.key] || '')}
                        onChange={e => setOdgovori({ ...odgovori, [vp.key]: e.target.value })}
                      />
                    ) : null}
                    {vp.izbire ? null : trenutnaSkupina.id === 'web' && vp.id === 'kompleksnost' ? (
                      <div className="choicegrid">
                        {WEB_KOMPLEKSNOST.map(vrednost => (
                          <button
                            key={vrednost}
                            type="button"
                            className={odgovori[vp.key] === vrednost ? 'on' : ''}
                            onClick={() => setOdgovori({ ...odgovori, [vp.key]: vrednost })}
                          >
                            {vrednost}
                          </button>
                        ))}
                      </div>
                    ) : trenutnaSkupina.id === 'web' && vp.id === 'budget' ? (
                      <div className="choicegrid">
                        {WEB_BUDGETI.map(vrednost => (
                          <button
                            key={vrednost}
                            type="button"
                            className={odgovori[vp.key] === vrednost ? 'on' : ''}
                            onClick={() => setOdgovori({ ...odgovori, [vp.key]: vrednost })}
                          >
                            {vrednost}
                          </button>
                        ))}
                      </div>
                    ) : trenutnaSkupina.id === 'web' && vp.id === 'funkcije' ? (
                      <>
                        <div className="checkgrid">
                          {WEB_FUNKCIONALNOSTI.map(f => (
                            <label key={f}>
                              <input
                                type="checkbox"
                                checked={(odgovori[vp.key] || '').split(' · ').includes(f)}
                                onChange={() => preklopiOdgovor(vp.key, f)}
                              />
                              <span>{f}</span>
                            </label>
                          ))}
                        </div>
                        <textarea
                          id={'cw-vp-' + vp.key}
                          value={odgovori[vp.key + ':drugo'] || ''}
                          placeholder="Drugo ali bolj specifično: npr. kalkulator, portal, konfigurator, povezava z ERP ..."
                          onChange={e => setOdgovori({ ...odgovori, [vp.key + ':drugo']: e.target.value })}
                        />
                      </>
                    ) : trenutnaSkupina.id === 'web' && vp.id === 'dodatno' ? (
                      <>
                        <div className="checkgrid">
                          {WEB_DODATNE_STORITVE.map(f => (
                            <label key={f}>
                              <input
                                type="checkbox"
                                checked={(odgovori[vp.key] || '').split(' · ').includes(f)}
                                onChange={() => preklopiOdgovor(vp.key, f)}
                              />
                              <span>{f}</span>
                            </label>
                          ))}
                        </div>
                        <textarea
                          id={'cw-vp-' + vp.key}
                          value={odgovori[vp.key + ':drugo'] || ''}
                          placeholder="Drugo: npr. brand refresh, ilustracije, prevodi, email predloge ..."
                          onChange={e => setOdgovori({ ...odgovori, [vp.key + ':drugo']: e.target.value })}
                        />
                      </>
                    ) : (
                      <textarea
                        id={'cw-vp-' + vp.key}
                        value={odgovori[vp.key] || ''}
                        placeholder={vp.placeholder || 'Kratek odgovor, lahko pustiš prazno.'}
                        onChange={e => setOdgovori({ ...odgovori, [vp.key]: e.target.value })}
                      />
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {korak === izkusnjeStep && (
            <div className="izbira">
              {IZKUSNJE.map(i => (
                <button key={i.id} type="button" className={izkusnje === i.id ? 'on' : ''}
                  onClick={() => { setIzkusnje(i.id); }}>
                  <h3>{i.ime}</h3>
                  <p>{i.opis}</p>
                </button>
              ))}
            </div>
          )}

          {korak === mojTrgStep && (
            <div className="opts">
              {TRGI.map(t => (
                <button key={t.id} type="button"
                  className={'pill' + (mojTrg === t.id ? ' on' : '')}
                  onClick={() => setMojTrg(t.id)}>
                  {t.ime}
                </button>
              ))}
            </div>
          )}

          {korak === narocnikStep && (
            <>
              <div className="opts">
                {TRGI.map(t => (
                  <button key={t.id} type="button"
                    className={'pill' + (trgNarocnika === t.id ? ' on' : '')}
                    onClick={() => setTrgNarocnika(t.id)}>
                    {t.ime}
                  </button>
                ))}
              </div>
              <div className="numgrid">
                <div className="polje">
                  <label htmlFor="cw-valuta">Valuta ponudbe</label>
                  <select id="cw-valuta" value={valuta}
                    onChange={e => { setValuta(e.target.value); setValutaRocna(true); }}>
                    <option value="eur">EUR (€)</option>
                    <option value="usd">USD ($)</option>
                    <option value="gbp">GBP (£)</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {korak === rabaStep && (
            <>
              <div className="izbira">
                <button type="button" className={raba === 'znamka' ? 'on' : ''} onClick={() => setRaba('znamka')}>
                  <h3>Za celotno znamko</h3>
                  <p>Logotip, celostna podoba, spletna stran. Tvoje delo nosi vse, kar podjetje počne, zato vrednost sledi bilanci podjetja.</p>
                </button>
                <button type="button" className={raba === 'projekt' ? 'on' : ''} onClick={() => setRaba('projekt')}>
                  <h3>Za določen projekt ali izdelek</h3>
                  <p>Majice, embalaža enega izdelka, konferenca, knjiga. Vrednost sledi pričakovanemu izkupičku projekta, ne velikosti podjetja.</p>
                </button>
              </div>

              {raba === 'znamka' ? (
                <>
                  <div className="numgrid">
                    <div className="polje">
                      <label htmlFor="cw-promet">Letni promet naročnika (€)</label>
                      <input id="cw-promet" type="number" min={0} step={10000}
                        placeholder="800000" value={promet}
                        onChange={e => setPromet(e.target.value)} />
                    </div>
                    <div className="polje">
                      <label htmlFor="cw-dobicek">Letni dobiček naročnika (€)</label>
                      <input id="cw-dobicek" type="number" min={0} step={5000}
                        placeholder="60000" value={dobicek}
                        onChange={e => setDobicek(e.target.value)} />
                    </div>
                  </div>
                  <p className="hint">
                    Kje preveriš:{' '}
                    {(REGISTRI[trgNarocnika] ?? REGISTRI.si).concat(REGISTRI_UNIV).map((reg, i) => (
                      <span key={reg.url}>
                        {i > 0 && ' · '}
                        <a href={reg.url} target="_blank" rel="noopener noreferrer">{reg.ime}</a>
                      </span>
                    ))}
                    . Prazno pomeni mikro podjetje. Glej dobiček konkretnega podjetja, ne povprečne plače države.
                  </p>
                </>
              ) : (
                <>
                  <div className="numgrid">
                    <div className="polje">
                      <label htmlFor="cw-pprihodek">Pričakovani letni prihodek projekta (€)</label>
                      <input id="cw-pprihodek" type="number" min={0} step={5000}
                        placeholder="50000" value={projPrihodek}
                        onChange={e => setProjPrihodek(e.target.value)} />
                    </div>
                    <div className="polje">
                      <label htmlFor="cw-pdobicek">Pričakovani letni dobiček projekta (€)</label>
                      <input id="cw-pdobicek" type="number" min={0} step={5000}
                        placeholder="15000" value={projDobicek}
                        onChange={e => setProjDobicek(e.target.value)} />
                    </div>
                  </div>
                  <p className="hint">
                    Vprašaj naročnika, koliko prodaje pričakuje od izdelka ali projekta; ocena je dovolj.
                    Pravice so 10 % pričakovanega dobička (ali 2 % prihodka), z varovalkama.
                    V ponudbi dobi tudi možnost tantiem: {`${5} %`} od prodaje letno.
                  </p>
                </>
              )}
            </>
          )}

          {korak === posebnostiStep && (
            <>
              <div className="opts">
                {DODATKI.map(d => (
                  <button key={d.id} type="button"
                    className={'pill' + (dodatki.has(d.id) ? ' on' : '')}
                    onClick={() => preklopi(dodatki, d.id, setDodatki)}>
                    {d.ime}<small>{d.opis}</small>
                  </button>
                ))}
              </div>
              <div className="numgrid">
                <div className="polje">
                  <label htmlFor="cw-popust">Popust (%)</label>
                  <input id="cw-popust" type="number" min={0} max={50} step={5}
                    placeholder="0" value={popust}
                    onChange={e => setPopust(e.target.value)} />
                </div>
              </div>
              <p className="hint">Popust naj ima vedno razlog (prvi projekt, paket, dolgoročno sodelovanje) in v ponudbi vedno stoji ob redni ceni.</p>
            </>
          )}

          {korak === cenaStep && r && (
            <>
              <div className="paketi">
                {r.paketi.map(p => (
                  <div key={p.id} className={'paket' + (p.id === 'priporoceni' ? ' mid' : '')}>
                    <h3>{p.ime}</h3>
                    {r.popustPct > 0 && <div className="redna">{val(p.redna)}</div>}
                    <div className="znesek">{val(p.skupaj)}</div>
                    <p>{p.opis}</p>
                  </div>
                ))}
              </div>
              <p className="razlaga">
                Izvedba: {r.sez.map(s => s.ime.toLowerCase()).join(' + ')} · {r.izk.ime.toLowerCase()} ×{r.izk.mult} · {r.vel.opis}{r.vel.mult !== 1 ? ` ×${r.vel.mult}` : ''}{r.trgMult !== 1 ? ` · trg naročnika ×${r.trgMult.toFixed(2)}` : ''}.
                V vsakem paketu je <b>enkratni prenos avtorskih pravic {val(r.pravice)}</b>.
                Alternativa: <b>letna licenca {val(r.licenca)}</b>{r.raba === 'projekt' ? <> ali <b>tantieme {r.tantiemePct} % od prodaje</b></> : null}.
                Tri opcije zato, ker stranka takrat ne izbira med »da« in »ne«, ampak med »katero«.
              </p>
              <p className="hint">
                Tvoj izračun anonimno (brez imena, maila ali česarkoli osebnega) prispeva
                cenovno točko v skupno statistiko cen za kreativce. Hvala, da gradiš pregled trga.
              </p>
            </>
          )}
          {korak === cenaStep && !r && (
            <p className="sub">Najprej izberi vsaj eno storitev v prvem koraku.</p>
          )}

          {korak === podatkiStep && (
            <>
              <div className="numgrid" style={{ marginTop: '.4rem' }}>
                <div className="polje">
                  <label htmlFor="cw-pime">Ime / podjetje</label>
                  <input id="cw-pime" type="text" placeholder="Pinart, Tina Zaletel"
                    value={ponudnik.ime} onChange={e => setPonudnik({ ...ponudnik, ime: e.target.value })} />
                </div>
                <div className="polje">
                  <label htmlFor="cw-pdavcna">Davčna številka</label>
                  <input id="cw-pdavcna" type="text" placeholder="SI12345678"
                    value={ponudnik.davcna} onChange={e => setPonudnik({ ...ponudnik, davcna: e.target.value })} />
                </div>
              </div>
              <div className="numgrid">
                <div className="polje">
                  <label htmlFor="cw-pemail">Email</label>
                  <input id="cw-pemail" type="email" placeholder="tina@pinart.si"
                    value={ponudnik.email} onChange={e => setPonudnik({ ...ponudnik, email: e.target.value })} />
                </div>
                <div className="polje">
                  <label htmlFor="cw-ptelefon">Telefon</label>
                  <div className="tel-vrsta">
                    <select aria-label="Klicna koda države" value={predklic}
                      onChange={e => setPredklic(e.target.value)}>
                      {['+386', '+385', '+43', '+49', '+39', '+44', '+33', '+1', '+971', '+20'].map(k => (
                        <option key={k} value={k}>{k}</option>
                      ))}
                    </select>
                    <input id="cw-ptelefon" type="tel" placeholder="41 373 730"
                      value={ponudnik.telefon} onChange={e => setPonudnik({ ...ponudnik, telefon: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="numgrid">
                <div className="polje">
                  <label htmlFor="cw-pnaslov">Naslov</label>
                  <input id="cw-pnaslov" type="text" placeholder="Ulica 1, 1000 Ljubljana"
                    value={ponudnik.naslov} onChange={e => setPonudnik({ ...ponudnik, naslov: e.target.value })} />
                </div>
                <div className="polje">
                  <label htmlFor="cw-ddv">DDV</label>
                  <select id="cw-ddv" value={ddvZavezanec ? 'da' : 'ne'}
                    onChange={e => setDdvZavezanec(e.target.value === 'da')}>
                    <option value="ne">Nisem zavezanec (94. člen ZDDV-1)</option>
                    <option value="da">Sem zavezanec za DDV</option>
                  </select>
                </div>
              </div>
              {ddvZavezanec && (
                <div className="numgrid">
                  <div className="polje">
                    <label htmlFor="cw-ddvst">Stopnja DDV (%)</label>
                    <input id="cw-ddvst" type="number" min={0} max={30} step={0.5}
                      value={ddvStopnja} onChange={e => setDdvStopnja(e.target.value)} />
                  </div>
                </div>
              )}
            </>
          )}

          {korak === ponudbaStep && (
            <>
              <div className="tonbar" aria-label="Ton ponudbe">
                {TONI.map(t => (
                  <button key={t.id} type="button" className={tonPonudbe === t.id ? 'on' : ''}
                    onClick={() => { setTonPonudbe(t.id); setRocnoBesedilo(false); }}>
                    {t.ime}
                  </button>
                ))}
              </div>
              <div className="orodjarna" aria-label="Oblikovanje ponudbe">
                <button type="button" className="tool" onMouseDown={e => { e.preventDefault(); oblikuj('bold'); }} title="Krepko">
                  <TextB size={17} weight="bold" /> Krepko
                </button>
                <button type="button" className="tool" onMouseDown={e => { e.preventDefault(); oblikuj('formatBlock', 'h2'); }} title="Spremeni vrstico v podnaslov">
                  <TextAa size={17} /> H2
                </button>
                <button type="button" className="tool" onMouseDown={e => { e.preventDefault(); oblikuj('formatBlock', 'p'); }} title="Spremeni vrstico v odstavek">
                  <TextAa size={15} /> P
                </button>
                <button type="button" className="tool" onMouseDown={e => { e.preventDefault(); oblikuj('fontSize', '4'); }} title="Povečaj označeno besedilo">
                  <TextAa size={17} /> Večje
                </button>
                <button type="button" className="tool" onMouseDown={e => { e.preventDefault(); oblikuj('fontSize', '2'); }} title="Pomanjšaj označeno besedilo">
                  <TextAa size={15} /> Manjše
                </button>
                <button type="button" className="tool" onMouseDown={e => { e.preventDefault(); oblikuj('hiliteColor', '#ECE6D5'); }} title="Dodaj podlago">
                  <PaintBucket size={17} /> Podlaga
                </button>
                {['#111111', '#F5F2EA', '#F8E71C', '#50E3C2', '#FA4892'].map(barva => (
                  <button key={barva} type="button" className="barvica" style={{ background: barva }}
                    aria-label={'Barva besedila ' + barva} onMouseDown={e => { e.preventDefault(); oblikuj('foreColor', barva); }} />
                ))}
                <button type="button" className="tool" onClick={() => fileRef.current?.click()} title="Uvozi HTML ali TXT predlogo">
                  <UploadSimple size={17} /> Uvozi predlogo
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".txt,.html,.htm"
                  hidden
                  onChange={e => {
                    uvoziPredlogo(e.target.files?.[0]);
                    e.currentTarget.value = '';
                  }}
                />
              </div>
              <div
                ref={editorRef}
                className="editor"
                contentEditable
                suppressContentEditableWarning
                onInput={() => setRocnoBesedilo(true)}
                onBlur={sinhronizirajEditor}
              />
              {rocnoBesedilo && (
                <p className="hint" style={{ marginTop: '.5rem' }}>
                  Besedilo je ročno urejeno in se ob spremembi izbir ne posodablja več samodejno.{' '}
                  <button type="button" className="povezava" onClick={() => setRocnoBesedilo(false)}>
                    Povrni samodejno besedilo
                  </button>
                </p>
              )}
              <div className="btnvrsta">
                <button type="button" className="gumb" onClick={kopiraj}>
                  <CopySimple size={17} /> {kopirano ? 'Skopirano ✓' : 'Kopiraj ponudbo'}
                </button>
                <button type="button" className="povezava" onClick={prenesi}>
                  <DownloadSimple size={17} /> Prenesi besedilo
                </button>
                <button type="button" className="povezava" onClick={prenesiCsv}>
                  <FileText size={17} /> Izvozi postavke (CSV za račune)
                </button>
                <button type="button" className="povezava" onClick={() => zahtevaKontakt('profil')}>
                  <FloppyDisk size={17} /> Shrani profil
                </button>
              </div>

              {kazemZajem && (
                <div className="zajem">
                  {!imamKontakt && (
                    <>
                      <p>Ime in email sta neobvezna; profil lahko shraniš tudi brez tega. Z oddajo se strinjaš s <a href={`/${locale}/kalkulator/pogoji`} style={{ color: 'var(--ink)' }}>pogoji uporabe</a>.</p>
                      <div className="polje">
                        <label htmlFor="cw-zime">Ime</label>
                        <input id="cw-zime" value={leadIme} onChange={e => setLeadIme(e.target.value)} />
                      </div>
                      <div className="polje">
                        <label htmlFor="cw-zemail">Email</label>
                        <input id="cw-zemail" type="email" value={leadEmail} onChange={e => setLeadEmail(e.target.value)} />
                      </div>
                    </>
                  )}
                  {kazemZajem === 'profil' && (
                    <div className="polje">
                      <label htmlFor="cw-zprofil">Ime profila</label>
                      <input id="cw-zprofil" placeholder="npr. Moje cene za tujino"
                        value={imeProfila} onChange={e => setImeProfila(e.target.value)} />
                    </div>
                  )}
                  <div className="btnvrsta" style={{ marginTop: '.2rem' }}>
                    {kazemZajem === 'profil'
                      ? <button type="button" className="gumb" onClick={shraniProfil}>Shrani profil</button>
                      : <button type="button" className="gumb" disabled={!imamKontakt} onClick={potrdiZajem}>Potrdi in prenesi</button>}
                    <button type="button" className="povezava" onClick={() => setKazemZajem(null)}>Prekliči</button>
                  </div>
                </div>
              )}

              {Object.keys(profili).length > 0 && (
                <div className="profili">
                  {Object.keys(profili).map(ime => (
                    <span key={ime} className="profil">
                      {ime}
                      <button type="button" title="Naloži profil" onClick={() => naloziProfil(ime)}>↺</button>
                      <button type="button" title="Izbriši profil" onClick={() => izbrisiProfil(ime)}>×</button>
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="noga">
        <div className="noga-c">
          <div className="noga-gumbi">
            {korak > 0 && (
              <button type="button" className="gumb-nazaj" onClick={nazaj} aria-label="Nazaj">←</button>
            )}
            {korak < KORAKOV - 1 ? (
              <button type="button" className="gumb"
                disabled={korak === 0 && !r} onClick={naprej}>
                {korak === posebnostiStep ? 'Pokaži ceno →' : korak === cenaStep ? 'Pripravi ponudbo →' : 'Naprej →'}
              </button>
            ) : (
              <button type="button" className="nazaj-g" onClick={() => setKorak(0)}>Na začetek ↺</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

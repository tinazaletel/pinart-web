'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { localePath } from '@/i18n/routing';

import {
  PenNib, Palette, Browser, Megaphone, BookOpen, Package, Gift,
  PaintBrush, Compass, Sparkle, Plus, Camera, TextT,
  CopySimple, DownloadSimple, FileText, FilePdf, FloppyDisk, PaintBucket,
  PersonSimple, TextAa, TextB, TextItalic, MagicWand, UploadSimple, CalendarBlank, EnvelopeSimple,
  House, Buildings, Presentation, Armchair, Layout, DeviceMobile, SquaresFour,
  ShareNetwork, MagnifyingGlass, Newspaper, VideoCamera, FilmSlate, Cube, Lightbulb,
  DotsSixVertical, Gear, User, UserCircle, ClockCounterClockwise, Wallet,
  CaretDown, CaretUp, Check, PencilSimple, SlidersHorizontal, ArrowUp, ArrowDown, ArrowCounterClockwise,
} from '@phosphor-icons/react';

/* Pinartov javni kalkulator cen za kreativce.
   Model: izvedba (osnove x izkusnje x trg narocnika/moj trg x velikost x dodatki)
        + avtorske pravice (% dobicka narocnika, omejeno kot % izvedbe)
        + alternativa: letna licenca (% odkupa pravic)
   Trije paketi (osnovni / priporoceni / premium), profili cen, regije,
   zajem kontakta (ime+email) ob shranjevanju/prenosu -> /api/inquiry. */

type Storitev = { id: string; ime: string; osnova: number };

/* Orbi na koraku 0: barvni par (jedro → rob), krozi po indeksu storitve. */
const ORB_BARVE: [string, string][] = [
  ['#7C3AED', '#C084FC'], ['#0EA5A5', '#5EEAD4'], ['#E8A200', '#FCE38A'],
  ['#DB2777', '#F9A8D4'], ['#2563EB', '#7FB6F0'], ['#5B9E1E', '#B7E86A'],
  ['#EA580C', '#FDBA74'], ['#84A21E', '#DCEE9B'],
];
/* Deterministicen psevdo-random [0,1) — stabilen med renderji in hydration
   (Math.random bi ob vsakem renderju premaknil orbe). */
const psr = (k: number) => { const x = Math.sin(k * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

/* Obraz vodicke (vesele U-ucke + rdecica) — deljen med chat uvodom in delovno mizo. */
const VODICKA_OBRAZ = (
  <svg viewBox="0 0 40 40" aria-hidden>
    <path d="M9.8 18.2q3.2-4.6 6.4 0" stroke="#2A2035" strokeWidth="2.1" fill="none" strokeLinecap="round" />
    <path d="M23.8 18.2q3.2-4.6 6.4 0" stroke="#2A2035" strokeWidth="2.1" fill="none" strokeLinecap="round" />
    <path d="M14.5 23.5q5.5 4.6 11 0" stroke="#2A2035" strokeWidth="2.1" fill="none" strokeLinecap="round" />
    <circle cx="11.5" cy="21.5" r="1.9" fill="rgba(255,120,170,.5)" />
    <circle cx="28.5" cy="21.5" r="1.9" fill="rgba(255,120,170,.5)" />
  </svg>
);

/* osvetli hex proti beli (0..1) — za 4-stopenjski gradient kot v CGP.svg */
function osvetli(hex: string, amt: number) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  const m = (c: number) => Math.max(0, Math.min(255, Math.round(c + (255 - c) * amt))).toString(16).padStart(2, '0');
  return `#${m(r)}${m(g)}${m(b)}`;
}
/* zatemni proti crni (0..1) — za citljivo temno barvo besedila iz osnovne barve */
function zatemni(hex: string, f: number) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  const m = (c: number) => Math.max(0, Math.min(255, Math.round(c * f))).toString(16).padStart(2, '0');
  return `#${m(r)}${m(g)}${m(b)}`;
}
/* Krogla VERNO po Tininem CGP.svg (isti gradient 4 stopnje + bela svetloba +
   drop & inner shadow), le prebarvana iz osnovne barve o1. */
function OrbSfera({ id, o1 }: { id: string; o1: string }) {
  const s2 = osvetli(o1, 0.18), s3 = osvetli(o1, 0.6), s4 = osvetli(o1, 0.68);
  return (
    <svg className="orb0-sfera" viewBox="0 0 413 411" aria-hidden preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id={`osf-${id}`} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse"
          gradientTransform="translate(206.477 201.802) rotate(90) scale(137.225 138.5)">
          <stop stopColor={o1} />
          <stop offset="0.288462" stopColor={s2} />
          <stop offset="0.673077" stopColor={s3} />
          <stop offset="1" stopColor={s4} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`osh-${id}`} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse"
          gradientTransform="translate(136.802 129.578) rotate(84.2205) scale(105.473 108.261)">
          <stop stopColor="#fff" />
          <stop offset="0.740385" stopColor="#fff" stopOpacity="0.077" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <filter id={`osd-${id}`} x="0" y="0" width="412.951" height="410.402" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="bg" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="ha" />
          <feOffset dy="3.39877" />
          <feGaussianBlur stdDeviation="33.9877" />
          <feComposite in2="ha" operator="out" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.781907 0 0 0 0 0.781907 0 0 0 0 0.781907 0 0 0 0.15 0" />
          <feBlend mode="normal" in2="bg" result="ds" />
          <feBlend mode="normal" in="SourceGraphic" in2="ds" result="shape" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="ha2" />
          <feOffset dy="-3.39877" />
          <feGaussianBlur stdDeviation="7.64724" />
          <feComposite in2="ha2" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.34 0" />
          <feBlend mode="normal" in2="shape" />
        </filter>
        <clipPath id={`oc-${id}`}>
          <rect x="67.9766" y="64.5767" width="277" height="274.451" rx="137.225" />
        </clipPath>
      </defs>
      <g filter={`url(#osd-${id})`}>
        <g clipPath={`url(#oc-${id})`}>
          <rect x="67.9766" y="64.5767" width="277" height="274.451" rx="137.225" fill={`url(#osf-${id})`} />
          <ellipse cx="147.423" cy="138.075" rx="98.9893" ry="96.4402" fill={`url(#osh-${id})`} />
        </g>
      </g>
    </svg>
  );
}

/* Vrstica ponudbe (postavkovni model): ena instanca storitve s svojim imenom.
   KOLICINSKE storitve (ilustracije, logotipi ...) imajo stevec kosov na ENI
   vrstici; vse ostale (web, CGP ...) se ob ponovnem kliku dodajo kot NOVA
   vrstica z lastnim imenom — nikoli "2× Inovis", ampak Inovis in Itforyou,
   vsaka s svojimi vprasanji (njen primer: Inovis je prenavljal dva produkta).
   uid prve instance = sid (zdruzljivo s starimi shranjenimi odgovori). */
type VrsticaP = { uid: string; sid: string; ime: string; kolicina: number };
/* Tinini narisani mehurcki (public/kalkulator/mehurcki/<sid>.svg) — kjer
   obstaja, zamenja CSS-gradientni orb (gradient + ikona + napis so vrisani
   v SVG). Ostale storitve padejo na CSS orb. Dodaj sid, ko prispe nov SVG. */
/* VSI mehurcki so enotni CSS orb v CGP videzu (samo barve se razlikujejo) —
   prej so bili meseani (nekateri njeni SVG-ji, nekateri CSS) in vsak drugacen. */
const MEHURCEK: Record<string, boolean> = {};
/* privzeta TEZA (velikost) po obsegu/pomembnosti storitve — jedrne vecje,
   niche manjse; poleg tega raste z rabo. */
const TEZA: Record<string, number> = {
  cgp: 1.32, publikacija: 1.16, arhitektura: 1.26, aplikacija: 1.2, produktni: 1.16,
  dizajnsistem: 1.16, interier: 1.14, web: 1.14, video: 1.14, uxui: 1.1, razstava: 1.1, strategija: 1.1,
  embalaza: 0.86, copy: 0.86, smm: 0.86, pr: 0.86, seo: 0.8, email: 0.8, logo: 0.94,
};
/* kratka imena za mehurcke (na orbu; polno ime ostane v ponudbi/drugod) */
const KRATKO: Record<string, string> = {
  cgp: 'CGP', logo: 'Logotip', web: 'Spletna stran', kampanja: 'Oglasi',
  publikacija: 'Tiskovine', embalaza: 'Embalaža', ilustracija: 'Ilustracija',
  direkcija: 'Direkcija', fotografija: 'Fotografija', copy: 'Copywriting',
  interier: 'Interier', arhitektura: 'Arhitektura', razstava: 'Razstave',
  produktni: 'Produkti', uxui: 'UX/UI', aplikacija: 'Aplikacija',
  dizajnsistem: 'Dizajn sistem', smm: 'Social media', seo: 'SEO',
  email: 'Email', pr: 'PR', video: 'Video', motion: 'Animacija',
  render3d: '3D', strategija: 'Strategija',
};
const KOLICINSKE: Record<string, string> = {
  logo: 'logotipov', ilustracija: 'ilustracij', fotografija: 'fotografiranj',
  copy: 'besedil', video: 'videov', motion: 'animacij', render3d: 'renderjev',
};
const jeKolicinska = (sid: string) => sid in KOLICINSKE || sid.startsWith('moja-');
type TonPonudbe = 'formalno' | 'toplo' | 'direktno';

/* Seed cenik za slovenski trg (2026): raven "samostojen", majhna stranka,
   priporoceni paket. To niso javni ceniki agencij, ampak zacetna sidra iz
   trga freelancerjev + EU marketplace signalov; anonimni vnosi uporabnikov
   jih cez cas validirajo v admin pregledu. */
/* ── Obseg pravic (intervju z Majo Lubi, ilustratorko, 2026-07-09) ──────────
   Pravice niso vse-ali-nic: cena je odvisna od trajanja, teritorija, medijev
   in naklade. Privzetki (7 let, Slovenija, tisk + promocija, naklada do
   3.000) dajo faktor 1.0 — torej se brez spreminjanja obseg ne pozna na
   ceni. Po Maji: knjiga + promocija obicajno 5-7 let, izjemoma 10;
   digitalna izdaja NI vkljucena v tiskano; izvedeni produkti (app, merch)
   se vedno licencirajo loceno. */
const PRAV_TRAJANJE = [
  { id: '3m',        ime: '3 mesece',  mult: 0.3  },
  { id: '6m',        ime: '6 mesecev', mult: 0.4  },
  { id: '1',         ime: '1 leto',    mult: 0.5  },
  { id: '3',         ime: '3 leta',    mult: 0.75 },
  { id: '5',         ime: '5 let',     mult: 0.9  },
  { id: '7',         ime: '7 let',     mult: 1.0  },
  { id: '10',        ime: '10 let',    mult: 1.3  },
  { id: 'neomejeno', ime: 'Neomejeno', mult: 1.8  },
] as const;
/* recepti pravic (en izbor na vrstici tabele; zdruzi vrsto prenosa + privzeto trajanje) */
const RECEPTI: { id: string; ime: string; prenos: 'izkljucni' | 'neizkljucni' | 'licenca'; trajanje: string }[] = [
  { id: 'trajno',      ime: 'Trajno izključno',     prenos: 'izkljucni',   trajanje: 'neomejeno' },
  { id: 'doba',        ime: 'Izključno za dobo',    prenos: 'izkljucni',   trajanje: '7' },
  { id: 'neizkljucni', ime: 'Neizključno',          prenos: 'neizkljucni', trajanje: '7' },
  { id: 'licenca',     ime: 'Samo licenca',         prenos: 'licenca',     trajanje: '7' },
  { id: 'kampanja',    ime: 'Kampanjska licenca',   prenos: 'licenca',     trajanje: '3m' },
  { id: 'tantieme',    ime: 'Prodajni produkt (tantieme)', prenos: 'izkljucni', trajanje: '3' },
];
/* priporocena tantiema (% neto veleprodaje) po tipu storitve — iz raziskave (GAG/Licensing Intl):
   art/dizajn licensing 3-10 %, znamka/lik do 15 %, kanal mass 3-5 / specialty 5-10 */
const tantiemaZa = (sid: string): number => {
  if (['ilustracija', 'publikacija', 'fotografija'].includes(sid)) return 8;   /* umetniska dela */
  if (['embalaza', 'produktni'].includes(sid)) return 6;                        /* izdelek/embalaza */
  if (['cgp', 'logo', 'dizajnsistem'].includes(sid)) return 10;                 /* znamka/lik */
  return 7;
};
/* privzeta vrsta pravic + trajanje po storitvi (za tabelo pri vec storitvah) */
const PRAVICE_TRAJNO = new Set(['logo', 'cgp', 'web', 'embalaza', 'interier', 'arhitektura', 'produktni', 'uxui', 'aplikacija', 'dizajnsistem']);
const PRAVICE_KAMPANJA = new Set(['kampanja', 'smm', 'razstava', 'seo', 'email', 'pr']);
const privzetePraviceZa = (sid: string): { prenos: 'izkljucni' | 'neizkljucni' | 'licenca'; trajanje: string } => {
  if (PRAVICE_TRAJNO.has(sid)) return { prenos: 'izkljucni', trajanje: 'neomejeno' };
  if (PRAVICE_KAMPANJA.has(sid)) return { prenos: 'licenca', trajanje: '3m' };
  return { prenos: 'izkljucni', trajanje: '7' };   /* ilustracija, foto, publikacija, video, motion, 3d, copy, direkcija, strategija, moja- */
};
/* zvezni mnozitelj pravic glede na dolzino v LETIH (za poljubno trajanje, npr. 3 tedne).
   ujema se z diskretnimi preseti: 3m~0.3, 1l=0.5, 7l=1.0, 10l=1.3, navzgor proti ~1.8. */
const trajMultLeta = (leta: number): number => {
  if (leta <= 0) return 1.8;                 /* 0 = neomejeno/trajno */
  const m = 0.18 + 0.62 * Math.log10(1 + leta / 1.4);
  return Math.max(0.22, Math.min(1.8, Math.round(m * 100) / 100));
};
const trajLetaVBesedo = (leta: number): string => {
  if (leta <= 0) return 'neomejeno';
  if (leta < 0.16) { const t = Math.max(1, Math.round(leta * 52)); return t === 1 ? '1 teden' : t < 5 ? `${t} tedne` : `${t} tednov`; }
  if (leta < 1) { const mo = Math.max(1, Math.round(leta * 12)); return mo === 1 ? '1 mesec' : mo === 2 ? '2 meseca' : mo < 5 ? `${mo} mesece` : `${mo} mesecev`; }
  const l = Math.round(leta);
  return l === 1 ? '1 leto' : l === 2 ? '2 leti' : l < 5 ? `${l} leta` : `${l} let`;
};
/* pogodbene klavzule (per storitev; vecinoma besedilo v ponudbo, ekskluzivnost vpliva na ceno) */
const KLAVZULE: { id: string; ime: string; opis: string; mult?: number }[] = [
  { id: 'moralne',      ime: 'Navedba avtorja',           opis: 'moralne pravice — avtor naveden ob delu' },
  { id: 'ponatis',      ime: 'Obnova ob novi nakladi',    opis: 'ob ponatisu se licenca obnovi (izhodišče 50 %)' },
  { id: 'ekskluz',      ime: 'Ekskluzivnost v kategoriji',opis: 'nihče drug v isti kategoriji izdelkov', mult: 0.25 },
  { id: 'brezPredelav', ime: 'Prepoved predelave',        opis: 'brez sprememb dela brez soglasja avtorja' },
  { id: 'porocanje',    ime: 'Letno poročilo o prodaji',  opis: 'naročnik letno sporoči obseg izkoriščanja (DSM čl. 19)' },
];
const PRAV_TERITORIJ = [
  { id: 'slo',    ime: 'Slovenija', mult: 1.0 },
  { id: 'eu',     ime: 'Evropa',    mult: 1.4 },
  { id: 'global', ime: 'Globalno',  mult: 1.8 },
] as const;
/* tisk + promocija izdelka sta VKLJUCENA v osnovo; tole so doplacila */
const PRAV_MEDIJI_DODATNI = [
  { id: 'digital',     ime: 'Digitalna izdaja',  opis: 'e-knjiga, splet — ločeno od tiska', mult: 0.3 },
  { id: 'oglasevanje', ime: 'Širše oglaševanje', opis: 'kampanje izven samega izdelka',     mult: 0.5 },
  { id: 'embalaza',    ime: 'Embalaža / merch',  opis: 'izdelki za nadaljnjo prodajo',      mult: 0.5 },
] as const;
const PRAV_NAKLADA = [
  { id: 'do3k',   ime: 'do 3.000',  mult: 1.0 },
  { id: 'do10k',  ime: 'do 10.000', mult: 1.2 },
  { id: 'nad10k', ime: 'nad 10.000', mult: 1.5 },
] as const;
/* storitve, pri katerih se obseg pravic ponudi takoj (avtorska vizualna dela) */
const AVTORSKE_STORITVE = ['ilustracija', 'fotografija', 'video', 'motion', 'render3d'];

const STORITVE: Storitev[] = [
  { id: 'logo',        ime: 'Logotip + osnovna identiteta', osnova: 650  },
  { id: 'cgp',         ime: 'Celostna grafična podoba',     osnova: 1350 },
  { id: 'web',         ime: 'Spletna stran',                osnova: 1400 },
  { id: 'kampanja',    ime: 'Kampanja / oglasni vizuali',   osnova: 900  },
  { id: 'publikacija', ime: 'Publikacija / tiskovina',      osnova: 700  },
  { id: 'embalaza',    ime: 'Embalaža / produkt',           osnova: 900  },
  { id: 'ilustracija', ime: 'Ilustracija / vizualni svet',  osnova: 550  },
  { id: 'direkcija',   ime: 'Kreativna direkcija',          osnova: 900  },
  { id: 'fotografija', ime: 'Fotografiranje',               osnova: 450  },
  { id: 'copy',        ime: 'Besedila / copywriting',       osnova: 450  },
  /* razsiritev na vec kreativnih poklicev (2026-07-08) */
  { id: 'interier',    ime: 'Interier dizajn',                osnova: 1200 },
  { id: 'arhitektura', ime: 'Arhitekturno oblikovanje',       osnova: 2200 },
  { id: 'razstava',    ime: 'Razstavni / scenski dizajn',     osnova: 1300 },
  { id: 'produktni',   ime: 'Produktni / pohištveni dizajn',  osnova: 1600 },
  { id: 'uxui',        ime: 'UX/UI dizajn',                   osnova: 1100 },
  { id: 'aplikacija',  ime: 'Mobilna aplikacija',             osnova: 2400 },
  { id: 'dizajnsistem',ime: 'Dizajn sistem',                  osnova: 1600 },
  { id: 'smm',         ime: 'Social media vodenje',           osnova: 650  },
  { id: 'seo',         ime: 'SEO',                            osnova: 550  },
  { id: 'email',       ime: 'Email marketing',                osnova: 350  },
  { id: 'pr',          ime: 'PR / odnosi z javnostmi',        osnova: 750  },
  { id: 'video',       ime: 'Video produkcija',               osnova: 1300 },
  { id: 'motion',      ime: 'Motion / animacija',             osnova: 750  },
  { id: 'render3d',    ime: '3D vizualizacije',               osnova: 650  },
  { id: 'strategija',  ime: 'Brand strategija',               osnova: 1100 },
];

/* Podrocja dela za onboarding: uporabnik izbere podrocja, orodje pa v ospredje
   postavi storitve znotraj njih. Nove storitve so umescene v ustrezno podrocje,
   da seznam ostane pregleden. */
const PODROCJA: { id: string; ime: string; opis: string; storitve: string[] }[] = [
  { id: 'graficno',  ime: 'Grafično oblikovanje & branding', opis: 'logotip, CGP, tiskovine, embalaža, ilustracija',   storitve: ['logo', 'cgp', 'publikacija', 'embalaza', 'ilustracija'] },
  { id: 'splet',     ime: 'Splet & digitalni produkti',      opis: 'spletne strani, UX/UI, aplikacije',                storitve: ['web', 'uxui', 'aplikacija'] },
  { id: 'marketing', ime: 'Marketing & oglaševanje',         opis: 'kampanje, social media, SEO, PR, besedila',        storitve: ['kampanja', 'smm', 'seo', 'email', 'pr', 'copy'] },
  { id: 'foto',      ime: 'Foto, video & motion',            opis: 'fotografiranje, video, motion, 3D',                storitve: ['fotografija', 'video', 'motion', 'render3d'] },
  { id: 'direkcija', ime: 'Kreativna direkcija & strategija', opis: 'vodenje, koncept, strategija',                     storitve: ['direkcija', 'strategija'] },
  { id: 'prostor',   ime: 'Prostor & arhitektura',           opis: 'interier, arhitektura, razstavni in produktni dizajn', storitve: ['interier', 'arhitektura', 'razstava', 'produktni'] },
];

/* osnovna barva podrocja (za pastelne chipe, uskladjeno z ORB_BARVE) */
const PODROCJE_BARVA: Record<string, string> = {
  graficno: '#7C3AED', splet: '#0EA5A5', marketing: '#DB2777',
  foto: '#2563EB', direkcija: '#EA580C', prostor: '#5B9E1E',
};

const IZKUSNJE = [
  { id: 'student',     ime: 'Študent',     opis: 'ob študiju, prvi naročniki', mult: 0.45 },
  { id: 'zacetnik',    ime: 'Začetnik',    opis: 'do 3 leta',                  mult: 0.65 },
  { id: 'samostojen',  ime: 'Samostojen',  opis: '3 do 8 let',                 mult: 1   },
  { id: 'strokovnjak', ime: 'Strokovnjak', opis: '8+ let, reference',          mult: 1.45 },
  { id: 'ekspert',     ime: 'Ekspert',     opis: 'nagrade, prepoznano ime',    mult: 2.1 },
];

/* Raven cen po trgih: vpliva na privzete osnove (tvoj trg)
   in na razmerje, ko delas za trg z drugacno ravnjo (trg narocnika). */
const TRGI = [
  { id: 'si',   ime: 'Slovenija / srednja EU',        lvl: 1    },
  { id: 'west', ime: 'Zahodna Evropa',                lvl: 1.45 },
  { id: 'us',   ime: 'ZDA / UK / Skandinavija',       lvl: 1.9  },
  { id: 'east', ime: 'Vzhodna EU / Balkan',           lvl: 0.75 },
  { id: 'mena', ime: 'Zaliv / bogatejši MENA trgi',   lvl: 1.3  },
  { id: 'asia', ime: 'Global South / nižji trgi',     lvl: 0.65 },
];

/* Država naročnika -> privzet trg (razred cene). Uporabnik ga lahko ročno spremeni.
   Za globalna podjetja ali izjeme je trg dropdown vedno na voljo. */
const DRZAVE: { ime: string; trg: string }[] = [
  { ime: 'Slovenija', trg: 'si' },
  { ime: 'Avstrija', trg: 'west' },
  { ime: 'Nemčija', trg: 'west' },
  { ime: 'Italija', trg: 'west' },
  { ime: 'Madžarska', trg: 'si' },
  { ime: 'Češka', trg: 'si' },
  { ime: 'Slovaška', trg: 'si' },
  { ime: 'Poljska', trg: 'si' },
  { ime: 'Švica', trg: 'us' },
  { ime: 'Liechtenstein', trg: 'us' },
  { ime: 'Francija', trg: 'west' },
  { ime: 'Belgija', trg: 'west' },
  { ime: 'Nizozemska', trg: 'west' },
  { ime: 'Luksemburg', trg: 'us' },
  { ime: 'Irska', trg: 'west' },
  { ime: 'Španija', trg: 'west' },
  { ime: 'Portugalska', trg: 'west' },
  { ime: 'Velika Britanija', trg: 'us' },
  { ime: 'ZDA', trg: 'us' },
  { ime: 'Kanada', trg: 'us' },
  { ime: 'Švedska', trg: 'us' },
  { ime: 'Norveška', trg: 'us' },
  { ime: 'Danska', trg: 'us' },
  { ime: 'Finska', trg: 'us' },
  { ime: 'Islandija', trg: 'us' },
  { ime: 'Avstralija', trg: 'us' },
  { ime: 'Nova Zelandija', trg: 'us' },
  { ime: 'Hrvaška', trg: 'east' },
  { ime: 'Srbija', trg: 'east' },
  { ime: 'Bosna in Hercegovina', trg: 'east' },
  { ime: 'Črna gora', trg: 'east' },
  { ime: 'Severna Makedonija', trg: 'east' },
  { ime: 'Kosovo', trg: 'east' },
  { ime: 'Albanija', trg: 'east' },
  { ime: 'Bolgarija', trg: 'east' },
  { ime: 'Romunija', trg: 'east' },
  { ime: 'Grčija', trg: 'east' },
  { ime: 'Ukrajina', trg: 'east' },
  { ime: 'Litva', trg: 'east' },
  { ime: 'Latvija', trg: 'east' },
  { ime: 'Estonija', trg: 'east' },
  { ime: 'Turčija', trg: 'east' },
  { ime: 'ZAE', trg: 'mena' },
  { ime: 'Savdska Arabija', trg: 'mena' },
  { ime: 'Katar', trg: 'mena' },
  { ime: 'Egipt', trg: 'asia' },
  { ime: 'Maroko', trg: 'asia' },
  { ime: 'Južna Afrika', trg: 'asia' },
  { ime: 'Izrael', trg: 'us' },
  { ime: 'Japonska', trg: 'us' },
  { ime: 'Singapur', trg: 'us' },
  { ime: 'Kitajska', trg: 'asia' },
  { ime: 'Indija', trg: 'asia' },
  { ime: 'Brazilija', trg: 'asia' },
  { ime: 'Argentina', trg: 'asia' },
  { ime: 'Mehika', trg: 'asia' },
];
const trgIzDrzave = (ime: string): string | null => {
  const n = ime.trim().toLowerCase();
  if (!n) return null;
  return DRZAVE.find(d => d.ime.toLowerCase() === n)?.trg ?? null;
};

const DODATKI = [
  { id: 'nujno',    ime: 'Nujen rok',               opis: '+25 %', mult: 0.25 },
  { id: 'varianta', ime: 'Dodatna idejna varianta', opis: '+15 %', mult: 0.15 },
];

const TONI: { id: TonPonudbe; ime: string }[] = [
  { id: 'formalno', ime: 'Formalno' },
  { id: 'toplo', ime: 'Profesionalno' },
  { id: 'direktno', ime: 'Neformalno' },
];

type ProjektnoVprasanje = { id: string; label: string; placeholder?: string; izbire?: string[]; vec?: boolean; svoje?: string; vse?: boolean };

const VPRASANJA_PO_STORITVI: Record<string, ProjektnoVprasanje[]> = {
  logo: [
    { id: 'cilj', label: 'Kaj mora nov znak sporočati?', placeholder: 'npr. bolj premium, bolj zaupanja vredno, bolj igrivo' },
    { id: 'kompleksnost', label: 'Kako kompleksen naj bo logotip?', izbire: ['Enostaven napis ali znak', 'Znak + tipografija (kombiniran)', 'Družina znakov / več različic'] },
    { id: 'uporaba', label: 'Kje se bo najpogosteje uporabljal?', placeholder: 'splet, embalaža, tabla, app ikona, vozila ...' },
    { id: 'omejitve', label: 'Ali obstajajo barve, pisave ali simboli, ki morajo ostati?', izbire: ['Barvna paleta', 'Tipografija (kupljena pisava)', 'Simbol / znak', 'Nič, začnemo sveže'], vec: true, svoje: 'dopiši, če še kaj manjka ...' },
    { id: 'budget', label: 'Kakšen je okvirni budget naročnika?', izbire: ['Do 1.000 €', '1.000 do 2.500 €', 'Nad 2.500 €', 'Še ne vem'], svoje: 'ali vpiši svoj znesek ...' },
  ],
  cgp: [
    { id: 'stanje', label: 'Ali že obstaja logotip ali predhodni CGP?', izbire: ['Začenjamo iz nič', 'Imamo samo logotip', 'Imamo star CGP'], svoje: 'ali dopiši trenutno stanje ...' },
    { id: 'tip-projekta', label: 'Gre za novo identiteto ali osvežitev obstoječe?', izbire: ['Nova identiteta', 'Osvežitev obstoječe', 'Razširitev sistema'], svoje: 'ali na kratko pojasni ...' },
    { id: 'smeri', label: 'Koliko različnih kreativnih smeri pričakuješ?', izbire: ['1 jasna smer', '2 predloga', '3 predlogi', '6 širših raziskav'] },
    { id: 'stil', label: 'Če že veš, kakšen slog želiš, označi.', izbire: ['Minimalistično', 'Retro', 'Editorial', 'Luksuzno', 'Igrivo', 'Tehnološko', 'Organsko', 'Drzno', 'Še ne vem'], vec: true, svoje: 'ali dopiši slog / reference ...' },
    { id: 'omejitve', label: 'Ali obstajajo barve, tipografije ali ideje, ki jih je treba upoštevati?', izbire: ['Barvna paleta', 'Tipografija (kupljena pisava)', 'Simbol / znak', 'Moodboard ali smernice', 'Nič, začnemo sveže'], vec: true, svoje: 'dopiši, če še kaj manjka ...' },
    { id: 'obseg', label: 'Katere aplikacije naj pripravim?', izbire: ['Vizitke in dopisi', 'Predloge za družbena omrežja', 'Predstavitvena predloga', 'Embalaža', 'Tabla / označevanje', 'Vozila', 'Oblačila / merch'], vec: true, vse: true, svoje: 'dopiši svoje ...' },
    { id: 'budget', label: 'Kakšen je okvirni budget naročnika?', izbire: ['Do 2.500 €', '2.500 do 5.000 €', 'Nad 5.000 €', 'Še ne vem'], svoje: 'ali vpiši svoj znesek ...' },
    { id: 'opomba', label: 'Opomba (neobvezno)', placeholder: 'karkoli, kar naj upoštevam vnaprej ...' },
  ],
  web: [
    { id: 'ima-cgp', label: 'Ali ima naročnik celostno grafično podobo (CGP)?', izbire: ['Da, upoštevam obstoječo', 'Ne, oblikujem svobodno', 'Ne, potrebuje tudi novo CGP'] },
    { id: 'tip', label: 'Kaj ustvarjamo ali prenavljamo?', izbire: ['Nova spletna stran', 'Prenova (redesign)', 'Landing page', 'Portfolio', 'Spletna trgovina', 'Custom aplikacija'], vec: true },
    { id: 'ux-ui', label: 'Kaj od UX/UI procesa prevzameš?', izbire: ['Samo postavitev (dizajn že obstaja)', 'UI oblikovanje strani', 'UX zasnova: struktura in user flow', 'Prototip za testiranje', 'Style guide / design system'], vec: true, svoje: 'ali dopiši ...' },
    { id: 'stil', label: 'Če že veš, kakšen slog želiš za spletno stran, označi.', izbire: ['Minimalistično', 'Retro', 'Editorial', 'Luksuzno', 'Igrivo', 'Tehnološko', 'Organsko', 'Drzno', 'Še ne vem'], vec: true, svoje: 'ali opiši reference ...' },
    { id: 'kompleksnost', label: 'Kako kompleksen je projekt?' },
    { id: 'strani', label: 'Koliko ločenih podstrani bo imela stran? (Sekcije, do katerih poskrolaš, štejejo kot ena stran.)', izbire: ['Ena stran z več sekcijami (one-pager)', 'Do 5 podstrani', '6 do 10', '11 do 20', 'Nad 20'], svoje: 'ali opiši: npr. one-pager z 8 sekcijami + 2 podstrani ...' },
    { id: 'funkcije', label: 'Katere funkcionalnosti so nujne?' },
    { id: 'budget', label: 'Kakšen je okvirni budget?' },
    { id: 'rok', label: 'Kdaj mora stran zaživeti?', izbire: ['1 mesec', '2-3 mesece', '6 mesecev'], svoje: 'ali vpiši datum ...' },
    { id: 'dodatno', label: 'Ali potrebuješ dodatne storitve?' },
    { id: 'vsebina', label: 'Kdo pripravi besedila, slike in strukturo vsebine?' },
  ],
  kampanja: [
    { id: 'kanali', label: 'Na katerih kanalih bo kampanja tekla?', izbire: ['Meta (FB/IG)', 'Google', 'TikTok', 'LinkedIn', 'YouTube', 'TV', 'Radio', 'Tisk', 'Zunanje (plakati, avtobusi)'], vec: true, svoje: 'dopiši svoje ...' },
    { id: 'formati', label: 'Katere formate potrebuješ?', izbire: ['Story / Reel', 'Feed objave', 'Spletne pasice', 'Video oglas', 'Tiskani oglas', 'Plakat / city light', 'TV spot'], vec: true, svoje: 'dopiši svoje ...' },
    { id: 'stevilo', label: 'Koliko oglasov (vizualov) potrebuješ?', izbire: ['Do 5', '6 do 15', '16 do 30', 'Nad 30'], svoje: 'ali vpiši število ...' },
    { id: 'cilj', label: 'Kaj je glavni cilj kampanje?', izbire: ['Prodaja', 'Prepoznavnost', 'Prijave / leadi', 'Lansiranje novega', 'Rebranding'], svoje: 'ali opiši po svoje ...' },
    { id: 'trajanje', label: 'Kakšna je časovnica kampanje?', izbire: ['Do 2 tedna', '1 mesec', '3 mesece', 'Celoletna'], svoje: 'ali opiši ...' },
    { id: 'regija', label: 'Katero regijo pokriva?', izbire: ['Lokalno', 'Slovenija', 'Adria regija', 'EU', 'Globalno'], vec: true },
    { id: 'influencerji', label: 'Ali vključimo influencerje?', izbire: ['Da', 'Ne', 'Morda'], svoje: 'kateri, če že veš ...' },
    { id: 'email', label: 'Ali potrebuješ tudi email marketing (newsletter)?', izbire: ['Da, kot posebna postavka', 'Ne', 'Še ne vem'] },
    { id: 'budget', label: 'Okvirni budget naročnika za oblikovanje kampanje?', izbire: ['Do 2.000 €', '2.000 do 5.000 €', '5.000 do 15.000 €', 'Nad 15.000 €', 'Še ne vem'], svoje: 'ali vpiši svoj znesek ...' },
    { id: 'opomba', label: 'Opomba (neobvezno)', placeholder: 'karkoli, kar naj upoštevam vnaprej ...' },
  ],
  publikacija: [
    { id: 'tip', label: 'Kakšna publikacija je?', izbire: ['Knjiga', 'Brošura', 'Katalog', 'Revija', 'Letak', 'Priročnik'], svoje: 'ali dopiši ...' },
    { id: 'format', label: 'Kakšen format?', izbire: ['A4', 'A5', 'A6', 'Kvadratni', 'DL (letak)'], svoje: 'ali vpiši mere ...' },
    { id: 'izhod', label: 'Za tisk, digital ali oboje?', izbire: ['PDF za tisk', 'PDF za splet', 'ePub', 'Interaktivni PDF'], vec: true },
    { id: 'strani', label: 'Koliko strani (okvirno)?', izbire: ['Do 8', '9 do 32', '33 do 96', 'Nad 96'], svoje: 'ali vpiši ...' },
    { id: 'besedila', label: 'Ali so besedila pripravljena in lektorirana?', izbire: ['Da, lektorirana', 'Pripravljena, brez lekture', 'Še nastajajo'] },
    { id: 'slike', label: 'Ali so slike in grafike že pripravljene?', izbire: ['Da, vse imamo', 'Delno', 'Še nič'] },
    { id: 'vir-slik', label: 'Če slik ni: kako jih pridobimo?', izbire: ['Fotografiranje', 'Ilustracije', 'AI slike', 'Stock fotografije'], vec: true, svoje: 'opombe ...' },
    { id: 'kolicina-slik', label: 'Koliko stock ali AI slik (okvirno)?', izbire: ['Brez', 'Do 10', '10 do 30', 'Nad 30'], svoje: 'ali vpiši ...' },
    { id: 'fonti', label: 'Pisave: licence za tisk?', izbire: ['Naročnik jih ima kupljene', 'Treba jih bo kupiti', 'Uporabimo odprtokodne', 'Ne vem še'] },
    { id: 'jeziki', label: 'Koliko jezikovnih različic?', izbire: ['1', '2', '3 ali več'] },
    { id: 'naklada', label: 'Predvidena naklada tiska?', izbire: ['Samo digital', 'Do 100', '100 do 500', 'Nad 500'], svoje: 'ali vpiši ...' },
    { id: 'proof', label: 'Ali potrebujete tiskarski proof (poskusni odtis)?', izbire: ['Da', 'Ne', 'Ne vem še'] },
    { id: 'tisk', label: 'Vključimo pripravo za tisk in komunikacijo s tiskarjem?', izbire: ['Da, vključi', 'Ne, uredijo sami'] },
    { id: 'opomba', label: 'Opomba (neobvezno)', placeholder: 'karkoli, kar naj upoštevam vnaprej ...' },
  ],
  embalaza: [
    { id: 'tip', label: 'Kakšna embalaža je?', izbire: ['Škatla', 'Etiketa', 'Vrečka', 'Tuba / steklenička', 'Ovitek'], svoje: 'ali dopiši ...' },
    { id: 'izdelki', label: 'Za koliko izdelkov ali variant gre?', izbire: ['1 izdelek', '2 do 4', '5 ali več'], svoje: 'ali vpiši ...' },
    { id: 'tehnika', label: 'Ali že obstaja dieline / tehnična skica?', izbire: ['Da, obstaja', 'Treba jo bo izdelati', 'Ne vem še'] },
    { id: 'trg', label: 'Kje se bo izdelek prodajal?', izbire: ['Splet', 'Trgovine', 'Premium butik', 'HoReCa', 'Lekarne'], vec: true, svoje: 'dopiši ...' },
    { id: 'oznake', label: 'Zakonske oznake (deklaracije, sestavine)?', izbire: ['Pripravljene', 'Treba jih bo urediti', 'Ne vem še'] },
    { id: 'budget', label: 'Okvirni budget naročnika?', izbire: ['Do 1.500 €', '1.500 do 4.000 €', 'Nad 4.000 €', 'Še ne vem'], svoje: 'ali vpiši svoj znesek ...' },
    { id: 'opomba', label: 'Opomba (neobvezno)', placeholder: 'karkoli, kar naj upoštevam vnaprej ...' },
  ],
  ilustracija: [
    { id: 'stil', label: 'Kakšen slog ilustracije želiš?', izbire: ['Editorial', 'Otroško', 'Luksuzno', 'Tehnično', '3D', 'Ročno risano'], vec: true, svoje: 'ali opiši ...' },
    { id: 'tehnika', label: 'Kakšna tehnika?', izbire: ['Ročno (akvarel, tempera, akril, kreda ...)', 'Računalniška grafika (vektor, digital painting ...)'], svoje: 'ali natančneje opiši tehniko in format ...' },
    { id: 'kolicina', label: 'Koliko ilustracij ali likov?', izbire: ['1 do 3', '4 do 8', '9 ali več'], svoje: 'ali vpiši ...' },
    { id: 'barvnost', label: 'Črtne ali barvne?', izbire: ['Črtne', 'Barvne', 'Oboje'] },
    { id: 'pravice', label: 'Kje in koliko časa se bodo uporabljale?', izbire: ['Ena objava / kampanja', 'Splet neomejeno', 'Vsi mediji neomejeno'], svoje: 'ali opiši ...' },
    { id: 'budget', label: 'Okvirni budget naročnika?', izbire: ['Do 800 €', '800 do 2.000 €', 'Nad 2.000 €', 'Še ne vem'], svoje: 'ali vpiši svoj znesek ...' },
    { id: 'opomba', label: 'Opomba (neobvezno)', placeholder: 'karkoli, kar naj upoštevam vnaprej ...' },
  ],
  direkcija: [
    { id: 'vloga', label: 'Kaj naj kreativna direkcija pokrije?', izbire: ['Koncept in strategija', 'Art direction', 'Vodenje izvajalcev', 'Nadzor izvedbe'], vec: true, svoje: 'dopiši ...' },
    { id: 'ekipa', label: 'Ali vodim tudi zunanje izvajalce?', izbire: ['Da', 'Ne', 'Delno'], svoje: 'kdo je že v ekipi ...' },
    { id: 'trajanje', label: 'Kakšno sodelovanje?', izbire: ['Enkraten projekt', '3-mesečno', '6-mesečno ali več'], svoje: 'ali opiši ...' },
    { id: 'srecanja', label: 'Kako pogosta srečanja?', izbire: ['Tedensko', 'Mesečno', 'Po potrebi'] },
    { id: 'budget', label: 'Okvirni mesečni budget naročnika?', izbire: ['Do 800 €', '800 do 2.000 €', 'Nad 2.000 €', 'Še ne vem'], svoje: 'ali vpiši svoj znesek ...' },
    { id: 'opomba', label: 'Opomba (neobvezno)', placeholder: 'karkoli, kar naj upoštevam vnaprej ...' },
  ],
  fotografija: [
    { id: 'tip', label: 'Kaj se fotografira?', izbire: ['Produkti', 'Portreti / ekipa', 'Prostori', 'Dogodek', 'Hrana', 'Kampanja'], vec: true, svoje: 'dopiši ...' },
    { id: 'trajanje', label: 'Koliko fotografiranja?', izbire: ['Pol dneva', '1 dan', '2 ali več dni'], svoje: 'ali opiši ...' },
    { id: 'lokacija', label: 'Kje?', izbire: ['V studiu', 'Pri naročniku', 'Na zunanji lokaciji', 'Več lokacij'] },
    { id: 'najem', label: 'Bo treba najeti studio, opremo ali lokacijo?', izbire: ['Ne', 'Da, studio', 'Da, luči / opremo', 'Da, lokacijo', 'Ne vem še'], vec: true },
    { id: 'post', label: 'Koliko obdelanih fotografij za predajo?', izbire: ['Do 20', '20 do 50', 'Nad 50'], svoje: 'ali vpiši ...' },
    { id: 'obdelava', label: 'Kakšna obdelava?', izbire: ['Osnovna', 'Napredna retuša'] },
    { id: 'raba', label: 'Kje se bodo uporabljale?', izbire: ['Splet / social', 'Tisk', 'Oglaševanje'], vec: true },
    { id: 'budget', label: 'Okvirni budget naročnika?', izbire: ['Do 500 €', '500 do 1.500 €', 'Nad 1.500 €', 'Še ne vem'], svoje: 'ali vpiši svoj znesek ...' },
    { id: 'opomba', label: 'Opomba (neobvezno)', placeholder: 'karkoli, kar naj upoštevam vnaprej ...' },
  ],
  copy: [
    { id: 'kanal', label: 'Za kateri kanal nastajajo besedila?', izbire: ['Spletna stran', 'Blog', 'Oglasi', 'Email', 'Social', 'PR', 'Naming / slogan'], vec: true, svoje: 'dopiši ...' },
    { id: 'kolicina', label: 'Koliko besedil ali strani?', izbire: ['Do 5 strani', '6 do 15 strani', 'Nad 15 strani'], svoje: 'ali vpiši ...' },
    { id: 'ton', label: 'Kakšen ton znamke?', izbire: ['Formalno', 'Toplo', 'Drzno', 'Strokovno', 'Igrivo'], vec: true, svoje: 'ali opiši ...' },
    { id: 'seo', label: 'SEO optimizacija?', izbire: ['Da', 'Ne', 'Svetuj mi'] },
    { id: 'jeziki', label: 'V katerih jezikih?', izbire: ['Slovenščina', 'Slovenščina + angleščina', 'Več jezikov'], svoje: 'kateri ...' },
    { id: 'gradiva', label: 'Kakšna so izhodišča?', izbire: ['Imajo iztočnice', 'Potreben intervju', 'Začnemo iz nič'] },
    { id: 'budget', label: 'Okvirni budget naročnika?', izbire: ['Do 500 €', '500 do 1.500 €', 'Nad 1.500 €', 'Še ne vem'], svoje: 'ali vpiši svoj znesek ...' },
    { id: 'opomba', label: 'Opomba (neobvezno)', placeholder: 'karkoli, kar naj upoštevam vnaprej ...' },
  ],
  interier: [
    { id: 'prostor', label: 'Kateri prostor urejamo?', izbire: ['Stanovanje', 'Poslovni prostor', 'Gostinski lokal', 'Trgovina', 'Razstavni prostor'], vec: true, svoje: 'dopiši ...' },
    { id: 'obseg', label: 'Koliko prostorov ali m²?', izbire: ['Do 30 m²', '30 do 80 m²', 'Nad 80 m²'], svoje: 'ali vpiši ...' },
    { id: 'faza', label: 'V kateri fazi je projekt?', izbire: ['Novogradnja', 'Prenova', 'Samo oprema / styling'] },
    { id: 'storitve', label: 'Kaj vključuje?', izbire: ['Idejna zasnova', 'Tlorisi / postavitev', '3D vizualizacije', 'Izbor materialov in opreme', 'Nadzor izvedbe'], vec: true, svoje: 'dopiši ...' },
    { id: 'budget', label: 'Okvirni budget naročnika?', izbire: ['Do 2.000 €', '2.000 do 6.000 €', 'Nad 6.000 €', 'Še ne vem'], svoje: 'ali vpiši svoj znesek ...' },
    { id: 'opomba', label: 'Opomba (neobvezno)', placeholder: 'karkoli, kar naj upoštevam vnaprej ...' },
  ],
  arhitektura: [
    { id: 'tip', label: 'Kaj oblikujemo?', izbire: ['Stanovanjski objekt', 'Poslovni objekt', 'Prizidek / prenova', 'Zunanja ureditev'], vec: true, svoje: 'dopiši ...' },
    { id: 'faza', label: 'V kateri fazi?', izbire: ['Idejna zasnova', 'Dokumentacija (IZP / PGD)', 'Izvedbeni načrti', 'Nadzor'] },
    { id: 'povrsina', label: 'Okvirna površina?', izbire: ['Do 100 m²', '100 do 300 m²', 'Nad 300 m²'], svoje: 'ali vpiši ...' },
    { id: 'vizualizacije', label: 'So potrebne 3D vizualizacije?', izbire: ['Da', 'Ne', 'Morda'] },
    { id: 'budget', label: 'Okvirni budget naročnika?', izbire: ['Do 3.000 €', '3.000 do 8.000 €', 'Nad 8.000 €', 'Še ne vem'], svoje: 'ali vpiši svoj znesek ...' },
    { id: 'opomba', label: 'Opomba (neobvezno)', placeholder: 'karkoli, kar naj upoštevam vnaprej ...' },
  ],
  razstava: [
    { id: 'tip', label: 'Kaj oblikujemo?', izbire: ['Razstavni prostor / sejem', 'Muzejska postavitev', 'Scenografija dogodka', 'Instalacija'], vec: true, svoje: 'dopiši ...' },
    { id: 'obseg', label: 'Velikost prostora?', izbire: ['Do 20 m²', '20 do 60 m²', 'Nad 60 m²'], svoje: 'ali vpiši ...' },
    { id: 'storitve', label: 'Kaj vključuje?', izbire: ['Koncept', 'Tlorisi', '3D vizualizacije', 'Grafika', 'Nadzor postavitve'], vec: true },
    { id: 'trajanje', label: 'Koliko časa stoji?', izbire: ['Enkraten dogodek', 'Do 1 mesec', 'Stalna postavitev'] },
    { id: 'budget', label: 'Okvirni budget naročnika?', izbire: ['Do 2.000 €', '2.000 do 6.000 €', 'Nad 6.000 €', 'Še ne vem'], svoje: 'ali vpiši svoj znesek ...' },
    { id: 'opomba', label: 'Opomba (neobvezno)', placeholder: 'karkoli, kar naj upoštevam vnaprej ...' },
  ],
  produktni: [
    { id: 'tip', label: 'Kaj oblikujemo?', izbire: ['Kos pohištva', 'Serija izdelkov', 'Razsvetljava', 'Uporabni predmet'], vec: true, svoje: 'dopiši ...' },
    { id: 'kolicina', label: 'Koliko izdelkov ali variant?', izbire: ['1', '2 do 4', '5 ali več'], svoje: 'ali vpiši ...' },
    { id: 'storitve', label: 'Kaj vključuje?', izbire: ['Koncept', 'Tehnična dokumentacija', '3D model', 'Prototip', 'Nadzor proizvodnje'], vec: true },
    { id: 'proizvodnja', label: 'Je proizvajalec znan?', izbire: ['Da', 'Ne', 'Iščemo ga'] },
    { id: 'budget', label: 'Okvirni budget naročnika?', izbire: ['Do 2.000 €', '2.000 do 6.000 €', 'Nad 6.000 €', 'Še ne vem'], svoje: 'ali vpiši svoj znesek ...' },
    { id: 'opomba', label: 'Opomba (neobvezno)', placeholder: 'karkoli, kar naj upoštevam vnaprej ...' },
  ],
  uxui: [
    { id: 'tip', label: 'Kaj oblikujemo?', izbire: ['Spletna stran', 'Spletna aplikacija', 'Mobilna aplikacija', 'Dashboard / SaaS'], vec: true, svoje: 'dopiši ...' },
    { id: 'obseg', label: 'Koliko ekranov ali pogledov?', izbire: ['Do 5', '6 do 15', '16 do 30', 'Nad 30'], svoje: 'ali vpiši ...' },
    { id: 'storitve', label: 'Kaj vključuje?', izbire: ['UX raziskava', 'Uporabniške poti', 'Žični okvirji (wireframe)', 'UI dizajn', 'Prototip', 'Design system'], vec: true },
    { id: 'osnova', label: 'Iz česa izhajamo?', izbire: ['Iz nič', 'Obstaja CGP', 'Obstaja star dizajn'] },
    { id: 'test', label: 'Uporabniško testiranje?', izbire: ['Da', 'Ne', 'Svetuj mi'] },
    { id: 'budget', label: 'Okvirni budget naročnika?', izbire: ['Do 1.500 €', '1.500 do 4.000 €', 'Nad 4.000 €', 'Še ne vem'], svoje: 'ali vpiši svoj znesek ...' },
    { id: 'opomba', label: 'Opomba (neobvezno)', placeholder: 'karkoli, kar naj upoštevam vnaprej ...' },
  ],
  aplikacija: [
    { id: 'platforma', label: 'Za katere platforme?', izbire: ['iOS', 'Android', 'Oboje', 'Spletna (PWA)'], vec: true },
    { id: 'obseg', label: 'Koliko ključnih funkcij ali ekranov?', izbire: ['Do 5', '6 do 15', 'Nad 15'], svoje: 'ali vpiši ...' },
    { id: 'storitve', label: 'Kaj prevzameš?', izbire: ['UX/UI dizajn', 'Prototip', 'Razvoj', 'Samo dizajn'], vec: true },
    { id: 'backend', label: 'Ali rabi backend ali bazo?', izbire: ['Da', 'Ne', 'Ne vem še'] },
    { id: 'budget', label: 'Okvirni budget naročnika?', izbire: ['Do 3.000 €', '3.000 do 8.000 €', 'Nad 8.000 €', 'Še ne vem'], svoje: 'ali vpiši svoj znesek ...' },
    { id: 'opomba', label: 'Opomba (neobvezno)', placeholder: 'karkoli, kar naj upoštevam vnaprej ...' },
  ],
  dizajnsistem: [
    { id: 'obseg', label: 'Kako obsežen sistem?', izbire: ['Osnovni (barve, tipografija, gumbi)', 'Srednji (komponente)', 'Obsežen (celotna knjižnica)'] },
    { id: 'namen', label: 'Za kaj?', izbire: ['Spletna stran', 'Aplikacija', 'Več produktov', 'Znamka'], vec: true },
    { id: 'orodje', label: 'V katerem orodju?', izbire: ['Figma', 'Drugo'], svoje: 'katero ...' },
    { id: 'dokumentacija', label: 'Potrebna dokumentacija / navodila?', izbire: ['Da', 'Osnovna', 'Ne'] },
    { id: 'budget', label: 'Okvirni budget naročnika?', izbire: ['Do 1.500 €', '1.500 do 4.000 €', 'Nad 4.000 €', 'Še ne vem'], svoje: 'ali vpiši svoj znesek ...' },
    { id: 'opomba', label: 'Opomba (neobvezno)', placeholder: 'karkoli, kar naj upoštevam vnaprej ...' },
  ],
  smm: [
    { id: 'kanali', label: 'Katere kanale vodimo?', izbire: ['Instagram', 'Facebook', 'TikTok', 'LinkedIn', 'YouTube'], vec: true, svoje: 'dopiši ...' },
    { id: 'objave', label: 'Koliko objav mesečno?', izbire: ['Do 8', '9 do 16', 'Nad 16'], svoje: 'ali vpiši ...' },
    { id: 'storitve', label: 'Kaj vključuje?', izbire: ['Strategija', 'Vsebinski koledar', 'Oblikovanje objav', 'Copywriting', 'Odgovarjanje na komentarje', 'Oglaševanje'], vec: true },
    { id: 'gradiva', label: 'Kdo priskrbi fotografije in video?', izbire: ['Naročnik', 'Jaz', 'Kombinirano'] },
    { id: 'trajanje', label: 'Za koliko časa?', izbire: ['Enkratno', '3-mesečno', '6-mesečno ali več'] },
    { id: 'budget', label: 'Okvirni mesečni budget naročnika?', izbire: ['Do 500 €', '500 do 1.500 €', 'Nad 1.500 €', 'Še ne vem'], svoje: 'ali vpiši svoj znesek ...' },
    { id: 'opomba', label: 'Opomba (neobvezno)', placeholder: 'karkoli, kar naj upoštevam vnaprej ...' },
  ],
  seo: [
    { id: 'storitve', label: 'Kaj potrebuje?', izbire: ['Tehnični SEO audit', 'Optimizacija vsebin', 'Ključne besede', 'Povezave (linkbuilding)', 'Redno vodenje'], vec: true },
    { id: 'stran', label: 'Kakšna stran?', izbire: ['Predstavitvena', 'Spletna trgovina', 'Blog / portal'], svoje: 'dopiši ...' },
    { id: 'stanje', label: 'Trenutno stanje?', izbire: ['Nova stran', 'Obstoječa brez SEO', 'Že delano na SEO'] },
    { id: 'trajanje', label: 'Enkratno ali redno?', izbire: ['Enkraten audit / optimizacija', 'Mesečno vodenje'] },
    { id: 'budget', label: 'Okvirni budget naročnika?', izbire: ['Do 500 €', '500 do 1.500 €', 'Nad 1.500 €', 'Še ne vem'], svoje: 'ali vpiši svoj znesek ...' },
    { id: 'opomba', label: 'Opomba (neobvezno)', placeholder: 'karkoli, kar naj upoštevam vnaprej ...' },
  ],
  email: [
    { id: 'storitve', label: 'Kaj potrebuje?', izbire: ['Zasnova predloge', 'Postavitev v orodju', 'Pisanje vsebin', 'Avtomatizacije', 'Redno pošiljanje'], vec: true },
    { id: 'orodje', label: 'Katero orodje?', izbire: ['Mailchimp', 'MailerLite', 'Drugo', 'Nimajo še'], svoje: 'katero ...' },
    { id: 'pogostost', label: 'Kako pogosto?', izbire: ['Enkratno', 'Mesečno', 'Tedensko'] },
    { id: 'baza', label: 'Imajo bazo naslovnikov?', izbire: ['Da', 'Ne', 'Gradimo jo'] },
    { id: 'budget', label: 'Okvirni budget naročnika?', izbire: ['Do 400 €', '400 do 1.200 €', 'Nad 1.200 €', 'Še ne vem'], svoje: 'ali vpiši svoj znesek ...' },
    { id: 'opomba', label: 'Opomba (neobvezno)', placeholder: 'karkoli, kar naj upoštevam vnaprej ...' },
  ],
  pr: [
    { id: 'storitve', label: 'Kaj vključuje?', izbire: ['Sporočila za javnost', 'Odnosi z mediji', 'Krizno komuniciranje', 'Dogodki', 'Vsebine za medije'], vec: true },
    { id: 'obseg', label: 'Enkratno ali redno?', izbire: ['Enkraten projekt', '3-mesečno', '6-mesečno ali več'] },
    { id: 'mediji', label: 'Kateri mediji?', izbire: ['Lokalni', 'Nacionalni', 'Panožni / strokovni', 'Spletni'], vec: true },
    { id: 'gradiva', label: 'Imajo pripravljena izhodišča?', izbire: ['Da', 'Delno', 'Ne'] },
    { id: 'budget', label: 'Okvirni mesečni budget naročnika?', izbire: ['Do 800 €', '800 do 2.000 €', 'Nad 2.000 €', 'Še ne vem'], svoje: 'ali vpiši svoj znesek ...' },
    { id: 'opomba', label: 'Opomba (neobvezno)', placeholder: 'karkoli, kar naj upoštevam vnaprej ...' },
  ],
  video: [
    { id: 'tip', label: 'Kakšen video?', izbire: ['Promocijski', 'Izobraževalni', 'Social (kratki)', 'Dogodek', 'Intervju'], vec: true, svoje: 'dopiši ...' },
    { id: 'kolicina', label: 'Koliko videov ali kakšna dolžina?', izbire: ['1 kratek', '1 daljši', 'Serija'], svoje: 'ali opiši ...' },
    { id: 'storitve', label: 'Kaj prevzameš?', izbire: ['Scenarij', 'Snemanje', 'Montaža', 'Animacija', 'Zvok / glasba'], vec: true },
    { id: 'snemanje', label: 'Koliko snemalnih dni?', izbire: ['Brez snemanja', 'Pol dneva', '1 dan', '2 ali več'] },
    { id: 'najem', label: 'Najem opreme, ekipe ali lokacije?', izbire: ['Ne', 'Da, oprema', 'Da, ekipa', 'Da, lokacija', 'Ne vem še'], vec: true },
    { id: 'budget', label: 'Okvirni budget naročnika?', izbire: ['Do 1.000 €', '1.000 do 3.000 €', 'Nad 3.000 €', 'Še ne vem'], svoje: 'ali vpiši svoj znesek ...' },
    { id: 'opomba', label: 'Opomba (neobvezno)', placeholder: 'karkoli, kar naj upoštevam vnaprej ...' },
  ],
  motion: [
    { id: 'tip', label: 'Kaj animiramo?', izbire: ['Logotip', 'Explainer video', 'Social animacije', 'UI animacije', 'Podnapisi / grafika'], vec: true, svoje: 'dopiši ...' },
    { id: 'kolicina', label: 'Koliko ali kakšna dolžina?', izbire: ['Do 15 s', '15 do 60 s', 'Nad 60 s / serija'], svoje: 'ali vpiši ...' },
    { id: 'stil', label: 'Kakšen slog?', izbire: ['2D', '3D', 'Kinetična tipografija', 'Mešano'], svoje: 'ali opiši ...' },
    { id: 'gradiva', label: 'Ali obstajajo grafike / logotip?', izbire: ['Da', 'Delno', 'Ne, treba oblikovati'] },
    { id: 'zvok', label: 'Potreben zvok ali glasba?', izbire: ['Da', 'Ne', 'Naročnik priskrbi'] },
    { id: 'budget', label: 'Okvirni budget naročnika?', izbire: ['Do 900 €', '900 do 2.500 €', 'Nad 2.500 €', 'Še ne vem'], svoje: 'ali vpiši svoj znesek ...' },
    { id: 'opomba', label: 'Opomba (neobvezno)', placeholder: 'karkoli, kar naj upoštevam vnaprej ...' },
  ],
  render3d: [
    { id: 'tip', label: 'Kaj vizualiziramo?', izbire: ['Izdelek', 'Interier', 'Arhitektura / eksterier', 'Embalaža', 'Animacija'], vec: true, svoje: 'dopiši ...' },
    { id: 'kolicina', label: 'Koliko pogledov ali slik?', izbire: ['Do 3', '4 do 8', 'Nad 8'], svoje: 'ali vpiši ...' },
    { id: 'gradiva', label: 'Ali obstajajo modeli / načrti?', izbire: ['Da', 'Delno', 'Ne, treba modelirati'] },
    { id: 'kakovost', label: 'Namen?', izbire: ['Predstavitev / splet', 'Tisk', 'Fotorealizem za oglas'] },
    { id: 'budget', label: 'Okvirni budget naročnika?', izbire: ['Do 900 €', '900 do 2.500 €', 'Nad 2.500 €', 'Še ne vem'], svoje: 'ali vpiši svoj znesek ...' },
    { id: 'opomba', label: 'Opomba (neobvezno)', placeholder: 'karkoli, kar naj upoštevam vnaprej ...' },
  ],
  strategija: [
    { id: 'obseg', label: 'Kaj vključuje?', izbire: ['Pozicioniranje', 'Ciljne skupine', 'Vrednote in ton', 'Ime / naming', 'Komunikacijska strategija'], vec: true },
    { id: 'faza', label: 'V kateri fazi je znamka?', izbire: ['Nova znamka', 'Prenova', 'Rast / širitev'] },
    { id: 'delavnice', label: 'Delavnice z naročnikom?', izbire: ['Da', 'Ne', 'Po potrebi'] },
    { id: 'izdelek', label: 'Kaj je rezultat?', izbire: ['Strateški dokument', 'Brand book', 'Oboje'] },
    { id: 'budget', label: 'Okvirni budget naročnika?', izbire: ['Do 1.200 €', '1.200 do 3.500 €', 'Nad 3.500 €', 'Še ne vem'], svoje: 'ali vpiši svoj znesek ...' },
    { id: 'opomba', label: 'Opomba (neobvezno)', placeholder: 'karkoli, kar naj upoštevam vnaprej ...' },
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
  { id: 'najem-studio', ime: 'Najem foto studia (dan)',           cena: 250 },
  { id: 'najem-oprema', ime: 'Najem opreme / luči (dan)',         cena: 180 },
  { id: 'lokacija',     ime: 'Lokacija in prevoz (pavšal)',       cena: 120 },
  { id: 'font-licenca', ime: 'Licenca pisave (za tisk)',          cena: 150 },
  { id: 'sw-strosek',   ime: 'Programska oprema / naročnine (projekt)', cena: 100 },
  { id: 'zvok',         ime: 'Zvočna podoba / jingle',            cena: 400 },
  { id: '3d-render',    ime: '3D vizualizacija / render (kos)',   cena: 350 },
  { id: 'motion',       ime: 'Motion graphics video (do 30 s)',   cena: 600 },
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

type Postavka = { id: string; ime: string; cena: number; kolicina: number; enota?: 'kos' | 'ura' };

const brezSumnikov = (s: string) =>
  s.toLowerCase().replace(/č/g, 'c').replace(/š/g, 's').replace(/ž/g, 'z');

const PAKETI = [
  { id: 'osnovni',     ime: 'Osnovni',     mult: 0.75, opis: 'ožji obseg, 1 krog popravkov, osnovni formati' },
  { id: 'priporoceni', ime: 'Priporočeni', mult: 1,    opis: 'poln obseg, 2 kroga popravkov, vsi formati' },
  { id: 'premium',     ime: 'Premium',     mult: 1.35, opis: 'razširjen obseg, 3 krogi popravkov, dodatna varianta, prednostni odziv' },
];

/* Konkretne alineje paketov v ponudbi (vzor: Tinine prave ponudbe — paket
   prodaja z vsebino, ne s pridevnikom). Na storitev tri ravni:
   [0] jedro v vseh paketih, [1] dodatno od Priporočenega, [2] samo Premium. */
const ALINEJE_PAKETOV: Record<string, [string[], string[], string[]]> = {
  logo: [
    ['logotip: idejna zasnova in končna izvedba',
      'datoteke za tisk in splet (SVG, PDF, PNG, EPS)',
      'osnovna barvna in tipografska določila'],
    ['različice logotipa (horizontalna, vertikalna, simbol)',
      'mini priročnik uporabe (PDF)'],
    ['razširjeni priročnik s primeri rabe',
      'SVG animacija logotipa'],
  ],
  cgp: [
    ['logotip: oblikovanje in končna verzija',
      'barvna paleta (CMYK, RGB, HEX)',
      'tipografija za naslove in besedilo',
      'datoteke za tisk in digitalno rabo',
      'osnovni priročnik CGP (PDF)'],
    ['tiskovine: vizitka, dopisni list, ovojnica',
      'e-mail podpis in ozadje za videoklice',
      'predloge za družbena omrežja'],
    ['napredni brand manual (24+ strani)',
      'predloga za predstavitve (PowerPoint/Keynote)',
      'SVG animacija logotipa'],
  ],
  web: [
    ['UX zasnova: struktura strani in uporabniške poti',
      'oblikovanje ključnih strani',
      'odzivna izvedba za vse naprave',
      'osnovni SEO (meta podatki, struktura URL)',
      'testiranje na napravah in brskalnikih'],
    ['UI oblikovanje po meri (ne po predlogi)',
      'optimizacija vsebin in slik',
      'vodenje projekta in koordinacija'],
    ['animacije in mikrointerakcije',
      'napredna SEO optimizacija',
      'analitika (GA4) in osnovno merjenje'],
  ],
  kampanja: [
    ['koncept kampanje in ključni vizual',
      'prilagoditve za dogovorjene kanale',
      'priprava datotek za objavo'],
    ['razširjen nabor formatov (feed, story, pasice)',
      'usklajevanje s tiskarno oz. zakupnikom medijev'],
    ['dodatne variante ključnega vizuala za testiranje',
      'predloge za nadaljnje objave'],
  ],
  publikacija: [
    ['oblikovna zasnova in tipografska ureditev',
      'prelom dogovorjenega obsega strani',
      'priprava za tisk ali digitalno objavo (PDF)'],
    ['obdelava in umestitev slikovnega gradiva',
      'komunikacija s tiskarno in pregled poskusnega tiska'],
    ['dodatna oblikovna varianta naslovnice',
      'priprava izpeljank (web PDF, e-publikacija)'],
  ],
  embalaza: [
    ['oblikovna zasnova embalaže',
      'priprava za tisk po specifikaciji (plašč/mreža)',
      'datoteke za proizvodnjo'],
    ['prilagoditve za več variant ali okusov',
      'usklajevanje s tiskarno in pregled vzorca'],
    ['3D vizualizacija za predstavitev in prodajo',
      'predloge za nadaljnje izdelke v liniji'],
  ],
  ilustracija: [
    ['idejne skice in izbor smeri',
      'izvedba dogovorjenih ilustracij',
      'datoteke v dogovorjenih formatih'],
    ['barvne variante in prilagoditve za rabo',
      'osnovna navodila za uporabo'],
    ['razširjen vizualni svet (dodatni motivi in elementi)',
      'priprava za animacijo'],
  ],
  direkcija: [
    ['kreativna strategija in usmeritev projekta',
      'vodenje oblikovalskega procesa',
      'pregled in potrjevanje izvedb'],
    ['koordinacija zunanjih izvajalcev',
      'redna poročila in usklajevanja'],
    ['celoletni kreativni načrt',
      'prednostna razpoložljivost'],
  ],
  fotografija: [
    ['fotografiranje po dogovorjenem obsegu',
      'osnovna obdelava izbranih posnetkov',
      'oddaja v digitalnih formatih'],
    ['napredna obdelava (retuša)',
      'izbor in priprava za splet in tisk'],
    ['razširjen izbor posnetkov',
      'barvno usklajena serija za celostno rabo'],
  ],
  copy: [
    ['besedila po dogovorjenem obsegu',
      'ton komunikacije, usklajen z znamko',
      'jezikovni pregled napisanega'],
    ['SEO osnova (ključne besede v besedilih)',
      'prilagoditve za različne kanale'],
    ['variante naslovov za testiranje',
      'vsebinski načrt za nadaljnje objave'],
  ],
  interier: [
    ['idejna zasnova prostora',
      'tlorisi in postavitev opreme',
      'izbor materialov in barvne palete'],
    ['3D vizualizacije prostora',
      'specifikacija opreme in dobaviteljev'],
    ['nadzor izvedbe na terenu',
      'dodatna varianta zasnove'],
  ],
  arhitektura: [
    ['idejna zasnova',
      'tlorisi in prerezi',
      'osnovna dokumentacija'],
    ['3D vizualizacije',
      'izvedbeni načrti (PGD nivo)'],
    ['nadzor gradnje',
      'dodatna varianta zasnove'],
  ],
  razstava: [
    ['koncept postavitve',
      'tlorisi prostora',
      'izbor materialov'],
    ['3D vizualizacije',
      'grafične aplikacije na prostoru'],
    ['nadzor postavitve na dan dogodka',
      'dodatna varianta koncepta'],
  ],
  produktni: [
    ['idejna zasnova izdelka',
      'tehnična dokumentacija',
      '3D model'],
    ['izdelava fizičnega prototipa',
      'izbor materialov in barvne variante'],
    ['nadzor proizvodnje',
      'dodatna varianta izdelka'],
  ],
  uxui: [
    ['UX zasnova in uporabniške poti',
      'žični okvirji (wireframe)',
      'UI dizajn ključnih ekranov'],
    ['interaktivni prototip',
      'osnove design sistema'],
    ['uporabniško testiranje',
      'dodatna varianta dizajna'],
  ],
  aplikacija: [
    ['UX/UI dizajn ključnih ekranov',
      'interaktivni prototip'],
    ['design sistem',
      'priprava specifikacij za razvoj'],
    ['uporabniško testiranje',
      'dodatna platforma (iOS/Android)'],
  ],
  dizajnsistem: [
    ['osnovne komponente (barve, tipografija, gumbi, polja)',
      'dokumentacija rabe'],
    ['razširjena knjižnica komponent',
      'predloge ključnih ekranov'],
    ['predloga za razvijalce (dev handoff)',
      'nadzor doslednosti rabe'],
  ],
  smm: [
    ['vsebinski koledar',
      'oblikovanje objav',
      'osnovni copywriting'],
    ['vodenje in odgovarjanje na komentarje',
      'mesečno poročilo'],
    ['oglaševanje in ciljanje',
      'video / reels vsebine'],
  ],
  seo: [
    ['tehnični SEO pregled (audit)',
      'osnovna optimizacija ključnih besed'],
    ['optimizacija vsebin',
      'tehnični popravki'],
    ['mesečno spremljanje in poročanje',
      'linkbuilding'],
  ],
  email: [
    ['zasnova predloge',
      'postavitev v orodju'],
    ['avtomatizacije (dobrodošlica, opuščena košarica)',
      'pisanje vsebin'],
    ['redno mesečno pošiljanje',
      'A/B testiranje'],
  ],
  pr: [
    ['sporočila za javnost',
      'seznam relevantnih medijev'],
    ['odnosi z mediji in dogovarjanje objav',
      'redno mesečno poročilo'],
    ['krizno komuniciranje (pripravljenost)',
      'organizacija dogodka za medije'],
  ],
  video: [
    ['scenarij in koncept',
      'snemanje',
      'osnovna montaža'],
    ['barvna korekcija in zvok',
      'podnapisi'],
    ['animacija / motion elementi',
      'dodatna varianta za družbena omrežja'],
  ],
  motion: [
    ['koncept in storyboard',
      'animacija po dogovorjenem obsegu'],
    ['zvok in glasbena podlaga',
      'dodatne variante za kanale'],
    ['3D elementi',
      'dodaten jezik podnapisov / verzija'],
  ],
  render3d: [
    ['3D modeliranje po gradivih',
      'osnovna vizualizacija'],
    ['dodatni pogledi',
      'fotorealistična obdelava'],
    ['animacija / video vizualizacije',
      'dodatna varianta materialov'],
  ],
  strategija: [
    ['analiza trga in konkurence',
      'pozicioniranje in vrednote znamke'],
    ['komunikacijska strategija',
      'brand book dokument'],
    ['delavnice z ekipo naročnika',
      'dodatna revizija strategije'],
  ],
};

const POPRAVKI_PAKETA = [
  'vključen 1 krog popravkov',
  'vključena 2 kroga popravkov',
  'vključeni 3 krogi popravkov in prednostni odziv',
];

/* Razsirjena ponudba (vseh 5 tock iz revizije pravih ponudb):
   specifikacija cen, predviden cas, vzdrzevanje, dodatne moznosti. */
const TRAJANJE_TEDNOV: Record<string, [number, number]> = {
  logo: [2, 3], cgp: [3, 5], web: [3, 6], kampanja: [2, 4],
  publikacija: [2, 4], embalaza: [3, 5], ilustracija: [2, 4],
  fotografija: [1, 2], copy: [1, 3], /* direkcija: trajni angazma, izpuscena */
  interier: [3, 6], arhitektura: [6, 12], razstava: [2, 5], produktni: [4, 8],
  uxui: [3, 6], aplikacija: [5, 10], dizajnsistem: [3, 6],
  seo: [2, 4], email: [2, 3], video: [2, 5], motion: [2, 4], render3d: [2, 4],
  strategija: [3, 6],
  /* smm, pr: trajni mesecni angazma, izpusceni (kot direkcija) */
};
const tedniBeseda = (n: number) =>
  n === 1 ? 'teden' : n === 2 ? 'tedna' : n <= 4 ? 'tedne' : 'tednov';

type DodatnaMoznost = { ime: string; min: number; max?: number };
const DODATNE_MOZNOSTI: Record<string, DodatnaMoznost[]> = {
  logo: [
    { ime: 'dodatna idejna smer logotipa', min: 250 },
    { ime: 'animacija logotipa (SVG ali video)', min: 350 },
    { ime: 'dodatne aplikacije (vizitka, e-mail podpis)', min: 150 },
  ],
  cgp: [
    { ime: 'dodatne tiskovine (mape, plakati, table)', min: 200, max: 400 },
    { ime: 'razširjen set predlog za družbena omrežja', min: 250 },
    { ime: 'animacija logotipa', min: 350 },
  ],
  web: [
    { ime: 'večjezičnost (dodaten jezik)', min: 300 },
    { ime: 'napredna SEO analiza in optimizacija', min: 250 },
    { ime: 'Google Analytics (GA4) integracija', min: 100 },
    { ime: 'dodaten modul (blog, novice, galerija)', min: 150, max: 300 },
    { ime: 'e-mail sistem (newsletter, kontaktna integracija)', min: 150 },
  ],
  kampanja: [
    { ime: 'dodatni formati oglasov', min: 150, max: 300 },
    { ime: 'e-mail marketing (zasnova in predloga)', min: 300 },
    { ime: 'priprava objav za nadaljnje mesece', min: 250 },
  ],
  publikacija: [
    { ime: 'interaktivni PDF', min: 200 },
    { ime: 'e-publikacija (ePub)', min: 300 },
    { ime: 'dodatna varianta naslovnice', min: 150 },
  ],
  embalaza: [
    { ime: 'dodatna varianta ali okus', min: 250, max: 400 },
    { ime: '3D vizualizacija embalaže', min: 350 },
    { ime: 'fotografija izdelka za splet', min: 300 },
  ],
  ilustracija: [
    { ime: 'dodatna ilustracija', min: 150, max: 350 },
    { ime: 'animacija ilustracije', min: 400 },
    { ime: 'priprava za velike tiskane formate', min: 150 },
  ],
  direkcija: [
    { ime: 'dodatni dan na lokaciji ali pri naročniku', min: 400 },
    { ime: 'kreativna delavnica z ekipo naročnika', min: 500 },
  ],
  fotografija: [
    { ime: 'dodatna lokacija ali termin', min: 250 },
    { ime: 'napredna retuša (na fotografijo)', min: 30, max: 60 },
    { ime: 'kratki video posnetki ob fotografiranju', min: 400 },
  ],
  copy: [
    { ime: 'dodatni sklop besedil', min: 200, max: 400 },
    { ime: 'SEO članek', min: 150, max: 250 },
    { ime: 'priročnik tona komunikacije (ton of voice)', min: 400 },
  ],
  interier: [
    { ime: 'dodatna 3D vizualizacija', min: 250 },
    { ime: 'styling za fotografiranje prostora', min: 300 },
    { ime: 'nadzor izvedbe na terenu (dan)', min: 400 },
  ],
  arhitektura: [
    { ime: 'dodatna 3D vizualizacija', min: 300 },
    { ime: 'izdelava PGD dokumentacije', min: 1500 },
    { ime: 'nadzor gradnje (mesečno)', min: 500 },
  ],
  razstava: [
    { ime: 'dodatna 3D vizualizacija', min: 250 },
    { ime: 'nadzor postavitve na dan dogodka', min: 350 },
    { ime: 'tisk in produkcija grafik', min: 300 },
  ],
  produktni: [
    { ime: 'dodatna varianta izdelka', min: 300 },
    { ime: 'izdelava fizičnega prototipa', min: 500 },
    { ime: 'nadzor proizvodnje', min: 400 },
  ],
  uxui: [
    { ime: 'uporabniško testiranje', min: 300 },
    { ime: 'dodaten jezik / lokalizacija', min: 250 },
    { ime: 'design sistem dokumentacija', min: 400 },
  ],
  aplikacija: [
    { ime: 'dodatna platforma (iOS/Android)', min: 500 },
    { ime: 'backend / API povezava', min: 800 },
    { ime: 'objava v trgovini (App Store / Google Play)', min: 200 },
  ],
  dizajnsistem: [
    { ime: 'dodatne komponente', min: 150, max: 300 },
    { ime: 'predloga za razvijalce (dev handoff)', min: 300 },
    { ime: 'redno vzdrževanje sistema (mesečno)', min: 200 },
  ],
  smm: [
    { ime: 'dodatne objave', min: 150, max: 300 },
    { ime: 'upravljanje oglaševalskega proračuna', min: 200 },
    { ime: 'video / reels produkcija', min: 300 },
  ],
  seo: [
    { ime: 'mesečno spremljanje in poročanje', min: 200 },
    { ime: 'linkbuilding', min: 250 },
    { ime: 'tehnična implementacija popravkov', min: 300 },
  ],
  email: [
    { ime: 'dodatna avtomatizacija', min: 150 },
    { ime: 'mesečno vodenje', min: 200 },
    { ime: 'A/B testiranje', min: 100 },
  ],
  pr: [
    { ime: 'organizacija dogodka za medije', min: 500 },
    { ime: 'krizno komuniciranje (pripravljenost)', min: 400 },
    { ime: 'video / foto za medije', min: 300 },
  ],
  video: [
    { ime: 'dodatna varianta za družbena omrežja', min: 200, max: 400 },
    { ime: 'dodaten snemalni dan', min: 500 },
    { ime: 'glasba / zvočna oprema po meri', min: 250 },
  ],
  motion: [
    { ime: 'dodatna verzija (dolžina/format)', min: 200 },
    { ime: '3D elementi', min: 350 },
    { ime: 'glasbena podlaga po meri', min: 200 },
  ],
  render3d: [
    { ime: 'dodaten pogled / slika', min: 150, max: 300 },
    { ime: 'animacija vizualizacije (video)', min: 400 },
    { ime: 'dodatna varianta materialov', min: 150 },
  ],
  strategija: [
    { ime: 'dodatna delavnica z ekipo', min: 400 },
    { ime: 'oblikovanje brand booka', min: 500 },
    { ime: 'komunikacijski načrt za leto', min: 400 },
  ],
};

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
/* za hitro branje: v telesu (alineje/odstavki) samodejno poudarimo cene, %,
   trajanja in nekaj ključnih besed — brez rocnega markiranja povsod. */
const poudari = (s: string): string => s
  .replace(/(\d[\d.\s]*\s?(?:€|\$|£))/g, '<b>$1</b>')
  .replace(/(\b\d+\s?%)/g, '<b>$1</b>')
  .replace(/(\b\d+(?:\s?[–-]\s?\d+)?\s?(?:let\b|leto\b|leta\b|tednov\b|teden\b|tedna\b|mesec(?:ev|a)?\b|ur\b|urah\b))/gi, '<b>$1</b>');
const escP = (s: string) => poudari(escapeHtml(s));
/* vrstica s ceno na koncu -> label levo, cena poravnana DESNO (flex) */
const cenaDesno = (l: string): string => {
  const m = l.match(/^(.+?)\s*[—–:-]*\s+(\d[\d.\s]*\s?(?:€|\$|£))\s*$/);
  if (!m) return escP(l);
  return `<span class="offer-vrstica"><span class="offer-oznaka">${escP(m[1].trim())}</span><b class="offer-cena">${escapeHtml(m[2].trim())}</b></span>`;
};
const ponudbaVHtml = (s: string): string =>
  s.split('\n\n')
    .map((block): string => {
      const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
      if (!lines.length) return '';
      if (lines.every(l => /^─+$/.test(l))) return '<hr>';

      const first = lines[0];
      if (first.startsWith('PONUDBA:')) {
        const rest = lines.slice(1);
        const meta = rest.length ? `<p>${rest.map(escapeHtml).join('<br>')}</p>` : '';
        return `<p class="offer-kicker">Ponudba</p><h1>${escapeHtml(first.replace('PONUDBA:', '').trim())}</h1>${meta}`;
      }
      if (/^(OBSEG|DODATNE INFORMACIJE|IZBERITE PAKET|CENA IN OBSEG|POGOJI|SPECIFIKACIJA CEN|AVTORSKE PRAVICE|PREDVIDEN ČAS IZVEDBE|VZDRŽEVANJE|DODATNE MOŽNOSTI)( \(.+\))?$/.test(first)) {
        const rest = lines.slice(1);
        const body: string = rest.length ? ponudbaVHtml(rest.join('\n')) : '';
        return `<h2>${escapeHtml(first)}</h2>${body}`;
      }
      if (lines[0].startsWith('·')) {
        /* vsaka alineja = <li>; nadaljevalne vrstice (brez ·) se zlijejo
           v prejsnjo, da so vse alineje enake (pikice), tudi ce je pogoj
           prelomljen v dve vrstici */
        const items: string[] = [];
        lines.forEach(l => {
          if (l.startsWith('·')) items.push(l.replace(/^·\s*/, ''));
          else if (items.length) items[items.length - 1] += ' ' + l;
          else items.push(l);
        });
        return `<ul>${items.map(l => `<li>${escP(l)}</li>`).join('')}</ul>`;
      }
      if (lines.length >= 2 && /^[A-ZČŠŽ\s]+/.test(first) && first.includes('·')) {
        const [title, ...rest] = lines;
        const [, name = title, price = ''] = title.match(/^(.+?)\s*·\s*(.+)$/) ?? [];
        /* zaporedne alineje zdruzimo v <ul>, vmesni podnaslovi (ime
           storitve pri vec storitvah) ostanejo odstavki */
        const deli: string[] = [];
        let kup: string[] = [];
        const izprazni = () => {
          if (kup.length) {
            deli.push(`<ul>${kup.map(l => `<li>${cenaDesno(l.replace(/^·\s*/, ''))}</li>`).join('')}</ul>`);
            kup = [];
          }
        };
        rest.forEach(l => {
          if (l.startsWith('·')) kup.push(l);
          else { izprazni(); deli.push(`<p class="offer-podnaslov">${cenaDesno(l)}</p>`); }
        });
        izprazni();
        return `<div class="offer-package"><div class="offer-package-head"><h3>${escapeHtml(name.trim())}</h3><strong>${escapeHtml(price.trim())}</strong></div>${deli.join('')}</div>`;
      }
      return `<p>${lines.map(escP).join('<br>')}</p>`;
    })
    .join('');

/* Valuta ponudbe: cene so interno v EUR, prikaz in ponudba pa v izbrani
   valuti (priblizen preracun, zaokrozen na 50). */
const VALUTE = [
  { id: 'eur', ime: 'EUR — Evro',            znak: '€',   fx: 1     },
  { id: 'usd', ime: 'USD — Ameriški dolar',  znak: '$',   fx: 1.1   },
  { id: 'gbp', ime: 'GBP — Britanski funt',  znak: '£',   fx: 0.85  },
  { id: 'chf', ime: 'CHF — Švicarski frank', znak: 'CHF', fx: 0.95  },
  { id: 'jpy', ime: 'JPY — Japonski jen',    znak: '¥',   fx: 160   },
  { id: 'sek', ime: 'SEK — Švedska krona',   znak: 'SEK', fx: 11.2  },
  { id: 'nok', ime: 'NOK — Norveška krona',  znak: 'NOK', fx: 11.6  },
  { id: 'dkk', ime: 'DKK — Danska krona',    znak: 'DKK', fx: 7.46  },
  { id: 'pln', ime: 'PLN — Poljski zlot',    znak: 'PLN', fx: 4.3   },
  { id: 'czk', ime: 'CZK — Češka krona',     znak: 'CZK', fx: 25    },
  { id: 'huf', ime: 'HUF — Madžarski forint',znak: 'HUF', fx: 395   },
  { id: 'aud', ime: 'AUD — Avstralski dolar',znak: 'AUD', fx: 1.65  },
  { id: 'cad', ime: 'CAD — Kanadski dolar',  znak: 'CAD', fx: 1.48  },
  { id: 'cny', ime: 'CNY — Kitajski juan',   znak: 'CNY', fx: 7.85  },
  { id: 'inr', ime: 'INR — Indijska rupija', znak: 'INR', fx: 91    },
  { id: 'aed', ime: 'AED — Dirham (ZAE)',    znak: 'AED', fx: 4.0   },
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

/* Arhiv ponudb: cel posnetek ene ponudbe (za vrnitev / preklop med strankami).
   Loceno od cenovnih profilov (ti hranijo le cene). */
const K_ARHIV = 'pinart-kalkulator-arhiv';
const K_STEVEC = 'pinart-kalkulator-stevec';   /* zaporedni stevec ponudb po letu: { "2026": 4 } */
type ShranjenaP = {
  datum: string;
  izbrane: string[];
  /* postavkovni model (2026-07-10): vrstice ponudbe — instance storitev z
     lastnim imenom (Inovis, Itforyou) ali kolicino (6 ilustracij) */
  vrstice?: VrsticaP[];
  /* starejsa oblika (prehodno obdobje) — ob nalaganju se pretvori v vrstice */
  kolicine?: Record<string, number>;
  imenaPostavk?: Record<string, string>;
  vrstniRedIzbranih?: string[];
  odgovori: Record<string, string>;
  postavke: Postavka[];
  raba: 'znamka' | 'projekt';
  promet: string; dobicek: string; projPrihodek: string; projDobicek: string;
  popust: string; dodatki: string[];
  prenosPravic: 'izkljucni' | 'neizkljucni' | 'licenca';
  rocnePravice: string; rocnaLicenca: string; izjemePravice?: string;
  nazivPonudbe: string; narocnikPonudbe: string; narocnikEmail?: string;
  narocnikOseba?: string; narocnikNaslov?: string; narocnikDavcna?: string;
  obsegPonudbe: 'kratka' | 'razsirjena'; tonPonudbe: TonPonudbe; avansPct: string;
  kaziUre: boolean; nogaZnak: boolean;
  izkusnje: string; mojTrg: string; trgNarocnika: string; valuta: string; valutaRocna: boolean;
  rocnoBesedilo: boolean; besediloHtml: string;
  custDrzavaNarocnik?: string;
  /* ena koncna cena namesto treh paketov (2026-07-17) */
  enaCena?: boolean;
  stevilkaPonudbe?: string; veljavnostDni?: string;
};

/* Moja podjetja: vec identitet podjetja (ime/davcna/TRR/DDV/avans/urne
   postavke), ce delas kot vec razlicnih podjetij ali za vec narocnikov
   izstavljas pod razlicnimi imeni. Loceno od cenovnih profilov (ti so
   samo cene storitev) in arhiva ponudb (te so posamezne stranke). */
const K_PODJETJA = 'pinart-kalkulator-podjetja';
type PodjetjeProfil = {
  ponudnik: { ime: string; davcna: string; email: string; telefon: string; naslov: string; trr: string };
  predklic: string;
  ddvZavezanec: boolean; ddvStopnja: string; avansPct: string;
  urnePostavke: { ime: string; cena: string }[];
};

/* Nevidni Cloudflare Turnstile zeton za anonimni POST cene — aktiven SELE, ce
   je vpisan NEXT_PUBLIC_TURNSTILE_SITE_KEY. Brez kljuca vrne undefined in
   posiljanje tece kot doslej (nic ne blokira med razvojem). Uporabnik ne
   vidi nicesar — widget je skrit izven zaslona. */
async function pridobiTurnstileToken(): Promise<string | undefined> {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!siteKey || typeof window === 'undefined') return undefined;
  const w = window as unknown as { turnstile?: { render: (el: HTMLElement, o: Record<string, unknown>) => void } };
  if (!w.turnstile) {
    await new Promise<void>((res) => {
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true; s.defer = true;
      s.onload = () => res();
      s.onerror = () => res();
      document.head.appendChild(s);
    });
  }
  if (!w.turnstile) return undefined;
  return new Promise<string | undefined>((resolve) => {
    let done = false;
    const finish = (v?: string) => { if (!done) { done = true; resolve(v); } };
    const holder = document.createElement('div');
    holder.style.cssText = 'position:fixed;left:-9999px;top:-9999px;';
    document.body.appendChild(holder);
    try {
      w.turnstile!.render(holder, {
        sitekey: siteKey,
        callback: (token: string) => finish(token),
        'error-callback': () => finish(undefined),
        'timeout-callback': () => finish(undefined),
      });
    } catch { finish(undefined); }
    setTimeout(() => finish(undefined), 8000);
  });
}

/* Animiran preliv v ozadju orodja (roza → bez → pale modra, pocasno
   valovanje + dihajoc roza sij) — cisti WebGL2, brez knjiznic. Ce WebGL
   ni na voljo, canvas ostane prazen in pod njim je papirnata barva.
   Safari past: fragment shader s for-zanko rabi "precision highp int",
   sicer se tiho zavrne. Reduced-motion narise le en okvir. */
function GradientOzadje() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cvs = ref.current;
    if (!cvs) return;
    const gl = cvs.getContext('webgl2', { alpha: false, antialias: true });
    if (!gl) return;
    const VERT = '#version 300 es\nin vec2 position;\nvoid main(){gl_Position=vec4(position,0.0,1.0);}';
    const FRAG = `#version 300 es
precision highp float;
precision highp int;
uniform float uTime;
uniform vec2 uRes;
uniform vec3 c1;
uniform vec3 c2;
uniform vec3 c3;
out vec4 fragColor;
void main(){
  vec2 uv = gl_FragCoord.xy/uRes;
  float asp = uRes.x / max(uRes.y, 1.0);
  vec2 p = vec2(uv.x*asp, uv.y);            // aspect-popravek -> bloba sta OKROGLA, ne razpotegnjena
  // dva krozna bloba, ki lebdita po X in Y z razlicnimi frekvencami -> se priblizata in gresta narazen
  vec2 cA = vec2((0.34 + sin(uTime*0.50)*0.15 + sin(uTime*0.21)*0.05)*asp,
                  0.40 + cos(uTime*0.43)*0.20 + sin(uTime*0.17)*0.05);
  vec2 cB = vec2((0.68 + cos(uTime*0.41)*0.16 + cos(uTime*0.27)*0.04)*asp,
                  0.58 + sin(uTime*0.37)*0.19 + cos(uTime*0.6)*0.05);
  float dA = distance(p, cA);
  float dB = distance(p, cB);
  vec3 col = c2;                            // bez podlaga
  col = mix(col, c1, smoothstep(0.60, 0.0, dA));   // roza blob
  col = mix(col, c3, smoothstep(0.60, 0.0, dB));   // modra blob
  fragColor = vec4(min(col, vec3(1.0)), 1.0);
}`;
    const sh = (t: number, src: string) => {
      const s = gl.createShader(t)!;
      gl.shaderSource(s, src); gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'position');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uTime = gl.getUniformLocation(prog, 'uTime');
    const uRes = gl.getUniformLocation(prog, 'uRes');
    const hex = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
    gl.uniform3fv(gl.getUniformLocation(prog, 'c1'), hex('#f3c6da'));
    gl.uniform3fv(gl.getUniformLocation(prog, 'c2'), hex('#f4f1ea'));
    gl.uniform3fv(gl.getUniformLocation(prog, 'c3'), hex('#dbf8ff'));
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cvs.width = Math.max(1, Math.floor(innerWidth * dpr));
      cvs.height = Math.max(1, Math.floor(innerHeight * dpr));
      gl.viewport(0, 0, cvs.width, cvs.height);
      gl.uniform2f(uRes, cvs.width, cvs.height);
    };
    window.addEventListener('resize', resize);
    resize();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const SPEED = 0.22;
    let start: number | null = null;
    let anim = 0;
    const frame = (t: number) => {
      if (start === null) start = t;
      gl.uniform1f(uTime, (t - start) * 0.01 * SPEED);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!reduce) anim = requestAnimationFrame(frame);
    };
    anim = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(anim);
      window.removeEventListener('resize', resize);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, []);
  return <canvas ref={ref} className="gradient-ozadje" aria-hidden />;
}

/* Majhen info-gumb za polja z zargonom (DDV, avtorske pravice ...).
   Klik namesto hover, da deluje tudi na dotik (mobile). */
function InfoNamig({ besedilo }: { besedilo: string }) {
  const [odprto, setOdprto] = useState(false);
  return (
    <span className="info-namig">
      <button type="button" className="info-gumb" aria-label="Pojasnilo" aria-expanded={odprto}
        onClick={() => setOdprto(o => !o)}>?</button>
      {odprto && <span className="info-oblacek" role="tooltip">{besedilo}</span>}
    </span>
  );
}

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
    /* neobvezna prijava na obvescanje ob vstopu (locena od anonimne statistike) */
    if (zeliEmail && imamKontakt) posljiKontakt('prijava na obveščanje ob vstopu');
    try { localStorage.setItem('pinart-kalk-pogoji-ok', '1'); } catch { /* ignoriraj */ }
    setPogojiOk(true);
  };

  /* carovnik: en korak naenkrat, fade-in from bottom (nuSchool slog) */
  const editorRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const uvodRef = useRef<HTMLDivElement>(null);
  const uvodVnosRef = useRef<HTMLInputElement>(null);
  const [korak, setKorak] = useState(0);
  const [izbrane, setIzbrane] = useState<Set<string>>(new Set(['cgp']));
  /* postavkovni model: vrstice ponudbe (instance storitev) so vir resnice;
     izbrane (Set sid-jev) drzimo sinhronizirano, ker se nanjo naslanjajo
     kasnejsi koraki (pravice, paketi, raba ...) */
  const [vrstice, setVrstice] = useState<VrsticaP[]>([{ uid: 'cgp', sid: 'cgp', ime: '', kolicina: 1 }]);
  const [razprtaVrstica, setRazprtaVrstica] = useState<string | null>(null);
  const [praviceOdprt, setPraviceOdprt] = useState<string | null>(null);   /* sid odprte Podrobnosti popup pravic */
  const [vlecenaVrstica, setVlecenaVrstica] = useState<string | null>(null);
  /* select "pop" ob kliku na mehurcek — obroc, ki se razsiri (kot na zacetku) */
  const [klikObroc, setKlikObroc] = useState<{ x: number; y: number; d: number; n: number } | null>(null);
  const klikNonce = useRef(0);

  const uskladiIzbrane = (nove: VrsticaP[]) => setIzbrane(new Set(nove.map(l => l.sid)));

  /* klik na orb: prva instanca vedno; kolicinska storitev potem steje kose
     na isti vrstici, imenska pa doda NOVO vrstico (Inovis + Itforyou) */
  const izberiVrstico = (sid: string) => {
    setVrstice(stare => {
      const obstojece = stare.filter(l => l.sid === sid);
      let nove: VrsticaP[];
      if (!obstojece.length) {
        nove = [...stare, { uid: sid, sid, ime: '', kolicina: 1 }];
      } else if (jeKolicinska(sid)) {
        nove = stare.map(l => (l.sid === sid ? { ...l, kolicina: Math.max(1, Math.round(l.kolicina)) + 1 } : l));
      } else {
        let n = obstojece.length + 1;
        while (stare.some(l => l.uid === `${sid}#${n}`)) n++;
        nove = [...stare, { uid: `${sid}#${n}`, sid, ime: '', kolicina: 1 }];
      }
      uskladiIzbrane(nove);
      return nove;
    });
  };
  /* orbova znacka ×N: kolicinski odvzame kos, imenski odstrani zadnjo vrstico */
  const odvzemiStoritev = (sid: string) => {
    setVrstice(stare => {
      const obstojece = stare.filter(l => l.sid === sid);
      if (!obstojece.length) return stare;
      let nove: VrsticaP[];
      if (jeKolicinska(sid)) {
        const l0 = obstojece[0];
        nove = l0.kolicina > 1
          ? stare.map(l => (l.uid === l0.uid ? { ...l, kolicina: l.kolicina - 1 } : l))
          : stare.filter(l => l.uid !== l0.uid);
      } else {
        const zadnja = obstojece[obstojece.length - 1];
        nove = stare.filter(l => l.uid !== zadnja.uid);
      }
      uskladiIzbrane(nove);
      setRazprtaVrstica(r2 => (nove.some(l => l.uid === r2) ? r2 : null));
      return nove;
    });
  };
  /* stevec na kolicinski vrstici (v panelu) */
  const spremeniKolicino = (uid: string, delta: number) => {
    setVrstice(stare => {
      const l = stare.find(x => x.uid === uid);
      if (!l) return stare;
      const q = Math.max(0, Math.round(l.kolicina) + delta);
      const nove = q <= 0 ? stare.filter(x => x.uid !== uid)
        : stare.map(x => (x.uid === uid ? { ...x, kolicina: q } : x));
      uskladiIzbrane(nove);
      setRazprtaVrstica(r2 => (nove.some(x => x.uid === r2) ? r2 : null));
      return nove;
    });
  };
  /* odstrani celo vrstico (× na imenski vrstici) */
  const odstraniVrstico = (uid: string) => {
    setVrstice(stare => {
      const nove = stare.filter(x => x.uid !== uid);
      uskladiIzbrane(nove);
      setRazprtaVrstica(r2 => (r2 === uid ? null : r2));
      return nove;
    });
  };
  const preimenujVrstico = (uid: string, ime: string) =>
    setVrstice(stare => stare.map(x => (x.uid === uid ? { ...x, ime } : x)));
  /* premik vrstice na mesto druge (drag & drop v ponudbi) */
  const premakniVrstico = (odUid: string, naUid: string) => {
    if (odUid === naUid) return;
    setVrstice(stare => {
      const od = stare.find(x => x.uid === odUid);
      if (!od) return stare;
      const brez = stare.filter(x => x.uid !== odUid);
      const ix = brez.findIndex(x => x.uid === naUid);
      if (ix < 0) return stare;
      brez.splice(ix, 0, od);
      return brez;
    });
  };
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
  const [kazemDodaj, setKazemDodaj] = useState(false);          /* iskalnik v panelu (Tvoja ponudba) */
  const [kazemDodajKorak, setKazemDodajKorak] = useState(false); /* iskalnik na vprasalniku — locen, da se ne podvaja s panelom */
  const [kazemUredi, setKazemUredi] = useState(false);       /* modal "dodaj / uredi" storitve */
  const [pogledMreza, setPogledMreza] = useState(false);      /* false = prosti mehurcki, true = urejena mreza po podrocjih */
  const [namigSkrit, setNamigSkrit] = useState(false);        /* uvodni namig zaprt — znova le ob ponastavitvi vprasalnika */
  const [kazemProfil, setKazemProfil] = useState(false);
  /* Profil kot drill-down (meni -> ena "podstran"), ne dolg scroll treh
     razdelkov skupaj — bolj pregledno in mobile-friendly (Tina). */
  const [profilPogled, setProfilPogled] = useState<'meni' | 'moji-podatki' | 'zgodovina' | 'podjetja' | 'podjetje-urejanje' | 'cene-nastavitve' | 'aplikacija' | 'stroski' | 'obvestila' | 'pomoc'>('meni');
  /* katero shranjeno podjetje je trenutno "aktivno" (nalozeno v ponudnik/ddv/...
     zivo stanje) — null, ce urejamo novo, se nikoli shranjeno podjetje. */
  const [aktivnoPodjetje, setAktivnoPodjetje] = useState<string | null>(null);
  const [potrdiOdjavo, setPotrdiOdjavo] = useState(false);
  const [mojeStoritve, setMojeStoritve] = useState<Storitev[]>([]);
  /* Onboarding / osebni set storitev: kaj uporabnik ponuja, postavljeno v
     ospredje. null = se ni onboardan; [] = onboardan brez izbire (pokazi vse). */
  const [mojSet, setMojSet] = useState<string[] | null>(null);
  const [onboardingOdprt, setOnboardingOdprt] = useState(false);
  /* fake-chat uvod (gradi intimo): ime -> izkusnje -> nova/obstojeca -> ime ponudbe */
  const [uvodChat, setUvodChat] = useState(false);
  const [uvodOdhaja, setUvodOdhaja] = useState(false);   /* mehak prehod chat -> izbira (brez preskoka) */
  /* nacin: chat (privzeto) ali klasicen vprasalnik (nastavitve) */
  const [klasicnaOblika, setKlasicnaOblika] = useState(false);
  const [chatKorak, setChatKorak] = useState(0);
  const [urejamKorak, setUrejamKorak] = useState<number | null>(null);   /* urejanje odgovora v mestu (klik na moder oblacek) */
  /* po mehurckih: vprasanja tecejo kot chat NAVZDOL (0 = samo mehurcki, 1 = o stranki, ...) */
  const [poMeh, setPoMeh] = useState(0);
  /* mobile: ponudba je v nogi (FAB kosarica); tap odpre drsni panel */
  const [ponudbaOdprta, setPonudbaOdprta] = useState(false);
  const [imeUporabnika, setImeUporabnika] = useState('');
  /* onboarding opravljen (obstojno) — sprozi se, dokler NI opravljen (ne glede na storitve) */
  const [uvodKoncan, setUvodKoncan] = useState<boolean | null>(null);
  /* dokler nastavitve niso nalozene iz localStorage, NE shranjuj (sicer zacetno prazno stanje prepise storage) */
  const [jeNalozeno, setJeNalozeno] = useState(false);
  const [chatVnos, setChatVnos] = useState('');
  const [chatNova, setChatNova] = useState<boolean | null>(null);
  /* testni sprožilec: ?uvod v URL na silo odpre fake-chat uvod (za ogled tudi
     ko si že onboardana) */
  useEffect(() => {
    try { if (new URL(window.location.href).searchParams.has('uvod')) { setUvodChat(true); setChatKorak(0); } } catch { /* ignore */ }
  }, []);
  /* moderne pisave za urejevalnik ponudbe (best-effort; ce CSP blokira, gladek fallback na sistemsko) */
  useEffect(() => {
    const id = 'cw-editor-fonts';
    if (document.getElementById(id)) return;
    const l = document.createElement('link');
    l.id = id; l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600&family=Roboto:wght@400;500&family=Lora:wght@400;600&display=swap';
    document.head.appendChild(l);
  }, []);
  /* dvojni scrollbar: stran zadaj ima svojega, chat/onboarding pa svojega —
     med njima stran zadaj zaklenemo. */
  useEffect(() => {
    /* onboarding NI zaklenjen — stran se normalno premika (Lenis). Zaklep velja le za modalne overlaye. */
    if (!onboardingOdprt && !kazemProfil && !razprtaVrstica && !kazemUredi && !praviceOdprt) return;
    /* Stran uporablja Lenis smooth-scroll (window.__pinartLenis), ki prestreza wheel
       in skrola ozadje MIMO overflow:hidden. Zato ga ob odprtem oknu ustavimo. */
    const lenis = (window as unknown as { __pinartLenis?: { stop: () => void; start: () => void } }).__pinartLenis;
    lenis?.stop();
    const html = document.documentElement;
    const prejHtml = html.style.overflow;
    const prejBody = document.body.style.overflow;
    html.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => { lenis?.start(); html.style.overflow = prejHtml; document.body.style.overflow = prejBody; };
  }, [onboardingOdprt, kazemProfil, razprtaVrstica, kazemUredi, praviceOdprt]);
  const [obIzbor, setObIzbor] = useState<Set<string>>(new Set());
  /* Poljuben vrstni red storitev (razporejanje z drag-rocajem); prazno = naravni. */
  const [vrstniRed, setVrstniRed] = useState<string[]>([]);
  const dragIndex = useRef<number | null>(null);
  /* Izbrisane (skrite) privzete storitve — ne prikazujejo se, a jih lahko povrnes. */
  const [skrite, setSkrite] = useState<string[]>([]);
  const [novaIme, setNovaIme] = useState('');
  const [novaCena, setNovaCena] = useState('');
  const [valuta, setValuta] = useState('eur');
  const [valutaRocna, setValutaRocna] = useState(false);
  const [ponudnik, setPonudnik] = useState({ ime: '', davcna: '', email: '', telefon: '', naslov: '', trr: '' });
  const [predklic, setPredklic] = useState('+386');
  /* Vec urnih postavk: IT/razvoj ima lahko drugo ceno kot art direkcija
     ali oblikovanje — v ponudbi se izpisejo poimensko. */
  const [urnePostavke, setUrnePostavke] = useState<{ ime: string; cena: string }[]>(
    [{ ime: 'Dodatna dela', cena: '' }]);
  const [avansPct, setAvansPct] = useState('50');
  /* Moji redni mesecni stroski (najem, programska oprema, zavarovanje ...) —
     zaenkrat informativno, za pregled; se NE vpletajo v izracun cene. */
  const [stroski, setStroski] = useState<{ ime: string; znesek: string }[]>([]);
  const [novStrosekIme, setNovStrosekIme] = useState('');
  const [novStrosekZnesek, setNovStrosekZnesek] = useState('');
  const [ddvZavezanec, setDdvZavezanec] = useState(false);
  const [ddvStopnja, setDdvStopnja] = useState('22');
  const [besedilo, setBesedilo] = useState('');
  const [besediloHtml, setBesediloHtml] = useState('');
  const [rocnoBesedilo, setRocnoBesedilo] = useState(false);
  const [tonPonudbe, setTonPonudbe] = useState<TonPonudbe>('toplo');
  const [nogaZnak, setNogaZnak] = useState(true);
  const [nazivPonudbe, setNazivPonudbe] = useState('');
  const [narocnikPonudbe, setNarocnikPonudbe] = useState('');
  const [narocnikEmail, setNarocnikEmail] = useState('');
  const [narocnikOseba, setNarocnikOseba] = useState('');
  const [narocnikNaslov, setNarocnikNaslov] = useState('');
  const [narocnikDavcna, setNarocnikDavcna] = useState('');
  const [dodatniNarocnik, setDodatniNarocnik] = useState(false);
  const [prilagajanjePravic, setPrilagajanjePravic] = useState(false);
  /* Enotna izbira prenosa pravic velja za celo ponudbo; ce je za posamezno
     storitev drugace (npr. ilustracije kot licenca, CGP kot odkup), gre
     samo v opombo besedila — pravi izracun po storitvi je vecji poseg,
     zaenkrat backlog za napredni (placljivi) nivo. */
  const [izjemePravice, setIzjemePravice] = useState('');
  const [prikaziIzjemePravic, setPrikaziIzjemePravic] = useState(false);
  const [obsegPonudbe, setObsegPonudbe] = useState<'kratka' | 'razsirjena'>('razsirjena');
  /* urejevalnik ponudbe: velikost besedila (1-7, privzeto 3) + cilj barve (crke/podlaga) */
  const [velikostBesedila, setVelikostBesedila] = useState(3);
  const [barvaCilj, setBarvaCilj] = useState<'crke' | 'podlaga'>('crke');
  const [oznaciNamig, setOznaciNamig] = useState(false);   /* namig "označi besedilo" ob ukazu brez izbora */
  const [aiKmalu, setAiKmalu] = useState(false);   /* AI pomocnik = zaleden, zaenkrat stub */
  const barvaRef = useRef<HTMLInputElement>(null);  /* custom (mavricna) barva */
  const [kaziUre, setKaziUre] = useState(false);
  const [prenosPravic, setPrenosPravic] = useState<'izkljucni' | 'neizkljucni' | 'licenca'>('izkljucni');
  /* obseg pravic — privzetki dajo faktor 1.0 (glej PRAV_* konstante) */
  const [pravTrajanje, setPravTrajanje] = useState<string>('neomejeno');   /* privzeto sledi znamka/projekt (znamka=trajno, projekt=7 let) */
  const [pravTrajanjeRocno, setPravTrajanjeRocno] = useState(false);       /* uporabnik rocno izbral -> ne prepisuj vec */
  const [pravTeritorij, setPravTeritorij] = useState<string>('slo');
  const [pravDodatniMediji, setPravDodatniMediji] = useState<Set<string>>(new Set());
  const [pravNaklada, setPravNaklada] = useState<string>('do3k');
  const [pravPonatis, setPravPonatis] = useState(true);
  /* pravice po storitvi (tabela): sid -> {prenos, trajanje}; manjka = privzeto iz privzetePraviceZa */
  type PravRec = { prenos: 'izkljucni' | 'neizkljucni' | 'licenca'; trajanje: string; trajLeta?: number; klavzule?: string[]; tantiema?: number };
  const [pravicePoStoritvi, setPravicePoStoritvi] = useState<Record<string, PravRec>>({});
  const [custStev, setCustStev] = useState('3');
  const [custEnota, setCustEnota] = useState<'teden' | 'mesec' | 'leto'>('teden');
  const pravRec = (sid: string): PravRec => pravicePoStoritvi[sid] || privzetePraviceZa(sid);
  const nastaviPravRec = (sid: string, del: Partial<PravRec>) =>
    setPravicePoStoritvi(prev => ({ ...prev, [sid]: { ...pravRec(sid), ...del } }));
  const [obsegOdprt, setObsegOdprt] = useState(false);
  /* pri avtorskih vizualnih delih (ilustracija, fotografija ...) se obseg
     pokaze odprt takoj — Majin nauk: tam so ta vprasanja jedro cene */
  const avtorskeIzbrane = AVTORSKE_STORITVE.some(id => izbrane.has(id));
  const obsegPokazi = obsegOdprt || avtorskeIzbrane;
  /* Rocni prepis samodejnih zneskov (v valuti ponudbe); prazno = samodejno.
     Projektno specificno, zato se NE shranjuje v localStorage. */
  const [rocnePravice, setRocnePravice] = useState('');
  const [rocnaLicenca, setRocnaLicenca] = useState('');
  /* rocni prepis koncne cene posameznega paketa (v valuti ponudbe); prazno
     = samodejni izracun. Kljuc = id paketa. urejamPaket = kateri se ureja. */
  const [rocniPaketi, setRocniPaketi] = useState<Record<string, string>>({});
  const [urejamPaket, setUrejamPaket] = useState<string | null>(null);
  /* ena koncna cena (Priporoceni obseg) namesto treh paketov — na ponudbo */
  const [enaCena, setEnaCena] = useState(false);
  /* zaporedna stevilka ponudbe (npr. 2026-0004) — dodeljena ob prvem prikazu ponudbe;
     veljavnost v dnevih (privzeto 30) se izpise v pogojih */
  const [stevilkaPonudbe, setStevilkaPonudbe] = useState('');
  const [veljavnostDni, setVeljavnostDni] = useState('30');
  const [odgovori, setOdgovori] = useState<Record<string, string>>({});
  const [osnove, setOsnove] = useState<Record<string, number>>({});
  const [profili, setProfili] = useState<Record<string, Profil>>({});
  const [arhiv, setArhiv] = useState<Record<string, ShranjenaP>>({});
  const [podjetja, setPodjetja] = useState<Record<string, PodjetjeProfil>>({});
  const [imePodjetja, setImePodjetja] = useState('');
  const [kopirano, setKopirano] = useState(false);
  /* Postopni prikaz vprasanj (Tinina koreografija): naslov na sredini,
     prvo vprasanje prileti od spodaj, naslednje ob odgovoru ALI po
     nekaj sekundah; stran raste navzdol, nazaj se da poskrolati. */
  const [imeProfila, setImeProfila] = useState('');
  const [leadIme, setLeadIme] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [zeliEmail, setZeliEmail] = useState(false);
  const [kazemDostopnost, setKazemDostopnost] = useState(false);
  /* Valuta ima 16 opcij — na mobilnem je nativen <select> (dolg spustni
     seznam) neroden, zato custom izbirnik: gumb + list od spodaj navzgor
     (isti vzorec deluje na desktopu kot centriran modal). */
  const [kazemValutaIzbira, setKazemValutaIzbira] = useState(false);
  /* Poljubna drzava (prikazni label poleg 6 sirsih regij, ki ostajajo
     edine z dejanskim cenovnim mnozitelijem). */
  const [custDrzavaMoj, setCustDrzavaMoj] = useState('');
  const [custDrzavaNarocnik, setCustDrzavaNarocnik] = useState('');
  const [dodajanjeDrzaveNarocnik, setDodajanjeDrzaveNarocnik] = useState(false);

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
      if (s.custDrzavaMoj) setCustDrzavaMoj(s.custDrzavaMoj);
      if (s.mojeStoritve) setMojeStoritve(s.mojeStoritve);
      if (Array.isArray(s.mojSet)) setMojSet(s.mojSet);
      if (s.imeUporabnika) setImeUporabnika(s.imeUporabnika);
      setUvodKoncan(s.uvodKoncan === true);
      /* obnovi potek onboarding-chata (zgodovina prezivi reload) */
      if (typeof s.chatKorak === 'number') setChatKorak(s.chatKorak);
      if (typeof s.chatNova === 'boolean') setChatNova(s.chatNova);
      if (Array.isArray(s.obIzbor)) setObIzbor(new Set(s.obIzbor));
      if (s.nazivPonudbe) setNazivPonudbe(s.nazivPonudbe);
      if (s.klasicnaOblika) setKlasicnaOblika(true);
      if (s.pogledMreza) setPogledMreza(true);
      if (s.namigSkrit) setNamigSkrit(true);
      if (Array.isArray(s.vrstniRed)) setVrstniRed(s.vrstniRed);
      if (Array.isArray(s.skrite)) setSkrite(s.skrite);
      if (s.valuta) { setValuta(s.valuta); setValutaRocna(true); }
      if (s.ponudnik) {
        setPonudnik({ trr: '', ...s.ponudnik });
        const m = /^(\+\d{1,4})\s*(.*)$/.exec(s.ponudnik.telefon || '');
        if (m) { setPredklic(m[1]); setPonudnik({ trr: '', ...s.ponudnik, telefon: m[2] }); }
      }
      if (s.urnePostavke?.length) setUrnePostavke(s.urnePostavke);
      else if (s.urnaPostavka) setUrnePostavke([{ ime: 'Dodatna dela', cena: String(s.urnaPostavka) }]);
      if (s.avansPct !== undefined) setAvansPct(String(s.avansPct));
      if (s.nogaZnak === false) setNogaZnak(false);
      if (Array.isArray(s.stroski)) setStroski(s.stroski);
      if (s.postavke) setPostavke(s.postavke);
      if (s.predklic) setPredklic(s.predklic);
      if (s.ddvZavezanec) setDdvZavezanec(true);
      if (s.ddvStopnja) setDdvStopnja(String(s.ddvStopnja));
      setProfili(JSON.parse(localStorage.getItem(K_PROFILI) || '{}'));
      setArhiv(JSON.parse(localStorage.getItem(K_ARHIV) || '{}'));
      setPodjetja(JSON.parse(localStorage.getItem(K_PODJETJA) || '{}'));
      const l = JSON.parse(localStorage.getItem(K_LEAD) || 'null');
      if (l) { setLeadIme(l.ime || ''); setLeadEmail(l.email || ''); }
    } catch { /* prazno */ }
    finally { setJeNalozeno(true); }
  }, []);

  useEffect(() => {
    if (!jeNalozeno) return;   /* pocakaj, da se stanje nalozi — sicer prepisemo storage s praznim */
    try {
      localStorage.setItem(K_NAST, JSON.stringify({
        osnove, izkusnje, mojTrg, mojeStoritve, ponudnik, postavke,
        ddvZavezanec, ddvStopnja, predklic, urnePostavke, avansPct,
        mojSet: mojSet ?? undefined,
        vrstniRed: vrstniRed.length ? vrstniRed : undefined,
        skrite: skrite.length ? skrite : undefined,
        nogaZnak: nogaZnak ? undefined : false,
        stroski: stroski.length ? stroski : undefined,
        valuta: valutaRocna ? valuta : undefined,
        custDrzavaMoj: custDrzavaMoj || undefined,
        imeUporabnika: imeUporabnika || undefined,
        klasicnaOblika: klasicnaOblika || undefined,
        pogledMreza: pogledMreza || undefined,
        namigSkrit: namigSkrit || undefined,
        uvodKoncan: uvodKoncan || undefined,
        /* potek onboarding-chata, da zgodovina (vprasanja + odgovori) prezivi reload */
        chatKorak: chatKorak || undefined,
        chatNova: chatNova === null ? undefined : chatNova,
        obIzbor: obIzbor.size ? [...obIzbor] : undefined,
        nazivPonudbe: nazivPonudbe || undefined,
      }));
    } catch { /* ignoriraj */ }
  }, [jeNalozeno, osnove, izkusnje, mojTrg, mojeStoritve, valuta, valutaRocna, ponudnik, postavke, ddvZavezanec, ddvStopnja, predklic, urnePostavke, avansPct, mojSet, vrstniRed, skrite, nogaZnak, stroski, custDrzavaMoj, imeUporabnika, klasicnaOblika, pogledMreza, namigSkrit, uvodKoncan, chatKorak, chatNova, obIzbor, nazivPonudbe]);

  /* valuta sledi trgu narocnika, dokler je uporabnik ne izbere sam */
  useEffect(() => {
    if (!valutaRocna) setValuta(trgNarocnika === 'us' ? 'usd' : 'eur');
  }, [trgNarocnika, valutaRocna]);

  const vseStoritve = useMemo(() => [...STORITVE, ...mojeStoritve], [mojeStoritve]);

  /* Uredi seznam po uporabnikovem vrstnem redu (znane najprej po rangu, ostale
     ohranijo naravni vrstni red). */
  const poVrstnemRedu = (list: Storitev[]) => {
    if (!vrstniRed.length) return list;
    const rank = new Map(vrstniRed.map((id, i) => [id, i] as const));
    const znani = list.filter(s => rank.has(s.id)).sort((a, b) => rank.get(a.id)! - rank.get(b.id)!);
    const ostali = list.filter(s => !rank.has(s.id));
    return [...znani, ...ostali];
  };
  /* Vidne storitve = vse brez izbrisanih (skritih). */
  const vidneStoritve = useMemo(() => vseStoritve.filter(s => !skrite.includes(s.id)), [vseStoritve, skrite]);

  const premakniStoritev = (from: number, to: number) => {
    const ids = poVrstnemRedu(vidneStoritve).map(s => s.id);
    if (from === to || from < 0 || to < 0 || from >= ids.length || to >= ids.length) return;
    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved);
    setVrstniRed(ids);
  };
  const odstraniStoritev = (id: string) => {
    setIzbrane(prev => { const n = new Set(prev); n.delete(id); return n; });
    setVrstice(prev => prev.filter(l => l.sid !== id));
    if (id.startsWith('moja-')) izbrisiStoritev(id);
    else setSkrite(prev => prev.includes(id) ? prev : [...prev, id]);
  };
  const povrniStoritev = (id: string) => setSkrite(prev => prev.filter(x => x !== id));

  /* Prvi obisk (po sprejemu pogojev): odpre se fake-chat uvod, ki nagovori
     po imenu, vpraša izkušnje in ime ponudbe — gradi intimo, preden se
     odpre delovna miza. Področja se izbirajo pozneje (mehurčki), ne tu. */
  useEffect(() => {
    /* sprozi, dokler onboarding NI opravljen (uvodKoncan === false) — ne glede na to,
       ali so storitve ze izbrane; null = se ni nalozeno iz localStorage, pocakamo */
    if (pogojiOk === true && uvodKoncan === false && !uvodChat && !onboardingOdprt) {
      if (klasicnaOblika) { setObIzbor(new Set()); setOnboardingOdprt(true); }
      else { setUvodChat(true); setChatKorak(0); }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pogojiOk, uvodKoncan, klasicnaOblika]);

  /* izkusnje (3 chipi v chatu) */
  const CHAT_IZK: { id: string; crk: string; ime: string; opis: string }[] = [
    { id: 'zacetnik', crk: 'A', ime: 'Šele začenjam', opis: 'gradim portfelj, prve stranke' },
    { id: 'samostojen', crk: 'B', ime: 'Nekaj let izkušenj', opis: 'redne stranke, utečen proces' },
    { id: 'ekspert', crk: 'C', ime: 'Uveljavljeno ime', opis: 'izbiram projekte, premium cene' },
  ];
  /* ob novem koraku chata se STRAN (okno, Lenis) gladko pomakne, tako da je zadnje VPRASANJE
     blizu vrha vidnega polja — vnos in gumb Naprej sta pod njim. Stran ni zaklenjena: scroll
     gor/dol deluje normalno. Prvi korak (0) pustimo pri miru, da ostane uvodni pozdrav viden. */
  useEffect(() => {
    if (!uvodChat || chatKorak === 0) return;
    const el = uvodRef.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    /* kratek timeout: pocakamo, da se nova vsebina koraka postavi (npr. mnozica podrocij);
       timeout (za razliko od rAF) tece tudi v skritem zavihku */
    const t = window.setTimeout(() => {
      const vpr = el.querySelectorAll('.chat-bot');
      const zadnji = vpr[vpr.length - 1] as HTMLElement | undefined;
      if (zadnji) {
        const lenis = (window as unknown as { __pinartLenis?: { scrollTo: (t: number, o?: { immediate?: boolean; force?: boolean }) => void; resize?: () => void } }).__pinartLenis;
        /* ko vsebina naenkrat zraste, ima Lenis se staro (manjso) mejo scrolla -> osvezimo jo,
           sicer scrollTo obtici na stari meji in vprasanje se ne premakne v vidno polje */
        lenis?.resize?.();
        const cilj = Math.max(0, zadnji.getBoundingClientRect().top + window.scrollY - 112);
        if (lenis && typeof lenis.scrollTo === 'function') lenis.scrollTo(cilj, { immediate: reduce, force: true });
        else window.scrollTo({ top: cilj, behavior: reduce ? 'auto' : 'smooth' });
      }
      /* fokus na aktivni vnos brez dodatnega skoka */
      uvodVnosRef.current?.focus({ preventScroll: true });
    }, 60);
    return () => window.clearTimeout(t);
  }, [chatKorak, uvodChat]);
  /* ob vstopu v tekstovni korak uvoda prednapolni polje z obstojeco vrednostjo (za popravke ob skoku nazaj) */
  useEffect(() => {
    if (!uvodChat) return;
    if (chatKorak === 0) setChatVnos(imeUporabnika);
    else if (chatKorak === 6) setChatVnos(nazivPonudbe);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatKorak, uvodChat]);
  const zakljuciUvod = () => {
    /* mojSet iz izbranih podrocij (chat) -> mehurcki se filtrirajo; prazno = vsi */
    const ids = new Set<string>();
    PODROCJA.forEach(p => { if (obIzbor.has(p.id)) p.storitve.forEach(sid => ids.add(sid)); });
    setMojSet([...ids]);
    setChatVnos('');
    setUvodKoncan(true);
    /* ISTA povrsina: ugasnemo "onboarding fazo" -> spodaj se pojavijo mehurcki + panel.
       Nato GLADKO poscrollamo: vprasanja gor (vidna zadnja dva), mehurcki v vidno polje. */
    setUvodChat(false);
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    /* poravnaj na mehurcek "Super! Izberi storitve" (blizu vrha), da sta oba uvodna mehurcka vidna,
       mehurcki storitev pa pod njima. Poklicano dvakrat: hitro + po ustalitvi postavitve (orbi),
       ker prvi klic zna meriti prezgodaj in cilj obtici. */
    const poravnajStoritve = () => {
      const zac = document.getElementById('cw-storitve-zacetek');
      const pl = document.querySelector('.cw .platno0');
      const ref = zac || pl;
      if (!ref) return;
      const cilj = Math.max(0, ref.getBoundingClientRect().top + window.scrollY - (zac ? 96 : 210));
      const lenis = (window as unknown as { __pinartLenis?: { scrollTo: (t: number, o?: { immediate?: boolean; force?: boolean }) => void; resize?: () => void } }).__pinartLenis;
      lenis?.resize?.();
      if (lenis && typeof lenis.scrollTo === 'function') lenis.scrollTo(cilj, { immediate: reduce, force: true });
      else window.scrollTo({ top: cilj, behavior: reduce ? 'auto' : 'smooth' });
    };
    window.setTimeout(poravnajStoritve, 120);
    window.setTimeout(poravnajStoritve, 440);
  };
  const uvodNaprej = () => {
    if (chatKorak === 0) {
      if (chatVnos.trim()) setImeUporabnika(chatVnos.trim());
      setChatVnos('');
      setChatKorak(1);
    } else if (chatKorak === 2) {
      /* podatki podjetja (vkljucno z drzavo) se vpisujejo neposredno v ponudnik/custDrzavaMoj;
         drzava doloci privzet trg -> locen korak za drzavo odpade, gremo na podrocja (4) */
      const t = trgIzDrzave(custDrzavaMoj) || mojTrg || 'si';
      setMojTrg(t); setTrgNarocnika(t);
      setChatKorak(4);
    } else if (chatKorak === 6) {
      if (chatVnos.trim()) setNazivPonudbe(chatVnos.trim());
      setChatVnos('');
      zakljuciUvod();
    }
  };
  /* klik na moj (moder) odgovor -> urejanje V MESTU (ostali odgovori ostanejo, ne izginejo) */
  const uvodUredi = (step: number) => setUrejamKorak(step);
  const uvodUrejevalnik = (step: number) => {
    const zapri = () => setUrejamKorak(null);
    return (
      <div className="chat-jaz">
        <div className="chat-uredi">
          {step === 0 && (
            <div className="cu-vrsta">
              <input autoFocus type="text" value={imeUporabnika} onChange={e => setImeUporabnika(e.target.value)}
                placeholder="Ime ali vzdevek" onKeyDown={e => { if (e.key === 'Enter') zapri(); }} />
              <button type="button" className="gumb" onClick={zapri}>Shrani</button>
            </div>
          )}
          {step === 1 && (
            <div className="cu-opcije">
              {CHAT_IZK.map(o => (
                <button key={o.id} type="button" className={'pill' + (izkusnje === o.id ? ' on' : '')} onClick={() => { setIzkusnje(o.id); zapri(); }}>
                  <span className="pill-fill" aria-hidden /><span className="pill-tekst">{o.ime}</span>
                </button>
              ))}
            </div>
          )}
          {step === 2 && (
            <div className="cu-vrsta cu-vrsta-stolpec">
              <input autoFocus type="text" value={ponudnik.ime} onChange={e => setPonudnik({ ...ponudnik, ime: e.target.value })}
                placeholder="Ime podjetja ali tvoje ime" onKeyDown={e => { if (e.key === 'Enter') zapri(); }} />
              <input type="text" list="cw-drzave-list" value={custDrzavaMoj}
                onChange={e => { const v = e.target.value; setCustDrzavaMoj(v); const t = trgIzDrzave(v); if (t) { setMojTrg(t); setTrgNarocnika(t); } }}
                placeholder="Država (npr. Slovenija)" onKeyDown={e => { if (e.key === 'Enter') zapri(); }} />
              <button type="button" className="gumb" onClick={zapri}>Shrani</button>
            </div>
          )}
          {step === 4 && (
            <>
              <div className="chat-podrocja">
                {PODROCJA.map(p => { const bar = PODROCJE_BARVA[p.id] || '#7C3AED'; const on = obIzbor.has(p.id); return (
                  <button key={p.id} type="button" className={'chip-podrocje' + (on ? ' on' : '')}
                    style={{ borderColor: on ? bar : 'rgba(17,17,17,.12)' }} onClick={() => preklopiPodrocje(p.id)}>
                    <span className="pi-pod" aria-hidden style={{ background: osvetli(bar, 0.8), color: zatemni(bar, 0.55) }}>{PODROCJE_IKONA[p.id]}</span>
                    <b>{p.ime}</b>
                    <span className="chip-kljuk" aria-hidden style={{ borderColor: on ? bar : 'rgba(17,17,17,.2)', background: on ? bar : 'transparent' }}>{on ? '✓' : ''}</span>
                  </button>
                ); })}
              </div>
              <button type="button" className="gumb" style={{ marginTop: '.6rem' }} onClick={zapri}>Končano</button>
            </>
          )}
          {step === 5 && (
            <div className="cu-opcije">
              <button type="button" className={'pill' + (chatNova === true ? ' on' : '')} onClick={() => { setChatNova(true); zapri(); }}>
                <span className="pill-fill" aria-hidden /><span className="pill-tekst">Nova ponudba</span>
              </button>
              <button type="button" className={'pill' + (chatNova === false ? ' on' : '')} onClick={() => { setChatNova(false); zapri(); }}>
                <span className="pill-fill" aria-hidden /><span className="pill-tekst">Obstoječa ponudba</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };
  const uvodOdgovorMehur = (step: number, vsebina: string) => (
    urejamKorak === step ? uvodUrejevalnik(step) : (
      <div className="chat-jaz">
        <button type="button" className="chat-mehur chat-mehur-ured" onClick={() => uvodUredi(step)} title="Klikni za popravek">
          <span>{vsebina}</span>
          <PencilSimple size={13} weight="bold" aria-hidden />
        </button>
      </div>
    )
  );
  const uvodIzberiIzkusnje = (id: string) => { setIzkusnje(id); setChatKorak(2); };
  /* tvoja regija / trg (o tebi) -> privzeta raven cen */
  const uvodPotrdiRegijo = (id: string) => { setMojTrg(id); setTrgNarocnika(id); setChatKorak(4); };
  const uvodPotrdiPodrocja = () => setChatKorak(5);   /* po izbiri podrocij */
  /* preklop podrocja v Moji podatki -> takoj posodobi tudi mojSet (kateri mehurcki so v ospredju) */
  const preklopiPodrocje = (id: string) => {
    const nov = new Set(obIzbor);
    if (nov.has(id)) nov.delete(id); else nov.add(id);
    setObIzbor(nov);
    const ids = new Set<string>();
    PODROCJA.forEach(p => { if (nov.has(p.id)) p.storitve.forEach(sid => ids.add(sid)); });
    setMojSet([...ids]);
  };
  const uvodNovaObstojeca = (nova: boolean) => {
    setChatNova(nova);
    if (nova) { setChatKorak(6); return; }
    /* obstoječa: naloži zadnjo iz arhiva, če obstaja, sicer nadaljuj kot nova */
    const kljuci = Object.keys(arhiv);
    if (kljuci.length) {
      const zadnji = kljuci.sort((a, b) => (arhiv[b].datum || '').localeCompare(arhiv[a].datum || ''))[0];
      naloziIzArhiva(zadnji);
      zakljuciUvod();
    } else {
      setChatKorak(6);
    }
  };

  /* odjavni potrditveni koraki ne smejo lebdeti, ko zapustimo Obvescanja */
  useEffect(() => {
    if (profilPogled !== 'obvestila') setPotrdiOdjavo(false);
  }, [profilPogled]);

  const odpriOnboarding = () => {
    /* preslikaj trenutni set nazaj v podrocja (podrocje je izbrano, ce so vse
       njegove storitve v setu) */
    const set = new Set(mojSet ?? []);
    const areas = PODROCJA.filter(p => p.storitve.length > 0 && p.storitve.every(sid => set.has(sid))).map(p => p.id);
    setObIzbor(new Set(areas));
    setOnboardingOdprt(true);
  };
  const shraniOnboarding = () => {
    const ids = new Set<string>();
    PODROCJA.forEach(p => { if (obIzbor.has(p.id)) p.storitve.forEach(sid => ids.add(sid)); });
    setMojSet([...ids]);
    setUvodKoncan(true);
    setOnboardingOdprt(false);
  };
  const preskociOnboarding = () => {
    setMojSet([]);
    setUvodKoncan(true);
    setOnboardingOdprt(false);
  };

  /* Dodeli naslednjo zaporedno stevilko ponudbe za tekoce leto (format 2026-0004).
     Stevec je persistenten (localStorage); klice se ob prvem prikazu ponudbe. */
  const dodeliStevilkoPonudbe = () => {
    setStevilkaPonudbe(prej => {
      if (prej) return prej;
      const leto = new Date().getFullYear().toString();
      let stevci: Record<string, number> = {};
      try { stevci = JSON.parse(localStorage.getItem(K_STEVEC) || '{}'); } catch { stevci = {}; }
      const nasl = (stevci[leto] || 0) + 1;
      stevci[leto] = nasl;
      try { localStorage.setItem(K_STEVEC, JSON.stringify(stevci)); } catch { /* poln */ }
      return `${leto}-${String(nasl).padStart(4, '0')}`;
    });
  };

  /* Nova ponudba: pocisti VSE za to ponudbo (izbor, odgovori, postavke,
     narocnik, zneski), a OHRANI nastavitve (cene, profil, tvoji podatki). */
  const novaPonudba = () => {
    setIzbrane(new Set());
    setVrstice([]);
    setRazprtaVrstica(null);
    setOdgovori({});
    setPostavke([]);
    setNazivPonudbe('');
    setNarocnikPonudbe('');
    setNarocnikEmail('');
    setNarocnikOseba('');
    setNarocnikNaslov('');
    setNarocnikDavcna('');
    setPromet('');
    setDobicek('');
    setProjPrihodek('');
    setProjDobicek('');
    setPopust('');
    setDodatki(new Set());
    setRaba('znamka');
    setPrenosPravic('izkljucni');
    setRocnePravice('');
    setRocnaLicenca('');
    setIzjemePravice('');
    setPrikaziIzjemePravic(false);
    setRocnoBesedilo(false);
    setEnaCena(false);
    setRocniPaketi({});
    setStevilkaPonudbe('');
    setVeljavnostDni('30');
    /* onboarding vprasanja se NE ponovijo (dogovor): transkript se skrije (chatKorak 0 brez
       uvodChat), pokaze se osebni pozdrav "Hej Tina, <podjetje>" + izbira storitev.
       poMeh 0 = vprasanja ponudbe (narocnik, trg, pravice ...) zacnejo znova za novo ponudbo. */
    setChatKorak(0);
    setChatNova(null);
    setUrejamKorak(null);
    setChatVnos('');
    setPoMeh(0);
    try { sessionStorage.removeItem('pinart-cene-poslano'); } catch { /* prazno */ }
    setKorak(0);
    /* na vrh, da sta pozdrav in izbira storitev takoj v vidnem polju */
    window.setTimeout(() => {
      const lenis = (window as unknown as { __pinartLenis?: { scrollTo: (t: number, o?: { immediate?: boolean }) => void } }).__pinartLenis;
      if (lenis && typeof lenis.scrollTo === 'function') lenis.scrollTo(0, {});
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 80);
  };

  const vfx = VALUTE.find(v => v.id === valuta) ?? VALUTE[0];
  const val = (n: number) => zaokrozi(n * vfx.fx).toLocaleString('sl-SI') + ' ' + vfx.znak;

  const trg = (id: string) => TRGI.find(t => t.id === id) ?? TRGI[0];

  /* privzeta osnova, prilagojena mojemu trgu; rocno nastavljena jo povozi */
  const osnovaZa = (s: Storitev) =>
    osnove[s.id] > 0 ? osnove[s.id] : zaokrozi(s.osnova * trg(mojTrg).lvl);

  const r = useMemo(() => {
    /* linije = vrstice ponudbe z razreseno storitvijo (njen drag-vrstni red) */
    const linije = vrstice
      .map(l => ({ ...l, s: vseStoritve.find(s => s.id === l.sid) }))
      .filter((l): l is VrsticaP & { s: Storitev } => !!l.s);
    if (!linije.length) return null;
    /* sez = unikatne storitve v vrstnem redu prvih pojavitev — nanjo se
       naslanjajo paketi/trajanje/pravice (vsebina je na storitev, ne vrstico) */
    const sez: Storitev[] = [];
    linije.forEach(l => { if (!sez.some(s => s.id === l.sid)) sez.push(l.s); });
    const imeVrstice = (l: VrsticaP & { s: Storitev }) => l.ime.trim() || l.s.ime;

    const p = Number(promet) || 0;
    const d = Number(dobicek) || 0;
    const pp = Number(projPrihodek) || 0;
    const pd = Number(projDobicek) || 0;
    /* projektna raba: velikost podjetja ne napihuje izvedbe — vrednost
       se zajame skozi pravice/tantieme od izkupicka projekta */
    const vel = raba === 'projekt'
      ? { mult: 1, opis: 'projektna raba' }
      : velikostIzPrometa(p);
    const izk = IZKUSNJE.find(i => i.id === izkusnje) ?? IZKUSNJE.find(i => i.id === 'samostojen')!;
    const fakDod = DODATKI.filter(x => dodatki.has(x.id)).reduce((a, x) => a + x.mult, 0);

    /* bogatejsi trg placa vec, revnejsi manj; nikoli pod 70 % in nikoli cez 220 % */
    const trgMult = clamp(trg(trgNarocnika).lvl / trg(mojTrg).lvl, 0.7, 2.2);

    const vsotaStoritev = linije.reduce((a, l) => a + osnovaZa(l.s) * Math.max(1, Math.round(l.kolicina)), 0);
    const vsotaPostavk = postavke.reduce((a, x) => a + x.cena * x.kolicina, 0);
    const mult = izk.mult * vel.mult * trgMult * (1 + fakDod);
    const delo = zaokrozi((vsotaStoritev + vsotaPostavk) * mult);

    /* Razclemba za CSV/racunovodski uvoz — vsota vrstic = delo (priporoceni paket).
       Vsaka vrstica ponudbe s svojim imenom (Inovis, Itforyou) in kolicino. */
    const vrsticeIzvedbe = [
      ...linije.map(l => ({ ime: imeVrstice(l), kolicina: Math.max(1, Math.round(l.kolicina)), cena: zaokrozi(osnovaZa(l.s) * mult) })),
      ...postavke.map(x => ({ ime: x.ime, kolicina: x.kolicina, cena: zaokrozi(x.cena * mult) })),
    ];

    /* pravice: znamka = 1 % letnega dobicka podjetja;
       projekt = 10 % pricakovanega dobicka projekta (ali 2 % prihodka) */
    const surove = raba === 'projekt'
      ? (pd > 0 ? pd * 0.10 : pp * 0.02)
      : (d > 0 ? d * 0.01 : p * 0.002);
    /* praviceBaza = polna vrednost izkljucnega prenosa (kot doslej).
       neizkljucni prenos (delo lahko prodas se komu) = 60 %; samo licenca =
       odkup NI vkljucen v ceno (0), placa se skozi letno licenco. Licenca
       vedno izhaja iz polne baze. */
    /* obseg pravic (trajanje x teritorij x dodatni mediji x naklada) skalira
       bazo NAD varovalko — sirsa raba legitimno preseze 300 % izvedbe.
       Privzetki dajo 1.0, torej brez spreminjanja cena ostane enaka. */
    const teritorijIz = PRAV_TERITORIJ.find(t => t.id === pravTeritorij) ?? PRAV_TERITORIJ[0];
    const medijiIz = PRAV_MEDIJI_DODATNI.filter(m => pravDodatniMediji.has(m.id));
    const nakladaIz = PRAV_NAKLADA.find(n => n.id === pravNaklada) ?? PRAV_NAKLADA[0];
    const teritMedNak = teritorijIz.mult * (1 + medijiIz.reduce((a, m) => a + m.mult, 0)) * nakladaIz.mult;   /* globalni obseg */
    /* pravice PER STORITEV: baza (surove) razdeljena po delezu izvedbe storitve;
       vsaka storitev x svoj mnozitelj trajanja x globalni teritMedNak x faktor prenosa.
       Ce so vse pravice enotne, se vsota ujema z nekdanjim globalnim izracunom (varnostna lastnost). */
    const clampBaseP = clamp(surove, delo * 0.25, delo * 3);
    const izvStoritve = (sid: string) => linije.filter(l => l.sid === sid).reduce((b, l) => b + osnovaZa(l.s) * Math.max(1, Math.round(l.kolicina)), 0) * mult;
    const totStoritevIzv = sez.reduce((a, s) => a + izvStoritve(s.id), 0);
    let praviceBazaSum = 0, praviceAvtoSum = 0, licencaAvtoSum = 0;
    const praviceVrstice = sez.map(s => {
      const rec = pravicePoStoritvi[s.id] || privzetePraviceZa(s.id);
      const trajMult = rec.trajanje === 'custom' && typeof rec.trajLeta === 'number'
        ? trajMultLeta(rec.trajLeta)
        : (PRAV_TRAJANJE.find(t => t.id === rec.trajanje)?.mult ?? 1);
      const klavzMult = 1 + (rec.klavzule || []).reduce((a, k) => a + (KLAVZULE.find(x => x.id === k)?.mult || 0), 0);
      const w = totStoritevIzv > 0 ? izvStoritve(s.id) / totStoritevIzv : 0;
      const sBaza = clampBaseP * w * trajMult * teritMedNak * klavzMult;
      const sAvto = rec.prenos === 'neizkljucni' ? sBaza * 0.6 : rec.prenos === 'licenca' ? 0 : sBaza;
      praviceBazaSum += sBaza; praviceAvtoSum += zaokrozi(sAvto); licencaAvtoSum += zaokrozi(sBaza * 0.2);
      const trajanjeIme = rec.trajanje === 'custom' && typeof rec.trajLeta === 'number'
        ? trajLetaVBesedo(rec.trajLeta)
        : (PRAV_TRAJANJE.find(t => t.id === rec.trajanje)?.ime ?? rec.trajanje);
      return { sid: s.id, ime: s.ime, prenos: rec.prenos, trajanje: rec.trajanje, trajanjeIme, znesek: zaokrozi(sAvto), klavzule: rec.klavzule || [], tantiema: rec.tantiema };
    });
    const praviceBaza = zaokrozi(praviceBazaSum);
    const praviceAvto = praviceAvtoSum;
    const licencaAvto = licencaAvtoSum;
    /* rocni prepis (vnesen v valuti ponudbe) povozi samodejni izracun;
       prazno polje = samodejno. Ce je rocno nastavljen le odkup, licenca
       sledi kot 20 % rocnega zneska. */
    const rocnePravEur = zaokrozi((Number(rocnePravice) || 0) / vfx.fx);
    const rocnaLicEur = zaokrozi((Number(rocnaLicenca) || 0) / vfx.fx);
    const pravice = rocnePravEur > 0 ? rocnePravEur : praviceAvto;
    const licenca = rocnaLicEur > 0 ? rocnaLicEur
      : rocnePravEur > 0 ? zaokrozi(rocnePravEur * 0.2)
        : licencaAvto;
    const tantiemePct = 5; /* alternativa pri projektni rabi: % od prodaje letno */

    const popustPct = clamp(Number(popust) || 0, 0, 50);
    const paketi = PAKETI.map(pk => {
      const redna = zaokrozi(delo * pk.mult) + pravice;
      const samodejno = popustPct ? zaokrozi(redna * (1 - popustPct / 100)) : redna;
      /* rocni prepis (vnesen v valuti ponudbe) povozi izracun; pretvorimo v EUR,
         da val() spet pravilno pomnozi nazaj v prikazano valuto */
      const rocnoEur = zaokrozi((Number(rocniPaketi[pk.id]) || 0) / vfx.fx);
      return { ...pk, redna, skupaj: rocnoEur > 0 ? rocnoEur : samodejno, rocna: rocnoEur > 0 };
    });

    return {
      sez, vel, izk, trgMult, delo, pravice, praviceBaza, licenca, paketi, popustPct,
      linije: linije.map(l => ({ uid: l.uid, sid: l.sid, ime: imeVrstice(l), kolicina: Math.max(1, Math.round(l.kolicina)) })),
      praviceAvto, licencaAvto, praviceRocne: rocnePravEur > 0, licencaRocna: rocnaLicEur > 0,
      vrsticeIzvedbe, raba, tantiemePct, prenos: prenosPravic, praviceVrstice,
      dobicekPodan: raba === 'projekt' ? pd > 0 : d > 0,
      obseg: {
        mult: teritMedNak,
        opis: `${['tisk + promocija', ...medijiIz.map(m => m.ime.toLowerCase())].join(' + ')}, ${teritorijIz.ime}, naklada ${nakladaIz.ime}`,
      },
    };
  }, [vrstice, izkusnje, mojTrg, trgNarocnika, promet, dobicek, dodatki, osnove, popust, postavke, vseStoritve, raba, projPrihodek, projDobicek, prenosPravic, rocnePravice, rocnaLicenca, valuta, pravicePoStoritvi, pravTeritorij, pravDodatniMediji, pravNaklada, rocniPaketi]);

  /* Vprasanja na VRSTICO (ne storitev): dve spletni strani = dva locena
     vprasalnika. Kljuc odgovora = `${uid}:${vprasanje}`; ker je uid prve
     instance enak sid, stari shranjeni odgovori se vedno sedejo. */
  const skupineVprasanj = useMemo(() => {
    const steviloPoSid = vrstice.reduce<Record<string, number>>((a, l) => {
      a[l.sid] = (a[l.sid] || 0) + 1; return a;
    }, {});
    return vrstice
      .map((l, li) => {
        const s = vseStoritve.find(x => x.id === l.sid);
        if (!s) return null;
        const prikaz = l.ime.trim()
          || (steviloPoSid[l.sid] > 1 ? `${s.ime} ${vrstice.filter(x => x.sid === l.sid).indexOf(l) + 1}` : s.ime);
        return {
          id: l.uid,
          sid: l.sid,
          storitev: prikaz,
          /* oznaci, da naj ponudba odgovor pripise konkretni vrstici */
          vecInstanc: steviloPoSid[l.sid] > 1 || !!l.ime.trim(),
          _ix: li,
          vprasanja: (VPRASANJA_PO_STORITVI[l.sid] ?? [])
            .filter(v => !(l.sid === 'web' && v.id === 'ima-cgp' && izbrane.has('cgp')))
            .filter(v => !(l.sid === 'logo' && v.id === 'uporaba' && izbrane.has('cgp')))
            .map(v => ({ ...v, storitev: prikaz, vecInstanc: steviloPoSid[l.sid] > 1 || !!l.ime.trim(), key: `${l.uid}:${v.id}` })),
        };
      })
      .filter((s): s is NonNullable<typeof s> => !!s && s.vprasanja.length > 0);
  }, [vrstice, izbrane, vseStoritve]);

  const aktivnaVprasanja = useMemo(() => skupineVprasanj.flatMap(s => s.vprasanja), [skupineVprasanj]);

  /* Vrstni red (Tinin redesign 2026-07-09): najprej "o tebi" (kdo si, kje
     delas, izkusnje — tri zaporedne slajde), nato "o stranki" (kdo je,
     od kod je), sele nato raba/pravice/posebnosti/cena, na koncu
     predogled besedila in loceno se zakljucek (oblikovanje + posljanje).
     Trg (tvoj in narocnikov) ostaja PRED ceno, ker neposredno vpliva na
     izracun — ce bi bil kasneje, bi se prikazana cena naknadno spremenila. */
  /* Vprasanja o storitvah niso vec svoji koraki — zivijo v podrobnostih
     vrstice na koraku 0 (klik na vrstico v "Tvoja ponudba"). Hitra ponudba
     jih lahko preskoci, podrobna jih odpre po zelji. */
  const prviPoVprasanjih = 1;
  /* osebni koraki (kdo si / kje delas / izkusnje) so odpadli tudi iz klasicne oblike:
     zbere jih onboarding, urejajo se v Moji podatki — vprasanja se NE ponavljajo (dogovor).
     Vrstni red korakov je s tem enak chat obliki. */
  const narocnikStep = prviPoVprasanjih;
  const trgNarocnikaStep = prviPoVprasanjih + 1;
  /* raba (znamka/projekt) je zdaj del Avtorskih pravic; promet naročnika je pri podatkih naročnika */
  const praviceStep = prviPoVprasanjih + 2;
  const posebnostiStep = prviPoVprasanjih + 3;
  const cenaStep = prviPoVprasanjih + 4;
  const ponudbaStep = prviPoVprasanjih + 5;
  const zakljucekStep = prviPoVprasanjih + 6;
  const KORAKOV = zakljucekStep + 1;
  /* (postopni prikaz vprasanj po korakih je odpadel — vprasanja so v
     podrobnostih vrstice, prikazana vsa naenkrat) */

  const ponudba = useMemo(() => {
    if (!r) return '';
    const danes = new Date();
    const veljDni = clamp(Math.round(Number(veljavnostDni)) || 30, 1, 365);
    const velja = new Date(danes.getTime() + veljDni * 864e5);
    const dat = (x: Date) => `${x.getDate()}. ${x.getMonth() + 1}. ${x.getFullYear()}`;
    const crta = '──────────────────────────────────';
    const st = clamp(Number(ddvStopnja) || 22, 0, 30);
    /* zneski z DDV: natancno zaokrozeni, ne na 50 */
    const zDdv = (n: number) =>
      Math.round(n * vfx.fx * (1 + st / 100)).toLocaleString('sl-SI') + ' ' + vfx.znak;

    /* Glava ponudbe je VEDNO prisotna — prazna polja pokazejo oglate
       oklepaje, ki uporabnika pozovejo, naj izpolni razdelek 01. */
    const v: string[] = [];
    const kontakt = [
      ponudnik.davcna.trim() && 'Davčna št.: ' + ponudnik.davcna.trim(),
      ponudnik.trr.trim() && 'TRR: ' + ponudnik.trr.trim(),
      ponudnik.telefon.trim() && 'Tel.: ' + predklic + ' ' + ponudnik.telefon.trim(),
      ponudnik.email.trim(),
    ].filter(Boolean).join(' · ');
    const narocnikKontakt = [
      narocnikDavcna.trim() && 'Davčna št.: ' + narocnikDavcna.trim(),
      narocnikEmail.trim(),
    ].filter(Boolean).join(' · ');
    /* 1) NAGOVOR (na vrhu, po Tininem vrstnem redu) */
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
    /* 2) TVOJI PODATKI (ponudnik) */
    v.push(ponudnik.ime.trim() || '[Ime / podjetje — izpolni v razdelku 01]');
    v.push(ponudnik.naslov.trim() || '[Naslov]');
    v.push(kontakt || '[Davčna št. · TRR · Telefon · Email]');
    v.push('');
    /* 3) NAROČNIK */
    v.push('Naročnik: ' + (narocnikPonudbe.trim() || '[ime podjetja]'));
    if (narocnikOseba.trim()) v.push('Kontaktna oseba: ' + narocnikOseba.trim());
    if (narocnikNaslov.trim()) v.push(narocnikNaslov.trim());
    if (narocnikKontakt) v.push(narocnikKontakt);
    v.push('');
    /* 4) PONUDBA */
    v.push(`PONUDBA${stevilkaPonudbe ? ' št. ' + stevilkaPonudbe : ''}: ${nazivPonudbe.trim() || r.sez.map(s => s.ime).join(', ')}`);
    v.push('Datum: ' + dat(danes) + ' · Ponudba velja do: ' + dat(velja) + ` (${veljDni} dni)`);
    v.push('');
    v.push('OBSEG');
    r.linije.forEach(l => {
      const enota = KOLICINSKE[l.sid];
      v.push(`· ${l.ime}${l.kolicina > 1 ? ` — ${l.kolicina} ${enota || 'kosov'}` : ''}`);
    });
    postavke.forEach(x => v.push(`· ${x.ime}${x.enota === 'ura' ? ` — ${x.kolicina} ur` : x.kolicina > 1 ? ' × ' + x.kolicina : ''}`));
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
      /* pri vec instancah iste storitve odgovor pripisemo konkretni vrstici */
      dodatniOdgovori.forEach(vp => v.push(`· ${vp.vecInstanc ? vp.storitev + ' — ' : ''}${vp.label}: ${vp.odgovor}`));
    }
    v.push('');
    v.push(enaCena ? 'CENA IN OBSEG' : 'IZBERITE PAKET');
    v.push('');
    /* cena posamezne storitve (za priporoceni paket) — vsota priceanih vrstic te storitve */
    const cenaStoritve = (sid: string) => r.linije.reduce((a, l, j) =>
      l.sid === sid ? a + (r.vrsticeIzvedbe[j]?.cena || 0) * (r.vrsticeIzvedbe[j]?.kolicina || 1) : a, 0);
    /* ena cena: izpisemo samo Priporoceni obseg kot koncno ceno (brez izbire paketov) */
    (enaCena ? [r.paketi[1]] : r.paketi).forEach((p, idx) => {
      const i = enaCena ? 1 : idx;
      v.push(`${enaCena ? 'CENA' : p.ime.toUpperCase()}  ·  ${val(p.skupaj)}${ddvZavezanec ? `  (z DDV ${zDdv(p.skupaj)})` : ''}`);
      const vecStoritev = r.sez.length > 1;
      /* razsirjena + PRIPOROCENI paket: specifikacija cen je vpisana ob vsaki storitvi (ne locen razdelek) */
      const kaziCene = obsegPonudbe === 'razsirjena' && i === 1;
      r.sez.forEach(s => {
        const [jedro = [], nadgradnja = [], vrh = []] = ALINEJE_PAKETOV[s.id] ?? [];
        const alineje = [...jedro, ...(i >= 1 ? nadgradnja : []), ...(i >= 2 ? vrh : [])];
        const cenaPripis = kaziCene ? `  —  ${val(cenaStoritve(s.id))}` : '';
        if (!alineje.length) { v.push(`  · ${s.ime}${cenaPripis}: izvedba po dogovorjenem obsegu`); return; }
        if (vecStoritev || kaziCene) v.push(`  ${s.ime}${cenaPripis}`);
        alineje.forEach(a => v.push(`  · ${a}`));
      });
      postavke.forEach((x, xi) => {
        const cenaX = kaziCene ? (r.vrsticeIzvedbe[r.linije.length + xi]?.cena || 0) * x.kolicina : 0;
        v.push(`  · ${x.ime}${x.enota === 'ura' ? ` — ${x.kolicina} ur` : x.kolicina > 1 ? ' × ' + x.kolicina : ''}${cenaX ? `  —  ${val(cenaX)}` : ''}`);
      });
      v.push(`  · ${POPRAVKI_PAKETA[i]}`);
      if (kaziCene) {
        v.push(`  · Skupaj izvedba: ${val(r.delo)}`);
        if (r.prenos === 'licenca')
          v.push(`  · Avtorske pravice: prek letne licence ${val(r.licenca)} / leto (odkup ni vključen)`);
        else
          v.push(`  · Avtorske pravice (${r.prenos === 'neizkljucni' ? 'neizključni' : 'enkratni'} prenos): ${val(r.pravice)}`);
      }
      v.push('');
    });
    v.push(crta);
    if (r.popustPct) {
      v.push(enaCena
        ? `V ceni je že upoštevan ${r.popustPct} % popust (redna cena: ${val(r.paketi[1].redna)}).`
        : `V cenah je že upoštevan ${r.popustPct} % popust (redna cena paketa Priporočeni: ${val(r.paketi[1].redna)}).`);
      v.push('');
    }
    /* Razsirjena ponudba: cenik in okviri takoj za paketi (kot v njenih
       pravih ponudbah), ne na dnu, kjer se izgubijo. */
    if (obsegPonudbe === 'razsirjena') {
      const cur = (n: number) => Math.round(n * vfx.fx).toLocaleString('sl-SI') + ' ' + vfx.znak;
      /* specifikacija cen je zdaj vpisana v priporocenem paketu zgoraj (ne locen razdelek) */
      /* Ura-osnova (kot v njenih pravih ponudbah): PRIVZETO SKRITA (value-based
         pozicioniranje); prikaze se le, ko jo vklopi s stikalom. */
      const urnaZaOceno = urnePostavke.map(u => Math.round(Number(u.cena)) || 0).find(n => n > 0) || 0;
      if (kaziUre && urnaZaOceno > 0) {
        const ur = Math.round((r.delo * vfx.fx) / urnaZaOceno / 5) * 5;
        if (ur > 0) v.push(`Cena izvedbe temelji na okvirni oceni cca ${ur} delovnih ur po ${urnaZaOceno.toLocaleString('sl-SI')} ${vfx.znak}/uro.`);
      }
      const trajanja = r.sez
        .map(s => TRAJANJE_TEDNOV[s.id])
        .filter((t): t is [number, number] => Boolean(t));
      if (trajanja.length) {
        const od = Math.max(...trajanja.map(t => t[0]));
        const zg = trajanja.length === 1
          ? trajanja[0][1]
          : Math.ceil(trajanja.reduce((a, t) => a + t[1], 0) * 0.8);
        v.push('');
        v.push('PREDVIDEN ČAS IZVEDBE');
        v.push(`${od}–${zg} ${tedniBeseda(zg)} od potrditve vsebin in gradiv; točen terminski načrt uskladimo ob potrditvi.`);
      }
      if (r.sez.some(s => s.id === 'web')) {
        v.push('');
        v.push('VZDRŽEVANJE (po dogovoru)');
        v.push(`· vzdrževanje spletne strani (posodobitve, varnostne kopije, 1 ura dela): ${cur(100)} / mesec`);
        v.push(`· gostovanje in sistemske naročnine: ${cur(30)} / mesec`);
        v.push('· pogodba za 12 mesecev; dodatne ure po urni postavki');
      }
      const moznosti = r.sez.flatMap(s => DODATNE_MOZNOSTI[s.id] ?? []);
      if (moznosti.length) {
        v.push('');
        v.push('DODATNE MOŽNOSTI (po dogovoru)');
        moznosti.forEach(m =>
          v.push(`· ${m.ime}: + ${cur(m.min)}${m.max ? ' do ' + cur(m.max) : ''}`));
      }
      v.push('');
    }
    /* AVTORSKE PRAVICE — po storitvah (razsirjena) + regijski pravni okvir */
    v.push('');
    v.push('AVTORSKE PRAVICE');
    if (obsegPonudbe === 'razsirjena' && r.praviceVrstice.length > 0) {
      r.praviceVrstice.forEach(pv => {
        if (pv.tantiema) {
          v.push(`· ${pv.ime} — prodajni produkt: predujem / minimalna garancija ${val(pv.znesek)} + tantieme ${pv.tantiema} % od neto veleprodaje`);
          v.push('  · predujem je nepovraten in se poračuna s tantiemami; ob prekinitvi pravice revertirajo avtorju; naročnik letno poroča o prodaji');
        } else {
          const vrsta = pv.prenos === 'licenca' ? 'licenca za rabo' : pv.prenos === 'neizkljucni' ? 'neizključni prenos' : 'izključni prenos';
          const zn = pv.prenos === 'licenca' ? 'prek letne licence' : val(pv.znesek);
          v.push(`· ${pv.ime} — ${vrsta}, ${pv.trajanjeIme} (${zn})`);
        }
        pv.klavzule.forEach(kid => { const k = KLAVZULE.find(x => x.id === kid); if (k) v.push(`  · ${k.opis}`); });
      });
    }
    v.push(`· Skupaj vrednost pravic: ${val(r.pravice)}${r.raba === 'projekt' ? `; alternativa: tantieme ${r.tantiemePct} % od prodaje, obračunano letno` : ''}`);
    const rezimEU = ['si', 'west', 'east'].includes(trgNarocnika);
    if (rezimEU) {
      v.push('Skladno s slovenskim in EU pravom (ZASP, DSM 2019): moralne avtorske pravice ostanejo avtorju in se ne prenašajo; nadomestilo je pošteno in sorazmerno; ob širši ali daljši rabi naročnik poroča o izkoriščanju dela.');
    } else if (trgNarocnika === 'us') {
      v.push('Za naročnika iz ZDA/UK: prenos velja izrecno za navedeno rabo; ameriška »work for hire« doktrina ne velja samodejno za zunanjega avtorja; moralne pravice avtor ohrani.');
    } else {
      v.push('Za čezmejno rabo prenos velja izrecno za navedeno rabo in trajanje; širša, daljša ali drugačna raba se dogovori posebej.');
    }
    if (izjemePravice.trim()) v.push(izjemePravice.trim());
    v.push('');
    v.push(ddvZavezanec
      ? `DDV: cene so brez DDV; ob izstavitvi računa se obračuna ${st} % DDV.`
      : 'DDV ni obračunan na podlagi 1. odstavka 94. člena ZDDV-1.');
    v.push('');
    v.push('POGOJI');
    const avans = clamp(Math.round(Number(avansPct)) || 50, 10, 100);
    v.push(`· ${avans} % avans ob potrditvi, preostanek ob predaji`);
    const ure = urnePostavke
      .map(u => ({ ime: (u.ime || '').trim() || 'dodatna dela', cena: Math.round(Number(u.cena)) || 0 }))
      .filter(u => u.cena > 0);
    const ddvPripis = ddvZavezanec ? ' + DDV' : '';
    if (ure.length === 0) {
      v.push('· popravki nad vključenimi krogi: po urni postavki');
    } else if (ure.length === 1) {
      v.push(`· popravki nad vključenimi krogi in dodatna dela: ${ure[0].cena.toLocaleString('sl-SI')} ${vfx.znak}/uro${ddvPripis}`);
    } else {
      v.push('· popravki nad vključenimi krogi in dodatna dela po urnih postavkah:');
      ure.forEach(u => v.push(`· ${u.ime}: ${u.cena.toLocaleString('sl-SI')} ${vfx.znak}/uro${ddvPripis}`));
    }
    v.push('· delo izven dogovorjenega obsega te ponudbe se obravnava kot');
    v.push('  nova, ločena ponudba');
    v.push('· pravice veljajo za navedenega naročnika in navedeno rabo;');
    v.push('  prenos na tretjo osebo ali širša raba se dogovori posebej');
    if (r && r.prenos !== 'licenca') {
      v.push(`· obseg prenosa pravic: ${r.obseg.opis};`);
      v.push('  raba izven tega obsega se licencira posebej');
      if (pravPonatis) {
        v.push('· ob ponatisu oz. novi nakladi se licenca obnovi');
        v.push('  (izhodišče: 50 % prvotne vrednosti pravic)');
      }
      v.push('· izvedeni produkti (digitalne izdaje, aplikacije, licenčni izdelki)');
      v.push('  niso vključeni in se licencirajo ločeno');
    }
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
    if (nogaZnak) {
      v.push('');
      v.push('Pripravljeno s Pinart kalkulatorjem · pinart.si');
    }
    return v.join('\n');
  }, [r, valuta, ponudnik, ddvZavezanec, ddvStopnja, postavke, vfx, predklic, tonPonudbe, aktivnaVprasanja, odgovori, urnePostavke, nazivPonudbe, narocnikPonudbe, narocnikEmail, narocnikOseba, narocnikNaslov, narocnikDavcna, obsegPonudbe, avansPct, kaziUre, nogaZnak, izjemePravice, trgNarocnika, enaCena, stevilkaPonudbe, veljavnostDni]);

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
      /* bolj realen signal: ali je uporabnik cene prilagodil (svoje osnove ali
         rocni znesek pravic/licence) ali pa so privzete */
      const prilagojeno = Object.keys(osnove).length > 0 || Boolean(rocnePravice.trim()) || Boolean(rocnaLicenca.trim());
      (async () => {
        const turnstileToken = await pridobiTurnstileToken();
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
            prilagojeno,
            ...(turnstileToken ? { turnstileToken } : {}),
          }),
        }).catch(() => {});
      })();
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
    setKazemDodaj(false); setKazemDodajKorak(false);
  };

  const dodajSvojo = () => {
    const ime = iskanje.trim();
    if (!ime) return;
    setPostavke(p => [...p, { id: 'svoja-' + p.length, ime, cena: 100, kolicina: 1 }]);
    setIskanje('');
    setKazemDodaj(false); setKazemDodajKorak(false);
  };

  const preklopiEnoto = (id: string) => {
    setPostavke(p => p.map(x => {
      if (x.id !== id) return x;
      const naUro = x.enota !== 'ura';
      return { ...x, enota: naUro ? 'ura' : 'kos', cena: naUro ? 70 : x.cena };
    }));
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
    setVrstice(prev => (prev.some(l => l.sid === id) ? prev : [...prev, { uid: id, sid: id, ime: '', kolicina: 1 }]));
    setNovaIme('');
    setNovaCena('');
  };

  const izbrisiStoritev = (id: string) => {
    setMojeStoritve(m => m.filter(s => s.id !== id));
    setIzbrane(z => { const n = new Set(z); n.delete(id); return n; });
    setVrstice(prev => prev.filter(l => l.sid !== id));
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

  /* ukazi na ZNAKE potrebujejo oznacen tekst; blokovni (H2/P) delujejo na trenutno vrstico */
  const rabiIzbor = new Set(['bold', 'italic', 'underline', 'strikeThrough', 'fontSize', 'foreColor', 'hiliteColor', 'fontName']);
  const oblikuj = (ukaz: string, vrednost?: string) => {
    const sel = typeof window !== 'undefined' ? window.getSelection() : null;
    const prazenIzbor = !sel || sel.isCollapsed || !sel.toString().trim();
    if (rabiIzbor.has(ukaz) && prazenIzbor) { setOznaciNamig(true); return; }
    editorRef.current?.focus();
    document.execCommand(ukaz, false, vrednost);
    sinhronizirajEditor();
  };
  /* velikost besedila po korakih (gor/dol skozi privzeto 3) */
  const velikost = (smer: number) => {
    const nv = Math.min(7, Math.max(1, velikostBesedila + smer));
    setVelikostBesedila(nv);
    oblikuj('fontSize', String(nv));
  };
  /* podnaslov = preklop (ce je vrstica ze podnaslov -> nazaj v navadno) */
  const podnaslovToggle = () => {
    let blok = '';
    try { blok = String(document.queryCommandValue('formatBlock') || '').toLowerCase(); } catch { /* ignore */ }
    oblikuj('formatBlock', blok === 'h2' ? 'p' : 'h2');
  };
  /* barva -> na crke ali podlago (glede na barvaCilj); prazna = odstrani/default */
  const uporabiBarvo = (barva: string) =>
    oblikuj(barvaCilj === 'podlaga' ? 'hiliteColor' : 'foreColor', barva);
  const odstraniBarvo = () =>
    oblikuj(barvaCilj === 'podlaga' ? 'hiliteColor' : 'foreColor', barvaCilj === 'podlaga' ? 'transparent' : '#111111');
  const uporabiPisavo = (font: string) => oblikuj('fontName', font);
  /* ponastavi na samodejno generirano besedilo (razveljavi rocne posege) */
  const ponastaviBesedilo = () => {
    setRocnoBesedilo(false);
    const html = ponudbaVHtml(ponudba);
    setBesedilo(ponudba);
    setBesediloHtml(html);
    if (editorRef.current) editorRef.current.innerHTML = html;
  };
  useEffect(() => {
    if (!oznaciNamig) return;
    const t = setTimeout(() => setOznaciNamig(false), 2400);
    return () => clearTimeout(t);
  }, [oznaciNamig]);

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
    const naziv = nazivPonudbe.trim() || (r ? r.sez.map(s => s.ime).join(', ') : '');
    const doc = `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><title>${escapeHtml(naziv ? 'Ponudba: ' + naziv : 'Ponudba')}</title><style>body{font-family:Arial,sans-serif;max-width:760px;margin:40px auto;line-height:1.55;color:#111}p{margin:0 0 1rem}.offer-vrstica{display:flex;justify-content:space-between;align-items:baseline;gap:1.5rem}.offer-cena{white-space:nowrap;font-weight:700}.offer-podnaslov{font-weight:700;margin:.9rem 0 .4rem}.offer-package{border:1px solid #ccc;padding:12px 14px;margin:10px 0}.offer-package-head{display:flex;justify-content:space-between;align-items:baseline;gap:1rem;margin-bottom:.35rem}.offer-package-head h3{margin:0;font-size:12px;letter-spacing:.14em;text-transform:uppercase}.offer-package-head strong{font-size:20px;white-space:nowrap}ul{padding-left:1.2rem}</style></head><body>${html}</body></html>`;
    const blob = new Blob([doc], { type: 'text/html;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const slug = naziv.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    a.download = slug ? `ponudba-${slug}.html` : 'ponudba-pinart-kalkulator.html';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  };

  /* PDF s podlogo: A4 dokument z glavo (ime podjetja, naziv, datum, akcentna linija)
     in nogo s podatki ponudnika na VSAKI strani (position:fixed se v tisku ponovi).
     Tisk prek skritega iframa + sistemski "Shrani kot PDF" — brez knjiznic, sumniki ok.
     Podatke ponudnika, ki jih podloga ze pokaze, iz telesa odstranimo (ce so nespremenjeni). */
  const prenesiPdf = () => {
    const html = editorRef.current?.innerHTML || besediloHtml || ponudbaVHtml(besedilo);
    const naziv = nazivPonudbe.trim() || (r ? r.sez.map(s => s.ime).join(', ') : '');
    const datum = new Date().toLocaleDateString(locale === 'en' ? 'en-GB' : 'sl-SI', { day: 'numeric', month: 'long', year: 'numeric' });
    /* enaka kontakt vrstica kot v telesu besedila — za dedup in za nogo */
    const kontakt = [
      ponudnik.davcna.trim() && 'Davčna št.: ' + ponudnik.davcna.trim(),
      ponudnik.trr.trim() && 'TRR: ' + ponudnik.trr.trim(),
      ponudnik.telefon.trim() && 'Tel.: ' + predklic + ' ' + ponudnik.telefon.trim(),
      ponudnik.email.trim(),
    ].filter(Boolean).join(' · ');
    const noga = [ponudnik.ime.trim(), ponudnik.naslov.trim(), kontakt].filter(Boolean).join('  ·  ');
    /* iz telesa odstrani odstavke, ki jih podloga ze vsebuje (natancno ujemanje besedila) */
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const podvojeno = new Set([ponudnik.ime.trim(), ponudnik.naslov.trim(), kontakt].filter(Boolean));
    Array.from(tmp.querySelectorAll('p')).slice(0, 12).forEach(p => {
      if (podvojeno.has((p.textContent || '').trim())) p.remove();
    });
    const telo = tmp.innerHTML;
    const doc = `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><title>${escapeHtml(naziv ? 'Ponudba - ' + naziv : 'Ponudba')}</title><style>
      @page { size: A4; margin: 16mm 16mm 20mm; }
      * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      body { font-family: Arial, sans-serif; color: #111; line-height: 1.55; font-size: 10.5pt; margin: 0; padding-bottom: 14mm; }
      .pdf-glava { display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; padding-bottom: 12px; border-bottom: 2px solid #B25476; margin-bottom: 22px; }
      .pdf-znamka { font-family: Georgia, 'Times New Roman', serif; font-size: 21pt; letter-spacing: -.01em; }
      .pdf-meta { text-align: right; font-size: 9pt; color: #444; line-height: 1.45; }
      .pdf-meta b { display: block; font-size: 7.5pt; letter-spacing: .2em; text-transform: uppercase; color: #B25476; margin-bottom: 2px; }
      .pdf-noga { position: fixed; bottom: 0; left: 0; right: 0; border-top: 1px solid #ddd; padding-top: 6px; font-size: 8pt; color: #444; text-align: center; }
      p { margin: 0 0 .85rem }
      .offer-vrstica { display: flex; justify-content: space-between; align-items: baseline; gap: 1.5rem }
      .offer-cena { white-space: nowrap; font-weight: 700 }
      .offer-podnaslov { font-weight: 700; margin: .9rem 0 .4rem }
      .offer-package { border: 1px solid #ccc; padding: 12px 14px; margin: 10px 0; break-inside: avoid; }
      .offer-package-head { display: flex; justify-content: space-between; align-items: baseline; gap: 1rem; margin-bottom: .35rem }
      .offer-package-head h3 { margin: 0; font-size: 9pt; letter-spacing: .14em; text-transform: uppercase }
      .offer-package-head strong { font-size: 15pt; white-space: nowrap }
      ul { padding-left: 1.2rem }
    </style></head><body>
      ${noga ? `<div class="pdf-noga">${escapeHtml(noga)}</div>` : ''}
      <div class="pdf-glava">
        <div class="pdf-znamka">${escapeHtml(ponudnik.ime.trim() || 'Ponudba')}</div>
        <div class="pdf-meta"><b>${escapeHtml((locale === 'en' ? 'Offer' : 'Ponudba') + (stevilkaPonudbe ? ' ' + stevilkaPonudbe : ''))}</b>${naziv ? escapeHtml(naziv) + '<br/>' : ''}${escapeHtml(datum)}</div>
      </div>
      ${telo}
    </body></html>`;
    const okvir = document.createElement('iframe');
    okvir.style.position = 'fixed';
    okvir.style.right = '0'; okvir.style.bottom = '0';
    okvir.style.width = '0'; okvir.style.height = '0'; okvir.style.border = '0';
    document.body.appendChild(okvir);
    const idoc = okvir.contentDocument;
    if (!idoc) { okvir.remove(); return; }
    idoc.open(); idoc.write(doc); idoc.close();
    const pospravi = () => okvir.remove();
    okvir.contentWindow?.addEventListener('afterprint', () => window.setTimeout(pospravi, 200));
    window.setTimeout(pospravi, 120000); /* varovalka, ce afterprint ne pride */
    window.setTimeout(() => { okvir.contentWindow?.focus(); okvir.contentWindow?.print(); }, 200);
  };

  /* Hitro posiljanje: odpre uporabnicin mail program s predizpolnjeno
     zadevo in golim besedilom (mailto ne zna HTML). Pravo posiljanje iz
     orodja (lep HTML email) je vecji poseg za kasneje. */
  const posljiMailto = () => {
    if (!narocnikEmail.trim()) return;
    const text = editorRef.current?.innerText || besedilo;
    const naziv = nazivPonudbe.trim() || (r ? r.sez.map(s => s.ime).join(', ') : '');
    const zadeva = naziv ? `Ponudba: ${naziv}` : 'Ponudba';
    window.location.href = `mailto:${narocnikEmail.trim()}?subject=${encodeURIComponent(zadeva)}&body=${encodeURIComponent(text)}`;
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

  const shraniProfil = () => {
    const ime = imeProfila.trim() || 'Moje cene';
    const nov = { ...profili, [ime]: { osnove, mojTrg, izkusnje, postavke, mojeStoritve } };
    setProfili(nov);
    try { localStorage.setItem(K_PROFILI, JSON.stringify(nov)); } catch { /* poln */ }
    if (imamKontakt) posljiKontakt(`shranjen profil "${ime}"`);
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

  /* ── arhiv ponudb: shrani / naloži / izbriši cel posnetek ─────────── */
  const shraniVArhiv = () => {
    const ime = (nazivPonudbe.trim() || narocnikPonudbe.trim() || (r ? r.sez.map(s => s.ime).join(', ') : 'Ponudba')).slice(0, 60);
    const zapis: ShranjenaP = {
      datum: new Date().toISOString(),
      izbrane: [...izbrane], vrstice,
      odgovori, postavke, raba,
      promet, dobicek, projPrihodek, projDobicek, popust, dodatki: [...dodatki],
      prenosPravic, rocnePravice, rocnaLicenca, izjemePravice: izjemePravice || undefined,
      nazivPonudbe, narocnikPonudbe, obsegPonudbe, tonPonudbe, avansPct,
      kaziUre, nogaZnak, izkusnje, mojTrg, trgNarocnika, valuta, valutaRocna,
      rocnoBesedilo, besediloHtml: rocnoBesedilo ? (editorRef.current?.innerHTML || besediloHtml) : '',
      custDrzavaNarocnik: custDrzavaNarocnik || undefined,
      narocnikEmail: narocnikEmail || undefined,
      narocnikOseba: narocnikOseba || undefined,
      narocnikNaslov: narocnikNaslov || undefined,
      narocnikDavcna: narocnikDavcna || undefined,
      enaCena: enaCena || undefined,
      stevilkaPonudbe: stevilkaPonudbe || undefined,
      veljavnostDni: veljavnostDni !== '30' ? veljavnostDni : undefined,
    };
    const nov = { ...arhiv, [ime]: zapis };
    setArhiv(nov);
    try { localStorage.setItem(K_ARHIV, JSON.stringify(nov)); } catch { /* poln */ }
  };
  const naloziIzArhiva = (ime: string) => {
    const p = arhiv[ime];
    if (!p) return;
    setIzbrane(new Set(p.izbrane)); setOdgovori(p.odgovori || {}); setPostavke(p.postavke || []);
    /* stare shranjene ponudbe (brez vrstic) pretvorimo: ena vrstica na storitev */
    setVrstice(p.vrstice && p.vrstice.length
      ? p.vrstice
      : (p.vrstniRedIzbranih || p.izbrane || []).map(sid => ({
        uid: sid, sid,
        ime: p.imenaPostavk?.[sid] || '',
        kolicina: Math.max(1, Math.round(p.kolicine?.[sid] ?? 1)),
      })));
    setRazprtaVrstica(null);
    setRaba(p.raba); setPromet(p.promet); setDobicek(p.dobicek);
    setProjPrihodek(p.projPrihodek); setProjDobicek(p.projDobicek);
    setPopust(p.popust); setDodatki(new Set(p.dodatki || []));
    setPrenosPravic(p.prenosPravic); setRocnePravice(p.rocnePravice); setRocnaLicenca(p.rocnaLicenca);
    setIzjemePravice(p.izjemePravice || '');
    setNazivPonudbe(p.nazivPonudbe); setNarocnikPonudbe(p.narocnikPonudbe);
    setNarocnikEmail(p.narocnikEmail || '');
    setNarocnikOseba(p.narocnikOseba || '');
    setNarocnikNaslov(p.narocnikNaslov || '');
    setNarocnikDavcna(p.narocnikDavcna || '');
    setEnaCena(!!p.enaCena);
    setStevilkaPonudbe(p.stevilkaPonudbe || '');
    setVeljavnostDni(p.veljavnostDni || '30');
    setObsegPonudbe(p.obsegPonudbe); setTonPonudbe(p.tonPonudbe); setAvansPct(p.avansPct);
    setKaziUre(p.kaziUre); setNogaZnak(p.nogaZnak);
    setIzkusnje(p.izkusnje); setMojTrg(p.mojTrg); setTrgNarocnika(p.trgNarocnika);
    setValuta(p.valuta); setValutaRocna(p.valutaRocna);
    setCustDrzavaNarocnik(p.custDrzavaNarocnik || '');
    if (p.rocnoBesedilo && p.besediloHtml) {
      setRocnoBesedilo(true); setBesediloHtml(p.besediloHtml);
      if (editorRef.current) editorRef.current.innerHTML = p.besediloHtml;
    } else {
      setRocnoBesedilo(false);
    }
    /* odpri NA KONCNI PONUDBI (ne na formularju): vse chat faze odklenjene, onboarding zakljucen;
       nazaj na urejanje pride z gumbom "Uredi podatke in vprasanja" */
    setPoMeh(5);
    setUvodKoncan(true); setUvodChat(false);
    setKorak(ponudbaStep);
  };
  const izbrisiIzArhiva = (ime: string) => {
    const nov = { ...arhiv };
    delete nov[ime];
    setArhiv(nov);
    try { localStorage.setItem(K_ARHIV, JSON.stringify(nov)); } catch { /* poln */ }
  };

  /* ── moja podjetja: vec identitet podjetja (ime/davcna/DDV/urne postavke) ──
     Seznam poimenovanih podjetij + drill-down v urejanje enega. Klik na
     podjetje ga naloze kot "aktivno" (zivo stanje ponudnik/ddv/...), da
     ponudbe takoj uporabljajo njegove podatke — ni jih treba vsakic pisati. */
  const shraniPodPodjetjem = (ime: string) => {
    const zapis: PodjetjeProfil = { ponudnik, predklic, ddvZavezanec, ddvStopnja, avansPct, urnePostavke };
    const nov = { ...podjetja, [ime]: zapis };
    setPodjetja(nov);
    try { localStorage.setItem(K_PODJETJA, JSON.stringify(nov)); } catch { /* poln */ }
  };
  const naloziPodjetje = (ime: string) => {
    const p = podjetja[ime];
    if (!p) return;
    setPonudnik(p.ponudnik); setPredklic(p.predklic);
    setDdvZavezanec(p.ddvZavezanec); setDdvStopnja(p.ddvStopnja); setAvansPct(p.avansPct);
    setUrnePostavke(p.urnePostavke);
  };
  const odpriPodjetje = (ime: string) => {
    naloziPodjetje(ime);
    setAktivnoPodjetje(ime);
    setProfilPogled('podjetje-urejanje');
  };
  const dodajNovoPodjetje = () => {
    let ime = imePodjetja.trim() || 'Novo podjetje';
    let i = 2;
    while (podjetja[ime]) { ime = `${imePodjetja.trim() || 'Novo podjetje'} (${i})`; i += 1; }
    const prazno: PodjetjeProfil = {
      ponudnik: { ime: '', davcna: '', email: '', telefon: '', naslov: '', trr: '' },
      predklic: '+386', ddvZavezanec: false, ddvStopnja: '22', avansPct: '50', urnePostavke: [{ ime: 'Dodatna dela', cena: '' }],
    };
    const nov = { ...podjetja, [ime]: prazno };
    setPodjetja(nov);
    try { localStorage.setItem(K_PODJETJA, JSON.stringify(nov)); } catch { /* poln */ }
    setImePodjetja('');
    odpriPodjetje(ime);
  };
  const zapriUrejanjePodjetja = () => {
    if (aktivnoPodjetje) shraniPodPodjetjem(aktivnoPodjetje);
    setProfilPogled('podjetja');
  };
  const izbrisiPodjetje = (ime: string) => {
    const nov = { ...podjetja };
    delete nov[ime];
    setPodjetja(nov);
    try { localStorage.setItem(K_PODJETJA, JSON.stringify(nov)); } catch { /* poln */ }
    if (aktivnoPodjetje === ime) { setAktivnoPodjetje(null); setProfilPogled('podjetja'); }
  };
  /* Preklop podjetja neposredno na koraku "Kdo si" (Tina: enkrat pises
     ponudbo kot art agencija, drugic kot tiskarna). Trenutni vnos se pred
     preklopom shrani, da se nic ne izgubi. */
  const shraniTrenutnoPodjetje = () => {
    const ime = aktivnoPodjetje || ponudnik.ime.trim();
    if (ime) shraniPodPodjetjem(ime);
    return ime;
  };
  const preklopiPodjetje = (ime: string) => {
    if (ime === aktivnoPodjetje) return;
    shraniTrenutnoPodjetje();
    naloziPodjetje(ime);
    setAktivnoPodjetje(ime);
  };
  const novoPodjetjeKorak = () => {
    shraniTrenutnoPodjetje();
    setPonudnik({ ime: '', davcna: '', email: '', telefon: '', naslov: '', trr: '' });
    setPredklic('+386'); setDdvZavezanec(false); setDdvStopnja('22'); setAvansPct('50');
    setUrnePostavke([{ ime: 'Dodatna dela', cena: '' }]);
    setAktivnoPodjetje(null);
  };
  /* dokler je neko podjetje aktivno, se vsaka sprememba podatkov sproti
     shrani v njegov zapis — "zapomni si" brez dodatnega klika */
  useEffect(() => {
    if (!aktivnoPodjetje) return;
    const zapis: PodjetjeProfil = { ponudnik, predklic, ddvZavezanec, ddvStopnja, avansPct, urnePostavke };
    setPodjetja(prej => {
      const nov = { ...prej, [aktivnoPodjetje]: zapis };
      try { localStorage.setItem(K_PODJETJA, JSON.stringify(nov)); } catch { /* poln */ }
      return nov;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ponudnik, predklic, ddvZavezanec, ddvStopnja, avansPct, urnePostavke]);

  /* ── moji redni mesecni stroski (informativno, se ne racuna v ceno) ── */
  const dodajStrosek = () => {
    const ime = novStrosekIme.trim();
    if (!ime) return;
    setStroski(s => [...s, { ime, znesek: novStrosekZnesek.trim() || '0' }]);
    setNovStrosekIme(''); setNovStrosekZnesek('');
  };
  const urediStrosek = (i: number, polje: 'ime' | 'znesek', vrednost: string) =>
    setStroski(s => s.map((x, idx) => (idx === i ? { ...x, [polje]: vrednost } : x)));
  const odstraniStrosek = (i: number) => setStroski(s => s.filter((_, idx) => idx !== i));

  /* ── ponastavi vse podatke orodja (danger zone v profilu) ──────────── */
  /* ponastavi vprasalnik: zbrise osebne odgovore uvoda in znova odpre chat (kot prvic),
     ohrani pa shranjena podjetja, cene, arhiv in lastne storitve */
  const ponastaviVprasalnik = () => {
    setUvodKoncan(false);
    setChatKorak(0);
    setChatVnos('');
    setImeUporabnika('');
    setIzkusnje('samostojen');
    setObIzbor(new Set());
    setMojSet(null);
    setCustDrzavaMoj('');
    setChatNova(null);
    setUrejamKorak(null);
    setNamigSkrit(false);
    setKorak(0);
    setKazemProfil(false);
    setUvodChat(true);
  };
  const ponastaviVse = () => {
    if (typeof window === 'undefined') return;
    if (!window.confirm('Izbrišem vse podatke tega orodja (cene, podjetja, zgodovino ponudb, profile)? Tega ni mogoče razveljaviti.')) return;
    try {
      localStorage.removeItem(K_NAST);
      localStorage.removeItem(K_PROFILI);
      localStorage.removeItem(K_ARHIV);
      localStorage.removeItem(K_PODJETJA);
      localStorage.removeItem(K_LEAD);
      localStorage.removeItem('pinart-kalk-pogoji-ok');
    } catch { /* ignoriraj */ }
    window.location.reload();
  };

  /* ── carovnik: navigacija ─────────────────────────────────────────── */
  useEffect(() => {
    setKorak(k => Math.min(k, KORAKOV - 1));
  }, [KORAKOV]);

  const naprej = () => {
    if (korak === 0 && !r) return;
    setKorak(k => Math.min(KORAKOV - 1, k + 1));
  };
  const nazaj = () => {
    /* v chat obliki vprasanja zivijo na koraku 0 (poMeh); iz cene se vrnemo tja, ne na prazne vmesne korake */
    if (!klasicnaOblika && (korak === cenaStep || korak === ponudbaStep)) { setKorak(0); return; }
    setKorak(k => Math.max(0, k - 1));
  };

  /* Preklop chat <-> klasicna oblika s PRESLIKAVO napredka. Brez nje je stran po preklopu
     obtiala na koraku, ki ga druga oblika ne izrise (prazen zaslon, "resil" je le refresh). */
  const preklopiObliko = () => {
    if (!klasicnaOblika) {
      /* chat -> klasicna: poMeh faze prevedemo v ustrezen korak carovnika */
      if (korak === 0) {
        const cilj = poMeh >= 5 ? cenaStep
          : poMeh === 4 ? posebnostiStep
            : poMeh === 3 ? praviceStep
              : poMeh === 2 ? trgNarocnikaStep
                : poMeh === 1 ? narocnikStep
                  : 0;
        setKorak(cilj);
      }
      setUvodChat(false);
      setKlasicnaOblika(true);
    } else {
      /* klasicna -> chat: vmesni koraki zivijo na koraku 0 (poMeh); korak 0, ponudba in
         zakljucek se izrisejo v obeh oblikah in ostanejo */
      if (korak >= narocnikStep && korak <= cenaStep) {
        const m = korak >= cenaStep ? 5
          : korak === posebnostiStep ? 4
            : korak === praviceStep ? 3
              : korak === trgNarocnikaStep ? 2
                : 1;
        setPoMeh(p => Math.max(p, m));
        setKorak(0);
      }
      setKlasicnaOblika(false);
    }
    /* zapri predal, da je sprememba takoj vidna */
    setKazemProfil(false);
    setProfilPogled('meni');
  };

  const naEnter = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    const t = e.target as HTMLElement;
    if (/^(TEXTAREA|SELECT|BUTTON|A)$/.test(t.tagName)) return;
    if (t.closest('.iskalnik') || t.closest('.cene')) return;
    /* urejanje podrobnosti vrstice (ime, vprasanja) ne sme skociti naprej */
    if (t.closest('.vrst0-detajl')) return;
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
    interier:    <Armchair size={19} />,
    arhitektura: <Buildings size={19} />,
    razstava:    <Presentation size={19} />,
    produktni:   <Gift size={19} />,
    uxui:        <Layout size={19} />,
    aplikacija:  <DeviceMobile size={19} />,
    dizajnsistem:<SquaresFour size={19} />,
    smm:         <ShareNetwork size={19} />,
    seo:         <MagnifyingGlass size={19} />,
    email:       <EnvelopeSimple size={19} />,
    pr:          <Newspaper size={19} />,
    video:       <VideoCamera size={19} />,
    motion:      <FilmSlate size={19} />,
    render3d:    <Cube size={19} />,
    strategija:  <Lightbulb size={19} />,
  };
  const ikonaZa = (id: string) => IKONE[id] ?? <Sparkle size={19} />;

  const PODROCJE_IKONA: Record<string, React.ReactNode> = {
    graficno:  <Palette size={22} />,
    prostor:   <Buildings size={22} />,
    splet:     <Browser size={22} />,
    marketing: <Megaphone size={22} />,
    foto:      <Camera size={22} />,
    direkcija: <Compass size={22} />,
  };

  const naslovKoraka = korak === 0 ? 'Kaj boš danes ustvarila?'
    : korak === narocnikStep ? 'Kdo je stranka?'
      : korak === trgNarocnikaStep ? 'Od kod je naročnik?'
        : korak === praviceStep ? 'Avtorske pravice'
          : korak === posebnostiStep ? 'Posebnosti projekta?'
            : korak === cenaStep ? 'Tvoja cena.'
              : korak === ponudbaStep ? 'Tvoja ponudba.'
                : 'Zaključek.';

  const opisKoraka = korak === 0 ? 'Izberi storitve za to ponudbo — eno ali več.'
    : korak === narocnikStep ? 'Vpišeš za vsako ponudbo posebej.'
      : korak === trgNarocnikaStep ? 'Bogatejši trg plača več, revnejši manj. Valuta sledi trgu.'
        : korak === praviceStep ? 'Orodje predlaga znesek, ki ga lahko kadar koli prilagodiš.'
          : korak === posebnostiStep ? 'Vse je neobvezno; pusti prazno in pojdi naprej.'
            : korak === ponudbaStep ? 'Besedilo lahko poljubno urejaš in dopišeš.'
              : korak === zakljucekStep ? 'Kopiraj, pošlji ali shrani ponudbo.'
                : '';

  /* En oblacek storitve (prvi korak). */
  const jeOnboardan = !!(mojSet && mojSet.length);
  /* Vprasanja ene storitve — prikazana v razprti vrstici ponudbe (korak 0).
     Ista logika kot nekdanji vprasalni koraki, le vsa vprasanja naenkrat. */
  const vprasanjaStoritveUI = (skupina: (typeof skupineVprasanj)[number]) => (
    <div className="vprasanja vrstica-vprasanja">
      {skupina.vprasanja.map(vp => (
        <div key={vp.key}>
          <div className="vp">
            <label htmlFor={'cw-vp-' + vp.key}>{vp.label}{vp.vec ? <span className="vec-namig">izbereš lahko več</span> : null}</label>
            {vp.izbire ? (
              <div className="choicegrid">
                {vp.vec && vp.vse ? (() => {
                  const zetoni = (odgovori[vp.key] || '').split(' + ').filter(Boolean);
                  const rocni = zetoni.filter(t => !vp.izbire!.includes(t));
                  const vseIzbrane = vp.izbire!.every(v => zetoni.includes(v));
                  return (
                    <button type="button" className={vseIzbrane ? 'on' : ''}
                      onClick={() => setOdgovori({ ...odgovori, [vp.key]: (vseIzbrane ? rocni : [...vp.izbire!, ...rocni]).join(' + ') })}>
                      <span className={'kljucek' + (vseIzbrane ? ' on' : '')} aria-hidden>{vseIzbrane ? '✓' : ''}</span>Vse
                    </button>
                  );
                })() : null}
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
                      <span className={(vp.vec ? 'kljucek' : 'krogec') + (aktiven ? ' on' : '')} aria-hidden>{vp.vec && aktiven ? '✓' : ''}</span>{vrednost}
                    </button>
                  );
                })}
                {vp.svoje ? (
                  <span className="svoje-vrsta">
                    {vp.id === 'rok' ? <CalendarBlank size={17} aria-hidden style={{ opacity: .7, flex: 'none' }} /> : null}
                    <input
                      id={'cw-vp-' + vp.key + '-svoje'}
                      type="text"
                      className="vp-svoje"
                      placeholder={vp.svoje}
                      aria-label={vp.label + ' (svoj vnos)'}
                      value={(() => {
                        const v = odgovori[vp.key] || '';
                        if (!vp.vec) return vp.izbire.includes(v) ? '' : v;
                        return v.split(' + ').filter(t => t && !vp.izbire!.includes(t)).join(' + ');
                      })()}
                      onChange={e => {
                        if (!vp.vec) { setOdgovori({ ...odgovori, [vp.key]: e.target.value }); return; }
                        const obkljukane = (odgovori[vp.key] || '').split(' + ').filter(t => t && vp.izbire!.includes(t));
                        setOdgovori({ ...odgovori, [vp.key]: [...obkljukane, e.target.value].filter(Boolean).join(' + ') });
                      }}
                    />
                  </span>
                ) : null}
              </div>
            ) : null}
            {skupina.id === 'web' && vp.id === 'ima-cgp'
              && (odgovori[vp.key] || '').includes('novo CGP') && !izbrane.has('cgp') ? (
              <button type="button" className="povezava"
                style={{ marginTop: '.9rem', color: 'var(--accent)', fontWeight: 600 }}
                onClick={() => izberiVrstico('cgp')}>
                + Dodaj CGP k ponudbi (odpre se njen vprašalnik)
              </button>
            ) : null}
            {vp.izbire ? null : skupina.id === 'web' && vp.id === 'kompleksnost' ? (
              <div className="choicegrid">
                {WEB_KOMPLEKSNOST.map(vrednost => (
                  <button
                    key={vrednost}
                    type="button"
                    className={odgovori[vp.key] === vrednost ? 'on' : ''}
                    onClick={() => setOdgovori({ ...odgovori, [vp.key]: vrednost })}
                  >
                    <span className="krogec" aria-hidden />{vrednost}
                  </button>
                ))}
              </div>
            ) : skupina.id === 'web' && vp.id === 'budget' ? (
              <div className="choicegrid">
                {WEB_BUDGETI.map(vrednost => (
                  <button
                    key={vrednost}
                    type="button"
                    className={odgovori[vp.key] === vrednost ? 'on' : ''}
                    onClick={() => setOdgovori({ ...odgovori, [vp.key]: vrednost })}
                  >
                    <span className="krogec" aria-hidden />{vrednost}
                  </button>
                ))}
              </div>
            ) : skupina.id === 'web' && vp.id === 'funkcije' ? (
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
            ) : skupina.id === 'web' && vp.id === 'dodatno' ? (
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
        </div>
      ))}
    </div>
  );

  const izbranaPodrocja = jeOnboardan ? PODROCJA.filter(p => p.storitve.every(sid => mojSet!.includes(sid))) : PODROCJA;
  const mojeVidne = poVrstnemRedu(vidneStoritve.filter(s => s.id.startsWith('moja-')));

  /* Storitve za orbe na koraku 0: njena podrocja + lastne storitve, brez dvojnikov. */
  const orbStoritve = (() => {
    const iz = izbranaPodrocja.flatMap(a => poVrstnemRedu(vidneStoritve.filter(s => a.storitve.includes(s.id))));
    const videni = new Set<string>();
    return [...iz, ...mojeVidne].filter(s => (videni.has(s.id) ? false : (videni.add(s.id), true)));
  })();
  /* mreza po podrocjih (drugi pogled): vsaka storitev v prvem ustreznem podrocju, custom v "Moje" */
  const mrezaSkupine = (() => {
    const seen = new Set<string>();
    const sk = izbranaPodrocja.map(p => ({
      id: p.id, ime: p.ime,
      storitve: poVrstnemRedu(vidneStoritve.filter(s => p.storitve.includes(s.id) && !seen.has(s.id) && (seen.add(s.id), true))),
    }));
    if (mojeVidne.length) sk.push({ id: 'moje', ime: 'Moje storitve', storitve: mojeVidne });
    return sk.filter(g => g.storitve.length > 0);
  })();
  /* Velikost orba pada s stevilom storitev; pod minimum ne gre (mobile skrola). */
  const orbD = orbStoritve.length <= 8 ? 176 : orbStoritve.length <= 14 ? 156 : 138;
  /* mehurcki v pravih vrsticah, razmaknjeni; platno raste s stevilom -> stran scrolla */
  const orbN = orbStoritve.length + 1; /* + "dodaj" */
  /* v chatu (korak 0, po onboardingu, ne klasicna oblika): vprasanja tecejo navzdol */
  const vChatu = korak === 0 && !uvodChat && !klasicnaOblika;
  /* ob prvem prikazu koncne ponudbe (chat: poMeh>=5; klasicno: korak>=ponudbaStep) dodeli stevilko */
  useEffect(() => {
    const naPonudbi = (vChatu && poMeh >= 5) || (klasicnaOblika && korak >= ponudbaStep);
    if (naPonudbi && r && !stevilkaPonudbe) dodeliStevilkoPonudbe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vChatu, poMeh, klasicnaOblika, korak, r, stevilkaPonudbe]);
  /* naslov koraka kot chat oblacek (v chat obliki) */
  const chatVpr = (naslov: string, opis?: string) => (
    <div className="chat-bot chat-vpr">
      <span className="chat-obraz" aria-hidden>{VODICKA_OBRAZ}</span>
      <span className="chat-mehur"><b>{naslov}</b>{opis ? <small>{opis}</small> : null}</span>
    </div>
  );
  /* za mobilni FAB (kosarica): stevilo postavk + okviren skupni znesek */
  const stPostavk = vrstice.length + postavke.length;
  const skupajOkvirno = vrstice.reduce((a, l) => {
    const s = vseStoritve.find(x => x.id === l.sid);
    return s ? a + osnovaZa(s) * Math.max(1, Math.round(l.kolicina)) : a;
  }, 0) + postavke.reduce((a, x) => a + x.cena * x.kolicina, 0);
  /* DDV stopnja za prikaz v panelu/specifikaciji */
  const ddvSt = clamp(Number(ddvStopnja) || 22, 0, 30);
  /* SATASTA (honeycomb) postavitev: vrste se izmenjujejo siroka/ozja (npr. 3-2-3),
     ozje vrste centrirano padejo v vrzeli sirokih -> mehurcki NISO v ravnih navpicnih
     stolpcih, a kompozicija ostane uravnotezena. Pozicije se se dorecejo po formatu. */
  const orbMax = orbN <= 4 ? 2 : orbN <= 14 ? 3 : 4;   /* mehurckov v siroki vrsti */
  const orbRowSizes = (() => {
    /* pakiraj storitve + "dodaj" skupaj; "dodaj" je zadnji element (zadnji mehurcek v zadnji vrsti) */
    const rs: number[] = []; let left = orbN, wide = true;
    while (left > 0) { const s = Math.min(left, wide ? orbMax : orbMax - 1); rs.push(s); left -= s; wide = !wide; }
    return rs;
  })();
  const orbVrstic = orbRowSizes.length;
  const orbRowStart = (() => { const a: number[] = []; let acc = 0; for (const s of orbRowSizes) { a.push(acc); acc += s; } return a; })();
  const orbRowH = Math.round(orbD * 1.02) - 20;   /* vrstice po visini stisnjene za 20px, da vse pride na en ekran */
  const orbStep = 84 / Math.max(orbMax - 1, 1);          /* razmik med sredisci na siroki mrezi (%) */
  const orbPoz = (i: number) => {
    let row = 0; while (row < orbVrstic - 1 && i >= orbRowStart[row + 1]) row++;
    const posInRow = i - orbRowStart[row];
    const cnt = orbRowSizes[row];
    const startX = 50 - ((cnt - 1) * orbStep) / 2;        /* vsako vrsto centriramo -> zamik nastane sam */
    const x = startX + posInRow * orbStep;
    const y = ((row + 0.5) / orbVrstic) * 100;
    return { x: Math.round(Math.min(94, Math.max(6, x)) * 10) / 10, y: Math.round(y * 10) / 10 };
  };
  const prvoIme = (imeUporabnika.trim() || ponudnik.ime.trim()).split(/\s+/)[0];
  const pozdrav = `Hej${prvoIme ? ' ' + prvoIme : ''}!`;
  /* pozdrav ob vrnitvi: ime (z veliko) + podjetje, v imenu katerega pisi ponudbo */
  const imeZaPozdrav = imeUporabnika.trim().split(/\s+/)[0];
  const imeVelika = imeZaPozdrav ? imeZaPozdrav.charAt(0).toUpperCase() + imeZaPozdrav.slice(1) : '';
  const podjetjePozdrav = ponudnik.ime.trim();
  const pozdravVrnitev = 'Hej' + (imeVelika ? ' ' + imeVelika : '') + (podjetjePozdrav ? ', ' + podjetjePozdrav : '!');
  /* prikazno ime vrstice: lastno ime, sicer ime storitve (+ zaporedje pri vec instancah) */
  const prikazVrstice = (l: VrsticaP, s: Storitev) => {
    if (l.ime.trim()) return l.ime.trim();
    const iste = vrstice.filter(x => x.sid === l.sid);
    return iste.length > 1 ? `${s.ime} ${iste.indexOf(l) + 1}` : s.ime;
  };

  /* Deljen header (Pinart KALKULATOR BETA | ✕ zapri  ·  nastavitve + avatar) —
     enak na uvodu, onboardingu in delovni mizi. Cim ozji. */
  const avatarCrka = (imeUporabnika.trim() || ponudnik.ime.trim() || 'T').charAt(0).toUpperCase();
  const glavaUI = () => (
    <>
      <span className="glava-levo">
        <a className="glava-brand" href={localePath(locale, ``)} aria-label="Pinart — domov">
          <span className="glava-pinart">Pinart</span>
          <span className="glava-ime">Kalkulator</span>
          <span className="beta">BETA</span>
        </a>
        <a className="zapri zapri-loceno" href={localePath(locale, `/kalkulator`)} aria-label="Zapri kalkulator">✕ zapri</a>
      </span>
      <span className="glava-desno">
        <button type="button" className="glava-ikona" aria-label={klasicnaOblika ? 'Preklopi na chat pogovor' : 'Preklopi na klasični vprašalnik'}
          title={klasicnaOblika ? 'Prikaz: klasični vprašalnik — klik preklopi na chat' : 'Prikaz: chat pogovor — klik preklopi na klasični vprašalnik'}
          onClick={preklopiObliko}>
          <svg width="18" height="18" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M18.373 10.9403C18.373 10.9403 18.375 10.5295 18.375 10.0651C18.375 6.14531 18.375 4.18543 17.1577 2.96771C15.9403 1.75 13.981 1.75 10.0625 1.75C6.14395 1.75 4.18467 1.75 2.96734 2.96771C1.75 4.18543 1.75 6.14531 1.75 10.0651C1.75 13.9848 1.75 15.9447 2.96734 17.1624C3.98812 18.1835 5.53059 18.3484 8.3125 18.375" stroke="currentColor" strokeWidth="1.3125" strokeLinecap="round"/>
            <path d="M1.75 6.125H18.375" stroke="currentColor" strokeWidth="1.3125" strokeLinejoin="round"/>
            <path d="M5.25 14H6.125M8.75 10.5H13.125M5.25 10.5H6.125" stroke="currentColor" strokeWidth="1.3125" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14.875 16.1875H14.8829" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M19.0505 15.7697C19.1835 15.9562 19.25 16.0495 19.25 16.1875C19.25 16.3255 19.1835 16.4188 19.0505 16.6053C18.4528 17.4434 16.9265 19.25 14.875 19.25C12.8235 19.25 11.2972 17.4434 10.6995 16.6053C10.5665 16.4188 10.5 16.3255 10.5 16.1875C10.5 16.0495 10.5665 15.9562 10.6995 15.7697C11.2972 14.9316 12.8235 13.125 14.875 13.125C16.9265 13.125 18.4528 14.9316 19.0505 15.7697Z" stroke="currentColor" strokeWidth="1.3125"/>
          </svg>
        </button>
        <button type="button" className="glava-ikona" aria-label="Nastavitve aplikacije" title="Nastavitve aplikacije"
          onClick={() => { setKazemProfil(true); setProfilPogled('aplikacija'); }}>
          <SlidersHorizontal size={18} weight="bold" />
        </button>
        <button type="button" className="glava-avatar" aria-label="Profil" title="Profil"
          onClick={() => { setKazemProfil(true); setProfilPogled('meni'); }}>
          {avatarCrka}
        </button>
      </span>
    </>
  );

  /* Blok "dodaj postavko" (iskalnik + seznam) — za ponovno uporabo na koraku
     cene, da lahko dodas dodatek brez vracanja na prvi korak. */
  /* Kontaktni podatki + davek/pogoji + urne postavke — uporabljeno na koraku
     Tvoji podatki IN v profilnem panelu (Moje podjetje), da ju ni treba
     podvajati. */
  const podatkiUI = () => (
    <>
      <div className="kartica">
        <div className="k-naslov">Tvoji podatki <span className="vec">za glavo ponudbe</span></div>
        {Object.keys(podjetja).length > 0 ? (
          <div className="polje" style={{ marginBottom: '1.2rem' }}>
            <label>Ponudbo pišeš kot
              <InfoNamig besedilo="Če delaš za več podjetij (npr. svojo agencijo in tiskarno), tu preklopiš, v čigavem imenu je ponudba. Vsako podjetje si zapomni svoje podatke, DDV, avans in urne postavke. Trenutni vnos se pred preklopom samodejno shrani." />
              <span className="vec">preklop med tvojimi podjetji</span>
            </label>
            <div className="opts">
              {Object.keys(podjetja).map(ime => (
                <button key={ime} type="button"
                  className={'pill' + (aktivnoPodjetje === ime ? ' on' : '')}
                  onClick={() => preklopiPodjetje(ime)}>
                  <span className="pill-fill" aria-hidden />
                  <span className="pill-tekst">{ime}</span>
                </button>
              ))}
              <button type="button" className="pill" onClick={novoPodjetjeKorak}>
                <span className="pill-fill" aria-hidden />
                <span className="pill-tekst">+ Novo podjetje</span>
              </button>
            </div>
          </div>
        ) : ponudnik.ime.trim() ? (
          <p className="hint" style={{ marginTop: 0 }}>
            Pišeš ponudbe za več podjetij?{' '}
            <button type="button" className="povezava" onClick={() => { shraniPodPodjetjem(ponudnik.ime.trim()); setAktivnoPodjetje(ponudnik.ime.trim()); }}>
              Shrani »{ponudnik.ime.trim()}« kot podjetje
            </button>{' '}
            in dodaš lahko še druga — orodje si zapomni vsakega posebej.
          </p>
        ) : null}
        <div className="numgrid">
          <div className="polje">
            <label htmlFor="cw-pime">Ime / podjetje</label>
            <input id="cw-pime" type="text" placeholder="Rdeča kapica d.o.o."
              value={ponudnik.ime} onChange={e => setPonudnik({ ...ponudnik, ime: e.target.value })} />
          </div>
          <div className="polje">
            <label htmlFor="cw-pdavcna">Davčna številka</label>
            <input id="cw-pdavcna" type="text" placeholder="SI98765432"
              value={ponudnik.davcna} onChange={e => setPonudnik({ ...ponudnik, davcna: e.target.value })} />
          </div>
        </div>
        <div className="numgrid">
          <div className="polje">
            <label htmlFor="cw-pemail">Email</label>
            <input id="cw-pemail" type="email" placeholder="kapica@gozd.si"
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
              <input id="cw-ptelefon" type="tel" placeholder="51 234 567"
                value={ponudnik.telefon} onChange={e => setPonudnik({ ...ponudnik, telefon: e.target.value })} />
            </div>
          </div>
        </div>
        <div className="numgrid">
          <div className="polje">
            <label htmlFor="cw-pnaslov">Naslov</label>
            <input id="cw-pnaslov" type="text" placeholder="Gozdna pot 13, 4000 Kranj"
              value={ponudnik.naslov} onChange={e => setPonudnik({ ...ponudnik, naslov: e.target.value })} />
          </div>
          <div className="polje">
            <label htmlFor="cw-ptrr">TRR (bančni račun)</label>
            <input id="cw-ptrr" type="text" placeholder="SI56 1910 0001 2345 678"
              value={ponudnik.trr} onChange={e => setPonudnik({ ...ponudnik, trr: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="kartica">
        <div className="k-naslov">Davek in pogoji</div>
        <div className="numgrid">
          <div className="polje">
            <label htmlFor="cw-ddv">DDV
              <InfoNamig besedilo="Če tvoj letni promet ne presega zakonskega praga, po 94. členu ZDDV-1 nisi zavezanec — na računih ne obračunavaš DDV. Če si zavezanec (presežen prag ali prostovoljna registracija), na ceno dodaš DDV po veljavni stopnji." />
            </label>
            <select id="cw-ddv" value={ddvZavezanec ? 'da' : 'ne'}
              onChange={e => setDdvZavezanec(e.target.value === 'da')}>
              <option value="ne">Nisem zavezanec (94. člen ZDDV-1)</option>
              <option value="da">Sem zavezanec za DDV</option>
            </select>
          </div>
          {ddvZavezanec && (
            <div className="polje">
              <label htmlFor="cw-ddvst">Stopnja DDV (%)</label>
              <input id="cw-ddvst" type="number" min={0} max={30} step={0.5}
                value={ddvStopnja} onChange={e => setDdvStopnja(e.target.value)} />
            </div>
          )}
        </div>
        <div className="numgrid">
          <div className="polje">
            <label htmlFor="cw-avans">Avans ob potrditvi (%)</label>
            <input id="cw-avans" type="number" min={10} max={100} step={5}
              value={avansPct} onChange={e => setAvansPct(e.target.value)} />
          </div>
        </div>
      </div>

    </>
  );

  /* Urne postavke za dodatna dela: zivijo pri "Tvoja cena" (ne vec pri
     kontaktnih podatkih podjetja — Tina: "ni mi to najbolje tam"). */
  const urnePostavkeUI = () => (
    <div className="kartica cena-urna">
      <div className="k-naslov">Urne postavke za dodatna dela <span className="vec">v pogojih ponudbe</span></div>
      {urnePostavke.map((u, i) => (
        <div className="numgrid" key={i}>
          <div className="polje">
            <label htmlFor={`cw-ura-ime-${i}`}>Za kaj</label>
            <input id={`cw-ura-ime-${i}`} type="text" placeholder="npr. Dejan – ilustracija, Andrej – IT"
              value={u.ime}
              onChange={e => setUrnePostavke(urnePostavke.map((x, j) => j === i ? { ...x, ime: e.target.value } : x))} />
          </div>
          <div className="polje">
            <label htmlFor={`cw-ura-${i}`}>Znesek ({vfx.znak}/uro)</label>
            <div style={{ display: 'flex', gap: '.55rem', alignItems: 'center' }}>
              <input id={`cw-ura-${i}`} type="number" min={0} step={5} placeholder="50" style={{ flex: 1 }}
                value={u.cena}
                onChange={e => setUrnePostavke(urnePostavke.map((x, j) => j === i ? { ...x, cena: e.target.value } : x))} />
              {urnePostavke.length > 1 && (
                <button type="button" aria-label={`Odstrani urno postavko ${u.ime || i + 1}`}
                  onClick={() => setUrnePostavke(urnePostavke.filter((_, j) => j !== i))}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'var(--ink)', padding: '.2rem .4rem' }}>×</button>
              )}
            </div>
          </div>
        </div>
      ))}
      <button type="button" className="dodaj-gumb" style={{ marginTop: '1.1rem' }}
        onClick={() => setUrnePostavke([...urnePostavke, { ime: '', cena: '' }])}>
        + Dodaj urno postavko
      </button>
      <p className="hint" style={{ marginTop: '.9rem' }}>
        Napredno: dodaš lahko več postavk — ločena cena za vsakega izvajalca ali tehniko (npr. za agencije, ročna ilustracija drugače kot vektorska). Urejaš tukaj ali v Profil → Moje podjetje.
      </p>
    </div>
  );

  const dodajPostavkoUI = (naslov: string) => (
    <div style={{ marginTop: '1.7rem' }}>
      <div className="skupina-naslov">{naslov}</div>
      <div className="opts">
        <button type="button" className="pill dodaj" onClick={() => setKazemDodajKorak(!kazemDodajKorak)}>
          <span className="pi" aria-hidden><Plus size={19} /></span>
          <span>dodaj postavko<small>dodaten strošek za to ponudbo: font licenca, najem studia, tisk, stock …</small></span>
        </button>
      </div>
      {kazemDodajKorak && (
        <div className="iskalnik">
          <div className="polje">
            <div className="isk-glava">
              <label htmlFor="cw-iskanje2">Poišči ali vpiši svojo postavko</label>
              <button type="button" className="op-edit" style={{ marginTop: 0 }} onClick={() => { setKazemDodajKorak(false); setIskanje(''); }}>✕ Zapri</button>
            </div>
            <input id="cw-iskanje2" placeholder="npr. najem studia"
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
              <input type="number" min={1} step={1} value={x.kolicina} aria-label={(x.enota === 'ura' ? 'Ure' : 'Količina') + ': ' + x.ime} onChange={e => uredi(x.id, 'kolicina', Number(e.target.value) || 1)} />
              <button type="button" className="enota-toggle" onClick={() => preklopiEnoto(x.id)} title="Preklopi enoto (kos / ura)">{x.enota === 'ura' ? 'ur' : 'kos'}</button>
              <input type="number" min={0} step={10} value={x.cena} aria-label={'Cena: ' + x.ime} onChange={e => uredi(x.id, 'cena', Number(e.target.value) || 0)} />
              <span className="enota">{x.enota === 'ura' ? '€/uro' : '€'}</span>
              <button type="button" title="Odstrani" onClick={() => odstrani(x.id)}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="cw" onKeyDown={naEnter}>
      <datalist id="cw-drzave-list">
        {DRZAVE.map(d => <option key={d.ime} value={d.ime} />)}
      </datalist>
      <div className="cw-ozadje" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="blob blob-roza" src="/kalkulator/ozadje/roza.svg" alt="" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="blob blob-modra" src="/kalkulator/ozadje/modra.svg" alt="" />
      </div>
      <style>{`
        .cw { position: relative; z-index: 1; min-height: 100dvh; display: flex; flex-direction: column; color: var(--ink); font-weight: 300; }
        /* animirano ozadje: dva Tinina soft-gradient blob-a krozita in se krizata (fixed, z-index 0 — NIKOLI -1, Safari past) */
        .cw-ozadje { position: fixed; inset: 0; z-index: 0; overflow: hidden; pointer-events: none; background: var(--paper); }
        .cw-ozadje .blob { position: absolute; width: 70vw; max-width: 920px; height: auto; will-change: transform; filter: blur(8px); }
        .cw-ozadje .blob-roza { top: -14vh; left: -10vw; opacity: .92; animation: blobRoza 30s ease-in-out infinite; }
        .cw-ozadje .blob-modra { bottom: -20vh; right: -12vw; opacity: .85; animation: blobModra 34s ease-in-out infinite; }
        @keyframes blobRoza { 0%,100% { transform: translate(0,0) scale(1); } 33% { transform: translate(24vw,16vh) scale(1.12); } 66% { transform: translate(12vw,34vh) scale(.96); } }
        @keyframes blobModra { 0%,100% { transform: translate(0,0) scale(1); } 33% { transform: translate(-20vw,-14vh) scale(1.1); } 66% { transform: translate(-32vw,-6vh) scale(.95); } }
        @media (prefers-reduced-motion: reduce) { .cw-ozadje .blob { animation: none; } }

        .cw .soglasje { position: fixed; inset: 0; z-index: 60; background: rgba(245,242,234,.55); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); display: flex; align-items: center; justify-content: center; padding: 1.5rem; }
        .cw .soglasje-kartica { max-width: 540px; max-height: calc(100dvh - 2.5rem); overflow-y: auto; background: var(--paper); border: 1px solid rgba(17,17,17,.25); border-radius: 16px; padding: clamp(1.6rem, 4vw, 2.6rem); box-shadow: 0 24px 80px rgba(17,17,17,.12); }
        .cw .soglasje-kartica h2 { font-family: var(--font-serif), Didot, serif; font-weight: 500; font-size: clamp(1.7rem, 4.5vw, 2.4rem); line-height: 1.05; margin: 0 0 1.1rem; }
        .cw .soglasje-kartica ul { margin: 0 0 1.8rem; padding-left: 0; list-style: none; }
        .cw .soglasje-kartica li { font-size: 1.02rem; font-weight: 400; line-height: 1.65; color: var(--ink); margin-bottom: .8rem; }
        .cw .soglasje-tocke { margin: 0; }
        .cw .sg-blok { padding: 1.05rem 0; border-top: 1px solid rgba(17,17,17,.14); }
        .cw .sg-blok:first-child { border-top: none; padding-top: .3rem; }
        .cw .sg-blok:last-child { padding-bottom: .5rem; }
        .cw .sg-h { margin: 0 0 .4rem; font-size: .76rem; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: var(--accent); }
        .cw .sg-t { margin: 0; font-size: 1rem; font-weight: 400; line-height: 1.62; color: rgba(17,17,17,.84); }
        .cw .sg-t b { font-weight: 700; color: var(--ink); }
        .cw .sg-alineje { margin: .55rem 0 0; padding-left: 1.2rem; list-style: disc; }
        .cw .sg-alineje li { margin: .22rem 0; font-size: 1rem; font-weight: 600; color: var(--ink); }
        .cw .sg-alineje li::marker { color: var(--accent); }
        .cw .sg-motiv { margin: 1.4rem 0 1.9rem; padding: 1.05rem 1.2rem; background: rgba(178,84,118,.09); border-left: 3px solid var(--accent); border-radius: 0 12px 12px 0; }
        .cw .sg-motiv-ozn { display: block; margin-bottom: .4rem; font-size: .72rem; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--accent); }
        .cw .sg-motiv p { margin: 0; font-size: 1.02rem; font-weight: 400; line-height: 1.6; color: var(--ink); }
        .cw .sg-motiv p b { font-weight: 700; }
        .cw .profil-glava { display: flex; flex-direction: column; margin-bottom: 1.1rem; }
        .cw .profil-glava-zapri { display: flex; justify-content: flex-end; margin-bottom: .9rem; }
        .cw .profil-glava-naslov { display: flex; align-items: center; gap: .6rem; margin: 0; font-family: var(--font-serif), Didot, serif; font-weight: 500; font-size: clamp(1.5rem, 4vw, 2.1rem); }
        .cw .profil-nazaj { flex: none; width: 2.1rem; height: 2.1rem; border-radius: 999px; border: 1px solid var(--ink); background: transparent; color: var(--ink); font-size: 1rem; font-family: inherit; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: background .18s ease, color .18s ease; }
        .cw .profil-nazaj:hover { background: var(--ink); color: var(--paper); }
        .cw .profil-meni { display: flex; flex-direction: column; gap: .6rem; }
        .cw .profil-meni-vrsta { display: flex; align-items: center; gap: 1rem; width: 100%; padding: 1.1rem 1rem; border: 1px solid rgba(17,17,17,.15); border-radius: 14px; background: #FCFBF7; color: var(--ink); font-family: inherit; text-align: left; cursor: pointer; transition: border-color .18s ease, transform .2s cubic-bezier(0.23,1,0.32,1); }
        .cw .profil-meni-vrsta:hover { border-color: var(--ink); transform: translateY(-2px); }
        .cw .profil-meni-vrsta strong { display: block; font-size: 1rem; font-weight: 600; margin-bottom: .2rem; }
        .cw .profil-meni-vrsta small { display: block; font-size: .82rem; font-weight: 400; color: rgba(17,17,17,.6); line-height: 1.4; }
        .cw .profil-meni-vrsta span:not(.pm-puscica) { flex: 1; min-width: 0; }
        .cw .profil-meni-vrsta .pm-puscica { flex: none; font-size: 1.2rem; opacity: .5; }
        .cw .profil-nevarno { margin-top: .5rem; padding: .7rem 0; border: none; background: none; font-family: inherit; font-size: .82rem; font-weight: 600; line-height: 1.5; color: rgba(17,17,17,.4); text-decoration: underline; text-underline-offset: .28em; cursor: pointer; text-align: left; }
        .cw .profil-nevarno:hover { color: #b03030; }
        .cw .pomoc-mail { display: inline-flex; align-items: center; gap: .5rem; font-family: inherit; font-size: 1rem; font-weight: 700; color: var(--ink); text-decoration: none; background: #fff; border: 1px solid rgba(17,17,17,.15); border-radius: 999px; padding: .8rem 1.4rem; box-shadow: 0 2px 8px rgba(17,17,17,.05); transition: transform .2s cubic-bezier(0.23,1,0.32,1), box-shadow .18s ease; }
        .cw .pomoc-mail:hover { transform: translateY(-2px); box-shadow: 0 4px 14px rgba(17,17,17,.09); }
        .cw .odjava-potrdi { padding: .2rem 0; }
        .cw .cene-seznam { display: flex; flex-direction: column; margin-bottom: 1.3rem; }
        .cw .cene-vrsta { display: flex; align-items: center; gap: .55rem; padding: .35rem .3rem; border-radius: 8px; }
        .cw .cene-vrsta:hover { background: rgba(17,17,17,.035); }
        .cw .drag-rocaj { flex: none; display: inline-flex; cursor: grab; color: rgba(17,17,17,.4); }
        .cw .drag-rocaj:active { cursor: grabbing; }
        .cw .cv-ime { flex: 1; min-width: 0; font-size: .96rem; font-weight: 500; color: var(--ink); display: inline-flex; align-items: center; gap: .3rem; }
        .cw .cene-vrsta input { width: 104px; flex: none; text-align: right; font-family: var(--font-sans), system-ui, sans-serif; font-weight: 600; font-size: .96rem; border: none; border-bottom: 1px solid rgba(17,17,17,.2); background: transparent; padding: .4rem .55rem .4rem .3rem; color: var(--ink); }
        .cw .cene-vrsta input:focus { outline: none; border-bottom: 1.5px solid var(--ink); }
        .cw .cv-znak { flex: none; font-size: .9rem; color: rgba(17,17,17,.55); }
        .cw .cene-vrsta .brisi { flex: none; border: none; background: none; cursor: pointer; font-size: 1.1rem; line-height: 1; color: rgba(17,17,17,.4); padding: .1rem .3rem; }
        .cw .cene-vrsta .brisi:hover { color: var(--accent); }
        .cw .cene-skrite { display: flex; flex-wrap: wrap; align-items: center; gap: .45rem; margin: 0 0 1.2rem; }
        .cw .cs-oznaka { font-size: .8rem; font-weight: 600; color: rgba(17,17,17,.55); }
        .cw .cs-chip { font-family: inherit; font-size: .82rem; font-weight: 500; color: var(--ink); background: rgba(17,17,17,.05); border: 1px dashed rgba(17,17,17,.3); border-radius: 999px; padding: .3rem .7rem; cursor: pointer; }
        .cw .cs-chip:hover { border-color: var(--ink); }
        .cw .cene-dodaj { display: flex; gap: .6rem; align-items: center; flex-wrap: wrap; border-top: 1px solid rgba(17,17,17,.12); padding-top: 1.1rem; }
        .cw .cene-dodaj input { border: none; border-bottom: 1px solid rgba(17,17,17,.25); background: transparent; padding: .35rem .2rem; font-family: inherit; font-size: .92rem; color: var(--ink); }
        .cw .cene-dodaj input[type=text] { flex: 1; min-width: 140px; }
        .cw .cene-dodaj input[type=number] { width: 80px; text-align: right; }
        .cw .skupine-storitev { display: flex; flex-direction: column; gap: 1.7rem; }
        .cw .skupine-storitev .kartica.skupina { margin-bottom: 0; max-width: none; }

        /* ── korak 0: orbi (levo) + ziva ponudba (desno) ── */
        .cw .h1-roza-konec .h1-maska:last-of-type .h1-beseda { color: var(--accent); }
        .cw .h1-iskre { width: .9em; height: .75em; fill: var(--accent); margin-left: -.35em; vertical-align: super; }
        .cw .h1-iskre path { animation: iskra 2.6s ease-in-out infinite; }
        .cw .h1-iskre path:nth-child(2) { animation-delay: .5s; }
        .cw .h1-iskre path:nth-child(3) { animation-delay: 1.1s; }
        @keyframes iskra { 0%, 100% { opacity: .3; } 50% { opacity: 1; } }

        .cw .oder0 { display: grid; grid-template-columns: 1.55fr 1fr; gap: clamp(1rem, 2.5vw, 2rem); align-items: stretch; width: min(1240px, 100%); margin-top: clamp(2rem, 5vw, 3.4rem); }
        /* korak 0 = nadaljevanje chatbota: mehurcki-transkript zgoraj, orbi spodaj */
        .cw .chat-izbira { display: flex; flex-direction: column; align-items: flex-start; gap: 1.1rem; width: min(620px, 92%); margin: 0 auto 1.8rem; }
        /* med onboardingom: vsebina centrirana (kot prej), ozja; ko pride ponudba -> siroka miza */
        /* min-height mora upostevati .oder padding (7rem+8rem=15rem), sicer stran vedno prelije
           za ~8.5rem in je drsnik STALNO viden; -15.5rem = tocno se prilega, drsnik le ko je vsebine vec */
        .cw .korak-vsebina.siroko.uvod-faza { max-width: 780px; margin-left: auto; margin-right: auto; padding-right: 0; min-height: calc(100dvh - 15.5rem); display: flex; flex-direction: column; justify-content: center; }
        .cw .uvod-faza .uvod-uvodnik { text-align: center; margin-bottom: 1.2rem; }
        .cw .uvod-faza .uvod-uvodnik .ob-kicker { text-align: center; }
        .cw .uvod-faza .chat-izbira { width: 100%; margin-bottom: 0; }
        .cw .chat-po-meh { margin-top: 1.8rem; }
        /* PRIPRAVA PONUDBE — razsirjen panel/overlay iz desne (isti prostor kot ziva ponudba) */
        .cw .priprava-backdrop { position: fixed; inset: 0; background: rgba(30,18,35,.4); z-index: 55; animation: cwFade .3s ease both; }
        .cw .priprava-overlay { position: fixed; top: 0; right: 0; bottom: 0; width: min(1040px, 96vw); z-index: 60; background: var(--paper); box-shadow: -30px 0 80px rgba(40,25,40,.25); overflow-y: auto; padding: 1.8rem clamp(1.4rem, 4vw, 3rem) 6.5rem; border-radius: 26px 0 0 26px; animation: pripravaVstop .42s cubic-bezier(.2,.8,.3,1) both; }
        @keyframes pripravaVstop { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .cw .priprava-glava { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1.5rem; }
        .cw .priprava-glava .priprava-h { font-family: var(--font-bodoni), serif; font-weight: 500; font-size: clamp(1.9rem, 3.6vw, 2.6rem); margin: .1rem 0 .35rem; }
        .cw .priprava-glava .sub { margin: 0; max-width: 46ch; }
        .cw .priprava-zapri { flex: none; width: 2.6rem; height: 2.6rem; border-radius: 50%; border: 1px solid rgba(17,17,17,.14); background: #fff; font-size: 1.4rem; line-height: 1; color: var(--ink); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: transform .2s ease, background .2s ease; }
        .cw .priprava-zapri:hover { background: var(--ink); color: var(--paper); transform: scale(1.08); }
        @media (prefers-reduced-motion: reduce) { .cw .priprava-overlay, .cw .priprava-backdrop { animation: none; } }
        @media (max-width: 560px) { .cw .priprava-overlay { border-radius: 0; width: 100vw; } }
        /* priprava = samostojna centrirana stran, malo sirsa od ostalih korakov */
        .cw .korak-vsebina.priprava-korak { max-width: 1000px; }
        .cw .priprava-nazaj { display: inline-flex; align-items: center; gap: .4rem; background: rgba(255,255,255,.4); border: 1px solid rgba(17,17,17,.16); color: var(--ink); font-family: inherit; font-weight: 600; font-size: .84rem; cursor: pointer; padding: .5rem .95rem; border-radius: 999px; margin: 0 0 1.3rem; transition: background .18s, border-color .18s; }
        .cw .priprava-nazaj:hover { background: var(--ink); color: var(--paper); border-color: var(--ink); }
        /* v chat obliki: VSA vsebina vprasanj (kartice, naslovi, dodatni stroski, vrstice)
           na SIRINO CHATA in centrirana; chat (transkript) in oder0 (mehurcki) izvzeta */
        /* enaka sirina za vse (obrazci + paketi cen); 620 je bil pretesen za 3 pakete -> 720 */
        .cw .chat-koraki > *:not(.chat):not(.oder0):not(h1):not(.sub-vrsta) { max-width: min(720px, 100%); margin-left: auto; margin-right: auto; }
        .cw .chat-koraki .chat-vpr { margin-top: 2.2rem; margin-bottom: .9rem; }
        .cw .platno0-drs { overflow: visible; min-width: 0; }
        /* mobile + tablica: orbi lahko strlijo cez rob -> platno se pomika vodoravno ZNOTRAJ sebe,
           stran sama pa nima vodoravnega scrolla (ta je lomil glavo/postavitev) */
        @media (max-width: 1200px) { .cw .platno0-drs { overflow-x: auto; -webkit-overflow-scrolling: touch; } }
        .cw .platno0 { position: relative; min-height: 56vh; padding-bottom: 5.5rem; }
        .cw .namig0 { position: absolute; left: 0; right: 0; bottom: .2rem; text-align: center; font-size: .78rem; color: rgba(17,17,17,.45); pointer-events: none; }

        .cw .orb0 { position: absolute; border: none; background: none; cursor: pointer; padding: 0; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: #fff; font-family: inherit; z-index: 1; animation: orb-plavaj var(--dur, 11s) ease-in-out var(--del, 0s) infinite, orb-vstop .7s cubic-bezier(.2,.8,.3,1) var(--vdel, 0s) both; will-change: transform; }
        .cw .orb0:focus-visible { outline: 3px solid var(--ink); outline-offset: 4px; }
        /* enoten CGP videz: ziva sredina -> mehko v prosojno rob, ena bela svetloba zgoraj levo */
        .cw .orb0 .zar0 { position: absolute; inset: -14%; border-radius: 50%; z-index: 0; pointer-events: none; background: radial-gradient(54% 48% at 33% 27%, rgba(255,255,255,.72), rgba(255,255,255,0) 62%), radial-gradient(circle at 50% 52%, var(--o2, #C084FC) 0%, var(--o1, #7C3AED) 46%, transparent 73%); filter: blur(5px); opacity: .96; transition: opacity .3s, filter .3s; }
        .cw .orb0:hover .zar0 { opacity: 1; filter: blur(3px); }
        /* CGP-krogla (inline SVG) — senca + gradient + svetloba vrisani; zapolni orb (senca ~33% okoli) */
        .cw .orb0 .orb0-sfera { position: absolute; top: -22%; left: -22%; width: 144%; height: 144%; z-index: 0; pointer-events: none; }
        .cw .orb0::before { display: none; }  /* SVG krogla ima svojo svetlobo */
        /* Tinini narisani mehurcki: SVG ima svoj gradient/sijaj/ikono/napis vrisan.
           Vidni krog je ~67 % viewBoxa (senca naokrog), zato sliko povecamo, da
           mehurcek zapolni mesto; skrijemo CSS sijaj in odsev. */
        .cw .orb0-foto { background: none; }
        .cw .orb0-foto::before { display: none; }
        .cw .orb0-foto .orb0-svg { position: absolute; top: -24%; left: -24%; width: 148%; height: 148%; z-index: 0; pointer-events: none; -webkit-user-drag: none; user-select: none; }
        .cw .orb0 .orb0-ikona { position: relative; z-index: 1; display: block; margin-bottom: .12rem; filter: drop-shadow(0 1px 2px rgba(35,18,45,.45)); }
        .cw .orb0 .orb0-ikona svg { width: 24px; height: 24px; display: block; }
        .cw .orb0 .orb0-ime { position: relative; z-index: 1; font-weight: 700; font-size: .86rem; line-height: 1.12; padding: 0 1.1em; text-shadow: 0 1px 3px rgba(35,18,45,.5); }
        .cw .orb0 .orb0-cena { position: relative; z-index: 1; font-size: .64rem; font-weight: 600; opacity: .95; margin-top: .18em; text-shadow: 0 1px 2px rgba(35,18,45,.45); }
        .cw .orb0 .kolic0 { position: absolute; top: 8%; right: 8%; z-index: 3; min-width: 1.9em; height: 1.9em; border-radius: 999px; background: #2A2630; color: #fff; font-weight: 800; font-size: .8rem; display: flex; align-items: center; justify-content: center; padding: 0 .4em; border: 2px solid rgba(255,255,255,.5); box-shadow: 0 5px 14px rgba(0,0,0,.28); cursor: pointer; transition: background .15s; }
        .cw .orb0 .kolic0:hover { background: var(--accent); }
        .cw .orb0.orb0-plus { color: rgba(17,17,17,.55); }
        .cw .orb0.orb0-plus::before { display: none; }
        .cw .orb0.orb0-plus .orb0-krog { position: absolute; inset: 4%; border-radius: 50%; border: 1.5px dashed rgba(17,17,17,.4); }
        .cw .orb0.orb0-plus:hover .orb0-krog { border-color: var(--ink); }
        .cw .orb0.orb0-plus .orb0-ime { font-weight: 600; text-shadow: none; font-size: .82rem; }
        /* ── pogled MREZA (kvadratki po podrocjih) ── */
        .cw .mreza0-ovoj { width: min(1240px, 100%); margin-top: clamp(1.4rem, 4vw, 2.6rem); }
        .cw .mreza0 { display: grid; grid-template-columns: repeat(auto-fill, 180px); gap: clamp(1rem, 2.4vw, 1.8rem); justify-content: start; align-items: start; }
        .cw .mreza-skupina { display: flex; flex-direction: column; gap: .7rem; }
        .cw .mreza-naslov { font-size: .78rem; font-weight: 700; letter-spacing: .03em; color: rgba(17,17,17,.6); text-transform: uppercase; padding-left: .15rem; min-height: 1.1rem; }
        .cw .mreza-kvadrati { display: flex; flex-direction: column; gap: .7rem; }
        .cw .mreza-kvadrat { position: relative; display: flex; flex-direction: column; align-items: flex-start; gap: .35rem; text-align: left; padding: .8rem .9rem; border-radius: 18px; border: 1.5px solid rgba(17,17,17,.1); background: #fff; box-shadow: 0 3px 12px rgba(35,18,45,.05); cursor: pointer; font-family: inherit; color: var(--ink); transition: transform .18s cubic-bezier(.34,1.4,.5,1), border-color .18s, box-shadow .18s; }
        .cw .mreza-kvadrat:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(35,18,45,.1); }
        .cw .mreza-kvadrat.on { border-color: var(--mb); box-shadow: 0 6px 18px color-mix(in oklab, var(--mb) 32%, transparent); }
        .cw .mreza-kvadrat .mk-ikona { width: 2.2rem; height: 2.2rem; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; flex: none; }
        .cw .mreza-kvadrat .mk-ikona svg { width: 1.2rem; height: 1.2rem; }
        .cw .mreza-kvadrat .mk-ime { font-weight: 700; font-size: .95rem; line-height: 1.2; }
        .cw .mreza-kvadrat .mk-cena { font-size: .8rem; color: rgba(17,17,17,.55); font-weight: 500; }
        .cw .mreza-kvadrat .mk-kolic { position: absolute; top: .55rem; right: .55rem; min-width: 1.5rem; height: 1.5rem; padding: 0 .4rem; border-radius: 999px; background: var(--ink); color: var(--paper); font-size: .76rem; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; }
        .cw .mreza-prazno { min-height: 5.4rem; pointer-events: none; }
        .cw .mreza-uredi { border-style: dashed; background: transparent; color: rgba(17,17,17,.62); }
        .cw .mreza-uredi .mk-ikona { background: rgba(17,17,17,.06); }
        /* ── modal dodaj / uredi ── */
        .cw .uredi-plosca { width: 100%; max-width: 460px; max-height: min(38rem, 84dvh); display: flex; flex-direction: column; background: var(--paper); border: 1px solid rgba(17,17,17,.18); border-radius: 18px; box-shadow: 0 24px 80px rgba(17,17,17,.16); overflow: hidden; animation: cwVstop .3s cubic-bezier(.16,1,.3,1) both; }
        .cw .detajl-modal { width: 100%; max-width: 620px; max-height: min(44rem, 88dvh); display: flex; flex-direction: column; background: var(--paper); border: 1px solid rgba(17,17,17,.18); border-radius: 18px; box-shadow: 0 24px 80px rgba(17,17,17,.18); overflow: hidden; animation: cwVstop .3s cubic-bezier(.16,1,.3,1) both; }
        .cw .detajl-telo { overflow-y: auto; padding: 1.2rem 1.4rem 1.4rem; display: flex; flex-direction: column; gap: 1.3rem; }
        .cw .detajl-noga { display: flex; align-items: center; gap: 1rem; padding: .95rem 1.4rem; border-top: 1px solid rgba(17,17,17,.1); background: rgba(255,255,255,.45); }
        .cw .detajl-noga .gumb { margin-left: auto; }
        .cw .uredi-telo { overflow-y: auto; padding: 1.1rem 1.35rem 1.5rem; display: flex; flex-direction: column; gap: 1.4rem; }
        .cw .uredi-sekcija { display: flex; flex-direction: column; }
        .cw .uredi-naslov { font-size: .78rem; font-weight: 700; letter-spacing: .03em; text-transform: uppercase; color: rgba(17,17,17,.6); margin-bottom: .7rem; }
        .cw .pogled-preklop { display: flex; gap: .5rem; }
        .cw .pogled-preklop button { flex: 1; padding: .7rem .6rem; border-radius: 12px; border: 1.5px solid rgba(17,17,17,.16); background: #fff; font-family: inherit; font-weight: 600; font-size: .9rem; color: var(--ink); cursor: pointer; transition: border-color .18s, background .18s, color .18s; }
        .cw .pogled-preklop button.on { border-color: var(--ink); background: var(--ink); color: var(--paper); }
        .cw .uredi-dodaj { display: flex; gap: .5rem; align-items: center; flex-wrap: wrap; }
        .cw .uredi-dodaj input[type=text] { flex: 1; min-width: 150px; border: none; border-bottom: 1px solid rgba(17,17,17,.35); background: transparent; padding: .4rem .2rem; font-family: inherit; font-size: .95rem; color: var(--ink); }
        .cw .uredi-dodaj input[type=number] { width: 84px; border: none; border-bottom: 1px solid rgba(17,17,17,.35); background: transparent; padding: .4rem .2rem; font-family: inherit; font-size: .95rem; text-align: right; color: var(--ink); }
        /* select "pop" obroc ob kliku (kot na zacetku) */
        .cw .obroc0 { position: absolute; z-index: 2; border-radius: 50%; border: 3px solid rgba(178,84,118,.55); pointer-events: none; animation: obroc0 .6s ease-out forwards; }
        @keyframes obroc0 { 0% { transform: scale(.62); opacity: .75; } 100% { transform: scale(1.7); opacity: 0; } }
        @media (prefers-reduced-motion: reduce) { .cw .obroc0 { display: none; } }
        /* vstop: mehurcek "pride z zameglenega ozadja v fokus" (samo opacity+blur,
           da ne trci s transform-float); zamaknjeno po indeksu (--vdel) */
        @keyframes orb-vstop { from { opacity: 0; filter: blur(16px); } to { opacity: 1; filter: blur(0); } }
        @keyframes orb-plavaj {
          0% { transform: translate(0, 0); }
          25% { transform: translate(var(--fx, 8px), var(--fy, -10px)) scale(1.04); }
          50% { transform: translate(calc(var(--fx, 8px) * -.6), calc(var(--fy, -10px) * -.7)) scale(.97); }
          75% { transform: translate(calc(var(--fx, 8px) * .4), var(--fy, -10px)) scale(1.02); }
          100% { transform: translate(0, 0); }
        }

        /* AI vodicka: obraz-orb + govorni oblacek */
        .cw .vodicka { position: absolute; top: -1%; left: 44%; z-index: 4; display: flex; align-items: flex-start; pointer-events: none; animation: orb-plavaj 10s ease-in-out -3s infinite; }
        .cw .vodicka-obraz { width: 3.2rem; height: 3.2rem; border-radius: 50%; flex: none; position: relative; z-index: 2; margin: .5rem -.8rem 0 0; background: radial-gradient(58% 48% at 30% 24%, rgba(255,255,255,.92), rgba(255,255,255,0) 62%), conic-gradient(from 210deg, #7C3AED, #EC4899, #F59E0B, #38BDF8, #7C3AED); box-shadow: 0 10px 26px rgba(124,58,237,.32); }
        .cw .vodicka-obraz svg { position: absolute; inset: 0; width: 100%; height: 100%; }
        .cw .vodicka-karta { background: rgba(255,255,255,.78); -webkit-backdrop-filter: blur(18px) saturate(1.3); backdrop-filter: blur(18px) saturate(1.3); border: 1px solid rgba(255,255,255,.75); border-radius: 20px; padding: .85rem 1.25rem .9rem 1.5rem; font-size: .9rem; line-height: 1.5; color: rgba(17,17,17,.62); box-shadow: 0 14px 40px rgba(40,25,40,.10); font-weight: 400; }
        .cw .vodicka-karta b { display: block; color: var(--ink); font-size: .96rem; margin-bottom: .1rem; }

        /* ziva ponudba: steklena kartica */
        .cw .ponudba0 { border-radius: 26px; padding: 1.5rem 1.4rem 5.5rem; display: flex; flex-direction: column; min-height: 0; background: rgba(255,255,255,.72); -webkit-backdrop-filter: blur(22px) saturate(1.4); backdrop-filter: blur(22px) saturate(1.4); border: 1px solid rgba(255,255,255,.75); box-shadow: 0 20px 60px rgba(40,25,40,.10); }
        .cw .ponudba0-glava { display: flex; align-items: center; justify-content: space-between; gap: .8rem; }
        .cw .ponudba0-glava h2 { font-family: var(--font-bodoni), serif; font-weight: 500; font-size: 1.65rem; margin: 0; }
        .cw .ponudba0-chip { background: rgba(255,255,255,.85); border: 1px solid rgba(17,17,17,.12); border-radius: 999px; padding: .28rem .7rem; font-size: .74rem; font-weight: 650; color: rgba(17,17,17,.6); white-space: nowrap; }
        .cw .ponudba0-pod { font-size: .85rem; color: var(--accent); font-weight: 500; margin: .1rem 0 1rem; display: flex; align-items: center; gap: .45rem; }
        .cw .ponudba0-pod::before { content: ""; width: .55rem; height: .55rem; border-radius: 50%; background: var(--accent); opacity: .85; flex: none; }
        .cw .ponudba0-prazno { color: rgba(17,17,17,.5); font-size: .95rem; line-height: 1.55; text-align: center; padding: 1.2rem 0; margin: 0; font-weight: 400; }
        .cw .ponudba0-prazno b { color: rgba(17,17,17,.72); }
        .cw .ponudba0-prazno p { margin: 0; }
        /* empty-state: mapa z enim obrazom (odebeljene linije, slog chatbot ikonce), animirana */
        .cw .prazno-mapa { width: min(200px, 58%); margin: 0 auto .5rem; }
        .cw .prazno-mapa svg { width: 100%; height: auto; display: block; overflow: visible; }
        .cw .prazno-mapa .mapa-telo { animation: mapaLebdi 3.4s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        .cw .prazno-mapa .mapa-senca { animation: mapaSenca 3.4s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        .cw .prazno-mapa .mapa-oci { animation: mapaMezik 4.6s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        @keyframes mapaLebdi { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-7px) rotate(-1.6deg); } }
        @keyframes mapaSenca { 0%, 100% { transform: scaleX(1); opacity: .55; } 50% { transform: scaleX(.8); opacity: .3; } }
        @keyframes mapaMezik { 0%, 88%, 100% { transform: scaleY(1); } 94% { transform: scaleY(.35); } }
        @media (prefers-reduced-motion: reduce) { .cw .prazno-mapa .mapa-telo, .cw .prazno-mapa .mapa-senca, .cw .prazno-mapa .mapa-oci { animation: none; } }

        .cw .vrstice0 { display: flex; flex-direction: column; }
        .cw .vrst0 { display: grid; grid-template-columns: auto 1fr auto auto auto; align-items: center; gap: .55rem; padding: .65rem 0; border-bottom: 1px solid rgba(17,17,17,.12); }
        .cw .vrst0-prazno { width: 0; }
        .cw .vrst0.vlecem { opacity: .35; }
        .cw .rocica0 { cursor: grab; color: rgba(17,17,17,.4); font-size: .9rem; line-height: 1; padding: .3rem .15rem; border-radius: 6px; user-select: none; -webkit-user-select: none; }
        .cw .rocica0:hover { color: var(--ink); background: rgba(17,17,17,.08); }
        .cw .vrst0-ime { border: none; background: none; padding: 0; text-align: left; font-family: inherit; font-weight: 650; font-size: .95rem; color: var(--ink); cursor: pointer; min-width: 0; }
        .cw .vrst0-ime:hover { color: var(--accent); }
        .cw .vrst0-ime small { display: block; font-weight: 500; color: rgba(17,17,17,.42); font-size: .72rem; margin-top: .12rem; }
        .cw .vrst0-ime small.odg { color: var(--accent); }
        .cw .stepper0 { display: flex; align-items: center; gap: .3rem; }
        .cw .stepper0 button { width: 1.55rem; height: 1.55rem; border-radius: 50%; border: 1px solid rgba(17,17,17,.15); background: transparent; color: rgba(17,17,17,.6); cursor: pointer; font-size: .95rem; line-height: 1; display: flex; align-items: center; justify-content: center; transition: border-color .15s, color .15s; }
        .cw .stepper0 button:hover { border-color: var(--ink); color: var(--ink); }
        .cw .stepper0 b { min-width: 1.3em; text-align: center; font-weight: 700; font-variant-numeric: tabular-nums; font-size: .92rem; }
        .cw .vrst0-x { width: 1.55rem; height: 1.55rem; border-radius: 50%; border: 1px solid rgba(17,17,17,.15); background: transparent; color: rgba(17,17,17,.55); cursor: pointer; font-size: .95rem; line-height: 1; display: flex; align-items: center; justify-content: center; transition: border-color .15s, color .15s; }
        .cw .vrst0-x:hover { border-color: var(--accent); color: var(--accent); }
        .cw .vrst0-cena { font-family: var(--font-bodoni), serif; font-size: 1.06rem; font-weight: 600; font-variant-numeric: tabular-nums; white-space: nowrap; }

        .cw .vrst0-detajl { background: rgba(255,255,255,.85); border: 1px solid rgba(17,17,17,.1); border-radius: 14px; padding: 1rem 1.1rem; margin: .5rem 0 .9rem; animation: detajlDrsni .42s cubic-bezier(.16,1,.3,1) both; }
        @keyframes detajlDrsni { from { opacity: 0; transform: translateX(26px); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .cw .vrst0-detajl { animation: none; } }
        .cw .vrst0-detajl .polje input { font-weight: 650; }
        .cw .vrst0-brez { font-size: .85rem; color: rgba(17,17,17,.5); margin: .4rem 0 0; font-weight: 400; }
        .cw .vrstica-vprasanja { margin-top: 1rem; display: flex; flex-direction: column; gap: 1rem; }

        /* ── fake-chat uvod (gradi intimo) ── */
        .cw .uvod-chat { position: fixed; inset: 0; z-index: 60; overflow-y: auto; display: flex; flex-direction: column; background: var(--paper); animation: cwVstop .5s cubic-bezier(.16,1,.3,1) both; }
        /* mehak odhod: chat zbledi in se rahlo dvigne, spodaj se miza animira noter (brez preskoka) */
        .cw .uvod-chat.odhaja { animation: uvodOdhod .6s cubic-bezier(.5,0,.2,1) forwards; pointer-events: none; }
        @keyframes uvodOdhod { to { opacity: 0; transform: translateY(-24px); } }
        @media (prefers-reduced-motion: reduce) { .cw .uvod-chat { animation: none; } .cw .uvod-chat.odhaja { animation: none; opacity: 0; } }
        /* cim ozji header povsod */
        .cw .glava-ozka { padding-top: .45rem; padding-bottom: .45rem; }
        /* chat header v toku (ne fixed) -> uvod-oder se lahko vertikalno centrira pod njim */
        .cw .uvod-chat .glava-ozka { position: static; }
        /* ozadje uvoda: Tinina gradient blob-a + OKRASNI mehurcki (brez ikon/teksta),
           pocasi lebdijo in se malce premikajo po povrsini */
        .cw .uvod-ozadje { position: absolute; inset: 0; z-index: 0; overflow: hidden; pointer-events: none; }
        .cw .uvod-ozadje .blob { position: absolute; width: 58vw; max-width: 760px; height: auto; filter: blur(8px); }
        .cw .uvod-ozadje .blob-roza { top: -16vh; left: -12vw; opacity: .8; animation: blobRoza 30s ease-in-out infinite; }
        .cw .uvod-ozadje .blob-modra { bottom: -20vh; right: -14vw; opacity: .75; animation: blobModra 34s ease-in-out infinite; }
        /* okrasni mehurcki: PRED zamegljenim ozadjem, a POD vsebino (input je vedno nad njimi) */
        .cw .uvod-orbs { position: absolute; inset: 0; z-index: 0; overflow: hidden; pointer-events: none; }
        .cw .uvod-orbs .uorb { position: absolute; border-radius: 50%; filter: blur(9px); opacity: 1; animation: uorbDrift var(--ud, 18s) ease-in-out infinite; }
        .cw .uorb-0 { width: 210px; height: 210px; top: 15%; left: 8%;  --ud: 19s; background: radial-gradient(circle at 42% 38%, #EACB55, rgba(234,203,85,0) 76%); }
        .cw .uorb-1 { width: 175px; height: 175px; top: 58%; left: 12%; --ud: 22s; background: radial-gradient(circle at 42% 38%, #B583F2, rgba(181,131,242,0) 76%); }
        .cw .uorb-2 { width: 245px; height: 245px; bottom: 9%; left: 26%; --ud: 24s; background: radial-gradient(circle at 42% 38%, #A6DB5F, rgba(166,219,95,0) 76%); }
        .cw .uorb-3 { width: 235px; height: 235px; top: 16%; right: 9%; --ud: 20s; background: radial-gradient(circle at 42% 38%, #5FD6B8, rgba(95,214,184,0) 76%); }
        .cw .uorb-4 { width: 195px; height: 195px; top: 50%; right: 9%; --ud: 21s; background: radial-gradient(circle at 42% 38%, #F2A166, rgba(242,161,102,0) 76%); }
        .cw .uorb-5 { width: 180px; height: 180px; bottom: 13%; right: 26%; --ud: 17s; background: radial-gradient(circle at 42% 38%, #F28BAE, rgba(242,139,174,0) 76%); }
        @keyframes uorbDrift { 0%, 100% { transform: translate(0, 0); } 25% { transform: translate(11%, -13%); } 50% { transform: translate(-9%, 11%); } 75% { transform: translate(-13%, -6%); } }
        @media (max-width: 700px) { .cw .uvod-orbs .uorb { opacity: .55; } }
        @media (prefers-reduced-motion: reduce) { .cw .uvod-ozadje .blob, .cw .uvod-orbs .uorb { animation: none; } }
        /* chat vsebina vertikalno na sredini; ko zraste, se pomakne navzgor (scroll) */
        .cw .uvod-oder { position: relative; z-index: 1; width: min(680px, 92vw); margin: 0 auto; padding: 2rem 0 3rem; flex: 1; display: flex; flex-direction: column; justify-content: center; }
        .cw .uvod-oder .ob-kicker { text-align: center; }
        .cw .uvod-h { text-align: center; }
        .cw .uvod-sub { text-align: center; max-width: 42ch; margin: .4rem auto 0; }
        /* razmik med podnaslovom in chatom (na .chat, ker .sub sili margin:0) — ~80px manj */
        .cw .uvod-oder .chat { display: flex; flex-direction: column; gap: 1rem; margin-top: clamp(1.5rem, 4vh, 2.5rem); }
        .cw .chat-bot, .cw .chat-jaz, .cw .chat-izbire { animation: chatVzid .5s cubic-bezier(.16,1,.3,1) both; }
        @keyframes chatVzid { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .cw .chat-bot, .cw .chat-jaz, .cw .chat-izbire { animation: none; } }
        .cw .chat-bot { display: flex; align-items: flex-start; gap: .55rem; max-width: 82%; }
        .cw .chat-obraz { width: 2.5rem; height: 2.5rem; border-radius: 50%; flex: none; position: relative; background: radial-gradient(58% 48% at 30% 24%, rgba(255,255,255,.92), rgba(255,255,255,0) 62%), conic-gradient(from 210deg, #7C3AED, #EC4899, #F59E0B, #38BDF8, #7C3AED); box-shadow: 0 8px 20px rgba(124,58,237,.28); }
        .cw .chat-obraz svg { position: absolute; inset: 0; width: 100%; height: 100%; }
        .cw .chat-bot .chat-mehur { background: rgba(255,180,205,.32); color: rgba(17,17,17,.72); border-bottom-left-radius: 5px; border-color: rgba(233,145,180,.6); }
        .cw .chat-bot .chat-mehur b { display: block; color: var(--ink); font-weight: 700; font-size: 1.02rem; }
        .cw .chat-bot .chat-mehur small { display: block; margin-top: .1rem; color: rgba(17,17,17,.5); font-size: .82rem; }
        .cw .chat-jaz { align-self: flex-end; max-width: 88%; }
        .cw .chat-jaz .chat-mehur { background: rgba(160,205,235,.4); color: var(--ink); font-weight: 600; border-bottom-right-radius: 5px; border-color: rgba(120,185,215,.6); }
        .cw .chat-mehur { border-radius: 18px; padding: .9rem 1.35rem; font-size: .95rem; line-height: 1.5; font-weight: 400; border: 1px solid rgba(255,255,255,.7); box-shadow: 0 2px 10px rgba(40,25,40,.05); }
        .cw .chat-mehur-ured { font-family: inherit; font-size: .95rem; cursor: pointer; display: inline-flex; align-items: center; gap: .5rem; text-align: left; transition: transform .16s ease, box-shadow .16s ease, background .16s ease; }
        .cw .chat-mehur-ured svg { opacity: .4; flex: none; transition: opacity .16s ease; }
        .cw .chat-mehur-ured:hover { transform: translateY(-1px); box-shadow: 0 7px 18px rgba(40,25,40,.13); background: rgba(160,205,235,.58); }
        .cw .chat-mehur-ured:hover svg { opacity: .85; }
        .cw .chat-mehur-ured:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
        .cw .chat-mehur-namig { position: relative; padding-right: 2.3rem; }
        .cw .namig-zapri { position: absolute; top: .5rem; right: .55rem; width: 1.45rem; height: 1.45rem; border-radius: 50%; border: none; background: rgba(17,17,17,.07); color: rgba(17,17,17,.55); font-size: .72rem; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; line-height: 1; padding: 0; }
        .cw .namig-zapri:hover { background: rgba(17,17,17,.15); color: var(--ink); }
        .cw .pozdrav-mehur { white-space: nowrap; }
        /* v pozdravu je <b> INLINE (drugje v mehurckih je block za naslov vprasanja),
           da sta "Hej Tina," in podjetje v ISTI vrstici */
        .cw .chat-bot .pozdrav-mehur b { display: inline; }
        .cw .pozdrav-select { border: none; background-color: transparent; font-family: inherit; font-weight: 700; font-size: .95rem; color: var(--ink); padding: 0 1.05rem 0 .3rem; margin-left: .1rem; appearance: none; -webkit-appearance: none; cursor: pointer; vertical-align: baseline; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%23111' stroke-width='1.5'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right .05rem center; }
        .cw .pozdrav-select:hover { text-decoration: underline; text-underline-offset: .2em; }
        .cw .chat-uredi { display: flex; flex-direction: column; gap: .5rem; align-items: flex-end; max-width: 100%; }
        .cw .chat-uredi .cu-vrsta { display: flex; gap: .5rem; align-items: center; }
        .cw .chat-uredi .cu-vrsta-stolpec { flex-direction: column; align-items: stretch; }
        .cw .chat-uredi .cu-vrsta-stolpec .gumb { align-self: flex-start; }
        /* popup pravic: po-meri vrstica (stevilo + enota + gumb) — dosledna oblikovana polja */
        .cw .cu-po-meri { margin-top: .95rem; display: flex; flex-wrap: wrap; align-items: center; gap: .55rem; }
        .cw .cu-num { width: 4.6rem; background: #fff; border: 1px solid rgba(17,17,17,.2); border-radius: 10px; padding: .5rem .55rem; font-family: inherit; font-size: .95rem; font-weight: 600; color: var(--ink); text-align: center; outline: none; transition: border-color .15s; }
        .cw .cu-num:focus { border-color: var(--accent); }
        .cw .cu-select { background: #fff; border: 1px solid rgba(17,17,17,.2); border-radius: 10px; padding: .5rem 2rem .5rem .7rem; font-family: inherit; font-size: .95rem; font-weight: 600; color: var(--ink); appearance: none; -webkit-appearance: none; cursor: pointer; outline: none; transition: border-color .15s; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%23111' stroke-width='1.5'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right .75rem center; }
        .cw .cu-select:focus { border-color: var(--accent); }
        .cw .cu-po-meri .cu-uporabi { margin-left: .5rem; }
        .cw .chat-uredi .cu-vrsta input { border: 1px solid rgba(17,17,17,.3); border-radius: 12px; background: #fff; padding: .55rem .8rem; font-family: inherit; font-size: .95rem; color: var(--ink); min-width: 11rem; }
        .cw .chat-uredi .cu-opcije { display: flex; flex-wrap: wrap; gap: .45rem; justify-content: flex-end; }
        .cw .chat-uredi .chat-podrocja { margin: 0; justify-content: flex-end; }
        .cw .noga-skrita { display: none; }
        .cw .chat-izbire { display: flex; flex-direction: column; gap: .6rem; margin: .2rem 0 .2rem 3.05rem; }
        .cw .chat-opcija { display: flex; align-items: center; gap: .9rem; text-align: left; width: min(420px, 100%); background: rgba(255,255,255,.82); -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px); border: 1px solid rgba(17,17,17,.1); border-radius: 16px; padding: 1rem 1.15rem; cursor: pointer; font-family: inherit; color: var(--ink); transition: transform .22s cubic-bezier(.34,1.56,.5,1), border-color .2s, box-shadow .22s; }
        .cw .chat-opcija:hover { transform: translateY(-3px); border-color: var(--accent); box-shadow: 0 14px 30px rgba(142,52,89,.12); }
        .cw .chat-opcija .crk { width: 1.9rem; height: 1.9rem; border-radius: 9px; background: #E8E3DA; color: var(--ink); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: .82rem; flex: none; }
        /* A/B/C v razlicnih pastelnih barvah */
        .cw .chat-izbire .chat-opcija:nth-child(1) .crk { background: #BEEAD9; }
        .cw .chat-izbire .chat-opcija:nth-child(2) .crk { background: #D6CFF3; }
        .cw .chat-izbire .chat-opcija:nth-child(3) .crk { background: #F6C9D6; }
        .cw .chat-opcija b { font-weight: 700; font-size: 1.02rem; }
        .cw .chat-opcija small { color: rgba(17,17,17,.45); font-size: .84rem; margin-left: auto; text-align: right; max-width: 48%; }
        /* gumb POD inputom, na sredini */
        /* align-self: stretch — starsevski .chat-izbira ima align-items: flex-start, zato bi se
           forma sicer dimenzionirala po 520px inputu in na telefonu strlela cez rob */
        .cw .chat-vnos { position: relative; z-index: 3; display: flex; flex-direction: column; align-items: stretch; align-self: stretch; gap: .9rem; margin: 1.4rem 0 0 3.05rem; }
        .cw .chat-vnos .gumb { align-self: center; }
        .cw .chat-vnos input { flex: none; width: 520px; max-width: 100%; box-sizing: border-box; background: #fff; border: 1px solid rgba(17,17,17,.14); border-radius: 999px; padding: .95rem 1.3rem; font-family: inherit; font-size: 1.02rem; font-weight: 600; color: var(--ink); outline: none; box-shadow: 0 6px 20px rgba(40,25,40,.06); transition: border-color .18s; }
        .cw .chat-vnos input:focus { border-color: var(--accent); }
        /* onboarding: forma s podatki podjetja (glava ponudbe) — vsi podatki zbrani tu */
        .cw .uv-forma { position: relative; z-index: 3; display: flex; flex-direction: column; align-items: stretch; gap: 1rem; margin: 1.4rem 0 0 3.05rem; width: min(560px, 100%); }
        .cw .uv-forma .uv-mreza { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem .9rem; }
        .cw .uv-forma .uv-polje { display: flex; flex-direction: column; gap: .4rem; min-width: 0; }
        .cw .uv-forma .uv-polje-siroko { grid-column: 1 / -1; }
        .cw .uv-forma label { font-size: .84rem; font-weight: 600; color: var(--ink); display: flex; align-items: baseline; gap: .5rem; }
        .cw .uv-forma .uv-neobvezno { font-size: .7rem; font-weight: 500; letter-spacing: .04em; text-transform: uppercase; color: rgba(17,17,17,.5); }
        .cw .uv-forma input, .cw .uv-forma select { width: 100%; background: #fff; border: 1px solid rgba(17,17,17,.14); border-radius: 12px; padding: .72rem .95rem; font-family: inherit; font-size: .98rem; font-weight: 500; color: var(--ink); outline: none; box-shadow: 0 4px 14px rgba(40,25,40,.05); transition: border-color .18s; box-sizing: border-box; }
        .cw .uv-forma input:focus, .cw .uv-forma select:focus { border-color: var(--accent); }
        .cw .uv-forma select { appearance: none; -webkit-appearance: none; padding-right: 2.4rem; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%23111' stroke-width='1.5'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right .95rem center; }
        .cw .uv-forma .tel-vrsta { display: flex; gap: .5rem; }
        .cw .uv-forma .tel-vrsta select { width: auto; flex: none; }
        .cw .uv-forma .gumb { align-self: center; margin-top: .5rem; }
        @media (max-width: 560px) { .cw .uv-forma { margin-left: 0; } .cw .uv-forma .uv-mreza { grid-template-columns: 1fr; } }
        /* področja dela — kompaktni chipi za več izbir (v chatu) */
        .cw .chat-podrocja { display: flex; flex-wrap: wrap; gap: .75rem; margin: .5rem 0 .3rem 3.05rem; max-width: 680px; }
        .cw .chip-podrocje { display: inline-flex; align-items: center; gap: .7rem; background: #fff; border: 1px solid rgba(17,17,17,.12); border-radius: 999px; padding: .55rem 1.2rem .55rem .55rem; font-family: inherit; font-size: 1rem; font-weight: 700; color: var(--ink); cursor: pointer; box-shadow: 0 2px 10px rgba(35,18,45,.05); transition: border-color .18s, box-shadow .18s, transform .2s cubic-bezier(.34,1.56,.5,1); }
        .cw .chip-podrocje:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(35,18,45,.1); }
        .cw .chip-podrocje .pi-pod { width: 2.15rem; height: 2.15rem; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; flex: none; }
        .cw .chip-podrocje .pi-pod svg { width: 1.15rem; height: 1.15rem; }
        .cw .chip-podrocje b { font-weight: 700; }
        .cw .chip-podrocje .chip-kljuk { width: 1.35rem; height: 1.35rem; border-radius: 50%; border: 1.5px solid; display: inline-flex; align-items: center; justify-content: center; color: #fff; font-size: .78rem; font-weight: 900; margin-left: .3rem; flex: none; transition: background .18s, border-color .18s; }
        @media (max-width: 560px) { .cw .chat-podrocja { margin-left: 0; } }
        .cw .profil-predal .chat-podrocja { margin-left: 0; max-width: none; flex-direction: column; }
        .cw .profil-predal .chip-podrocje { width: 100%; }
        .cw .profil-predal .chip-podrocje .chip-kljuk { margin-left: auto; }
        @media (max-width: 560px) {
          .cw .chat-opcija small { display: none; }
          .cw .chat-izbire, .cw .chat-vnos { margin-left: 0; }
          .cw .chat-bot { max-width: 92%; }
        }
        .cw .vrstica-vprasanja .vp { animation: none; max-width: none; }

        .cw .ponudba0-dodaj { margin-top: 1rem; align-self: flex-start; }
        .cw .ponudba0-vsota { margin-top: 1.1rem; padding-top: .9rem; border-top: 2px solid var(--ink); }
        .cw .ponudba0-vsota-vrsta { display: flex; justify-content: space-between; align-items: baseline; font-size: .92rem; color: rgba(17,17,17,.62); }
        .cw .ponudba0-vsota-vrsta b { font-family: var(--font-bodoni), serif; color: var(--ink); font-weight: 600; font-variant-numeric: tabular-nums; font-size: 1.15rem; }
        .cw .ponudba0-opomba { font-size: .76rem; color: var(--accent); margin-top: .45rem; font-weight: 500; }
        .cw .ponudba0-vsota-vrsta.ponudba0-mini { font-size: .82rem; color: rgba(17,17,17,.55); margin-top: .35rem; }
        .cw .ponudba0-vsota-vrsta.ponudba0-mini + .ponudba0-vsota-vrsta { margin-top: .35rem; }

        /* mobilna kosarica (FAB) + zapiralni gumb — privzeto skrita (na desktopu je panel fiksen desno) */
        .cw .ponudba0-zapri { display: none; }
        .cw .ponudba-fab { display: none; }

        @media (max-width: 1200px) {
          .cw .oder0 { grid-template-columns: 1fr; }
          .cw .vodicka { display: none; }
          .cw .platno0 { min-height: 480px; }
          /* ponudba NI vec vmes: postane drsni panel z desne (kosarica) */
          .cw .ponudba0 { position: fixed; top: 0; right: 0; bottom: 0; width: min(420px, 90vw); border-radius: 20px 0 0 20px; margin: 0; z-index: 70; overflow-y: auto; transform: translateX(102%); transition: transform .32s cubic-bezier(.2,.8,.3,1); box-shadow: -18px 0 50px rgba(40,25,40,.22); background: rgba(255,255,255,.92); -webkit-backdrop-filter: blur(24px) saturate(1.4); backdrop-filter: blur(24px) saturate(1.4); }
          .cw .ponudba0.odprta { transform: translateX(0); }
          .cw .ponudba0-zapri { display: flex; position: absolute; top: .9rem; right: 1rem; width: 2.2rem; height: 2.2rem; align-items: center; justify-content: center; border: none; background: rgba(17,17,17,.06); border-radius: 50%; font-size: 1.3rem; line-height: 1; color: var(--ink); cursor: pointer; z-index: 2; }
          .cw .ponudba-backdrop { position: fixed; inset: 0; background: rgba(30,18,35,.38); z-index: 65; animation: cwFade .25s ease both; }
          /* FAB kosarica spodaj (nad nogo) */
          .cw .ponudba-fab { display: inline-flex; align-items: center; gap: .6rem; position: fixed; right: 1rem; bottom: 5.4rem; z-index: 60; padding: .6rem .95rem .6rem .7rem; border: none; border-radius: 999px; background: var(--ink); color: var(--paper); box-shadow: 0 12px 30px rgba(40,25,40,.3); cursor: pointer; font-family: inherit; transition: transform .2s ease, opacity .2s ease; }
          .cw .ponudba-fab:active { transform: scale(.96); }
          .cw .ponudba-fab.skrit { opacity: 0; pointer-events: none; transform: scale(.9); }
          .cw .ponudba-fab .fab-ikona { position: relative; display: inline-flex; align-items: center; justify-content: center; width: 2.3rem; height: 2.3rem; border-radius: 50%; background: rgba(255,255,255,.16); }
          .cw .ponudba-fab .fab-tag { position: absolute; top: -.35rem; right: -.35rem; min-width: 1.3rem; height: 1.3rem; padding: 0 .3rem; border-radius: 999px; background: var(--accent); color: #fff; font-size: .72rem; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; border: 2px solid var(--ink); }
          .cw .ponudba-fab .fab-znesek { display: flex; flex-direction: column; align-items: flex-start; line-height: 1.05; font-size: .68rem; font-weight: 600; opacity: .8; padding-right: .35rem; }
          .cw .ponudba-fab .fab-znesek b { font-size: .92rem; font-weight: 800; opacity: 1; }
        }
        /* desktop: panel ponudbe = fiksen desni stolpec po CELI VISINI (do headerja) */
        @media (min-width: 1201px) {
          /* step-0 vsebina samo bledi (brez transforma), da fixed panel deluje na okno.
             visja specificnost (.korak-vsebina.siroko), da premaga kasnejsi .korak-vsebina */
          .cw .korak-vsebina.siroko { max-width: none; width: 100%; padding-right: calc(min(410px, 34vw) + clamp(1rem, 2.5vw, 2rem)); box-sizing: border-box; animation-name: cwFade; }
          /* platno mehurckov poravnano s (centriranim) chatom — ne cisto ob levem robu */
          .cw .oder0 { display: block; width: auto; max-width: 800px; margin-left: auto; margin-right: auto; }
          .cw .ponudba0 { position: fixed; top: 3.05rem; right: 0; bottom: 0; width: min(410px, 34vw); border-radius: 22px 0 0 22px; margin: 0; z-index: 20; overflow-y: auto; animation: ponudbaVstop .5s cubic-bezier(.2,.8,.3,1) both; transition: width .34s cubic-bezier(.2,.8,.3,1); }
          .cw .detajl-modal .choicegrid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .6rem; }
          .cw .detajl-modal .choicegrid > button { width: 100%; justify-content: flex-start; }
          .cw .detajl-modal .choicegrid .svoje-vrsta { grid-column: 1 / -1; }
          /* spodnja gumba centrirana POD vprašalnikom (ne cela stran) — enak odmik kot vsebina za fiksni panel */
          .cw .noga.noga-ob-panelu { padding-right: calc(min(410px, 34vw) + clamp(1rem, 2.5vw, 2rem) + clamp(1.2rem, 4vw, 3rem)); }
        }
        @keyframes ponudbaVstop { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @media (prefers-reduced-motion: reduce) { .cw .ponudba0 { animation: none; } }
        @media (prefers-reduced-motion: reduce) {
          .cw .orb0, .cw .vodicka { animation: none; }
          .cw .h1-iskre path { animation: none; }
        }
        .cw .skupina-naslov { font-size: .72rem; font-weight: 700; letter-spacing: .15em; text-transform: uppercase; color: var(--accent); margin-bottom: .75rem; }
        .cw .onboarding { position: fixed; inset: 0; z-index: 60; background: var(--paper); overflow-y: auto; display: flex; flex-direction: column; animation: cwVstop .5s cubic-bezier(.16,1,.3,1) both; }
        @media (prefers-reduced-motion: reduce) { .cw .onboarding { animation: none; } }
        .cw .ob-kicker { font-size: .74rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--accent); margin: 0 0 .6rem; }
        .cw .ob-naslov { padding-left: 0 !important; }
        .cw .onboarding-noga { display: flex; flex-direction: column; align-items: flex-start; gap: 1.1rem; margin-top: 2.6rem; }
        .cw .onboarding-noga-vrsta { width: 100%; flex-direction: row; align-items: center; justify-content: center; gap: 1.6rem; }
        @media (max-width: 480px) { .cw .onboarding-noga-vrsta { flex-direction: column; gap: 1rem; } }
        .cw .soglasje-email { border-top: 1px solid rgba(17,17,17,.14); padding-top: 1.3rem; margin-bottom: 1.7rem; }
        .cw .se-preklop { display: flex; align-items: center; justify-content: space-between; gap: 1.1rem; cursor: pointer; font-size: .98rem; font-weight: 500; color: var(--ink); line-height: 1.5; }
        .cw .se-tekst { display: flex; align-items: center; gap: .55rem; min-width: 0; }
        .cw .se-ikona { flex: none; color: var(--ink); opacity: .7; }
        .cw .se-toggle { position: relative; flex: none; width: 2.6rem; height: 1.5rem; }
        .cw .se-toggle input { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 2.75rem; height: 2.75rem; margin: 0; opacity: 0; cursor: pointer; }
        .cw .se-slider { position: absolute; inset: 0; background: rgba(17,17,17,.24); border-radius: 999px; transition: background .2s ease; pointer-events: none; }
        .cw .se-slider::before { content: ''; position: absolute; top: 2px; left: 2px; width: calc(1.5rem - 4px); height: calc(1.5rem - 4px); background: #fff; border-radius: 50%; box-shadow: 0 1px 3px rgba(0,0,0,.22); transition: transform .2s cubic-bezier(0.23,1,0.32,1); }
        .cw .se-toggle input:checked + .se-slider { background: var(--ink); }
        .cw .se-toggle input:checked + .se-slider::before { transform: translateX(calc(2.6rem - 1.5rem)); }
        .cw .se-preklop em { font-style: normal; color: rgba(17,17,17,.55); font-weight: 400; }
        .cw .se-note { margin: .8rem 0 0; font-size: .82rem; line-height: 1.5; color: rgba(17,17,17,.62); }
        .cw .soglasje-gumbi { display: flex; flex-direction: column; align-items: center; gap: 1rem; }
        .cw .napredek { position: fixed; top: 0; left: 0; right: 0; height: 3px; background: rgba(17,17,17,.1); z-index: 40; }
        .cw .napredek i { display: block; height: 100%; background: var(--ink); transition: width .5s cubic-bezier(.16,1,.3,1); }

        /* locen bez pas nad prelivom (njen mockup: header ima svoje ozadje) */
        .cw .glava { position: fixed; top: 0; left: 0; right: 0; display: flex; align-items: center; justify-content: space-between; padding: 1rem clamp(1.2rem, 4vw, 3rem); z-index: 30; pointer-events: none; background: var(--paper); border-bottom: 1px solid rgba(17,17,17,.08); }
        .cw .glava .zapri { pointer-events: auto; display: inline-flex; align-items: center; gap: .4rem; font-size: .72rem; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: rgba(17,17,17,.72); text-decoration: none; background: var(--paper); border: none; border-radius: 999px; padding: .5rem .85rem; transition: color .18s ease; }
        .cw .glava .zapri:hover { color: var(--ink); }
        /* locena razlicica (poleg loga): navadno besedilo z locilno crto pred njim */
        .cw .glava .zapri-loceno { background: none; border-radius: 0; padding: .2rem 0 .2rem 1rem; border-left: 1px solid rgba(17,17,17,.2); text-transform: lowercase; letter-spacing: .02em; color: rgba(17,17,17,.6); }
        .cw .glava-levo { pointer-events: auto; display: inline-flex; align-items: center; gap: 1rem; }
        .cw .glava-desno { pointer-events: auto; display: inline-flex; align-items: center; gap: .5rem; }
        .cw .glava-profil { display: inline-flex; align-items: center; gap: .4rem; font-family: inherit; font-size: .72rem; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: rgba(17,17,17,.82); background: var(--paper); border: 1px solid rgba(17,17,17,.22); border-radius: 999px; padding: .5rem .85rem; cursor: pointer; transition: color .18s ease, border-color .18s ease; }
        .cw .glava-profil:hover { color: var(--ink); border-color: rgba(17,17,17,.5); }

        .cw .profil-zastor { position: fixed; inset: 0; z-index: 60; background: rgba(17,17,17,.28); backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px); }
        .cw .profil-predal { position: fixed; top: 0; right: 0; bottom: 0; z-index: 61; width: min(440px, 100vw); background: var(--paper); box-shadow: -12px 0 40px rgba(17,17,17,.14); overflow-y: auto; padding: clamp(1.6rem, 4vw, 2.4rem); animation: cwPredalIn .32s cubic-bezier(0.23,1,0.32,1) both; }
        @keyframes cwPredalIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @media (prefers-reduced-motion: reduce) { .cw .profil-predal { animation: none; } }
        .cw .profil-predal .kartica { max-width: none; }
        .cw .profil-predal .numgrid { grid-template-columns: 1fr; gap: 1.2rem; max-width: none; }
        .cw .podjetja-shrani { display: flex; flex-direction: column; align-items: flex-start; gap: .9rem; margin-top: 1.1rem; }
        .cw .podjetja-shrani input { width: 100%; border: none; border-bottom: 1px solid rgba(17,17,17,.25); background: transparent; padding: .5rem .2rem; font-family: inherit; font-size: .9rem; color: var(--ink); }
        .cw .podjetja-shrani input:focus { outline: none; border-bottom: 1.5px solid var(--ink); }
        .cw .podjetja-shrani .dodaj-gumb:disabled { opacity: .4; cursor: not-allowed; }
        .cw .podjetja-shrani .dodaj-gumb:disabled:hover { background: transparent; }
        .cw .strosek-seznam { display: flex; flex-direction: column; margin-bottom: .3rem; }
        .cw .strosek-vrsta { display: grid; grid-template-columns: 1fr 5rem auto auto; gap: .6rem; align-items: center; padding: .5rem 0; border-bottom: 1px solid rgba(17,17,17,.1); }
        .cw .strosek-vrsta input { border: none; border-bottom: 1px solid rgba(17,17,17,.2); background: transparent; padding: .3rem .2rem; font-family: inherit; font-size: .92rem; color: var(--ink); }
        .cw .strosek-vrsta input[type=number] { text-align: right; font-weight: 600; }
        .cw .strosek-vrsta input:focus { outline: none; border-bottom: 1.5px solid var(--ink); }
        .cw .strosek-vrsta .sv-znak { font-size: .8rem; color: rgba(17,17,17,.55); white-space: nowrap; }
        .cw .strosek-skupaj { margin: .9rem 0 1.2rem; font-size: .95rem; color: var(--ink); }
        .cw .strosek-skupaj b { font-weight: 700; }
        .cw .profil-sekcija { margin-bottom: 1.8rem; padding-bottom: 1.6rem; border-bottom: 1px solid rgba(17,17,17,.12); }
        .cw .profil-sekcija:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
        .cw .profil-sekcija .k-naslov { display: flex; flex-wrap: wrap; align-items: baseline; gap: .3rem 1rem; margin-bottom: 1rem; font-weight: 600; font-size: 1.05rem; color: var(--ink); }
        .cw .profil-seznam { display: flex; flex-direction: column; gap: .2rem; }
        .cw .profil-vrsta { display: flex; align-items: center; gap: .8rem; padding: .5rem 0; border-bottom: 1px solid rgba(17,17,17,.08); }
        .cw .profil-vrsta:last-child { border-bottom: none; }
        .cw .profil-vrsta .pv-ime { flex: 1; min-width: 0; font-size: .95rem; font-weight: 600; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .cw .glava .glava-brand { pointer-events: auto; display: inline-flex; align-items: center; gap: .5rem; text-decoration: none; }
        .cw .glava .glava-pinart { font-weight: 800; font-size: 1rem; letter-spacing: -.01em; color: var(--ink); line-height: 1; }
        .cw .glava .glava-ime { font-size: .78rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--ink); line-height: 1; }
        .cw .glava .beta { font-size: .56rem; font-weight: 700; letter-spacing: .1em; color: var(--accent); border: 1px solid var(--accent); border-radius: 4px; padding: .1rem .3rem; line-height: 1; text-transform: uppercase; }
        /* nastavitve-ikona + avatar (desno) */
        .cw .glava-ikona, .cw .glava-avatar { pointer-events: auto; width: 2rem; height: 2rem; border-radius: 50%; border: 1px solid rgba(17,17,17,.2); background: var(--paper); display: inline-flex; align-items: center; justify-content: center; cursor: pointer; font-family: inherit; transition: color .18s, border-color .18s; }
        .cw .glava-ikona { color: rgba(17,17,17,.65); }
        .cw .glava-ikona:hover { color: var(--ink); border-color: rgba(17,17,17,.5); }
        .cw .glava-avatar { font-weight: 700; font-size: .8rem; color: var(--ink); }
        .cw .glava-avatar:hover { border-color: rgba(17,17,17,.5); }

        .cw .oder { flex: 1; display: flex; align-items: center; justify-content: center; padding: 7rem clamp(1.2rem, 4vw, 3rem) 8rem; position: relative; z-index: 1; }
        .cw .korak-vsebina { width: 100%; max-width: 880px; animation: cwVstop .55s cubic-bezier(.16,1,.3,1) both; }
        /* siroko (korak 0 / uvod) brez transforma -> fiksni/drsni panel deluje relativno na okno (tudi mobile) */
        .cw .korak-vsebina.siroko, .cw .korak-vsebina.brez-transforma { animation-name: cwFade; }
        /* korak 0 rabi vec prostora (orbi + panel drug ob drugem) */
        .cw .korak-vsebina.siroko { max-width: none; }
        .cw .h1-maska { display: inline-block; overflow: hidden; vertical-align: bottom; padding: .06em .22em .24em; margin: -.06em -.22em -.24em; }
        .cw .h1-beseda { display: inline-block; transform: translateY(110%); animation: cwBeseda .7s cubic-bezier(.16,1,.3,1) forwards; }
        @keyframes cwBeseda { to { transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) { .cw .h1-beseda { animation: none; transform: none; } }
        @keyframes cwVstop { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: none; } }
        /* brez transforma (sicer bi "ujel" fixed panel v koraku 0) */
        @keyframes cwFade { from { opacity: 0; } to { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) { .cw .korak-vsebina { animation: none; } }

        .cw h1 { position: relative; font-family: var(--font-serif), Didot, serif; font-weight: 500; font-size: clamp(2.6rem, 7vw, 4.6rem); line-height: 1; letter-spacing: -.012em; margin: 0 0 .8rem; }
        .cw .h1-step { position: absolute; top: .42rem; right: calc(100% + .75rem); font-family: var(--font-sans), system-ui, sans-serif; font-size: .72rem; line-height: 1; font-weight: 800; letter-spacing: .16em; color: rgba(17,17,17,.55); }
        .cw .sub-vrsta { display: flex; justify-content: space-between; align-items: baseline; gap: 2rem; margin: 0 0 2.4rem; flex-wrap: wrap; }
        .cw .sub { font-size: clamp(1rem, 1.6vw, 1.2rem); line-height: 1.6; color: rgba(17,17,17,.72); margin: 0; max-width: 52ch; min-width: 0; }
        .cw .korak0-ime { max-width: 420px; margin: 0 0 1.1rem; }
        .cw .korak0-ime .polje { width: 100%; }
        .cw .korak0-akcije { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; margin: 0 0 2.2rem; }

        .cw .opts { display: flex; flex-wrap: wrap; gap: 1rem .65rem; }
        .cw .pill { position: relative; overflow: hidden; z-index: 0; padding: .8rem 1.3rem; border: 1px solid rgba(17,17,17,.25); border-radius: 999px; cursor: pointer; font-size: 1rem; background: transparent; font-family: inherit; font-weight: 400; color: var(--ink); transition: border-color .18s ease, background .18s ease, color .18s ease; text-align: left; line-height: 1.25; }
        .cw .pill small { position: relative; z-index: 1; display: block; font-size: .82rem; color: rgba(17,17,17,.82); font-weight: 400; margin-top: .1rem; transition: color .3s cubic-bezier(0.16,1,0.3,1); }
        .cw .pill:hover { border-color: var(--ink); }
        .cw .pill.on { background: var(--accent); color: var(--paper); border-color: var(--accent); }
        .cw .pill.on small { color: rgba(245,242,234,.92); }
        .cw .pill:focus { outline: none; }
        .cw .pill:focus-visible { outline: 2px solid var(--ink); outline-offset: 3px; }
        .cw .pill { display: inline-flex; align-items: center; gap: .65rem; transition: transform .2s cubic-bezier(0.23,1,0.32,1), border-color .2s ease, background .55s cubic-bezier(0.16,1,0.3,1), color .2s ease; }
        .cw .pill:hover { transform: translateY(-2px); }
        .cw .pill:active { transform: translateY(0) scale(.97); }
        .cw .pill-fill { position: absolute; top: 50%; left: 1.3rem; width: 2.15rem; height: 2.15rem; border-radius: 50%; background: var(--accent); transform: translateY(-50%) scale(0); transform-origin: center; transition: transform .55s cubic-bezier(0.16,1,0.3,1); z-index: 0; pointer-events: none; }
        .cw .pill.on .pill-fill { transform: translateY(-50%) scale(18); }
        .cw .pill .pi { position: relative; z-index: 1; display: inline-flex; align-items: center; justify-content: center; flex: none; width: 2.15rem; height: 2.15rem; border-radius: 50%; background: var(--accent); color: var(--paper); transition: background .3s ease, color .55s ease; }
        .cw .pill.on .pi { background: var(--accent); color: var(--paper); }
        .cw .pill .pi svg { width: 22px; height: 22px; }
        .cw .pill-tekst { position: relative; z-index: 1; transition: color .3s cubic-bezier(0.16,1,0.3,1); }
        .cw .pill.dodaj { border-style: dashed; border-color: rgba(17,17,17,.55); font-weight: 500; }
        .cw .pill.dodaj .pi { background: var(--ink); }
        .cw .pill-cust { background: var(--accent); border-color: var(--accent); color: var(--paper); font-weight: 500; }
        .cw .pill-cust:hover { border-color: var(--accent); }
        .cw .drzava-vnos { border: none; border-bottom: 1px solid rgba(17,17,17,.35); background: transparent; font-family: inherit; font-size: .82rem; font-weight: 500; color: var(--ink); padding: 0 0 .15rem; width: 11rem; max-width: 100%; }
        .cw .drzava-vnos:focus { outline: none; border-color: var(--ink); }

        .cw .izbira { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; max-width: 760px; }
        .cw .izbira-3 { grid-template-columns: repeat(3, 1fr); }
        @media (max-width: 640px) { .cw .izbira, .cw .izbira-3 { grid-template-columns: 1fr; } }
        /* vsebina znotraj bele kartice: mreze brez lastnega zgornjega odmika */
        .cw .kartica .numgrid { margin-top: 0; max-width: none; }
        .cw .kartica .numgrid + .numgrid { margin-top: 1.1rem; }
        .cw .kartica .izbira { max-width: none; }
        .cw .kartica .opts { margin-top: 0; }
        .cw .izbira button { text-align: left; border: 1px solid rgba(17,17,17,.25); background: transparent; border-radius: 14px; padding: 1.4rem 1.5rem; cursor: pointer; font-family: inherit; color: var(--ink); transition: border-color .18s ease, background .18s ease, color .18s ease; }
        .cw .izbira button h3 { margin: 0 0 .3rem; font-family: var(--font-serif), serif; font-weight: 500; font-size: 1.3rem; }
        .cw .izbira button p { margin: 0; font-size: .85rem; line-height: 1.55; color: rgba(17,17,17,.68); font-weight: 300; }
        .cw .izbira button.on { background: var(--accent); border-color: var(--accent); color: var(--paper); }
        .cw .izbira button.on p { color: rgba(245,242,234,.82); }

        /* Podrocja (onboarding): ikona v krogcu, ki se ob izbiri "razlije"
           cez celo kartico — bolj zivo od plosko obarvanega .on. Ob hoverju
           se kartica dvigne, dobi robni poudarek in nezno cvetenje iz ikone. */
        .cw .izbira-podrocja button { position: relative; overflow: hidden; z-index: 0; display: flex; flex-direction: column; transition: transform .3s cubic-bezier(0.23,1,0.32,1), border-color .2s ease, box-shadow .3s ease, background .18s ease; }
        .cw .izbira-podrocja button.on { background: transparent; border-color: var(--accent); }
        .cw .izbira-podrocja button:hover:not(.on) { transform: translateY(-5px); border-color: var(--accent); box-shadow: 0 16px 38px rgba(17,17,17,.10); }
        .cw .izbira-podrocja button:active { transform: translateY(-1px) scale(.995); }
        @media (prefers-reduced-motion: reduce) {
          .cw .izbira-podrocja button, .cw .izbira-podrocja button:hover:not(.on) { transform: none; }
        }
        /* krog v barvi, ki se ob izbiri razleze iz ikone cez celo kartico */
        .cw .izbira-podrocja .pod-fill { position: absolute; top: 1.4rem; left: 1.5rem; width: 2.6rem; height: 2.6rem; border-radius: 50%; background: var(--accent); transform: scale(0); transform-origin: center; transition: transform .55s cubic-bezier(0.16,1,0.3,1); z-index: 0; pointer-events: none; }
        .cw .izbira-podrocja button.on .pod-fill { transform: scale(22); }
        @media (prefers-reduced-motion: reduce) { .cw .izbira-podrocja .pod-fill { transition: none; } }
        .cw .izbira-podrocja .pod-glava { position: relative; z-index: 1; display: flex; align-items: center; gap: .85rem; margin-bottom: .75rem; }
        .cw .izbira-podrocja .pod-ikona { flex: none; display: inline-flex; align-items: center; justify-content: center; width: 2.6rem; height: 2.6rem; border-radius: 50%; background: var(--accent); color: var(--paper); transition: background .3s ease, color .55s ease, transform .3s cubic-bezier(0.23,1,0.32,1); }
        .cw .izbira-podrocja button:hover:not(.on) .pod-ikona { transform: scale(1.08) rotate(-5deg); }
        .cw .izbira-podrocja button.on .pod-ikona { background: var(--accent); color: var(--paper); }
        .cw .izbira-podrocja button h3 { margin: 0; }
        .cw .izbira-podrocja button h3, .cw .izbira-podrocja button p { position: relative; z-index: 1; transition: color .3s cubic-bezier(0.16,1,0.3,1); }

        .cw .numgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-top: 2rem; max-width: 640px; }
        @media (max-width: 560px) { .cw .numgrid { grid-template-columns: 1fr; gap: 1.4rem; } }
        /* polja pod karticami raba: enaka sirina in razmik kot .izbira */
        .cw .numgrid.podkartice { max-width: 760px; gap: 1rem; }
        @media (max-width: 640px) { .cw .numgrid.podkartice { grid-template-columns: 1fr; } }
        .cw .hint.podkartice { max-width: 760px; }
        .cw .polje label { display: flex; justify-content: space-between; align-items: baseline; gap: .5rem; font-size: .72rem; font-weight: 600; letter-spacing: .16em; text-transform: uppercase; color: rgba(17,17,17,.7); margin-bottom: .3rem; }
        .cw .polje label .vec { font-size: .68rem; font-weight: 500; letter-spacing: 0; text-transform: none; color: rgba(17,17,17,.5); }
        .cw .info-namig { position: relative; display: inline-flex; margin-left: .4rem; vertical-align: middle; }
        .cw .info-gumb { width: 1.15rem; height: 1.15rem; border-radius: 50%; border: 1px solid rgba(17,17,17,.4); background: transparent; color: rgba(17,17,17,.6); font-family: inherit; font-size: .68rem; font-weight: 700; line-height: 1; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; padding: 0; flex: none; }
        .cw .info-gumb:hover { border-color: var(--ink); color: var(--ink); }
        .cw .info-oblacek { position: absolute; z-index: 20; bottom: calc(100% + .5rem); right: 0; left: auto; width: max(220px, 16rem); max-width: min(84vw, 20rem); background: var(--ink); color: var(--paper); font-size: .8rem; font-weight: 400; line-height: 1.5; padding: .75rem .95rem; border-radius: 10px; text-transform: none; letter-spacing: 0; box-shadow: 0 8px 24px rgba(17,17,17,.22); }
        .cw .polje input { width: 100%; border: none; border-bottom: 1px solid rgba(17,17,17,.45); background: transparent; font-family: var(--font-sans), system-ui, sans-serif; font-weight: 600; font-size: 1.1rem; padding: .35rem 0 .5rem; color: var(--ink); border-radius: 0; }
        .cw .polje input:focus { outline: none; border-bottom: 2px solid var(--ink); margin-bottom: -1px; }
        .cw .polje input::placeholder { color: rgba(17,17,17,.42); font-weight: 400; font-size: 1rem; }
        .cw input[type=number] { -moz-appearance: textfield; appearance: textfield; }
        .cw input[type=number]::-webkit-outer-spin-button,
        .cw input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .cw .polje select { width: 100%; border: none; border-bottom: 1px solid rgba(17,17,17,.45); background: transparent; font-family: var(--font-sans), system-ui, sans-serif; font-weight: 600; font-size: 1.05rem; padding: .35rem 1.6rem .5rem 0; color: var(--ink); border-radius: 0; appearance: none; -webkit-appearance: none; cursor: pointer; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%23111' stroke-width='1.5'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right .2rem center; }
        /* datalist polja (npr. Država): skrij Chromov native indikator, dodaj isto puscico kot pri select */
        .cw input[list] { padding-right: 2.7rem; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%23111' stroke-width='1.5'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 1.2rem center; }
        .cw input[list]::-webkit-calendar-picker-indicator { opacity: 0; cursor: pointer; }
        .cw .tel-vrsta { display: flex; gap: .8rem; align-items: baseline; }
        .cw .tel-vrsta select { width: 6.2rem; flex: none; }
        .cw .polje select:focus { outline: none; border-bottom: 2px solid var(--ink); margin-bottom: -1px; }

        .cw .izbirnik-gumb { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: .6rem; border: none; border-bottom: 1px solid rgba(17,17,17,.45); background: transparent; font-family: var(--font-sans), system-ui, sans-serif; font-weight: 600; font-size: 1.05rem; padding: .35rem 0 .5rem; color: var(--ink); border-radius: 0; cursor: pointer; text-align: left; }
        .cw .izbirnik-gumb:focus-visible { outline: 2px solid var(--ink); outline-offset: 3px; }
        .cw .izbirnik-gumb svg { flex: none; opacity: .6; }
        .cw .valuta-gumb-mobile { display: none; }
        @media (max-width: 560px) {
          .cw .valuta-select { display: none; }
          .cw .valuta-gumb-mobile { display: flex; }
        }
        .cw .izbirnik-zastor { position: fixed; inset: 0; z-index: 65; background: rgba(245,242,234,.55); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); display: flex; align-items: center; justify-content: center; padding: 1.5rem; }
        .cw .izbirnik-plosca { width: 100%; max-width: 420px; max-height: min(32rem, 80dvh); display: flex; flex-direction: column; background: var(--paper); border: 1px solid rgba(17,17,17,.18); border-radius: 18px; box-shadow: 0 24px 80px rgba(17,17,17,.14); overflow: hidden; animation: cwVstop .3s cubic-bezier(.16,1,.3,1) both; }
        .cw .izbirnik-glava { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1.2rem 1.4rem; border-bottom: 1px solid rgba(17,17,17,.1); font-weight: 600; font-size: .95rem; color: var(--ink); flex: none; }
        .cw .izbirnik-glava button { border: none; background: none; cursor: pointer; font-size: 1.05rem; color: rgba(17,17,17,.6); padding: .2rem; line-height: 1; }
        .cw .izbirnik-glava button:hover { color: var(--ink); }
        .cw .izbirnik-seznam { overflow-y: auto; padding: .5rem; }
        .cw .izbirnik-vrsta { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 1rem; border: none; background: none; border-radius: 10px; padding: .8rem .9rem; font-family: inherit; font-size: .96rem; font-weight: 500; color: var(--ink); cursor: pointer; text-align: left; transition: background .15s ease; }
        .cw .izbirnik-vrsta:hover { background: rgba(17,17,17,.05); }
        .cw .izbirnik-vrsta.on { color: var(--accent); font-weight: 600; }
        .cw .izbirnik-vrsta svg { flex: none; color: var(--accent); }
        @media (max-width: 560px) {
          .cw .izbirnik-zastor { align-items: flex-end; padding: 0; }
          .cw .izbirnik-plosca { max-width: none; max-height: 75dvh; border-radius: 20px 20px 0 0; border-width: 1px 0 0; animation: cwListIn .32s cubic-bezier(.16,1,.3,1) both; padding-bottom: env(safe-area-inset-bottom); }
        }
        @keyframes cwListIn { from { transform: translateY(100%); } to { transform: translateY(0); } }

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
        .cw .predlogi button { display: flex; align-items: center; justify-content: space-between; gap: 1rem; width: 100%; min-height: 2.75rem; text-align: left; border: none; border-top: 1px solid rgba(17,17,17,.1); background: none; font-family: inherit; font-size: .95rem; font-weight: 400; color: var(--ink); padding: .85rem .3rem; cursor: pointer; }
        .cw .predlogi button:hover { opacity: .55; }
        .cw .predlogi button span { color: rgba(17,17,17,.65); white-space: nowrap; }
        .cw .predlogi .svoja { font-weight: 500; }

        .cw .postavke { margin-top: 1.6rem; max-width: 540px; }
        .cw .postavka { display: grid; grid-template-columns: 1fr 3rem 2.7rem 5.2rem auto auto; gap: .7rem; align-items: center; border-bottom: 1px solid rgba(17,17,17,.12); padding: .5rem 0; font-size: .92rem; }
        .cw .postavka input { border: none; border-bottom: 1px solid rgba(17,17,17,.45); background: transparent; font-family: var(--font-sans), system-ui, sans-serif; font-weight: 600; font-size: .95rem; padding: .1rem .5rem .2rem 0; color: var(--ink); text-align: right; border-radius: 0; width: 100%; }
        .cw .postavka .enota-toggle { border: 1px solid rgba(17,17,17,.28); border-radius: 999px; background: transparent; font-family: inherit; font-size: .72rem; font-weight: 600; padding: .18rem .5rem; cursor: pointer; color: var(--ink); opacity: 1; justify-self: center; }
        .cw .postavka .enota-toggle:hover { border-color: var(--ink); }
        .cw .postavka input:focus { outline: none; border-bottom: 2px solid var(--ink); }
        .cw .postavka .enota { color: rgba(17,17,17,.65); font-size: .85rem; }
        .cw .postavka button { border: none; background: none; cursor: pointer; font-family: inherit; font-size: 1rem; color: var(--ink); opacity: .45; padding: 0 .2rem; }
        .cw .postavka button:hover { opacity: 1; }

        .cw .vprasanja { display: grid; gap: 1.5rem; max-width: 720px; }
        .cw .vp { animation: cwVstop .5s cubic-bezier(.16,1,.3,1) both; background: #FCFBF7; border: 1px solid rgba(17,17,17,.06); border-radius: 20px; padding: 1.5rem 1.6rem 1.6rem; box-shadow: 0 4px 18px rgba(17,17,17,.04); }
        @media (prefers-reduced-motion: reduce) { .cw .vp { animation: none; } }
        /* Enotna bela kartica za strukturne korake (izkusnje, trg, raba,
           podatki ...) — isti videz kot vprasanja, da so vse strani v
           enakem stilu; naslov kartice = h4. */
        .cw .kartica { animation: cwVstop .5s cubic-bezier(.16,1,.3,1) both; background: #FCFBF7; border: 1px solid rgba(17,17,17,.06); border-radius: 20px; padding: 1.6rem 1.7rem 1.7rem; box-shadow: 0 4px 18px rgba(17,17,17,.04); max-width: 760px; margin-bottom: 1.4rem; }
        @media (prefers-reduced-motion: reduce) { .cw .kartica { animation: none; } }
        .cw .kartica-neobvezno { background: transparent; border: 1px dashed rgba(17,17,17,.22); box-shadow: none; margin-top: -.4rem; }
        .cw .prav-razlaga { margin: 0 0 1.1rem; border: 1px solid rgba(17,17,17,.14); border-radius: 12px; background: rgba(178,84,118,.05); overflow: hidden; }
        .cw .prav-razlaga > summary { list-style: none; cursor: pointer; padding: .8rem 1rem; font-weight: 600; font-size: .92rem; color: var(--ink); display: flex; align-items: center; gap: .5rem; }
        .cw .prav-razlaga > summary::-webkit-details-marker { display: none; }
        .cw .prav-razlaga > summary::before { content: "＋"; color: var(--accent); font-weight: 700; }
        .cw .prav-razlaga[open] > summary::before { content: "－"; }
        .cw .prav-razlaga-telo { padding: 0 1rem 1rem; }
        .cw .prav-razlaga-telo p { margin: .2rem 0 .6rem; font-size: .9rem; line-height: 1.5; color: var(--ink); }
        .cw .prav-razlaga-telo ul { margin: .2rem 0 .6rem; padding-left: 1.1rem; }
        .cw .prav-razlaga-telo li { margin: .35rem 0; font-size: .9rem; line-height: 1.5; color: var(--ink); }
        .cw .prav-razlaga-telo li::marker { color: var(--accent); }
        .cw .prav-razlaga-vir { font-size: .82rem !important; color: rgba(17,17,17,.6) !important; margin-bottom: 0 !important; }
        .cw .prav-tabela { display: flex; flex-direction: column; }
        .cw .prav-vrsta { display: grid; grid-template-columns: minmax(0,1fr) auto auto auto; align-items: center; gap: .8rem; padding: .7rem 0; border-bottom: 1px solid rgba(17,17,17,.1); }
        .cw .prav-ime { font-weight: 650; font-size: .98rem; color: var(--ink); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .cw .prav-ime small { font-weight: 500; color: rgba(17,17,17,.45); font-size: .78rem; }
        .cw .prav-podr { border: 1px solid rgba(17,17,17,.2); background: transparent; color: rgba(17,17,17,.6); font-family: inherit; font-size: .76rem; font-weight: 600; border-radius: 999px; padding: .28rem .7rem; cursor: pointer; white-space: nowrap; transition: border-color .15s, color .15s; }
        .cw .prav-podr:hover { border-color: var(--ink); color: var(--ink); }
        .cw .prav-recept { border: none; border-bottom: 1px solid rgba(17,17,17,.35); background-color: transparent; font-family: inherit; font-weight: 600; font-size: .9rem; color: var(--ink); padding: .3rem 1.4rem .3rem .2rem; appearance: none; -webkit-appearance: none; cursor: pointer; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%23111' stroke-width='1.5'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right .1rem center; }
        .cw .prav-cena { font-family: var(--font-bodoni), serif; font-weight: 600; font-variant-numeric: tabular-nums; font-size: 1.05rem; min-width: 3.6rem; text-align: right; }
        .cw .prav-skupaj { display: flex; justify-content: space-between; align-items: baseline; margin-top: .9rem; padding-top: .8rem; border-top: 2px solid var(--ink); }
        .cw .prav-skupaj b { font-family: var(--font-bodoni), serif; font-size: 1.2rem; font-weight: 600; font-variant-numeric: tabular-nums; }
        @media (max-width: 560px) { .cw .prav-vrsta { grid-template-columns: 1fr auto; grid-template-areas: 'ime cena' 'recept podr'; } .cw .prav-ime { grid-area: ime; } .cw .prav-cena { grid-area: cena; } .cw .prav-recept { grid-area: recept; } .cw .prav-podr { grid-area: podr; justify-self: end; } }
        .cw .kartica > .k-naslov { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: .3rem 1rem; margin: 0 0 1.1rem; font-weight: 600; font-size: 1.12rem; color: var(--ink); }
        .cw .kartica > .k-naslov .vec, .cw .profil-sekcija .k-naslov .vec { font-size: .82rem; font-weight: 500; color: rgba(17,17,17,.55); text-transform: none; letter-spacing: 0; }
        .cw .kartica > .hint { margin-top: 1rem; }
        .cw .dodaj-gumb { display: inline-flex; align-items: center; gap: .4rem; font-family: inherit; font-size: .9rem; font-weight: 600; color: var(--ink); background: transparent; border: 1px dashed rgba(17,17,17,.35); border-radius: 999px; padding: .55rem 1.1rem; cursor: pointer; transition: border-color .18s ease, background .18s ease; }
        .cw .dodaj-gumb:hover { border-color: var(--ink); background: rgba(17,17,17,.03); }
        .cw .narocnik-nedavni { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; margin-top: 1.1rem; }
        .cw .narocnik-nedavni .vec { font-size: .78rem; font-weight: 500; color: rgba(17,17,17,.55); margin-right: .1rem; }
        .cw .narocnik-chip { font-family: inherit; font-size: .78rem; font-weight: 500; padding: .4rem .85rem; border-radius: 999px; border: 1px dashed rgba(17,17,17,.3); background: transparent; color: rgba(17,17,17,.72); cursor: pointer; transition: border-color .15s ease, color .15s ease; }
        .cw .narocnik-chip:hover { border-color: var(--ink); color: var(--ink); }
        .cw .ure-preklop { display: flex; align-items: flex-start; gap: .6rem; margin: 0 0 1rem; font-size: .9rem; font-weight: 600; color: var(--ink); cursor: pointer; max-width: 640px; }
        .cw .ure-preklop input { margin-top: .2rem; width: 1.05rem; height: 1.05rem; accent-color: var(--ink); cursor: pointer; }
        .cw .ure-preklop em { font-style: normal; font-weight: 400; color: rgba(17,17,17,.62); }
        .cw .vp small { display: block; margin-bottom: .35rem; font-size: .78rem; letter-spacing: .14em; text-transform: uppercase; color: var(--accent); font-weight: 700; }
        .cw .vp label { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: .4rem 1rem; margin-bottom: .8rem; font-weight: 600; font-size: 1.12rem; color: var(--ink); }
        .cw .vp textarea { min-height: 84px; font-family: var(--font-sans), system-ui, sans-serif; font-size: 1.05rem; line-height: 1.55; background: var(--paper); border: 1px solid rgba(17,17,17,.15); border-radius: 10px; padding: .9rem 1rem; }
        .cw .svoje-vrsta { display: inline-flex; align-items: center; gap: .5rem; }
        .cw .vp .vp-svoje { width: 210px; align-self: center; border: none; border-bottom: 1px solid rgba(17,17,17,.45); background: transparent; font-family: var(--font-sans), system-ui, sans-serif; font-weight: 600; font-size: 1.05rem; padding: .3rem 0 .4rem; color: var(--ink); border-radius: 0; }
        .cw .vp .vp-svoje:focus { outline: none; border-bottom: 2px solid var(--ink); margin-bottom: -1px; }
        .cw .vp .vp-svoje::placeholder { color: rgba(17,17,17,.45); font-weight: 400; }
        .cw .checkgrid { display: flex; flex-wrap: wrap; gap: .8rem .55rem; margin: .15rem 0 .75rem; }
        .cw .checkgrid label { display: inline-flex; align-items: center; gap: .5rem; margin: 0; border: 1px solid rgba(17,17,17,.35); border-radius: 999px; padding: .65rem 1.1rem; font-size: 1rem; line-height: 1.25; font-weight: 500; cursor: pointer; transition: transform .2s cubic-bezier(0.23,1,0.32,1), border-color .15s ease, background .15s ease, color .15s ease; }
        .cw .checkgrid label:hover { border-color: var(--ink); transform: translateY(-2px); }
        .cw .checkgrid label:active { transform: translateY(0) scale(.96); }
        .cw .checkgrid label:has(input:checked) { background: var(--accent); border-color: var(--accent); color: #fff; }
        .cw .checkgrid input[type='checkbox'] { appearance: none; -webkit-appearance: none; width: 1.05em; height: 1.05em; margin: 0; border: 1.5px solid rgba(17,17,17,.5); border-radius: 2px; flex: none; background: transparent; }
        .cw .checkgrid input[type='checkbox']:checked { border-color: transparent; background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M2 8.5 6 12.5 14 3.5' fill='none' stroke='%23fff' stroke-width='2.4' stroke-linecap='round'/%3E%3C/svg%3E") center / 100% no-repeat; }
        .cw .checkgrid input { margin-top: .15rem; accent-color: var(--ink); }
        .cw .choicegrid { display: flex; flex-wrap: wrap; gap: .8rem .55rem; margin: .15rem 0 .2rem; }
        .cw .choicegrid button { display: inline-flex; align-items: center; gap: .5rem; border: 1px solid rgba(17,17,17,.35); background: transparent; color: var(--ink); border-radius: 999px; padding: .65rem 1.1rem; font-family: inherit; font-size: 1rem; font-weight: 500; cursor: pointer; transition: transform .15s ease, border-color .15s ease, background .15s ease, color .15s ease; }
        .cw .choicegrid button:hover { border-color: var(--ink); transform: translateY(-2px); }
        .cw .choicegrid button:active { transform: translateY(0) scale(.96); }
        .cw .kljucek { width: 1.05em; height: 1.05em; border: 1.5px solid rgba(17,17,17,.5); border-radius: 2px; display: inline-flex; align-items: center; justify-content: center; font-size: .78em; line-height: 1; flex: none; }
        .cw .choicegrid button.on .kljucek { border-color: transparent; font-size: .95em; }
        .cw .krogec { width: 1.02em; height: 1.02em; border: 1.5px solid rgba(17,17,17,.5); border-radius: 999px; display: inline-flex; flex: none; position: relative; }
        .cw .choicegrid button.on .krogec { border-color: #fff; background: #fff; box-shadow: inset 0 0 0 2.5px var(--accent); }
        .cw .vec-namig { font-weight: 400; font-size: .85rem; color: rgba(17,17,17,.65); margin-left: auto; white-space: nowrap; }
        .cw .choicegrid button.on { background: var(--accent); border-color: var(--accent); color: #fff; }

        .cw .paketi { display: grid; grid-template-columns: 1fr 1.15fr 1fr; margin: 1.4rem 0; background: #FCFBF7; border: 1px solid rgba(17,17,17,.08); border-radius: 20px; overflow: hidden; box-shadow: 0 4px 18px rgba(17,17,17,.04); }
        .cw .paketi.paketi-ena { grid-template-columns: 1fr; max-width: 460px; }
        .cw .cena-urna { max-width: none; }
        @media (max-width: 640px) { .cw .paketi { grid-template-columns: 1fr; } }
        .cw .paket { padding: 1.7rem 1.4rem 1.8rem; position: relative; }
        /* svincnik zgoraj desno — rocni popravek cene paketa */
        .cw .paket-edit { position: absolute; top: 1.1rem; right: 1.1rem; display: inline-flex; align-items: center; justify-content: center; width: 1.9rem; height: 1.9rem; border-radius: 50%; border: 1px solid rgba(17,17,17,.18); background: transparent; color: rgba(17,17,17,.55); cursor: pointer; transition: color .18s ease, border-color .18s ease, background .18s ease; }
        .cw .paket-edit:hover { color: var(--ink); border-color: var(--ink); }
        .cw .paket.mid .paket-edit { border-color: rgba(245,242,234,.4); color: rgba(245,242,234,.85); }
        .cw .paket.mid .paket-edit:hover { color: var(--paper); border-color: var(--paper); background: rgba(245,242,234,.12); }
        .cw .paket-cena-uredi { display: flex; align-items: baseline; gap: .35rem; margin: .5rem 0 .55rem; }
        .cw .paket-cena-uredi input { width: 5.5rem; border: none; border-bottom: 2px solid currentColor; background: transparent; font-family: var(--font-serif), Didot, serif; font-size: clamp(1.7rem, 4vw, 2.3rem); font-weight: 700; letter-spacing: -.01em; padding: 0 0 .1rem; color: inherit; border-radius: 0; }
        .cw .paket-cena-uredi input:focus { outline: none; }
        .cw .paket-cena-uredi .pe-znak { font-family: var(--font-serif), serif; font-size: 1.4rem; font-weight: 700; }
        .cw .paket-rocno { font-size: .6rem; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; opacity: .7; margin: -.35rem 0 .5rem; }
        .cw .paket-reset { font-size: .75rem; margin: 0 0 .6rem; color: inherit; opacity: .8; }
        .cw .paket.mid .paket-reset { color: var(--paper); }
        .cw .paket + .paket { border-left: 1px solid rgba(17,17,17,.4); }
        @media (max-width: 640px) { .cw .paket + .paket { border-left: none; border-top: 1px solid rgba(17,17,17,.4); } }
        .cw .paket.mid { background: var(--accent); color: var(--paper); }
        .cw .paket.mid + .paket { border-color: rgba(245,242,234,.4); }
        .cw .paket h3 { margin: 0; font-size: .7rem; letter-spacing: .2em; text-transform: uppercase; font-weight: 600; opacity: .85; }
        .cw .paket .redna { font-family: var(--font-serif), serif; font-size: 1.05rem; text-decoration: line-through; opacity: .62; margin-top: .5rem; margin-bottom: -.4rem; -webkit-text-stroke: 0.3px currentColor; }
        .cw .paket .znesek { font-family: var(--font-serif), Didot, serif; font-size: clamp(2rem, 4.5vw, 2.6rem); font-weight: 700; margin: .5rem 0 .55rem; letter-spacing: -.01em; -webkit-text-stroke: 0.4px currentColor; }
        .cw .paket p { margin: 0; font-size: .9rem; line-height: 1.6; opacity: .8; }
        .cw .paket.mid p { opacity: .88; }
        .cw .razlaga { font-size: .98rem; color: rgba(17,17,17,.75); line-height: 1.7; margin: 1.5rem 0 0; max-width: 64ch; }
        .cw .razlaga b { color: var(--ink); font-weight: 600; }

        .cw textarea { width: 100%; min-height: 320px; border: 1px solid rgba(17,17,17,.25); background: rgba(255,255,255,.5); font-family: ui-monospace, Menlo, monospace; font-size: .8rem; line-height: 1.6; padding: 1.4rem; resize: vertical; color: var(--ink); border-radius: 0; }
        .cw textarea:focus { outline: none; border-color: var(--ink); }
        .cw .tonbar { display: inline-flex; flex-wrap: nowrap; gap: .3rem; align-items: center; max-width: 100%; margin: .1rem .9rem .75rem 0; padding: .25rem; border: 1px solid rgba(17,17,17,.16); border-radius: 999px; background: rgba(255,255,255,.34); }
        .cw .tonbar button { height: 2rem; border: none; border-radius: 999px; background: transparent; color: rgba(17,17,17,.68); padding: 0 .85rem; font-family: var(--font-sans), system-ui, sans-serif; font-size: .72rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; white-space: nowrap; cursor: pointer; }
        .cw .tonbar button:hover { color: var(--ink); background: rgba(17,17,17,.05); }
        .cw .tonbar button.on { background: var(--ink); color: var(--paper); }
        @media (max-width: 560px) {
          .cw .tonbar { display: flex; overflow-x: auto; }
          .cw .tonbar button { flex: 1 0 auto; }
        }
        .cw .orodjarna { position: relative; display: flex; flex-wrap: wrap; gap: .45rem; align-items: center; margin: 1rem 0 .8rem; }
        .cw .oznaci-namig { position: absolute; top: -2.5rem; left: 1rem; background: var(--ink); color: var(--paper); font-size: .8rem; font-weight: 600; padding: .4rem .85rem; border-radius: 999px; white-space: nowrap; box-shadow: 0 8px 22px rgba(17,17,17,.22); z-index: 6; pointer-events: none; animation: cwFade .16s ease both; }
        .cw .oznaci-namig::after { content: ''; position: absolute; bottom: -5px; left: 1.4rem; border: 5px solid transparent; border-top-color: var(--ink); border-bottom: 0; }
        .cw .tool { min-height: 2.25rem; display: inline-flex; align-items: center; gap: .4rem; border: 1px solid rgba(17,17,17,.22); background: rgba(255,255,255,.32); color: var(--ink); border-radius: 999px; padding: 0 .75rem; font-family: inherit; font-weight: 600; font-size: .78rem; cursor: pointer; }
        .cw .tool:hover { border-color: var(--ink); }
        .cw .tool-vel { gap: .3rem; padding: 0 .5rem 0 .7rem; }
        .cw .tool-vel .tv-aa { font-weight: 700; font-size: .82rem; }
        .cw .tool-vel button { border: none; background: rgba(17,17,17,.07); border-radius: 6px; width: 1.5rem; height: 1.35rem; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; color: var(--ink); padding: 0; }
        .cw .tool-vel button:hover { background: var(--ink); color: var(--paper); }
        .cw .tool-ikona { padding: 0 .6rem; }
        .cw .pisava-select { min-height: 2.25rem; border: 1px solid rgba(17,17,17,.22); background-color: rgba(255,255,255,.32); color: var(--ink); border-radius: 999px; padding: 0 1.7rem 0 .9rem; font-family: inherit; font-weight: 600; font-size: .78rem; cursor: pointer; appearance: none; -webkit-appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%23111' stroke-width='1.5'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right .7rem center; }
        .cw .barva-cilj { gap: 0; padding: 0; overflow: hidden; }
        .cw .barva-cilj button { border: none; background: transparent; color: var(--ink); font-family: inherit; font-weight: 600; font-size: .74rem; padding: .5rem .72rem; cursor: pointer; min-height: 2.25rem; transition: background .15s; }
        .cw .barva-cilj button.on { background: var(--ink); color: var(--paper); }
        /* PRENOVLJENI TOOLBAR PONUDBE */
        .cw .pon-vrh { display: flex; flex-wrap: wrap; align-items: center; gap: .8rem; margin: .4rem 0 1rem; }
        .cw .segpills { display: inline-flex; background: rgba(255,255,255,.55); border: 1px solid rgba(17,17,17,.1); border-radius: 999px; padding: .3rem; gap: .2rem; }
        .cw .segpills button { border: none; background: transparent; color: var(--ink); font-family: inherit; font-weight: 700; font-size: .76rem; letter-spacing: .04em; text-transform: uppercase; padding: .58rem 1.05rem; border-radius: 999px; cursor: pointer; transition: background .18s, color .18s; }
        .cw .segpills button.on { background: var(--ink); color: var(--paper); }
        .cw .pon-vrh-desno { margin-left: auto; display: inline-flex; align-items: center; gap: .8rem; }
        .cw .ponastavi-gumb { opacity: .38; }
        .cw .ponastavi-gumb.aktiv { opacity: 1; }
        .cw .ponastavi-gumb:hover { opacity: 1; }
        .cw .ai-gumb { width: 2.9rem; height: 2.9rem; border-radius: 50%; border: 1px solid rgba(17,17,17,.14); background: rgba(255,255,255,.55); color: var(--ink); display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: transform .2s, background .18s, color .18s; }
        .cw .ai-gumb:hover { background: var(--ink); color: var(--paper); transform: scale(1.06); }
        .cw .ai-namig { background: rgba(124,58,237,.09); border-radius: 12px; padding: .7rem .9rem; margin: -.3rem 0 1rem; }
        .cw .tool-krog { width: 2.6rem; height: 2.6rem; border-radius: 50%; border: none; background: rgba(17,17,17,.06); color: var(--ink); font-family: inherit; font-weight: 700; font-size: .82rem; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: background .15s, color .15s; padding: 0; }
        .cw .tool-krog:hover { background: var(--ink); color: var(--paper); }
        .cw .tool-vel2 { display: inline-flex; align-items: center; gap: .3rem; }
        .cw .tool-vel2 .tv-aa { font-weight: 700; font-size: .9rem; }
        .cw .tool-t.on { background: var(--ink); color: var(--paper); }
        .cw .tool-t .ti { font-weight: 800; font-size: .92rem; line-height: 1; }
        .cw .tool-t .ti-box { border: 2px solid currentColor; border-radius: 3px; padding: 0 .1em; }
        .cw .tool-locnica { width: 1px; height: 1.7rem; background: rgba(17,17,17,.16); margin: 0 .2rem; }
        .cw .barvica-mavrica { background: conic-gradient(from 0deg, #FA4892, #F8E71C, #50E3C2, #7C3AED, #FA4892); border-color: rgba(17,17,17,.25); }
        .cw .barvica { width: 1.35rem; height: 1.35rem; border-radius: 999px; border: 1px solid rgba(17,17,17,.22); cursor: pointer; }
        .cw .editor { width: 100%; min-height: 340px; border: 1px solid rgba(17,17,17,.25); background: rgba(255,255,255,.72); padding: 1.35rem; color: var(--ink); font-family: var(--font-sans), system-ui, sans-serif; font-size: .94rem; line-height: 1.62; font-weight: 400; -webkit-text-stroke: 0.28px currentColor; overflow: auto; }
        .cw .editor:focus { outline: none; border-color: var(--ink); }
        .cw .editor b, .cw .editor strong { font-weight: 900; color: var(--ink); }
        .cw .editor h1 b, .cw .editor h1 strong { font-weight: 900; }
        .cw .editor h1 { margin: 0 0 1.1rem; font-family: var(--font-serif), Didot, serif; font-size: clamp(2rem, 5vw, 3.4rem); line-height: .98; font-weight: 500; letter-spacing: -.01em; }
        .cw .editor .offer-kicker { margin: 1.2rem 0 .4rem; font-size: .78rem; font-weight: 800; letter-spacing: .22em; text-transform: uppercase; color: var(--ink); }
        .cw .editor h2 { margin: 3rem 0 1rem; font-size: .76rem; line-height: 1.2; font-weight: 800; letter-spacing: .18em; text-transform: uppercase; border-top: 1px solid rgba(17,17,17,.18); padding-top: 1.4rem; }
        .cw .editor h2:first-child { margin-top: 0; }
        .cw .editor h3 { margin: 0 0 .45rem; font-family: var(--font-serif), Didot, serif; font-size: clamp(1.25rem, 3vw, 1.75rem); line-height: 1.1; font-weight: 500; }
        .cw .editor p { margin: 0 0 1.1rem; max-width: 72ch; }
        .cw .editor ul { margin: 0 0 1.5rem; padding-left: 1.25rem; list-style: disc; }
        .cw .editor li { margin: .25rem 0; }
        .cw .editor li::marker { color: var(--ink); }
        .cw #cw-naziv { font-size: 1.35rem; font-weight: 700; }
        .cw .editor hr { border: 0; border-top: 1px solid rgba(17,17,17,.2); margin: 1rem 0; }
        .cw .editor .offer-package { border: 1px solid rgba(17,17,17,.18); background: rgba(236,230,213,.34); padding: .95rem 1rem; margin: .65rem 0; }
        .cw .editor .offer-package-head { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; margin-bottom: .35rem; }
        .cw .editor .offer-package h3 { margin: 0; font-family: var(--font-sans), system-ui, sans-serif; font-size: .78rem; line-height: 1.2; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }
        .cw .editor .offer-package strong { font-family: var(--font-serif), Didot, serif; font-size: 1.35rem; line-height: 1; font-weight: 500; white-space: nowrap; }
        .cw .editor .offer-podnaslov { font-weight: 700; margin: .9rem 0 .4rem; }
        .cw .editor .offer-vrstica { display: flex; justify-content: space-between; align-items: baseline; gap: 1.5rem; }
        .cw .editor .offer-cena { white-space: nowrap; font-weight: 700; }
        .cw .editor .offer-package p { margin: .55rem 0 0; max-width: none; font-weight: 700; color: var(--ink); }
        .cw .editor .offer-package ul { margin: .45rem 0 0; padding-left: 1.05rem; }
        .cw .editor .offer-package li { margin: .22rem 0; color: var(--ink); }
        .cw .btnvrsta { display: flex; gap: 1.4rem; flex-wrap: wrap; margin-top: 1.2rem; align-items: center; }
        .cw .gumb { font-family: inherit; font-size: .82rem; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; cursor: pointer; border-radius: 999px; padding: .95rem 2.2rem; border: 1px solid var(--ink); background: var(--ink); color: var(--paper); transition: opacity .18s ease; display: inline-flex; align-items: center; justify-content: center; gap: .45rem; }
        .cw .gumb { transition: transform .2s ease, box-shadow .2s ease; }
        .cw .gumb:hover { transform: scale(1.06); box-shadow: 0 8px 22px rgba(35,18,45,.18); }
        .cw .gumb:active { transform: scale(.97); }
        .cw .gumb:active { transform: translateY(0) scale(.97); }
        .cw .gumb:disabled { opacity: .35; cursor: default; }
        .cw .povezava { font-family: inherit; font-size: .88rem; font-weight: 500; cursor: pointer; border: none; background: none; color: var(--ink); text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: .28em; padding: 0; display: inline-flex; align-items: center; gap: .38rem; }
        .cw .povezava-roza { color: #8a3d5c; }
        .cw .povezava-roza:hover { color: var(--accent); }
        .cw .povezava:hover { opacity: .6; }


        .cw .noga { position: fixed; bottom: 0; left: 0; right: 0; display: flex; justify-content: center; padding: 1rem clamp(1.2rem, 4vw, 3rem) 1.1rem; background: linear-gradient(to top, var(--paper) 70%, transparent); z-index: 62; }
        .cw .noga .noga-c { width: 100%; display: flex; align-items: center; justify-content: center; gap: 1rem; }
        .cw .noga .noga-gumbi { display: flex; align-items: center; gap: .8rem; }
        .cw .gumb-nazaj { width: 3.1rem; height: 3.1rem; border-radius: 999px; border: 1px solid var(--ink); background: transparent; color: var(--ink); font-size: 1.15rem; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: background .18s ease, color .18s ease; flex: none; }
        .cw .gumb-nazaj:hover { background: var(--ink); color: var(--paper); transform: scale(1.08); }
        .cw .gumb-nazaj:active { transform: scale(.95); }
        .cw .gumb-nazaj { transition: background .18s ease, color .18s ease, transform .2s ease; }
        .cw .noga .nazaj-g { font-family: inherit; font-size: .82rem; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; border: none; background: none; cursor: pointer; color: rgba(17,17,17,.72); padding: .6rem 0; }
        .cw .noga .nazaj-g:hover { color: var(--ink); }
        .cw .noga-koncna { display: flex; align-items: center; gap: .9rem; }
        .cw .noga .noga-koncna .nazaj-g { border: 1px solid var(--ink); border-radius: 999px; padding: .65rem 1.3rem; transition: background .18s ease, color .18s ease, transform .2s cubic-bezier(0.23,1,0.32,1); }
        .cw .noga .noga-koncna .nazaj-g:hover { background: var(--ink); color: var(--paper); transform: translateY(-2px); }
        .cw .noga .nazaj-g.nova { color: var(--accent); border-color: var(--accent); }
        .cw .noga .nazaj-g.nova:hover { background: var(--accent); color: var(--paper); }
        @media (max-width: 640px) {
          .cw .noga-koncna { flex-direction: column; align-items: stretch; gap: .6rem; }
          .cw .noga .noga-koncna .nazaj-g { text-align: center; }
        }
        .cw .a11y { position: fixed; left: clamp(1.2rem, 4vw, 3rem); bottom: 4.9rem; z-index: 61; }
        .cw .a11y-btn { width: 2.8rem; height: 2.8rem; border-radius: 999px; border: 1px solid color-mix(in oklab, var(--accent) 40%, transparent); background: color-mix(in oklab, var(--paper) 92%, white); color: var(--ink); display: inline-flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 .7rem 1.8rem rgba(17,17,17,.08); }
        .cw .a11y-btn:hover { border-color: color-mix(in oklab, var(--accent) 72%, transparent); }
        .cw .a11y-panel { position: absolute; left: 0; bottom: 3.4rem; width: min(27rem, calc(100vw - 2.4rem)); max-height: min(70dvh, 34rem); overflow: auto; border: 1px solid rgba(17,17,17,.22); background: color-mix(in oklab, var(--paper) 98%, white); padding: 1rem 1.1rem; box-shadow: 0 1rem 2.4rem rgba(17,17,17,.14); }
        .cw .a11y-panel h2 { margin: 0 0 .7rem; font-family: var(--font-sans), system-ui, sans-serif; font-size: .82rem; line-height: 1.2; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; color: var(--ink); }
        .cw .a11y-panel h3 { margin: .9rem 0 .35rem; font-family: var(--font-sans), system-ui, sans-serif; font-size: .82rem; line-height: 1.25; font-weight: 800; color: var(--ink); }
        .cw .a11y-panel p { margin: 0 0 .6rem; font-size: .9rem; line-height: 1.5; color: rgba(17,17,17,.9); }
        .cw .a11y-panel ul { margin: 0; padding-left: 1.05rem; }
        .cw .a11y-panel li { margin: .34rem 0; font-size: .9rem; line-height: 1.48; color: rgba(17,17,17,.9); }
        .cw .a11y-close { position: absolute; top: .85rem; right: .9rem; border: none; background: none; padding: .2rem; font-family: inherit; font-size: 1rem; line-height: 1; cursor: pointer; color: var(--ink); }
        @media (max-width: 760px) {
          .cw .glava { padding-top: .8rem; padding-bottom: .8rem; }
          /* "Kalkulator BETA" ostane viden tudi na mobilnem (sam "BETA" nic ne
             pove); na ozkih zaslonih skrijemo besedo "Zapri", ostane ✕ */
          .cw .glava .zapri-loceno { font-size: 0; padding-left: .7rem; gap: 0; }
          .cw .glava .zapri-loceno::before { content: "✕"; font-size: .82rem; }
          .cw .oder { align-items: flex-start; padding-top: 5.4rem; padding-bottom: 8rem; }
          .cw h1 { padding-left: 1.65rem; font-size: clamp(2.15rem, 11vw, 2.85rem); line-height: .98; margin-bottom: .6rem; }
          .cw .h1-step { position: absolute; top: 0; left: calc(-1 * clamp(1.2rem, 4vw, 3rem)); width: 2.15rem; height: 2.05rem; display: inline-flex; align-items: center; justify-content: center; background: var(--ink); color: var(--paper); border-radius: 0 .35rem .35rem 0; font-size: .62rem; letter-spacing: .08em; }
          .cw .sub-vrsta { margin-bottom: 1.7rem; gap: .8rem; flex-wrap: nowrap; align-items: baseline; }
          .cw .sub { flex: 1 1 auto; font-size: .94rem; line-height: 1.5; }
          .cw .sub-vrsta .op-edit { margin-left: auto; text-align: right; flex: none; white-space: nowrap; justify-content: flex-end; line-height: 1.25; font-size: .66rem; letter-spacing: .13em; }
          .cw .opts { display: flex; flex-wrap: wrap; gap: .45rem; }
          .cw .pill { min-width: 0; min-height: 2.75rem; flex: 1 1 calc(50% - .45rem); padding: .68rem .68rem; gap: .42rem; font-size: .78rem; line-height: 1.18; border-radius: 1.25rem; }
          .cw .pill small { font-size: .66rem; line-height: 1.2; }
          .cw .pill-fill { left: .68rem; width: 1.8rem; height: 1.8rem; }
          .cw .pill.on .pill-fill { transform: translateY(-50%) scale(14); }
          .cw .pill .pi { width: 1.8rem; height: 1.8rem; }
          .cw .pill .pi svg { width: 18px; height: 18px; }
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
            <div className="soglasje-tocke">
              <div className="sg-blok">
                <h3 className="sg-h">Priporočene cene</h3>
                <p className="sg-t">So pametno izhodišče, ne uradni cenik — nastale so iz izkušenj, tržno bazo pa šele gradimo. Svobodno jih prilagodi; končna cena v tvojih ponudbah je vedno tvoja odločitev in tvoja odgovornost.</p>
              </div>
              <div className="sg-blok">
                <h3 className="sg-h">Shranjeno pri tebi</h3>
                <p className="sg-t">Tvoje cene, postavke in podatki ostanejo shranjeni samo v tvojem brskalniku — pri nas se nič ne shrani.</p>
              </div>
              <div className="sg-blok">
                <h3 className="sg-h">Vedno anonimno</h3>
                <p className="sg-t">Ob prikazu izračuna anonimno zabeležimo le izbrane kategorije in zneske — <b>brez imena, e-naslova ali IP-naslova</b>, nikoli povezano s teboj.</p>
              </div>
            </div>
            <div className="sg-motiv">
              <span className="sg-motiv-ozn">★ Kaj imaš od tega</span>
              <p>Skupaj gradimo <b>prvo statistiko cen za kreativce</b>: ko bo baza dovolj velika, boš videl, <b>koliko kolegi s tvojimi izkušnjami dejansko računajo</b> — česar danes ne pove nihče.</p>
            </div>
            <div className="soglasje-email">
              <label className="se-preklop">
                <span className="se-tekst">
                  <EnvelopeSimple size={20} className="se-ikona" aria-hidden />
                  <span>Obveščajte me o orodju in nasvetih za kreativce <em>(neobvezno)</em></span>
                </span>
                <span className="se-toggle">
                  <input type="checkbox" checked={zeliEmail} onChange={e => setZeliEmail(e.target.checked)} />
                  <span className="se-slider" aria-hidden />
                </span>
              </label>
              {zeliEmail && (
                <>
                  <div className="numgrid" style={{ marginTop: '.9rem' }}>
                    <div className="polje">
                      <label htmlFor="cw-sglime">Ime</label>
                      <input id="cw-sglime" value={leadIme} onChange={e => setLeadIme(e.target.value)} placeholder="Tvoje ime" />
                    </div>
                    <div className="polje">
                      <label htmlFor="cw-sglemail">Email</label>
                      <input id="cw-sglemail" type="email" value={leadEmail} onChange={e => setLeadEmail(e.target.value)} placeholder="ti@primer.si" />
                    </div>
                  </div>
                  <p className="se-note">Ločeno od anonimne statistike zgoraj. Email uporabimo samo za obvestila; kadar koli se lahko odjaviš.</p>
                </>
              )}
            </div>
            <div className="soglasje-gumbi">
              <button type="button" className="gumb" onClick={sprejmiPogoje}>Razumem, gremo →</button>
              <a className="povezava" href={localePath(locale, `/kalkulator/pogoji`)}>Preberi celotne pogoje</a>
            </div>
          </div>
        </div>
      )}

      {onboardingOdprt && (
        <div className="onboarding" role="dialog" aria-modal="true" aria-label="Katere storitve ponujaš" data-lenis-prevent>
          <div className="glava glava-ozka">{glavaUI()}</div>
          <div className="oder">
            <div className="korak-vsebina">
              <p className="ob-kicker">Kalkulator za pošteno ceno in ponudbo</p>
              <h1 className="ob-naslov">S čim se ukvarjaš?</h1>
              <p className="sub" style={{ marginBottom: '2rem' }}>To nastaviš enkrat. Izberi svoja področja dela — pripadajoče storitve postavimo v ospredje, ostale skrijemo (do njih prideš z enim klikom). Kadar koli lahko urediš ali preskočiš.</p>
              <div className="izbira izbira-3 izbira-podrocja">
                {PODROCJA.map(p => (
                  <button key={p.id} type="button"
                    className={obIzbor.has(p.id) ? 'on' : ''}
                    onClick={() => preklopi(obIzbor, p.id, setObIzbor)}>
                    <span className="pod-fill" aria-hidden />
                    <span className="pod-glava">
                      <span className="pod-ikona">{PODROCJE_IKONA[p.id]}</span>
                      <h3>{p.ime}</h3>
                    </span>
                    <p>{p.opis}</p>
                  </button>
                ))}
              </div>
              <div className="onboarding-noga onboarding-noga-vrsta">
                <button type="button" className="povezava" onClick={preskociOnboarding}>Preskoči</button>
                <button type="button" className="gumb" onClick={shraniOnboarding} disabled={obIzbor.size === 0}>Shrani in začni →</button>
              </div>
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

      <div className="glava glava-ozka">{glavaUI()}</div>

      {kazemProfil && (
        <>
          <div className="profil-zastor" onClick={() => { setKazemProfil(false); setProfilPogled('meni'); }} aria-hidden />
          <div className="profil-predal" role="dialog" aria-modal="true" aria-label="Profil" data-lenis-prevent>
            <div className="profil-glava">
              <div className="profil-glava-zapri">
                <button type="button" className="op-edit" onClick={() => { setKazemProfil(false); setProfilPogled('meni'); }}>✕ Zapri</button>
              </div>
              <h2 className="profil-glava-naslov">
                {profilPogled !== 'meni' && (
                  <button type="button" className="profil-nazaj"
                    onClick={() => profilPogled === 'podjetje-urejanje' ? zapriUrejanjePodjetja() : setProfilPogled('meni')}
                    aria-label="Nazaj na profil">←</button>
                )}
                {profilPogled === 'meni' ? 'Profil'
                  : profilPogled === 'moji-podatki' ? 'Moji podatki'
                  : profilPogled === 'zgodovina' ? 'Zgodovina ponudb'
                    : profilPogled === 'podjetja' ? 'Moje podjetje'
                      : profilPogled === 'podjetje-urejanje' ? (aktivnoPodjetje || 'Podjetje')
                        : profilPogled === 'cene-nastavitve' ? 'Cene in storitve'
                          : profilPogled === 'aplikacija' ? 'Nastavitve aplikacije'
                            : profilPogled === 'stroski' ? 'Moji stroški'
                              : profilPogled === 'obvestila' ? 'Obveščanja'
                                : 'Pomoč in kontakt'}
              </h2>
            </div>

            {profilPogled === 'meni' && (
              <div className="profil-meni">
                <button type="button" className="profil-meni-vrsta" onClick={() => setProfilPogled('moji-podatki')}>
                  <User size={20} weight="bold" />
                  <span>
                    <strong>Moji podatki</strong>
                    <small>ime, izkušnje, država in področja dela — kaj ponujaš in privzeta raven cen</small>
                  </span>
                  <span className="pm-puscica" aria-hidden>→</span>
                </button>
                <button type="button" className="profil-meni-vrsta" onClick={() => setProfilPogled('zgodovina')}>
                  <ClockCounterClockwise size={20} weight="bold" />
                  <span>
                    <strong>Zgodovina ponudb</strong>
                    <small>shranjene cele ponudbe za stranke{Object.keys(arhiv).length > 0 ? ` (${Object.keys(arhiv).length})` : ''}</small>
                  </span>
                  <span className="pm-puscica" aria-hidden>→</span>
                </button>
                <button type="button" className="profil-meni-vrsta" onClick={() => setProfilPogled('podjetja')}>
                  <Buildings size={20} weight="bold" />
                  <span>
                    <strong>Moje podjetje</strong>
                    <small>podatki v glavi ponudbe, DDV, urne postavke{Object.keys(podjetja).length > 0 ? ` · ${Object.keys(podjetja).length} shranjenih` : ''}</small>
                  </span>
                  <span className="pm-puscica" aria-hidden>→</span>
                </button>
                <button type="button" className="profil-meni-vrsta" onClick={() => setProfilPogled('cene-nastavitve')}>
                  <Gear size={20} weight="bold" />
                  <span>
                    <strong>Cene in storitve</strong>
                    <small>osnovne cene, razpored, izbris storitev + shranjeni ceniki{Object.keys(profili).length > 0 ? ` (${Object.keys(profili).length})` : ''}</small>
                  </span>
                  <span className="pm-puscica" aria-hidden>→</span>
                </button>
                <button type="button" className="profil-meni-vrsta" onClick={() => setProfilPogled('stroski')}>
                  <Wallet size={20} weight="bold" />
                  <span>
                    <strong>Moji stroški</strong>
                    <small>redni mesečni stroški (najem, oprema, programska …){stroski.length > 0 ? ` (${stroski.length})` : ''}</small>
                  </span>
                  <span className="pm-puscica" aria-hidden>→</span>
                </button>
                <button type="button" className="profil-meni-vrsta" onClick={() => setProfilPogled('obvestila')}>
                  <EnvelopeSimple size={20} weight="bold" />
                  <span>
                    <strong>Obveščanja</strong>
                    <small>{leadEmail ? `naročen na ${leadEmail}` : 'nisi naročen na obveščanje'}</small>
                  </span>
                  <span className="pm-puscica" aria-hidden>→</span>
                </button>
                <button type="button" className="profil-meni-vrsta" onClick={() => setProfilPogled('pomoc')}>
                  <UserCircle size={20} weight="bold" />
                  <span>
                    <strong>Pomoč in kontakt</strong>
                    <small>vprašanja, pogoji uporabe, pisanje meni osebno</small>
                  </span>
                  <span className="pm-puscica" aria-hidden>→</span>
                </button>
              </div>
            )}

            {profilPogled === 'aplikacija' && (
              <>
                <p className="ob-sub" style={{ margin: '0 0 1.2rem' }}>Prikaz vprašalnika in ponastavitve orodja.</p>
                <label className="se-preklop">
                  <span><b>Klasičen vprašalnik</b><br /><em style={{ fontWeight: 400 }}>namesto chat pogovora — korak za korakom, kot prej</em></span>
                  <span className="se-toggle">
                    <input type="checkbox" checked={klasicnaOblika} onChange={preklopiObliko} />
                    <span className="se-slider" aria-hidden />
                  </span>
                </label>
                <button type="button" className="povezava" style={{ marginTop: '1.4rem', display: 'block' }}
                  onClick={ponastaviVprasalnik}>↻ Ponastavi vprašalnik <span className="vec">znova te vpraša ime, trg, podjetje … (ohrani podjetja in cene)</span></button>
                <button type="button" className="profil-nevarno" onClick={ponastaviVse}>
                  Izbriši VSE podatke orodja (podjetja, cene, zgodovino) — celotna ponastavitev
                </button>
              </>
            )}

            {profilPogled === 'moji-podatki' && (
              <>
                <p className="ob-sub" style={{ margin: '0 0 1.3rem' }}>Tvoji osebni podatki — isti, ki jih izpolniš v uvodnem pogovoru. Samodejno se shranijo in določajo privzeto raven cen.</p>
                <div className="kartica">
                  <div className="polje" style={{ marginBottom: '1.4rem' }}>
                    <label htmlFor="mp-ime">Ime ali vzdevek</label>
                    <input id="mp-ime" type="text" placeholder="npr. Tina"
                      value={imeUporabnika} onChange={e => setImeUporabnika(e.target.value)} />
                  </div>
                  <div className="polje" style={{ marginBottom: '1.4rem' }}>
                    <label>Izkušnje</label>
                    <div className="opts">
                      {CHAT_IZK.map(o => (
                        <button key={o.id} type="button"
                          className={'pill' + (izkusnje === o.id ? ' on' : '')}
                          onClick={() => setIzkusnje(o.id)}>
                          <span className="pill-fill" aria-hidden />
                          <span className="pill-tekst">{o.ime}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="polje">
                    <label htmlFor="mp-drzava">Država <span className="vec">določi privzet trg / raven cen</span></label>
                    <input id="mp-drzava" type="text" list="cw-drzave-list" placeholder="npr. Slovenija"
                      value={custDrzavaMoj}
                      onChange={e => { const v = e.target.value; setCustDrzavaMoj(v); const t = trgIzDrzave(v); if (t) setMojTrg(t); }} />
                  </div>
                </div>
                <div className="kartica">
                  <div className="k-naslov">Področja dela <span className="vec">določijo, katere storitve so v ospredju</span></div>
                  <div className="chat-podrocja">
                    {PODROCJA.map(p => {
                      const bar = PODROCJE_BARVA[p.id] || '#7C3AED';
                      const on = obIzbor.has(p.id);
                      return (
                        <button key={p.id} type="button" className={'chip-podrocje' + (on ? ' on' : '')}
                          style={{ borderColor: on ? bar : 'rgba(17,17,17,.12)', boxShadow: on ? `0 6px 18px ${osvetli(bar, 0.5)}` : undefined }}
                          onClick={() => preklopiPodrocje(p.id)}>
                          <span className="pi-pod" aria-hidden style={{ background: osvetli(bar, 0.8), color: zatemni(bar, 0.55) }}>{PODROCJE_IKONA[p.id]}</span>
                          <b>{p.ime}</b>
                          <span className="chip-kljuk" aria-hidden style={{ borderColor: on ? bar : 'rgba(17,17,17,.2)', background: on ? bar : 'transparent' }}>{on ? '✓' : ''}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {profilPogled === 'zgodovina' && (
              Object.keys(arhiv).length === 0 ? (
                <p className="ob-sub" style={{ margin: 0 }}>Še nimaš shranjenih ponudb. Na koraku Tvoja ponudba klikni »Shrani ponudbo v arhiv«.</p>
              ) : (
                <div className="profil-seznam">
                  {Object.keys(arhiv).map(ime => (
                    <div key={ime} className="profil-vrsta">
                      <span className="pv-ime">{ime}</span>
                      <button type="button" className="povezava" onClick={() => { naloziIzArhiva(ime); setKazemProfil(false); setProfilPogled('meni'); }}>↺ Odpri</button>
                      <button type="button" className="brisi" title={'Izbriši ' + ime} onClick={() => izbrisiIzArhiva(ime)}>×</button>
                    </div>
                  ))}
                </div>
              )
            )}

            {profilPogled === 'podjetja' && (
              <>
                <p className="ob-sub" style={{ margin: '0 0 1rem' }}>Tvoji podatki za glavo ponudbe. Vpišeš enkrat, samodejno se shranijo — tu jih tudi kadarkoli popraviš. Če delaš za več podjetij, med njimi preklapljaš zgoraj.</p>
                {podatkiUI()}
                {urnePostavkeUI()}
              </>
            )}

            {profilPogled === 'podjetje-urejanje' && (
              <>
                {podatkiUI()}
                {urnePostavkeUI()}
                <button type="button" className="profil-nevarno" style={{ marginTop: '1rem' }}
                  onClick={() => aktivnoPodjetje && izbrisiPodjetje(aktivnoPodjetje)}>
                  Izbriši to podjetje
                </button>
              </>
            )}

            {profilPogled === 'cene-nastavitve' && (
              <>
                <p className="ob-sub" style={{ marginBottom: '.5rem' }}>Te cene so <b>podlaga za izračun</b> — privzete (slovenski trg) delujejo takoj, prilagodi jih svojim za točnejši rezultat. Razporedi (povleci ročaj ⣿) in izbriši (×), kar ne ponujaš; vrstni red velja tudi na prvem koraku.</p>
                <button type="button" className="povezava povezava-roza" style={{ marginBottom: '1.3rem' }} onClick={() => setProfilPogled('moji-podatki')}>↳ Uredi področja dela (v Moji podatki)</button>
                <div className="cene-seznam">
                  {poVrstnemRedu(vidneStoritve).map((s, i) => (
                    <div key={s.id} className="cene-vrsta" draggable
                      onDragStart={() => { dragIndex.current = i; }}
                      onDragOver={e => e.preventDefault()}
                      onDrop={() => { if (dragIndex.current !== null) premakniStoritev(dragIndex.current, i); dragIndex.current = null; }}>
                      <span className="drag-rocaj" aria-hidden><DotsSixVertical size={18} weight="bold" /></span>
                      <span className="cv-ime">{s.ime}</span>
                      <input type="number" min={0} step={50} value={osnovaZa(s)} aria-label={'Osnovna cena: ' + s.ime}
                        onChange={e => setOsnove({ ...osnove, [s.id]: Number(e.target.value) || 0 })} />
                      <span className="cv-znak">{vfx.znak}</span>
                      <button type="button" className="brisi" title={'Izbriši ' + s.ime}
                        onClick={() => odstraniStoritev(s.id)}>×</button>
                    </div>
                  ))}
                </div>
                {skrite.length > 0 && (
                  <div className="cene-skrite">
                    <span className="cs-oznaka">Izbrisano:</span>
                    {skrite.map(id => {
                      const st = STORITVE.find(x => x.id === id);
                      return st ? (
                        <button key={id} type="button" className="cs-chip" onClick={() => povrniStoritev(id)}>↩ {st.ime}</button>
                      ) : null;
                    })}
                  </div>
                )}
                <div className="cene-dodaj">
                  <input type="text" placeholder="Tvoja storitev (npr. tetovaža)" value={novaIme}
                    onChange={e => setNovaIme(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') dodajStoritev(); }} aria-label="Ime nove storitve" />
                  <input type="number" min={0} step={50} placeholder="cena" value={novaCena}
                    onChange={e => setNovaCena(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') dodajStoritev(); }} aria-label="Cena nove storitve" />
                  <button type="button" className="povezava" onClick={dodajStoritev}>+ dodaj</button>
                </div>

                {/* shranjeni ceniki (prej locen pogled "Cenovni profili") — posnetki celotnega cenika */}
                <div className="k-naslov" style={{ marginTop: '1.8rem', paddingTop: '1.4rem', borderTop: '1px solid rgba(17,17,17,.1)' }}>
                  Shranjeni ceniki <span className="vec">posnetek vseh cen — npr. »Cene za tujino«; naložiš ga v enem kliku</span>
                </div>
                {Object.keys(profili).length > 0 && (
                  <div className="profil-seznam" style={{ marginBottom: '1.1rem' }}>
                    {Object.keys(profili).map(ime => (
                      <div key={ime} className="profil-vrsta">
                        <span className="pv-ime">{ime}</span>
                        <button type="button" className="povezava" onClick={() => { naloziProfil(ime); setKazemProfil(false); setProfilPogled('meni'); }}>↺ Naloži</button>
                        <button type="button" className="brisi" title={'Izbriši ' + ime} onClick={() => izbrisiProfil(ime)}>×</button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="cene-dodaj">
                  <input type="text" placeholder="Ime cenika (npr. Cene za tujino)" value={imeProfila}
                    onChange={e => setImeProfila(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && imeProfila.trim()) shraniProfil(); }}
                    aria-label="Ime novega shranjenega cenika" />
                  <button type="button" className="povezava" disabled={!imeProfila.trim()} onClick={shraniProfil}>+ shrani trenutni cenik</button>
                </div>
              </>
            )}

            {profilPogled === 'stroski' && (
              <>
                <p className="ob-sub" style={{ margin: '0 0 1.2rem' }}>Redni mesečni stroški (najem, programska oprema, zavarovanje, oprema …) — za tvoj pregled. Zaenkrat se ne vštevajo samodejno v izračun cene ponudb.</p>
                {stroski.length > 0 && (
                  <>
                    <div className="strosek-seznam">
                      {stroski.map((s, i) => (
                        <div key={i} className="strosek-vrsta">
                          <input type="text" value={s.ime} aria-label={'Ime stroška ' + (i + 1)}
                            onChange={e => urediStrosek(i, 'ime', e.target.value)} />
                          <input type="number" min={0} step={5} value={s.znesek} aria-label={'Znesek stroška ' + (i + 1)}
                            onChange={e => urediStrosek(i, 'znesek', e.target.value)} />
                          <span className="sv-znak">{vfx.znak}/mes.</span>
                          <button type="button" className="brisi" title="Izbriši" onClick={() => odstraniStrosek(i)}>×</button>
                        </div>
                      ))}
                    </div>
                    <p className="strosek-skupaj">
                      Skupaj: <b>{stroski.reduce((a, s) => a + (Number(s.znesek) || 0), 0).toLocaleString('sl-SI')} {vfx.znak} / mesec</b>
                    </p>
                  </>
                )}
                <div className="podjetja-shrani">
                  <input type="text" placeholder="Ime stroška (npr. najem studia, Adobe licenca …)" value={novStrosekIme}
                    onChange={e => setNovStrosekIme(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && novStrosekIme.trim()) dodajStrosek(); }}
                    aria-label="Ime novega stroška" />
                  <input type="number" min={0} step={5} placeholder={`znesek / mesec (${vfx.znak})`} value={novStrosekZnesek}
                    onChange={e => setNovStrosekZnesek(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && novStrosekIme.trim()) dodajStrosek(); }}
                    aria-label="Znesek novega stroška" />
                  <button type="button" className="dodaj-gumb" onClick={dodajStrosek} disabled={!novStrosekIme.trim()}>+ Dodaj strošek</button>
                </div>
              </>
            )}

            {profilPogled === 'obvestila' && (
              <>
                {potrdiOdjavo ? (
                  <div className="odjava-potrdi">
                    <p className="ob-sub" style={{ margin: '0 0 1.2rem', fontSize: '1.05rem' }}>Res se želiš odjaviti od obveščanja? 😢</p>
                    <div className="onboarding-noga">
                      <button type="button" className="gumb" onClick={() => {
                        setLeadIme(''); setLeadEmail('');
                        try { localStorage.removeItem(K_LEAD); } catch { /* prazno */ }
                        setPotrdiOdjavo(false);
                      }}>Da, odjavi me</button>
                      <button type="button" className="povezava" onClick={() => setPotrdiOdjavo(false)}>Prekliči</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <label className="se-preklop" style={{ marginBottom: '1.3rem' }}>
                      <span>Obveščaj me o orodju in nasvetih za kreativce <em>(neobvezno)</em></span>
                      <span className="se-toggle">
                        <input type="checkbox" checked={Boolean(leadEmail.trim())}
                          onChange={() => { if (leadEmail.trim()) setPotrdiOdjavo(true); }} />
                        <span className="se-slider" aria-hidden />
                      </span>
                    </label>
                    <div className="numgrid" style={{ marginTop: 0 }}>
                      <div className="polje">
                        <label htmlFor="cw-profime">Ime</label>
                        <input id="cw-profime" value={leadIme} onChange={e => {
                          setLeadIme(e.target.value);
                          try { localStorage.setItem(K_LEAD, JSON.stringify({ ime: e.target.value, email: leadEmail })); } catch { /* poln */ }
                        }} />
                      </div>
                      <div className="polje">
                        <label htmlFor="cw-profemail">Email</label>
                        <input id="cw-profemail" type="email" value={leadEmail} onChange={e => {
                          setLeadEmail(e.target.value);
                          try { localStorage.setItem(K_LEAD, JSON.stringify({ ime: leadIme, email: e.target.value })); } catch { /* poln */ }
                        }} />
                      </div>
                    </div>
                    {!leadEmail.trim() && (
                      <p className="ob-sub" style={{ margin: '.8rem 0 0', fontSize: '.85rem' }}>Vpiši ime in email, da se prijaviš — shrani se samodejno.</p>
                    )}
                  </>
                )}
              </>
            )}

            {profilPogled === 'pomoc' && (
              <>
                <p className="ob-sub" style={{ margin: '0 0 1.3rem' }}>Vprašanje, predlog ali težava z orodjem? Pišem in berem osebno.</p>
                <a href="mailto:tina@pinart.si" className="pomoc-mail">✉ tina@pinart.si</a>
                <p className="ob-sub" style={{ margin: '1.3rem 0 0' }}>
                  <a href={localePath(locale, `/kalkulator/pogoji`)} style={{ color: 'var(--ink)' }}>Pogoji uporabe kalkulatorja →</a>
                </p>
              </>
            )}
          </div>
        </>
      )}

      <div className="oder">
        <div className={'korak-vsebina' + (korak === 0 ? ' siroko' : '') + (korak === 0 && uvodChat && !klasicnaOblika ? ' uvod-faza' : '') + (vChatu && poMeh > 0 ? ' chat-koraki' : '') + (!klasicnaOblika && korak === ponudbaStep ? ' priprava-korak' : '')} key={korak}>
          {!klasicnaOblika && korak === ponudbaStep && (
            <button type="button" className="priprava-nazaj" onClick={() => setKorak(0)}>
              ← Uredi podatke in vprašanja
            </button>
          )}
          {(korak !== 0 || klasicnaOblika) && (
            <h1><span className="h1-step">{String(korak + 1).padStart(2, '0')}</span>{naslovKoraka.split(' ').map((b, bi) => (
              <span key={bi} className="h1-maska"><span className="h1-beseda" style={{ animationDelay: `${bi * 90}ms` }}>{b}&nbsp;</span></span>
            ))}</h1>
          )}
          {opisKoraka && (korak !== 0 || klasicnaOblika) && (
            <div className="sub-vrsta"><p className="sub">{opisKoraka}</p></div>
          )}
          {/* korak 0 = nadaljevanje chatbota (naslov gre stran) */}
          {korak === 0 && !klasicnaOblika && (
            <div className="chat chat-izbira" ref={uvodRef}>
              {uvodChat && (
                <div className="uvod-uvodnik">
                  <p className="ob-kicker">Onboarding</p>
                  <h1 className="ob-naslov uvod-h">Kalkulator ponudbe</h1>
                  <p className="sub uvod-sub">Živjo, sem tvoja pomočnica in pomagala ti bom sestaviti ponudbo.</p>
                </div>
              )}
              {/* transkript vprasanj — samo MED onboardingom ali ko je bil opravljen ta obisk;
                  za ze onboardanega (chatKorak 0, brez uvodChat) se NE prikaze, da vprasanje ne visi */}
              {(uvodChat || chatKorak > 0) && (<>
              <div className="chat-bot"><span className="chat-obraz" aria-hidden>{VODICKA_OBRAZ}</span>
                <span className="chat-mehur"><b>Živjo! Kako ti je ime?</b></span></div>
              {chatKorak > 0 && uvodOdgovorMehur(0, imeUporabnika || '—')}

              {chatKorak >= 1 && (
                <div className="chat-bot"><span className="chat-obraz" aria-hidden>{VODICKA_OBRAZ}</span>
                  <span className="chat-mehur"><b>Kakšne izkušnje imaš?</b><small>Vpliva na ceno ponudbe.</small></span></div>
              )}
              {uvodChat && chatKorak === 1 && (
                <div className="chat-izbire">
                  {CHAT_IZK.map(o => (
                    <button key={o.id} type="button" className="chat-opcija" onClick={() => uvodIzberiIzkusnje(o.id)}>
                      <span className="crk">{o.crk}</span><b>{o.ime}</b><small>{o.opis}</small>
                    </button>
                  ))}
                </div>
              )}
              {chatKorak > 1 && uvodOdgovorMehur(1, CHAT_IZK.find(o => o.id === izkusnje)?.ime || 'Nekaj let izkušenj')}

              {/* O TEBI: podjetje + tvoja regija (na zacetku, kot dogovorjeno) */}
              {chatKorak >= 2 && (
                <div className="chat-bot"><span className="chat-obraz" aria-hidden>{VODICKA_OBRAZ}</span>
                  <span className="chat-mehur"><b>V imenu katerega podjetja izdajaš ponudbo?</b><small>Podatki za glavo ponudbe. Obvezno je le ime — če nimaš podjetja, vpiši svoje ime. Ostalo izpolni, kar imaš (lahko dopolniš pozneje).</small></span></div>
              )}
              {uvodChat && chatKorak === 2 && (
                <form className="uv-forma" onSubmit={e => { e.preventDefault(); uvodNaprej(); }}>
                  <div className="uv-polje uv-polje-siroko">
                    <label htmlFor="uv-pime">Ime / podjetje <span className="uv-neobvezno">obvezno</span></label>
                    <input id="uv-pime" ref={uvodVnosRef} type="text" placeholder="Rdeča kapica d.o.o. ali tvoje ime"
                      value={ponudnik.ime} onChange={e => setPonudnik({ ...ponudnik, ime: e.target.value })} />
                  </div>
                  <div className="uv-polje uv-polje-siroko">
                    <label htmlFor="uv-pdrzava">Država <span className="uv-neobvezno">določi privzet trg / raven cen</span></label>
                    <input id="uv-pdrzava" type="text" list="cw-drzave-list" placeholder="npr. Slovenija"
                      value={custDrzavaMoj}
                      onChange={e => { const v = e.target.value; setCustDrzavaMoj(v); const t = trgIzDrzave(v); if (t) setMojTrg(t); }} />
                  </div>
                  <div className="uv-mreza">
                    <div className="uv-polje">
                      <label htmlFor="uv-pdavcna">Davčna številka <span className="uv-neobvezno">neobvezno</span></label>
                      <input id="uv-pdavcna" type="text" placeholder="SI98765432"
                        value={ponudnik.davcna} onChange={e => setPonudnik({ ...ponudnik, davcna: e.target.value })} />
                    </div>
                    <div className="uv-polje">
                      <label htmlFor="uv-pemail">Email <span className="uv-neobvezno">neobvezno</span></label>
                      <input id="uv-pemail" type="email" placeholder="kapica@gozd.si"
                        value={ponudnik.email} onChange={e => setPonudnik({ ...ponudnik, email: e.target.value })} />
                    </div>
                    <div className="uv-polje">
                      <label htmlFor="uv-ptelefon">Telefon <span className="uv-neobvezno">neobvezno</span></label>
                      <div className="tel-vrsta">
                        <select aria-label="Klicna koda države" value={predklic} onChange={e => setPredklic(e.target.value)}>
                          {['+386', '+385', '+43', '+49', '+39', '+44', '+33', '+1', '+971', '+20'].map(k => (
                            <option key={k} value={k}>{k}</option>
                          ))}
                        </select>
                        <input id="uv-ptelefon" type="tel" placeholder="51 234 567"
                          value={ponudnik.telefon} onChange={e => setPonudnik({ ...ponudnik, telefon: e.target.value })} />
                      </div>
                    </div>
                    <div className="uv-polje">
                      <label htmlFor="uv-ptrr">TRR (bančni račun) <span className="uv-neobvezno">neobvezno</span></label>
                      <input id="uv-ptrr" type="text" placeholder="SI56 1910 0001 2345 678"
                        value={ponudnik.trr} onChange={e => setPonudnik({ ...ponudnik, trr: e.target.value })} />
                    </div>
                    <div className="uv-polje uv-polje-siroko">
                      <label htmlFor="uv-pnaslov">Naslov <span className="uv-neobvezno">neobvezno</span></label>
                      <input id="uv-pnaslov" type="text" placeholder="Mladinska ulica 63, 1000 Ljubljana"
                        value={ponudnik.naslov} onChange={e => setPonudnik({ ...ponudnik, naslov: e.target.value })} />
                    </div>
                  </div>
                  <button type="submit" className="gumb" disabled={!ponudnik.ime.trim()}>Naprej <ArrowDown size={15} weight="bold" aria-hidden /></button>
                </form>
              )}
              {chatKorak > 2 && uvodOdgovorMehur(2, ponudnik.ime.trim() + (custDrzavaMoj.trim() ? ' · ' + custDrzavaMoj.trim() : '') || '—')}

              {chatKorak >= 4 && (
                <div className="chat-bot"><span className="chat-obraz" aria-hidden>{VODICKA_OBRAZ}</span>
                  <span className="chat-mehur"><b>S katerimi področji se ukvarjaš?</b><small>Izbereš lahko več — pokažem samo tvoje storitve.</small></span></div>
              )}
              {uvodChat && chatKorak === 4 && (
                <>
                  <div className="chat-podrocja">
                    {PODROCJA.map(p => {
                      const bar = PODROCJE_BARVA[p.id] || '#7C3AED';
                      const on = obIzbor.has(p.id);
                      return (
                        <button key={p.id} type="button" className={'chip-podrocje' + (on ? ' on' : '')}
                          style={{ borderColor: on ? bar : 'rgba(17,17,17,.12)', boxShadow: on ? `0 6px 18px ${osvetli(bar, 0.5)}` : undefined }}
                          onClick={() => preklopi(obIzbor, p.id, setObIzbor)}>
                          <span className="pi-pod" aria-hidden style={{ background: osvetli(bar, 0.8), color: zatemni(bar, 0.55) }}>{PODROCJE_IKONA[p.id]}</span>
                          <b>{p.ime}</b>
                          <span className="chip-kljuk" aria-hidden style={{ borderColor: on ? bar : 'rgba(17,17,17,.2)', background: on ? bar : 'transparent' }}>{on ? '✓' : ''}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="chat-vnos"><button type="button" className="gumb" disabled={obIzbor.size === 0} onClick={uvodPotrdiPodrocja}>Naprej <ArrowDown size={15} weight="bold" aria-hidden /></button></div>
                </>
              )}
              {chatKorak > 4 && obIzbor.size > 0 && uvodOdgovorMehur(4, [...obIzbor].map(id => PODROCJA.find(p => p.id === id)?.ime).filter(Boolean).join(', '))}

              {chatKorak >= 5 && (
                <div className="chat-bot"><span className="chat-obraz" aria-hidden>{VODICKA_OBRAZ}</span>
                  <span className="chat-mehur"><b>Nova ponudba ali nadaljuješ obstoječo?</b></span></div>
              )}
              {uvodChat && chatKorak === 5 && (
                <div className="chat-izbire">
                  <button type="button" className="chat-opcija" onClick={() => uvodNovaObstojeca(true)}>
                    <span className="crk">A</span><b>Nova ponudba</b></button>
                  <button type="button" className="chat-opcija" onClick={() => uvodNovaObstojeca(false)}>
                    <span className="crk">B</span><b>Obstoječa ponudba</b><small>{Object.keys(arhiv).length ? 'naložim zadnjo iz arhiva' : 'v arhivu še ni ponudb'}</small></button>
                </div>
              )}
              {chatKorak > 5 && chatNova !== null && uvodOdgovorMehur(5, chatNova ? 'Nova ponudba' : 'Obstoječa ponudba')}

              {chatKorak >= 6 && (
                <div className="chat-bot"><span className="chat-obraz" aria-hidden>{VODICKA_OBRAZ}</span>
                  <span className="chat-mehur"><b>Kako naj se imenuje ponudba?</b><small>Npr. »Inovis — prenova CGP in spletne strani«.</small></span></div>
              )}
              {!uvodChat && nazivPonudbe.trim() && <div className="chat-jaz"><span className="chat-mehur">{nazivPonudbe}</span></div>}
              </>)}

              {/* ze onboardan (vrnitev): oseben pozdrav + preklop podjetja (Tina lahko dela za podjetje A ali B) */}
              {!uvodChat && chatKorak === 0 && (
                <div className="chat-bot"><span className="chat-obraz" aria-hidden>{VODICKA_OBRAZ}</span>
                  <span className="chat-mehur pozdrav-mehur">
                    <b>Hej{imeVelika ? ' ' + imeVelika : ''}{(ponudnik.ime.trim() || Object.keys(podjetja).length > 0) ? ',' : '!'}</b>
                    {(ponudnik.ime.trim() || Object.keys(podjetja).length > 0) && (
                      <select className="pozdrav-select" aria-label="Podjetje ponudbe"
                        value={aktivnoPodjetje && podjetja[aktivnoPodjetje] ? aktivnoPodjetje : '__cur'}
                        onChange={e => { const v = e.target.value; if (v === '__uredi') { setKazemProfil(true); setProfilPogled('podjetja'); } else if (v !== '__cur') preklopiPodjetje(v); }}>
                        {(!aktivnoPodjetje || !podjetja[aktivnoPodjetje]) && <option value="__cur">{ponudnik.ime.trim() || 'brez podjetja'}</option>}
                        {Object.keys(podjetja).map(ime => <option key={ime} value={ime}>{ime}</option>)}
                        <option value="__uredi">+ dodaj podjetje …</option>
                      </select>
                    )}
                  </span></div>
              )}

              {/* po onboardingu: nadaljevanje pogovora za izbiro (ista povrsina, ni preskoka) */}
              {!uvodChat && !namigSkrit && (
                <>
                  <div className="chat-bot" id="cw-storitve-zacetek"><span className="chat-obraz" aria-hidden>{VODICKA_OBRAZ}</span>
                    <span className="chat-mehur"><b>Super! Izberi storitve, ki jih želiš v ponudbi.</b></span></div>
                  <div className="chat-bot"><span className="chat-obraz" aria-hidden>{VODICKA_OBRAZ}</span>
                    <span className="chat-mehur chat-mehur-namig">
                      <button type="button" className="namig-zapri" aria-label="Zapri namig" title="Zapri (znova le ob ponastavitvi)" onClick={() => setNamigSkrit(true)}>✕</button>
                      S klikom na storitev jo dodaš v ponudbo. Prikaz preklopiš med mehurčki in tabelo v »dodaj / uredi«.
                    </span></div>
                </>
              )}

              {/* vnosna vrstica (ime / ime ponudbe) — samo med onboardingom (podjetje ima svojo formo zgoraj) */}
              {uvodChat && (chatKorak === 0 || chatKorak === 6) && (
                <form className="chat-vnos" onSubmit={e => { e.preventDefault(); uvodNaprej(); }}>
                  <input autoFocus type="text" value={chatVnos}
                    onChange={e => setChatVnos(e.target.value)}
                    placeholder={chatKorak === 0 ? 'Ime ali vzdevek' : 'Ime ponudbe'} />
                  <button type="submit" className="gumb" disabled={chatKorak === 0 && !chatVnos.trim()}>
                    {chatKorak === 6 ? 'Začni' : 'Naprej'} <ArrowDown size={15} weight="bold" aria-hidden />
                  </button>
                </form>
              )}
            </div>
          )}


          {korak === 0 && (klasicnaOblika || !uvodChat) && (
            <div className="oder0">
              {/* ── platno z orbi: svobodno lebdijo na istem ozadju (brez obrezovanja) ── */}
              {!pogledMreza && (
              <div className="platno0-drs">
              <div className="platno0" aria-label="Storitve" style={{ minHeight: orbVrstic * orbRowH + 30 }}>
                {orbStoritve.map((s, i) => {
                  const p = orbPoz(i);
                  const barvi = ORB_BARVE[i % ORB_BARVE.length];
                  const linijeSid = vrstice.filter(l => l.sid === s.id);
                  /* kolicinska storitev steje kose, imenska steje vrstice */
                  const q = jeKolicinska(s.id)
                    ? linijeSid.reduce((a, l) => a + Math.max(1, Math.round(l.kolicina)), 0)
                    : linijeSid.length;
                  const on = linijeSid.length > 0;
                  return (
                    <button key={s.id} type="button"
                      className={'orb0' + (on ? ' aktiv' : '') + (MEHURCEK[s.id] ? ' orb0-foto' : '')}
                      aria-pressed={on}
                      aria-label={`${s.ime}, od ${val(osnovaZa(s))}${on ? `, izbrano ×${q}` : ''}`}
                      style={{
                        ['--orbd' as string]: `${Math.round(orbD * (TEZA[s.id] ?? 1))}px`,
                        width: Math.round(orbD * (TEZA[s.id] ?? 1)), height: Math.round(orbD * (TEZA[s.id] ?? 1)),
                        left: `calc(${p.x}% - ${Math.round(orbD * (TEZA[s.id] ?? 1)) / 2}px)`, top: `calc(${p.y}% - ${Math.round(orbD * (TEZA[s.id] ?? 1)) / 2}px)`,
                        ['--o1' as string]: barvi[0], ['--o2' as string]: barvi[1],
                        ['--dur' as string]: (9 + psr(i * 3 + 1) * 5).toFixed(1) + 's',
                        ['--del' as string]: (-psr(i * 7 + 2) * 6).toFixed(1) + 's',
                        ['--vdel' as string]: (i * 0.05).toFixed(2) + 's',
                        ['--fx' as string]: ((psr(i + 11) * 5 + 3) * (psr(i + 4) < .5 ? -1 : 1)).toFixed(0) + 'px',
                        ['--fy' as string]: (-(psr(i + 23) * 5 + 3)).toFixed(0) + 'px',
                      }}
                      onClick={() => { klikNonce.current += 1; setKlikObroc({ x: p.x, y: p.y, d: orbD, n: klikNonce.current }); izberiVrstico(s.id); }}>
                      {MEHURCEK[s.id] ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img className="orb0-svg" src={`/kalkulator/mehurcki/${s.id}.svg`} alt="" aria-hidden />
                      ) : (
                        <>
                          <OrbSfera id={s.id} o1={barvi[0]} />
                          <span className="orb0-ikona" aria-hidden>{ikonaZa(s.id)}</span>
                          <span className="orb0-ime">{KRATKO[s.id] || s.ime}</span>
                          <span className="orb0-cena">od {val(osnovaZa(s))}</span>
                        </>
                      )}
                      {on && (
                        <span className="kolic0" role="button" tabIndex={0}
                          title={jeKolicinska(s.id) ? 'Odstrani en kos' : 'Odstrani zadnjo vrstico'}
                          onClick={e => { e.stopPropagation(); odvzemiStoritev(s.id); }}
                          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); odvzemiStoritev(s.id); } }}>
                          ×{q}
                        </span>
                      )}
                    </button>
                  );
                })}
                {(() => {
                  const d = Math.round(orbD * 0.78);
                  let p = orbPoz(orbStoritve.length);   /* naravna pozicija: zadnji element v zadnji vrsti */
                  /* Tinino pravilo: ce je "dodaj/uredi" SAM v zadnji vrsti, ne sme biti na sredini —
                     poravna se z zadnjim (najbolj desnim) mehurckom prejsnje vrste */
                  if (orbRowSizes[orbRowSizes.length - 1] === 1 && orbStoritve.length > 0) {
                    p = { x: orbPoz(orbStoritve.length - 1).x, y: p.y };
                  }
                  return (
                    <button type="button" className="orb0 orb0-plus"
                      style={{ width: d, height: d, left: `calc(${p.x}% - ${d / 2}px)`, top: `calc(${p.y}% - ${d / 2}px)` }}
                      onClick={() => setKazemUredi(true)}>
                      <span className="orb0-krog" aria-hidden />
                      <Plus size={22} aria-hidden />
                      <span className="orb0-ime">dodaj / uredi</span>
                    </button>
                  );
                })()}
                {klikObroc && (
                  <span key={klikObroc.n} className="obroc0" aria-hidden
                    style={{ width: klikObroc.d, height: klikObroc.d, left: `calc(${klikObroc.x}% - ${klikObroc.d / 2}px)`, top: `calc(${klikObroc.y}% - ${klikObroc.d / 2}px)` }} />
                )}
              </div>
              </div>
              )}

              {pogledMreza && (
                <div className="mreza0-ovoj">
                  <div className="mreza0">
                    {mrezaSkupine.map((g, gi) => (
                      <div key={g.id} className="mreza-skupina">
                        <div className="mreza-naslov">{g.ime}</div>
                        <div className="mreza-kvadrati">
                          {g.storitve.map(s => {
                            const linije = vrstice.filter(l => l.sid === s.id);
                            const q = jeKolicinska(s.id) ? linije.reduce((a, l) => a + Math.max(1, Math.round(l.kolicina)), 0) : linije.length;
                            const on = linije.length > 0;
                            const bar = PODROCJE_BARVA[g.id] || '#7C3AED';
                            return (
                              <button key={s.id} type="button" className={'mreza-kvadrat' + (on ? ' on' : '')}
                                style={{ ['--mb' as string]: bar, borderColor: on ? bar : undefined }}
                                aria-pressed={on} aria-label={`${s.ime}, od ${val(osnovaZa(s))}${on ? `, izbrano ×${q}` : ''}`}
                                onClick={() => izberiVrstico(s.id)}>
                                <span className="mk-ikona" aria-hidden style={{ background: osvetli(bar, 0.82), color: zatemni(bar, 0.5) }}>{ikonaZa(s.id)}</span>
                                <span className="mk-ime">{KRATKO[s.id] || s.ime}</span>
                                <span className="mk-cena">od {val(osnovaZa(s))}</span>
                                {on && (
                                  <span className="mk-kolic" role="button" tabIndex={0} title={jeKolicinska(s.id) ? 'Odstrani en kos' : 'Odstrani zadnjo vrstico'}
                                    onClick={e => { e.stopPropagation(); odvzemiStoritev(s.id); }}
                                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); odvzemiStoritev(s.id); } }}>×{q}</span>
                                )}
                              </button>
                            );
                          })}
                          {gi === mrezaSkupine.length - 1 && (
                            <>
                              <div className="mreza-prazno" aria-hidden />
                              <button type="button" className="mreza-kvadrat mreza-uredi" onClick={() => setKazemUredi(true)}>
                                <span className="mk-ikona" aria-hidden><Plus size={18} /></span>
                                <span className="mk-ime">dodaj / uredi</span>
                                <span className="mk-cena">nova storitev ali pogled</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── živa ponudba: desktop fiksno desno, mobile drsni panel (kosarica) ── */}
              <aside className={'ponudba0' + (ponudbaOdprta ? ' odprta' : '')} aria-label="Tvoja ponudba" data-lenis-prevent>
                <button type="button" className="ponudba0-zapri" aria-label="Zapri ponudbo" onClick={() => setPonudbaOdprta(false)}>×</button>
                <div className="ponudba0-glava">
                  <h2>{nazivPonudbe.trim() || 'Tvoja ponudba'}</h2>
                  <span className="ponudba0-chip">{vrstice.length === 1 ? '1 postavka'
                    : vrstice.length === 2 ? '2 postavki'
                      : vrstice.length === 3 || vrstice.length === 4 ? `${vrstice.length} postavke`
                        : `${vrstice.length} postavk`}</span>
                </div>
                <div className="ponudba0-pod">se sestavlja v živo</div>

                {vrstice.length === 0 && (
                  <div className="ponudba0-prazno">
                    <div className="prazno-mapa" aria-hidden>
                      {/* mapa z ENIM obrazom (odebeljene linije v slogu chatbot ikonce) */}
                      <svg viewBox="0 0 220 200" xmlns="http://www.w3.org/2000/svg">
                        <ellipse className="mapa-senca" cx="110" cy="188" rx="58" ry="7" fill="rgba(35,18,45,.08)" />
                        <g className="mapa-telo">
                          <path d="M46 54 h44 l12 15 h62 q12 0 12 12 v82 q0 12 -12 12 H46 q-12 0 -12 -12 V66 q0 -12 12 -12 z" fill="#E7C074" />
                          <path d="M40 84 h140 q12 0 12 12 v58 q0 12 -12 12 H40 q-12 0 -12 -12 V96 q0 -12 12 -12 z" fill="#F1D08A" />
                          <path d="M40 84 h140 q12 0 12 12 v4 H28 v-4 q0 -12 12 -12 z" fill="#F6DCA3" />
                          <g className="mapa-oci" stroke="#6E5326" strokeWidth="4.5" fill="none" strokeLinecap="round">
                            <path d="M78 120 q8 -10 16 0" />
                            <path d="M126 120 q8 -10 16 0" />
                          </g>
                          <path d="M92 136 q18 13 36 0" stroke="#6E5326" strokeWidth="4.5" fill="none" strokeLinecap="round" />
                          <circle cx="80" cy="133" r="6" fill="rgba(255,120,170,.42)" />
                          <circle cx="140" cy="133" r="6" fill="rgba(255,120,170,.42)" />
                        </g>
                      </svg>
                    </div>
                    <p><b>Klikni storitev</b>, da začneš.<br />Spletna stran ali CGP se ob ponovnem kliku doda kot nova postavka, ilustracije in podobno pa štejejo kose.</p>
                  </div>
                )}

                <div className="vrstice0">
                  {vrstice.map(l => {
                    const s = vseStoritve.find(x => x.id === l.sid);
                    if (!s) return null;
                    const q = Math.max(1, Math.round(l.kolicina));
                    const kolicinska = jeKolicinska(l.sid);
                    const skupina = skupineVprasanj.find(g => g.id === l.uid);
                    const odgovorjenih = skupina ? skupina.vprasanja.filter(vp => (odgovori[vp.key] || '').trim()).length : 0;
                    const razprta = razprtaVrstica === l.uid;
                    const status = skupina
                      ? (odgovorjenih ? `${odgovorjenih}/${skupina.vprasanja.length} podrobnosti` : 'okvirna ocena · klikni za podrobnosti')
                      : 'klikni za ime postavke';
                    return (
                      <div key={l.uid}>
                        <div className={'vrst0' + (vlecenaVrstica === l.uid ? ' vlecem' : '')}
                          onDragOver={e => e.preventDefault()}
                          onDrop={e => { e.preventDefault(); if (vlecenaVrstica) premakniVrstico(vlecenaVrstica, l.uid); setVlecenaVrstica(null); }}>
                          <span className="rocica0" draggable title="Povleci za vrstni red"
                            onDragStart={e => { setVlecenaVrstica(l.uid); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', l.uid); } catch { /* star brskalnik */ } }}
                            onDragEnd={() => setVlecenaVrstica(null)}>⠿</span>
                          <button type="button" className="vrst0-ime" aria-expanded={razprta}
                            onClick={() => setRazprtaVrstica(razprta ? null : l.uid)}>
                            {prikazVrstice(l, s)}
                            <small className={odgovorjenih ? 'odg' : ''}>{kolicinska && q > 1 ? `${q} ${KOLICINSKE[l.sid] || 'kosov'} · ` : ''}{status}</small>
                          </button>
                          {kolicinska ? (
                            <span className="stepper0">
                              <button type="button" aria-label={'En kos manj: ' + s.ime} onClick={() => spremeniKolicino(l.uid, -1)}>–</button>
                              <b>{q}</b>
                              <button type="button" aria-label={'En kos več: ' + s.ime} onClick={() => spremeniKolicino(l.uid, 1)}>+</button>
                            </span>
                          ) : <span className="vrst0-prazno" aria-hidden />}
                          <span className="vrst0-cena">{val(osnovaZa(s) * q)}</span>
                          <button type="button" className="vrst0-x" aria-label={'Odstrani: ' + prikazVrstice(l, s)}
                            onClick={() => odstraniVrstico(l.uid)}>×</button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {postavke.length > 0 && (
                  <div className="postavke">
                    {postavke.map(x => (
                      <div key={x.id} className="postavka">
                        <span>{x.ime}</span>
                        <input type="number" min={1} step={1} value={x.kolicina} aria-label={(x.enota === 'ura' ? 'Ure' : 'Količina') + ': ' + x.ime}
                          onChange={e => uredi(x.id, 'kolicina', Number(e.target.value) || 1)} />
                        <button type="button" className="enota-toggle" onClick={() => preklopiEnoto(x.id)}
                          title="Preklopi enoto (kos / ura)">{x.enota === 'ura' ? 'ur' : 'kos'}</button>
                        <input type="number" min={0} step={10} value={x.cena} aria-label={'Cena: ' + x.ime}
                          onChange={e => uredi(x.id, 'cena', Number(e.target.value) || 0)} />
                        <span className="enota">{x.enota === 'ura' ? '€/uro' : '€'}</span>
                        <button type="button" title="Odstrani" onClick={() => odstrani(x.id)}>×</button>
                      </div>
                    ))}
                  </div>
                )}

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
                {!kazemDodaj && (
                  <button type="button" className="dodaj-gumb ponudba0-dodaj" onClick={() => setKazemDodaj(true)}>
                    + dodaj postavko (tisk, licenca, najem …)
                  </button>
                )}

                <div className="ponudba0-vsota">
                  {r && poMeh >= 5 ? (
                    <>
                      {r.popustPct > 0 && (
                        <div className="ponudba0-vsota-vrsta ponudba0-mini">
                          <span>Popust {r.popustPct} %</span>
                          <span>redna {val(r.paketi[1].redna)}</span>
                        </div>
                      )}
                      <div className="ponudba0-vsota-vrsta">
                        <span>Priporočena cena{ddvZavezanec ? ' (brez DDV)' : ''}</span>
                        <b>{val(r.paketi[1].skupaj)}</b>
                      </div>
                      {ddvZavezanec && (
                        <>
                          <div className="ponudba0-vsota-vrsta ponudba0-mini">
                            <span>DDV {ddvSt} %</span>
                            <span>{val(r.paketi[1].skupaj * ddvSt / 100)}</span>
                          </div>
                          <div className="ponudba0-vsota-vrsta">
                            <span>Cena z DDV</span>
                            <b>{val(r.paketi[1].skupaj * (1 + ddvSt / 100))}</b>
                          </div>
                        </>
                      )}
                      <div className="ponudba0-opomba">↳ končna cena (paket Priporočeni) — levo izbereš paket in prilagodiš</div>
                    </>
                  ) : (() => {
                    const okvirno = vrstice.reduce((a, l) => {
                      const s = vseStoritve.find(x => x.id === l.sid);
                      return s ? a + osnovaZa(s) * Math.max(1, Math.round(l.kolicina)) : a;
                    }, 0) + postavke.reduce((a, x) => a + x.cena * x.kolicina, 0);
                    return (
                      <>
                        <div className="ponudba0-vsota-vrsta">
                          <span>Izvedba · okvirno{ddvZavezanec ? ' (brez DDV)' : ''}</span>
                          <b>{val(okvirno)}</b>
                        </div>
                        {ddvZavezanec && (
                          <div className="ponudba0-vsota-vrsta ponudba0-mini">
                            <span>+ DDV {ddvSt} %</span>
                            <span>z DDV {val(okvirno * (1 + ddvSt / 100))}</span>
                          </div>
                        )}
                        <div className="ponudba0-opomba">↳ končno ceno izostrijo naslednji koraki (izkušnje, trg, pravice)</div>
                      </>
                    );
                  })()}
                </div>
              </aside>

              {razprtaVrstica && typeof document !== 'undefined' && (() => {
                const l = vrstice.find(x => x.uid === razprtaVrstica);
                const s = l && vseStoritve.find(x => x.id === l.sid);
                if (!l || !s) return null;
                const skupina = skupineVprasanj.find(g => g.id === l.uid);
                return createPortal(
                  <div className="cw">
                    <div className="izbirnik-zastor" onClick={() => setRazprtaVrstica(null)}>
                      <div className="detajl-modal" role="dialog" aria-modal="true" aria-label={'Podrobnosti: ' + prikazVrstice(l, s)}
                        onClick={e => e.stopPropagation()} data-lenis-prevent>
                        <div className="izbirnik-glava">
                          <span>{prikazVrstice(l, s)}</span>
                          <button type="button" onClick={() => setRazprtaVrstica(null)} aria-label="Zapri">✕</button>
                        </div>
                        <div className="detajl-telo">
                          <div className="polje">
                            <label htmlFor={'cw-ime-' + l.uid}>Ime postavke</label>
                            <input id={'cw-ime-' + l.uid} type="text" value={l.ime}
                              placeholder={`npr. ${s.ime} — Inovis`}
                              onChange={e => preimenujVrstico(l.uid, e.target.value)} />
                          </div>
                          {skupina
                            ? vprasanjaStoritveUI(skupina)
                            : <p className="vrst0-brez">Ta storitev nima dodatnih vprašanj — obseg opišeš v ponudbi.</p>}
                        </div>
                        <div className="detajl-noga">
                          {skupina && (
                            <button type="button" className="povezava" onClick={() => setOdgovori(prev => {
                              const n = { ...prev };
                              skupina.vprasanja.forEach(vp => { delete n[vp.key]; delete n[vp.key + ':drugo']; });
                              return n;
                            })}>Ponastavi odgovore</button>
                          )}
                          <button type="button" className="gumb" onClick={() => setRazprtaVrstica(null)}>Shrani</button>
                        </div>
                      </div>
                    </div>
                  </div>
                , document.body);
              })()}

              {kazemUredi && typeof document !== 'undefined' && createPortal(
                <div className="cw">
                  <div className="izbirnik-zastor" onClick={() => { setKazemUredi(false); setNovaIme(''); setNovaCena(''); }}>
                    <div className="uredi-plosca" role="dialog" aria-modal="true" aria-label="Dodaj ali uredi storitve"
                      onClick={e => e.stopPropagation()} data-lenis-prevent>
                      <div className="izbirnik-glava">
                        <span>Dodaj / uredi storitve</span>
                        <button type="button" onClick={() => { setKazemUredi(false); setNovaIme(''); setNovaCena(''); }} aria-label="Zapri">✕</button>
                      </div>
                      <div className="uredi-telo">
                        <div className="uredi-sekcija">
                          <div className="uredi-naslov">Pogled mehurčkov</div>
                          <div className="pogled-preklop">
                            <button type="button" className={!pogledMreza ? 'on' : ''} onClick={() => setPogledMreza(false)}>Prosti mehurčki</button>
                            <button type="button" className={pogledMreza ? 'on' : ''} onClick={() => setPogledMreza(true)}>Mreža po področjih</button>
                          </div>
                          <p className="hint" style={{ margin: '.6rem 0 0' }}>Mreža je bolj strjena in pregledna, ko imaš veliko storitev.</p>
                        </div>
                        <div className="uredi-sekcija">
                          <div className="uredi-naslov">Dodaj svojo storitev</div>
                          <div className="uredi-dodaj">
                            <input type="text" placeholder="Ime storitve (npr. montaža videa)" value={novaIme} onChange={e => setNovaIme(e.target.value)} />
                            <input type="number" min={0} step={50} placeholder="cena €" value={novaCena} onChange={e => setNovaCena(e.target.value)} />
                            <button type="button" className="gumb" disabled={!novaIme.trim() || !(Number(novaCena) > 0)} onClick={dodajStoritev}>Dodaj</button>
                          </div>
                          {skrite.length > 0 && (
                            <>
                              <p className="hint" style={{ margin: '1rem 0 .5rem' }}>Skrite storitve — klikni za ponoven prikaz:</p>
                              <div className="opts">
                                {skrite.map(id => { const s = vseStoritve.find(x => x.id === id); if (!s) return null; return (
                                  <button key={id} type="button" className="pill" onClick={() => setSkrite(skrite.filter(x => x !== id))}>
                                    <span className="pill-fill" aria-hidden /><span className="pill-tekst">+ {s.ime}</span>
                                  </button>
                                ); })}
                              </div>
                            </>
                          )}
                        </div>
                        <button type="button" className="povezava povezava-roza" onClick={() => { setKazemUredi(false); setKazemProfil(true); setProfilPogled('cene-nastavitve'); }}>↳ Uredi cene, razporedi in skrij → Cene in storitve</button>
                      </div>
                    </div>
                  </div>
                </div>
              , document.body)}
            </div>
          )}

          {/* osebni koraki (kdo si / trg / izkusnje) odpadejo — zbere jih onboarding, urejajo se v Moji podatki */}

          {((klasicnaOblika && korak === narocnikStep) || (vChatu && poMeh >= 1)) && (
            <>
            {vChatu && chatVpr('Super izbira! Zdaj še — komu pošiljaš ponudbo?', 'Naročnik za pošiljanje; lahko pustiš prazno in izpolniš pozneje.')}
            <div className="kartica">
              <div className="k-naslov">Naročnik <span className="vec">za pošiljanje ponudbe</span></div>
              <div className="numgrid" style={{ marginTop: 0 }}>
                <div className="polje">
                  <label htmlFor="cw-narocnik">Ime podjetja</label>
                  <input id="cw-narocnik" type="text" placeholder="npr. Odvetniška družba Potočnik"
                    value={narocnikPonudbe} onChange={e => setNarocnikPonudbe(e.target.value)} />
                </div>
                <div className="polje">
                  <label htmlFor="cw-narocnik-email">Email naročnika</label>
                  <input id="cw-narocnik-email" type="email" placeholder="npr. pisarna@potocnik.si"
                    value={narocnikEmail} onChange={e => setNarocnikEmail(e.target.value)} />
                </div>
              </div>
              <div className="numgrid">
                <div className="polje">
                  <label htmlFor="cw-narocnik-naslov">Naslov (ulica, kraj)</label>
                  <input id="cw-narocnik-naslov" type="text" placeholder="npr. Dunajska cesta 1, 1000 Ljubljana"
                    value={narocnikNaslov} onChange={e => setNarocnikNaslov(e.target.value)} />
                </div>
                <div className="polje">
                  <label htmlFor="cw-narocnik-drzava">Država <span className="vec">določi trg za ceno</span></label>
                  <input id="cw-narocnik-drzava" type="text" list="cw-drzave-list" placeholder="npr. Slovenija"
                    value={custDrzavaNarocnik}
                    onChange={e => {
                      const v = e.target.value;
                      setCustDrzavaNarocnik(v);
                      const t = trgIzDrzave(v);
                      if (t) setTrgNarocnika(t);
                    }} />
                </div>
              </div>
              {(dodatniNarocnik || narocnikOseba || narocnikDavcna) ? (
                <div className="numgrid">
                  <div className="polje">
                    <label htmlFor="cw-narocnik-oseba">Kontaktna oseba</label>
                    <input id="cw-narocnik-oseba" type="text" placeholder="npr. Janez Potočnik"
                      value={narocnikOseba} onChange={e => setNarocnikOseba(e.target.value)} />
                  </div>
                  <div className="polje">
                    <label htmlFor="cw-narocnik-davcna">Davčna številka</label>
                    <input id="cw-narocnik-davcna" type="text" placeholder="npr. SI12345678"
                      value={narocnikDavcna} onChange={e => setNarocnikDavcna(e.target.value)} />
                  </div>
                </div>
              ) : null}
              {(dodatniNarocnik || narocnikOseba || narocnikDavcna) ? (
                <button type="button" className="povezava" style={{ marginTop: '1.1rem' }}
                  onClick={() => {
                    setDodatniNarocnik(false);
                    setNarocnikOseba(''); setNarocnikDavcna('');
                  }}>
                  <CaretUp size={14} weight="bold" aria-hidden /> Skrij (počisti davčno in kontaktno osebo)
                </button>
              ) : (
                <button type="button" className="dodaj-gumb" style={{ marginTop: '1.1rem' }}
                  onClick={() => setDodatniNarocnik(true)}>
                  + Dodaj davčno št. in kontaktno osebo
                </button>
              )}
              {(() => {
                const nedavni = Array.from(new Set(
                  Object.values(arhiv).map(a => a.narocnikPonudbe).filter(Boolean)
                )).filter(n => n !== narocnikPonudbe).slice(0, 8);
                return nedavni.length ? (
                  <div className="narocnik-nedavni">
                    <span className="vec">nedavni:</span>
                    {nedavni.map(n => (
                      <button key={n} type="button" className="narocnik-chip"
                        onClick={() => setNarocnikPonudbe(n)}>{n}</button>
                    ))}
                  </div>
                ) : null;
              })()}
            </div>
            </>
          )}

          {((klasicnaOblika && korak === trgNarocnikaStep) || (vChatu && poMeh >= 2)) && (
            <>
              {vChatu && chatVpr('Trg in valuta', 'Privzeto glede na državo naročnika — bogatejši trg plača več. Po želji spremeniš.')}
              <div className="kartica">
                <div className="numgrid" style={{ marginTop: 0 }}>
                  <div className="polje">
                    <label htmlFor="cw-trg">Trg naročnika <span className="vec">razred cene</span></label>
                    <select id="cw-trg" value={trgNarocnika}
                      onChange={e => setTrgNarocnika(e.target.value)}>
                      {TRGI.map(t => <option key={t.id} value={t.id}>{t.ime}</option>)}
                    </select>
                  </div>
                  <div className="polje">
                    <label htmlFor="cw-valuta">Valuta ponudbe</label>
                    <select id="cw-valuta" className="valuta-select" value={valuta}
                      onChange={e => { setValuta(e.target.value); setValutaRocna(true); }}>
                      {VALUTE.map(v => <option key={v.id} value={v.id}>{v.ime}</option>)}
                    </select>
                    <button type="button" className="izbirnik-gumb valuta-gumb-mobile" aria-label="Valuta ponudbe"
                      onClick={() => setKazemValutaIzbira(true)}>
                      {vfx.ime}
                      <CaretDown size={15} weight="bold" aria-hidden />
                    </button>
                  </div>
                </div>
                <p className="hint" style={{ marginTop: '.9rem' }}>
                  <b>Vpliva na ceno</b> — bogatejši trg plača več.{custDrzavaNarocnik.trim()
                    ? ` Privzeto glede na državo naročnika (${custDrzavaNarocnik.trim()}); za globalno podjetje ga ročno dvigneš.`
                    : ' Nastavi se sam iz države naročnika.'}
                </p>
              </div>
              <div className="kartica kartica-neobvezno">
                <div className="k-naslov">Poslovanje naročnika <span className="vec">neobvezno · lahko preskočiš</span></div>
                <p className="hint" style={{ marginTop: 0, marginBottom: '1rem' }}>Enako kot trg: podjetje z višjim prometom in dobičkom nosi večjo vrednost dela. Upošteva se le, kadar delo velja za celotno znamko. Če ne veš, pusti prazno.</p>
                <div className="numgrid">
                  <div className="polje">
                    <label htmlFor="cw-promet">Letni promet naročnika (€)</label>
                    <input id="cw-promet" type="number" min={0} step={10000} placeholder="800000"
                      value={promet} onChange={e => setPromet(e.target.value)} />
                  </div>
                  <div className="polje">
                    <label htmlFor="cw-dobicek">Letni dobiček naročnika (€)</label>
                    <input id="cw-dobicek" type="number" min={0} step={5000} placeholder="60000"
                      value={dobicek} onChange={e => setDobicek(e.target.value)} />
                  </div>
                </div>
                <p className="hint" style={{ marginTop: '.5rem' }}>
                  Kje preveriš:{' '}
                  {(REGISTRI[trgNarocnika] ?? REGISTRI.si).concat(REGISTRI_UNIV).map((reg, i) => (
                    <span key={reg.url}>{i > 0 && ' · '}<a href={reg.url} target="_blank" rel="noopener noreferrer">{reg.ime}</a></span>
                  ))}. Prazno = mikro podjetje.
                </p>
              </div>
              {kazemValutaIzbira && typeof document !== 'undefined' && createPortal(
                <div className="cw">
                  <div className="izbirnik-zastor" onClick={() => setKazemValutaIzbira(false)}>
                    <div className="izbirnik-plosca" role="dialog" aria-modal="true" aria-label="Izberi valuto"
                      onClick={e => e.stopPropagation()}>
                      <div className="izbirnik-glava">
                        <span>Valuta ponudbe</span>
                        <button type="button" onClick={() => setKazemValutaIzbira(false)} aria-label="Zapri">✕</button>
                      </div>
                      <div className="izbirnik-seznam">
                        {VALUTE.map(v => (
                          <button key={v.id} type="button"
                            className={'izbirnik-vrsta' + (v.id === valuta ? ' on' : '')}
                            onClick={() => { setValuta(v.id); setValutaRocna(true); setKazemValutaIzbira(false); }}>
                            {v.ime}
                            {v.id === valuta && <Check size={16} weight="bold" aria-hidden />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              , document.body)}
            </>
          )}

          {((klasicnaOblika && korak === praviceStep) || (vChatu && poMeh >= 3)) && (
            <>
              {vChatu && chatVpr('Avtorske pravice', 'Orodje predlaga znesek, ki ga lahko kadar koli prilagodiš.')}
              <div className="kartica">
                <div className="k-naslov">Za kaj bo naročnik uporabil delo? <span className="vec">določa vrednost pravic</span></div>
                <div className="izbira">
                  <button type="button" className={raba === 'znamka' ? 'on' : ''} onClick={() => { setRaba('znamka'); if (!pravTrajanjeRocno) setPravTrajanje('neomejeno'); }}>
                    <h3>Za celotno znamko</h3>
                    <p>Logotip, celostna podoba, spletna stran. Tvoje delo nosi vse, kar podjetje počne, zato vrednost sledi bilanci podjetja.</p>
                  </button>
                  <button type="button" className={raba === 'projekt' ? 'on' : ''} onClick={() => { setRaba('projekt'); if (!pravTrajanjeRocno) setPravTrajanje('7'); }}>
                    <h3>Za določen projekt ali izdelek</h3>
                    <p>Majice, embalaža enega izdelka, konferenca, knjiga. Vrednost sledi pričakovanemu izkupičku projekta, ne velikosti podjetja.</p>
                  </button>
                </div>
              </div>
              {raba === 'znamka' ? (
                <p className="hint" style={{ marginTop: '-.4rem', marginBottom: '1.4rem' }}>Vrednost pravic sledi <b>prometu in dobičku naročnika</b> — to vneseš pri podatkih naročnika (korak »Kdo je stranka«). Prazno = mikro podjetje.</p>
              ) : (
                <div className="kartica">
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
                </div>
              )}
              <div className="kartica">
                <div className="k-naslov">Avtorske pravice po storitvah
                  <InfoNamig besedilo="Vsaka storitev ima svoje pravice. Logotip/CGP je praviloma trajen izključni prenos, ilustracija licenca za dobo (npr. 7 let), kampanja kratka licenca. Privzetki so že nastavljeni glede na tip; recept lahko spremeniš. Podrobnosti (teritorij, mediji, naklada, klavzule) pridejo v naslednji nadgradnji." />
                  <span className="vec">vsaka storitev svoje</span>
                </div>
                <p className="hint" style={{ marginTop: 0, marginBottom: '.8rem' }}>
                  Privzetki so nastavljeni glede na tip storitve — spremeni recept, kjer je treba. Vsaka storitev pokaže svojo ceno pravic.
                </p>
                <details className="prav-razlaga">
                  <summary>Kaj so avtorske pravice in zakaj so ločena postavka?</summary>
                  <div className="prav-razlaga-telo">
                    <p>Naročnik plača <b>izvedbo</b> (oblikovanje), <b>pravice do uporabe</b> pa so svoja postavka — kot licenca. Ločeno zato, ker isto delo lahko uporablja majhno lokalno podjetje ali mednarodna znamka; vrednost uporabe je različna.</p>
                    <ul>
                      <li><b>Vrednost določajo</b> obseg (teritorij, mediji, doba), izključnost in koliko naročnik z delom zasluži.</li>
                      <li><b>Slovenija / EU:</b> popoln »odkup vsega« pravno ni mogoč — prenesejo se le posamezne materialne pravice, pisno in omejeno. Avtor ohrani moralne pravice in pravico do poštenega nadomestila (ZASP; DSM 2019).</li>
                      <li><b>Prodajni produkti</b> (majice, embalaža, izdelki): namesto enkratnega odkupa je pošteno honorar + <b>tantieme</b> od prodaje (npr. 3–10 %).</li>
                    </ul>
                    <p className="prav-razlaga-vir">Podroben članek s primeri in viri pripravljamo za spletno stran.</p>
                  </div>
                </details>
                {r && r.praviceVrstice.length > 0 ? (
                  <>
                    <div className="prav-tabela">
                      {r.praviceVrstice.map(row => {
                        const recId = row.tantiema ? 'tantieme' : (RECEPTI.find(rc => rc.prenos === row.prenos && rc.trajanje === row.trajanje && rc.id !== 'tantieme')?.id ?? '');
                        return (
                          <div key={row.sid} className="prav-vrsta">
                            <span className="prav-ime">{row.ime}{row.tantiema ? <small> · {row.tantiema} % tantieme</small> : row.klavzule.length > 0 ? <small> · {row.klavzule.length} klavzul</small> : null}</span>
                            <select className="prav-recept" aria-label={'Pravice: ' + row.ime} value={recId}
                              onChange={e => { const rc = RECEPTI.find(x => x.id === e.target.value); if (rc) nastaviPravRec(row.sid, { prenos: rc.prenos, trajanje: rc.trajanje, trajLeta: undefined, tantiema: rc.id === 'tantieme' ? tantiemaZa(row.sid) : undefined }); }}>
                              {recId === '' && <option value="">Po meri ({row.trajanjeIme})</option>}
                              {RECEPTI.map(rc => <option key={rc.id} value={rc.id}>{rc.ime}</option>)}
                            </select>
                            <span className="prav-cena">{val(row.znesek)}</span>
                            <button type="button" className="prav-podr" onClick={() => setPraviceOdprt(row.sid)} title="Podrobnosti — trajanje, klavzule">Podrobnosti</button>
                          </div>
                        );
                      })}
                    </div>
                    <div className="prav-skupaj"><span>Skupaj avtorske pravice</span><b>{val(r.pravice)}</b></div>
                  </>
                ) : (
                  <p className="hint" style={{ margin: 0 }}>Dodaj storitve, da nastaviš pravice zanje.</p>
                )}
              </div>

              {praviceOdprt && typeof document !== 'undefined' && (() => {
                const sid = praviceOdprt;
                const s = vseStoritve.find(x => x.id === sid);
                if (!s) return null;
                const rec = pravRec(sid);
                const custLeta = (Number(custStev) || 0) * (custEnota === 'teden' ? 1 / 52 : custEnota === 'mesec' ? 1 / 12 : 1);
                return createPortal(
                  <div className="cw">
                    <div className="izbirnik-zastor" onClick={() => setPraviceOdprt(null)}>
                      <div className="detajl-modal" role="dialog" aria-modal="true" aria-label={'Pravice: ' + s.ime} onClick={e => e.stopPropagation()} data-lenis-prevent>
                        <div className="izbirnik-glava">
                          <span>Pravice: {s.ime}</span>
                          <button type="button" onClick={() => setPraviceOdprt(null)} aria-label="Zapri">✕</button>
                        </div>
                        <div className="detajl-telo">
                          <div>
                            <div className="uredi-naslov">Trajanje licence / prenosa</div>
                            <div className="opts">
                              {PRAV_TRAJANJE.map(t => (
                                <button key={t.id} type="button" className={'pill' + (rec.trajanje === t.id ? ' on' : '')}
                                  onClick={() => nastaviPravRec(sid, { trajanje: t.id, trajLeta: undefined })}>
                                  <span className="pill-fill" aria-hidden /><span className="pill-tekst">{t.ime}</span>
                                </button>
                              ))}
                            </div>
                            <div className="cu-vrsta cu-po-meri">
                              <span className={'pill' + (rec.trajanje === 'custom' ? ' on' : '')} style={{ pointerEvents: 'none' }}><span className="pill-tekst">Po meri{rec.trajanje === 'custom' && typeof rec.trajLeta === 'number' ? `: ${trajLetaVBesedo(rec.trajLeta)}` : ''}</span></span>
                              <input type="number" min={1} value={custStev} onChange={e => setCustStev(e.target.value)} className="cu-num" aria-label="Število" />
                              <select value={custEnota} onChange={e => setCustEnota(e.target.value as 'teden' | 'mesec' | 'leto')} className="cu-select" aria-label="Enota">
                                <option value="teden">tednov</option><option value="mesec">mesecev</option><option value="leto">let</option>
                              </select>
                              <button type="button" className="gumb cu-uporabi" onClick={() => nastaviPravRec(sid, { trajanje: 'custom', trajLeta: custLeta })}>Uporabi</button>
                            </div>
                          </div>
                          <div>
                            <div className="uredi-naslov">Klavzule <span className="vec">se zapišejo v ponudbo</span></div>
                            <div className="opts">
                              {KLAVZULE.map(k => {
                                const on = (rec.klavzule || []).includes(k.id);
                                return (
                                  <button key={k.id} type="button" className={'pill' + (on ? ' on' : '')}
                                    onClick={() => nastaviPravRec(sid, { klavzule: on ? (rec.klavzule || []).filter(x => x !== k.id) : [...(rec.klavzule || []), k.id] })}>
                                    <span className="pill-fill" aria-hidden /><span className="pill-tekst">{k.ime}<small>{k.opis}{k.mult ? ` · +${Math.round(k.mult * 100)} %` : ''}</small></span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          {typeof rec.tantiema === 'number' && (
                            <div>
                              <div className="uredi-naslov">Tantieme — prodajni produkt</div>
                              <div className="cu-vrsta cu-po-meri">
                                <input type="number" min={0} max={30} step={1} value={rec.tantiema}
                                  onChange={e => nastaviPravRec(sid, { tantiema: Math.max(0, Math.min(30, Math.round(Number(e.target.value)) || 0)) })}
                                  className="cu-num" aria-label="Odstotek tantieme" />
                                <span>% od neto veleprodaje</span>
                              </div>
                              <p className="hint" style={{ marginTop: '.5rem' }}>Cena zgoraj je <b>predujem / minimalna garancija</b> (nepovraten, ob podpisu). Tantieme se plačujejo <b>dodatno</b> od prodaje; ponudba doda klavzule (predujem, MG, reverzija, letno poročilo). Izhodišče: dizajn 3–10 %, znamka do 15 % (GAG / Licensing International).</p>
                            </div>
                          )}
                          <p className="hint" style={{ margin: 0 }}>Teritorij, mediji in naklada trenutno veljajo globalno (kartica spodaj). Cena pravic te storitve: <b>{r ? val(r.praviceVrstice.find(x => x.sid === sid)?.znesek || 0) : '—'}</b>.</p>
                        </div>
                        <div className="detajl-noga">
                          <button type="button" className="gumb" onClick={() => setPraviceOdprt(null)}>Zapri</button>
                        </div>
                      </div>
                    </div>
                  </div>
                , document.body);
              })()}

              <div className="kartica">
                <div className="k-naslov">Obseg — velja za vse storitve
                  <InfoNamig besedilo="Teritorij, dodatni mediji in naklada trenutno veljajo globalno za vse storitve (kmalu tudi per storitev v Podrobnostih). Privzeto: Slovenija, tisk + promocija, naklada do 3.000 — to je vključeno v ceno pravic; širša raba znesek poviša. Trajanje je odslej del pravic po storitvah zgoraj." />
                  <span className="vec">teritorij · mediji · naklada</span>
                </div>
                <p className="hint" style={{ marginTop: 0 }}>
                  Vključeno v osnovo: <b>tisk + promocija izdelka</b>, <b>Slovenija</b>, naklada <b>do 3.000</b>. Trajanje nastaviš pri vsaki storitvi zgoraj. Vse izven obsega je doplačljivo — ponudba to tudi zapiše.
                </p>
                {obsegPokazi ? (
                  <>
                    <div className="polje" style={{ marginTop: '1.1rem' }}>
                      <label>Teritorij</label>
                      <div className="opts">
                        {PRAV_TERITORIJ.map(t => (
                          <button key={t.id} type="button"
                            className={'pill' + (pravTeritorij === t.id ? ' on' : '')}
                            onClick={() => setPravTeritorij(t.id)}>
                            <span className="pill-fill" aria-hidden />
                            <span className="pill-tekst">{t.ime}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="polje" style={{ marginTop: '1.1rem' }}>
                      <label>Dodatni mediji <span className="vec">izven tiska + promocije</span></label>
                      <div className="opts">
                        {PRAV_MEDIJI_DODATNI.map(m => (
                          <button key={m.id} type="button"
                            className={'pill' + (pravDodatniMediji.has(m.id) ? ' on' : '')}
                            onClick={() => preklopi(pravDodatniMediji, m.id, setPravDodatniMediji)}>
                            <span className="pill-fill" aria-hidden />
                            <span className="pill-tekst">{m.ime}<small>{m.opis} · +{Math.round(m.mult * 100)} %</small></span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="polje" style={{ marginTop: '1.1rem' }}>
                      <label>Naklada / obseg izdaje</label>
                      <div className="opts">
                        {PRAV_NAKLADA.map(n => (
                          <button key={n.id} type="button"
                            className={'pill' + (pravNaklada === n.id ? ' on' : '')}
                            onClick={() => setPravNaklada(n.id)}>
                            <span className="pill-fill" aria-hidden />
                            <span className="pill-tekst">{n.ime}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="polje" style={{ marginTop: '1.1rem' }}>
                      <label>Klavzula o ponatisu
                        <InfoNamig besedilo="Ob ponatisu ali novi nakladi se licenca obnovi — izhodišče 50 % prvotne vrednosti pravic. Majin nasvet iz prakse: brez te klavzule naročnik ponatisne brez doplačila." />
                      </label>
                      <div className="opts">
                        <button type="button"
                          className={'pill' + (pravPonatis ? ' on' : '')}
                          onClick={() => setPravPonatis(p => !p)}>
                          <span className="pill-fill" aria-hidden />
                          <span className="pill-tekst">Ob novi nakladi se licenca obnovi<small>v ponudbo doda stavek (izhodišče 50 %)</small></span>
                        </button>
                      </div>
                    </div>
                    {r && r.obseg.mult !== 1 && (
                      <p className="hint" style={{ marginTop: '1.1rem' }}>
                        Izbrani obseg: <b>{r.obseg.opis}</b> → znesek pravic ×<b>{r.obseg.mult.toFixed(2)}</b>
                      </p>
                    )}
                    {!avtorskeIzbrane && (
                      <button type="button" className="povezava" style={{ marginTop: '.9rem' }}
                        onClick={() => setObsegOdprt(false)}>
                        <CaretUp size={14} weight="bold" aria-hidden /> Skrij obseg
                      </button>
                    )}
                  </>
                ) : (
                  <button type="button" className="dodaj-gumb" style={{ marginTop: '1.1rem' }}
                    onClick={() => setObsegOdprt(true)}>
                    + Nastavi obseg (trajanje, teritorij, mediji, naklada)
                  </button>
                )}
              </div>

              {r && (
                <div className="kartica">
                  <div className="k-naslov">
                    Znesek pravic
                    <span className="vec">{(r.praviceRocne || r.licencaRocna) ? 'nastavila si sama' : 'orodje izračuna samo'}</span>
                  </div>
                  <p className="hint" style={{ marginTop: 0 }}>
                    {r.prenos === 'licenca'
                      ? <>Pri licenci se pravice ne odkupijo; naročnik plača <b>letno licenco</b>, ki jo orodje oceni kot <b>20 % vrednosti pravic</b>.</>
                      : r.raba === 'projekt'
                        ? <>Orodje pravice oceni kot <b>10 % pričakovanega dobička projekta</b> (ali 2 % prihodka), z varovalko med 25 % in 300 % cene izvedbe{r.prenos === 'neizkljucni' ? <>; ker prenos ni izključen, znesek zniža na <b>60 %</b></> : null}.</>
                        : <>Orodje pravice oceni kot <b>1 % letnega dobička naročnika</b>, z varovalko med 25 % in 300 % cene izvedbe{r.prenos === 'neizkljucni' ? <>; ker prenos ni izključen, znesek zniža na <b>60 %</b></> : null}.</>}
                    {' '}Znesek je priporočilo — kadar koli ga lahko prepišeš s svojim.
                  </p>
                  {(prilagajanjePravic || r.praviceRocne || r.licencaRocna) ? (
                    <>
                      <div className="numgrid" style={{ marginTop: '1.1rem' }}>
                        {r.prenos !== 'licenca' && (
                          <div className="polje">
                            <label htmlFor="cw-rpravice">Avtorske pravice ({vfx.znak})</label>
                            <input id="cw-rpravice" type="number" min={0} step={50}
                              placeholder={String(zaokrozi(r.praviceAvto * vfx.fx))}
                              value={rocnePravice} onChange={e => setRocnePravice(e.target.value)} />
                          </div>
                        )}
                        <div className="polje">
                          <label htmlFor="cw-rlicenca">Letna licenca ({vfx.znak}/leto)</label>
                          <input id="cw-rlicenca" type="number" min={0} step={50}
                            placeholder={String(zaokrozi(r.licencaAvto * vfx.fx))}
                            value={rocnaLicenca} onChange={e => setRocnaLicenca(e.target.value)} />
                        </div>
                      </div>
                      <button type="button" className="povezava" style={{ marginTop: '.9rem' }}
                        onClick={() => { setRocnePravice(''); setRocnaLicenca(''); setPrilagajanjePravic(false); }}>
                        ↺ Nazaj na samodejni izračun
                      </button>
                    </>
                  ) : (
                    <button type="button" className="dodaj-gumb" style={{ marginTop: '1.1rem', marginRight: '.8rem' }}
                      onClick={() => setPrilagajanjePravic(true)}>
                      + Prilagodi znesek pravic
                    </button>
                  )}
                  {(prikaziIzjemePravic || izjemePravice) ? (
                    <div className="polje" style={{ marginTop: '1.1rem' }}>
                      <label htmlFor="cw-izjeme-pravic">Napredno: izjeme po storitvi <span className="vec">neobvezno</span></label>
                      <input id="cw-izjeme-pravic" type="text" placeholder="npr. Ilustracije: neizključni prenos"
                        value={izjemePravice} onChange={e => setIzjemePravice(e.target.value)} />
                      <button type="button" className="povezava" style={{ marginTop: '.9rem' }}
                        onClick={() => { setIzjemePravice(''); setPrikaziIzjemePravic(false); }}>
                        <CaretUp size={14} weight="bold" aria-hidden /> Skrij izjeme
                      </button>
                    </div>
                  ) : izbrane.size > 1 ? (
                    <button type="button" className="dodaj-gumb" style={{ marginTop: '1.1rem' }}
                      onClick={() => setPrikaziIzjemePravic(true)}>
                      + Napredno: različne pravice po storitvi
                    </button>
                  ) : (
                    <button type="button" className="povezava" style={{ marginTop: '1.1rem' }}
                      onClick={() => setPrikaziIzjemePravic(true)}>
                      + Dodaj izjemo po storitvi
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {((klasicnaOblika && korak === posebnostiStep) || (vChatu && poMeh >= 4)) && (
            <>
              {vChatu && chatVpr('Posebnosti projekta?', 'Vse je neobvezno; pusti prazno in pojdi naprej.')}
              <div className="kartica">
                <div className="k-naslov">Dodatki k projektu <span className="vec">izbereš lahko več</span></div>
                <div className="opts">
                  {DODATKI.map(d => (
                    <button key={d.id} type="button"
                      className={'pill' + (dodatki.has(d.id) ? ' on' : '')}
                      onClick={() => preklopi(dodatki, d.id, setDodatki)}>
                      <span className="pill-fill" aria-hidden />
                      <span className="pill-tekst">{d.ime}<small>{d.opis}</small></span>
                    </button>
                  ))}
                </div>
              </div>
              {urnePostavkeUI()}
              {dodajPostavkoUI('Dodatni stroški za to ponudbo')}
            </>
          )}

          {((klasicnaOblika && korak === cenaStep) || (vChatu && poMeh >= 5)) && r && (
            <>
              {vChatu && chatVpr('Tvoja cena.', 'Pametno izhodišče — prilagodi jo po občutku.')}
              {/* preklop: trije paketi ali ena koncna cena (Priporoceni obseg) */}
              <div className="opts" style={{ marginBottom: '.4rem' }}>
                <button type="button" className={'pill' + (!enaCena ? ' on' : '')} onClick={() => setEnaCena(false)}>
                  <span className="pill-fill" aria-hidden /><span className="pill-tekst">Trije paketi</span>
                </button>
                <button type="button" className={'pill' + (enaCena ? ' on' : '')} onClick={() => setEnaCena(true)}>
                  <span className="pill-fill" aria-hidden /><span className="pill-tekst">Ena cena</span>
                </button>
              </div>
              <div className={'paketi' + (enaCena ? ' paketi-ena' : '')}>
                {(enaCena ? r.paketi.filter(p => p.id === 'priporoceni') : r.paketi).map(p => (
                  <div key={p.id} className={'paket' + (p.id === 'priporoceni' && !enaCena ? ' mid' : '')}>
                    <button type="button" className="paket-edit"
                      aria-label={'Ročno popravi ceno paketa ' + p.ime}
                      title="Ročno popravi ceno"
                      onClick={() => setUrejamPaket(urejamPaket === p.id ? null : p.id)}>
                      <PencilSimple size={15} weight="bold" />
                    </button>
                    <h3>{enaCena ? 'Cena' : p.ime}</h3>
                    {r.popustPct > 0 && !p.rocna && <div className="redna">{val(p.redna)}</div>}
                    {urejamPaket === p.id ? (
                      <div className="paket-cena-uredi">
                        <input type="number" min={0} step={50} autoFocus
                          aria-label={'Cena paketa ' + p.ime}
                          placeholder={String(zaokrozi(p.skupaj * vfx.fx))}
                          value={rocniPaketi[p.id] ?? ''}
                          onChange={e => setRocniPaketi({ ...rocniPaketi, [p.id]: e.target.value })} />
                        <span className="pe-znak">{vfx.znak}</span>
                      </div>
                    ) : (
                      <div className="znesek">{val(p.skupaj)}</div>
                    )}
                    {p.rocna && urejamPaket !== p.id && <div className="paket-rocno">ročno</div>}
                    {urejamPaket === p.id && (rocniPaketi[p.id] ?? '') !== '' && (
                      <button type="button" className="povezava paket-reset"
                        onClick={() => { const n = { ...rocniPaketi }; delete n[p.id]; setRocniPaketi(n); }}>
                        ↺ Samodejno
                      </button>
                    )}
                    <p>{p.opis}</p>
                  </div>
                ))}
              </div>
              <div className="kartica" style={{ marginTop: '1.4rem' }}>
                <div className="numgrid" style={{ marginTop: 0 }}>
                  <div className="polje">
                    <label htmlFor="cw-popust">Popust (%)</label>
                    <input id="cw-popust" type="number" min={0} max={50} step={5}
                      placeholder="0" value={popust}
                      onChange={e => setPopust(e.target.value)} />
                  </div>
                  <div className="polje">
                    <label htmlFor="cw-veljavnost">Ponudba velja (dni){stevilkaPonudbe ? <span className="vec">št. {stevilkaPonudbe}</span> : null}</label>
                    <input id="cw-veljavnost" type="number" min={1} max={365} step={1}
                      placeholder="30" value={veljavnostDni}
                      onChange={e => setVeljavnostDni(e.target.value)} />
                  </div>
                </div>
                <p className="hint">Popust naj ima vedno razlog (prvi projekt, paket, dolgoročno sodelovanje) in v ponudbi vedno stoji ob redni ceni. Ponudba dobi zaporedno številko in rok veljavnosti (privzeto 30 dni).</p>
              </div>
              <p className="razlaga">
                Cena zajema izvedbo ({r.sez.map(s => s.ime.toLowerCase()).join(' + ')}),
                umerjeno na tvoje izkušnje{r.vel.mult !== 1 || r.trgMult !== 1 ? ' ter velikost in trg naročnika' : ''}.
                {r.prenos === 'licenca'
                  ? <>Avtorske pravice se prenesejo z <b>letno licenco {val(r.licenca)} / leto</b> (odkup ni vključen{r.raba === 'projekt' ? <>; možna alternativa so <b>tantieme {r.tantiemePct} % od prodaje</b></> : null}).</>
                  : <>Vsaka od treh opcij vključuje tudi <b>{r.prenos === 'neizkljucni' ? 'neizključni' : 'enkratni'} prenos avtorskih pravic ({val(r.pravice)})</b>
                      {r.praviceRocne
                        ? <> — znesek si nastavila sama</>
                        : r.dobicekPodan
                          ? r.raba === 'projekt'
                            ? <> — izračunan iz pričakovanega dobička projekta, ki si ga vpisala</>
                            : <> — izračunan iz dobička naročnika, ki si ga vpisala</>
                          : <> — privzeto ocenjen; natančnejši znesek nastaviš v koraku o prenosu pravic</>}
                      {r.prenos === 'neizkljucni' ? <> (avtor lahko delo ponudi tudi drugim)</> : null};
                      {' '}namesto odkupa lahko ponudiš <b>letno licenco {val(r.licenca)}</b>{r.raba === 'projekt' ? <> ali <b>tantieme {r.tantiemePct} % od prodaje</b></> : null}.</>}
                Vključene korekture: <b>Osnovni 1 krog, Priporočeni 2, Premium 3</b>; nadaljnje po urni postavki{(() => { const u = urnePostavke.map(x => Math.round(Number(x.cena)) || 0).filter(n => n > 0); return u.length ? <> ({u[0].toLocaleString('sl-SI')} {vfx.znak}/uro)</> : null; })()}.
                Tri opcije zato, ker stranka ne izbira med »da« in »ne«, ampak med »katero«.
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

          {korak === ponudbaStep && (
            <div className="priprava priprava-stran">
              <div className="priprava-telo">
              {/* NAČIN + TON + AI */}
              <div className="pon-vrh">
                <div className="segpills" role="group" aria-label="Obseg ponudbe">
                  {([['kratka', 'Kratka ponudba'], ['razsirjena', 'Razširjena ponudba']] as const).map(([id, ime]) => (
                    <button key={id} type="button" className={obsegPonudbe === id ? 'on' : ''}
                      onClick={() => { setObsegPonudbe(id); setRocnoBesedilo(false); }}>{ime}</button>
                  ))}
                </div>
                <div className="segpills" role="group" aria-label="Ton ponudbe">
                  {TONI.map(t => (
                    <button key={t.id} type="button" className={tonPonudbe === t.id ? 'on' : ''}
                      onClick={() => { setTonPonudbe(t.id); setRocnoBesedilo(false); }}>{t.ime}</button>
                  ))}
                </div>
                <div className="pon-vrh-desno">
                  <button type="button" className={'ai-gumb ponastavi-gumb' + (rocnoBesedilo ? ' aktiv' : '')} title="Ponastavi na samodejno besedilo" aria-label="Ponastavi na samodejno besedilo"
                    onClick={ponastaviBesedilo}><ArrowCounterClockwise size={18} weight="bold" /></button>
                  <button type="button" className="ai-gumb" title="AI pomočnik" aria-label="AI pomočnik"
                    onClick={() => setAiKmalu(v => !v)}><MagicWand size={19} /></button>
                </div>
              </div>
              {aiKmalu && (
                <p className="hint ai-namig">AI pomočnik (predlaga in izboljša besedilo ponudbe) pride kot naslednja nadgradnja — potrebuje zaledje. Zaenkrat besedilo urejaš ročno z orodji spodaj.</p>
              )}
              {obsegPonudbe === 'razsirjena' && urnePostavke.some(u => Number(u.cena) > 0) && (
                <label className="ure-preklop">
                  <input type="checkbox" checked={kaziUre}
                    onChange={e => { setKaziUre(e.target.checked); setRocnoBesedilo(false); }} />
                  <span>Prikaži oceno ur v ponudbi <em>(privzeto skrito — cena je po vrednosti; vklopi le, če stranka želi razčlenitev ur)</em></span>
                </label>
              )}
              {/* FORMATIRANJE — okrogli gumbi */}
              <div className="orodjarna" aria-label="Oblikovanje ponudbe">
                {oznaciNamig && <div className="oznaci-namig" role="status">Najprej označi besedilo</div>}
                <div className="tool-vel2" role="group" aria-label="Velikost besedila">
                  <button type="button" className="tool-krog" onMouseDown={e => { e.preventDefault(); velikost(-1); }} aria-label="Pomanjšaj" title="Manjše"><CaretDown size={14} weight="bold" /></button>
                  <span className="tv-aa" aria-hidden>Aa</span>
                  <button type="button" className="tool-krog" onMouseDown={e => { e.preventDefault(); velikost(1); }} aria-label="Povečaj" title="Večje"><CaretUp size={14} weight="bold" /></button>
                </div>
                <button type="button" className="tool-krog" onMouseDown={e => { e.preventDefault(); oblikuj('bold'); }} title="Krepko" aria-label="Krepko"><TextB size={17} weight="bold" /></button>
                <button type="button" className="tool-krog" onMouseDown={e => { e.preventDefault(); oblikuj('italic'); }} title="Ležeče" aria-label="Ležeče"><TextItalic size={17} /></button>
                <select className="pisava-select" aria-label="Pisava besedila" defaultValue=""
                  onMouseDown={() => editorRef.current?.focus()}
                  onChange={e => { const v = e.target.value; if (v) uporabiPisavo(v); e.currentTarget.value = ''; }}>
                  <option value="" disabled>Pisava</option>
                  <option value="Bodoni Moda">Elegantna</option>
                  <option value="Montserrat">Montserrat</option>
                  <option value="Roboto">Roboto</option>
                  <option value="Lora">Lora</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Arial">Arial</option>
                </select>
                <button type="button" className="tool-krog" onMouseDown={e => { e.preventDefault(); oblikuj('formatBlock', 'h1'); }} title="Naslov" aria-label="Naslov H1">H1</button>
                <button type="button" className="tool-krog" onMouseDown={e => { e.preventDefault(); oblikuj('formatBlock', 'h2'); }} title="Podnaslov" aria-label="Podnaslov H2">H2</button>
                <button type="button" className="tool-krog" onMouseDown={e => { e.preventDefault(); oblikuj('formatBlock', 'p'); }} title="Navadno besedilo" aria-label="Navadno besedilo P">P</button>
                {/* barva: cilj (crke / ozadje crk) */}
                <button type="button" className={'tool-krog tool-t' + (barvaCilj === 'crke' ? ' on' : '')} onMouseDown={e => { e.preventDefault(); setBarvaCilj('crke'); }} title="Barvaj črke" aria-label="Barvaj črke"><span className="ti">T</span></button>
                <button type="button" className={'tool-krog tool-t' + (barvaCilj === 'podlaga' ? ' on' : '')} onMouseDown={e => { e.preventDefault(); setBarvaCilj('podlaga'); }} title="Barvaj ozadje črk" aria-label="Barvaj ozadje črk"><span className="ti ti-box">T</span></button>
                <span className="tool-locnica" aria-hidden />
                {['#111111', '#7C3AED', '#FA4892', '#EEE8D8', '#50E3C2'].map(barva => (
                  <button key={barva} type="button" className="barvica" style={{ background: barva }}
                    aria-label={'Barva ' + barva}
                    title={(barvaCilj === 'podlaga' ? 'Ozadje' : 'Črke') + ' — dvojni klik odstrani barvo'}
                    onMouseDown={e => { e.preventDefault(); uporabiBarvo(barva); }}
                    onDoubleClick={e => { e.preventDefault(); odstraniBarvo(); }} />
                ))}
                <button type="button" className="barvica barvica-mavrica" aria-label="Izberi poljubno barvo" title="Izberi poljubno barvo"
                  onMouseDown={e => { e.preventDefault(); barvaRef.current?.click(); }} />
                <input ref={barvaRef} type="color" hidden onChange={e => uporabiBarvo(e.target.value)} />
                <span className="tool-locnica" aria-hidden />
                <button type="button" className="tool" onClick={() => fileRef.current?.click()} title="Uvozi predlogo / podlogo (HTML ali TXT)">
                  <UploadSimple size={17} /> Uvozi podlogo
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
              </div>
            </div>
          )}

          {korak === zakljucekStep && (
            <div className="btnvrsta">
              <button type="button" className="gumb" onClick={kopiraj}>
                <CopySimple size={17} /> {kopirano ? 'Skopirano ✓' : 'Kopiraj ponudbo'}
              </button>
              <button type="button" className="gumb" disabled={!narocnikEmail.trim()}
                title={narocnikEmail.trim() ? undefined : 'Vpiši email naročnika na koraku Kdo je stranka'}
                onClick={posljiMailto}>
                <EnvelopeSimple size={17} /> Pošlji ponudbo
              </button>
              <button type="button" className="povezava" onClick={prenesiPdf} title="A4 s podlogo — glava in noga iz tvojih podatkov; v oknu za tisk izberi »Shrani kot PDF«">
                <FilePdf size={17} /> Prenesi PDF
              </button>
              <button type="button" className="povezava" onClick={prenesi}>
                <DownloadSimple size={17} /> Prenesi besedilo
              </button>
              <button type="button" className="povezava" onClick={prenesiCsv}>
                <FileText size={17} /> Izvozi postavke (CSV za račune)
              </button>
              <button type="button" className="povezava" onClick={shraniVArhiv}>
                <FloppyDisk size={17} /> Shrani ponudbo v arhiv
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MOBILE: ponudba v nogi kot FAB (kosarica) — tap odpre drsni panel */}
      {korak === 0 && !klasicnaOblika && !uvodChat && (
        <>
          {ponudbaOdprta && <div className="ponudba-backdrop" onClick={() => setPonudbaOdprta(false)} aria-hidden />}
          <button type="button" className={'ponudba-fab' + (ponudbaOdprta ? ' skrit' : '')}
            onClick={() => setPonudbaOdprta(true)} aria-label="Odpri ponudbo">
            <span className="fab-ikona" aria-hidden><FileText size={22} weight="regular" />
              {stPostavk > 0 && <span className="fab-tag">{stPostavk}</span>}
            </span>
            <span className="fab-znesek">Ponudba<b>od {val(skupajOkvirno)}</b></span>
          </button>
        </>
      )}

      <div className={'noga' + (vChatu ? ' noga-ob-panelu' : '') + (onboardingOdprt ? ' noga-skrita' : '')}>
        <div className="noga-c">
          <div className="noga-gumbi">
            {(korak > 0 || (korak === 0 && !uvodChat && !klasicnaOblika)) && (
              <button type="button" className="gumb-nazaj" aria-label="Nazaj"
                onClick={korak === 0
                  ? () => {
                      if (poMeh > 0) {
                        setPoMeh(poMeh - 1);
                        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                        window.setTimeout(() => {
                          const vpr = document.querySelectorAll('.chat-vpr');
                          const zadnji = vpr[vpr.length - 1];
                          if (zadnji) zadnji.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
                          else window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
                        }, 60);
                      } else { setUvodChat(true); setChatKorak(6); }
                    }
                  : nazaj}><ArrowUp size={17} weight="bold" aria-hidden /></button>
            )}
            {/* med aktivnim onboarding-chatom flow vodijo inline gumbi -> skrijemo spodnji "Naprej" (samo en gumb) */}
            {korak === 0 && uvodChat && !klasicnaOblika ? null : korak < KORAKOV - 1 ? (
              <button type="button" className="gumb"
                disabled={korak === 0 && !r}
                onClick={() => {
                  /* v chatu: vsak Naprej razkrije naslednje NAVZDOL (o stranki -> trg -> raba -> pravice -> posebnosti -> CENA), nato priprava ponudbe */
                  if (vChatu && poMeh < 5) {
                    setPoMeh(poMeh + 1);
                    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                    /* zapelji NOVO vprasanje (zadnji chatVpr) blizu vrha, ne na dno strani */
                    window.setTimeout(() => {
                      const vpr = document.querySelectorAll('.chat-vpr');
                      const zadnji = vpr[vpr.length - 1];
                      if (zadnji) {
                        const y = window.scrollY + zadnji.getBoundingClientRect().top - 90;
                        window.scrollTo({ top: Math.max(0, y), behavior: reduce ? 'auto' : 'smooth' });
                      } else {
                        window.scrollTo({ top: document.body.scrollHeight, behavior: reduce ? 'auto' : 'smooth' });
                      }
                    }, 90);
                  } else if (vChatu && poMeh === 5) {
                    setKorak(ponudbaStep);   /* priprava ponudbe = overlay/urejanje */
                  } else { naprej(); }
                }}>
                {vChatu && poMeh === 4 ? 'Pokaži ceno' : vChatu && poMeh === 5 ? 'Pripravi ponudbo' : korak === posebnostiStep ? 'Pokaži ceno' : korak === cenaStep ? 'Pripravi ponudbo' : korak === ponudbaStep ? 'Zaključi' : 'Naprej'}
                <ArrowDown size={16} weight="bold" aria-hidden />
              </button>
            ) : (
              <div className="noga-koncna">
                <button type="button" className="nazaj-g" onClick={() => setKorak(0)}>← Uredi od začetka</button>
                <button type="button" className="nazaj-g nova" onClick={novaPonudba}>↺ Nova ponudba</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

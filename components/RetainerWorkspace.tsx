'use client';

/* Dolgorocno sodelovanje (retainer) — SAMOSTOJEN produkt v videzu KALKULATORJA
   (paper + soft blob ozadje, Bodoni, mehurcki). Reuse podatkov iz kalkulatorjeve
   shrambe. Naredi retainer PONUDBO in POGODBO (PDF prek /api/ponudba-pdf). */

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { User, TextAa, ArrowUp, ArrowDown, PencilSimple, Eye, CaretDown, CaretUp, TextB, TextItalic } from '@phosphor-icons/react';
import { saveRetainerDraft } from '@/lib/pinartFlowCloud';
import { OrbSfera, ORB_BARVE, ikonaZa, ORB0_CSS, osvetli } from './Orb0';
import VidezDokumentov from './VidezDokumentov';
import AmbientBubbles from '@/components/AmbientBubbles';
import { dokCss, dokFontLink, dokVars, DOK_BARVA_PRIVZETA, DOK_FONT_PRIVZETI } from '@/lib/dokVidez';

const K_NAST = 'pinart-kalkulator-v2';
const K_NAROCNIKI = 'pinart-kalkulator-narocniki';
const K_STEVEC_RET = 'pinart-kalkulator-stevec-retainer';

/* parametri (po raziskavi le zamenjas cifre) */
const POPUST: Record<number, number> = { 3: 0.05, 6: 0.10, 12: 0.15 };
const URE_MOZNOSTI = [5, 10, 20, 40];
const DOBE = [3, 6, 12];
const OVERAGE_MULT = 1.0;
const ODPOVED_DNI = 30;
const PRIVZETA_URNA = 45;

/* obseg = mehurcki (enak videz kot kalkulator: OrbSfera + ikona + kratko ime).
   ime = polno (za dokumente), kratko = na mehurcku, ikon = id za ikonaZa. */
/* teza = relativna velikost mehurcka (kot TEZA v kalkulatorju), da niso vsi enaki */
type Scope = { id: string; ime: string; kratko: string; ikon: string; teza: number };
const SCOPE: Scope[] = [
  { id: 'cgp', ime: 'Celostna grafična podoba', kratko: 'CGP', ikon: 'cgp', teza: 1.3 },
  { id: 'logo', ime: 'Logotip', kratko: 'Logotip', ikon: 'logo', teza: 0.94 },
  { id: 'web', ime: 'Spletna stran', kratko: 'Spletna stran', ikon: 'web', teza: 1.14 },
  { id: 'social', ime: 'Social media', kratko: 'Social media', ikon: 'smm', teza: 0.9 },
  { id: 'copy', ime: 'Copywriting', kratko: 'Copywriting', ikon: 'copy', teza: 0.86 },
  { id: 'ilustracija', ime: 'Ilustracija', kratko: 'Ilustracija', ikon: 'ilustracija', teza: 1.04 },
  { id: 'fotografija', ime: 'Fotografija', kratko: 'Fotografija', ikon: 'fotografija', teza: 0.92 },
  { id: 'motion', ime: 'Video / motion', kratko: 'Video', ikon: 'motion', teza: 1.12 },
  { id: 'aplikacija', ime: 'Aplikacija', kratko: 'Aplikacija', ikon: 'aplikacija', teza: 1.2 },
  { id: 'seo', ime: 'SEO', kratko: 'SEO', ikon: 'seo', teza: 0.8 },
  { id: 'oglasi', ime: 'Oglasi / kampanje', kratko: 'Oglasi', ikon: 'kampanja', teza: 1.0 },
  { id: 'direkcija', ime: 'Kreativna direkcija', kratko: 'Direkcija', ikon: 'direkcija', teza: 1.08 },
];

type Ponudnik = { ime: string; davcna: string; email: string; telefon: string; naslov: string; trr: string };
type Narocnik = { ime: string; email?: string; oseba?: string; naslov?: string; davcna?: string };

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
const eur = (n: number) => Math.round(n).toLocaleString('sl-SI') + ' €';
const datStr = (d: Date) => `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`;
const imeScope = (id: string) => SCOPE.find(s => s.id === id)?.ime ?? id;

/* determinističen psevdo-naključni faktor (0..1) za plavajočo animacijo mehurčkov (kot kalkulator) */
const psr = (n: number) => { const x = Math.sin(n * 127.1 + 7.3) * 43758.5453; return x - Math.floor(x); };
/* CSS spremenljivke za lebdenje enega mehurčka po indeksu i */
const plavajVars = (i: number): CSSProperties => ({
  ['--dur' as string]: (9 + psr(i * 3 + 1) * 5).toFixed(1) + 's',
  ['--del' as string]: (-psr(i * 7 + 2) * 6).toFixed(1) + 's',
  ['--vdel' as string]: (i * 0.05).toFixed(2) + 's',
  ['--fx' as string]: ((psr(i + 11) * 5 + 3) * (psr(i + 4) < 0.5 ? -1 : 1)).toFixed(0) + 'px',
  ['--fy' as string]: (-(psr(i + 23) * 5 + 3)).toFixed(0) + 'px',
});

/* avatar (vodicka) — prenesen iz kalkulatorja */
const OBRAZ = (
  <svg viewBox="0 0 40 40" aria-hidden>
    <path d="M9.8 18.2q3.2-4.6 6.4 0" stroke="#2A2035" strokeWidth="2.1" fill="none" strokeLinecap="round" />
    <path d="M23.8 18.2q3.2-4.6 6.4 0" stroke="#2A2035" strokeWidth="2.1" fill="none" strokeLinecap="round" />
    <path d="M14.5 23.5q5.5 4.6 11 0" stroke="#2A2035" strokeWidth="2.1" fill="none" strokeLinecap="round" />
    <circle cx="11.5" cy="21.5" r="1.9" fill="rgba(255,120,170,.5)" />
    <circle cx="28.5" cy="21.5" r="1.9" fill="rgba(255,120,170,.5)" />
  </svg>
);
const Vpr = ({ naslov, opis }: { naslov: string; opis?: string }) => (
  <div className="rw-chat">
    <span className="rw-obraz" aria-hidden>{OBRAZ}</span>
    <span className="rw-mehur"><b>{naslov}</b>{opis ? <small>{opis}</small> : null}</span>
  </div>
);

/* satasta (honeycomb) razporeditev mehurckov — kot pri ponudbi (vrste 3-2-3, zamaknjene) */
const ORB_D = 156; /* premer mehurcka (px) — enak kot kalkulator (<=14 storitev) */
/* Mobilno enako kot kalkulator: 3 v siroki vrsti in premer 84, da najvecji mehurcek
   pride ~16px od roba zaslona. Prej sta bila 156px in 4 v vrsti fiksna, zato so bili
   na telefonu preveliki in odrezani ob desnem robu. */
const ORB_D_MOB = 96;
function scatter(n: number, jeMobilni = false) {
  const orbD = jeMobilni ? ORB_D_MOB : ORB_D;
  const orbMax = jeMobilni ? 3 : 4; /* siroka vrsta 4 (mobilno 3), ozja ena manj */
  const rs: number[] = []; let left = n, wide = true;
  while (left > 0) { const s = Math.min(left, wide ? orbMax : orbMax - 1); rs.push(s); left -= s; wide = !wide; }
  const start: number[] = []; let acc = 0; for (const s of rs) { start.push(acc); acc += s; }
  const step = (jeMobilni ? 62 : 84) / Math.max(orbMax - 1, 1);
  const rowH = jeMobilni ? Math.round(orbD * 1.34) : Math.round(orbD * 1.02) - 14;
  const poz = (i: number) => {
    let row = 0; while (row < rs.length - 1 && i >= start[row + 1]) row++;
    const cnt = rs[row]; const inRow = i - start[row];
    const isLast = row === rs.length - 1;
    /* zadnjo vrsto (Kreativna direkcija + dodaj) poravnamo DESNO — zadnji mehurcek (dodaj)
       pade na isti stolpec kot desni mehurcek ozje vrste (Fotografija, x=78%) */
    /* na mobilu vse vrste centriramo (3-2-3); desna poravnava zadnje vrste je namizni trik */
    const startX = (isLast && !jeMobilni) ? (78 - (cnt - 1) * step) : (50 - ((cnt - 1) * step) / 2);
    const x = startX + inRow * step;
    return { x: Math.min(92, Math.max(8, x)), row };
  };
  return { rows: rs.length, rowH, poz, orbD };
}

/* vLupini = retainer tece znotraj Flow ogrodja (vpisan uporabnik); takrat svoje
   glave ne rise, ker jo prispeva ogrodje. */
export default function RetainerWorkspace({ base, vLupini = false }: { base: string; vLupini?: boolean }) {
  /* enako kot kalkulator: pod 640px 3 mehurcki v vrsti in manjsi premer */
  const [jeMobilni, setJeMobilni] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const upd = () => setJeMobilni(mq.matches);
    upd(); mq.addEventListener('change', upd);
    return () => mq.removeEventListener('change', upd);
  }, []);
  const [ponudnik, setPonudnik] = useState<Ponudnik>({ ime: '', davcna: '', email: '', telefon: '', naslov: '', trr: '' });
  const [predklic, setPredklic] = useState('+386');
  const [urna, setUrna] = useState(PRIVZETA_URNA);
  const [ddvZavezanec, setDdvZavezanec] = useState(false);
  const [ddvStopnja, setDdvStopnja] = useState(22);
  const [nedavni, setNedavni] = useState<Narocnik[]>([]);

  const [scope, setScope] = useState<string[]>([]);
  const [scopeVnos, setScopeVnos] = useState('');
  const [lastna, setLastna] = useState<string[]>([]);
  const [dodajOdprt, setDodajOdprt] = useState(false);
  const [obsegTabela, setObsegTabela] = useState(false);
  const [korak, setKorak] = useState(0); /* korak-po-korak razkritje vprasanj (kot kalkulatorjev chat) */
  /* pogled = katera "stran" je prikazana — ENAKO kot kalkulator (vprasanja -> ponudba -> zakljucek).
     vprasanja: rw-korak-0..3; ponudba: samo dokument (urejevalnik/predogled); zakljucek: prenosi + nova ponudba. */
  const [pogled, setPogled] = useState<'vprasanja' | 'ponudba' | 'zakljucek'>('vprasanja');
  const [model, setModel] = useState<'ure' | 'paket' | 'oboje'>('ure');
  const [ure, setUre] = useState(10);
  const [paketMes, setPaketMes] = useState(0);
  const [doba, setDoba] = useState(12);
  const [nar, setNar] = useState<Narocnik>({ ime: '', email: '', oseba: '', naslov: '', davcna: '' });
  const [dodatniNar, setDodatniNar] = useState(false);
  const [pravice, setPravice] = useState('Licenca za rabo za čas trajanja pogodbe; ob prenehanju pravice, ki niso odkupljene, revertirajo avtorju. Moralne avtorske pravice ostanejo avtorju.');
  const [stevilka, setStevilka] = useState('');
  const [pdfNalaganje, setPdfNalaganje] = useState(false);
  const [napaka, setNapaka] = useState('');
  const [predType, setPredType] = useState<'pogodba' | 'ponudba'>('pogodba');
  const [predStrani, setPredStrani] = useState<string[]>([]);
  const [predNal, setPredNal] = useState(false);
  /* urejevalnik telesa dokumenta (kot kalkulator: contentEditable + orodjarna) */
  const [predogledMode, setPredogledMode] = useState(false);
  /* mobilni slide-up predal za oblikovanje — enako kot v kalkulatorju */
  const [ponSheet, setPonSheet] = useState<null | 'oblika'>(null);
  const [oznaciNamig, setOznaciNamig] = useState(false);
  const [velikostBesedila, setVelikostBesedila] = useState(3);
  const [rocnoTelo, setRocnoTelo] = useState(false);
  const [teloHtml, setTeloHtml] = useState('');
  const editorRef = useRef<HTMLDivElement | null>(null);
  const barvaRef = useRef<HTMLInputElement>(null);
  const [dokBarva, setDokBarva] = useState(DOK_BARVA_PRIVZETA);
  const [dokFont, setDokFont] = useState(DOK_FONT_PRIVZETI);
  const [imeUporabnika, setImeUporabnika] = useState('');
  const [profilOdprt, setProfilOdprt] = useState(false);
  const [nalozeno, setNalozeno] = useState(false);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(K_NAST) || '{}');
      if (s.ponudnik) setPonudnik({ trr: '', ...s.ponudnik });
      if (s.predklic) setPredklic(s.predklic);
      const u = (s.urnePostavke as { cena: string }[] | undefined)?.map(x => Math.round(Number(x.cena)) || 0).find(n => n > 0);
      if (u) setUrna(u);
      if (s.ddvZavezanec) setDdvZavezanec(true);
      if (s.ddvStopnja) setDdvStopnja(Number(s.ddvStopnja) || 22);
      if (s.dokBarva) setDokBarva(s.dokBarva);
      if (s.dokFont) setDokFont(s.dokFont);
      if (s.imeUporabnika) setImeUporabnika(String(s.imeUporabnika));
    } catch { /* prazno */ }
    try {
      const nn = JSON.parse(localStorage.getItem(K_NAROCNIKI) || '[]');
      if (Array.isArray(nn)) setNedavni(nn.map((x: unknown) => typeof x === 'string' ? { ime: x } : x).filter((x): x is Narocnik => !!x && typeof (x as Narocnik).ime === 'string'));
    } catch { /* prazno */ }
    try {
      const leto = new Date().getFullYear();
      const c = JSON.parse(localStorage.getItem(K_STEVEC_RET) || '{}');
      setStevilka(`${leto}-R${String((Number(c[leto]) || 0) + 1).padStart(2, '0')}`);
    } catch { /* prazno */ }
    setNalozeno(true);
  }, []);

  /* profil (podatki + videz) shranimo NAZAJ v skupni K_NAST (merge, da ne
     povozimo ostalih nastavitev kalkulatorja). Tako je usklajeno z kalkulatorjem. */
  useEffect(() => {
    if (!nalozeno) return;
    try {
      const s = JSON.parse(localStorage.getItem(K_NAST) || '{}');
      s.ponudnik = ponudnik;
      s.predklic = predklic;
      if (ddvZavezanec) s.ddvZavezanec = true; else delete s.ddvZavezanec;
      s.ddvStopnja = ddvStopnja;
      if (dokBarva !== DOK_BARVA_PRIVZETA) s.dokBarva = dokBarva; else delete s.dokBarva;
      if (dokFont !== DOK_FONT_PRIVZETI) s.dokFont = dokFont; else delete s.dokFont;
      localStorage.setItem(K_NAST, JSON.stringify(s));
    } catch { /* prazno */ }
  }, [nalozeno, ponudnik, predklic, ddvZavezanec, ddvStopnja, dokBarva, dokFont]);

  /* ob spremembi koraka (Naprej/Nazaj) zaslajdaj vprasanje tega koraka v vidno polje —
     ENAKO kot kalkulator: prek Lenis (window.__pinartLenis), z resize + fallback na window.
     Preskoci zacetni render (da ob nalaganju ne skoci). */
  const prviRender = useRef(true);
  useEffect(() => {
    if (prviRender.current) { prviRender.current = false; return; }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t = window.setTimeout(() => {
      const el = document.getElementById(`rw-korak-${korak}`);
      if (!el) return;
      const lenis = (window as unknown as { __pinartLenis?: { scrollTo: (t: number, o?: { immediate?: boolean; force?: boolean }) => void; resize?: () => void } }).__pinartLenis;
      lenis?.resize?.();
      const cilj = Math.max(0, el.getBoundingClientRect().top + window.scrollY - 96);
      if (lenis && typeof lenis.scrollTo === 'function') lenis.scrollTo(cilj, { immediate: reduce, force: true });
      else window.scrollTo({ top: cilj, behavior: reduce ? 'auto' : 'smooth' });
    }, 60);
    return () => window.clearTimeout(t);
  }, [korak]);

  const ret = useMemo(() => {
    const ureBaza = model !== 'paket' ? ure * urna : 0;
    const paketBaza = model !== 'ure' ? Math.max(0, Math.round(paketMes)) : 0;
    const mesBruto = ureBaza + paketBaza;
    const popust = POPUST[doba] ?? 0;
    const mesNeto = Math.round(mesBruto * (1 - popust));
    return { urna, ureBaza, paketBaza, mesBruto, popust, mesNeto, skupajDoba: mesNeto * doba, letno: mesNeto * 12, overage: Math.round(urna * OVERAGE_MULT) };
  }, [model, ure, urna, paketMes, doba]);

  const vsiScope = [...scope, ...lastna];
  const L = scatter(SCOPE.length + 1, jeMobilni); /* + "dodaj" mehurcek */
  /* Enako kot kalkulator: na mobilu stisnemo razpon utezi, da je tudi najlazji mehurcek
     dovolj velik za svoj napis (npr. "Social media"), najtezji pa ne pride do roba. */
  const tezaOrb = (t: number) => (jeMobilni ? 0.668 + 0.365 * t : t);
  const zDdv = (n: number) => Math.round(n * (1 + ddvStopnja / 100));
  const toggle = (id: string) => setScope(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const dodajLastno = () => { const v = scopeVnos.trim(); if (v && !lastna.includes(v)) setLastna(l => [...l, v]); setScopeVnos(''); };
  const uporabiNar = (n: Narocnik) => { setNar({ ime: n.ime, email: n.email || '', oseba: n.oseba || '', naslov: n.naslov || '', davcna: n.davcna || '' }); if (n.naslov || n.davcna || n.oseba) setDodatniNar(true); };

  /* ── dokumenti ── */
  const glava = () => {
    const kontakt = [ponudnik.davcna.trim() && 'Davčna št.: ' + ponudnik.davcna.trim(), ponudnik.trr.trim() && 'TRR: ' + ponudnik.trr.trim(), ponudnik.telefon.trim() && 'Tel.: ' + predklic + ' ' + ponudnik.telefon.trim(), ponudnik.email.trim()].filter(Boolean).join(' · ');
    return `<div class="lg"><div><b>${esc(ponudnik.ime.trim() || '[Tvoje podjetje]')}</b>${ponudnik.naslov.trim() ? '<br>' + esc(ponudnik.naslov.trim()) : ''}${kontakt ? '<br><span class="mut">' + esc(kontakt) + '</span>' : ''}</div><div class="rt">Pinart</div></div>`;
  };
  const DOC_CSS = `@page{size:A4;margin:16mm 16mm 18mm}*{-webkit-print-color-adjust:exact;print-color-adjust:exact;box-sizing:border-box}body{margin:0;color:#1a1622;font-family:'Helvetica Neue',Arial,sans-serif;font-size:10.5pt;line-height:1.42}.lg{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;padding-bottom:12px;border-bottom:1.5px solid #B25476;margin-bottom:20px}.lg .rt{font-family:'Bodoni Moda',Didot,Georgia,serif;font-size:15pt;color:#111}.mut{color:#8a8177;font-size:9pt}h1{font-family:'Bodoni Moda',Didot,Georgia,serif;font-weight:600;font-size:20pt;margin:2px 0 4px;color:#111}.kick{font-size:8.5pt;letter-spacing:.24em;text-transform:uppercase;color:#B25476;font-weight:700}h2{font-size:8.5pt;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#B25476;margin:11px 0 5px;padding-top:6px;border-top:1px solid #ecdfe4;break-after:avoid}p{margin:0 0 5px}ul{margin:.2rem 0 .7rem;padding-left:1.15rem}li{margin:3px 0;break-inside:avoid}.big{font-family:'Bodoni Moda',Didot,Georgia,serif;font-size:16pt;color:#111;font-weight:600}.meta{color:#555;font-size:9.5pt;margin:2px 0 0}.pog-clen{margin:7px 0;break-inside:avoid}.pog-clen h2{border-top:0;padding-top:0;margin:6px 0 3px;font-size:9pt}.parties p{margin:.15rem 0}.sig{display:flex;gap:40px;margin-top:15px;break-inside:avoid}.sig>div{flex:1;font-size:9pt;color:#444;display:flex;flex-direction:column}.sig>div>span:first-child{font-size:7.5pt;letter-spacing:.14em;text-transform:uppercase;color:#8a8177;margin-bottom:24px}.sig .lin{border-top:1px solid #111;margin-bottom:4px}`;
  const doc = (body: string) => `<!doctype html><html lang="sl"><head><meta charset="utf-8">${dokFontLink(dokFont)}<style>${dokCss(DOC_CSS)}</style></head><body style="${dokVars(dokBarva, dokFont)}">${glava()}${body}</body></html>`;

  const modelOpis = model === 'ure' ? `${ure} ur na mesec` : model === 'paket' ? 'dogovorjeni mesečni paket storitev' : `${ure} ur na mesec + dogovorjeni paket storitev`;
  const obsegHtml = vsiScope.length ? `<ul>${vsiScope.map(s => `<li>${esc(imeScope(s))}</li>`).join('')}</ul>` : '<p class="mut">[dopolni obseg]</p>';

  const ponudbaHtml = () => `
    <div class="kick">Ponudba — dolgoročno sodelovanje${stevilka ? ' · št. ' + esc(stevilka) : ''}</div>
    <h1>Mesečno sodelovanje</h1>
    <p class="meta">Datum: ${datStr(new Date())}${nar.ime.trim() ? ' · za: ' + esc(nar.ime.trim()) : ''}</p>
    <h2>Obseg (kaj vključuje mesečno)</h2>${obsegHtml}
    <h2>Mesečni znesek</h2>
    <p class="big">${eur(ret.mesNeto)}${ddvZavezanec ? ` <span class="mut" style="font-size:10pt">(z DDV ${eur(zDdv(ret.mesNeto))})</span>` : ''} / mesec</p>
    <ul>
      <li>Vključeno: ${esc(modelOpis)}</li>
      ${ret.ureBaza > 0 ? `<li>Blok ur: ${ure} h / mesec (urna postavka ${eur(urna)})</li>` : ''}
      ${ret.paketBaza > 0 ? `<li>Mesečni paket: ${eur(ret.paketBaza)} / mesec</li>` : ''}
      <li>Doba: ${doba} mesecev${ret.popust > 0 ? ` — zavezni popust −${Math.round(ret.popust * 100)} % (redna cena ${eur(ret.mesBruto)} / mesec)` : ''}</li>
      <li>Dodatne ure nad blokom: ${eur(ret.overage)} / uro</li>
      <li>Odpovedni rok: ${ODPOVED_DNI} dni</li>
      <li>Skupaj za dobo (${doba} mes): ${eur(ret.skupajDoba)} · letna vrednost: ${eur(ret.letno)}</li>
    </ul>
    <h2>Plačilo</h2>
    <p>Mesečni znesek se zaračuna vnaprej, ob začetku vsakega meseca sodelovanja. Neporabljene ure se praviloma ne prenašajo v naslednji mesec. Delo nad dogovorjenim blokom se obračuna po urni postavki zgoraj.</p>
    <h2>Avtorske pravice</h2><p>${esc(pravice)}</p>`;

  const pogodbaHtml = () => {
    const izvajalec = [ponudnik.ime.trim() || '[Izvajalec]', ponudnik.naslov.trim(), ponudnik.davcna.trim() && ('davčna št. ' + ponudnik.davcna.trim()), ponudnik.trr.trim() && ('TRR ' + ponudnik.trr.trim())].filter(Boolean).join(', ');
    const narStr = [nar.ime.trim() || '[Naročnik]', nar.oseba?.trim(), nar.naslov?.trim(), nar.davcna?.trim() && ('davčna št. ' + nar.davcna.trim())].filter(Boolean).join(', ');
    const ddvStr = ddvZavezanec ? ' (+ DDV)' : ' (izvajalec ni zavezanec za DDV — 1. odst. 94. člena ZDDV-1)';
    return `
      <div class="kick">Pogodba — dolgoročno sodelovanje${stevilka ? ' · št. ' + esc(stevilka) : ''}</div>
      <h1>Pogodba o dolgoročnem sodelovanju</h1>
      <p class="meta">Datum: ${datStr(new Date())}${nar.ime.trim() ? ' · z: ' + esc(nar.ime.trim()) : ''}</p>
      <div class="parties" style="margin-top:14px"><p>sklenjena med:</p><p><b>Izvajalec:</b> ${esc(izvajalec)}</p><p>in</p><p><b>Naročnik:</b> ${esc(narStr)}</p></div>
      <div class="pog-clen"><h2>1. člen — Predmet</h2><p>Izvajalec za naročnika opravlja kreativne storitve v obliki dolgoročnega mesečnega sodelovanja. Vključena področja: ${vsiScope.length ? esc(vsiScope.map(imeScope).join(', ')) : 'skladno z dogovorjenim obsegom'}.</p></div>
      <div class="pog-clen"><h2>2. člen — Obseg</h2><p>Mesečni obseg: <b>${esc(modelOpis)}</b>.${ret.ureBaza > 0 ? ` Blok ur znaša ${ure} h na mesec.` : ''} Neporabljene ure se praviloma ne prenašajo v naslednji mesec, razen po pisnem dogovoru. Delo nad dogovorjenim obsegom se obračuna po urni postavki ${eur(ret.overage)} / uro.</p></div>
      <div class="pog-clen"><h2>3. člen — Trajanje</h2><p>Pogodba se sklene za dobo <b>${doba} mesecev</b>, z veljavnostjo od dneva podpisa (predvidoma ${datStr(new Date())}). Po izteku se lahko podaljša s pisnim soglasjem obeh strank.</p></div>
      <div class="pog-clen"><h2>4. člen — Cena in plačilo</h2><p>Mesečno nadomestilo znaša <b>${eur(ret.mesNeto)}${ddvStr}</b>. Znesek se zaračuna vnaprej, ob začetku vsakega meseca, z rokom plačila 8 dni. Za celotno dobo (${doba} mesecev) skupaj ${eur(ret.skupajDoba)}${ddvZavezanec ? ' + DDV' : ''}.</p></div>
      <div class="pog-clen"><h2>5. člen — Avtorske pravice</h2><p>${esc(pravice)}</p></div>
      <div class="pog-clen"><h2>6. člen — Odpoved</h2><p>Vsaka stranka lahko pogodbo odpove s pisno izjavo, z <b>${ODPOVED_DNI}-dnevnim</b> odpovednim rokom. Že opravljeno delo in tekoči mesec se poravnata v celoti.</p></div>
      <div class="pog-clen"><h2>7. člen — Zaupnost</h2><p>Stranki varujeta zaupne podatke druge stranke in jih ne razkrivata tretjim osebam brez soglasja, tudi po prenehanju sodelovanja.</p></div>
      <div class="pog-clen"><h2>8. člen — Končne določbe</h2><p>Za razmerja, ki jih ta pogodba ne ureja, se uporablja pravo Republike Slovenije. Morebitne spore stranki rešujeta sporazumno; sicer je pristojno stvarno pristojno sodišče po sedežu izvajalca. Pogodba je sklenjena v dveh enakih izvodih.</p></div>
      <div class="sig"><div><span>Izvajalec</span><span class="lin"></span>${esc(ponudnik.ime.trim() || '')}</div><div><span>Naročnik</span><span class="lin"></span>${esc(nar.ime.trim() || '')}</div></div>`;
  };

  /* ── urejevalnik telesa (kopija kalkulatorjevega vzorca) ── */
  const teloZa = (kaj: 'ponudba' | 'pogodba') => kaj === 'ponudba' ? ponudbaHtml() : pogodbaHtml();
  const trenutnoTelo = () => teloZa(predType);
  /* callback-ref: urejevalnik se ustvari prazen -> napolnimo ga (le ce je prazen, da med tipkanjem ne resetiramo kurzorja) */
  const napolniEditor = (el: HTMLDivElement | null) => {
    editorRef.current = el;
    if (el && !el.innerHTML.trim()) el.innerHTML = teloHtml.trim() ? teloHtml : trenutnoTelo();
  };
  const sinhronizirajEditor = () => {
    const html = editorRef.current?.innerHTML || '';
    if (!(editorRef.current?.innerText || '').trim()) return; /* ne shrani praznega */
    setTeloHtml(html);
  };
  const rabiIzbor = new Set(['bold', 'italic', 'underline', 'fontSize', 'foreColor', 'hiliteColor', 'fontName']);
  const oblikuj = (ukaz: string, vrednost?: string) => {
    const sel = typeof window !== 'undefined' ? window.getSelection() : null;
    const prazenIzbor = !sel || sel.isCollapsed || !sel.toString().trim();
    if (rabiIzbor.has(ukaz) && prazenIzbor) { setOznaciNamig(true); return; }
    editorRef.current?.focus();
    document.execCommand(ukaz, false, vrednost);
    sinhronizirajEditor();
  };
  const velikost = (smer: number) => { const nv = Math.min(7, Math.max(1, velikostBesedila + smer)); setVelikostBesedila(nv); oblikuj('fontSize', String(nv)); };
  const uporabiPisavo = (font: string) => oblikuj('fontName', font);
  const ponastaviTelo = () => { setRocnoTelo(false); const html = trenutnoTelo(); setTeloHtml(html); if (editorRef.current) editorRef.current.innerHTML = html; };
  const izvozniTelo = () => { const e = editorRef.current?.innerHTML?.trim(); if (e) return e; if (teloHtml.trim()) return teloHtml; return trenutnoTelo(); };

  const shraniStevilko = () => { try { const leto = new Date().getFullYear(); const c = JSON.parse(localStorage.getItem(K_STEVEC_RET) || '{}'); c[leto] = (Number(c[leto]) || 0) + 1; localStorage.setItem(K_STEVEC_RET, JSON.stringify(c)); } catch { /* prazno */ } };
  const prenesi = async (kaj: 'ponudba' | 'pogodba') => {
    setNapaka('');
    /* trenutno prikazan tip izvozi iz UREJENEGA telesa; drugi tip generira sveze */
    const html = doc(kaj === predType ? izvozniTelo() : teloZa(kaj));
    const slug = (nar.ime.trim() || 'pinart').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const ime = (kaj === 'ponudba' ? 'retainer-ponudba-' : 'pogodba-dolgorocno-') + (slug || 'pinart');
    setPdfNalaganje(true);
    try {
      const res = await fetch('/api/ponudba-pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ html, ime, footer: [ponudnik.ime.trim(), kaj === 'ponudba' ? 'Retainer ponudba' : 'Pogodba o dolgoročnem sodelovanju'].filter(Boolean).join(' · ') }) });
      if (!res.ok) throw new Error('pdf');
      const blob = await res.blob();
      if (!blob.size) throw new Error('prazen');
      if (!nar.ime.trim()) throw new Error('stranka');
      const file = new File([blob], `${ime}.pdf`, { type: 'application/pdf' });
      void saveRetainerDraft({
        externalId: `retainer-${stevilka || slug || crypto.randomUUID()}`,
        number: stevilka || undefined,
        client: { id: `retainer-client-${slug || crypto.randomUUID()}`, name: nar.ime.trim(), email: nar.email, contact: nar.oseba, address: nar.naslov, tax: nar.davcna },
        scope: vsiScope.map(imeScope), pricingModel: model === 'ure' ? 'hours' : model === 'paket' ? 'package' : 'combined',
        hoursPerMonth: model === 'paket' ? 0 : ure, hourlyRate: urna, packageAmount: model === 'ure' ? 0 : paketMes,
        monthlyAmount: ret.mesNeto, durationMonths: doba, noticeDays: ODPOVED_DNI, rightsText: pravice,
        document: { file, kind: kaj === 'ponudba' ? 'offer' : 'contract' },
      }).catch(error => console.error('Retainer cloud save:', error));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = ime + '.pdf'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      shraniStevilko();
    } catch { setNapaka('PDF-ja ni bilo mogoče pripraviti. Poskusi znova.'); } finally { setPdfNalaganje(false); }
  };

  /* PREDOGLED (kot kalkulator): dejanski PDF, izrisan po straneh kot slike (pdf.js).
     Renderira le v nacinu Predogled (sicer ne obremenjujemo endpointa med urejanjem). */
  useEffect(() => {
    if (!predogledMode) return;
    let ziv = true;
    setPredNal(true);
    const t = window.setTimeout(async () => {
      try {
        const html = doc(izvozniTelo());
        const res = await fetch('/api/ponudba-pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ html, ime: 'predogled' }) });
        if (!res.ok) throw new Error('pdf');
        const buf = await res.arrayBuffer();
        if (!buf.byteLength || !ziv) return;
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        const pdf = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
        const strani: string[] = [];
        for (let i = 1; i <= pdf.numPages && ziv; i++) {
          const stran = await pdf.getPage(i);
          const vp = stran.getViewport({ scale: 2 });
          const canvas = document.createElement('canvas');
          canvas.width = Math.ceil(vp.width); canvas.height = Math.ceil(vp.height);
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          await stran.render({ canvas, canvasContext: ctx, viewport: vp } as unknown as Parameters<typeof stran.render>[0]).promise;
          strani.push(canvas.toDataURL('image/png'));
        }
        if (ziv) setPredStrani(strani);
      } catch { /* tiho — predogled ni kriticen */ } finally { if (ziv) setPredNal(false); }
    }, 700);
    return () => { ziv = false; window.clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [predogledMode, teloHtml, predType, scope, lastna, model, ure, paketMes, doba, urna, nar, pravice, stevilka, ponudnik, ddvZavezanec, ddvStopnja, dokBarva, dokFont]);

  /* ob spremembi vhodov ali tipa dokumenta osvezi telo urejevalnika — LE ce ni rocno urejeno */
  useEffect(() => {
    if (rocnoTelo) return;
    const html = trenutnoTelo();
    setTeloHtml(html);
    if (editorRef.current) editorRef.current.innerHTML = html;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [predType, scope, lastna, model, ure, paketMes, doba, urna, nar, pravice, stevilka, ponudnik, ddvZavezanec, ddvStopnja]);

  /* namig "oznaci besedilo" izgine sam */
  useEffect(() => {
    if (!oznaciNamig) return;
    const t = window.setTimeout(() => setOznaciNamig(false), 1500);
    return () => window.clearTimeout(t);
  }, [oznaciNamig]);

  /* ob menjavi pogleda (vprasanja -> ponudba -> zakljucek): urejevalnik nazaj na Uredi in skok na vrh —
     ENAKO kot kalkulator (predogledMode se resetira ob odhodu s koraka ponudbe, glej korak !== ponudbaStep). */
  const prviPogled = useRef(true);
  useEffect(() => {
    if (pogled !== 'ponudba') setPredogledMode(false);
    if (prviPogled.current) { prviPogled.current = false; return; }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lenis = (window as unknown as { __pinartLenis?: { scrollTo: (t: number, o?: { immediate?: boolean; force?: boolean }) => void; resize?: () => void } }).__pinartLenis;
    lenis?.resize?.();
    if (lenis && typeof lenis.scrollTo === 'function') lenis.scrollTo(0, { immediate: reduce, force: true });
    else window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  }, [pogled]);

  /* "Uredi od začetka" — nazaj na vprasanja, brez brisanja vnosov. */
  const urediOdZacetka = () => { setPogled('vprasanja'); setKorak(0); };
  /* "Nova ponudba" — pocisti vnose te ponudbe (obseg, narocnik, telo), profil ostane. */
  const novaPonudba = () => {
    setScope([]); setLastna([]); setScopeVnos(''); setDodajOdprt(false);
    setNar({ ime: '', email: '', oseba: '', naslov: '', davcna: '' }); setDodatniNar(false);
    setTeloHtml(''); setRocnoTelo(false); setPredType('pogodba'); setNapaka('');
    setKorak(0); setPogled('vprasanja');
  };

  const avatarIme = imeUporabnika.trim() || ponudnik.ime.trim();
  /* User (doprsje), NE PersonSimple — ta je enaka ikoni za dostopnost. */
  const avatarVsebina = avatarIme ? avatarIme.charAt(0).toUpperCase() : <User size={19} weight="regular" />;

  return (
    <div className="rw">
      {!vLupini && <header className="rw-glava">
        <span className="rw-glava-levo">
          {/* puscica PRED logotipom — enako kot na podstraneh nadzorne plosce */}
          <a className="rw-nazaj" href={`${base}/kalkulator/pregled`} aria-label="Nazaj na nadzorno ploščo" title="Nazaj na nadzorno ploščo">
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M12 4.5 6.5 10l5.5 5.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </a>
          <span className="rw-brand">
            <b className="rw-pinart">Pinart</b><span className="rw-glava-ime">Dolgoročno</span><span className="rw-beta">BETA</span>
          </span>
          {/* "zapri" odstranjen: retainer je vedno del admina, zato puscica nazaj zadostuje */}
        </span>
        <button type="button" className="rw-avatar" aria-label="Profil" title="Profil" onClick={() => setProfilOdprt(true)}>
          {avatarVsebina}
        </button>
      </header>}
      <div className="rw-ozadje" aria-hidden>
        <span className="rw-blob rw-blob-roza" />
        <span className="rw-blob rw-blob-modra" />
        <AmbientBubbles />
      </div>

      <div className="rw-vsebina">
        {pogled === 'vprasanja' && (<>
        <p className="rw-kicker">Dolgoročno sodelovanje</p>
        <h1 className="rw-h1">Mesečni retainer.</h1>
        <p className="rw-uvod">Za obseg mesečnega dela; naredi <b>ponudbo</b> in <b>pogodbo</b>. Podatki podjetja in urna postavka se berejo iz Moje podjetje.</p>

        <section className="rw-sek rw-vstop" id="rw-korak-0">
          <Vpr naslov="Kaj pokrivaš vsak mesec?" opis="Klikni področja, ki jih retainer vključuje." />
          <div className="rw-segpills rw-segpills-pogled" role="group" aria-label="Prikaz obsega" style={{ margin: '0 0 1rem' }}>
            <button type="button" className={!obsegTabela ? 'on' : ''} onClick={() => setObsegTabela(false)}>Mehurčki</button>
            <button type="button" className={obsegTabela ? 'on' : ''} onClick={() => setObsegTabela(true)}>Tabela</button>
          </div>
          {obsegTabela ? (
            <div className="rw-obseg-tabela">
              {SCOPE.map((s, i) => { const on = scope.includes(s.id); const barvi = ORB_BARVE[i % ORB_BARVE.length]; return (
                <button key={s.id} type="button" className={'rw-ov' + (on ? ' on' : '')} aria-pressed={on} onClick={() => toggle(s.id)}>
                  <span className="rw-ov-ikona" aria-hidden style={{ background: osvetli(barvi[0], 0.82), color: barvi[0] }}>{ikonaZa(s.ikon)}</span>
                  <span className="rw-ov-ime">{s.ime}</span>
                  <span className="rw-ov-chk" aria-hidden>{on ? '✓' : '+'}</span>
                </button>
              ); })}
            </div>
          ) : (
          <div className="rw-platno" style={{ minHeight: L.rows * L.rowH + 24 }}>
            {SCOPE.map((s, i) => {
              const p = L.poz(i);
              const on = scope.includes(s.id);
              const barvi = ORB_BARVE[i % ORB_BARVE.length];
              const d = Math.round(L.orbD * tezaOrb(s.teza));
              return (
                <button key={s.id} type="button" className={'orb0' + (on ? ' on' : '')} aria-pressed={on} onClick={() => toggle(s.id)}
                  style={{ left: `calc(${p.x}% - ${d / 2}px)`, top: p.row * L.rowH + 8 + (L.orbD - d) / 2, width: d, height: d, ...plavajVars(i) }}>
                  <OrbSfera id={s.id} o1={barvi[0]} />
                  <span className="orb0-ikona" aria-hidden>{ikonaZa(s.ikon)}</span>
                  <span className="orb0-ime">{s.kratko}</span>
                  {on && <span className="orb0-check" aria-hidden>✓</span>}
                </button>
              );
            })}
            {(() => {
              const p = L.poz(SCOPE.length);
              return (
                <button type="button" className="orb0 orb0-plus" onClick={() => setDodajOdprt(v => !v)}
                  style={{ left: `calc(${p.x}% - ${L.orbD / 2}px)`, top: p.row * L.rowH + 8, width: L.orbD, height: L.orbD, ...plavajVars(SCOPE.length) }}>
                  <span className="orb0-krog" aria-hidden />
                  <span className="orb0-ikona" aria-hidden style={{ fontSize: '1.5rem', lineHeight: 1 }}>+</span>
                  <span className="orb0-ime">dodaj</span>
                </button>
              );
            })()}
          </div>
          )}
          {lastna.length > 0 && <div className="rw-lastne">{lastna.map(l => <span key={l} className="rw-lastna">{l}<button type="button" onClick={() => setLastna(x => x.filter(y => y !== l))} aria-label={'Odstrani ' + l}>×</button></span>)}</div>}
          {dodajOdprt && (
            <div className="rw-dodaj">
              <input className="rw-vnos" autoFocus placeholder="dodaj svoje področje …" value={scopeVnos}
                onChange={e => setScopeVnos(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); dodajLastno(); } }} />
              <button type="button" className="rw-cip" onClick={dodajLastno}>+ dodaj</button>
            </div>
          )}
        </section>

        {korak >= 1 && (<section className="rw-sek rw-vstop" id="rw-korak-1">
          <Vpr naslov="Kako računaš mesečno?" opis="Model, ure in doba — spodaj se izriše mesečni znesek." />
          <div className="rw-kartica rw-kartica-model">
            <div className="rw-pills">
              {(['ure', 'paket', 'oboje'] as const).map(m => <button key={m} type="button" className={'rw-pill' + (model === m ? ' on' : '')} onClick={() => setModel(m)}>{m === 'ure' ? 'Po urah' : m === 'paket' ? 'Paket / mesec' : 'Oboje'}</button>)}
            </div>
            {model !== 'paket' && (
              <div className="rw-vrsta"><span className="rw-oznaka">Ure / mesec</span>
                <div className="rw-cipi">
                  {URE_MOZNOSTI.map(u => <button key={u} type="button" className={'rw-cip' + (ure === u ? ' on' : '')} onClick={() => setUre(u)}>{u} h</button>)}
                  <input className="rw-num" type="number" min={1} step={1} value={ure} onChange={e => setUre(Math.max(1, Math.round(Number(e.target.value) || 1)))} />
                  <span className="rw-mini">urna postavka {eur(urna)}</span>
                </div>
              </div>
            )}
            {model !== 'ure' && (
              <div className="rw-vrsta"><span className="rw-oznaka">Paket / mesec</span>
                <div className="rw-cipi"><input className="rw-num" style={{ width: '7rem' }} type="number" min={0} step={10} value={paketMes} onChange={e => setPaketMes(Math.max(0, Math.round(Number(e.target.value) || 0)))} /><span className="rw-mini">€ fiksno na mesec za obseg</span></div>
              </div>
            )}
            <div className="rw-vrsta"><span className="rw-oznaka">Doba</span>
              <div className="rw-cipi">{DOBE.map(m => <button key={m} type="button" className={'rw-cip' + (doba === m ? ' on' : '')} onClick={() => setDoba(m)}>{m} mes{POPUST[m] ? ` · −${Math.round(POPUST[m] * 100)} %` : ''}</button>)}</div>
            </div>
          </div>
          <div className="rw-povz">
            <div className="rw-glavna"><span>Mesečni znesek</span><b>{eur(ret.mesNeto)}{ddvZavezanec ? ` (z DDV ${eur(zDdv(ret.mesNeto))})` : ''} <em>/ mes</em></b></div>
            <ul className="rw-det">
              {ret.ureBaza > 0 && <li>{ure} ur/mesec po {eur(urna)}/uro</li>}
              {ret.paketBaza > 0 && <li>paket: {eur(ret.paketBaza)}/mesec</li>}
              {ret.popust > 0 && <li>zavezni popust ({doba} mes): −{Math.round(ret.popust * 100)} % (redno {eur(ret.mesBruto)}/mes)</li>}
              <li>dodatne ure nad blokom: {eur(ret.overage)}/uro · odpovedni rok: {ODPOVED_DNI} dni</li>
              <li>za dobo ({doba} mes): <b>{eur(ret.skupajDoba)}</b> · letno: <b>{eur(ret.letno)}</b></li>
            </ul>
          </div>
        </section>)}

        {korak >= 2 && (<section className="rw-sek rw-vstop" id="rw-korak-2">
          <Vpr naslov="Za koga pripravljaš?" opis="Ime zadošča; naslov in davčno dodaš za pogodbo." />
          <div className="rw-kartica">
            <div className="rw-knaslov">Naročnik <span className="rw-vec">za pogodbo in pošiljanje</span></div>
            <div className="rw-numgrid">
              <div className="rw-polje">
                <label htmlFor="rw-nar-ime">Ime podjetja</label>
                <input id="rw-nar-ime" type="text" placeholder="npr. Odvetniška družba Volk &amp; Babica" value={nar.ime} onChange={e => setNar({ ...nar, ime: e.target.value })} />
              </div>
              <div className="rw-polje">
                <label htmlFor="rw-nar-email">Email naročnika</label>
                <input id="rw-nar-email" type="email" placeholder="npr. pisarna@volk-babica.si" value={nar.email} onChange={e => setNar({ ...nar, email: e.target.value })} />
              </div>
            </div>
            {dodatniNar && (
              <>
                <div className="rw-numgrid">
                  <div className="rw-polje">
                    <label htmlFor="rw-nar-naslov">Naslov (ulica, kraj)</label>
                    <input id="rw-nar-naslov" type="text" placeholder="npr. Dunajska cesta 1, 1000 Ljubljana" value={nar.naslov} onChange={e => setNar({ ...nar, naslov: e.target.value })} />
                  </div>
                  <div className="rw-polje">
                    <label htmlFor="rw-nar-davcna">Davčna številka</label>
                    <input id="rw-nar-davcna" type="text" placeholder="npr. SI12345678" value={nar.davcna} onChange={e => setNar({ ...nar, davcna: e.target.value })} />
                  </div>
                </div>
                <div className="rw-numgrid">
                  <div className="rw-polje">
                    <label htmlFor="rw-nar-oseba">Kontaktna oseba</label>
                    <input id="rw-nar-oseba" type="text" placeholder="npr. Sivko Volk" value={nar.oseba} onChange={e => setNar({ ...nar, oseba: e.target.value })} />
                  </div>
                  <div className="rw-polje" aria-hidden />
                </div>
              </>
            )}
            {!dodatniNar
              ? <button type="button" className="rw-dodaj-gumb" style={{ marginTop: '1.1rem' }} onClick={() => setDodatniNar(true)}>+ Dodaj davčno št. in kontaktno osebo</button>
              : <button type="button" className="rw-povezava" style={{ marginTop: '1.1rem' }} onClick={() => { setDodatniNar(false); setNar({ ...nar, naslov: '', davcna: '', oseba: '' }); }}>Skrij (počisti naslov, davčno in kontaktno osebo)</button>}
            {nedavni.length > 0 && (
              <div className="rw-nar-nedavni">
                <span className="rw-vec">nedavni:</span>
                {nedavni.slice(0, 8).map(n => <button key={n.ime} type="button" className="rw-nar-chip" onClick={() => uporabiNar(n)}>{n.ime}</button>)}
              </div>
            )}
          </div>
        </section>)}

        {korak >= 3 && (<section className="rw-sek rw-vstop" id="rw-korak-3">
          <Vpr naslov="Še pravice — pa greva na dokumente." opis="Prenesi pogodbo (in po želji retainer ponudbo)." />
          <div className="rw-mreza rw-mreza-prav">
            <label>Avtorske pravice (za čas sodelovanja)<textarea className="rw-txt" value={pravice} onChange={e => setPravice(e.target.value)} /></label>
            <label>Številka<input className="rw-vnos" value={stevilka} onChange={e => setStevilka(e.target.value)} /></label>
          </div>
        </section>)}
        </>)}

        {/* ── POGLED: PONUDBA (locena stran — vprasanja skrita, samo dokument) — ENAKO kot kalkulatorjev ponudbaStep ── */}
        {pogled === 'ponudba' && (<section className="rw-sek rw-vstop rw-stran" id="rw-dokument">
          <Vpr naslov="Dokument je pripravljen." opis="Uredi besedilo, preklapljaj med Pogodbo in Ponudbo, nato prenesi." />
          <div className="rw-pon-vrh" style={{ marginTop: '1.2rem' }}>
            <div className="rw-segpills rw-segpills-pogled" role="group" aria-label="Pogled">
              <button type="button" className={!predogledMode ? 'on' : ''} onClick={() => setPredogledMode(false)}><PencilSimple size={15} weight="bold" /> Uredi</button>
              <button type="button" className={predogledMode ? 'on' : ''} onClick={() => setPredogledMode(true)}><Eye size={16} /> Predogled</button>
            </div>
            {/* samo ikona, da gre vse v eno vrstico (enako kot kalkulator) */}
            {jeMobilni && !predogledMode && (
              <button type="button" className="rw-sheet-trig" onClick={() => setPonSheet(v => (v ? null : 'oblika'))} aria-label="Oblikovanje" title="Oblikovanje">
                <TextAa size={18} weight="bold" />
              </button>
            )}
            <div className="rw-segpills rw-segpills-sek" role="group" aria-label="Dokument">
              <button type="button" className={predType === 'pogodba' ? 'on' : ''} onClick={() => { setPredType('pogodba'); setRocnoTelo(false); }}>Pogodba</button>
              <button type="button" className={predType === 'ponudba' ? 'on' : ''} onClick={() => { setPredType('ponudba'); setRocnoTelo(false); }}>Retainer ponudba</button>
            </div>
          </div>

          {predogledMode ? (
            <div className="rw-predogled">
              {predStrani.length
                ? predStrani.map((u, i) => (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img key={i} className="rw-pred-stran" src={u} alt={`Stran ${i + 1}`} />
                ))
                : <div className="rw-pred-prazno">{predNal ? 'Pripravljam predogled …' : 'Predogled ni na voljo'}</div>}
              {predNal && predStrani.length > 0 && <div className="rw-pred-osvezi" role="status">Osvežujem …</div>}
            </div>
          ) : (
            <>
              {/* Na mobilu ista orodjarna postane slide-up predal (razred "odprt"), da ne
                  zaseda stirih vrstic nad dokumentom. Vsebina ostane ena sama -> refi se ne podvojijo. */}
              {jeMobilni && ponSheet && <div className="rw-sheet-back" onClick={() => setPonSheet(null)} aria-hidden />}
              <div className={'rw-orodjarna' + (jeMobilni ? ' rw-orodjarna-sheet' : '') + (ponSheet ? ' odprt' : '')} aria-label="Oblikovanje besedila" aria-hidden={jeMobilni && !ponSheet}>
                {jeMobilni && <div className="rw-sheet-glava"><b>Oblikovanje</b><button type="button" className="rw-sheet-x" onClick={() => setPonSheet(null)} aria-label="Zapri">✕</button></div>}
                {oznaciNamig && <div className="rw-oznaci-namig" role="status">Najprej označi besedilo</div>}
                <div className="rw-tool-vel2" role="group" aria-label="Velikost besedila">
                  <button type="button" className="rw-tool-krog" onMouseDown={e => { e.preventDefault(); velikost(-1); }} title="Manjše" aria-label="Pomanjšaj"><CaretDown size={14} weight="bold" /></button>
                  <span className="rw-tv-aa" aria-hidden>Aa</span>
                  <button type="button" className="rw-tool-krog" onMouseDown={e => { e.preventDefault(); velikost(1); }} title="Večje" aria-label="Povečaj"><CaretUp size={14} weight="bold" /></button>
                </div>
                <button type="button" className="rw-tool-krog" onMouseDown={e => { e.preventDefault(); oblikuj('bold'); }} title="Krepko" aria-label="Krepko"><TextB size={17} weight="bold" /></button>
                <button type="button" className="rw-tool-krog" onMouseDown={e => { e.preventDefault(); oblikuj('italic'); }} title="Ležeče" aria-label="Ležeče"><TextItalic size={17} /></button>
                <select className="rw-pisava-select" aria-label="Pisava besedila" defaultValue="" onMouseDown={() => editorRef.current?.focus()} onChange={e => { const v = e.target.value; if (v) uporabiPisavo(v); e.currentTarget.value = ''; }}>
                  <option value="" disabled>Pisava</option>
                  <option value="Bodoni Moda">Elegantna</option>
                  <option value="Montserrat">Montserrat</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Arial">Arial</option>
                </select>
                <button type="button" className="rw-tool-krog" onMouseDown={e => { e.preventDefault(); oblikuj('formatBlock', 'h1'); }} title="Naslov" aria-label="Naslov H1">H1</button>
                <button type="button" className="rw-tool-krog" onMouseDown={e => { e.preventDefault(); oblikuj('formatBlock', 'h2'); }} title="Podnaslov" aria-label="Podnaslov H2">H2</button>
                <button type="button" className="rw-tool-krog" onMouseDown={e => { e.preventDefault(); oblikuj('formatBlock', 'p'); }} title="Navadno besedilo" aria-label="Navadno besedilo P">P</button>
                <span className="rw-tool-locnica" aria-hidden />
                <button type="button" className="rw-barvica rw-barvica-mavrica" aria-label="Barva besedila (poljubna)" title="Barva besedila — poljubna" onMouseDown={e => { e.preventDefault(); barvaRef.current?.click(); }} />
                <input ref={barvaRef} type="color" hidden onChange={e => oblikuj('foreColor', e.target.value)} />
                <button type="button" className="rw-tool-krog" onMouseDown={e => { e.preventDefault(); oblikuj('hiliteColor', '#FCE38A'); }} onDoubleClick={e => { e.preventDefault(); oblikuj('hiliteColor', 'transparent'); }} title="Označi besedilo — dvojni klik odstrani" aria-label="Označi besedilo"><span className="rw-hl">T</span></button>
              </div>
              <div ref={napolniEditor} className="rw-editor" contentEditable suppressContentEditableWarning onInput={() => setRocnoTelo(true)} onBlur={sinhronizirajEditor} />
              {rocnoTelo && (
                <p className="rw-mini" style={{ marginTop: '.5rem' }}>Besedilo je ročno urejeno in se ob spremembi vhodov ne posodablja več samodejno. <button type="button" className="rw-povezava" onClick={ponastaviTelo}>Povrni samodejno besedilo</button></p>
              )}
            </>
          )}

          <div className="rw-gumbi">
            <button type="button" className="rw-gumb" disabled={pdfNalaganje} onClick={() => prenesi(predType)}>{pdfNalaganje ? 'Pripravljam …' : `Prenesi ${predType === 'pogodba' ? 'pogodbo' : 'ponudbo'} (PDF)`}</button>
            <button type="button" className="rw-gumb sek" disabled={pdfNalaganje} onClick={() => prenesi(predType === 'pogodba' ? 'ponudba' : 'pogodba')}>{predType === 'pogodba' ? 'Retainer ponudba (PDF)' : 'Pogodba (PDF)'}</button>
          </div>
          {napaka && <p className="rw-napaka">{napaka}</p>}
          <p className="rw-mini" style={{ marginTop: '.7rem' }}>Ponudbe ni nujno poslati — pogodbo lahko narediš direkt.</p>
        </section>)}

        {/* ── POGLED: ZAKLJUCEK (locena stran) — ENAKO kot kalkulatorjev zakljucekStep ── */}
        {pogled === 'zakljucek' && (<section className="rw-sek rw-vstop rw-stran rw-zakljucek">
          <p className="rw-kicker">Dolgoročno sodelovanje{stevilka ? ' · št. ' + stevilka : ''}</p>
          <h1 className="rw-h1">Zaključek.</h1>
          <p className="rw-uvod">Prenesi pogodbo{nar.ime.trim() ? ' za ' + nar.ime.trim() : ''} in po želji še retainer ponudbo.</p>
          <div className="rw-gumbi">
            <button type="button" className="rw-gumb" disabled={pdfNalaganje} onClick={() => prenesi('pogodba')}>{pdfNalaganje ? 'Pripravljam …' : 'Prenesi pogodbo (PDF)'}</button>
            <button type="button" className="rw-gumb sek" disabled={pdfNalaganje} onClick={() => prenesi('ponudba')}>Retainer ponudba (PDF)</button>
          </div>
          {napaka && <p className="rw-napaka">{napaka}</p>}
          <div className="rw-koncna-nav">
            <button type="button" className="rw-povezava" onClick={urediOdZacetka}>← Uredi od začetka</button>
            <button type="button" className="rw-povezava" onClick={novaPonudba}>↺ Nova ponudba</button>
          </div>
        </section>)}

      </div>

      <div className="rw-noga">
        <div className="rw-noga-gumbi">
          {/* NAZAJ — okrogel gumb; navigira nazaj skozi poglede/korake (kot kalkulator) */}
          {(pogled !== 'vprasanja' || korak > 0) && (
            <button type="button" className={'rw-gumb-nazaj' + (pogled === 'vprasanja' ? ' rw-gumb-nazaj-abs' : '')} aria-label="Nazaj"
              onClick={() => {
                if (pogled === 'zakljucek') setPogled('ponudba');
                else if (pogled === 'ponudba') setPogled('vprasanja');
                else setKorak(k => Math.max(0, k - 1));
              }}>
              <ArrowUp size={17} weight="bold" aria-hidden />
            </button>
          )}
          {/* NAPREJ — ena pilula, ki spreminja napis + dejanje glede na pogled/korak (kot kalkulatorjev en gumb) */}
          {pogled !== 'zakljucek' && (
            <button type="button" className="rw-noga-naprej"
              onClick={() => {
                if (pogled === 'ponudba') setPogled('zakljucek');
                else if (korak < 3) setKorak(k => k + 1);
                else setPogled('ponudba');
              }}>
              {pogled === 'ponudba' ? 'Zaključi' : korak === 3 ? 'Pripravi ponudbo' : 'Naprej'} <ArrowDown size={16} weight="bold" aria-hidden />
            </button>
          )}
        </div>
      </div>

      {profilOdprt && (
        <div className="rw-profil-zastor" onClick={() => setProfilOdprt(false)}>
          <div className="rw-profil-panel" role="dialog" aria-label="Profil" onClick={e => e.stopPropagation()}>
            <div className="rw-profil-glava">
              <h2>Profil</h2>
              <button type="button" className="rw-profil-x" onClick={() => setProfilOdprt(false)}>✕ Zapri</button>
            </div>

            <section className="rw-profil-sek">
              <span className="rw-profil-oznaka">Tvoji podatki</span>
              <p className="rw-profil-opis">Isti podatki kot v kalkulatorju — shranijo se samodejno in se izpišejo v glavi dokumentov.</p>
              <div className="rw-profil-polja">
                <label className="rw-pp"><span>Ime / podjetje</span><input type="text" value={ponudnik.ime} onChange={e => setPonudnik({ ...ponudnik, ime: e.target.value })} placeholder="npr. Pinart, Tina Novak s.p." /></label>
                <label className="rw-pp"><span>Naslov</span><input type="text" value={ponudnik.naslov} onChange={e => setPonudnik({ ...ponudnik, naslov: e.target.value })} placeholder="Ulica 1, 1000 Ljubljana" /></label>
                <label className="rw-pp"><span>Davčna št.</span><input type="text" value={ponudnik.davcna} onChange={e => setPonudnik({ ...ponudnik, davcna: e.target.value })} placeholder="SI12345678" /></label>
                <label className="rw-pp"><span>TRR</span><input type="text" value={ponudnik.trr} onChange={e => setPonudnik({ ...ponudnik, trr: e.target.value })} placeholder="SI56 0000 0000 0000 000" /></label>
                <label className="rw-pp rw-pp-tel"><span>Telefon</span><span className="rw-pp-tel-vrsta"><input type="text" className="rw-pp-predklic" value={predklic} onChange={e => setPredklic(e.target.value)} /><input type="tel" value={ponudnik.telefon} onChange={e => setPonudnik({ ...ponudnik, telefon: e.target.value })} placeholder="40 123 456" /></span></label>
                <label className="rw-pp"><span>E-pošta</span><input type="email" value={ponudnik.email} onChange={e => setPonudnik({ ...ponudnik, email: e.target.value })} placeholder="tina@pinart.si" /></label>
              </div>
            </section>

            <section className="rw-profil-sek">
              <span className="rw-profil-oznaka">Videz dokumentov</span>
              <VidezDokumentov barva={dokBarva} font={dokFont} onBarva={setDokBarva} onFont={setDokFont} />
            </section>

            <a className="rw-profil-admin" href={`${base}/kalkulator/admin`}>Pregled poslovanja (admin) ↗</a>
          </div>
        </div>
      )}

      <style>{`
        .rw{position:relative;min-height:100dvh;color:var(--ink);font-weight:400;overflow-x:clip}
        /* header (kot kalkulator: Pinart | Dolgorocno | BETA  ...  x zapri) */
        .rw-glava{position:fixed;top:0;left:0;right:0;z-index:30;display:flex;align-items:center;justify-content:space-between;padding:.85rem clamp(1.2rem,4vw,3rem);background:var(--paper);border-bottom:1px solid rgba(17,17,17,.08)}
        /* min-width:0 + shrink: brez tega leva skupina (z novo puscico) preraste prostor in
           pri space-between stisne avatar ob rob; "zapri" se je lomil v dve vrstici. */
        .rw-glava-levo{display:inline-flex;align-items:center;gap:1rem;min-width:0;flex:1 1 auto;overflow:hidden}
        .rw-glava > .rw-avatar{flex:0 0 auto}
        .rw-brand{display:inline-flex;align-items:center;gap:.5rem}
        .rw-pinart{font-weight:800;font-size:1rem;letter-spacing:-.01em;color:var(--ink);line-height:1}
        /* "DOLGOROCNO" je dolga beseda — tesnejsi razmik crk in malenkost manjsa, da glava diha */
        .rw-glava-ime{font-size:.72rem;font-weight:700;letter-spacing:.03em;text-transform:uppercase;color:var(--ink);line-height:1;white-space:nowrap}
        .rw-beta{font-size:.56rem;font-weight:700;letter-spacing:.1em;color:var(--accent);border:1px solid var(--accent);border-radius:4px;padding:.1rem .3rem;line-height:1;text-transform:uppercase}
        .rw-nazaj{display:inline-flex;align-items:center;justify-content:center;width:2rem;height:2rem;margin-right:.2rem;border:1px solid rgba(17,17,17,.2);border-radius:50%;background:var(--paper);color:var(--ink);text-decoration:none;flex:none}
        .rw-nazaj svg{width:1.05rem;height:1.05rem}
        .rw-avatar{width:2rem;height:2rem;border-radius:50%;border:1px solid rgba(17,17,17,.2);background:var(--paper);display:inline-flex;align-items:center;justify-content:center;cursor:pointer;font-family:inherit;font-weight:700;font-size:.8rem;color:var(--ink);transition:color .18s,border-color .18s}
        .rw-avatar:hover{border-color:rgba(17,17,17,.5)}
        .rw-profil-zastor{position:fixed;inset:0;z-index:60;background:rgba(20,16,26,.34);backdrop-filter:blur(3px);display:flex;justify-content:flex-end}
        .rw-profil-panel{width:min(560px,100vw);height:100%;overflow-y:auto;background:var(--paper);box-shadow:-12px 0 40px rgba(20,16,26,.18);padding:1.6rem clamp(1.3rem,3vw,2.2rem) 3rem;animation:rwPanel .34s cubic-bezier(.16,1,.3,1) both}
        @keyframes rwPanel{from{transform:translateX(30px);opacity:0}to{transform:translateX(0);opacity:1}}
        @media (prefers-reduced-motion:reduce){.rw-profil-panel{animation:none}}
        .rw-profil-glava{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.6rem}
        .rw-profil-glava h2{margin:0;font-family:var(--font-serif),Didot,serif;font-size:1.9rem;font-weight:600;color:var(--ink)}
        .rw-profil-x{font:inherit;font-size:.74rem;font-weight:600;color:rgba(17,17,17,.6);background:none;border:none;cursor:pointer;padding:.4rem}
        .rw-profil-x:hover{color:var(--ink)}
        .rw-profil-sek{margin-bottom:2.2rem}
        .rw-profil-oznaka{display:block;font-size:.72rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--accent);margin-bottom:.5rem}
        .rw-profil-opis{margin:0 0 1rem;font-size:.86rem;line-height:1.5;color:#4a4550}
        .rw-profil-polja{display:grid;grid-template-columns:1fr 1fr;gap:.9rem 1rem}
        .rw-pp{display:flex;flex-direction:column;gap:.35rem}
        .rw-pp>span{font-size:.68rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#8a8177}
        .rw-pp input{font:inherit;font-size:.98rem;font-weight:600;color:var(--ink);background:#FCFBF7;border:1px solid rgba(17,17,17,.14);border-radius:9px;padding:.6rem .7rem;width:100%}
        .rw-pp input:focus{outline:none;border-color:var(--ink)}
        .rw-pp-tel{grid-column:1 / -1}
        .rw-pp-tel-vrsta{display:flex;gap:.5rem}
        .rw-pp-predklic{max-width:5rem;text-align:center}
        @media (max-width:520px){.rw-profil-polja{grid-template-columns:1fr}}
        .rw-profil-admin{display:inline-block;margin-top:.4rem;font-size:.82rem;font-weight:600;color:rgba(17,17,17,.6);text-decoration:none;border:1px solid rgba(17,17,17,.15);border-radius:999px;padding:.5rem 1rem;transition:border-color .15s,color .15s}
        .rw-profil-admin:hover{border-color:var(--ink);color:var(--ink)}
        /* POSKUS: mrežno ozadje (kot naslovnica/FLOW), mehurčki ostanejo */
        .rw-ozadje{position:fixed;inset:0;z-index:0;overflow:hidden;pointer-events:none;background-color:oklch(97% 0.012 87);background-image:linear-gradient(color-mix(in oklch, oklch(19% 0.014 55) 7%, transparent) 1px,transparent 1px),linear-gradient(90deg,color-mix(in oklch, oklch(19% 0.014 55) 7%, transparent) 1px,transparent 1px);background-size:4.5rem 4.5rem}
        /* nežna bloba (vijola + zelena) v ozadju, nad mrežo, komaj opazna */
        .rw-ozadje .rw-blob{position:absolute;width:min(60vw,760px);aspect-ratio:1;border-radius:50%;filter:blur(70px)}
        .rw-blob-roza{top:-16vh;left:-12vw;background:radial-gradient(circle, oklch(74% .18 300 / .55), transparent 68%);opacity:.5;animation:rwRoza 22s ease-in-out infinite}
        .rw-blob-modra{bottom:-22vh;right:-14vw;background:radial-gradient(circle, oklch(82% .15 162 / .55), transparent 68%);opacity:.45;animation:rwModra 25s ease-in-out infinite}
        @keyframes rwRoza{0%,100%{transform:translate(0,0) scale(1)}25%{transform:translate(32vw,24vh) scale(1.15)}50%{transform:translate(16vw,46vh) scale(.92)}75%{transform:translate(38vw,12vh) scale(1.08)}}
        @keyframes rwModra{0%,100%{transform:translate(0,0) scale(1)}25%{transform:translate(-28vw,-22vh) scale(1.12)}50%{transform:translate(-44vw,-10vh) scale(.9)}75%{transform:translate(-16vw,-32vh) scale(1.06)}}
        @media (prefers-reduced-motion:reduce){.rw-blob{animation:none}}

        .rw-vsebina{position:relative;z-index:1;width:min(700px,92vw);margin:0 auto;padding:calc(clamp(1.6rem,4vw,2.6rem) + 3.4rem) 0 7.5rem}
        .rw-kicker{font-size:.78rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--accent);margin:0 0 .3rem}
        .rw-h1{font-family:var(--font-serif),Didot,serif;font-weight:500;font-size:clamp(2.4rem,6vw,4rem);line-height:1;letter-spacing:-.012em;margin:0 0 .6rem;color:var(--ink)}
        .rw-uvod{font-size:1rem;line-height:1.55;color:rgba(17,17,17,.72);margin:0 0 2.4rem;max-width:34rem}
        .rw-sek{margin:0 0 2.6rem;scroll-margin-top:5.5rem}
        .rw-sek.rw-vstop{animation:rwSek .5s cubic-bezier(.16,1,.3,1) both}
        @keyframes rwSek{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @media (prefers-reduced-motion:reduce){.rw-sek.rw-vstop{animation:none}}
        /* izrazit slide-up (nova stran) za pogled 'ponudba'/'zakljucek' — visja specificnost (.rw-sek.rw-stran), da povozi rwSek */
        .rw-sek.rw-stran{animation:rwStran .5s cubic-bezier(.16,1,.3,1) both}
        @keyframes rwStran{from{opacity:0;transform:translateY(60px)}to{opacity:1;transform:translateY(0)}}
        @media (prefers-reduced-motion:reduce){.rw-sek.rw-stran{animation:none}}
        /* fiksna noga z gumbi — ENAKO kot kalkulator (okrogel Nazaj s puscico + Naprej pilula) */
        .rw-noga{position:fixed;bottom:0;left:17.5rem;right:0;display:flex;justify-content:center;padding:1rem clamp(1.2rem,4vw,3rem) 1.1rem;background:linear-gradient(to top,var(--paper) 70%,transparent);z-index:40}
        :global(body[data-meni='zaprt']) .rw-noga{left:4.4rem}
        @media (max-width:980px){.rw-noga{left:0}}
        .rw-noga-gumbi{display:flex;align-items:center;justify-content:center;gap:.8rem;position:relative}
        .rw-gumb-nazaj{width:3.1rem;height:3.1rem;border-radius:999px;border:1px solid var(--ink);background:transparent;color:var(--ink);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;flex:none;transition:background .18s ease,color .18s ease,transform .2s ease}
        .rw-gumb-nazaj:hover{background:var(--ink);color:var(--paper);transform:scale(1.08)}
        .rw-gumb-nazaj:active{transform:scale(.95)}
        .rw-gumb-nazaj-abs{position:absolute;right:calc(100% + .8rem);top:50%;margin-top:-1.55rem}
        .rw-noga-naprej{position:relative;overflow:hidden;font-family:inherit;font-size:.82rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;cursor:pointer;border-radius:999px;padding:.95rem 2.2rem;border:1px solid var(--ink);background:var(--ink);color:var(--paper);display:inline-flex;align-items:center;justify-content:center;gap:.45rem;transition:transform .2s ease,box-shadow .2s ease}
        .rw-noga-naprej:hover{transform:scale(1.06);box-shadow:0 8px 22px rgba(35,18,45,.18)}
        /* lesk (odsev, ki potuje cez gumb na hover) */
        .rw-noga-naprej::after,.rw-gumb::after{content:'';position:absolute;top:0;left:-160%;width:90%;height:100%;background:linear-gradient(120deg,transparent 0%,rgba(255,255,255,.95) 50%,transparent 100%);transform:skewX(-18deg);transition:left .6s cubic-bezier(.19,1,.22,1);pointer-events:none}
        .rw-noga-naprej:hover::after,.rw-gumb:hover::after{left:170%}
        .rw-noga-naprej:active{transform:scale(.97)}
        .rw-h2{font-size:.76rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--accent);margin:0 0 1rem}

        /* avatar klepet (prenesen iz kalkulatorja) */
        .rw-chat{display:flex;align-items:flex-start;gap:.55rem;max-width:90%;margin:0 0 1.2rem}
        .rw-obraz{display:none}
        .rw-mehur{position:relative;background:#F7F2FF;border:1px solid rgba(185,160,230,.2);border-radius:18px;border-bottom-left-radius:5px;padding:.85rem 1.25rem .85rem 2.75rem;box-shadow:0 2px 10px rgba(40,25,40,.05)}
        .rw-mehur::before{content:"";position:absolute;left:.9rem;top:.95rem;width:1.3rem;height:1.3rem;border-radius:50%;background:radial-gradient(58% 48% at 30% 24%,rgba(255,255,255,.92),rgba(255,255,255,0) 62%),conic-gradient(from 210deg,#7C3AED,#EC4899,#F59E0B,#38BDF8,#7C3AED);box-shadow:0 2px 6px rgba(124,58,237,.28)}
        .rw-mehur b{display:block;color:var(--ink);font-weight:600;font-size:1.02rem;-webkit-text-stroke:0}
        .rw-mehur small{display:block;margin-top:.1rem;color:rgba(17,17,17,.64);font-size:.82rem}

        /* razmetani (satasti) mehurcki — orb0 videz je skopiran iz kalkulatorja (Orb0.tsx) */
        /* mehurcki "gledajo cez" — polje je sirse od chata (kot pri kalkulatorju) */
        .rw-platno{position:relative;width:min(960px,96vw);left:50%;transform:translateX(-50%);margin-top:.2rem}
        .rw-obseg-tabela{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:.6rem;margin:0 0 .4rem}
        .rw-ov{display:flex;align-items:center;gap:.75rem;padding:.6rem .85rem;border-radius:12px;border:1px solid rgba(17,17,17,.12);background:#FCFBF7;font:inherit;font-size:.92rem;font-weight:600;color:var(--ink);cursor:pointer;text-align:left;transition:border-color .16s,background .16s,transform .16s}
        .rw-ov:hover{border-color:rgba(17,17,17,.28);transform:translateY(-1px)}
        .rw-ov.on{border-color:#7C3AED;background:rgba(124,58,237,.07)}
        .rw-ov-ikona{display:grid;place-items:center;width:2.2rem;height:2.2rem;border-radius:50%;flex:none}
        .rw-ov-ikona svg{width:1.2rem;height:1.2rem}
        .rw-ov-ime{flex:1;min-width:0}
        .rw-ov-chk{display:inline-flex;align-items:center;justify-content:center;width:1.5rem;height:1.5rem;border-radius:50%;flex:none;font-size:.85rem;font-weight:700;background:rgba(17,17,17,.06);color:rgba(17,17,17,.5)}
        .rw-ov.on .rw-ov-chk{background:#7C3AED;color:#fff}
        ${ORB0_CSS}
        .rw-lastne{display:flex;flex-wrap:wrap;gap:.4rem;margin-top:1rem}
        .rw-lastna{display:inline-flex;align-items:center;gap:.35rem;background:rgba(178,84,118,.1);border:1px solid rgba(178,84,118,.3);border-radius:999px;padding:.3rem .5rem .3rem .8rem;font-size:.85rem}
        .rw-lastna button{border:none;background:none;cursor:pointer;font-size:1rem;line-height:1;color:var(--accent)}
        .rw-dodaj{display:flex;gap:.6rem;align-items:center;margin-top:1rem}

        .rw-pills{display:flex;flex-wrap:wrap;gap:.6rem;margin-bottom:.9rem}
        .rw-pill{padding:.7rem 1.3rem;border:1px solid rgba(17,17,17,.22);border-radius:999px;background:rgba(255,255,255,.5);cursor:pointer;font:inherit;font-size:.95rem;color:var(--ink);transition:border-color .15s,background .15s,color .15s}
        .rw-pill:hover{border-color:var(--ink)}
        .rw-pill.on{border-color:var(--accent);background:var(--accent);color:#fff;font-weight:600}
        .rw-vrsta{display:flex;align-items:baseline;flex-wrap:wrap;gap:.5rem .9rem;margin:.7rem 0}
        .rw-oznaka{font-size:.82rem;font-weight:700;color:rgba(17,17,17,.5);min-width:6rem}
        .rw-cipi{display:flex;flex-wrap:wrap;gap:.4rem;align-items:center}
        .rw-cip{padding:.42rem .8rem;border:1px solid rgba(17,17,17,.2);border-radius:999px;background:rgba(255,255,255,.5);cursor:pointer;font:inherit;font-size:.86rem;color:var(--ink);transition:border-color .15s,background .15s,color .15s}
        .rw-cip:hover{border-color:var(--ink)}
        .rw-cip.on{border-color:var(--accent);background:var(--accent);color:#fff;font-weight:600}
        .rw-num{width:4.6rem;border:none;border-bottom:1px solid rgba(17,17,17,.3);background:transparent;padding:.35rem .3rem;font:inherit;font-size:.92rem;font-weight:600;text-align:right;color:var(--ink)}
        .rw-num:focus{outline:none;border-bottom-color:var(--ink)}
        .rw-mini{font-size:.8rem;color:rgba(17,17,17,.5)}

        .rw-povz{margin-top:1.2rem;padding:1.7rem 1.6rem 1.8rem;border-radius:20px;background:#FCFBF7;border:1px solid rgba(17,17,17,.08);box-shadow:0 4px 18px rgba(17,17,17,.04)}
        .rw-glavna{display:flex;align-items:baseline;justify-content:space-between;gap:1rem;padding-bottom:.85rem;border-bottom:1px solid rgba(17,17,17,.1)}
        .rw-glavna span{font-size:.7rem;font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:rgba(17,17,17,.55)}
        .rw-glavna b{font-family:var(--font-serif),Didot,serif;font-weight:700;font-size:clamp(2rem,4.5vw,2.6rem);letter-spacing:-.01em;color:var(--ink);-webkit-text-stroke:.4px currentColor}
        .rw-glavna em{font-family:inherit;font-style:normal;font-size:.9rem;font-weight:400;color:rgba(17,17,17,.5);-webkit-text-stroke:0}
        .rw-det{list-style:none;margin:.8rem 0 0;padding:0;display:flex;flex-direction:column;gap:.32rem;font-size:.87rem;color:rgba(17,17,17,.72)}
        .rw-det li::before{content:"· ";color:var(--accent);font-weight:700}
        .rw-det b{color:var(--ink)}

        .rw-mreza{display:grid;grid-template-columns:1fr 1fr;gap:1.3rem 1.5rem;background:#FCFBF7;border:1px solid rgba(17,17,17,.08);border-radius:16px;padding:1.5rem 1.6rem;box-shadow:0 4px 18px rgba(17,17,17,.04)}
        .rw-mreza3{grid-template-columns:1fr 1fr 1fr}
        .rw-mreza-prav{grid-template-columns:1fr 9rem;align-items:start}
        .rw label{display:flex;flex-direction:column;gap:.35rem;font-size:.72rem;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:rgba(17,17,17,.6)}
        .rw label .rw-mini{letter-spacing:0;text-transform:none;font-weight:400}
        .rw-vnos{border:none;border-bottom:1px solid rgba(17,17,17,.4);background:transparent;padding:.35rem 0 .5rem;font-family:var(--font-sans),system-ui,sans-serif;font-weight:600;font-size:1.05rem;color:var(--ink);width:100%;border-radius:0}
        .rw-vnos:focus{outline:none;border-bottom:2px solid var(--ink);margin-bottom:-1px}
        .rw-vnos::placeholder{color:rgba(17,17,17,.42);font-weight:400;font-size:.98rem}
        .rw-txt{border:1px solid rgba(17,17,17,.2);border-radius:12px;padding:.7rem .8rem;font:inherit;font-size:.9rem;line-height:1.5;color:var(--ink);resize:vertical;min-height:8.5rem!important;field-sizing:content;background:rgba(255,255,255,.5);overflow:auto}
        .rw-txt:focus{outline:none;border-color:var(--ink)}
        .rw-nedavni{display:flex;flex-wrap:wrap;gap:.4rem;align-items:center;margin-top:.9rem}
        .rw-nedavni button{border:1px dashed rgba(17,17,17,.3);background:transparent;border-radius:999px;padding:.35rem .7rem;font:inherit;font-size:.82rem;cursor:pointer;color:var(--ink)}
        .rw-nedavni button:hover{border-color:var(--accent);color:var(--accent)}

        /* kartica + polja ENAKO kot pri kalkulatorju (Naročnik) */
        .rw-kartica{background:#FCFBF7;border:1px solid rgba(17,17,17,.06);border-radius:20px;padding:1.6rem 1.7rem 1.7rem;box-shadow:0 4px 18px rgba(17,17,17,.04);max-width:760px}
        .rw-kartica>.rw-knaslov{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:.3rem 1rem;margin:0 0 1.1rem;font-weight:600;font-size:1.12rem;color:var(--ink)}
        .rw-knaslov .rw-vec{font-size:.82rem;font-weight:500;color:rgba(17,17,17,.55);text-transform:none;letter-spacing:0}
        .rw-numgrid{display:grid;grid-template-columns:1fr 1fr;gap:2rem;max-width:none}
        .rw-numgrid+.rw-numgrid{margin-top:1.1rem}
        .rw-polje{display:flex;flex-direction:column}
        .rw-polje label{display:flex;justify-content:space-between;align-items:baseline;gap:.5rem;font-size:.72rem;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:rgba(17,17,17,.7);margin-bottom:.3rem}
        .rw-polje label .rw-vec{font-size:.68rem;font-weight:500;letter-spacing:0;text-transform:none;color:rgba(17,17,17,.5)}
        .rw-polje input{width:100%;border:none;border-bottom:1px solid rgba(17,17,17,.45);background:transparent;font-family:var(--font-sans),system-ui,sans-serif;font-weight:600;font-size:1.1rem;padding:.35rem 0 .5rem;color:var(--ink);border-radius:0}
        .rw-polje input:focus{outline:none;border-bottom:2px solid var(--ink);margin-bottom:-1px}
        .rw-polje input::placeholder{color:rgba(17,17,17,.42);font-weight:400;font-size:1rem}
        .rw-dodaj-gumb{display:inline-flex;align-items:center;gap:.4rem;font-family:inherit;font-size:.9rem;font-weight:600;color:var(--ink);background:transparent;border:1px dashed rgba(17,17,17,.35);border-radius:999px;padding:.55rem 1.1rem;cursor:pointer;transition:border-color .18s ease,background .18s ease}
        .rw-dodaj-gumb:hover{border-color:var(--ink);background:rgba(17,17,17,.03)}
        .rw-povezava{font-family:inherit;font-size:.88rem;font-weight:500;cursor:pointer;border:none;background:none;color:var(--ink);text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:.28em;padding:0;display:inline-flex;align-items:center;gap:.38rem}
        .rw-povezava:hover{opacity:.6}
        .rw-nar-nedavni{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem;margin-top:1.1rem}
        .rw-nar-nedavni .rw-vec{font-size:.78rem;font-weight:500;color:rgba(17,17,17,.55);margin-right:.1rem}
        .rw-nar-chip{font-family:inherit;font-size:.78rem;font-weight:500;padding:.4rem .85rem;border-radius:999px;border:1px dashed rgba(17,17,17,.3);background:transparent;color:rgba(17,17,17,.72);cursor:pointer;transition:border-color .15s ease,color .15s ease}
        .rw-nar-chip:hover{border-color:var(--ink);color:var(--ink)}
        .rw-kartica-model>*{margin:0}
        .rw-kartica-model>*+*{margin-top:1.15rem}
        @media (max-width:560px){.rw-numgrid{grid-template-columns:1fr;gap:1.4rem}}

        .rw-gumbi{display:flex;flex-wrap:wrap;gap:.8rem;margin-top:1.5rem}
        .rw-gumb{position:relative;overflow:hidden;display:inline-flex;align-items:center;gap:.5rem;border:none;border-radius:999px;padding:.85rem 1.6rem;font:inherit;font-weight:600;font-size:.98rem;cursor:pointer;background:var(--ink);color:var(--paper);transition:transform .2s,opacity .2s}
        .rw-gumb:hover{transform:translateY(-2px)}
        .rw-gumb.sek{background:transparent;color:var(--ink);border:1px solid rgba(17,17,17,.28)}
        .rw-gumb:disabled{opacity:.5;cursor:default;transform:none}
        .rw-koncna-nav{display:flex;flex-wrap:wrap;gap:1.4rem;margin-top:2rem;padding-top:1.4rem;border-top:1px solid rgba(17,17,17,.1)}
        .rw-napaka{color:#b23434;font-size:.86rem;margin:.6rem 0 0}
        /* predogled sirsi od chata (kot mehurcki) — vecje, berljive strani */
        .rw-predogled{position:relative;width:min(880px,94vw);left:50%;transform:translateX(-50%);margin-top:1.4rem;background:#e9e6e0;border:1px solid rgba(17,17,17,.12);border-radius:14px;padding:20px;display:flex;flex-direction:column;align-items:center;gap:18px;box-shadow:inset 0 1px 6px rgba(20,20,20,.06)}
        .rw-pred-stran{width:100%;max-width:794px;height:auto;display:block;box-shadow:0 6px 22px rgba(20,20,20,.14);border-radius:2px}
        .rw-pred-prazno{color:rgba(17,17,17,.5);font-size:.9rem;padding:2.5rem 0}
        .rw-pred-osvezi{position:absolute;top:10px;right:12px;font-size:.72rem;color:rgba(17,17,17,.55);background:rgba(255,255,255,.72);padding:.2rem .55rem;border-radius:999px}

        /* UREDI/PREDOGLED + orodjarna + urejevalnik telesa — ENAKO kot kalkulator */
        .rw-pon-vrh{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem;margin:.4rem 0 1rem}
        .rw-segpills{display:inline-flex;background:rgba(255,255,255,.55);border:1px solid rgba(17,17,17,.1);border-radius:999px;padding:.25rem;gap:.15rem}
        .rw-segpills button{border:none;background:transparent;color:var(--ink);font-family:inherit;font-weight:700;font-size:.72rem;letter-spacing:.03em;text-transform:uppercase;padding:.46rem .8rem;border-radius:999px;cursor:pointer;white-space:nowrap;transition:background .18s,color .18s}
        .rw-segpills button.on{background:var(--ink);color:var(--paper)}
        .rw-segpills-sek{background:transparent;border-color:rgba(17,17,17,.14)}
        .rw-segpills-sek button{font-weight:600;color:rgba(17,17,17,.6)}
        .rw-segpills-sek button.on{background:rgba(17,17,17,.09);color:var(--ink)}
        .rw-segpills-pogled button{display:inline-flex;align-items:center;gap:.35rem}
        .rw-orodjarna{position:relative;display:flex;flex-wrap:wrap;gap:.45rem;align-items:center;margin:1rem 0 .8rem}
        /* ── Mobilni predal za oblikovanje (enak jezik kot kalkulatorjev pon-sheet) ── */
        .rw-sheet-trig{display:inline-flex;align-items:center;justify-content:center;width:2.5rem;height:2.5rem;padding:0;border:1px solid rgba(17,17,17,.22);border-radius:999px;background:var(--paper);color:var(--ink);cursor:pointer}
        .rw-sheet-back{position:fixed;inset:0;background:rgba(30,18,35,.34);z-index:78}
        .rw-sheet-glava{position:relative;display:flex;align-items:center;justify-content:space-between;width:100%;padding:1.35rem 1.2rem .65rem;border-bottom:1px solid rgba(17,17,17,.1)}
        .rw-sheet-glava::before{content:'';position:absolute;top:.5rem;left:50%;transform:translateX(-50%);width:2.4rem;height:.3rem;border-radius:999px;background:rgba(17,17,17,.18)}
        .rw-sheet-glava b{font-size:1.05rem;font-weight:700}
        .rw-sheet-x{width:2.1rem;height:2.1rem;display:inline-flex;align-items:center;justify-content:center;border:none;background:rgba(17,17,17,.06);border-radius:50%;font-size:1.1rem;line-height:1;color:var(--ink);cursor:pointer}
        @media (max-width:640px){
          .rw-orodjarna.rw-orodjarna-sheet{position:fixed;left:0;right:0;bottom:0;z-index:80;margin:0;max-height:76dvh;overflow-y:auto;padding:0 1.2rem calc(1.5rem + env(safe-area-inset-bottom,0px));background:var(--paper);border-radius:20px 20px 0 0;box-shadow:0 -16px 44px rgba(40,25,40,.22);transform:translateY(102%);transition:transform .32s cubic-bezier(.2,.8,.3,1)}
          .rw-orodjarna.rw-orodjarna-sheet.odprt{transform:translateY(0)}
          .rw-orodjarna.rw-orodjarna-sheet > *:not(.rw-sheet-glava){margin-top:.55rem}
        }
        .rw-oznaci-namig{position:absolute;top:-2.5rem;left:1rem;background:var(--ink);color:var(--paper);font-size:.8rem;font-weight:600;padding:.4rem .85rem;border-radius:999px;white-space:nowrap;box-shadow:0 8px 22px rgba(17,17,17,.22);z-index:6;pointer-events:none}
        .rw-tool-krog{width:2.6rem;height:2.6rem;border-radius:50%;border:none;background:rgba(17,17,17,.06);color:var(--ink);font-family:inherit;font-weight:700;font-size:.82rem;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;padding:0;transition:background .15s,color .15s}
        .rw-tool-krog:hover{background:var(--ink);color:var(--paper)}
        .rw-tool-vel2{display:inline-flex;align-items:center;gap:.3rem}
        .rw-tool-vel2 .rw-tv-aa{font-weight:700;font-size:.9rem}
        .rw-tool-t.on{background:var(--ink);color:var(--paper)}
        .rw-tool-t .rw-ti{font-weight:800;font-size:.92rem;line-height:1}
        .rw-tool-t .rw-ti-box{border:2px solid currentColor;border-radius:3px;padding:0 .1em}
        .rw-tool-locnica{width:1px;height:1.7rem;background:rgba(17,17,17,.16);margin:0 .2rem}
        .rw-hl{font-weight:800;font-size:.9rem;line-height:1;background:#FCE38A;border-radius:2px;padding:0 .18em}
        .rw-pisava-select{min-height:2.25rem;border:1px solid rgba(17,17,17,.22);background-color:rgba(255,255,255,.32);color:var(--ink);border-radius:999px;padding:0 1.7rem 0 .9rem;font-family:inherit;font-weight:600;font-size:.78rem;cursor:pointer;appearance:none;-webkit-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%23111' stroke-width='1.5'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right .7rem center}
        .rw-barvica{width:1.35rem;height:1.35rem;border-radius:999px;border:1px solid rgba(17,17,17,.22);cursor:pointer;padding:0}
        .rw-barvica-mavrica{background:conic-gradient(from 0deg,#FA4892,#F8E71C,#50E3C2,#7C3AED,#FA4892);border-color:rgba(17,17,17,.25)}
        .rw-editor{width:100%;min-height:340px;border:1px solid rgba(17,17,17,.25);background:rgba(255,255,255,.72);padding:1.35rem;color:var(--ink);font-family:var(--font-sans),system-ui,sans-serif;font-size:.94rem;line-height:1.62;overflow:auto}
        .rw-editor:focus{outline:none;border-color:var(--ink)}
        .rw-editor h1{margin:0 0 .6rem;font-family:var(--font-serif),Didot,serif;font-size:clamp(1.6rem,4vw,2.3rem);line-height:1.05;font-weight:600}
        .rw-editor h2{margin:1.4rem 0 .5rem;font-size:.74rem;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--accent)}
        .rw-editor p{margin:0 0 .7rem;max-width:70ch}
        .rw-editor b,.rw-editor strong{font-weight:800}
        .rw-editor ul{margin:.2rem 0 .9rem;padding-left:1.2rem;list-style:disc}
        .rw-editor li{margin:.2rem 0}
        .rw-editor .kick{font-size:.7rem;letter-spacing:.2em;text-transform:uppercase;color:var(--accent);font-weight:700;margin-bottom:.3rem}
        .rw-editor .big{font-family:var(--font-serif),Didot,serif;font-size:1.5rem;font-weight:600}
        .rw-editor .meta{color:#666;font-size:.85rem;margin:.1rem 0 .6rem}
        .rw-editor .mut{color:#8a8177;font-size:.82rem}
        .rw-editor .pog-clen{margin:.7rem 0}
        .rw-editor .pog-clen h2{margin:.6rem 0 .2rem}
        .rw-editor .parties p{margin:.1rem 0}
        .rw-editor .sig{display:flex;gap:2.5rem;margin-top:1.4rem}
        .rw-editor .sig>div{flex:1;font-size:.85rem;color:#444}
        .rw-editor .sig .lin{display:block;border-top:1px solid #111;margin:2rem 0 .3rem}
        @media (max-width:600px){.rw-mreza,.rw-mreza3,.rw-mreza-prav{grid-template-columns:1fr}}
        /* ── Mobilni odrez po desni: koren .rw ima overflow-x:clip, zato NIC ne sme biti sirse od .rw-vsebina (min(700px,92vw)). ── */
        /* .rw-platno (min(960px,96vw)) in .rw-predogled (min(880px,94vw)) sta bila sirsa od starsa in centrirana (translateX) -> desni rob je gledal cez in bil odrezan. */
        @media (max-width:640px){
          .rw-platno{width:min(960px,100%);max-width:100%}
          .rw-predogled{width:min(880px,100%);max-width:100%}
          .rw-kartica{max-width:100%}
          /* dolga besedila (e-posta, URL, imena) v generirani pogodbi/letterheadu naj se prelomijo, ne silijo cez rob */
          .rw-editor,.rw-editor h1,.rw-editor h2,.rw-editor p,.rw-editor li{overflow-wrap:anywhere}
          /* podpisni stolpci se na ozkem zaslonu zlozijo navpicno (sicer 2x flex:1 + gap 2.5rem stisne cez rob) */
          .rw-editor .sig{flex-direction:column;gap:1.2rem}
          /* povzetek "Mesecni znesek": velika serif stevilka (+ moznost "z DDV ...")
             je v flex vrstici brez preloma -> na ozkem zaslonu je silila cez desni
             rob (odrezano). Zdaj se ovije in prelomi. */
          .rw-povz{max-width:100%}
          .rw-glavna{flex-wrap:wrap;gap:.35rem}
          .rw-glavna b{overflow-wrap:anywhere;min-width:0}
          .rw-det li{overflow-wrap:anywhere}
          .rw-vsebina{width:min(700px,100%);max-width:100%}
        }
      `}</style>
    </div>
  );
}

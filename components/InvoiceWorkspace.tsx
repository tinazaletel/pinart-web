'use client';

/* RACUNI — obrazec + dokument po slovenski zakonodaji (ZDDV-1, 82. clen).
   Vzorci so KOPIRANI iz RetainerWorkspace (letterhead + DOC_CSS + /api/ponudba-pdf,
   branje nastavitev "Moje podjetje" iz K_NAST) in KalkulatorApp (RACUN_CSS tabela,
   mailto "posljem racun st. ..."). Stari racuni (brez postavk) se delujejo:
   nova polja v FlowInvoice so neobvezna, dokument zanje izpelje eno postavko. */

import { FormEvent, Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CaretDown, FloppyDisk, FilePdf, PaperPlaneTilt, ArrowRight } from '@phosphor-icons/react';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';
import { loadFlowData, saveFlowCollection, type FlowClient, type FlowInvoice, type FlowInvoiceItem, type FlowInvoiceSignature } from '@/lib/pinartFlowStore';
import { podatkiZaPredogled, usePredogled } from '@/lib/predogled';
import Toast from '@/components/Toast';
import { dokCss, dokFontLink, dokVars, DOK_BARVA_PRIVZETA, DOK_FONT_PRIVZETI, aktivnaPredloga, aktivniLogo } from '@/lib/dokVidez';
import { predlagajDdv } from '@/lib/ddvSvet';
import { VALUTE_RACUN } from '@/lib/valute';
import PosljiBlok from '@/components/PosljiBlok';
import { dodajPostavko, izbrisiPostavko, preberiPostavke, type Postavka, type PostavkaEnota } from '@/lib/postavke';

const K_NAST = 'pinart-kalkulator-v2';

type Ponudnik = { ime: string; davcna: string; email: string; telefon: string; naslov: string; trr: string };
type Offer = { id: string; title: string; client: string; date: string; number?: string; scope: string[]; agreedAmount: number };
/* vrstica obrazca — vnosi so nizi (tudi decimalke z vejico), parsamo ob izracunu */
type Vrstica = { opis: string; kolicina: string; cena: string; popust: string; ddv: string };

const DDV_STOPNJE = ['22', '9.5', '5', '0'];
const PRIVZETI_ROK_DNI = 15;
const ENOTE_POSTAVK: PostavkaEnota[] = ['kos', 'ura', 'projekt', 'pavšal', 'mesec'];
const ENOTA_POSTAVKA_EN: Record<PostavkaEnota, string> = { kos: 'pcs', ura: 'hr', projekt: 'project', 'pavšal': 'flat rate', mesec: 'month' };

const esc =(s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
/* SI format: pika = ločilo tisočic, vejica = decimalka. Če vnos vsebuje vejico → obravnavaj
   kot SI (odstrani pike, vejico v piko: "25.000,00" → 25000). Če vejice NI, pusti piko kot
   decimalko (nazaj-združljivo s starimi vnosi tipa "25.5"). */
const stev = (s: string) => {
  const t = String(s).trim();
  if (!t) return 0;
  const c = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t;
  const n = Number(c.replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const datStr = (d: Date) => `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`;
const danesISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
/* znesek vrstice: kolicina x cena (brez DDV) minus popust % */
const vrsticaZnesek = (i: FlowInvoiceItem) => i.kolicina * i.cena * (1 - clamp(i.popust || 0, 0, 100) / 100);

export default function InvoiceWorkspace({ base }: { base: string }) {
  const jeEn = base === '/en';
  const L = (sl: string, en: string) => (jeEn ? en : sl);
  const docLocale = jeEn ? 'en-GB' : 'sl-SI';
  const docDate = (d: Date) => d.toLocaleDateString(docLocale, { day: 'numeric', month: 'numeric', year: 'numeric' });
  /* pod 640px izbira ponudbe postane slide-up predal (vzorec jeMobilni iz RetainerWorkspace) */
  const [jeMobilni, setJeMobilni] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const upd = () => setJeMobilni(mq.matches);
    upd(); mq.addEventListener('change', upd);
    return () => mq.removeEventListener('change', upd);
  }, []);

  const [offers, setOffers] = useState<Offer[]>([]);
  const [invoices, setInvoices] = useState<FlowInvoice[]>([]);
  const [clients, setClients] = useState<FlowClient[]>([]);
  /* Demo/Prazno velja za VSE strani (lib/predogled.ts). V teh nacinih je
     urejanje onemogoceno — sicer bi popravek izmisljenega zapisa pisal v pravo bazo. */
  const [nacin] = usePredogled();
  const samoOgled = nacin !== 'mine';

  /* nastavitve "Moje podjetje" — ISTI vir kot retainer/kalkulator (K_NAST) */
  const [ponudnik, setPonudnik] = useState<Ponudnik>({ ime: '', davcna: '', email: '', telefon: '', naslov: '', trr: '' });
  const [predklic, setPredklic] = useState('+386');
  const [ddvZavezanec, setDdvZavezanec] = useState(false);
  const [ddvStopnja, setDdvStopnja] = useState(22);
  const [dokBarva, setDokBarva] = useState(DOK_BARVA_PRIVZETA);
  const [dokFont, setDokFont] = useState(DOK_FONT_PRIVZETI);
  /* Valuta + poljubna oznaka davka — Slovenija ostane privzeto EUR/DDV, ostali
     svet izbere valuto in vpise svojo davcno oznako (VAT/GST/Sales tax). */
  const [valuta, setValuta] = useState('eur');
  const [davekOznaka, setDavekOznaka] = useState('');
  const valZnak = VALUTE_RACUN.find(v => v.id === valuta)?.znak ?? '€';
  const davOzn = davekOznaka.trim() || (jeEn ? 'VAT' : 'DDV');
  /* enotno oblikovanje zneskov v izbrani valuti (nadomesti prejsnja docMoney/eur2) */
  const docMoney = (value: number) => `${value.toLocaleString(docLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${valZnak}`;
  const eur2 = docMoney;
  /* zapis dodatnih nastavitev v K_NAST brez povozitve ostalega */
  const shraniNast = (patch: Record<string, unknown>) => { try { const s = JSON.parse(localStorage.getItem(K_NAST) || '{}'); localStorage.setItem(K_NAST, JSON.stringify({ ...s, ...patch })); } catch { /* prazno */ } };

  /* pogled = katera "stran" je prikazana — view-swap kot ContractWorkspace:
     pregled (VSTOP za nov racun) ali obrazec (obrazec za nov racun, svoja
     stran). Pregled/arhiv obstojecih racunov je preseljen v Arhiv
     (ArhivWorkspace) — to orodje SAMO ustvarja nove racune. */
  const [pogled, setPogled] = useState<'pregled' | 'obrazec' | 'zakljucek'>('pregled');
  /* vir racuna se IZPELJE iz izbire ponudbe: izbrana ponudba (offerId) => iz
     ponudbe, "Brez ponudbe" (prazen offerId) => samostojen racun. Ni vec locene
     pilule Iz ponudbe / Samostojen racun. */
  const [offerId, setOfferId] = useState('');
  /* iskalen spustnik (combobox) za izbiro ponudbe na VSTOPU — privzeto "Brez
     ponudbe" + zadnjih 10 ponudb, ob tipkanju filtrira VSE ponudbe */
  const [vstopOdprt, setVstopOdprt] = useState(false);
  const [vstopIskanje, setVstopIskanje] = useState('');
  const vstopComboRef = useRef<HTMLDivElement | null>(null);
  /* mobilni sheet za izbiro ponudbe v obrazcu (native select ne skalira s 50+ ponudbami) */
  const [ponSheet, setPonSheet] = useState(false);
  const [ponIskanje, setPonIskanje] = useState('');

  /* obrazec (kontrolirano — predizpolnjevanje iz ponudbe) */
  const [stevilka, setStevilka] = useState('');
  const [stranka, setStranka] = useState('');
  const [datumIzdaje, setDatumIzdaje] = useState(danesISO());
  const [datumStoritve, setDatumStoritve] = useState(danesISO());
  const [rokDni, setRokDni] = useState(String(PRIVZETI_ROK_DNI));
  const [placano, setPlacano] = useState(false);
  /* predracun = poziv k placilu vnaprej (NI knjigovodska listina); privzeto
     false -> obstojeci racuni delujejo enako kot doslej */
  const [predracun, setPredracun] = useState(false);
  /* AVANS / delni znesek (%) — koliko od celotnega zneska se zaracuna s tem
     dokumentom; privzeto '100' (cel znesek) -> stari nacin ostane nespremenjen */
  const [avansPct, setAvansPct] = useState('100');
  const [vrstice, setVrstice] = useState<Vrstica[]>([]);
  const [knjiznica, setKnjiznica] = useState<Postavka[]>([]);
  const [knjiznicaOdprta, setKnjiznicaOdprta] = useState(false);
  const [knjiznicaIskanje, setKnjiznicaIskanje] = useState('');
  const [shraniVrsticoIndex, setShraniVrsticoIndex] = useState<number | null>(null);
  const [postavkaIme, setPostavkaIme] = useState('');
  const [postavkaEnota, setPostavkaEnota] = useState<PostavkaEnota>('projekt');
  const [pdfId, setPdfId] = useState('');
  const [napaka, setNapaka] = useState('');
  const [obvestilo, setObvestilo] = useState('');   /* jasno opozorilo (namesto domačega »Fill out this field«) */

  /* ── podpis na racunu — isti vzorec kot ContractWorkspace (canvas risanje ali
     nalozena slika, shranjena kot data URL); ime/kraj/datum so neobvezni. ── */
  const [podpisIme, setPodpisIme] = useState('');
  const [podpisKraj, setPodpisKraj] = useState('');
  const [podpisDatum, setPodpisDatum] = useState(danesISO());
  const [podpisSlika, setPodpisSlika] = useState('');
  const [narisanPodpis, setNarisanPodpis] = useState(false);
  const NOGA_PRIVZETA = jeEn ? 'This document is issued electronically and is valid without a stamp or signature.' : 'Dokument je izdan elektronsko in je veljaven brez žiga in podpisa.';
  const [nogaOn, setNogaOn] = useState(true);           /* neobvezna noga računa (privzeto vklopljena) */
  const [nogaText, setNogaText] = useState(NOGA_PRIVZETA);
  const podpisPlatnoRef = useRef<HTMLCanvasElement | null>(null);
  const podpisDatotekaRef = useRef<HTMLInputElement | null>(null);
  const risanjeRef = useRef(false);

  useEffect(() => {
    const data = podatkiZaPredogled(nacin, loadFlowData());
    setOffers(data.offers.map(({ id, title, client, date, number, scope, agreedAmount }) => ({ id, title, client, date, number, scope, agreedAmount })));
    setInvoices(data.invoices);
    setClients(data.clients);
  }, [nacin]);

  useEffect(() => setKnjiznica(preberiPostavke()), []);

  /* podatki podjetja + DDV zavezanost + videz dokumentov — kot RetainerWorkspace */
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(K_NAST) || '{}');
      if (s.ponudnik) setPonudnik({ trr: '', ...s.ponudnik });
      if (s.predklic) setPredklic(s.predklic);
      if (s.ddvZavezanec) setDdvZavezanec(true);
      if (s.ddvStopnja) setDdvStopnja(Number(s.ddvStopnja) || 22);
      if (s.valutaRacun) setValuta(s.valutaRacun);
      if (s.davekOznaka) setDavekOznaka(s.davekOznaka);
      if (s.dokBarva) setDokBarva(s.dokBarva);
      if (s.dokFont) setDokFont(s.dokFont);
    } catch { /* prazno */ }
  }, []);

  const privzetiDdv = () => ddvZavezanec ? String(clamp(ddvStopnja, 0, 30)) : '22';
  const novaVrstica = (): Vrstica => ({ opis: '', kolicina: '1', cena: '', popust: '', ddv: privzetiDdv() });

  const selectedOffer = offers.find(item => item.id === offerId);

  /* sprotni sestevki: osnova po stopnjah, DDV po stopnjah, skupaj za placilo */
  const izracun = useMemo(() => {
    const postavke: FlowInvoiceItem[] = vrstice.map(v => ({ opis: v.opis.trim(), kolicina: stev(v.kolicina) || 0, cena: stev(v.cena), popust: clamp(stev(v.popust), 0, 100), ddv: clamp(stev(v.ddv), 0, 30) }));
    const stopnje = new Map<number, { osnova: number; ddv: number }>();
    let osnova = 0;
    postavke.forEach(p => {
      const znesek = vrsticaZnesek(p);
      if (!znesek) return;
      osnova += znesek;
      const kljuc = ddvZavezanec ? (p.ddv || 0) : 0;
      const s = stopnje.get(kljuc) || { osnova: 0, ddv: 0 };
      s.osnova += znesek;
      s.ddv += ddvZavezanec ? znesek * kljuc / 100 : 0;
      stopnje.set(kljuc, s);
    });
    const ddvSkupaj = [...stopnje.values()].reduce((sum, s) => sum + s.ddv, 0);
    return { postavke, osnova, stopnje: [...stopnje.entries()].sort((a, b) => b[0] - a[0]), ddvSkupaj, zaPlacilo: osnova + ddvSkupaj };
  }, [vrstice, ddvZavezanec]);

  /* AVANS: odstotek celote, ki se placa s TEM dokumentom — brez vnosa je 100 % (cel znesek) */
  const avansOdstotek = clamp(stev(avansPct) || 100, 0, 100);
  const avansJeDelni = avansOdstotek < 100;
  const zaPlaciloAvans = izracun.zaPlacilo * avansOdstotek / 100;

  const nextNumber = () => { const year = new Date().getFullYear(); const count = invoices.filter(item => item.number?.startsWith(String(year))).length + 1; return `${year}-${String(count).padStart(4, '0')}`; };

  /* "Pripravi racun →": ce ni izbrane ponudbe (samostojen racun), pocisti
     morebitno prejsnjo izbiro stranke/postavk; ce je izbrana ponudba, sta
     stranka in prva postavka ze predizpolnjeni prek izberiPonudbo (klican ob
     izbiri na vstopu). */
  const odpriObrazec = () => {
    setStevilka(nextNumber());
    if (!offerId) { setStranka(''); setVrstice([novaVrstica()]); }
    setDatumStoritve(datumIzdaje || danesISO()); setRokDni(String(PRIVZETI_ROK_DNI));
    setPlacano(false); setPredracun(false); setAvansPct('100'); setNapaka('');
    /* podpis je vezan na en, konkreten racun — nov racun zacne brez njega */
    setPodpisIme(''); setPodpisKraj(''); setPodpisDatum(datumIzdaje || danesISO()); setPodpisSlika(''); pocistiPlatno();
    setPogled('obrazec');
  };

  /* ob menjavi pogleda skok na vrh — KOPIJA vzorca iz ContractWorkspace
     (Lenis, ce obstaja; sicer window). Preskoci zacetni render. */
  const prviPogled = useRef(true);
  useEffect(() => {
    if (prviPogled.current) { prviPogled.current = false; return; }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lenis = (window as unknown as { __pinartLenis?: { scrollTo: (t: number, o?: { immediate?: boolean; force?: boolean }) => void; resize?: () => void } }).__pinartLenis;
    lenis?.resize?.();
    if (lenis && typeof lenis.scrollTo === 'function') lenis.scrollTo(0, { immediate: reduce, force: true });
    else window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  }, [pogled]);

  /* mobilni sheet: sprotni filter po naslovu/stranki/stevilki ponudbe */
  const ponudbeZaSheet = offers.filter(offer => {
    const q = ponIskanje.trim().toLocaleLowerCase('sl-SI');
    return !q || `${offer.title} ${offer.client} ${offer.number || ''}`.toLocaleLowerCase('sl-SI').includes(q);
  });
  const izberiVSheet = (id: string) => { izberiPonudbo(id); setPonSheet(false); };

  /* ── vstopni combobox: ponudbe po datumu (najnovejse zgoraj); brez iskanja
     prikaze zadnjih 10, ob tipkanju filtrira VSE po naslovu/stranki/stevilki ── */
  const ponudbePoDatumu = useMemo(
    () => [...offers].sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    [offers],
  );
  const vstopSeznam = (() => {
    const q = vstopIskanje.trim().toLocaleLowerCase('sl-SI');
    if (!q) return ponudbePoDatumu.slice(0, 10);
    return ponudbePoDatumu.filter(offer => `${offer.title} ${offer.client} ${offer.number || ''}`.toLocaleLowerCase('sl-SI').includes(q));
  })();
  const izberiVVstopu = (id: string) => { izberiPonudbo(id); setVstopOdprt(false); setVstopIskanje(''); };
  /* klik izven odprtega comboboxa ga zapre (portal ni potreben — vstop nima transform prednika) */
  useEffect(() => {
    if (!vstopOdprt) return;
    const zapri = (event: MouseEvent) => {
      if (vstopComboRef.current && !vstopComboRef.current.contains(event.target as Node)) { setVstopOdprt(false); setVstopIskanje(''); }
    };
    document.addEventListener('mousedown', zapri);
    return () => document.removeEventListener('mousedown', zapri);
  }, [vstopOdprt]);

  /* razdeli skupni znesek na n postavk (2 decimalki, zadnja dobi zaokrozitveni ostanek — vsota se ujema do centa) */
  const razdeliZnesek = (total: number, n: number): number[] => {
    if (n <= 0) return [];
    const cena = Math.round((total / n) * 100) / 100;
    const zneski = Array<number>(n).fill(cena);
    const ostanek = Math.round((total - cena * n) * 100) / 100;
    zneski[n - 1] = Math.round((zneski[n - 1] + ostanek) * 100) / 100;
    return zneski;
  };

  /* prednapolnitev postavk iz ponudbe: ce ima ponudba vec vrstic obsega, vsaka
     postane svoja postavka (znesek enakomerno razdeljen); sicer ena postavka
     z nazivom ponudbe in celotnim zneskom (ponudba brez strukturiranih postavk) */
  const vrsticeIzPonudbe = (offer: Offer): Vrstica[] => {
    const ddv = privzetiDdv();
    if (offer.scope.length > 1) {
      const zneski = razdeliZnesek(offer.agreedAmount || 0, offer.scope.length);
      return offer.scope.map((opis, i) => ({ opis, kolicina: '1', cena: zneski[i] ? String(zneski[i]) : '', popust: '', ddv }));
    }
    const opis = offer.title + (offer.scope.length ? ` — ${offer.scope[0]}` : '');
    return [{ opis, kolicina: '1', cena: offer.agreedAmount ? String(offer.agreedAmount) : '', popust: '', ddv }];
  };

  /* iz ponudbe: predizpolni stranko + postavke (naslov/obseg/znesek) */
  const izberiPonudbo = (id: string) => {
    setOfferId(id);
    const offer = offers.find(o => o.id === id);
    if (!offer) return;
    setStranka(offer.client);
    setVrstice(vrsticeIzPonudbe(offer));
  };

  /* "Ponastavi na privzeto": povrne narocnika + postavke na izhodisce izbrane
     ponudbe — NE izbrise rocnih sprememb v drugih poljih (stevilka, datumi …) */
  const ponastaviNaPrivzeto = () => {
    const offer = offers.find(o => o.id === offerId);
    if (!offer) return;
    setStranka(offer.client);
    setVrstice(vrsticeIzPonudbe(offer));
  };

  const popraviVrstico = (index: number, polje: keyof Vrstica, vrednost: string) =>
    setVrstice(v => v.map((row, i) => i === index ? { ...row, [polje]: vrednost } : row));

  const filtriranePostavke = useMemo(() => {
    const q = knjiznicaIskanje.trim().toLocaleLowerCase('sl-SI');
    if (!q) return knjiznica;
    return knjiznica.filter(item => `${item.ime} ${item.opis}`.toLocaleLowerCase('sl-SI').includes(q));
  }, [knjiznica, knjiznicaIskanje]);

  const uporabiPostavko = (item: Postavka) => {
    const vrstica: Vrstica = { opis: item.opis || item.ime, kolicina: '1', cena: String(item.cena), popust: '', ddv: privzetiDdv() };
    setVrstice(rows => rows.length === 1 && !rows[0].opis.trim() && !rows[0].cena ? [vrstica] : [...rows, vrstica]);
    setKnjiznicaOdprta(false);
    setKnjiznicaIskanje('');
  };

  const odpriShranjevanjePostavke = (index: number) => {
    setShraniVrsticoIndex(index);
    setPostavkaIme(vrstice[index]?.opis.trim() || '');
    setPostavkaEnota('projekt');
  };

  const shraniVrsticoKotPostavko = () => {
    if (shraniVrsticoIndex === null) return;
    const vrstica = vrstice[shraniVrsticoIndex];
    if (!vrstica || !postavkaIme.trim() || !vrstica.opis.trim() || stev(vrstica.cena) <= 0) return;
    dodajPostavko({ ime: postavkaIme.trim(), opis: vrstica.opis.trim(), cena: stev(vrstica.cena), enota: postavkaEnota });
    setKnjiznica(preberiPostavke());
    setShraniVrsticoIndex(null);
  };

  /* ── podpis: canvas za risanje (prst/miska) ali nalozena slika — KOPIJA vzorca iz ContractWorkspace ── */
  const pripraviPlatno = (c: HTMLCanvasElement | null) => {
    podpisPlatnoRef.current = c;
    if (!c) return;
    const r = c.getBoundingClientRect();
    if (r.width > 0 && c.width !== Math.round(r.width * 2)) {
      c.width = Math.round(r.width * 2); c.height = Math.round(r.height * 2);
      const ctx = c.getContext('2d');
      if (ctx) { ctx.scale(2, 2); ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#1a1622'; }
    }
  };
  const podpisTocka = (e: React.PointerEvent<HTMLCanvasElement>) => { const r = e.currentTarget.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const zacniRis = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const ctx = podpisPlatnoRef.current?.getContext('2d'); if (!ctx) return;
    risanjeRef.current = true;
    const p = podpisTocka(e); ctx.beginPath(); ctx.moveTo(p.x, p.y);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const risiPodpis = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!risanjeRef.current) return;
    const ctx = podpisPlatnoRef.current?.getContext('2d'); if (!ctx) return;
    const p = podpisTocka(e); ctx.lineTo(p.x, p.y); ctx.stroke();
    if (!narisanPodpis) setNarisanPodpis(true);
  };
  const koncajRis = () => { risanjeRef.current = false; };
  const pocistiPlatno = () => {
    const c = podpisPlatnoRef.current; const ctx = c?.getContext('2d');
    if (c && ctx) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, c.width, c.height); ctx.restore(); }
    setNarisanPodpis(false);
  };
  /* narisan podpis -> shrani kot data URL v stanje (isto kot pri pogodbi, le da tu ni contentEditable telesa, zato gre v FlowInvoice.signature) */
  const uporabiNarisanPodpis = () => {
    const c = podpisPlatnoRef.current; if (!(c && narisanPodpis)) return;
    setPodpisSlika(c.toDataURL('image/png'));
    pocistiPlatno();
  };
  const naloziPodpisSliko = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { if (typeof r.result === 'string') setPodpisSlika(r.result); };
    r.readAsDataURL(f);
    e.target.value = '';
  };
  const odstraniPodpis = () => setPodpisSlika('');

  const save = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    /* prej je v predogledu (demo) TIHO vrnil -> uporabnica je klikala Shrani in se ni zgodilo nič.
       Zdaj pove razlog: v demu ne pišemo v pravo bazo, treba je preklopiti na »Moji podatki«. */
    if (samoOgled) { setNapaka(L('To je predogled (demo) — račun ni shranjen. Za pravo shranjevanje preklopi na »Moji podatki« (preklopnik zgoraj).', 'This is a preview (demo) — the invoice is not saved. To really save, switch to »My data« (toggle above).')); return; }
    const items = izracun.postavke.filter(p => p.opis || p.cena);
    if (!items.length) { setNapaka(L('Dodaj vsaj eno postavko z opisom in ceno.', 'Add at least one item with a description and price.')); return; }
    const invoice: FlowInvoice = {
      id: crypto.randomUUID(),
      number: stevilka.trim(),
      title: items[0].opis.slice(0, 90) || selectedOffer?.title,
      client: stranka.trim() || selectedOffer?.client || L('Brez stranke', 'No client'),
      amount: Math.round((avansJeDelni ? zaPlaciloAvans : izracun.zaPlacilo) * 100) / 100,
      paid: placano,
      date: datumIzdaje,
      dueDays: clamp(Math.round(stev(rokDni)) || PRIVZETI_ROK_DNI, 0, 365),
      sourceOfferId: offerId || undefined,
      source: offerId ? 'offer' : 'manual',
      items,
      serviceDate: datumStoritve || undefined,
      vatPayer: ddvZavezanec,
      net: Math.round(izracun.osnova * 100) / 100,
      vatAmount: Math.round(izracun.ddvSkupaj * 100) / 100,
      predracun: predracun || undefined,
      /* AVANS: ce je pct < 100, shrani delez + poln znesek (za preostanek/kasnejso pretvorbo);
         pri 100 % ostane oboje undefined -> dokument izgleda tocno kot doslej */
      avansPct: avansJeDelni ? avansOdstotek : undefined,
      polnaVrednost: avansJeDelni ? Math.round(izracun.zaPlacilo * 100) / 100 : undefined,
      signature: podpisSlika ? {
        image: podpisSlika,
        name: podpisIme.trim() || undefined,
        place: podpisKraj.trim() || undefined,
        date: podpisDatum || undefined,
      } : undefined,
      footerOn: nogaOn,
      footerText: nogaOn ? (nogaText.trim() || undefined) : undefined,
    };
    const next = [invoice, ...invoices];
    setInvoices(next); saveFlowCollection('invoices', next);
    /* ce stranka se NI v imeniku, jo USTVARI (racun ne sme ostati brez zapisa stranke) */
    const strankaIme = (stranka.trim() || invoice.client).trim();
    if (strankaIme && !clients.some(c => (c.name || '').trim().toLocaleLowerCase('sl-SI') === strankaIme.toLocaleLowerCase('sl-SI'))) {
      const nc: FlowClient[] = [{ id: crypto.randomUUID(), name: strankaIme }, ...clients];
      setClients(nc); saveFlowCollection('clients', nc);
    }
    /* po shranjevanju nazaj na pregled (kot pogodbe) — nov racun je takoj viden v arhivu */
    setPogled('pregled'); setOfferId('');
  };

  /* ── DOKUMENT (letterhead + DOC_CSS kot RetainerWorkspace, tabela kot racun v kalkulatorju) ── */
  /* Glava/noga AKTIVNE predloge (vec predlog) — ADITIVNO, glej lib/dokVidez.ts.
     Ce nista vpisani, se nic ne izrise in obstojeci videz ostane enak. */
  const glava = () => {
    const kontakt = [ponudnik.davcna.trim() && (jeEn ? (ddvZavezanec ? 'VAT ID: ' : 'Tax no.: ') : (ddvZavezanec ? 'ID za DDV: ' : 'Davčna št.: ')) + ponudnik.davcna.trim(), ponudnik.trr.trim() && (jeEn ? 'IBAN: ' : 'TRR: ') + ponudnik.trr.trim(), ponudnik.telefon.trim() && (jeEn ? 'Phone: ' : 'Tel.: ') + predklic + ' ' + ponudnik.telefon.trim(), ponudnik.email.trim()].filter(Boolean).join(' · ');
    const glavaBesedilo = aktivnaPredloga().glava?.trim();
    const glavaLine = glavaBesedilo ? '<br><span class="mut" style="color:#111;font-weight:600">' + esc(glavaBesedilo) + '</span>' : '';
    /* desni znak = TVOJ shranjeni logo (enotni vir: predloga ali K_LOGO); prej trdo zakodiran »Pinart« -> logo se ni videl */
    const logo = aktivniLogo();
    const znak = logo ? `<img class="lg-logo" src="${logo}" alt="">` : '';
    return `<div class="lg"><div><b>${esc(ponudnik.ime.trim() || (jeEn ? '[Your company]' : '[Tvoje podjetje]'))}</b>${glavaLine}${ponudnik.naslov.trim() ? '<br>' + esc(ponudnik.naslov.trim()) : ''}${kontakt ? '<br><span class="mut">' + esc(kontakt) + '</span>' : ''}</div>${znak}</div>`;
  };
  const dokNoga = () => {
    const n = aktivnaPredloga().noga?.trim();
    /* noga = fiksno 5 mm od SPODNJEGA roba strani (v spodnji rob @page margina) */
    return n ? `<div class="dok-noga" style="position:fixed;left:16mm;right:16mm;bottom:5mm;padding-top:8px;border-top:1px solid oklch(93% .006 82 / .55);font-size:8pt;color:#625c56;line-height:1.5">${esc(n).split('\n').join('<br>')}</div>` : '';
  };
  const DOC_CSS = `@page{size:A4;margin:16mm 16mm 18mm}*{-webkit-print-color-adjust:exact;print-color-adjust:exact;box-sizing:border-box}body{margin:0;color:#1a1622;font-family:'Helvetica Neue',Arial,sans-serif;font-size:10.5pt;line-height:1.42}.lg{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;padding-bottom:12px;border-bottom:1.5px solid #B25476;margin-bottom:20px}.lg .rt{font-family:'Bodoni Moda',Didot,Georgia,serif;font-size:15pt;color:#111}.lg .lg-logo{max-height:46px;max-width:180px;object-fit:contain;display:block}.mut{color:#625c56;font-size:9pt}
    .rac-head{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;margin:6px 0 22px}
    .rac-title{display:flex;flex-direction:column;gap:2px}
    .rac-kicker{font-size:9pt;letter-spacing:.28em;text-transform:uppercase;color:#B25476}
    .rac-no{font-family:'Helvetica Neue',Arial,sans-serif;font-size:24pt;font-weight:700;letter-spacing:-.01em;color:#111;line-height:1.05}
    .rac-meta{font-size:9pt;color:#444;text-align:right;line-height:1.5}
    .rac-meta b{display:block;font-size:7.5pt;letter-spacing:.12em;text-transform:uppercase;color:#B25476;margin-top:7px}
    .rac-stranki{margin:0 0 18px;font-size:10.5pt;color:#222;line-height:1.6}
    .rac-l{display:block;font-size:7.5pt;letter-spacing:.14em;text-transform:uppercase;color:#625c56;margin-bottom:4px}
    .rac-tabela{width:100%;border-collapse:collapse;margin:8px 0 14px;font-size:10pt;color:#222}
    .rac-tabela th{text-align:left;font-size:7.5pt;letter-spacing:.1em;text-transform:uppercase;color:#625c56;border-bottom:1.5px solid #B25476;padding:0 8px 7px;font-weight:700}
    .rac-tabela td{padding:9px 8px;border-bottom:1px solid #ece3d8;vertical-align:top}
    .rac-tabela th:not(:first-child),.rac-tabela td:not(:first-child){text-align:right;white-space:nowrap}
    .rac-vsote{margin-left:auto;width:300px;font-size:10.5pt;color:#222}
    .rac-vsote>div{display:flex;justify-content:space-between;gap:12px;padding:5px 8px}
    .rac-skupaj{border-top:1.5px solid #B25476;margin-top:4px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:13pt;font-weight:700;letter-spacing:-.01em;color:#111}
    .rac-placilo{margin:20px 0 0;font-size:10pt;color:#222;background:#f8f5ee;border:1px solid #eadfce;border-radius:9px;padding:13px 16px;line-height:1.7}
    .rac-opomba{font-size:9pt;color:#666;margin:10px 0 0}
    .rac-noga-txt{font-size:8.2pt;color:#625c56;margin-top:22px}
    .rac-noga-brez{font-size:8.2pt;color:#625c56;margin-top:14px;padding-top:9px;border-top:1px solid #e7e2d8;line-height:1.5}
    .rac-placano{display:inline-block;margin:18px 0 0;border:3px solid #2e7d5b;color:#2e7d5b;font-weight:700;letter-spacing:.22em;padding:6px 18px;border-radius:8px;transform:rotate(-5deg);font-size:16pt}
    .rac-podpis{margin-top:26px;max-width:260px;break-inside:avoid}
    .rac-podpis-crta{border-bottom:1px solid #111;min-height:34px;display:flex;align-items:flex-end;padding-bottom:4px}
    .podpis-img{display:block;max-height:40px;max-width:200px}
    .rac-podpis-ime{margin-top:5px;font-size:9.5pt;color:#222}
    .rac-podpis-meta{font-size:8.5pt;color:#625c56}`;
  const doc = (body: string) => `<!doctype html><html lang="${jeEn ? 'en' : 'sl'}"><head><meta charset="utf-8">${dokFontLink(dokFont)}<style>${dokCss(`${DOC_CSS}.mut{color:#625c56!important}`)}</style></head><body style="${dokVars(dokBarva, dokFont)}">${glava()}${body}${dokNoga()}</body></html>`;

  /* postavke za dokument: novi racuni jih imajo shranjene; za STARE izpeljemo eno
     vrstico iz zneska (ce je bil izdajatelj zavezanec, je stari amount vseboval DDV) */
  const postavkeZa = (inv: FlowInvoice): { items: FlowInvoiceItem[]; zavezanec: boolean } => {
    const zavezanec = inv.vatPayer ?? ddvZavezanec;
    if (inv.items?.length) return { items: inv.items, zavezanec };
    const rate = clamp(ddvStopnja, 0, 30);
    const cena = zavezanec ? inv.amount / (1 + rate / 100) : inv.amount;
    return { items: [{ opis: inv.title || (jeEn ? 'Services provided' : 'Opravljene storitve'), kolicina: 1, cena, popust: 0, ddv: rate }], zavezanec };
  };

  const racunTelo = (inv: FlowInvoice): string => {
    const { items, zavezanec } = postavkeZa(inv);
    /* predracun = poziv k placilu vnaprej, NI knjigovodska listina — oznaka v
       dokumentu (kicker + stevilka) se glasi PREDRAČUN namesto RAČUN */
    const jePredracun = Boolean(inv.predracun);
    const naziv = jeEn ? (jePredracun ? 'Pro forma invoice' : 'Invoice') : (jePredracun ? 'Predračun' : 'Račun');
    const izdaja = new Date(inv.date);
    const storitev = inv.serviceDate ? new Date(inv.serviceDate) : izdaja;
    const rok = new Date(izdaja.getTime() + (inv.dueDays ?? PRIVZETI_ROK_DNI) * 864e5);
    const imaPopust = items.some(i => (i.popust || 0) > 0);
    const stopnje = new Map<number, { osnova: number; ddv: number }>();
    let osnova = 0;
    items.forEach(i => {
      const znesek = vrsticaZnesek(i);
      osnova += znesek;
      if (!zavezanec) return;
      const kljuc = i.ddv || 0;
      const s = stopnje.get(kljuc) || { osnova: 0, ddv: 0 };
      s.osnova += znesek; s.ddv += znesek * kljuc / 100;
      stopnje.set(kljuc, s);
    });
    const ddvSkupaj = [...stopnje.values()].reduce((sum, s) => sum + s.ddv, 0);
    const zaPlacilo = osnova + ddvSkupaj;
    const vecStopenj = stopnje.size > 1;
    /* AVANS v dokumentu: ce inv.avansPct < 100, glavna vrstica pokaze samo avansni
       delez + dodatni vrstici "Poln znesek" in opombo o preostanku; sicer (brez
       avansa) dokument ostane tocno tak kot doslej */
    const jeAvans = Boolean(inv.avansPct && inv.avansPct < 100);
    const polnZnesek = inv.polnaVrednost ?? zaPlacilo;
    const zaPlaciloGlavno = jeAvans ? inv.amount : zaPlacilo;
    const vrsticeHtml = items.map(i => `<tr><td>${esc(i.opis || (jeEn ? 'Service' : 'Storitev'))}</td><td>${i.kolicina.toLocaleString(docLocale)}</td><td>${docMoney(i.cena)}</td>${imaPopust ? `<td>${(i.popust || 0).toLocaleString(docLocale)} %</td>` : ''}${zavezanec ? `<td>${(i.ddv || 0).toLocaleString(docLocale)} %</td>` : ''}<td>${docMoney(vrsticaZnesek(i))}</td></tr>`).join('');
    const vsoteHtml = zavezanec
      ? [...stopnje.entries()].sort((a, b) => b[0] - a[0]).map(([rate, s]) => `<div><span>${jeEn ? 'Subtotal' : 'Osnova'}${vecStopenj ? ` (${davOzn} ${rate.toLocaleString(docLocale)} %)` : ''}</span><span>${docMoney(s.osnova)}</span></div><div><span>${davOzn} (${rate.toLocaleString(docLocale)} %)</span><span>${docMoney(s.ddv)}</span></div>`).join('')
      : `<div><span>${jeEn ? 'Subtotal' : 'Osnova'}</span><span>${docMoney(osnova)}</span></div>`;
    const klient = clients.find(c => c.name.trim().toLowerCase() === inv.client.trim().toLowerCase());
    const prejemnik = [
      `<b>${esc(inv.client)}</b>`,
      klient?.contact?.trim() && esc(klient.contact.trim()),
      klient?.address?.trim() && esc(klient.address.trim()),
      klient?.tax?.trim() && ((jeEn ? 'Tax no.: ' : 'Davčna št.: ') + esc(klient.tax.trim())),
      klient?.email?.trim() && esc(klient.email.trim()),
    ].filter(Boolean).join('<br>');
    const sklicDigits = (inv.number || '').replace(/\D/g, '');
    const placiloVrstice = [
      ponudnik.trr.trim() && ((jeEn ? 'IBAN: ' : 'TRR: ') + esc(ponudnik.trr.trim())),
      sklicDigits && ((jeEn ? 'Payment reference: SI00 ' : 'Sklic: SI00 ') + sklicDigits),
      (jeEn ? 'Payment due: ' : 'Rok plačila: ') + docDate(rok),
    ].filter(Boolean).join('<br>');
    return `
      <div class="rac-head">
        <div class="rac-title"><span class="rac-kicker">${naziv}</span><span class="rac-no">${esc(inv.number || '')}</span></div>
        <div class="rac-meta"><b>${jeEn ? 'Issue date' : 'Datum izdaje'}</b>${docDate(izdaja)}<b>${jeEn ? 'Service date' : 'Opravljena storitev'}</b>${docDate(storitev)}<b>${jeEn ? 'Payment due' : 'Rok plačila'}</b>${docDate(rok)}</div>
      </div>
      <div class="rac-stranki"><span class="rac-l">${jeEn ? (jePredracun ? 'Pro forma invoice recipient' : 'Invoice recipient') : `Prejemnik ${jePredracun ? 'predračuna' : 'računa'}`}</span>${prejemnik || (jeEn ? '[customer]' : '[naročnik]')}</div>
      <table class="rac-tabela"><thead><tr><th>${jeEn ? 'Item' : 'Postavka'}</th><th>${jeEn ? 'Qty.' : 'Kol.'}</th><th>${jeEn ? `Unit price excl. ${davOzn}` : `Cena brez ${davOzn}`}</th>${imaPopust ? `<th>${jeEn ? 'Discount' : 'Popust'}</th>` : ''}${zavezanec ? `<th>${davOzn}</th>` : ''}<th>${jeEn ? 'Amount' : 'Znesek'}</th></tr></thead>
      <tbody>${vrsticeHtml}</tbody></table>
      <div class="rac-vsote">${vsoteHtml}${zavezanec ? `<div><span>${jeEn ? `Total ${davOzn}` : `${davOzn} skupaj`}</span><span>${docMoney(ddvSkupaj)}</span></div>` : ''}${jeAvans ? `<div><span>${jeEn ? 'Full amount' : 'Poln znesek'}</span><span>${docMoney(polnZnesek)}</span></div>` : ''}<div class="rac-skupaj"><span>${jeAvans ? `${jeEn ? 'AMOUNT DUE (advance' : 'ZA PLAČILO (avans'} ${(inv.avansPct || 0).toLocaleString(docLocale)} %)` : (jeEn ? 'TOTAL AMOUNT DUE' : 'SKUPAJ ZA PLAČILO')}</span><span>${docMoney(zaPlaciloGlavno)}</span></div></div>
      ${jeAvans ? `<p class="rac-opomba">${jeEn ? `The remaining ${docMoney(Math.max(polnZnesek - inv.amount, 0))} will be invoiced on the final invoice after completion/delivery.` : `Preostanek ${docMoney(Math.max(polnZnesek - inv.amount, 0))} se zaračuna na končnem računu po izvedbi/dobavi.`}</p>` : ''}
      ${!zavezanec && valuta === 'eur' ? `<p class="rac-opomba">${jeEn ? 'VAT is not charged pursuant to Article 94(1) of ZDDV-1 (the supplier is not registered for VAT).' : 'DDV ni obračunan na podlagi 1. odstavka 94. člena ZDDV-1 (izdajatelj ni zavezanec za DDV).'}</p>` : ''}
      ${jePredracun ? `<p class="rac-opomba"><b>${jeEn ? 'This pro forma invoice is not an accounting document. An invoice will be issued upon receipt of payment.' : 'Predračun ni knjigovodska listina. Račun bo izdan po prejemu plačila.'}</b></p>` : ''}
      <div class="rac-placilo">${placiloVrstice}</div>
      ${inv.paid ? `<div class="rac-placano">${jeEn ? 'PAID' : 'PLAČANO'}</div>` : ''}
      ${inv.signature ? `<div class="rac-podpis"><div class="rac-podpis-crta"><img class="podpis-img" src="${inv.signature.image}" alt="${jeEn ? 'Signature' : 'Podpis'}"></div><div class="rac-podpis-ime">${esc(inv.signature.name || ponudnik.ime.trim() || '')}</div>${(inv.signature.place || inv.signature.date) ? `<div class="rac-podpis-meta">${esc([inv.signature.place, inv.signature.date ? docDate(new Date(inv.signature.date)) : ''].filter(Boolean).join(' · '))}</div>` : ''}</div>` : ''}
      <p class="rac-noga-txt">${jeEn ? (jePredracun ? 'This pro forma invoice is an informational request for payment and is not a tax or accounting document.' : 'This invoice is issued in accordance with applicable law. Statutory default interest will be charged on late payments.') : (jePredracun ? 'Predračun je informativen poziv k plačilu in ni davčni/knjigovodski dokument.' : 'Račun je izdan v skladu z veljavno zakonodajo. Ob zamudi plačila zaračunamo zakonske zamudne obresti.')}</p>
      ${(inv.footerOn !== false && (inv.footerText || '').trim()) ? `<div class="rac-noga-brez">${esc(inv.footerText || '').split('\n').join('<br>')}</div>` : ''}`;
  };

  /* Poglej / Prenesi PDF — prek /api/ponudba-pdf, ENAKO kot retainer prenesi() */
  const prenesiPdf = async (inv: FlowInvoice) => {
    setNapaka(''); setPdfId(inv.id);
    try {
      const html = doc(racunTelo(inv));
      const ime = 'racun-' + (inv.number || 'pinart').replace(/[^\w-]+/g, '');
      const footer = esc([ponudnik.ime.trim(), (jeEn ? 'Invoice' : 'Račun') + (inv.number ? ' ' + inv.number : '')].filter(Boolean).join(' · '));
      const res = await fetch('/api/ponudba-pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ html, ime, footer }) });
      if (!res.ok) throw new Error('pdf');
      const blob = await res.blob();
      if (!blob.size) throw new Error('prazen');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = ime + '.pdf'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch { setNapaka(L('PDF-ja ni bilo mogoče pripraviti. Poskusi znova.', 'The PDF could not be prepared. Please try again.')); } finally { setPdfId(''); }
  };

  /* Poslji v placilo — mailto vzorec iz KalkulatorApp ("posljem racun st. ...") */
  const posljiVPlacilo = (inv: FlowInvoice) => {
    const email = clients.find(c => c.name.trim().toLowerCase() === inv.client.trim().toLowerCase())?.email?.trim() || '';
    const izdaja = new Date(inv.date);
    const rok = new Date(izdaja.getTime() + (inv.dueDays ?? PRIVZETI_ROK_DNI) * 864e5);
    const sklicDigits = (inv.number || '').replace(/\D/g, '');
    const podpis = [ponudnik.ime.trim(), [ponudnik.email.trim(), ponudnik.telefon.trim() && (predklic + ' ' + ponudnik.telefon.trim())].filter(Boolean).join(' · ')].filter(Boolean).join('\n');
    const v: string[] = [L('Pozdravljeni,', 'Hello,'), '', L(`pošiljam račun št. ${inv.number || ''}${inv.title ? ' za: ' + inv.title : ''}.`, `I am sending invoice no. ${inv.number || ''}${inv.title ? ' for: ' + inv.title : ''}.`), ''];
    v.push(L(`Datum izdaje: ${datStr(izdaja)}`, `Issue date: ${datStr(izdaja)}`));
    v.push(L(`Rok plačila: ${datStr(rok)}`, `Payment due: ${datStr(rok)}`));
    v.push(L(`Za plačilo: ${eur2(inv.amount)}`, `Amount due: ${eur2(inv.amount)}`));
    v.push('');
    if (ponudnik.trr.trim()) v.push(L(`TRR: ${ponudnik.trr.trim()}`, `IBAN: ${ponudnik.trr.trim()}`));
    if (sklicDigits) v.push(L(`Sklic: SI00 ${sklicDigits}`, `Payment reference: SI00 ${sklicDigits}`));
    if (inv.paid) v.push('', L('Račun je poravnan. Hvala!', 'The invoice is paid. Thank you!'));
    v.push('', L('Podroben račun prilagam v PDF.', 'A detailed invoice is attached as a PDF.'), '', L('Lep pozdrav,', 'Best regards,'));
    if (podpis) v.push(podpis);
    const zadeva = L(`Račun ${inv.number || ''}`, `Invoice ${inv.number || ''}`).trim();
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(zadeva)}&body=${encodeURIComponent(v.join('\n'))}`;
  };

  /* trenutni racun kot FlowInvoice (iz obrazca) — za HTML dokument v posiljanju;
     zrcali objekt iz save() BREZ shranjevanja (isti telo kot prenos/tisk) */
  const trenutniRacun = (): FlowInvoice => ({
    id: 'draft',
    number: stevilka.trim(),
    title: izracun.postavke.find(p => p.opis)?.opis?.slice(0, 90) || selectedOffer?.title,
    client: stranka.trim() || selectedOffer?.client || L('Brez stranke', 'No client'),
    amount: Math.round((avansJeDelni ? zaPlaciloAvans : izracun.zaPlacilo) * 100) / 100,
    paid: placano,
    date: datumIzdaje,
    dueDays: clamp(Math.round(stev(rokDni)) || PRIVZETI_ROK_DNI, 0, 365),
    sourceOfferId: offerId || undefined,
    source: offerId ? 'offer' : 'manual',
    items: izracun.postavke.filter(p => p.opis || p.cena),
    serviceDate: datumStoritve || undefined,
    vatPayer: ddvZavezanec,
    net: Math.round(izracun.osnova * 100) / 100,
    vatAmount: Math.round(izracun.ddvSkupaj * 100) / 100,
    predracun: predracun || undefined,
    avansPct: avansJeDelni ? avansOdstotek : undefined,
    polnaVrednost: avansJeDelni ? Math.round(izracun.zaPlacilo * 100) / 100 : undefined,
    signature: podpisSlika ? { image: podpisSlika, name: podpisIme.trim() || undefined, place: podpisKraj.trim() || undefined, date: podpisDatum || undefined } : undefined,
    footerOn: nogaOn,
    footerText: nogaOn ? (nogaText.trim() || undefined) : undefined,
  });
  /* e-posta stranke iz imenika (po imenu) — privzeti prejemnik posiljanja */
  const strankaEmail = (): string => clients.find(c => c.name.trim().toLowerCase() === stranka.trim().toLowerCase())?.email?.trim() || '';
  /* best-effort e-maili kontaktov stranke (glavni + kontaktne osebe) za spustnik »+ kontakt« */
  const strankaKontakti = (): string[] => {
    const ime = stranka.trim().toLowerCase();
    if (!ime) return [];
    const c = clients.find(x => x.name.trim().toLowerCase() === ime);
    if (!c) return [];
    const zbrani: string[] = [];
    if (c.email) zbrani.push(c.email);
    (c.kontakti || []).forEach(k => { if (k.email) zbrani.push(k.email); });
    const videni = new Set<string>();
    return zbrani.filter(e => { const k = e.toLowerCase(); if (videni.has(k)) return false; videni.add(k); return true; });
  };

  return <div className={`${styles.invoicePage} rc`}>
    {/* ── POGLED: PREGLED (VSTOP za nov racun — kot ContractWorkspace vstop) ── */}
    {/* vstop brez bele kartice, v ozkem sredinskem stolpcu (kot retainer rw-vsebina) — naslov strani
        "RAČUNI / Od dogovora do plačila" izrise racuni/page.tsx nad tem workspace-om */}
    {pogled === 'pregled' && <section className="rc-sek rc-stolpec rc-vstop">
      <p className="rc-kicker">{L('Računi', 'Invoices')}</p>
      <h1 className="rc-h1">{L('Od dogovora do plačila.', 'From agreement to payment.')}</h1>
      <div className="rc-chat">
        <span className="rc-mehur"><b>{L('Iz česa nastane račun?', 'What does an invoice come from?')}</b><small>{L('Če obstaja ponudba, jo izberi — stranka in postavka se predizpolnita v obrazcu. Podatki izdajatelja (naziv, naslov, davčna, TRR) se berejo iz nastavitev Moje podjetje.', 'If an offer exists, select it — the client and item are pre-filled in the form. The issuer details (name, address, tax number, IBAN) are read from the My company settings.')}</small></span>
      </div>
      <div className="rc-vstop-panel">
        {/* 1) VRSTA — prva izbira (Račun / Predračun) */}
        <div className="rc-vstop-vrsta">
          <span className="rc-vrsta-oznaka">{L('Vrsta', 'Type')}</span>
          <div className="rc-segpills rc-tip-segpills" role="group" aria-label={L('Vrsta dokumenta', 'Document type')}>
            <button type="button" aria-label={L('Račun', 'Invoice')} className={predracun ? '' : 'on'} onClick={() => setPredracun(false)}>{L('Račun', 'Invoice')}</button>
            <button type="button" aria-label={L('Predračun', 'Pro forma')} className={predracun ? 'on' : ''} onClick={() => setPredracun(true)}>{L('Predračun', 'Pro forma')}</button>
          </div>
          <small className="rc-vrsta-namig">{L('predhodni (proforma) račun', 'preliminary (pro forma) invoice')}</small>
        </div>
        {/* 2) PONUDBA (iskalen combobox) + DATUM IZDAJE. Izbrana ponudba => vir iz
            ponudbe (predizpolni podatke); "Brez ponudbe" => samostojen račun. */}
        <div className="rc-polja">
          <div className="rc-polje rc-combo-polje">
            <span className="rc-combo-oznaka" id="rc-combo-oznaka">{L('Ponudba', 'Offer')}</span>
            <div className="rc-combo" ref={vstopComboRef}>
              <button type="button" className="rc-combo-sprozilec" aria-haspopup="listbox" aria-expanded={vstopOdprt} aria-labelledby="rc-combo-oznaka" onClick={() => { setVstopOdprt(open => !open); setVstopIskanje(''); }}>
                <span>{selectedOffer ? `${selectedOffer.title} · ${selectedOffer.client}` : L('Brez ponudbe', 'No offer')}</span>
                <CaretDown size={14} weight="bold" aria-hidden />
              </button>
              {vstopOdprt && <div className="rc-combo-panel" onKeyDown={event => { if (event.key === 'Escape') { setVstopOdprt(false); setVstopIskanje(''); } }}>
                <input className="rc-combo-iskalnik" type="search" autoFocus placeholder={L('Poišči ponudbo, stranko ali številko …', 'Search offer, client or number …')} aria-label={L('Poišči ponudbo, stranko ali številko', 'Search offer, client or number')} value={vstopIskanje} onChange={event => setVstopIskanje(event.target.value)} />
                <div className="rc-combo-seznam" role="listbox" aria-label={L('Ponudbe', 'Offers')}>
                  <button type="button" role="option" aria-selected={!offerId} className={'rc-combo-opcija' + (!offerId ? ' on' : '')} onClick={() => izberiVVstopu('')}>
                    <span className="rc-combo-naziv"><strong>{L('Brez ponudbe', 'No offer')}</strong><small>{L('Samostojen račun', 'Standalone invoice')}</small></span>
                    {!offerId && <span className="rc-combo-kljukica" aria-hidden>✓</span>}
                  </button>
                  {vstopSeznam.map(offer => (
                    <button key={offer.id} type="button" role="option" aria-selected={offerId === offer.id} className={'rc-combo-opcija' + (offerId === offer.id ? ' on' : '')} onClick={() => izberiVVstopu(offer.id)}>
                      <span className="rc-combo-naziv"><strong>{offer.title} · {offer.client}</strong>{offer.number && <small>{L('Št.', 'No.')} {offer.number}</small>}</span>
                      {offerId === offer.id && <span className="rc-combo-kljukica" aria-hidden>✓</span>}
                    </button>
                  ))}
                  {!vstopSeznam.length && <p className="rc-mini rc-combo-prazno">{L('Ni ponudb za to iskanje.', 'No offers for this search.')}</p>}
                </div>
                {!vstopIskanje.trim() && ponudbePoDatumu.length > 10 && <p className="rc-combo-namig">{L('Prikazanih zadnjih 10 — išči za vse.', 'Showing the last 10 — search for all.')}</p>}
              </div>}
            </div>
          </div>
          <label className="rc-polje">{L('Datum izdaje', 'Issue date')}
            <input type="date" value={datumIzdaje} onChange={event => setDatumIzdaje(event.target.value)} />
          </label>
        </div>
        <div className="rc-gumbi">
          <button type="button" className="rc-gumb" aria-label={L('Pripravi račun', 'Prepare invoice')} onClick={odpriObrazec}>{predracun ? L('Pripravi predračun →', 'Prepare pro forma →') : L('Pripravi račun →', 'Prepare invoice →')}</button>
        </div>
      </div>
    </section>}

    {/* ── POGLED: OBRAZEC (svoja stran, sredinski stolpec — view-swap kot pogodbe) ── */}
    {pogled === 'obrazec' && <section className={`${styles.invoiceCreator} rc-sek rc-stran rc-stolpec rc-obrazec`}>
      <button type="button" className="rc-povezava rc-nazaj-vrh" onClick={() => setPogled('pregled')}>{L('← Nazaj', '← Back')}</button>
      <div className="rc-obr-uvod">
        <p className={styles.eyebrow}>{L('NOV RAČUN', 'NEW INVOICE')}</p>
        <h2>{L('Vse sestavine po zakonu.', 'Every legally required part.')}</h2>
        <p>{L('Če obstaja ponudba, jo izberi — stranka in postavka se predizpolnita. Podatki izdajatelja (naziv, naslov, davčna, TRR) se berejo iz nastavitev Moje podjetje in se izpišejo v glavi računa.', 'If an offer exists, select it — the client and item are pre-filled. The issuer details (name, address, tax number, IBAN) are read from the My company settings and printed in the invoice header.')}</p>
      </div>
      <Toast sporocilo={obvestilo} onClose={() => setObvestilo('')} ton="napaka" />
      <form noValidate onSubmit={event => {
        event.preventDefault();
        const obrazec = event.currentTarget;
        const manjka = obrazec.querySelector<HTMLInputElement>(':invalid');
        if (manjka) {
          manjka.focus();
          manjka.scrollIntoView({ block: 'center', behavior: 'smooth' });
          const ime = (manjka.closest('label')?.textContent || '').trim().replace(/\s+/g, ' ') || L('polje', 'field');
          setObvestilo(L(`Izpolni polje: ${ime}`, `Please fill out: ${ime}`));
          return;
        }
        setPogled('zakljucek');
      }}>
        {/* vrsta dokumenta: RAČUN (privzeto) ali PREDRAČUN (poziv k placilu vnaprej,
            NI knjigovodska listina — racun se izda sele po prejemu placila) */}
        <div className="rc-segpills rc-tip-segpills" role="group" aria-label={L('Vrsta dokumenta', 'Document type')}>
          <button type="button" aria-label={L('Račun', 'Invoice')} className={predracun ? '' : 'on'} onClick={() => setPredracun(false)}>{L('Račun', 'Invoice')}</button>
          <button type="button" aria-label={L('Predračun', 'Pro forma')} className={predracun ? 'on' : ''} onClick={() => { setPredracun(true); /* prvic izbran predracun -> predlagaj 50 % avansa (ce uporabnica ni ze sama spremenila) */ setAvansPct(current => current === '100' ? '50' : current); }}>{L('Predračun', 'Pro forma')}</button>
        </div>
        <div className={styles.invoiceMetaFields}>
          <label>{L('Ponudba', 'Offer')}{jeMobilni
            ? <button type="button" className="rc-pon-polje" aria-haspopup="dialog" aria-expanded={ponSheet} aria-label={`${L('Ponudba', 'Offer')}: ${selectedOffer ? `${selectedOffer.title} · ${selectedOffer.client}` : L('Samostojen račun', 'Standalone invoice')} — ${L('izberi', 'select')}`} onClick={() => { setPonIskanje(''); setPonSheet(true); }}>
              <span>{selectedOffer ? `${selectedOffer.title} · ${selectedOffer.client}` : L('Samostojen račun', 'Standalone invoice')}</span>
              <CaretDown size={14} weight="bold" aria-hidden />
            </button>
            : <select value={offerId} onChange={event => izberiPonudbo(event.target.value)}><option value="">{L('Samostojen račun', 'Standalone invoice')}</option>{offers.map(offer => <option key={offer.id} value={offer.id}>{offer.title} · {offer.client}</option>)}</select>}</label>
          <label>{L('Številka', 'Number')}<input required value={stevilka} onChange={event => setStevilka(event.target.value)} /></label>
          <label>{L('Stranka', 'Client')}<input required value={stranka} onChange={event => setStranka(event.target.value)} placeholder={L('Izberi obstoječo ali vpiši novo', 'Choose existing or type a new one')} list="rc-stranke" autoComplete="off" /><datalist id="rc-stranke">{clients.map(c => <option key={c.id} value={c.name} />)}</datalist></label>
          <label>{L('Datum izdaje', 'Issue date')}<input required type="date" value={datumIzdaje} onChange={event => setDatumIzdaje(event.target.value)} /></label>
          {/* predracun je poziv PRED izvedbo storitve — datum opravljene storitve zato ni obvezen */}
          <label>{L('Datum opravljene storitve', 'Service date')}<input required={!predracun} type="date" value={datumStoritve} onChange={event => setDatumStoritve(event.target.value)} /></label>
          <label>{L('Rok plačila v dneh', 'Payment term in days')}<input required min="0" type="number" inputMode="numeric" placeholder={String(PRIVZETI_ROK_DNI)} value={rokDni} onChange={event => setRokDni(event.target.value)} /></label>
          {/* AVANS / delni znesek — koliko od celote se zaracuna s TEM dokumentom; brez vnosa 100 % (cel znesek) */}
          <label>{L('Avans / delni znesek (%)', 'Advance / partial amount (%)')}<input min="0" max="100" step="5" type="number" inputMode="numeric" placeholder="100" value={avansPct} onChange={event => setAvansPct(event.target.value)} /></label>
        </div>

        {/* sheet MORA biti v portalu na <body>: transform na prednikih (animacija
            .rc-stran) ukrade sidro position:fixed — ista past kot pri pogodbah */}
        {jeMobilni && typeof document !== 'undefined' && createPortal(
          <>
            {ponSheet && <div className="rc-sheet-back" onClick={() => setPonSheet(false)} aria-hidden />}
            <div className={'rc-pon-sheet' + (ponSheet ? ' odprt' : '')} role="dialog" aria-label={L('Izberi ponudbo', 'Choose an offer')} aria-hidden={!ponSheet}>
              <div className="rc-sheet-glava"><b>{L('Izberi ponudbo', 'Choose an offer')}</b><button type="button" className="rc-sheet-x" onClick={() => setPonSheet(false)} aria-label={L('Zapri', 'Close')}>✕</button></div>
              {offers.length > 8 && <input className="rc-pon-iskalnik" type="search" placeholder={L('Poišči ponudbo ali stranko …', 'Search offer or client …')} aria-label={L('Poišči ponudbo ali stranko', 'Search offer or client')} value={ponIskanje} onChange={event => setPonIskanje(event.target.value)} />}
              <div className="rc-pon-seznam">
                <button type="button" className={'rc-pon-vrstica' + (!offerId ? ' on' : '')} aria-label={L('Samostojen račun — brez povezave s ponudbo', 'Standalone invoice — not linked to an offer')} onClick={() => izberiVSheet('')}>
                  <span className="rc-pon-naziv"><strong>{L('Samostojen račun', 'Standalone invoice')}</strong><small>{L('Brez povezave s ponudbo', 'Not linked to an offer')}</small></span>
                  {!offerId && <span className="rc-pon-kljukica" aria-hidden>✓</span>}
                </button>
                {ponudbeZaSheet.map(offer => (
                  <button key={offer.id} type="button" className={'rc-pon-vrstica' + (offerId === offer.id ? ' on' : '')} aria-label={`${L('Izberi ponudbo', 'Choose offer')} ${offer.title} · ${offer.client}`} onClick={() => izberiVSheet(offer.id)}>
                    <span className="rc-pon-naziv"><strong>{offer.title} · {offer.client}</strong>{offer.number && <small>{L('Št.', 'No.')} {offer.number}</small>}</span>
                    {offerId === offer.id && <span className="rc-pon-kljukica" aria-hidden>✓</span>}
                  </button>
                ))}
                {!ponudbeZaSheet.length && ponIskanje.trim() !== '' && <p className="rc-mini rc-pon-prazno">{L('Ni ponudb za to iskanje.', 'No offers for this search.')}</p>}
              </div>
            </div>
          </>,
          document.body,
        )}

        {knjiznicaOdprta && typeof document !== 'undefined' && createPortal(
          <div className="rc-knjiznica-back" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setKnjiznicaOdprta(false); }}>
            <section className="rc-knjiznica" role="dialog" aria-modal="true" aria-labelledby="rc-knjiznica-naslov">
              <header className="rc-knjiznica-glava">
                <div><p className="rc-knjiznica-kicker">{L('KNJIŽNICA POSTAVK', 'ITEM LIBRARY')}</p><h2 id="rc-knjiznica-naslov">{L('Izberi iz knjižnice', 'Choose from the library')}</h2></div>
                <button type="button" className="rc-knjiznica-x" onClick={() => setKnjiznicaOdprta(false)} aria-label={L('Zapri knjižnico', 'Close library')}>×</button>
              </header>
              <input className="rc-knjiznica-iskanje" type="search" value={knjiznicaIskanje} onChange={event => setKnjiznicaIskanje(event.target.value)} placeholder={L('Poišči izdelek ali storitev …', 'Search product or service …')} aria-label={L('Poišči izdelek ali storitev', 'Search product or service')} autoFocus />
              <div className="rc-knjiznica-seznam">
                {filtriranePostavke.map(item => <article className="rc-knjiznica-item" key={item.id}>
                  <button type="button" className="rc-knjiznica-izberi" onClick={() => uporabiPostavko(item)}>
                    <span><strong>{item.ime}</strong><small>{item.opis}</small></span>
                    <b>{eur2(item.cena)} / {item.enota}</b>
                  </button>
                  <button type="button" className="rc-knjiznica-brisi" onClick={() => setKnjiznica(izbrisiPostavko(item.id))} aria-label={`${L('Izbriši', 'Delete')} ${item.ime}`} disabled={samoOgled}>×</button>
                </article>)}
                {!filtriranePostavke.length && <p className="rc-knjiznica-prazno">{knjiznica.length ? L('Ni zadetkov.', 'No matches.') : L('Knjižnica je še prazna. Izpolnjeno vrstico računa lahko shraniš spodaj.', 'The library is still empty. You can save a filled invoice row below.')}</p>}
              </div>
            </section>
          </div>,
          document.body,
        )}

        <div className="rc-postavke">
          <div className="rc-post-glava">
            <p className={styles.eyebrow}>{L('POSTAVKE RAČUNA', 'INVOICE ITEMS')}</p>
            <label className="rc-valuta" title={L('Valuta računa — znesek vpišeš neposredno v tej valuti', 'Invoice currency — amounts are entered directly in this currency')}>{L('Valuta', 'Currency')}<select value={valuta} onChange={event => { setValuta(event.target.value); shraniNast({ valutaRacun: event.target.value }); }}>{VALUTE_RACUN.map(v => <option key={v.id} value={v.id}>{v.ime}</option>)}</select></label>
            <label className="rc-ddv-toggle" title={valuta === 'eur' ? L('Vklopi, če si zavezanec za DDV — stopnjo (22 % / 9,5 % / 0 %) nato izbereš po vsaki postavki', 'Turn on if you are VAT-registered — you then choose the rate (22% / 9.5% / 0%) per item') : L('Vklopi, če na račun obračunaš davek (npr. Sales tax / GST) — stopnjo vpišeš po postavki', 'Turn on if you charge tax (e.g. Sales tax / GST) — you enter the rate per item')}><input type="checkbox" checked={ddvZavezanec} onChange={event => setDdvZavezanec(event.target.checked)} /> {L(`Obračunaj ${davOzn}`, `Charge ${davOzn}`)}</label>
            {ddvZavezanec && valuta !== 'eur' && <label className="rc-valuta" title={L('Kako se davek imenuje na tvojem trgu (VAT, GST, Sales tax …)', 'What the tax is called in your market (VAT, GST, Sales tax …)')}>{L('Oznaka davka', 'Tax label')}<input value={davekOznaka} onChange={event => { setDavekOznaka(event.target.value); shraniNast({ davekOznaka: event.target.value }); }} placeholder={jeEn ? 'e.g. Sales tax' : 'npr. Sales tax'} style={{ width: '9rem' }} /></label>}
            <div className="rc-post-gumbi">
              {/* samo ce racun izhaja iz ponudbe — povrne narocnika+postavke na izhodisce ponudbe (rocnih sprememb v ostalih poljih ne izbrise) */}
              {offerId && <button type="button" className="rc-ponastavi" onClick={ponastaviNaPrivzeto}>{L('↺ Ponastavi na privzeto', '↺ Reset to default')}</button>}
              <button type="button" className="rc-knjiznica-gumb" onClick={() => setKnjiznicaOdprta(true)}>{L('Izberi iz knjižnice', 'Choose from library')}</button>
              <button type="button" className="rc-dodaj" onClick={() => setVrstice(v => [...v, novaVrstica()])}>{L('+ Dodaj postavko', '+ Add item')}</button>
            </div>
          </div>
          {vrstice.map((v, i) => <Fragment key={i}>
            <div className={'rc-vrstica' + (ddvZavezanec ? '' : ' rc-brez-ddv')}>
              <label className="rc-opis">{L('Opis', 'Description')}<input required={i === 0} value={v.opis} onChange={event => popraviVrstico(i, 'opis', event.target.value)} placeholder={L('Opravljena storitev, obseg ali obdobje …', 'Service provided, scope or period …')} /></label>
              <label className="rc-kolicina">{L('Kol.', 'Qty.')}<input required type="text" inputMode="decimal" placeholder="1" value={v.kolicina} onChange={event => popraviVrstico(i, 'kolicina', event.target.value)} /></label>
              <label className="rc-cena">{L(`Cena brez ${davOzn}`, `Price excl. ${davOzn}`)}<input required={i === 0} type="text" inputMode="decimal" placeholder="0,00" value={v.cena} onChange={event => popraviVrstico(i, 'cena', event.target.value)} /></label>
              <label className="rc-popust">{L('Popust %', 'Discount %')}<input type="text" inputMode="decimal" value={v.popust} onChange={event => popraviVrstico(i, 'popust', event.target.value)} placeholder="0" /></label>
              {ddvZavezanec && (valuta === 'eur'
                ? <label className="rc-davek">{davOzn}<select value={v.ddv} onChange={event => popraviVrstico(i, 'ddv', event.target.value)}>{DDV_STOPNJE.map(s => <option key={s} value={s}>{s.replace('.', ',')} %</option>)}</select></label>
                : <label className="rc-davek">{L(`${davOzn} %`, `${davOzn} %`)}<input min="0" max="30" step="0.1" type="number" inputMode="decimal" placeholder="0" value={v.ddv} onChange={event => popraviVrstico(i, 'ddv', event.target.value)} /></label>)}
              {ddvZavezanec && valuta === 'eur' && (() => { const p = predlagajDdv(v.opis, v.ddv); return p ? <button type="button" className="rc-ddv-namig" title={`${p.razlog} ${L('(predlog, ne davčni nasvet)', '(suggestion, not tax advice)')}`} onClick={() => popraviVrstico(i, 'ddv', p.stopnja)}>💡 {p.stopnja.replace('.', ',')} %?</button> : null; })()}
              <span className="rc-znesek"><em>{L('Znesek', 'Amount')}</em><b>{eur2(vrsticaZnesek(izracun.postavke[i] || { opis: '', kolicina: 0, cena: 0 }))}</b></span>
              <button type="button" className="rc-x" onClick={() => setVrstice(rows => rows.length > 1 ? rows.filter((_, j) => j !== i) : rows)} aria-label={`${L('Odstrani postavko', 'Remove item')} ${i + 1}`} title={L('Odstrani postavko', 'Remove item')} disabled={vrstice.length < 2}>×</button>
            </div>
            {shraniVrsticoIndex === i ? <div className="rc-shrani-editor">
              <label>{L('Ime v knjižnici', 'Name in library')}<input value={postavkaIme} onChange={event => setPostavkaIme(event.target.value)} placeholder={L('Npr. Oblikovanje logotipa', 'E.g. Logo design')} /></label>
              <label>{L('Enota', 'Unit')}<select value={postavkaEnota} onChange={event => setPostavkaEnota(event.target.value as PostavkaEnota)}>{ENOTE_POSTAVK.map(enota => <option key={enota} value={enota}>{jeEn ? ENOTA_POSTAVKA_EN[enota] : enota}</option>)}</select></label>
              <button type="button" className="rc-cip" onClick={shraniVrsticoKotPostavko} disabled={!postavkaIme.trim() || !v.opis.trim() || stev(v.cena) <= 0}>{L('Shrani postavko', 'Save item')}</button>
              <button type="button" className="rc-cip" onClick={() => setShraniVrsticoIndex(null)}>{L('Prekliči', 'Cancel')}</button>
            </div> : <button type="button" className="rc-shrani-postavko" onClick={() => odpriShranjevanjePostavke(i)} disabled={samoOgled || !v.opis.trim() || stev(v.cena) <= 0}>{L('Shrani vrstico kot postavko', 'Save row as item')}</button>}
          </Fragment>)}
        </div>

        <div className="rc-vsote">
          {ddvZavezanec ? <>
            {izracun.stopnje.map(([rate, s]) => <div key={rate}><span>{L('Osnova', 'Subtotal')}{izracun.stopnje.length > 1 ? ` (${davOzn} ${String(rate).replace('.', ',')} %)` : ''}</span><b>{eur2(s.osnova)}</b></div>)}
            {izracun.stopnje.map(([rate, s]) => <div key={'d' + rate}><span>{davOzn} ({String(rate).replace('.', ',')} %)</span><b>{eur2(s.ddv)}</b></div>)}
          </> : <div><span>{L('Osnova', 'Subtotal')}</span><b>{eur2(izracun.osnova)}</b></div>}
          <div className="rc-skupaj"><span>{avansJeDelni ? L(`Za plačilo (avans ${avansOdstotek.toLocaleString('sl-SI')} %)`, `Amount due (advance ${avansOdstotek.toLocaleString('en-GB')} %)`) : L('Skupaj za plačilo', 'Total amount due')}</span><b>{eur2(avansJeDelni ? zaPlaciloAvans : izracun.zaPlacilo)}</b></div>
          {avansJeDelni && <p className="rc-klavzula">{L('Poln znesek', 'Full amount')}: {eur2(izracun.zaPlacilo)} · {L('preostanek', 'remaining')}: {eur2(izracun.zaPlacilo - zaPlaciloAvans)}</p>}
          {!ddvZavezanec && valuta === 'eur' && <p className="rc-klavzula">{L('DDV ni obračunan na podlagi 1. odstavka 94. člena ZDDV-1 — klavzula se izpiše na računu. Zavezanost za DDV nastaviš v Moje podjetje (kalkulator).', 'VAT is not charged pursuant to Article 94(1) of ZDDV-1 — the clause is printed on the invoice. Set your VAT status in My company (calculator).')}</p>}
          {!ddvZavezanec && valuta !== 'eur' && <p className="rc-klavzula">{L('Davek ni obračunan. Če na svojem trgu obračunavaš davek, vklopi »Obračunaj …« zgoraj.', 'No tax charged. If you charge tax in your market, turn on “Charge …” above.')}</p>}
        </div>

        {/* podpis (neobvezen) — isti vzorec kot pri pogodbah: rocno narisan ali nalozen; izrise se na dnu racuna in v izvozu */}
        <div className="rc-podpis">
          <div className="rc-post-glava"><p className={styles.eyebrow}>{L('PODPIS RAČUNA (NEOBVEZNO)', 'INVOICE SIGNATURE (OPTIONAL)')}</p>{podpisSlika && <button type="button" className="rc-povezava" onClick={odstraniPodpis}>{L('Odstrani podpis', 'Remove signature')}</button>}</div>
          <div className="rc-podpis-polja">
            <label className="rc-polje">{L('Ime podpisnika', 'Signer name')}<input value={podpisIme} onChange={event => setPodpisIme(event.target.value)} placeholder={ponudnik.ime || L('Ime in priimek', 'Full name')} /></label>
            <label className="rc-polje">{L('Kraj', 'Place')}<input value={podpisKraj} onChange={event => setPodpisKraj(event.target.value)} placeholder={L('npr. Ljubljana', 'e.g. Ljubljana')} /></label>
            <label className="rc-polje">{L('Datum podpisa', 'Signature date')}<input type="date" value={podpisDatum} onChange={event => setPodpisDatum(event.target.value)} /></label>
          </div>
          {podpisSlika ? (
            <div className="rc-podpis-prikaz">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={podpisSlika} alt={L('Podpis', 'Signature')} />
            </div>
          ) : (
            <>
              <canvas ref={pripraviPlatno} className="rc-podpis-platno" onPointerDown={zacniRis} onPointerMove={risiPodpis} onPointerUp={koncajRis} onPointerCancel={koncajRis} />
              <div className="rc-podpis-akcije">
                <button type="button" className="rc-cip" onClick={pocistiPlatno}>{L('Počisti', 'Clear')}</button>
                <button type="button" className="rc-cip" disabled={!narisanPodpis} onClick={uporabiNarisanPodpis}>{L('Uporabi narisan podpis', 'Use drawn signature')}</button>
                <span className="rc-podpis-ali">{L('ali', 'or')}</span>
                <button type="button" className="rc-cip" onClick={() => podpisDatotekaRef.current?.click()}>{L('Naloži sliko podpisa …', 'Upload signature image …')}</button>
                <input ref={podpisDatotekaRef} type="file" accept="image/*" hidden onChange={naloziPodpisSliko} />
              </div>
            </>
          )}
        </div>

        {/* noga računa (neobvezna) — opomba »brez žiga in podpisa«, privzeto vklopljena, urejljiva */}
        <div className="rc-podpis rc-noga-blok">
          <div className="rc-post-glava">
            <p className={styles.eyebrow}>{L('NOGA RAČUNA (NEOBVEZNO)', 'INVOICE FOOTER (OPTIONAL)')}</p>
            <label className="rc-noga-stikalo"><input type="checkbox" checked={nogaOn} onChange={event => setNogaOn(event.target.checked)} /> {L('Prikaži nogo', 'Show footer')}</label>
          </div>
          {nogaOn && <label className="rc-polje rc-noga-polje">{L('Besedilo noge', 'Footer text')}<textarea value={nogaText} onChange={event => setNogaText(event.target.value)} rows={2} placeholder={NOGA_PRIVZETA} /></label>}
        </div>

        <div className={styles.invoiceSubmit}><button type="submit" className="rc-zakljuci-gumb">{L('Zaključi', 'Finish')} <ArrowRight size={15} weight="bold" /></button></div>
      </form>
    </section>}

    {/* ── ZAKLJUCEK (samostojna stran, enaki elementi kot ponudba/pogodba) ── */}
    {pogled === 'zakljucek' && <section className="rc-sek rc-stran rc-stolpec rc-zakljucek">
      <div className="rc-zakljucek-lik" aria-hidden>
        <svg className="pon-lik" viewBox="0 0 120 140" fill="none" xmlns="http://www.w3.org/2000/svg">
          <ellipse className="pon-senca" cx="60" cy="133" rx="30" ry="4.5" fill="rgba(17,17,17,.12)" />
          <g className="pon-telo" fill="none" stroke="rgba(17,17,17,.46)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M36 16 h36 l18 18 v66 a6 6 0 0 1 -6 6 H36 a6 6 0 0 1 -6 -6 V22 a6 6 0 0 1 6 -6 z" />
            <path d="M72 16 v12 a6 6 0 0 0 6 6 h12" />
            <path d="M40 54 h40" /><path d="M40 66 h40" /><path d="M40 78 h26" />
            <g className="pon-kljuk-znak">
              <circle cx="78" cy="83" r="13" fill="#fff" stroke="none" />
              <circle cx="78" cy="83" r="13" fill="none" stroke="rgba(124,58,237,.7)" strokeWidth="2.6" />
              <path className="pon-kljuk" d="M71 83 l5 5 l9 -10" fill="none" stroke="rgba(124,58,237,.95)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </g>
        </svg>
      </div>
      <p className="rc-kicker rc-kicker-z">{predracun ? L('PREDRAČUN', 'PRO FORMA') : L('RAČUN', 'INVOICE')}{stevilka.trim() ? (jeEn ? ' · NO. ' : ' · ŠT. ') + stevilka.trim() : ''}</p>
      <h1 className="rc-naslov-z">{L('Zaključek.', 'Finish.')}</h1>
      <p className="rc-uvod-z">{L(`Prenesi ${predracun ? 'predračun' : 'račun'}${stranka.trim() ? ' za ' + stranka.trim() : ''}, ga shrani ali pošlji naročniku.`, `Download the ${predracun ? 'pro forma' : 'invoice'}${stranka.trim() ? ' for ' + stranka.trim() : ''}, save it or send it to the client.`)}</p>
      <label className="rc-placan-z"><input type="checkbox" checked={placano} onChange={event => setPlacano(event.target.checked)} /> {predracun ? L('Predračun je že plačan', 'Pro forma is already paid') : L('Račun je že plačan', 'Invoice is already paid')}</label>
      {napaka && <p className="rc-napaka">{napaka}</p>}
      <PosljiBlok
        subject={(predracun ? 'Predračun' : 'Račun') + (stevilka.trim() ? ' ' + stevilka.trim() : '') + (stranka.trim() ? ' — ' + stranka.trim() : '')}
        zgradiHtml={() => doc(racunTelo(trenutniRacun()))}
        privzetiPrejemnik={strankaEmail()}
        imeStranke={stranka.trim()}
        replyTo={ponudnik.email.trim() || undefined}
        samoOgled={samoOgled}
        kontakti={strankaKontakti()}
        projektId={offerId || undefined}
      />
      <div className="rc-prenosi">
        <button type="button" className="rc-povezava-z" onClick={() => save()}>
          <FloppyDisk size={16} /> {predracun ? L('Shrani predračun', 'Save pro forma') : L('Shrani račun', 'Save invoice')}
        </button>
        <button type="button" className="rc-povezava-z" disabled={!!pdfId} onClick={() => prenesiPdf(trenutniRacun())}>
          <FilePdf size={16} /> {pdfId ? L('Pripravljam …', 'Preparing …') : L('Prenesi (PDF)', 'Download (PDF)')}
        </button>
        <button type="button" className="rc-povezava-z" onClick={() => posljiVPlacilo(trenutniRacun())}>
          <PaperPlaneTilt size={16} /> {L('Pošlji v plačilo', 'Send for payment')}
        </button>
      </div>
    </section>}

    {pogled === 'zakljucek' && <div className="rc-noga"><div className="rc-noga-gumbi">
      <button type="button" className="rc-noga-pill" onClick={() => setPogled('obrazec')}>{L('← Uredi račun', '← Edit invoice')}</button>
      <button type="button" className="rc-noga-pill nova" onClick={() => { setPogled('pregled'); setOfferId(''); }}>{L('↺ Nov račun', '↺ New invoice')}</button>
    </div></div>}

    <style>{`
      /* rc- = novi stili obrazca za racun; pazi na .shell pravila (min-height 2.75rem
         na inputih, select padding-right 3rem !important) — mere so temu prilagojene. */
      .rc{min-width:0;max-width:100%;overflow-x:clip;--muted:color-mix(in oklch,var(--ink) 72%,transparent)}
      .rc .rc-postavke{min-width:0;padding:1rem;border:1px solid oklch(93% .006 82 / .55);border-radius:.9rem;background:linear-gradient(135deg,oklch(98% .018 87),oklch(96% .025 62))}
      .rc .rc-postavke *{box-sizing:border-box;min-width:0}
      .rc .rc-post-glava{display:flex;align-items:center;justify-content:space-between;gap:.7rem;flex-wrap:wrap}
      .rc .rc-ddv-toggle{display:inline-flex;align-items:center;gap:.4rem;font-size:.78rem;font-weight:650;color:var(--ink);cursor:pointer;white-space:nowrap}
      .rc .rc-valuta{display:inline-flex;align-items:center;gap:.4rem;font-size:.78rem;font-weight:650;color:var(--ink);white-space:nowrap}
      .rc .rc-valuta select,.rc .rc-valuta input{padding:.32rem .5rem;border:1px solid var(--line,oklch(88% .01 300));border-radius:.5rem;background:#fff;font:600 .8rem var(--font-sans),sans-serif;color:var(--ink)}
      .rc .rc-ddv-toggle input{width:1.05rem;height:1.05rem;accent-color:var(--accent,#6E4FA6);cursor:pointer}
      .rc .rc-ddv-namig{align-self:center;padding:.25rem .55rem;border:1px solid oklch(80% .09 300);border-radius:999px;background:oklch(96% .03 300);color:oklch(42% .13 300);font:700 .6rem var(--font-sans),sans-serif;cursor:pointer;white-space:nowrap}
      .rc .rc-ddv-namig:hover{background:oklch(42% .13 300);color:#fff;border-color:transparent}
      .rc .rc-poslji{padding:.7rem 1.1rem;border:1px solid var(--ink);border-radius:999px;background:transparent;color:var(--ink);font:700 .74rem var(--font-sans),sans-serif;cursor:pointer;white-space:nowrap}
      .rc .rc-poslji:hover{background:var(--ink);color:var(--paper)}
      .rc .rc-post-gumbi{display:flex;align-items:center;gap:.6rem;flex-wrap:wrap}
      .rc .rc-dodaj{padding:.45rem .9rem;border:1px dashed color-mix(in oklch,var(--ink) 35%,transparent);border-radius:999px;background:transparent;color:var(--ink);font:700 .6rem var(--font-sans),sans-serif;cursor:pointer;transition:border-color .15s ease,background .15s ease}
      .rc .rc-dodaj:hover{border-color:var(--ink);background:oklch(100% 0 0/.5)}
      .rc .rc-knjiznica-gumb{min-height:2.35rem;padding:.45rem .9rem;border:1px solid color-mix(in oklch,var(--ink) 22%,transparent);border-radius:999px;background:oklch(100% 0 0/.62);color:var(--ink);font:700 .68rem var(--font-sans),sans-serif;cursor:pointer}
      .rc .rc-knjiznica-gumb:hover{border-color:var(--ink);background:#fff}
      .rc .rc-ponastavi{padding:.45rem .9rem;border:none;border-radius:999px;background:transparent;color:var(--muted);font:700 .6rem var(--font-sans),sans-serif;letter-spacing:.02em;cursor:pointer;text-decoration:underline;text-underline-offset:.22em}
      .rc .rc-ponastavi:hover{color:var(--ink)}
      .rc .rc-shrani-postavko{display:block;margin:.35rem 0 0 auto;padding:.35rem .2rem;border:0;background:none;color:var(--muted);font:650 .68rem var(--font-sans),sans-serif;text-decoration:underline;text-underline-offset:.22em;cursor:pointer}
      .rc .rc-shrani-postavko:hover:not(:disabled){color:var(--ink)}
      .rc .rc-shrani-postavko:disabled{opacity:.38;cursor:default}
      .rc .rc-shrani-editor{display:grid;grid-template-columns:minmax(12rem,1fr) minmax(8rem,.35fr) auto auto;gap:.55rem;align-items:end;margin:.5rem 0 1rem;padding:.75rem;border:1px solid color-mix(in oklch,var(--ink) 12%,transparent);border-radius:.8rem;background:oklch(100% 0 0/.72)}
      .rc .rc-shrani-editor input,.rc .rc-shrani-editor select{width:100%;min-height:2.75rem;font-size:16px}

      /* podpis na racunu (neobvezno) — kot pg-podpis-* v ContractWorkspace, tu inline (brez sheeta) */
      .rc .rc-podpis{min-width:0;margin-top:1.1rem;padding:1rem;border:1px solid oklch(93% .006 82 / .55);border-radius:.9rem;background:oklch(100% 0 0/.55)}
      .rc .rc-noga-stikalo{display:inline-flex;align-items:center;gap:.4rem;font-size:.72rem;font-weight:600;letter-spacing:.02em;text-transform:none;color:rgba(17,17,17,.7);cursor:pointer}
      .rc .rc-noga-stikalo input{width:1rem;height:1rem;accent-color:oklch(66% .2 297);cursor:pointer}
      .rc .rc-noga-polje textarea{width:100%;box-sizing:border-box;border:1px solid oklch(90% .006 82);border-radius:.6rem;padding:.6rem .7rem;font:500 .85rem var(--font-sans),system-ui,sans-serif;color:var(--ink);background:#fff;resize:vertical;text-transform:none;letter-spacing:normal}
      .rc .rc-noga-polje textarea:focus{outline:none;border-color:oklch(66% .2 297)}
      .rc .rc-podpis-polja{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.9rem;margin:.9rem 0 0}
      .rc .rc-podpis-platno{display:block;width:100%;height:150px;margin-top:.9rem;border:1px dashed rgba(17,17,17,.3);border-radius:12px;background:#fff;touch-action:none;cursor:crosshair}
      .rc .rc-podpis-akcije{display:flex;flex-wrap:wrap;align-items:center;gap:.6rem;margin-top:.7rem}
      .rc .rc-podpis-ali{font-size:.7rem;color:var(--muted);text-transform:uppercase;letter-spacing:.1em;font-weight:700}
      .rc .rc-podpis-prikaz{margin-top:.9rem;padding:.8rem 1rem;border:1px solid oklch(93% .006 82 / .55);border-radius:12px;background:#fff}
      .rc .rc-podpis-prikaz img{display:block;max-height:60px;max-width:220px}
      .rc .rc-cip{padding:.42rem .8rem;border:1px solid rgba(17,17,17,.2);border-radius:999px;background:rgba(255,255,255,.5);cursor:pointer;font:inherit;font-size:.8rem;color:var(--ink);transition:border-color .15s,background .15s}
      .rc .rc-cip:hover:not(:disabled){border-color:var(--ink)}
      .rc .rc-cip:disabled{opacity:.45;cursor:default}
      @media (max-width:640px){.rc .rc-podpis-polja{grid-template-columns:minmax(0,1fr)}}
      .rc .rc-vrstica{display:grid;grid-template-columns:minmax(0,2fr) minmax(3.6rem,.55fr) minmax(5.4rem,1.1fr) minmax(4rem,.55fr) minmax(5rem,.75fr) minmax(4.8rem,.85fr) 1.8rem;gap:.45rem;align-items:end;margin-top:.7rem}
      .rc .rc-vrstica.rc-brez-ddv{grid-template-columns:minmax(0,2.3fr) minmax(3.6rem,.55fr) minmax(5.4rem,1.1fr) minmax(4rem,.55fr) minmax(4.8rem,.9fr) 1.8rem}
      .rc .rc-vrstica input,.rc .rc-vrstica select{width:100%}
      .rc .rc-kolicina input,.rc .rc-cena input,.rc .rc-popust input,.rc .rc-davek input{text-align:right;padding-left:.4rem;padding-right:.45rem}
      .rc .rc-vrstica label{font-size:14px;white-space:nowrap;min-width:0}
      .rc .rc-vrstica input,.rc .rc-vrstica select{font-size:14px}
      .rc .rc-znesek{display:grid;gap:.35rem;min-width:0;justify-items:end}
      .rc .rc-znesek em{font:800 14px var(--font-sans),sans-serif;font-style:normal;text-align:right}
      .rc .rc-znesek b{display:flex;align-items:center;justify-content:flex-end;min-height:2.75rem;padding:0 .2rem;font:750 .88rem var(--font-sans),sans-serif;white-space:nowrap;overflow-wrap:anywhere}
      .rc .rc-vrstica select{padding-left:.55rem;padding-right:1.2rem;background-position:right .4rem center !important;background-size:.8rem}
      .rc .rc-x{width:2rem;height:2.75rem;border:0;border-radius:.65rem;background:transparent;color:color-mix(in oklch,var(--ink) 72%,transparent);font-size:1.1rem;line-height:1;cursor:pointer}
      .rc .rc-x:hover:not(:disabled){color:var(--ink);background:oklch(100% 0 0/.6)}
      .rc .rc-x:disabled{opacity:.3;cursor:default}
      @media (max-width:760px){.rc .rc-shrani-editor{grid-template-columns:repeat(2,minmax(0,1fr))}.rc .rc-shrani-editor .rc-cip{min-height:2.75rem}}
      .rc .rc-vsote{margin-left:auto;width:min(21rem,100%);display:grid;gap:.15rem;padding:.85rem 1rem;border:1px solid oklch(93% .006 82 / .55);border-radius:.9rem;background:oklch(100% 0 0/.65)}
      .rc .rc-vsote>div{display:flex;align-items:baseline;justify-content:space-between;gap:.8rem;font-size:.62rem}
      .rc .rc-vsote>div span{font-weight:700;color:var(--muted)}
      .rc .rc-vsote>div b{font-size:.68rem;white-space:nowrap}
      .rc .rc-skupaj{margin-top:.3rem;padding-top:.45rem;border-top:1.5px solid color-mix(in oklch,var(--ink) 30%,transparent)}
      .rc .rc-vsote .rc-skupaj span{color:var(--ink);text-transform:uppercase;letter-spacing:.08em;font-size:.68rem;font-weight:800}
      .rc .rc-vsote .rc-skupaj b{font:750 1.42rem var(--font-sans),system-ui,sans-serif;letter-spacing:-.01em}
      .rc .rc-klavzula{margin:.4rem 0 0;font-size:.56rem;line-height:1.5;color:var(--muted);font-weight:500}
      .rc .rc-napaka{margin:.5rem 0 0;color:oklch(50% .18 25);font-size:.62rem;font-weight:700;text-align:center}
      /* ── ZAKLJUCEK racuna (enaki elementi kot ponudba/pogodba) ── */
      .rc .rc-zakljuci-gumb{display:flex;align-items:center;gap:.55rem;width:max-content;margin-left:auto;padding:.85rem 1.9rem;border:1px solid var(--ink);border-radius:999px;background:var(--ink);color:var(--paper);font:600 .82rem var(--font-sans),sans-serif;letter-spacing:.14em;text-transform:uppercase;cursor:pointer;transition:transform .2s ease}
      .rc .rc-zakljuci-gumb:hover{transform:translateY(-2px)}
      .rc .rc-zakljucek{padding-bottom:10rem}
      .rc .rc-zakljucek .rc-kicker-z,.rc .rc-zakljucek .rc-naslov-z,.rc .rc-zakljucek .rc-uvod-z{text-align:center}
      .rc .rc-kicker-z{font-size:.78rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--accent);margin:0 0 .3rem}
      .rc .rc-naslov-z{margin:.15rem 0 .5rem;font-family:var(--font-serif),Didot,serif;font-weight:400;font-size:clamp(1.7rem,3.4vw,2.4rem);line-height:1;letter-spacing:-.012em;color:var(--ink)}
      .rc .rc-uvod-z{margin:0 auto 1.4rem;max-width:34rem;font-size:1rem;line-height:1.55;color:rgba(17,17,17,.72)}
      .rc .rc-placan-z{display:flex;align-items:center;justify-content:center;gap:.5rem;margin:0 0 1.2rem;font-size:.82rem;color:var(--ink);cursor:pointer}
      .rc .rc-zakljucek-lik{display:flex;justify-content:center;margin:.5rem 0 1.1rem}
      .rc .rc-zakljucek-lik .pon-lik{width:8.4rem;height:auto;display:block;overflow:visible}
      .rc .rc-zakljucek-lik .pon-telo{transform-box:view-box;transform-origin:60px 128px;animation:rcPonFloat 3.4s ease-in-out infinite}
      .rc .rc-zakljucek-lik .pon-senca{transform-box:view-box;transform-origin:60px 133px;animation:rcPonSenca 3.4s ease-in-out infinite}
      .rc .rc-zakljucek-lik .pon-kljuk-znak{transform-box:fill-box;transform-origin:center;animation:rcKljukPop .5s cubic-bezier(.2,1.5,.4,1) .45s both}
      .rc .rc-zakljucek-lik .pon-kljuk{stroke-dasharray:26;stroke-dashoffset:26;animation:rcKljukRis .38s ease-out .8s forwards}
      @keyframes rcPonFloat{0%,100%{transform:translateY(0) rotate(-1.6deg)}50%{transform:translateY(-8px) rotate(1.6deg)}}
      @keyframes rcPonSenca{0%,100%{transform:scale(1);opacity:.9}50%{transform:scale(.82);opacity:.6}}
      @keyframes rcKljukPop{0%{transform:scale(0)}62%{transform:scale(1.18)}100%{transform:scale(1)}}
      @keyframes rcKljukRis{to{stroke-dashoffset:0}}
      @media (prefers-reduced-motion:reduce){.rc .rc-zakljucek-lik .pon-telo,.rc .rc-zakljucek-lik .pon-senca,.rc .rc-zakljucek-lik .pon-kljuk-znak,.rc .rc-zakljucek-lik .pon-kljuk{animation:none}.rc .rc-zakljucek-lik .pon-kljuk{stroke-dashoffset:0}}
      .rc .rc-prenosi{display:flex;flex-wrap:wrap;justify-content:center;gap:.9rem 1.6rem;margin:1.4rem auto 0}
      .rc .rc-povezava-z{display:inline-flex;align-items:center;gap:.4rem;font-family:inherit;font-size:.88rem;font-weight:500;cursor:pointer;border:none;background:none;color:var(--ink);text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:.28em;padding:0}
      .rc .rc-povezava-z:hover{opacity:.6}
      .rc .rc-povezava-z:disabled{opacity:.45;cursor:default}
      .rc-noga{position:fixed;bottom:0;left:17.5rem;right:0;display:flex;justify-content:center;padding:1rem clamp(1.2rem,4vw,3rem) 1.1rem;background:linear-gradient(to top,var(--paper) 70%,transparent);z-index:40}
      :global(body[data-meni='zaprt']) .rc-noga{left:4.4rem}
      @media (max-width:980px){.rc-noga{left:0}}
      .rc-noga-gumbi{display:flex;align-items:center;justify-content:center;gap:.8rem;flex-wrap:wrap}
      .rc-noga-pill{font-family:inherit;font-size:.82rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;color:rgba(17,17,17,.78);border:1px solid var(--ink);border-radius:999px;padding:.75rem 1.4rem;background:none;transition:background .18s ease,color .18s ease,transform .2s cubic-bezier(.23,1,.32,1)}
      .rc-noga-pill:hover{background:var(--ink);color:var(--paper);transform:translateY(-2px)}
      .rc-noga-pill.nova{color:var(--accent);border-color:var(--accent)}
      .rc-noga-pill.nova:hover{background:var(--accent);color:var(--paper)}
      /* ── view-swap (kot pogodbe): obrazec je svoja stran, sredinski stolpec ── */
      .rc .rc-sek{min-width:0}
      .rc .rc-sek.rc-stran{animation:rcStran .5s cubic-bezier(.16,1,.3,1) both}
      /* KONEC animacije mora biti transform:NONE (ne translateY(0)) — kot pogodbe */
      @keyframes rcStran{from{opacity:0;transform:translateY(60px)}to{opacity:1;transform:none}}
      @media (prefers-reduced-motion:reduce){.rc .rc-sek.rc-stran{animation:none}}
      .rc .rc-stolpec{width:100%;max-width:700px;margin-left:auto;margin-right:auto}
      /* enotno vedenje kot Ponudba (KalkulatorApp .uvod-oder): prvo vprasanje/vstopni
         panel navpicno na sredini vidnega polja, nato ob rasti vsebine (izbira vira ipd.)
         naravno odteka navzgor in stran se skrola. 8.25rem = FlowTopBar (3.25rem) +
         .workspace padding zgoraj/spodaj (3rem+2rem). */
      .rc .rc-stolpec.rc-vstop{min-height:calc(100dvh - 8.25rem);display:flex;flex-direction:column;justify-content:center}
      @media (max-width:980px){.rc .rc-stolpec.rc-vstop{min-height:calc(100dvh - 13rem)}}
      /* naslov v ozkem stolpcu (kot retainer rw-kicker/rw-h1) */
      .rc .rc-kicker{font-size:.78rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--accent,#B25476);margin:0 0 .3rem}
      .rc .rc-h1{font-family:var(--font-serif),Didot,serif;font-weight:500;font-size:clamp(1.7rem,3.4vw,2.4rem);line-height:1;letter-spacing:-.012em;margin:0 0 1.4rem;color:var(--ink)}
      /* na svoji strani je obrazec en stolpec (modul ima 2 koloni za inline vgradnjo) */
      .rc .rc-obrazec{grid-template-columns:minmax(0,1fr)}
      /* vec zracnosti okoli naslova obrazca */
      .rc .rc-obr-uvod{margin:1rem 0 2rem}
      .rc .rc-obr-uvod h2{margin:.15rem 0 .6rem}
      .rc .rc-obr-uvod > p:last-child{margin:0;line-height:1.55}
      .rc .rc-nazaj-vrh{margin:0 0 .9rem;justify-self:start;display:inline-flex;align-items:center;gap:.35rem;padding:.5rem .95rem;border:1px solid var(--line);border-radius:999px;background:rgba(255,255,255,.55);-webkit-backdrop-filter:blur(12px) saturate(1.3);backdrop-filter:blur(12px) saturate(1.3);color:var(--ink);font:700 .62rem var(--font-sans),sans-serif;letter-spacing:.04em;text-transform:uppercase;text-decoration:none;cursor:pointer;transition:background .15s,border-color .15s}
      .rc .rc-nazaj-vrh:hover{background:#fff;border-color:var(--ink)}
      .rc .rc-povezava{font-family:inherit;font-size:.88rem;font-weight:500;cursor:pointer;border:none;background:none;color:var(--ink);text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:.28em;padding:0;display:inline-flex;align-items:center;gap:.38rem}
      .rc .rc-povezava:hover{opacity:.6}
      .rc .rc-mini{font-size:.8rem;color:rgba(17,17,17,.72)}

      /* ── vstop (pogled 'pregled'): SAMO vstop za nov racun — pregled/arhiv
         obstojecih racunov je preseljen v Arhiv. Brez bele kartice (kot retainer
         rw-vsebina) — vsebina sedi neposredno na papirnatem ozadju. ── */
      .rc .rc-naslov{margin:.35rem 0 1.1rem;font:500 clamp(1.7rem,2.6vw,2.4rem)/1.05 var(--font-serif),Georgia,serif;color:var(--ink);overflow-wrap:anywhere}
      .rc .rc-uvod{margin:0 0 1.4rem;font-size:.92rem;line-height:1.55;color:rgba(17,17,17,.72);max-width:34rem}

      /* chat mehurcek vstopnega vprasanja — isti videz kot RetainerWorkspace .rw-chat/.rw-mehur */
      .rc .rc-chat{display:flex;align-items:flex-start;gap:.55rem;max-width:90%;margin:0 0 1.2rem}
      .rc .rc-mehur{position:relative;background:oklch(96% .012 297);border:none;border-radius:18px;border-top-left-radius:5px;padding:.85rem 1.25rem .85rem 2.75rem;box-shadow:0 2px 12px rgba(40,25,40,.06)}
      .rc .rc-mehur::before{content:"";position:absolute;left:.9rem;top:.95rem;width:1.3rem;height:1.3rem;border-radius:50%;background:radial-gradient(58% 48% at 30% 24%,rgba(255,255,255,.92),rgba(255,255,255,0) 62%),conic-gradient(from 210deg,#7C3AED,#EC4899,#F59E0B,#38BDF8,#7C3AED);box-shadow:0 2px 6px rgba(124,58,237,.28)}
      .rc .rc-mehur b{display:block;color:var(--ink);font-weight:600;font-size:1.02rem}
      .rc .rc-mehur small{display:block;margin-top:.1rem;color:rgba(17,17,17,.72);font-size:.82rem}
      /* vstopna forma (pilule+polja+gumb) v beli kartici — naslov+chat ostaneta na papirju nad njo */
      .rc .rc-vstop-panel{background:rgba(255,255,255,.55);backdrop-filter:blur(18px) saturate(1.35);-webkit-backdrop-filter:blur(18px) saturate(1.35);border:1px solid rgba(255,255,255,.6);border-radius:20px;padding:1.6rem 1.5rem;box-shadow:0 12px 40px rgba(20,16,26,.05),inset 0 1px 0 rgba(255,255,255,.5)}
      .rc .rc-polja{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1.1rem 1.5rem;margin:0 0 1.3rem;min-width:0}
      .rc .rc-polja>*{min-width:0}
      .rc .rc-polje{display:flex;flex-direction:column;gap:.35rem;font-size:.7rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(17,17,17,.72)}
      .rc .rc-polje input{width:100%;max-width:100%;min-width:0;font:inherit;font-size:.95rem;font-weight:600;letter-spacing:0;text-transform:none;color:var(--ink);background:rgba(255,255,255,.85);border:1px solid oklch(93% .006 82 / .55);border-radius:10px;padding:.6rem .75rem}
      .rc .rc-polje input:focus{outline:none;border-color:var(--ink)}
      /* select: background-COLOR (NE shorthand background), da .shell select
         (chevron background-image) ostane veljaven — past iz feedback_css_splosna_pravila */
      .rc .rc-polje select{width:100%;max-width:100%;min-width:0;font:inherit;font-size:.95rem;font-weight:600;letter-spacing:0;text-transform:none;color:var(--ink);background-color:rgba(255,255,255,.85);border:1px solid oklch(93% .006 82 / .55);border-radius:10px;padding:.6rem .75rem}
      .rc .rc-polje select:focus{outline:none;border-color:var(--ink)}
      .rc .rc-gumbi{display:flex;flex-wrap:wrap;gap:.8rem;margin-top:.2rem}

      /* pilule (vir racuna na vstopu — ista oblika kot ContractWorkspace pg-segpills) */
      .rc .rc-segpills{display:inline-flex;background:rgba(255,255,255,.55);border:1px solid rgba(17,17,17,.1);border-radius:999px;padding:.25rem;gap:.15rem;margin:0 0 1.1rem}
      .rc .rc-segpills button{border:none;background:transparent;color:var(--ink);font-family:inherit;font-weight:700;font-size:.72rem;letter-spacing:.03em;text-transform:uppercase;padding:.46rem .9rem;border-radius:999px;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:.35rem;transition:background .18s,color .18s}
      .rc .rc-segpills button.on{background:var(--ink);color:var(--paper)}
      /* Vrsta (Račun | Predračun) na vstopu — pilule + drobni namig pod Predračunom */
      .rc .rc-vstop-vrsta{display:inline-flex;flex-direction:column;align-items:stretch;margin:0 0 1.1rem}
      .rc .rc-vstop-vrsta .rc-segpills{margin:0}
      .rc .rc-vrsta-oznaka{font-size:.7rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(17,17,17,.72);margin:0 0 .4rem}
      .rc .rc-vrsta-namig{margin:.35rem 0 0;text-align:right;font-size:.72rem;color:var(--muted)}

      /* ── vstopni iskalen combobox (izbira ponudbe): sprozilec izgleda kot polje,
         panel z iskalnikom + seznam opcij se odpre pod njim ── */
      .rc .rc-combo{position:relative}
      .rc .rc-combo-sprozilec{display:flex;align-items:center;justify-content:space-between;gap:.6rem;width:100%;min-width:0;font:inherit;font-size:.95rem;font-weight:600;letter-spacing:0;text-transform:none;color:var(--ink);background:rgba(255,255,255,.85);border:1px solid oklch(93% .006 82 / .55);border-radius:10px;padding:.6rem .75rem;text-align:left;cursor:pointer}
      .rc .rc-combo-sprozilec:focus{outline:none;border-color:var(--ink)}
      .rc .rc-combo-sprozilec>span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .rc .rc-combo-sprozilec svg{flex:none}
      .rc .rc-combo-panel{position:absolute;top:calc(100% + .35rem);left:0;right:0;z-index:40;background:#fff;border:1px solid oklch(93% .006 82 / .55);border-radius:14px;box-shadow:0 16px 44px rgba(20,16,26,.16);padding:.55rem;text-transform:none;letter-spacing:0}
      .rc .rc-combo-iskalnik{width:100%;box-sizing:border-box;font:inherit;font-size:16px;font-weight:500;color:var(--ink);background:rgba(255,255,255,.9);border:1px solid oklch(93% .006 82 / .55);border-radius:999px;padding:.5rem .9rem;margin:0 0 .35rem}
      .rc .rc-combo-iskalnik:focus{outline:none;border-color:var(--ink)}
      .rc .rc-combo-seznam{display:flex;flex-direction:column;max-height:15rem;overflow-y:auto}
      .rc .rc-combo-opcija{display:flex;align-items:center;gap:.7rem;width:100%;min-height:2.7rem;padding:.5rem .5rem;border:none;border-bottom:1px solid rgba(17,17,17,.07);background:none;font:inherit;color:var(--ink);text-align:left;cursor:pointer;border-radius:8px}
      .rc .rc-combo-opcija:last-child{border-bottom:none}
      .rc .rc-combo-opcija:hover{background:rgba(17,17,17,.04)}
      .rc .rc-combo-naziv{flex:1;min-width:0}
      .rc .rc-combo-naziv strong{display:block;font-size:.9rem;font-weight:600;overflow-wrap:anywhere}
      .rc .rc-combo-opcija.on .rc-combo-naziv strong{font-weight:800}
      .rc .rc-combo-naziv small{display:block;margin-top:.1rem;font-size:.74rem;color:rgba(17,17,17,.72)}
      .rc .rc-combo-kljukica{flex:none;display:grid;place-items:center;width:1.5rem;height:1.5rem;border-radius:50%;background:var(--ink);color:var(--paper);font-size:.8rem}
      .rc .rc-combo-prazno{padding:.8rem .5rem}
      .rc .rc-combo-namig{margin:.5rem .3rem .1rem;font-size:.72rem;color:var(--muted)}

      /* enako za selecte v obrazcu (Ponudba, DDV) — modulov background: jim vzame puscico */
      .rc .rc-obrazec select{background-color:oklch(100% 0 0/.8);background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'%3E%3Cpath d='m5 7.5 5 5 5-5' fill='none' stroke='%231c1815' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 1rem center !important;appearance:none}

      /* gumb (Pripravi racun / prenesi PDF / poslji v placilo — skupni videz kot pg-gumb) */
      .rc .rc-gumb{position:relative;overflow:hidden;display:inline-flex;align-items:center;gap:.5rem;border:none;border-radius:999px;padding:.85rem 1.6rem;font:inherit;font-weight:600;font-size:.95rem;cursor:pointer;background:var(--ink);color:var(--paper);transition:transform .2s,opacity .2s}
      .rc .rc-gumb:hover{transform:translateY(-2px)}
      .rc .rc-gumb.sek{background:transparent;color:var(--ink);border:1px solid rgba(17,17,17,.28)}
      .rc .rc-gumb:disabled{opacity:.5;cursor:default;transform:none}

      /* ── number inputi: brez native spinnerjev, desna poravnava, numericna tipkovnica prek inputMode ── */
      .rc .rc-obrazec input[type='number']{-moz-appearance:textfield;appearance:textfield;text-align:right}
      .rc .rc-obrazec input[type='number']::-webkit-inner-spin-button,.rc .rc-obrazec input[type='number']::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}

      /* ── mobilna izbira ponudbe: gumb-polje (izgleda kot input) + slide-up sheet ── */
      .rc .rc-pon-polje{display:flex;align-items:center;justify-content:space-between;gap:.6rem;width:100%;min-width:0;min-height:2.75rem;padding:.6rem .85rem;border:1px solid oklch(93% .006 82 / .55);border-radius:.65rem;background:oklch(100% 0 0/.8);font:500 16px var(--font-sans),sans-serif;color:var(--ink);text-align:left;cursor:pointer}
      .rc .rc-pon-polje>span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .rc .rc-pon-polje svg{flex:none}
      /* sheet zivi v portalu na <body> (izven .rc) — selektorji brez .rc predpone */
      .rc-sheet-back{position:fixed;inset:0;background:rgba(30,18,35,.34);z-index:95}
      .rc-pon-sheet{position:fixed;left:50%;bottom:0;transform:translate(-50%,102%);width:min(480px,100vw);z-index:96;background:var(--paper);border-radius:20px 20px 0 0;box-shadow:0 -16px 44px rgba(40,25,40,.22);transition:transform .32s cubic-bezier(.2,.8,.3,1);max-height:76dvh;overflow-y:auto;padding:0 1.2rem calc(1.4rem + env(safe-area-inset-bottom,0px))}
      .rc-pon-sheet.odprt{transform:translate(-50%,0)}
      @media (prefers-reduced-motion:reduce){.rc-pon-sheet{transition:none}}
      .rc-sheet-glava{position:relative;display:flex;align-items:center;justify-content:space-between;width:100%;padding:1.35rem 0 .65rem;border-bottom:1px solid rgba(17,17,17,.1)}
      .rc-sheet-glava::before{content:'';position:absolute;top:.5rem;left:50%;transform:translateX(-50%);width:2.4rem;height:.3rem;border-radius:999px;background:rgba(17,17,17,.18)}
      .rc-sheet-glava b{font-size:1.05rem;font-weight:700}
      .rc-sheet-x{width:2.1rem;height:2.1rem;display:inline-flex;align-items:center;justify-content:center;border:none;background:rgba(17,17,17,.06);border-radius:50%;font-size:1.1rem;line-height:1;color:var(--ink);cursor:pointer}
      .rc-pon-iskalnik{margin:.8rem 0 .2rem;width:100%;min-height:2.75rem;box-sizing:border-box;font:inherit;font-size:16px;font-weight:500;color:var(--ink);background:rgba(255,255,255,.85);border:1px solid oklch(93% .006 82 / .55);border-radius:999px;padding:.55rem 1rem}
      .rc-pon-iskalnik:focus{outline:none;border-color:var(--ink)}
      .rc-pon-seznam{display:flex;flex-direction:column;padding:.4rem 0 .2rem}
      .rc-pon-vrstica{display:flex;align-items:center;gap:.7rem;width:100%;min-height:2.9rem;padding:.55rem .3rem;border:none;border-bottom:1px solid rgba(17,17,17,.08);background:none;font:inherit;color:var(--ink);text-align:left;cursor:pointer}
      .rc-pon-vrstica:last-child{border-bottom:none}
      .rc-pon-naziv{flex:1;min-width:0}
      .rc-pon-naziv strong{display:block;font-size:.9rem;font-weight:600;overflow-wrap:anywhere}
      .rc-pon-vrstica.on .rc-pon-naziv strong{font-weight:800}
      .rc-pon-naziv small{display:block;margin-top:.1rem;font-size:.74rem;color:rgba(17,17,17,.72)}
      .rc-pon-kljukica{flex:none;display:grid;place-items:center;width:1.6rem;height:1.6rem;border-radius:50%;background:var(--ink);color:var(--paper);font-size:.85rem}
      .rc-pon-prazno{padding:.9rem .3rem}

      /* Knjižnica je portal na body, zato nima .rc prednika. */
      .rc-knjiznica-back{position:fixed;inset:0;z-index:110;display:grid;place-items:center;padding:1rem;background:rgba(30,18,35,.28);backdrop-filter:blur(8px)}
      .rc-knjiznica{width:min(42rem,100%);max-height:min(44rem,calc(100dvh - 2rem));overflow:hidden;display:flex;flex-direction:column;padding:1.2rem;border:1px solid rgba(17,17,17,.12);border-radius:1.25rem;background:oklch(98.5% .012 84);box-shadow:0 24px 70px rgba(24,16,28,.2);color:var(--ink,#17120f)}
      .rc-knjiznica-glava{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem}
      .rc-knjiznica-kicker{margin:0 0 .25rem;font:750 .68rem var(--font-sans),sans-serif;letter-spacing:.15em}
      .rc-knjiznica h2{margin:0;font:400 clamp(1.6rem,4vw,2.3rem)/1 var(--font-serif),Didot,serif}
      .rc-knjiznica-x{flex:none;width:2.75rem;height:2.75rem;border:1px solid rgba(17,17,17,.16);border-radius:50%;background:transparent;font-size:1.35rem;cursor:pointer}
      .rc-knjiznica-iskanje{width:100%;min-height:2.9rem;margin:.9rem 0 .55rem;padding:.65rem 1rem;border:1px solid rgba(17,17,17,.16);border-radius:999px;background:#fff;font:500 16px var(--font-sans),sans-serif;color:inherit}
      .rc-knjiznica-iskanje:focus{outline:2px solid color-mix(in oklch,#8b5cf6 70%,transparent);outline-offset:2px}
      .rc-knjiznica-seznam{overflow-y:auto;display:grid;gap:.45rem;padding:.1rem}
      .rc-knjiznica-item{display:grid;grid-template-columns:minmax(0,1fr) 2.75rem;align-items:stretch;border:1px solid rgba(17,17,17,.11);border-radius:.9rem;background:rgba(255,255,255,.72);overflow:hidden}
      .rc-knjiznica-izberi{display:flex;align-items:center;justify-content:space-between;gap:1rem;min-height:4.4rem;padding:.75rem .9rem;border:0;background:transparent;color:inherit;text-align:left;cursor:pointer}
      .rc-knjiznica-izberi:hover{background:rgba(139,92,246,.06)}
      .rc-knjiznica-izberi span{min-width:0}.rc-knjiznica-izberi strong,.rc-knjiznica-izberi small{display:block}.rc-knjiznica-izberi strong{font-size:.95rem}.rc-knjiznica-izberi small{margin-top:.2rem;color:rgba(17,17,17,.72);overflow-wrap:anywhere}.rc-knjiznica-izberi>b{flex:none;font-size:.82rem;white-space:nowrap}
      .rc-knjiznica-brisi{border:0;border-left:1px solid rgba(17,17,17,.08);background:transparent;font-size:1.15rem;cursor:pointer}.rc-knjiznica-brisi:hover:not(:disabled){background:rgba(190,40,40,.08);color:#a31717}.rc-knjiznica-brisi:disabled{opacity:.3}
      .rc-knjiznica-prazno{margin:0;padding:1.4rem .6rem;color:rgba(17,17,17,.72);line-height:1.5;text-align:center}
      @media (max-width:640px){.rc-knjiznica-back{align-items:end;padding:0}.rc-knjiznica{max-height:82dvh;border-radius:1.25rem 1.25rem 0 0;padding:1rem}.rc-knjiznica-izberi{align-items:flex-start;flex-direction:column;gap:.35rem}.rc-knjiznica-izberi>b{white-space:normal}}

      /* Mobilno: postavka postane kartica; naziv je zgoraj, meta levo, znesek/status desno. */
      @media (max-width: 760px){
        .rc .rc-vrstica,.rc .rc-vrstica.rc-brez-ddv{grid-template-columns:repeat(2,minmax(0,1fr));align-items:end}
        .rc .rc-opis{grid-column:1/-1}
        .rc .rc-vrstica .rc-znesek b{justify-content:flex-start}
        .rc .rc-x{width:100%;height:2.4rem;border:1px dashed color-mix(in oklch,var(--ink) 30%,transparent);grid-column:1/-1}
        .rc .rc-vsote{width:100%}
      }
      @media (max-width:640px){
        .rc .rc-chat{max-width:100%}
        .rc .rc-vstop-panel{padding:1.2rem 1.1rem;border-radius:16px}
        .rc .rc-polja{grid-template-columns:minmax(0,1fr);gap:1rem}
        .rc .rc-vrstica,.rc .rc-vrstica.rc-brez-ddv{
          grid-template-columns:repeat(2,minmax(0,1fr));
          grid-template-areas:"naziv naziv" "kolicina cena" "popust davek" "namig namig" "znesek brisi";
          gap:.7rem;padding:.85rem;border:1px solid color-mix(in oklch,var(--ink) 12%,transparent);border-radius:.9rem;background:rgba(255,255,255,.72);overflow:hidden
        }
        .rc .rc-vrstica.rc-brez-ddv{grid-template-areas:"naziv naziv" "kolicina cena" "popust popust" "znesek brisi"}
        .rc .rc-opis{grid-area:naziv;grid-column:auto}
        .rc .rc-kolicina{grid-area:kolicina}
        .rc .rc-cena{grid-area:cena}
        .rc .rc-popust{grid-area:popust}
        .rc .rc-davek{grid-area:davek}
        .rc .rc-ddv-namig{grid-area:namig;justify-self:start}
        .rc .rc-znesek{grid-area:znesek;align-self:center}
        .rc .rc-x{grid-area:brisi;grid-column:auto;justify-self:end;width:2.75rem}
      }
    `}</style>
  </div>;
}

'use client';

/* RACUNI — obrazec + dokument po slovenski zakonodaji (ZDDV-1, 82. clen).
   Vzorci so KOPIRANI iz RetainerWorkspace (letterhead + DOC_CSS + /api/ponudba-pdf,
   branje nastavitev "Moje podjetje" iz K_NAST) in KalkulatorApp (RACUN_CSS tabela,
   mailto "posljem racun st. ..."). Stari racuni (brez postavk) se delujejo:
   nova polja v FlowInvoice so neobvezna, dokument zanje izpelje eno postavko. */

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CaretDown } from '@phosphor-icons/react';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';
import { loadFlowData, saveFlowCollection, type FlowClient, type FlowInvoice, type FlowInvoiceItem, type FlowInvoiceSignature } from '@/lib/pinartFlowStore';
import { podatkiZaPredogled, usePredogled } from '@/lib/predogled';
import { dokCss, dokFontLink, dokVars, DOK_BARVA_PRIVZETA, DOK_FONT_PRIVZETI, aktivnaPredloga, aktivniLogo } from '@/lib/dokVidez';

const K_NAST = 'pinart-kalkulator-v2';

type Ponudnik = { ime: string; davcna: string; email: string; telefon: string; naslov: string; trr: string };
type Offer = { id: string; title: string; client: string; number?: string; scope: string[]; agreedAmount: number };
/* vrstica obrazca — vnosi so nizi (tudi decimalke z vejico), parsamo ob izracunu */
type Vrstica = { opis: string; kolicina: string; cena: string; popust: string; ddv: string };

const DDV_STOPNJE = ['22', '9.5', '0'];
const PRIVZETI_ROK_DNI = 15;

const money = (value: number) => `${value.toLocaleString('sl-SI', { maximumFractionDigits: 2 })} €`;
const eur2 = (value: number) => `${value.toLocaleString('sl-SI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
const stev = (s: string) => { const n = Number(String(s).replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const datStr = (d: Date) => `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`;
const danesISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
/* znesek vrstice: kolicina x cena (brez DDV) minus popust % */
const vrsticaZnesek = (i: FlowInvoiceItem) => i.kolicina * i.cena * (1 - clamp(i.popust || 0, 0, 100) / 100);

export default function InvoiceWorkspace({ base }: { base: string }) {
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

  /* pogled = katera "stran" je prikazana — view-swap kot ContractWorkspace:
     pregled (VSTOP za nov racun) ali obrazec (obrazec za nov racun, svoja
     stran). Pregled/arhiv obstojecih racunov je preseljen v Arhiv
     (ArhivWorkspace) — to orodje SAMO ustvarja nove racune. */
  const [pogled, setPogled] = useState<'pregled' | 'obrazec'>('pregled');
  /* vir racuna na vstopu — kot ContractWorkspace (Iz ponudbe / Brez ponudbe) */
  const [vir, setVir] = useState<'ponudba' | 'rocno'>('ponudba');
  const [offerId, setOfferId] = useState('');
  /* mobilni sheet za izbiro ponudbe (native select ne skalira s 50+ ponudbami) */
  const [ponSheet, setPonSheet] = useState(false);
  const [ponIskanje, setPonIskanje] = useState('');

  /* obrazec (kontrolirano — predizpolnjevanje iz ponudbe) */
  const [stevilka, setStevilka] = useState('');
  const [stranka, setStranka] = useState('');
  const [datumIzdaje, setDatumIzdaje] = useState(danesISO());
  const [datumStoritve, setDatumStoritve] = useState(danesISO());
  const [rokDni, setRokDni] = useState(String(PRIVZETI_ROK_DNI));
  const [placano, setPlacano] = useState(false);
  const [vrstice, setVrstice] = useState<Vrstica[]>([]);
  const [pdfId, setPdfId] = useState('');
  const [napaka, setNapaka] = useState('');

  /* ── podpis na racunu — isti vzorec kot ContractWorkspace (canvas risanje ali
     nalozena slika, shranjena kot data URL); ime/kraj/datum so neobvezni. ── */
  const [podpisIme, setPodpisIme] = useState('');
  const [podpisKraj, setPodpisKraj] = useState('');
  const [podpisDatum, setPodpisDatum] = useState(danesISO());
  const [podpisSlika, setPodpisSlika] = useState('');
  const [narisanPodpis, setNarisanPodpis] = useState(false);
  const podpisPlatnoRef = useRef<HTMLCanvasElement | null>(null);
  const podpisDatotekaRef = useRef<HTMLInputElement | null>(null);
  const risanjeRef = useRef(false);

  useEffect(() => {
    const data = podatkiZaPredogled(nacin, loadFlowData());
    setOffers(data.offers.map(({ id, title, client, number, scope, agreedAmount }) => ({ id, title, client, number, scope, agreedAmount })));
    setInvoices(data.invoices);
    setClients(data.clients);
  }, [nacin]);

  /* podatki podjetja + DDV zavezanost + videz dokumentov — kot RetainerWorkspace */
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(K_NAST) || '{}');
      if (s.ponudnik) setPonudnik({ trr: '', ...s.ponudnik });
      if (s.predklic) setPredklic(s.predklic);
      if (s.ddvZavezanec) setDdvZavezanec(true);
      if (s.ddvStopnja) setDdvStopnja(Number(s.ddvStopnja) || 22);
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

  const nextNumber = () => { const year = new Date().getFullYear(); const count = invoices.filter(item => item.number?.startsWith(String(year))).length + 1; return `${year}-${String(count).padStart(4, '0')}`; };

  /* "Pripravi racun →": ce je vir rocno (samostojen racun), pocisti morebitno
     prejsnjo izbiro ponudbe/stranke; ce je iz ponudbe, sta stranka in prva
     postavka ze predizpolnjeni prek izberiPonudbo (klican ob izbiri na vstopu). */
  const odpriObrazec = () => {
    setStevilka(nextNumber());
    if (vir === 'rocno') { setOfferId(''); setStranka(''); setVrstice([novaVrstica()]); }
    setDatumStoritve(datumIzdaje || danesISO()); setRokDni(String(PRIVZETI_ROK_DNI));
    setPlacano(false); setNapaka('');
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

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (samoOgled) return;
    const items = izracun.postavke.filter(p => p.opis || p.cena);
    if (!items.length) { setNapaka('Dodaj vsaj eno postavko z opisom in ceno.'); return; }
    const invoice: FlowInvoice = {
      id: crypto.randomUUID(),
      number: stevilka.trim(),
      title: items[0].opis.slice(0, 90) || selectedOffer?.title,
      client: stranka.trim() || selectedOffer?.client || 'Brez stranke',
      amount: Math.round(izracun.zaPlacilo * 100) / 100,
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
      signature: podpisSlika ? {
        image: podpisSlika,
        name: podpisIme.trim() || undefined,
        place: podpisKraj.trim() || undefined,
        date: podpisDatum || undefined,
      } : undefined,
    };
    const next = [invoice, ...invoices];
    setInvoices(next); saveFlowCollection('invoices', next);
    /* po shranjevanju nazaj na pregled (kot pogodbe) — nov racun je takoj viden v arhivu */
    setPogled('pregled'); setOfferId('');
  };

  /* ── DOKUMENT (letterhead + DOC_CSS kot RetainerWorkspace, tabela kot racun v kalkulatorju) ── */
  /* Glava/noga AKTIVNE predloge (vec predlog) — ADITIVNO, glej lib/dokVidez.ts.
     Ce nista vpisani, se nic ne izrise in obstojeci videz ostane enak. */
  const glava = () => {
    const kontakt = [ponudnik.davcna.trim() && (ddvZavezanec ? 'ID za DDV: ' : 'Davčna št.: ') + ponudnik.davcna.trim(), ponudnik.trr.trim() && 'TRR: ' + ponudnik.trr.trim(), ponudnik.telefon.trim() && 'Tel.: ' + predklic + ' ' + ponudnik.telefon.trim(), ponudnik.email.trim()].filter(Boolean).join(' · ');
    const glavaBesedilo = aktivnaPredloga().glava?.trim();
    const glavaLine = glavaBesedilo ? '<br><span class="mut" style="color:var(--akcent,#B25476);font-weight:600">' + esc(glavaBesedilo) + '</span>' : '';
    /* desni znak = TVOJ shranjeni logo (enotni vir: predloga ali K_LOGO); prej trdo zakodiran »Pinart« -> logo se ni videl */
    const logo = aktivniLogo();
    const znak = logo ? `<img class="lg-logo" src="${logo}" alt="">` : `<div class="rt">${esc(ponudnik.ime.trim() || '')}</div>`;
    return `<div class="lg"><div><b>${esc(ponudnik.ime.trim() || '[Tvoje podjetje]')}</b>${glavaLine}${ponudnik.naslov.trim() ? '<br>' + esc(ponudnik.naslov.trim()) : ''}${kontakt ? '<br><span class="mut">' + esc(kontakt) + '</span>' : ''}</div>${znak}</div>`;
  };
  const dokNoga = () => {
    const n = aktivnaPredloga().noga?.trim();
    /* noga = fiksno 5 mm od SPODNJEGA roba strani (v spodnji rob @page margina) */
    return n ? `<div class="dok-noga" style="position:fixed;left:16mm;right:16mm;bottom:5mm;padding-top:8px;border-top:1px solid rgba(17,17,17,.12);font-size:8pt;color:#9a9088;line-height:1.5">${esc(n).split('\n').join('<br>')}</div>` : '';
  };
  const DOC_CSS = `@page{size:A4;margin:16mm 16mm 18mm}*{-webkit-print-color-adjust:exact;print-color-adjust:exact;box-sizing:border-box}body{margin:0;color:#1a1622;font-family:'Helvetica Neue',Arial,sans-serif;font-size:10.5pt;line-height:1.42}.lg{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;padding-bottom:12px;border-bottom:1.5px solid #B25476;margin-bottom:20px}.lg .rt{font-family:'Bodoni Moda',Didot,Georgia,serif;font-size:15pt;color:#111}.lg .lg-logo{max-height:46px;max-width:180px;object-fit:contain;display:block}.mut{color:#8a8177;font-size:9pt}
    .rac-head{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;margin:6px 0 22px}
    .rac-title{display:flex;flex-direction:column;gap:2px}
    .rac-kicker{font-size:9pt;letter-spacing:.28em;text-transform:uppercase;color:#B25476}
    .rac-no{font-family:'Bodoni Moda',Didot,Georgia,serif;font-size:26pt;font-weight:600;color:#111;line-height:1.05}
    .rac-meta{font-size:9pt;color:#444;text-align:right;line-height:1.5}
    .rac-meta b{display:block;font-size:7.5pt;letter-spacing:.12em;text-transform:uppercase;color:#B25476;margin-top:7px}
    .rac-stranki{margin:0 0 18px;font-size:10.5pt;color:#222;line-height:1.6}
    .rac-l{display:block;font-size:7.5pt;letter-spacing:.14em;text-transform:uppercase;color:#8a8177;margin-bottom:4px}
    .rac-tabela{width:100%;border-collapse:collapse;margin:8px 0 14px;font-size:10pt;color:#222}
    .rac-tabela th{text-align:left;font-size:7.5pt;letter-spacing:.1em;text-transform:uppercase;color:#8a8177;border-bottom:1.5px solid #B25476;padding:0 8px 7px;font-weight:700}
    .rac-tabela td{padding:9px 8px;border-bottom:1px solid #ece3d8;vertical-align:top}
    .rac-tabela th:not(:first-child),.rac-tabela td:not(:first-child){text-align:right;white-space:nowrap}
    .rac-vsote{margin-left:auto;width:300px;font-size:10.5pt;color:#222}
    .rac-vsote>div{display:flex;justify-content:space-between;gap:12px;padding:5px 8px}
    .rac-skupaj{border-top:1.5px solid #B25476;margin-top:4px;font-family:'Bodoni Moda',Didot,Georgia,serif;font-size:13pt;font-weight:600;color:#111}
    .rac-placilo{margin:20px 0 0;font-size:10pt;color:#222;background:#f8f5ee;border:1px solid #eadfce;border-radius:9px;padding:13px 16px;line-height:1.7}
    .rac-opomba{font-size:9pt;color:#666;margin:10px 0 0}
    .rac-noga-txt{font-size:8.2pt;color:#9a9088;margin-top:22px}
    .rac-placano{display:inline-block;margin:18px 0 0;border:3px solid #2e7d5b;color:#2e7d5b;font-weight:700;letter-spacing:.22em;padding:6px 18px;border-radius:8px;transform:rotate(-5deg);font-size:16pt}
    .rac-podpis{margin-top:26px;max-width:260px;break-inside:avoid}
    .rac-podpis-crta{border-bottom:1px solid #111;min-height:34px;display:flex;align-items:flex-end;padding-bottom:4px}
    .podpis-img{display:block;max-height:40px;max-width:200px}
    .rac-podpis-ime{margin-top:5px;font-size:9.5pt;color:#222}
    .rac-podpis-meta{font-size:8.5pt;color:#8a8177}`;
  const doc = (body: string) => `<!doctype html><html lang="sl"><head><meta charset="utf-8">${dokFontLink(dokFont)}<style>${dokCss(DOC_CSS)}</style></head><body style="${dokVars(dokBarva, dokFont)}">${glava()}${body}${dokNoga()}</body></html>`;

  /* postavke za dokument: novi racuni jih imajo shranjene; za STARE izpeljemo eno
     vrstico iz zneska (ce je bil izdajatelj zavezanec, je stari amount vseboval DDV) */
  const postavkeZa = (inv: FlowInvoice): { items: FlowInvoiceItem[]; zavezanec: boolean } => {
    const zavezanec = inv.vatPayer ?? ddvZavezanec;
    if (inv.items?.length) return { items: inv.items, zavezanec };
    const rate = clamp(ddvStopnja, 0, 30);
    const cena = zavezanec ? inv.amount / (1 + rate / 100) : inv.amount;
    return { items: [{ opis: inv.title || 'Opravljene storitve', kolicina: 1, cena, popust: 0, ddv: rate }], zavezanec };
  };

  const racunTelo = (inv: FlowInvoice): string => {
    const { items, zavezanec } = postavkeZa(inv);
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
    const vrsticeHtml = items.map(i => `<tr><td>${esc(i.opis || 'Storitev')}</td><td>${i.kolicina.toLocaleString('sl-SI')}</td><td>${eur2(i.cena)}</td>${imaPopust ? `<td>${(i.popust || 0).toLocaleString('sl-SI')} %</td>` : ''}${zavezanec ? `<td>${(i.ddv || 0).toLocaleString('sl-SI')} %</td>` : ''}<td>${eur2(vrsticaZnesek(i))}</td></tr>`).join('');
    const vsoteHtml = zavezanec
      ? [...stopnje.entries()].sort((a, b) => b[0] - a[0]).map(([rate, s]) => `<div><span>Osnova${vecStopenj ? ` (DDV ${rate.toLocaleString('sl-SI')} %)` : ''}</span><span>${eur2(s.osnova)}</span></div><div><span>DDV (${rate.toLocaleString('sl-SI')} %)</span><span>${eur2(s.ddv)}</span></div>`).join('')
      : `<div><span>Osnova</span><span>${eur2(osnova)}</span></div>`;
    const klient = clients.find(c => c.name.trim().toLowerCase() === inv.client.trim().toLowerCase());
    const prejemnik = [
      `<b>${esc(inv.client)}</b>`,
      klient?.contact?.trim() && esc(klient.contact.trim()),
      klient?.address?.trim() && esc(klient.address.trim()),
      klient?.tax?.trim() && ('Davčna št.: ' + esc(klient.tax.trim())),
      klient?.email?.trim() && esc(klient.email.trim()),
    ].filter(Boolean).join('<br>');
    const sklicDigits = (inv.number || '').replace(/\D/g, '');
    const placiloVrstice = [
      ponudnik.trr.trim() && ('TRR: ' + esc(ponudnik.trr.trim())),
      sklicDigits && ('Sklic: SI00 ' + sklicDigits),
      'Rok plačila: ' + datStr(rok),
    ].filter(Boolean).join('<br>');
    return `
      <div class="rac-head">
        <div class="rac-title"><span class="rac-kicker">Račun</span><span class="rac-no">${esc(inv.number || '')}</span></div>
        <div class="rac-meta"><b>Datum izdaje</b>${datStr(izdaja)}<b>Opravljena storitev</b>${datStr(storitev)}<b>Rok plačila</b>${datStr(rok)}</div>
      </div>
      <div class="rac-stranki"><span class="rac-l">Prejemnik računa</span>${prejemnik || '[naročnik]'}</div>
      <table class="rac-tabela"><thead><tr><th>Postavka</th><th>Kol.</th><th>Cena brez DDV</th>${imaPopust ? '<th>Popust</th>' : ''}${zavezanec ? '<th>DDV</th>' : ''}<th>Znesek</th></tr></thead>
      <tbody>${vrsticeHtml}</tbody></table>
      <div class="rac-vsote">${vsoteHtml}${zavezanec ? `<div><span>DDV skupaj</span><span>${eur2(ddvSkupaj)}</span></div>` : ''}<div class="rac-skupaj"><span>SKUPAJ ZA PLAČILO</span><span>${eur2(zaPlacilo)}</span></div></div>
      ${!zavezanec ? '<p class="rac-opomba">DDV ni obračunan na podlagi 1. odstavka 94. člena ZDDV-1 (izdajatelj ni zavezanec za DDV).</p>' : ''}
      <div class="rac-placilo">${placiloVrstice}</div>
      ${inv.paid ? '<div class="rac-placano">PLAČANO</div>' : ''}
      ${inv.signature ? `<div class="rac-podpis"><div class="rac-podpis-crta"><img class="podpis-img" src="${inv.signature.image}" alt="Podpis"></div><div class="rac-podpis-ime">${esc(inv.signature.name || ponudnik.ime.trim() || '')}</div>${(inv.signature.place || inv.signature.date) ? `<div class="rac-podpis-meta">${esc([inv.signature.place, inv.signature.date ? datStr(new Date(inv.signature.date)) : ''].filter(Boolean).join(' · '))}</div>` : ''}</div>` : ''}
      <p class="rac-noga-txt">Račun je izdan v skladu z veljavno zakonodajo. Ob zamudi plačila zaračunamo zakonske zamudne obresti.</p>`;
  };

  /* Poglej / Prenesi PDF — prek /api/ponudba-pdf, ENAKO kot retainer prenesi() */
  const prenesiPdf = async (inv: FlowInvoice) => {
    setNapaka(''); setPdfId(inv.id);
    try {
      const html = doc(racunTelo(inv));
      const ime = 'racun-' + (inv.number || 'pinart').replace(/[^\w-]+/g, '');
      const footer = esc([ponudnik.ime.trim(), 'Račun' + (inv.number ? ' ' + inv.number : '')].filter(Boolean).join(' · '));
      const res = await fetch('/api/ponudba-pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ html, ime, footer }) });
      if (!res.ok) throw new Error('pdf');
      const blob = await res.blob();
      if (!blob.size) throw new Error('prazen');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = ime + '.pdf'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch { setNapaka('PDF-ja ni bilo mogoče pripraviti. Poskusi znova.'); } finally { setPdfId(''); }
  };

  /* Poslji v placilo — mailto vzorec iz KalkulatorApp ("posljem racun st. ...") */
  const posljiVPlacilo = (inv: FlowInvoice) => {
    const email = clients.find(c => c.name.trim().toLowerCase() === inv.client.trim().toLowerCase())?.email?.trim() || '';
    const izdaja = new Date(inv.date);
    const rok = new Date(izdaja.getTime() + (inv.dueDays ?? PRIVZETI_ROK_DNI) * 864e5);
    const sklicDigits = (inv.number || '').replace(/\D/g, '');
    const podpis = [ponudnik.ime.trim(), [ponudnik.email.trim(), ponudnik.telefon.trim() && (predklic + ' ' + ponudnik.telefon.trim())].filter(Boolean).join(' · ')].filter(Boolean).join('\n');
    const v: string[] = ['Pozdravljeni,', '', `pošiljam račun št. ${inv.number || ''}${inv.title ? ' za: ' + inv.title : ''}.`, ''];
    v.push(`Datum izdaje: ${datStr(izdaja)}`);
    v.push(`Rok plačila: ${datStr(rok)}`);
    v.push(`Za plačilo: ${eur2(inv.amount)}`);
    v.push('');
    if (ponudnik.trr.trim()) v.push(`TRR: ${ponudnik.trr.trim()}`);
    if (sklicDigits) v.push(`Sklic: SI00 ${sklicDigits}`);
    if (inv.paid) v.push('', 'Račun je poravnan. Hvala!');
    v.push('', 'Podroben račun prilagam v PDF.', '', 'Lep pozdrav,');
    if (podpis) v.push(podpis);
    const zadeva = `Račun ${inv.number || ''}`.trim();
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(zadeva)}&body=${encodeURIComponent(v.join('\n'))}`;
  };

  return <div className={`${styles.invoicePage} rc`}>
    {/* ── POGLED: PREGLED (VSTOP za nov racun — kot ContractWorkspace vstop) ── */}
    {/* vstop brez bele kartice, v ozkem sredinskem stolpcu (kot retainer rw-vsebina) — naslov strani
        "RAČUNI / Od dogovora do plačila" izrise racuni/page.tsx nad tem workspace-om */}
    {pogled === 'pregled' && <section className="rc-sek rc-stolpec">
      <p className="rc-kicker">Računi</p>
      <h1 className="rc-h1">Od dogovora do plačila.</h1>
      <div className="rc-chat">
        <span className="rc-mehur"><b>Iz česa nastane račun?</b><small>Če obstaja ponudba, jo izberi — stranka in postavka se predizpolnita v obrazcu. Podatki izdajatelja (naziv, naslov, davčna, TRR) se berejo iz nastavitev Moje podjetje.</small></span>
      </div>
      <div className="rc-vstop-panel">
        <div className="rc-segpills" role="group" aria-label="Vir računa">
          <button type="button" aria-label="Iz ponudbe" className={vir === 'ponudba' ? 'on' : ''} onClick={() => setVir('ponudba')}>Iz ponudbe</button>
          <button type="button" aria-label="Samostojen račun" className={vir === 'rocno' ? 'on' : ''} onClick={() => setVir('rocno')}>Samostojen račun</button>
        </div>
        <div className="rc-polja">
          {vir === 'ponudba' && <label className="rc-polje">Ponudba
            <select value={offerId} onChange={event => izberiPonudbo(event.target.value)}>
              <option value="">Izberi ponudbo …</option>
              {offers.map(offer => <option key={offer.id} value={offer.id}>{offer.title} · {offer.client}</option>)}
            </select>
          </label>}
          <label className="rc-polje">Datum izdaje
            <input type="date" value={datumIzdaje} onChange={event => setDatumIzdaje(event.target.value)} />
          </label>
        </div>
        <div className="rc-gumbi">
          <button type="button" className="rc-gumb" aria-label="Pripravi račun" disabled={vir === 'ponudba' && !offerId} onClick={odpriObrazec}>Pripravi račun →</button>
        </div>
      </div>
    </section>}

    {/* ── POGLED: OBRAZEC (svoja stran, sredinski stolpec — view-swap kot pogodbe) ── */}
    {pogled === 'obrazec' && <section className={`${styles.invoiceCreator} rc-sek rc-stran rc-stolpec rc-obrazec`}>
      <button type="button" className="rc-povezava rc-nazaj-vrh" onClick={() => setPogled('pregled')}>← Nazaj</button>
      <div className="rc-obr-uvod">
        <p className={styles.eyebrow}>NOV RAČUN</p>
        <h2>Vse sestavine po zakonu.</h2>
        <p>Če obstaja ponudba, jo izberi — stranka in postavka se predizpolnita. Podatki izdajatelja (naziv, naslov, davčna, TRR) se berejo iz nastavitev Moje podjetje in se izpišejo v glavi računa.</p>
      </div>
      <form onSubmit={save}>
        <div className={styles.invoiceMetaFields}>
          <label>Ponudba{jeMobilni
            ? <button type="button" className="rc-pon-polje" aria-haspopup="dialog" aria-expanded={ponSheet} aria-label={`Ponudba: ${selectedOffer ? `${selectedOffer.title} · ${selectedOffer.client}` : 'Samostojen račun'} — izberi`} onClick={() => { setPonIskanje(''); setPonSheet(true); }}>
              <span>{selectedOffer ? `${selectedOffer.title} · ${selectedOffer.client}` : 'Samostojen račun'}</span>
              <CaretDown size={14} weight="bold" aria-hidden />
            </button>
            : <select value={offerId} onChange={event => izberiPonudbo(event.target.value)}><option value="">Samostojen račun</option>{offers.map(offer => <option key={offer.id} value={offer.id}>{offer.title} · {offer.client}</option>)}</select>}</label>
          <label>Številka<input required value={stevilka} onChange={event => setStevilka(event.target.value)} /></label>
          <label>Stranka<input required value={stranka} onChange={event => setStranka(event.target.value)} placeholder="Ime ali podjetje" /></label>
          <label>Datum izdaje<input required type="date" value={datumIzdaje} onChange={event => setDatumIzdaje(event.target.value)} /></label>
          <label>Datum opravljene storitve<input required type="date" value={datumStoritve} onChange={event => setDatumStoritve(event.target.value)} /></label>
          <label>Rok plačila v dneh<input required min="0" type="number" inputMode="numeric" placeholder={String(PRIVZETI_ROK_DNI)} value={rokDni} onChange={event => setRokDni(event.target.value)} /></label>
        </div>

        {/* sheet MORA biti v portalu na <body>: transform na prednikih (animacija
            .rc-stran) ukrade sidro position:fixed — ista past kot pri pogodbah */}
        {jeMobilni && typeof document !== 'undefined' && createPortal(
          <>
            {ponSheet && <div className="rc-sheet-back" onClick={() => setPonSheet(false)} aria-hidden />}
            <div className={'rc-pon-sheet' + (ponSheet ? ' odprt' : '')} role="dialog" aria-label="Izberi ponudbo" aria-hidden={!ponSheet}>
              <div className="rc-sheet-glava"><b>Izberi ponudbo</b><button type="button" className="rc-sheet-x" onClick={() => setPonSheet(false)} aria-label="Zapri">✕</button></div>
              {offers.length > 8 && <input className="rc-pon-iskalnik" type="search" placeholder="Poišči ponudbo ali stranko …" aria-label="Poišči ponudbo ali stranko" value={ponIskanje} onChange={event => setPonIskanje(event.target.value)} />}
              <div className="rc-pon-seznam">
                <button type="button" className={'rc-pon-vrstica' + (!offerId ? ' on' : '')} aria-label="Samostojen račun — brez povezave s ponudbo" onClick={() => izberiVSheet('')}>
                  <span className="rc-pon-naziv"><strong>Samostojen račun</strong><small>Brez povezave s ponudbo</small></span>
                  {!offerId && <span className="rc-pon-kljukica" aria-hidden>✓</span>}
                </button>
                {ponudbeZaSheet.map(offer => (
                  <button key={offer.id} type="button" className={'rc-pon-vrstica' + (offerId === offer.id ? ' on' : '')} aria-label={`Izberi ponudbo ${offer.title} · ${offer.client}`} onClick={() => izberiVSheet(offer.id)}>
                    <span className="rc-pon-naziv"><strong>{offer.title} · {offer.client}</strong>{offer.number && <small>Št. {offer.number}</small>}</span>
                    {offerId === offer.id && <span className="rc-pon-kljukica" aria-hidden>✓</span>}
                  </button>
                ))}
                {!ponudbeZaSheet.length && ponIskanje.trim() !== '' && <p className="rc-mini rc-pon-prazno">Ni ponudb za to iskanje.</p>}
              </div>
            </div>
          </>,
          document.body,
        )}

        <div className="rc-postavke">
          <div className="rc-post-glava">
            <p className={styles.eyebrow}>POSTAVKE RAČUNA</p>
            <div className="rc-post-gumbi">
              {/* samo ce racun izhaja iz ponudbe — povrne narocnika+postavke na izhodisce ponudbe (rocnih sprememb v ostalih poljih ne izbrise) */}
              {offerId && <button type="button" className="rc-ponastavi" onClick={ponastaviNaPrivzeto}>↺ Ponastavi na privzeto</button>}
              <button type="button" className="rc-dodaj" onClick={() => setVrstice(v => [...v, novaVrstica()])}>+ Dodaj postavko</button>
            </div>
          </div>
          {vrstice.map((v, i) => <div key={i} className={'rc-vrstica' + (ddvZavezanec ? '' : ' rc-brez-ddv')}>
            <label className="rc-opis">Opis<input required={i === 0} value={v.opis} onChange={event => popraviVrstico(i, 'opis', event.target.value)} placeholder="Opravljena storitev, obseg ali obdobje …" /></label>
            <label>Kol.<input required min="0" step="0.5" type="number" inputMode="numeric" placeholder="1" value={v.kolicina} onChange={event => popraviVrstico(i, 'kolicina', event.target.value)} /></label>
            <label>Cena brez DDV<input required={i === 0} min="0" step="0.01" type="number" inputMode="decimal" placeholder="0,00" value={v.cena} onChange={event => popraviVrstico(i, 'cena', event.target.value)} /></label>
            <label>Popust %<input min="0" max="100" step="0.5" type="number" inputMode="decimal" value={v.popust} onChange={event => popraviVrstico(i, 'popust', event.target.value)} placeholder="0" /></label>
            {ddvZavezanec && <label>DDV<select value={v.ddv} onChange={event => popraviVrstico(i, 'ddv', event.target.value)}>{DDV_STOPNJE.map(s => <option key={s} value={s}>{s.replace('.', ',')} %</option>)}</select></label>}
            <span className="rc-znesek"><em>Znesek</em><b>{eur2(vrsticaZnesek(izracun.postavke[i] || { opis: '', kolicina: 0, cena: 0 }))}</b></span>
            <button type="button" className="rc-x" onClick={() => setVrstice(rows => rows.length > 1 ? rows.filter((_, j) => j !== i) : rows)} aria-label={`Odstrani postavko ${i + 1}`} title="Odstrani postavko" disabled={vrstice.length < 2}>×</button>
          </div>)}
        </div>

        <div className="rc-vsote">
          {ddvZavezanec ? <>
            {izracun.stopnje.map(([rate, s]) => <div key={rate}><span>Osnova{izracun.stopnje.length > 1 ? ` (DDV ${String(rate).replace('.', ',')} %)` : ''}</span><b>{eur2(s.osnova)}</b></div>)}
            {izracun.stopnje.map(([rate, s]) => <div key={'d' + rate}><span>DDV ({String(rate).replace('.', ',')} %)</span><b>{eur2(s.ddv)}</b></div>)}
          </> : <div><span>Osnova</span><b>{eur2(izracun.osnova)}</b></div>}
          <div className="rc-skupaj"><span>Skupaj za plačilo</span><b>{eur2(izracun.zaPlacilo)}</b></div>
          {!ddvZavezanec && <p className="rc-klavzula">DDV ni obračunan na podlagi 1. odstavka 94. člena ZDDV-1 — klavzula se izpiše na računu. Zavezanost za DDV nastaviš v Moje podjetje (kalkulator).</p>}
        </div>

        {/* podpis (neobvezen) — isti vzorec kot pri pogodbah: rocno narisan ali nalozen; izrise se na dnu racuna in v izvozu */}
        <div className="rc-podpis">
          <div className="rc-post-glava"><p className={styles.eyebrow}>PODPIS RAČUNA (NEOBVEZNO)</p>{podpisSlika && <button type="button" className="rc-povezava" onClick={odstraniPodpis}>Odstrani podpis</button>}</div>
          <div className="rc-podpis-polja">
            <label className="rc-polje">Ime podpisnika<input value={podpisIme} onChange={event => setPodpisIme(event.target.value)} placeholder={ponudnik.ime || 'Ime in priimek'} /></label>
            <label className="rc-polje">Kraj<input value={podpisKraj} onChange={event => setPodpisKraj(event.target.value)} placeholder="npr. Ljubljana" /></label>
            <label className="rc-polje">Datum podpisa<input type="date" value={podpisDatum} onChange={event => setPodpisDatum(event.target.value)} /></label>
          </div>
          {podpisSlika ? (
            <div className="rc-podpis-prikaz">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={podpisSlika} alt="Podpis" />
            </div>
          ) : (
            <>
              <canvas ref={pripraviPlatno} className="rc-podpis-platno" onPointerDown={zacniRis} onPointerMove={risiPodpis} onPointerUp={koncajRis} onPointerCancel={koncajRis} />
              <div className="rc-podpis-akcije">
                <button type="button" className="rc-cip" onClick={pocistiPlatno}>Počisti</button>
                <button type="button" className="rc-cip" disabled={!narisanPodpis} onClick={uporabiNarisanPodpis}>Uporabi narisan podpis</button>
                <span className="rc-podpis-ali">ali</span>
                <button type="button" className="rc-cip" onClick={() => podpisDatotekaRef.current?.click()}>Naloži sliko podpisa …</button>
                <input ref={podpisDatotekaRef} type="file" accept="image/*" hidden onChange={naloziPodpisSliko} />
              </div>
            </>
          )}
        </div>

        <div className={styles.invoiceSubmit}><label className={styles.invoiceCheck}><input type="checkbox" checked={placano} onChange={event => setPlacano(event.target.checked)} /> Račun je že plačan</label><button>Shrani račun</button></div>
        {napaka && <p className="rc-napaka">{napaka}</p>}
      </form>
    </section>}

    <style>{`
      /* rc- = novi stili obrazca za racun; pazi na .shell pravila (min-height 2.75rem
         na inputih, select padding-right 3rem !important) — mere so temu prilagojene. */
      .rc .rc-postavke{min-width:0;padding:1rem;border:1px solid var(--line);border-radius:.9rem;background:linear-gradient(135deg,oklch(98% .018 87),oklch(96% .025 62))}
      .rc .rc-postavke *{box-sizing:border-box;min-width:0}
      .rc .rc-post-glava{display:flex;align-items:center;justify-content:space-between;gap:.7rem;flex-wrap:wrap}
      .rc .rc-post-gumbi{display:flex;align-items:center;gap:.6rem;flex-wrap:wrap}
      .rc .rc-dodaj{padding:.45rem .9rem;border:1px dashed color-mix(in oklch,var(--ink) 35%,transparent);border-radius:999px;background:transparent;color:var(--ink);font:700 .6rem var(--font-sans),sans-serif;cursor:pointer;transition:border-color .15s ease,background .15s ease}
      .rc .rc-dodaj:hover{border-color:var(--ink);background:oklch(100% 0 0/.5)}
      .rc .rc-ponastavi{padding:.45rem .9rem;border:none;border-radius:999px;background:transparent;color:var(--muted);font:700 .6rem var(--font-sans),sans-serif;letter-spacing:.02em;cursor:pointer;text-decoration:underline;text-underline-offset:.22em}
      .rc .rc-ponastavi:hover{color:var(--ink)}

      /* podpis na racunu (neobvezno) — kot pg-podpis-* v ContractWorkspace, tu inline (brez sheeta) */
      .rc .rc-podpis{min-width:0;margin-top:1.1rem;padding:1rem;border:1px solid var(--line);border-radius:.9rem;background:oklch(100% 0 0/.55)}
      .rc .rc-podpis-polja{display:grid;grid-template-columns:1fr 1fr 1fr;gap:.9rem;margin:.9rem 0 0}
      .rc .rc-podpis-platno{display:block;width:100%;height:150px;margin-top:.9rem;border:1px dashed rgba(17,17,17,.3);border-radius:12px;background:#fff;touch-action:none;cursor:crosshair}
      .rc .rc-podpis-akcije{display:flex;flex-wrap:wrap;align-items:center;gap:.6rem;margin-top:.7rem}
      .rc .rc-podpis-ali{font-size:.7rem;color:var(--muted);text-transform:uppercase;letter-spacing:.1em;font-weight:700}
      .rc .rc-podpis-prikaz{margin-top:.9rem;padding:.8rem 1rem;border:1px solid rgba(17,17,17,.14);border-radius:12px;background:#fff}
      .rc .rc-podpis-prikaz img{display:block;max-height:60px;max-width:220px}
      .rc .rc-cip{padding:.42rem .8rem;border:1px solid rgba(17,17,17,.2);border-radius:999px;background:rgba(255,255,255,.5);cursor:pointer;font:inherit;font-size:.8rem;color:var(--ink);transition:border-color .15s,background .15s}
      .rc .rc-cip:hover:not(:disabled){border-color:var(--ink)}
      .rc .rc-cip:disabled{opacity:.45;cursor:default}
      @media (max-width:640px){.rc .rc-podpis-polja{grid-template-columns:1fr}}
      .rc .rc-vrstica{display:grid;grid-template-columns:minmax(0,2.3fr) minmax(3.6rem,.5fr) minmax(6rem,.9fr) minmax(4.6rem,.65fr) minmax(5.8rem,.8fr) minmax(5.6rem,.8fr) 2rem;gap:.55rem;align-items:end;margin-top:.7rem}
      .rc .rc-vrstica.rc-brez-ddv{grid-template-columns:minmax(0,2.5fr) minmax(3.6rem,.5fr) minmax(6rem,.9fr) minmax(4.6rem,.65fr) minmax(5.6rem,.9fr) 2rem}
      .rc .rc-vrstica input,.rc .rc-vrstica select{width:100%}
      .rc .rc-vrstica input[type='number']{text-align:right}
      .rc .rc-znesek{display:grid;gap:.35rem;min-width:0}
      .rc .rc-znesek em{font:800 .58rem var(--font-sans),sans-serif;font-style:normal}
      .rc .rc-znesek b{display:flex;align-items:center;justify-content:flex-end;min-height:2.75rem;padding:0 .2rem;font:700 .72rem var(--font-sans),sans-serif;white-space:nowrap;overflow-wrap:anywhere}
      .rc .rc-x{width:2rem;height:2.75rem;border:0;border-radius:.65rem;background:transparent;color:color-mix(in oklch,var(--ink) 55%,transparent);font-size:1.1rem;line-height:1;cursor:pointer}
      .rc .rc-x:hover:not(:disabled){color:var(--ink);background:oklch(100% 0 0/.6)}
      .rc .rc-x:disabled{opacity:.3;cursor:default}
      .rc .rc-vsote{margin-left:auto;width:min(21rem,100%);display:grid;gap:.15rem;padding:.85rem 1rem;border:1px solid var(--line);border-radius:.9rem;background:oklch(100% 0 0/.65)}
      .rc .rc-vsote>div{display:flex;align-items:baseline;justify-content:space-between;gap:.8rem;font-size:.62rem}
      .rc .rc-vsote>div span{font-weight:700;color:var(--muted)}
      .rc .rc-vsote>div b{font-size:.68rem;white-space:nowrap}
      .rc .rc-skupaj{margin-top:.3rem;padding-top:.45rem;border-top:1.5px solid color-mix(in oklch,var(--ink) 30%,transparent)}
      .rc .rc-vsote .rc-skupaj span{color:var(--ink);text-transform:uppercase;letter-spacing:.08em;font-size:.56rem}
      .rc .rc-vsote .rc-skupaj b{font:500 1.15rem var(--font-serif),Georgia,serif}
      .rc .rc-klavzula{margin:.4rem 0 0;font-size:.56rem;line-height:1.5;color:var(--muted);font-weight:500}
      .rc .rc-napaka{margin:.5rem 0 0;color:oklch(50% .18 25);font-size:.62rem;font-weight:700}
      /* ── view-swap (kot pogodbe): obrazec je svoja stran, sredinski stolpec ── */
      .rc .rc-sek{min-width:0}
      .rc .rc-sek.rc-stran{animation:rcStran .5s cubic-bezier(.16,1,.3,1) both}
      /* KONEC animacije mora biti transform:NONE (ne translateY(0)) — kot pogodbe */
      @keyframes rcStran{from{opacity:0;transform:translateY(60px)}to{opacity:1;transform:none}}
      @media (prefers-reduced-motion:reduce){.rc .rc-sek.rc-stran{animation:none}}
      .rc .rc-stolpec{width:100%;max-width:700px;margin-left:auto;margin-right:auto}
      /* naslov v ozkem stolpcu (kot retainer rw-kicker/rw-h1) */
      .rc .rc-kicker{font-size:.78rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--accent,#B25476);margin:0 0 .3rem}
      .rc .rc-h1{font-family:var(--font-serif),Didot,serif;font-weight:500;font-size:clamp(2.4rem,6vw,4rem);line-height:1;letter-spacing:-.012em;margin:0 0 1.4rem;color:var(--ink)}
      /* na svoji strani je obrazec en stolpec (modul ima 2 koloni za inline vgradnjo) */
      .rc .rc-obrazec{grid-template-columns:1fr}
      /* vec zracnosti okoli naslova obrazca */
      .rc .rc-obr-uvod{margin:1rem 0 2rem}
      .rc .rc-nazaj-vrh{margin:0 0 .2rem;justify-self:start}
      .rc .rc-povezava{font-family:inherit;font-size:.88rem;font-weight:500;cursor:pointer;border:none;background:none;color:var(--ink);text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:.28em;padding:0;display:inline-flex;align-items:center;gap:.38rem}
      .rc .rc-povezava:hover{opacity:.6}
      .rc .rc-mini{font-size:.8rem;color:rgba(17,17,17,.55)}

      /* ── vstop (pogled 'pregled'): SAMO vstop za nov racun — pregled/arhiv
         obstojecih racunov je preseljen v Arhiv. Brez bele kartice (kot retainer
         rw-vsebina) — vsebina sedi neposredno na papirnatem ozadju. ── */
      .rc .rc-naslov{margin:.35rem 0 1.1rem;font:500 clamp(1.7rem,2.6vw,2.4rem)/1.05 var(--font-serif),Georgia,serif;color:var(--ink);overflow-wrap:anywhere}
      .rc .rc-uvod{margin:0 0 1.4rem;font-size:.92rem;line-height:1.55;color:rgba(17,17,17,.72);max-width:34rem}

      /* chat mehurcek vstopnega vprasanja — isti videz kot RetainerWorkspace .rw-chat/.rw-mehur */
      .rc .rc-chat{display:flex;align-items:flex-start;gap:.55rem;max-width:90%;margin:0 0 1.2rem}
      .rc .rc-mehur{position:relative;background:#F7F2FF;border:1px solid rgba(185,160,230,.2);border-radius:18px;border-bottom-left-radius:5px;padding:.85rem 1.25rem .85rem 2.75rem;box-shadow:0 2px 10px rgba(40,25,40,.05)}
      .rc .rc-mehur::before{content:"";position:absolute;left:.9rem;top:.95rem;width:1.3rem;height:1.3rem;border-radius:50%;background:radial-gradient(58% 48% at 30% 24%,rgba(255,255,255,.92),rgba(255,255,255,0) 62%),conic-gradient(from 210deg,#7C3AED,#EC4899,#F59E0B,#38BDF8,#7C3AED);box-shadow:0 2px 6px rgba(124,58,237,.28)}
      .rc .rc-mehur b{display:block;color:var(--ink);font-weight:600;font-size:1.02rem}
      .rc .rc-mehur small{display:block;margin-top:.1rem;color:rgba(17,17,17,.64);font-size:.82rem}
      /* vstopna forma (pilule+polja+gumb) v beli kartici — naslov+chat ostaneta na papirju nad njo */
      .rc .rc-vstop-panel{background:#fff;border:1px solid rgba(17,17,17,.08);border-radius:20px;padding:1.6rem 1.5rem;box-shadow:0 12px 40px rgba(20,16,26,.05)}
      .rc .rc-polja{display:grid;grid-template-columns:1fr 1fr;gap:1.1rem 1.5rem;margin:0 0 1.3rem;min-width:0}
      .rc .rc-polja>*{min-width:0}
      .rc .rc-polje{display:flex;flex-direction:column;gap:.35rem;font-size:.7rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(17,17,17,.62)}
      .rc .rc-polje input{width:100%;max-width:100%;min-width:0;font:inherit;font-size:.95rem;font-weight:600;letter-spacing:0;text-transform:none;color:var(--ink);background:rgba(255,255,255,.85);border:1px solid rgba(17,17,17,.16);border-radius:10px;padding:.6rem .75rem}
      .rc .rc-polje input:focus{outline:none;border-color:var(--ink)}
      /* select: background-COLOR (NE shorthand background), da .shell select
         (chevron background-image) ostane veljaven — past iz feedback_css_splosna_pravila */
      .rc .rc-polje select{width:100%;max-width:100%;min-width:0;font:inherit;font-size:.95rem;font-weight:600;letter-spacing:0;text-transform:none;color:var(--ink);background-color:rgba(255,255,255,.85);border:1px solid rgba(17,17,17,.16);border-radius:10px;padding:.6rem .75rem}
      .rc .rc-polje select:focus{outline:none;border-color:var(--ink)}
      .rc .rc-gumbi{display:flex;flex-wrap:wrap;gap:.8rem;margin-top:.2rem}

      /* pilule (vir racuna na vstopu — ista oblika kot ContractWorkspace pg-segpills) */
      .rc .rc-segpills{display:inline-flex;background:rgba(255,255,255,.55);border:1px solid rgba(17,17,17,.1);border-radius:999px;padding:.25rem;gap:.15rem;margin:0 0 1.1rem}
      .rc .rc-segpills button{border:none;background:transparent;color:var(--ink);font-family:inherit;font-weight:700;font-size:.72rem;letter-spacing:.03em;text-transform:uppercase;padding:.46rem .9rem;border-radius:999px;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:.35rem;transition:background .18s,color .18s}
      .rc .rc-segpills button.on{background:var(--ink);color:var(--paper)}

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
      .rc .rc-pon-polje{display:flex;align-items:center;justify-content:space-between;gap:.6rem;width:100%;min-width:0;min-height:2.75rem;padding:.6rem .85rem;border:1px solid var(--line);border-radius:.65rem;background:oklch(100% 0 0/.8);font:500 16px var(--font-sans),sans-serif;color:var(--ink);text-align:left;cursor:pointer}
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
      .rc-pon-iskalnik{margin:.8rem 0 .2rem;width:100%;min-height:2.75rem;box-sizing:border-box;font:inherit;font-size:16px;font-weight:500;color:var(--ink);background:rgba(255,255,255,.85);border:1px solid rgba(17,17,17,.16);border-radius:999px;padding:.55rem 1rem}
      .rc-pon-iskalnik:focus{outline:none;border-color:var(--ink)}
      .rc-pon-seznam{display:flex;flex-direction:column;padding:.4rem 0 .2rem}
      .rc-pon-vrstica{display:flex;align-items:center;gap:.7rem;width:100%;min-height:2.9rem;padding:.55rem .3rem;border:none;border-bottom:1px solid rgba(17,17,17,.08);background:none;font:inherit;color:var(--ink);text-align:left;cursor:pointer}
      .rc-pon-vrstica:last-child{border-bottom:none}
      .rc-pon-naziv{flex:1;min-width:0}
      .rc-pon-naziv strong{display:block;font-size:.9rem;font-weight:600;overflow-wrap:anywhere}
      .rc-pon-vrstica.on .rc-pon-naziv strong{font-weight:800}
      .rc-pon-naziv small{display:block;margin-top:.1rem;font-size:.74rem;color:rgba(17,17,17,.55)}
      .rc-pon-kljukica{flex:none;display:grid;place-items:center;width:1.6rem;height:1.6rem;border-radius:50%;background:var(--ink);color:var(--paper);font-size:.85rem}
      .rc-pon-prazno{padding:.9rem .3rem}

      /* mobilno: NIC cez desni rob pri 390px — postavka se zlozi v 2 stolpca */
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
        .rc .rc-polja{grid-template-columns:1fr;gap:1rem}
      }
    `}</style>
  </div>;
}

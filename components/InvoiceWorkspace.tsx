'use client';

/* RACUNI — obrazec + dokument po slovenski zakonodaji (ZDDV-1, 82. clen).
   Vzorci so KOPIRANI iz RetainerWorkspace (letterhead + DOC_CSS + /api/ponudba-pdf,
   branje nastavitev "Moje podjetje" iz K_NAST) in KalkulatorApp (RACUN_CSS tabela,
   mailto "posljem racun st. ..."). Stari racuni (brez postavk) se delujejo:
   nova polja v FlowInvoice so neobvezna, dokument zanje izpelje eno postavko. */

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CaretDown, CaretUp, Receipt } from '@phosphor-icons/react';
import ArhivFilter from '@/components/ArhivFilter';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';
import { loadFlowData, saveFlowCollection, type FlowClient, type FlowInvoice, type FlowInvoiceItem } from '@/lib/pinartFlowStore';
import { podatkiZaPredogled, usePredogled } from '@/lib/predogled';
import MetricIcon from '@/components/MetricIcon';
import { dokCss, dokFontLink, dokVars, DOK_BARVA_PRIVZETA, DOK_FONT_PRIVZETI } from '@/lib/dokVidez';

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
     pregled (povzetek + arhiv) ali obrazec (SAMO nov racun, svoja stran) */
  const [pogled, setPogled] = useState<'pregled' | 'obrazec'>('pregled');
  const [offerId, setOfferId] = useState('');
  const [filter, setFilter] = useState<'all' | 'open' | 'paid'>('all');
  /* detajl racuna: shranimo id in zapis izpeljemo iz seznama, da se status
     (Odprt/Placan) v odprtem panelu osvezi skupaj s seznamom */
  const [detajlId, setDetajlId] = useState('');
  const [detPonOdprta, setDetPonOdprta] = useState(false);
  /* mobilni sheet za izbiro ponudbe (native select ne skalira s 50+ ponudbami) */
  const [ponSheet, setPonSheet] = useState(false);
  const [ponIskanje, setPonIskanje] = useState('');
  /* arhiv: iskanje + datumsko obdobje (vzorec iz arhiva pogodb) */
  const [iskanje, setIskanje] = useState('');
  const [obdobje, setObdobje] = useState<'vse' | 'letos' | '30' | 'obdobje'>('vse');
  const [obdobjeOd, setObdobjeOd] = useState('');
  const [obdobjeDo, setObdobjeDo] = useState('');

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
  /* arhiv po filtrih: status + besedilo (naslov, stevilka, stranka) + obdobje (kot pogodbe) */
  const visible = invoices.filter(invoice => {
    if (filter !== 'all' && (filter === 'paid' ? !invoice.paid : invoice.paid)) return false;
    const besedilo = `${invoice.title || ''} ${invoice.number || ''} ${invoice.client}`.toLocaleLowerCase('sl-SI');
    if (iskanje.trim() && !besedilo.includes(iskanje.trim().toLocaleLowerCase('sl-SI'))) return false;
    const t = new Date(invoice.date).getTime();
    if (obdobje === 'letos' && new Date(invoice.date).getFullYear() !== new Date().getFullYear()) return false;
    if (obdobje === '30' && t < Date.now() - 30 * 864e5) return false;
    if (obdobje === 'obdobje') {
      if (obdobjeOd && t < new Date(obdobjeOd + 'T00:00:00').getTime()) return false;
      if (obdobjeDo && t > new Date(obdobjeDo + 'T23:59:59').getTime()) return false;
    }
    return true;
  });
  const totals = useMemo(() => ({ issued: invoices.reduce((sum, item) => sum + item.amount, 0), paid: invoices.filter(item => item.paid).reduce((sum, item) => sum + item.amount, 0), open: invoices.filter(item => !item.paid).reduce((sum, item) => sum + item.amount, 0) }), [invoices]);

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

  const odpriObrazec = () => {
    setStevilka(nextNumber()); setStranka(''); setOfferId('');
    setDatumIzdaje(danesISO()); setDatumStoritve(danesISO()); setRokDni(String(PRIVZETI_ROK_DNI));
    setPlacano(false); setVrstice([novaVrstica()]); setNapaka('');
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

  /* detajl: vrstica arhiva odpre panel (kot pogodbe) */
  const detajl = invoices.find(item => item.id === detajlId) || null;
  const odpriDetajl = (id: string) => { setDetPonOdprta(false); setNapaka(''); setDetajlId(id); };

  /* mobilni sheet: sprotni filter po naslovu/stranki/stevilki ponudbe */
  const ponudbeZaSheet = offers.filter(offer => {
    const q = ponIskanje.trim().toLocaleLowerCase('sl-SI');
    return !q || `${offer.title} ${offer.client} ${offer.number || ''}`.toLocaleLowerCase('sl-SI').includes(q);
  });
  const izberiVSheet = (id: string) => { izberiPonudbo(id); setPonSheet(false); };

  /* iz ponudbe: predizpolni stranko + prvo postavko (naslov/obseg/znesek) */
  const izberiPonudbo = (id: string) => {
    setOfferId(id);
    const offer = offers.find(o => o.id === id);
    if (!offer) return;
    setStranka(offer.client);
    const opis = offer.title + (offer.scope.length ? ` — ${offer.scope.join(', ')}` : '');
    setVrstice([{ opis, kolicina: '1', cena: offer.agreedAmount ? String(offer.agreedAmount) : '', popust: '', ddv: privzetiDdv() }]);
  };

  const popraviVrstico = (index: number, polje: keyof Vrstica, vrednost: string) =>
    setVrstice(v => v.map((row, i) => i === index ? { ...row, [polje]: vrednost } : row));

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
    };
    const next = [invoice, ...invoices];
    setInvoices(next); saveFlowCollection('invoices', next);
    /* po shranjevanju nazaj na pregled (kot pogodbe) — nov racun je takoj viden v arhivu */
    setPogled('pregled'); setOfferId('');
  };

  const markPaid = (id: string, paid: boolean) => { const next = invoices.map(item => item.id === id ? { ...item, paid } : item); setInvoices(next); saveFlowCollection('invoices', next); };

  /* ── DOKUMENT (letterhead + DOC_CSS kot RetainerWorkspace, tabela kot racun v kalkulatorju) ── */
  const glava = () => {
    const kontakt = [ponudnik.davcna.trim() && (ddvZavezanec ? 'ID za DDV: ' : 'Davčna št.: ') + ponudnik.davcna.trim(), ponudnik.trr.trim() && 'TRR: ' + ponudnik.trr.trim(), ponudnik.telefon.trim() && 'Tel.: ' + predklic + ' ' + ponudnik.telefon.trim(), ponudnik.email.trim()].filter(Boolean).join(' · ');
    return `<div class="lg"><div><b>${esc(ponudnik.ime.trim() || '[Tvoje podjetje]')}</b>${ponudnik.naslov.trim() ? '<br>' + esc(ponudnik.naslov.trim()) : ''}${kontakt ? '<br><span class="mut">' + esc(kontakt) + '</span>' : ''}</div><div class="rt">Pinart</div></div>`;
  };
  const DOC_CSS = `@page{size:A4;margin:16mm 16mm 18mm}*{-webkit-print-color-adjust:exact;print-color-adjust:exact;box-sizing:border-box}body{margin:0;color:#1a1622;font-family:'Helvetica Neue',Arial,sans-serif;font-size:10.5pt;line-height:1.42}.lg{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;padding-bottom:12px;border-bottom:1.5px solid #B25476;margin-bottom:20px}.lg .rt{font-family:'Bodoni Moda',Didot,Georgia,serif;font-size:15pt;color:#111}.mut{color:#8a8177;font-size:9pt}
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
    .rac-placano{display:inline-block;margin:18px 0 0;border:3px solid #2e7d5b;color:#2e7d5b;font-weight:700;letter-spacing:.22em;padding:6px 18px;border-radius:8px;transform:rotate(-5deg);font-size:16pt}`;
  const doc = (body: string) => `<!doctype html><html lang="sl"><head><meta charset="utf-8">${dokFontLink(dokFont)}<style>${dokCss(DOC_CSS)}</style></head><body style="${dokVars(dokBarva, dokFont)}">${glava()}${body}</body></html>`;

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
    {pogled === 'pregled' && <section className={styles.invoiceSummary}><article><small>Izdano</small><strong>{money(totals.issued)}</strong><span>{invoices.length} računov</span><b className={styles.subpageMetricIcon}><MetricIcon type="document" /></b></article><article><small>Plačano</small><strong>{money(totals.paid)}</strong><span>potrjena plačila</span><b className={styles.subpageMetricIcon}><MetricIcon type="paid" /></b></article><article><small>Odprto</small><strong>{money(totals.open)}</strong><span>še čaka plačilo</span><b className={styles.subpageMetricIcon}><MetricIcon type="profit" /></b></article><button onClick={odpriObrazec}><span>+</span><strong>Nov račun</strong><small>Iz ponudbe ali brez nje</small></button></section>}

    {/* ── POGLED: OBRAZEC (svoja stran, sredinski stolpec — view-swap kot pogodbe) ── */}
    {pogled === 'obrazec' && <section className={`${styles.invoiceCreator} rc-sek rc-stran rc-stolpec rc-obrazec`}>
      <button type="button" className="rc-povezava rc-nazaj-vrh" onClick={() => setPogled('pregled')}>← Nazaj</button>
      <div>
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
          <div className="rc-post-glava"><p className={styles.eyebrow}>POSTAVKE RAČUNA</p><button type="button" className="rc-dodaj" onClick={() => setVrstice(v => [...v, novaVrstica()])}>+ Dodaj postavko</button></div>
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

        <div className={styles.invoiceSubmit}><label className={styles.invoiceCheck}><input type="checkbox" checked={placano} onChange={event => setPlacano(event.target.checked)} /> Račun je že plačan</label><button>Shrani račun</button></div>
        {napaka && <p className="rc-napaka">{napaka}</p>}
      </form>
    </section>}

    {/* ── POGLED: PREGLED (arhiv) — vrstica kot pri pogodbah: klik odpre detajl ── */}
    {pogled === 'pregled' && <>
      <section className={styles.invoiceArchive}>
        <header><div><p className={styles.eyebrow}>PREGLED RAČUNOV</p><h2>Vse številke na enem mestu.</h2></div></header>
        {invoices.length > 0 && <div className="rc-filter-vrstica">
          {/* skupni vzorec: [lupa -> razsirjen input] [Filtri -> sheet s pilulami] */}
          <ArhivFilter iskanje={iskanje} onIskanje={setIskanje} placeholder="Poišči račun ali stranko …" aktivnihFiltrov={(filter !== 'all' ? 1 : 0) + (obdobje !== 'vse' ? 1 : 0)} onPocisti={() => { setFilter('all'); setObdobje('vse'); setObdobjeOd(''); setObdobjeDo(''); }}>
            <div className="rc-f-skupina">
              <p className="rc-f-naslov">Status</p>
              <div className="rc-f-pilule" role="group" aria-label="Status">
                {(['all', 'open', 'paid'] as const).map(value => <button key={value} type="button" aria-label={value === 'all' ? 'Vsi' : value === 'open' ? 'Odprti' : 'Plačani'} className={filter === value ? 'on' : ''} onClick={() => setFilter(value)}>{value === 'all' ? 'Vsi' : value === 'open' ? 'Odprti' : 'Plačani'}</button>)}
              </div>
            </div>
            <div className="rc-f-skupina">
              <p className="rc-f-naslov">Obdobje</p>
              <div className="rc-f-pilule" role="group" aria-label="Obdobje">
                {([['vse', 'Vse'], ['letos', 'Letos'], ['30', 'Zadnjih 30 dni'], ['obdobje', 'Po meri']] as const).map(([vrednost, napis]) => (
                  <button key={vrednost} type="button" aria-label={napis} className={obdobje === vrednost ? 'on' : ''} onClick={() => setObdobje(vrednost)}>{napis}</button>
                ))}
              </div>
              {obdobje === 'obdobje' && <div className="rc-f-obdobje">
                <label className="rc-f-polje">Od<input type="date" value={obdobjeOd} onChange={event => setObdobjeOd(event.target.value)} /></label>
                <label className="rc-f-polje">Do<input type="date" value={obdobjeDo} onChange={event => setObdobjeDo(event.target.value)} /></label>
              </div>}
            </div>
          </ArhivFilter>
        </div>}
        {visible.length ? <div className={styles.invoiceList}>{visible.map(invoice => {
          const offer = offers.find(item => item.id === invoice.sourceOfferId);
          return <article key={invoice.id} className="rc-arh-vrstica">
            <button className={styles.contractOpen} type="button" onClick={() => odpriDetajl(invoice.id)}>
              <span className={styles.invoiceDocIcon}><Receipt size={18} weight="regular" /></span>
              <span>
                <strong>{invoice.title || `Račun ${invoice.number || ''}`}</strong>
                <small>Račun {invoice.number || '—'} · {invoice.client}</small>
              </span>
            </button>
            <div className="rc-arh-znesek"><strong>{money(invoice.amount)}</strong><small>{new Date(invoice.date).toLocaleDateString('sl-SI')}</small></div>
            <div className={`${styles.invoiceSource} rc-arh-vir`}>{offer ? <><span>Povezan s ponudbo</span><strong>{offer.title}</strong></> : <><span>Brez ponudbe</span><strong>Samostojen račun</strong></>}</div>
            <select aria-label={`Status računa ${invoice.number || invoice.title || ''}`} value={invoice.paid ? 'paid' : 'open'} onChange={event => markPaid(invoice.id, event.target.value === 'paid')}><option value="open">Odprt</option><option value="paid">Plačan</option></select>
            <button className={styles.contractArrow} type="button" onClick={() => odpriDetajl(invoice.id)} aria-label={`Odpri račun ${invoice.number || invoice.title || ''}`}>›</button>
          </article>;
        })}</div> : <div className={styles.invoiceEmpty}>{invoices.length ? 'Ni računov za ta filter.' : 'V tem pogledu še ni računov.'}</div>}
      </section>
      <p className={styles.invoiceHint}>Račun, ki ga preneseš ali pošlješ na koncu <Link href={`${base}/kalkulator/orodje`}>kalkulatorja</Link>, se tukaj shrani samodejno.</p>
    </>}

    {/* ── detajl racuna (arhiv) — KOPIJA vzorca iz ContractWorkspace ── */}
    {detajl && (() => {
      const offer = offers.find(item => item.id === detajl.sourceOfferId);
      const izdaja = new Date(detajl.date);
      const rok = new Date(izdaja.getTime() + (detajl.dueDays ?? PRIVZETI_ROK_DNI) * 864e5);
      return <div className={styles.detailBackdrop} role="presentation" onMouseDown={() => setDetajlId('')}>
        <aside className={`${styles.detailPanel} ${styles.contractDetail}`} role="dialog" aria-modal="true" aria-labelledby="invoice-detail-title" onMouseDown={event => event.stopPropagation()}>
          {/* sticky: X ostane v zgornjem desnem kotu tudi med drsenjem po racunu */}
          <button className="rc-det-x" onClick={() => setDetajlId('')} aria-label="Zapri">✕</button>
          <p className={styles.eyebrow}>RAČUN · {detajl.paid ? 'Plačan' : 'Odprt'}</p>
          <h2 id="invoice-detail-title">Račun {detajl.number || ''}</h2>
          <div className="rc-det-meta">
            <span><small>Stranka</small><strong>{detajl.client}</strong></span>
            <span><small>Datum izdaje</small><strong>{izdaja.toLocaleDateString('sl-SI')}</strong></span>
            {detajl.serviceDate && <span><small>Datum storitve</small><strong>{new Date(detajl.serviceDate).toLocaleDateString('sl-SI')}</strong></span>}
            <span><small>Rok plačila</small><strong>{rok.toLocaleDateString('sl-SI')}</strong></span>
            <span><small>Znesek za plačilo</small><strong>{money(detajl.amount)}</strong></span>
          </div>
          {/* ena klikabilna vrstica ponudbe (kot pogodbe); ce racun ni povezan, je ni */}
          {offer && <div className="rc-det-ponudba">
            <button type="button" className="rc-det-ponudba-vrstica" aria-expanded={detPonOdprta} aria-label={`Ponudba ${offer.number || offer.title} — prikaži povzetek`} onClick={() => setDetPonOdprta(v => !v)}>
              <span className="rc-kp-ikona" aria-hidden>⌁</span>
              <span className="rc-det-ponudba-ime">Ponudba {offer.number || offer.title}</span>
              <span className="rc-det-ponudba-kazalec" aria-hidden>{detPonOdprta ? <CaretUp size={13} weight="bold" /> : <CaretDown size={13} weight="bold" />}</span>
            </button>
            {detPonOdprta && <div className="rc-kp-vec">
              <p className="rc-det-ponudba-naslov"><b>{offer.title}</b>{offer.agreedAmount > 0 ? ' · ' + money(offer.agreedAmount) : ''}</p>
              {offer.scope.length
                ? <ul>{offer.scope.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul>
                : <p className="rc-mini">Ponudba nima vpisanega obsega.</p>}
              <a className="rc-povezava" href={`${base}/kalkulator/projekti`}>Odpri v projektih ↗</a>
            </div>}
          </div>}
          {/* celoten racun kot dokument: ISTI HTML kot PDF pot (racunTelo), izrisan v belem okvirju */}
          <div className="rc-doktelo" dangerouslySetInnerHTML={{ __html: racunTelo(detajl) }} />
          <div className="rc-det-akcije">
            <button type="button" className="rc-gumb" aria-label="Prenesi PDF" disabled={pdfId === detajl.id} onClick={() => prenesiPdf(detajl)}>{pdfId === detajl.id ? 'Pripravljam …' : 'Prenesi PDF'}</button>
            <button type="button" className="rc-gumb sek" aria-label="Pošlji v plačilo" onClick={() => posljiVPlacilo(detajl)}>Pošlji v plačilo</button>
            <label className={styles.invoiceCheck}><input type="checkbox" checked={detajl.paid} onChange={event => markPaid(detajl.id, event.target.checked)} /> Plačan</label>
          </div>
          {napaka && <p className="rc-napaka">{napaka}</p>}
        </aside>
      </div>;
    })()}

    <style>{`
      /* rc- = novi stili obrazca za racun; pazi na .shell pravila (min-height 2.75rem
         na inputih, select padding-right 3rem !important) — mere so temu prilagojene. */
      .rc .rc-postavke{min-width:0;padding:1rem;border:1px solid var(--line);border-radius:.9rem;background:linear-gradient(135deg,oklch(98% .018 87),oklch(96% .025 62))}
      .rc .rc-postavke *{box-sizing:border-box;min-width:0}
      .rc .rc-post-glava{display:flex;align-items:center;justify-content:space-between;gap:.7rem;flex-wrap:wrap}
      .rc .rc-dodaj{padding:.45rem .9rem;border:1px dashed color-mix(in oklch,var(--ink) 35%,transparent);border-radius:999px;background:transparent;color:var(--ink);font:700 .6rem var(--font-sans),sans-serif;cursor:pointer;transition:border-color .15s ease,background .15s ease}
      .rc .rc-dodaj:hover{border-color:var(--ink);background:oklch(100% 0 0/.5)}
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
      /* na svoji strani je obrazec en stolpec (modul ima 2 koloni za inline vgradnjo) */
      .rc .rc-obrazec{grid-template-columns:1fr}
      .rc .rc-nazaj-vrh{margin:0 0 .2rem;justify-self:start}
      .rc .rc-povezava{font-family:inherit;font-size:.88rem;font-weight:500;cursor:pointer;border:none;background:none;color:var(--ink);text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:.28em;padding:0;display:inline-flex;align-items:center;gap:.38rem}
      .rc .rc-povezava:hover{opacity:.6}
      .rc .rc-mini{font-size:.8rem;color:rgba(17,17,17,.55)}

      /* ── vrstica arhiva (kot pogodbe): ikona+naslov | znesek/datum | ponudba | status | › ── */
      .rc .rc-arh-vrstica{grid-template-columns:minmax(0,1.6fr) minmax(7rem,auto) minmax(9rem,.7fr) auto 1.8rem}
      .rc .rc-arh-vrstica strong,.rc .rc-arh-vrstica small{overflow-wrap:anywhere}
      /* status select mora obdrzati chevron: modulov shorthand background ga povozi,
         zato background-COLOR + eksplicitna slika puscice (kot .shell select) */
      .rc .rc-arh-vrstica select{width:10rem;padding:.45rem 3.25rem .45rem 1rem !important;border:1px solid var(--line);border-radius:999px;background-color:oklch(98% .01 87);background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'%3E%3Cpath d='m5 7.5 5 5 5-5' fill='none' stroke='%231c1815' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 1rem center !important;appearance:none;font-weight:700}
      /* enako za selecte v obrazcu (Ponudba, DDV) — modulov background: jim vzame puscico */
      .rc .rc-obrazec select{background-color:oklch(100% 0 0/.8);background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'%3E%3Cpath d='m5 7.5 5 5 5-5' fill='none' stroke='%231c1815' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 1rem center !important;appearance:none}
      /* selektorji namenoma s .rc-arh-vrstica predpono: modul ima pravila z
         div:nth-child(3) (specificnost 0,2,2), ki bi sicer povozila postavitev */
      @media (max-width:980px){
        .rc .rc-arh-vrstica{grid-template-columns:minmax(0,1fr) auto 1.8rem}
        .rc .rc-arh-vrstica>button:first-child{grid-column:1;grid-row:1}
        .rc .rc-arh-vrstica .rc-arh-znesek{grid-column:2;grid-row:1}
        .rc .rc-arh-vrstica>button:last-child{grid-column:3;grid-row:1}
        .rc .rc-arh-vrstica select{grid-column:1/-1;grid-row:2;justify-self:start}
        .rc .rc-arh-vrstica .rc-arh-vir{grid-column:1/-1;grid-row:3;padding:.5rem 0 0;border-left:0;border-top:1px solid var(--line)}
      }

      /* ── detajl racuna: lepljivi X + meta kartice + vrstica ponudbe (KOPIJA pg- vzorcev) ── */
      .rc .rc-det-x{position:sticky;top:0;z-index:6;align-self:flex-end;flex:0 0 auto;display:grid;place-items:center;width:2.2rem;height:2.2rem;margin:0 0 -2.2rem;padding:0;border:1px solid rgba(17,17,17,.18);border-radius:50%;background:var(--paper);color:var(--ink);font-size:1rem;line-height:1;cursor:pointer;box-shadow:0 4px 14px rgba(17,17,17,.12)}
      .rc .rc-det-x:hover{background:var(--ink);color:var(--paper)}
      .rc .rc-det-meta{display:grid;grid-template-columns:1fr 1fr;gap:.45rem;min-width:0}
      .rc .rc-det-meta span{display:grid;gap:.25rem;padding:.7rem;border-radius:.7rem;background:oklch(94% .025 87);min-width:0}
      .rc .rc-det-meta small{color:rgba(17,17,17,.55);font-size:.72rem}
      .rc .rc-det-meta strong{font-size:.85rem;line-height:1.35;overflow-wrap:anywhere}
      .rc .rc-det-ponudba{margin-top:.45rem;border:1px solid rgba(17,17,17,.12);border-radius:.7rem;background:rgba(255,255,255,.72);overflow:hidden;min-width:0;flex:0 0 auto}
      .rc .rc-det-ponudba-vrstica{display:flex;align-items:center;gap:.7rem;width:100%;padding:.65rem .8rem;border:none;background:none;font:inherit;color:var(--ink);text-align:left;cursor:pointer;min-width:0}
      .rc .rc-det-ponudba-vrstica:hover .rc-det-ponudba-ime{text-decoration:underline;text-underline-offset:.2rem}
      .rc .rc-det-ponudba-ime{flex:1;min-width:0;font-size:.88rem;font-weight:700;overflow-wrap:anywhere}
      .rc .rc-det-ponudba-kazalec{display:grid;place-items:center;width:1.6rem;height:1.6rem;border-radius:50%;background:rgba(17,17,17,.06);color:var(--ink);font-size:1.05rem;line-height:1;flex:none}
      .rc .rc-kp-ikona{display:grid;place-items:center;width:2.1rem;height:2.1rem;border-radius:50%;background:oklch(92% .055 163);color:oklch(48% .14 164);flex:none}
      .rc .rc-kp-vec{padding:.15rem .8rem .9rem;border-top:1px dashed rgba(17,17,17,.12)}
      .rc .rc-kp-vec ul{margin:.7rem 0 .8rem;padding-left:1.15rem;font-size:.85rem;line-height:1.55;color:rgba(17,17,17,.8)}
      .rc .rc-kp-vec li{margin:.15rem 0}
      .rc .rc-det-ponudba-naslov{margin:.6rem 0 .2rem;font-size:.85rem}

      /* ── celoten racun kot dokument (beli okvir kot .pg-doktelo; rac-* iz PDF poti) ──
         BREZ max-height/overflow: okvir se razsiri po vsi visini, drsi CEL detajl panel
         (en sam scroll); vodoravno se vsebina prilagodi sirini, ne drsi */
      .rc .rc-doktelo{flex:0 0 auto;width:100%;min-width:0;margin:1rem 0 0;border:1px solid rgba(17,17,17,.22);border-radius:6px;background:#fff;padding:1.35rem;color:var(--ink);font-family:var(--font-sans),system-ui,sans-serif;font-size:.86rem;line-height:1.55;overflow-wrap:anywhere}
      .rc .rc-doktelo .rac-head{display:flex;justify-content:space-between;align-items:flex-start;gap:1.4rem;margin:0 0 1.2rem;flex-wrap:wrap}
      .rc .rc-doktelo .rac-title{display:flex;flex-direction:column;gap:2px}
      .rc .rc-doktelo .rac-kicker{font-size:.62rem;letter-spacing:.28em;text-transform:uppercase;color:var(--accent,#B25476);font-weight:700}
      .rc .rc-doktelo .rac-no{font-family:var(--font-serif),Didot,Georgia,serif;font-size:clamp(1.6rem,3vw,2rem);font-weight:600;color:#111;line-height:1.05;overflow-wrap:anywhere}
      .rc .rc-doktelo .rac-meta{font-size:.68rem;color:#444;text-align:right;line-height:1.5}
      .rc .rc-doktelo .rac-meta b{display:block;font-size:.56rem;letter-spacing:.12em;text-transform:uppercase;color:var(--accent,#B25476);margin-top:.45rem}
      .rc .rc-doktelo .rac-stranki{margin:0 0 1.1rem;font-size:.8rem;color:#222;line-height:1.6}
      .rc .rc-doktelo .rac-l{display:block;font-size:.56rem;letter-spacing:.14em;text-transform:uppercase;color:#8a8177;margin-bottom:.25rem}
      .rc .rc-doktelo .rac-tabela{width:100%;border-collapse:collapse;margin:.5rem 0 .9rem;font-size:.74rem;color:#222}
      .rc .rc-doktelo .rac-tabela th{text-align:left;font-size:.56rem;letter-spacing:.1em;text-transform:uppercase;color:#8a8177;border-bottom:1.5px solid var(--accent,#B25476);padding:0 .5rem .45rem;font-weight:700}
      .rc .rc-doktelo .rac-tabela td{padding:.55rem .5rem;border-bottom:1px solid #ece3d8;vertical-align:top}
      .rc .rc-doktelo .rac-tabela th:not(:first-child),.rc .rc-doktelo .rac-tabela td:not(:first-child){text-align:right;white-space:nowrap}
      .rc .rc-doktelo .rac-vsote{margin-left:auto;width:min(19rem,100%);font-size:.8rem;color:#222}
      .rc .rc-doktelo .rac-vsote>div{display:flex;justify-content:space-between;gap:.8rem;padding:.3rem .5rem}
      .rc .rc-doktelo .rac-skupaj{border-top:1.5px solid var(--accent,#B25476);margin-top:.25rem;font-family:var(--font-serif),Didot,Georgia,serif;font-size:.95rem;font-weight:600;color:#111}
      .rc .rc-doktelo .rac-placilo{margin:1.2rem 0 0;font-size:.76rem;color:#222;background:#f8f5ee;border:1px solid #eadfce;border-radius:9px;padding:.8rem 1rem;line-height:1.7;overflow-wrap:anywhere}
      .rc .rc-doktelo .rac-opomba{font-size:.68rem;color:#666;margin:.6rem 0 0}
      .rc .rc-doktelo .rac-noga-txt{font-size:.62rem;color:#9a9088;margin-top:1.3rem}
      .rc .rc-doktelo .rac-placano{display:inline-block;margin:1.1rem 0 0;border:3px solid #2e7d5b;color:#2e7d5b;font-weight:700;letter-spacing:.22em;padding:.35rem 1rem;border-radius:8px;transform:rotate(-5deg);font-size:1.1rem}

      /* akcije na dnu detajla (gumba kot pg-gumb) */
      .rc .rc-det-akcije{display:flex;flex-wrap:wrap;align-items:center;gap:.8rem;margin-top:1.2rem;min-width:0}
      .rc .rc-gumb{position:relative;overflow:hidden;display:inline-flex;align-items:center;gap:.5rem;border:none;border-radius:999px;padding:.85rem 1.6rem;font:inherit;font-weight:600;font-size:.95rem;cursor:pointer;background:var(--ink);color:var(--paper);transition:transform .2s,opacity .2s}
      .rc .rc-gumb:hover{transform:translateY(-2px)}
      .rc .rc-gumb.sek{background:transparent;color:var(--ink);border:1px solid rgba(17,17,17,.28)}
      .rc .rc-gumb:disabled{opacity:.5;cursor:default;transform:none}

      /* ── arhiv: iskalnik + datumski filtri (KOPIJA vzorca iz arhiva pogodb) ── */
      .rc .rc-arhiv-filtri{display:flex;flex-wrap:wrap;align-items:center;gap:.6rem .8rem;margin:0 0 1rem;min-width:0}
      .rc .rc-arhiv-filtri>*{min-width:0}
      /* ovoj z lupo: ikona sedi v pilulo, input brez svojega roba */
      .rc .rc-iskalnik-ovoj{flex:1 1 15rem;max-width:24rem;min-width:0;display:flex;align-items:center;gap:.45rem;box-sizing:border-box;background:rgba(255,255,255,.85);border:1px solid rgba(17,17,17,.16);border-radius:999px;padding:0 .5rem 0 .9rem;color:rgba(17,17,17,.55)}
      .rc .rc-iskalnik-ovoj:focus-within{border-color:var(--ink)}
      .rc .rc-iskalnik{flex:1;width:100%;min-width:0;box-sizing:border-box;font:inherit;font-size:.92rem;font-weight:500;color:var(--ink);background:none;border:none;padding:.55rem .5rem .55rem 0}
      .rc .rc-iskalnik:focus{outline:none}
      .rc .rc-segpills{display:inline-flex;background:rgba(255,255,255,.55);border:1px solid rgba(17,17,17,.1);border-radius:999px;padding:.25rem;gap:.15rem;margin:0}
      .rc .rc-segpills button{border:none;background:transparent;color:var(--ink);font-family:inherit;font-weight:700;font-size:.72rem;letter-spacing:.03em;text-transform:uppercase;padding:.46rem .9rem;border-radius:999px;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:.35rem;transition:background .18s,color .18s}
      .rc .rc-segpills button.on{background:var(--ink);color:var(--paper)}
      /* pilule obdobja: na ozkem vodoravni drs, da "Po meri" ne strli ven */
      @media (max-width:640px){
        .rc .rc-segpills-obdobje{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;max-width:100%;-webkit-mask-image:linear-gradient(90deg,#000 88%,transparent);mask-image:linear-gradient(90deg,#000 88%,transparent)}
        .rc .rc-segpills-obdobje::-webkit-scrollbar{display:none}
        .rc .rc-segpills-obdobje button{white-space:nowrap;flex:none}
      }
      .rc .rc-obdobje-vnos{display:flex;flex-wrap:wrap;gap:.6rem 1rem;width:100%;min-width:0}
      .rc .rc-obdobje-vnos .rc-polje{flex:1 1 9rem;max-width:12rem}
      .rc .rc-polje{display:flex;flex-direction:column;gap:.35rem;font-size:.7rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(17,17,17,.62)}
      .rc .rc-polje input{width:100%;max-width:100%;min-width:0;font:inherit;font-size:.95rem;font-weight:600;letter-spacing:0;text-transform:none;color:var(--ink);background:rgba(255,255,255,.85);border:1px solid rgba(17,17,17,.16);border-radius:10px;padding:.6rem .75rem}
      .rc .rc-polje input:focus{outline:none;border-color:var(--ink)}

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
        .rc .rc-det-meta{grid-template-columns:1fr}
        .rc .rc-doktelo .rac-head{flex-direction:column;gap:.6rem}
        .rc .rc-doktelo .rac-meta{text-align:left}
        .rc .rc-det-akcije .rc-gumb{padding:.8rem 1.25rem}
      }
    `}</style>
  </div>;
}

'use client';

/* RACUNI — obrazec + dokument po slovenski zakonodaji (ZDDV-1, 82. clen).
   Vzorci so KOPIRANI iz RetainerWorkspace (letterhead + DOC_CSS + /api/ponudba-pdf,
   branje nastavitev "Moje podjetje" iz K_NAST) in KalkulatorApp (RACUN_CSS tabela,
   mailto "posljem racun st. ..."). Stari racuni (brez postavk) se delujejo:
   nova polja v FlowInvoice so neobvezna, dokument zanje izpelje eno postavko. */

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
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

  const [creating, setCreating] = useState(false);
  const [offerId, setOfferId] = useState('');
  const [filter, setFilter] = useState<'all' | 'open' | 'paid'>('all');

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
  const visible = invoices.filter(invoice => filter === 'all' || (filter === 'paid' ? invoice.paid : !invoice.paid));
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
    setCreating(value => {
      if (value) return false;
      setStevilka(nextNumber()); setStranka(''); setOfferId('');
      setDatumIzdaje(danesISO()); setDatumStoritve(danesISO()); setRokDni(String(PRIVZETI_ROK_DNI));
      setPlacano(false); setVrstice([novaVrstica()]); setNapaka('');
      return true;
    });
  };

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
    setCreating(false); setOfferId('');
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
    <section className={styles.invoiceSummary}><article><small>Izdano</small><strong>{money(totals.issued)}</strong><span>{invoices.length} računov</span><b className={styles.subpageMetricIcon}><MetricIcon type="document" /></b></article><article><small>Plačano</small><strong>{money(totals.paid)}</strong><span>potrjena plačila</span><b className={styles.subpageMetricIcon}><MetricIcon type="paid" /></b></article><article><small>Odprto</small><strong>{money(totals.open)}</strong><span>še čaka plačilo</span><b className={styles.subpageMetricIcon}><MetricIcon type="profit" /></b></article><button onClick={odpriObrazec}><span>+</span><strong>Nov račun</strong><small>Iz ponudbe ali brez nje</small></button></section>

    {creating && <section className={styles.invoiceCreator}>
      <div>
        <p className={styles.eyebrow}>NOV RAČUN</p>
        <h2>Vse sestavine po zakonu.</h2>
        <p>Če obstaja ponudba, jo izberi — stranka in postavka se predizpolnita. Podatki izdajatelja (naziv, naslov, davčna, TRR) se berejo iz nastavitev Moje podjetje in se izpišejo v glavi računa.</p>
      </div>
      <form onSubmit={save}>
        <div className={styles.invoiceMetaFields}>
          <label>Ponudba<select value={offerId} onChange={event => izberiPonudbo(event.target.value)}><option value="">Samostojen račun</option>{offers.map(offer => <option key={offer.id} value={offer.id}>{offer.title} · {offer.client}</option>)}</select></label>
          <label>Številka<input required value={stevilka} onChange={event => setStevilka(event.target.value)} /></label>
          <label>Stranka<input required value={stranka} onChange={event => setStranka(event.target.value)} placeholder="Ime ali podjetje" /></label>
          <label>Datum izdaje<input required type="date" value={datumIzdaje} onChange={event => setDatumIzdaje(event.target.value)} /></label>
          <label>Datum opravljene storitve<input required type="date" value={datumStoritve} onChange={event => setDatumStoritve(event.target.value)} /></label>
          <label>Rok plačila v dneh<input required min="0" type="number" value={rokDni} onChange={event => setRokDni(event.target.value)} /></label>
        </div>

        <div className="rc-postavke">
          <div className="rc-post-glava"><p className={styles.eyebrow}>POSTAVKE RAČUNA</p><button type="button" className="rc-dodaj" onClick={() => setVrstice(v => [...v, novaVrstica()])}>+ Dodaj postavko</button></div>
          {vrstice.map((v, i) => <div key={i} className={'rc-vrstica' + (ddvZavezanec ? '' : ' rc-brez-ddv')}>
            <label className="rc-opis">Opis<input required={i === 0} value={v.opis} onChange={event => popraviVrstico(i, 'opis', event.target.value)} placeholder="Opravljena storitev, obseg ali obdobje …" /></label>
            <label>Kol.<input required min="0" step="0.5" type="number" value={v.kolicina} onChange={event => popraviVrstico(i, 'kolicina', event.target.value)} /></label>
            <label>Cena brez DDV<input required={i === 0} min="0" step="0.01" type="number" value={v.cena} onChange={event => popraviVrstico(i, 'cena', event.target.value)} /></label>
            <label>Popust %<input min="0" max="100" step="0.5" type="number" value={v.popust} onChange={event => popraviVrstico(i, 'popust', event.target.value)} placeholder="0" /></label>
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
        {napaka && creating && <p className="rc-napaka">{napaka}</p>}
      </form>
    </section>}

    <section className={styles.invoiceArchive}><header><div><p className={styles.eyebrow}>PREGLED RAČUNOV</p><h2>Vse številke na enem mestu.</h2></div><div className={styles.invoiceFilters}>{(['all', 'open', 'paid'] as const).map(value => <button key={value} className={filter === value ? styles.invoiceFilterActive : ''} onClick={() => setFilter(value)}>{value === 'all' ? 'Vsi' : value === 'open' ? 'Odprti' : 'Plačani'}</button>)}</div></header>{visible.length ? <div className={styles.invoiceList}>{visible.map(invoice => { const offer = offers.find(item => item.id === invoice.sourceOfferId); return <article key={invoice.id}><span className={styles.invoiceDocIcon}>⌑</span><div><strong>Račun {invoice.number || ''}</strong><small>{invoice.title || 'Račun'} · {invoice.client}</small></div><div><strong>{money(invoice.amount)}</strong><small>{new Date(invoice.date).toLocaleDateString('sl-SI')}</small></div><select value={invoice.paid ? 'paid' : 'open'} onChange={event => markPaid(invoice.id, event.target.value === 'paid')}><option value="open">Odprt</option><option value="paid">Plačan</option></select><div className={styles.invoiceSource}>{offer ? <><span>Povezan s ponudbo</span><strong>{offer.title}</strong></> : <><span>Brez ponudbe</span><strong>Samostojen račun</strong></>}</div><div className="rc-akcije"><button type="button" disabled={pdfId === invoice.id} onClick={() => prenesiPdf(invoice)}>{pdfId === invoice.id ? 'Pripravljam …' : 'Poglej / Prenesi PDF'}</button><button type="button" onClick={() => posljiVPlacilo(invoice)}>Pošlji v plačilo</button></div></article>; })}</div> : <div className={styles.invoiceEmpty}>V tem pogledu še ni računov.</div>}{napaka && !creating && <p className="rc-napaka">{napaka}</p>}</section>
    <p className={styles.invoiceHint}>Račun, ki ga preneseš ali pošlješ na koncu <Link href={`${base}/kalkulator/orodje`}>kalkulatorja</Link>, se tukaj shrani samodejno.</p>

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
      /* akcije v arhivu: cez vso sirino vrstice (mrezo definira modul, zato 1/-1) */
      .rc .rc-akcije{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:.45rem;min-width:0}
      .rc .rc-akcije button{padding:.5rem .95rem;border:1px solid color-mix(in oklch,var(--ink) 25%,transparent);border-radius:999px;background:oklch(100% 0 0/.6);color:var(--ink);font:700 .57rem var(--font-sans),sans-serif;cursor:pointer;transition:background .15s ease,color .15s ease,border-color .15s ease}
      .rc .rc-akcije button:hover:not(:disabled){background:var(--ink);border-color:var(--ink);color:var(--paper)}
      .rc .rc-akcije button:disabled{opacity:.55;cursor:default}
      /* mobilno: NIC cez desni rob pri 390px — postavka se zlozi v 2 stolpca */
      @media (max-width: 760px){
        .rc .rc-vrstica,.rc .rc-vrstica.rc-brez-ddv{grid-template-columns:repeat(2,minmax(0,1fr));align-items:end}
        .rc .rc-opis{grid-column:1/-1}
        .rc .rc-vrstica .rc-znesek b{justify-content:flex-start}
        .rc .rc-x{width:100%;height:2.4rem;border:1px dashed color-mix(in oklch,var(--ink) 30%,transparent);grid-column:1/-1}
        .rc .rc-vsote{width:100%}
      }
      @media (max-width: 480px){
        .rc .rc-akcije{flex-direction:column;align-items:stretch}
        .rc .rc-akcije button{width:100%}
      }
    `}</style>
  </div>;
}

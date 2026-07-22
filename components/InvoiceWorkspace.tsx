'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';
import { loadFlowData, saveFlowCollection, type FlowInvoice } from '@/lib/pinartFlowStore';
import { podatkiZaPredogled, usePredogled } from '@/lib/predogled';
import MetricIcon from '@/components/MetricIcon';

type Offer = { id: string; title: string; client: string; number?: string };
const money = (value: number) => `${value.toLocaleString('sl-SI', { maximumFractionDigits: 2 })} €`;

export default function InvoiceWorkspace({ base }: { base: string }) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [invoices, setInvoices] = useState<FlowInvoice[]>([]);
  /* Demo/Prazno velja za VSE strani (lib/predogled.ts). V teh nacinih je
     urejanje onemogoceno — sicer bi popravek izmisljenega zapisa pisal v pravo bazo. */
  const [nacin] = usePredogled();
  const samoOgled = nacin !== 'mine';

  const [creating, setCreating] = useState(false);
  const [offerId, setOfferId] = useState('');
  const [filter, setFilter] = useState<'all' | 'open' | 'paid'>('all');
  const [description, setDescription] = useState('');

  useEffect(() => {
    const data = podatkiZaPredogled(nacin, loadFlowData());
    setOffers(data.offers.map(({ id, title, client, number }) => ({ id, title, client, number })));
    setInvoices(data.invoices);
  }, [nacin]);

  const selectedOffer = offers.find(item => item.id === offerId);
  const visible = invoices.filter(invoice => filter === 'all' || (filter === 'paid' ? invoice.paid : !invoice.paid));
  const totals = useMemo(() => ({ issued: invoices.reduce((sum, item) => sum + item.amount, 0), paid: invoices.filter(item => item.paid).reduce((sum, item) => sum + item.amount, 0), open: invoices.filter(item => !item.paid).reduce((sum, item) => sum + item.amount, 0) }), [invoices]);

  const nextNumber = () => { const year = new Date().getFullYear(); const count = invoices.filter(item => item.number?.startsWith(String(year))).length + 1; return `${year}-${String(count).padStart(4, '0')}`; };
  const save = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); const invoice: FlowInvoice = { id: crypto.randomUUID(), number: String(data.get('number')), title: String(data.get('title')), client: selectedOffer?.client || String(data.get('client')), amount: Number(data.get('amount')), paid: data.get('paid') === 'on', date: String(data.get('date')), dueDays: Number(data.get('dueDays')) || 8, sourceOfferId: offerId || undefined, source: offerId ? 'offer' : 'manual' }; const next = [invoice, ...invoices]; setInvoices(next); saveFlowCollection('invoices', next); setCreating(false); setOfferId(''); setDescription(''); };
  const markPaid = (id: string, paid: boolean) => { const next = invoices.map(item => item.id === id ? { ...item, paid } : item); setInvoices(next); saveFlowCollection('invoices', next); };

  return <div className={styles.invoicePage}>
    <section className={styles.invoiceSummary}><article><small>Izdano</small><strong>{money(totals.issued)}</strong><span>{invoices.length} računov</span><b className={styles.subpageMetricIcon}><MetricIcon type="document" /></b></article><article><small>Plačano</small><strong>{money(totals.paid)}</strong><span>potrjena plačila</span><b className={styles.subpageMetricIcon}><MetricIcon type="paid" /></b></article><article><small>Odprto</small><strong>{money(totals.open)}</strong><span>še čaka plačilo</span><b className={styles.subpageMetricIcon}><MetricIcon type="profit" /></b></article><button onClick={() => setCreating(value => !value)}><span>+</span><strong>Nov račun</strong><small>Iz ponudbe ali brez nje</small></button></section>
    {creating && <section className={styles.invoiceCreator}><div><p className={styles.eyebrow}>NOV RAČUN</p><h2>Poveži ga z dogovorom.</h2><p>Če obstaja ponudba, jo izberi. Stranka, projekt in opis se povežejo samodejno, vsebino pa lahko popraviš.</p></div><form onSubmit={save}><div className={styles.invoiceMetaFields}><label>Ponudba<select value={offerId} onChange={event => { const id = event.target.value; setOfferId(id); setDescription(offers.find(offer => offer.id === id)?.title || ''); }}><option value="">Samostojen račun</option>{offers.map(offer => <option key={offer.id} value={offer.id}>{offer.title} · {offer.client}</option>)}</select></label><label>Številka<input required name="number" defaultValue={nextNumber()} /></label><label>Stranka<input required={!selectedOffer} name="client" value={selectedOffer?.client || undefined} readOnly={!!selectedOffer} placeholder={selectedOffer ? '' : 'Ime ali podjetje'} /></label><label>Datum izdaje<input required name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></label><label>Rok plačila v dneh<input required name="dueDays" min="0" type="number" defaultValue="8" /></label></div><div className={styles.invoiceLineItem}><p className={styles.eyebrow}>POSTAVKA RAČUNA</p><label>Opis storitev<textarea required name="title" rows={6} value={description} onChange={event => setDescription(event.target.value)} placeholder="Podrobno opiši opravljene storitve, obseg ali obdobje obračuna …" /></label><div><label>Količina<input name="quantity" min="1" step="1" type="number" defaultValue="1" /></label><label>Znesek brez DDV<input required name="amount" min="0" step="0.01" type="number" /></label></div></div><div className={styles.invoiceSubmit}><label className={styles.invoiceCheck}><input name="paid" type="checkbox" /> Račun je že plačan</label><button>Shrani račun</button></div></form></section>}
    <section className={styles.invoiceArchive}><header><div><p className={styles.eyebrow}>PREGLED RAČUNOV</p><h2>Vse številke na enem mestu.</h2></div><div className={styles.invoiceFilters}>{(['all', 'open', 'paid'] as const).map(value => <button key={value} className={filter === value ? styles.invoiceFilterActive : ''} onClick={() => setFilter(value)}>{value === 'all' ? 'Vsi' : value === 'open' ? 'Odprti' : 'Plačani'}</button>)}</div></header>{visible.length ? <div className={styles.invoiceList}>{visible.map(invoice => { const offer = offers.find(item => item.id === invoice.sourceOfferId); return <article key={invoice.id}><span className={styles.invoiceDocIcon}>⌑</span><div><strong>Račun {invoice.number || ''}</strong><small>{invoice.title || 'Račun'} · {invoice.client}</small></div><div><strong>{money(invoice.amount)}</strong><small>{new Date(invoice.date).toLocaleDateString('sl-SI')}</small></div><select value={invoice.paid ? 'paid' : 'open'} onChange={event => markPaid(invoice.id, event.target.value === 'paid')}><option value="open">Odprt</option><option value="paid">Plačan</option></select><div className={styles.invoiceSource}>{offer ? <><span>Povezan s ponudbo</span><strong>{offer.title}</strong></> : <><span>Brez ponudbe</span><strong>Samostojen račun</strong></>}</div></article>; })}</div> : <div className={styles.invoiceEmpty}>V tem pogledu še ni računov.</div>}</section>
    <p className={styles.invoiceHint}>Račun, ki ga preneseš ali pošlješ na koncu <Link href={`${base}/kalkulator/orodje`}>kalkulatorja</Link>, se tukaj shrani samodejno.</p>
  </div>;
}

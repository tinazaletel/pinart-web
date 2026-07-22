'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Handshake, Receipt, Wallet, Tag, Clock, FileText, CheckCircle, TrendUp, Stack, Scroll, Suitcase } from '@phosphor-icons/react';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';
import { loadFlowData, saveFlowCollection, saveOfferAmount, saveOfferStatus } from '@/lib/pinartFlowStore';
import { recordAccountingExport, saveBusinessGoal, saveCloudSettings } from '@/lib/pinartFlowCloud';
import { demoPodatki, usePredogled } from '@/lib/predogled';

type Offer = { id: string; title: string; client: string; date: string; status: OfferStatus; scope?: string[]; offerNumber?: string };
type OfferStatus = 'draft' | 'sent' | 'accepted' | 'rejected';
type Expense = { id: string; title: string; client: string; amount: number; date: string };
type Invoice = { id: string; client: string; amount: number; paid: boolean; date: string; sourceOfferId?: string };
type ContractStatus = 'draft' | 'received' | 'review' | 'active' | 'signed';
type Contract = { id: string; title: string; client: string; date: string; status: ContractStatus; sourceOfferId?: string; body?: string; fileName?: string; notes?: string };
type ClientRecord = { id: string; name: string; email: string; phone: string; tax: string };
type HistoryItem = { id: string; type: string; title: string; client: string; date: string; status: string; sourceOfferId?: string };
type ArchivedOffer = { datum?: string; nazivPonudbe?: string; narocnikPonudbe?: string; stevilkaPonudbe?: string; vrstice?: Array<{ ime?: string; kolicina?: number }> };
type Period = 'month' | 'quarter' | 'year';

const STATUS: Record<OfferStatus, string> = {
  draft: 'Osnutek', sent: 'Čaka', accepted: 'Sprejeta', rejected: 'Zavrnjena',
};
const money = (value: number) => `${value.toLocaleString('sl-SI', { maximumFractionDigits: 0 })} €`;

/* Ikone poenotene na Phosphor (kot kalkulator/retainer). Inline fill/stroke
   preglasi stare stroke-based CSS pravila (fill:none), da so Phosphor vidne. */
const IKONA_SLOG = { fill: 'currentColor', stroke: 'none' } as const;
function ToolIcon({ type }: { type: 'offer' | 'contract' | 'pogodba' | 'invoice' | 'expense' | 'prices' | 'time' | 'plan' }) {
  const P = type === 'offer' ? FileText : type === 'contract' ? Handshake : type === 'pogodba' ? Scroll : type === 'plan' ? Suitcase : type === 'invoice' ? Receipt : type === 'expense' ? Wallet : type === 'prices' ? Tag : Clock;
  return <P className={styles.toolIcon} weight="regular" style={IKONA_SLOG} />;
}

function ResultIcon({ type }: { type: 'issued' | 'paid' | 'cost' | 'profit' }) {
  const P = type === 'issued' ? FileText : type === 'paid' ? CheckCircle : type === 'cost' ? Wallet : TrendUp;
  return <P size={36} weight="regular" style={IKONA_SLOG} />;
}

function HistoryIcon({ type }: { type: string }) {
  const P = type === 'Ponudba' ? FileText : type === 'Pogodba' ? Scroll : type === 'Račun' ? Receipt : Stack;
  return <P size={17} weight="regular" style={IKONA_SLOG} />;
}

export default function BusinessOverview({ base }: { base: string }) {
  const [ready, setReady] = useState(false);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [clientRecords, setClientRecords] = useState<ClientRecord[]>([]);
  const [goal, setGoal] = useState(5000);
  const [form, setForm] = useState<'expense' | 'goal' | 'invoice' | 'contract' | 'client' | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<HistoryItem | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [period, setPeriod] = useState<Period>('month');
  /* prej useState -> preklop je veljal SAMO tu in podstrani so ostale prazne */
  const [preview, setPreview] = usePredogled();
  const [contractMode, setContractMode] = useState<'offer' | 'upload'>('offer');
  const [contractOfferId, setContractOfferId] = useState('');
  const [contractBody, setContractBody] = useState('');
  const [invoiceOfferId, setInvoiceOfferId] = useState('');
  const [offerAmounts, setOfferAmounts] = useState<Record<string, number>>({});
  const [recurringCosts, setRecurringCosts] = useState<Array<{ ime: string; znesek: string }>>([]);
  const [desiredIncome, setDesiredIncome] = useState(2000);
  const [reservePercent, setReservePercent] = useState(20);

  /* Isti demo kot na podstraneh (lib/predogled.ts) — prej je imela nadzorna
     plosca svoje izmisljene stranke in zneske, zato se zgodba ni ujemala. */
  const demo = useMemo(() => demoPodatki(), []);

  useEffect(() => {
    try {
      const flow = loadFlowData();
      setOffers(flow.offers.map(item => ({ id: item.id, title: item.title, client: item.client, date: item.date, status: item.status, scope: item.scope, offerNumber: item.number })).sort((a, b) => b.date.localeCompare(a.date)));
      setExpenses(flow.expenses.map(item => ({ ...item, client: item.client || '' })));
      setInvoices(flow.invoices);
      setContracts(flow.contracts);
      setClientRecords(flow.clients.map(item => ({ id: item.id, name: item.name, email: item.email || '', phone: item.phone || '', tax: item.tax || '' })));
      setGoal(Number(localStorage.getItem('pinart-dashboard-goal')) || 5000);
      setOfferAmounts(JSON.parse(localStorage.getItem('pinart-dashboard-offer-amounts') || '{}'));
      const calculatorSettings = JSON.parse(localStorage.getItem('pinart-kalkulator-v2') || '{}');
      setRecurringCosts(Array.isArray(calculatorSettings.stroski) ? calculatorSettings.stroski : []);
    } catch { /* nov ali neveljaven lokalni zapis */ }
    setReady(true);
  }, []);

  const inPeriod = (date: string) => {
    const value = new Date(`${date.slice(0, 10)}T00:00:00`);
    const now = new Date();
    if (period === 'year') return value.getFullYear() === now.getFullYear();
    if (period === 'quarter') return value.getFullYear() === now.getFullYear() && Math.floor(value.getMonth() / 3) === Math.floor(now.getMonth() / 3);
    return value.getFullYear() === now.getFullYear() && value.getMonth() === now.getMonth();
  };
  const activeInvoices = preview === 'demo' ? demo.invoices : preview === 'mine' ? invoices : [];
  const activeExpenses = preview === 'demo' ? demo.expenses : preview === 'mine' ? expenses : [];
  const activeOffers = preview === 'demo' ? demo.offers : preview === 'mine' ? offers : [];
  const activeContracts = preview === 'mine' ? contracts : [];
  const periodInvoices = activeInvoices.filter(i => inPeriod(i.date));
  const periodExpenses = activeExpenses.filter(e => inPeriod(e.date));
  const paid = periodInvoices.filter(i => i.paid).reduce((sum, i) => sum + i.amount, 0);
  const issued = periodInvoices.reduce((sum, i) => sum + i.amount, 0);
  const costs = periodExpenses.reduce((sum, e) => sum + e.amount, 0);
  const profit = paid - costs;
  const periodGoal = goal * (period === 'year' ? 12 : period === 'quarter' ? 3 : 1);
  const progress = periodGoal > 0 ? Math.min(100, Math.round((paid / periodGoal) * 100)) : 0;
  const positiveProfit = Math.max(0, profit);
  const resultTotal = costs + positiveProfit;
  const costShare = resultTotal > 0 ? Math.round((costs / resultTotal) * 100) : 0;
  const profitShare = resultTotal > 0 ? 100 - costShare : 0;
  const waiting = activeOffers.filter(o => o.status === 'sent');
  const recurringTotal = recurringCosts.reduce((sum, item) => sum + (Number(item.znesek) || 0), 0);
  const currentMonthExpenses = expenses.filter(item => {
    const date = new Date(`${item.date}T00:00:00`); const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).reduce((sum, item) => sum + item.amount, 0);
  const goalCostBase = recurringTotal + currentMonthExpenses;
  const recommendedGoal = Math.ceil((goalCostBase + desiredIncome) / Math.max(.05, 1 - reservePercent / 100) / 100) * 100;

  const clients = useMemo(() => {
    const names = new Set([...periodInvoices.map(i => i.client), ...periodExpenses.map(e => e.client)].filter(Boolean));
    return [...names].map(client => {
      const revenue = periodInvoices.filter(i => i.client === client && i.paid).reduce((sum, i) => sum + i.amount, 0);
      const clientCosts = periodExpenses.filter(e => e.client === client).reduce((sum, e) => sum + e.amount, 0);
      return { client, revenue, costs: clientCosts, profit: revenue - clientCosts };
    }).sort((a, b) => b.profit - a.profit);
  }, [periodInvoices, periodExpenses]);

  const changeStatus = (id: string, status: OfferStatus) => {
    const next = offers.map(o => o.id === id ? { ...o, status } : o);
    setOffers(next);
    saveOfferStatus(id, status);
  };

  const saveExpense = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next = [{ id: crypto.randomUUID(), title: String(data.get('title')), client: String(data.get('client')), amount: Number(data.get('amount')), date: String(data.get('date')) }, ...expenses];
    setExpenses(next); saveFlowCollection('expenses', next); setPreview('mine'); setForm(null);
  };

  const saveInvoice = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const sourceOfferId = String(data.get('sourceOfferId') || '');
    const sourceOffer = offers.find(offer => offer.id === sourceOfferId);
    const next = [{ id: crypto.randomUUID(), client: sourceOffer?.client || String(data.get('client')), amount: Number(data.get('amount')), paid: data.get('paid') === 'on', date: String(data.get('date')), sourceOfferId: sourceOfferId || undefined }, ...invoices];
    setInvoices(next); saveFlowCollection('invoices', next); setPreview('mine'); setForm(null);
  };

  const saveGoal = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = Number(new FormData(event.currentTarget).get('goal')) || 0;
    setGoal(next); localStorage.setItem('pinart-dashboard-goal', String(next)); void Promise.all([saveCloudSettings({ monthlyGoal: next }), saveBusinessGoal(next)]); setForm(null);
  };

  const generateContract = () => {
    const offer = offers.find(item => item.id === contractOfferId);
    if (!offer) return;
    setContractBody(`POGODBA O IZVEDBI STORITEV\n\nNaročnik: ${offer.client}\nProjekt: ${offer.title}\n\n1. PREDMET POGODBE\nIzvajalec bo za naročnika izvedel projekt »${offer.title}« skladno s potrjeno ponudbo, ki je sestavni del te pogodbe.\n\n2. OBSEG, CENA IN ROKI\nObseg storitev, cena, roki in plačilni pogoji veljajo, kot so določeni v potrjeni ponudbi. Vsaka dodatna storitev se pred izvedbo pisno potrdi.\n\n3. AVTORSKE PRAVICE\nPravice uporabe končnih rešitev se na naročnika prenesejo po celotnem plačilu, v obsegu, navedenem v ponudbi.\n\n4. POTRDITEV\nPogodba začne veljati, ko jo potrdita obe stranki.\n\nOsnutek pred podpisom pravno preglejte.`);
  };

  const storeContractFile = (id: string, file: File) => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('pinart-flow-files', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('contracts');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const transaction = request.result.transaction('contracts', 'readwrite');
      transaction.objectStore('contracts').put(file, id);
      transaction.oncomplete = () => { request.result.close(); resolve(); };
      transaction.onerror = () => reject(transaction.error);
    };
  });

  const saveContract = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const id = crypto.randomUUID();
    const offer = offers.find(item => item.id === contractOfferId);
    const file = data.get('file');
    if (contractMode === 'upload' && file instanceof File && file.size) await storeContractFile(id, file);
    const contract: Contract = contractMode === 'offer'
      ? { id, title: `Pogodba · ${offer?.title || 'projekt'}`, client: offer?.client || '', date: String(data.get('date')), status: 'draft', sourceOfferId: offer?.id, body: String(data.get('body')) }
      : { id, title: String(data.get('title')), client: String(data.get('client')), date: String(data.get('date')), status: 'received', fileName: file instanceof File ? file.name : undefined, notes: String(data.get('notes')) };
    const next = [contract, ...contracts];
    setContracts(next); saveFlowCollection('contracts', next); setPreview('mine'); setForm(null); setContractBody('');
    setFeedback(contractMode === 'offer' ? 'Osnutek pogodbe je shranjen. Pred podpisom ga preglej.' : 'Pogodba stranke je varno shranjena v tem brskalniku.');
  };

  const allHistoryItems: HistoryItem[] = [
    ...activeOffers.map(o => ({ id: o.id, type: 'Ponudba', title: o.title, client: o.client, date: o.date, status: STATUS[o.status], sourceOfferId: o.id })),
    ...activeContracts.map(c => ({ id: c.id, type: 'Pogodba', title: c.title, client: c.client, date: c.date, status: ({ draft: 'Osnutek', received: 'Prejeta', review: 'V pregledu', active: 'Aktivna', signed: 'Podpisana' } as Record<ContractStatus, string>)[c.status], sourceOfferId: c.sourceOfferId })),
    ...activeInvoices.map(i => ({ id: i.id, type: 'Račun', title: `Račun ${money(i.amount)}`, client: i.client, date: i.date, status: i.paid ? 'Plačan' : 'Odprt', sourceOfferId: i.sourceOfferId })),
    ...activeExpenses.map(e => ({ id: e.id, type: 'Strošek', title: e.title, client: e.client || '—', date: e.date, status: money(e.amount) })),
  ].sort((a, b) => b.date.localeCompare(a.date));
  const historyItems = showAll ? allHistoryItems : allHistoryItems.slice(0, 8);
  const statusTone = (status: string) => status === 'Čaka' || status === 'Odprt' || status === 'V pregledu' ? 'waiting' : status === 'Sprejeta' || status === 'Podpisana' || status === 'Plačan' || status === 'Aktivna' ? 'success' : status === 'Zavrnjena' ? 'danger' : 'neutral';
  const statusOptions = (type: string) => type === 'Ponudba' ? ['Osnutek', 'Čaka', 'Sprejeta', 'Zavrnjena'] : type === 'Pogodba' ? ['Prejeta', 'V pregledu', 'Osnutek', 'Aktivna', 'Podpisana'] : type === 'Račun' ? ['Odprt', 'Plačan'] : [];
  const updateDocumentStatus = (type: string, id: string, label: string) => {
    if (type === 'Ponudba') {
      const value = ({ Osnutek: 'draft', 'Čaka': 'sent', Sprejeta: 'accepted', Zavrnjena: 'rejected' } as Record<string, OfferStatus>)[label];
      changeStatus(id, value);
    } else if (type === 'Pogodba') {
      const value = ({ Prejeta: 'received', 'V pregledu': 'review', Osnutek: 'draft', Aktivna: 'active', Podpisana: 'signed' } as Record<string, ContractStatus>)[label];
      const next = contracts.map(c => c.id === id ? { ...c, status: value } : c);
      setContracts(next); saveFlowCollection('contracts', next);
    } else if (type === 'Račun') {
      const next = invoices.map(i => i.id === id ? { ...i, paid: label === 'Plačan' } : i);
      setInvoices(next); saveFlowCollection('invoices', next);
    }
  };

  const saveClient = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next = [{ id: crypto.randomUUID(), name: String(data.get('name')), email: String(data.get('email')), phone: String(data.get('phone')), tax: String(data.get('tax')) }, ...clientRecords];
    setClientRecords(next); saveFlowCollection('clients', next); setForm(null); setFeedback('Stranka je shranjena.');
  };

  const setOfferAmount = (id: string, amount: number) => {
    const next = { ...offerAmounts, [id]: amount };
    setOfferAmounts(next);
    saveOfferAmount(id, amount);
  };

  const exportAccounting = async () => {
    const quote = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = [['Vrsta', 'Datum', 'Stranka', 'Opis', 'Znesek EUR', 'Status']];
    invoices.forEach(i => rows.push(['Izdani račun', i.date, i.client, 'Račun', String(i.amount), i.paid ? 'Plačan' : 'Odprt']));
    expenses.forEach(e => rows.push(['Strošek', e.date, e.client, e.title, String(e.amount), 'Vnesen']));
    const csv = '\uFEFF' + rows.map(row => row.map(quote).join(';')).join('\r\n');
    const file = new File([csv], `pinart-racunovodstvo-${new Date().toISOString().slice(0, 10)}.csv`, { type: 'text/csv;charset=utf-8' });
    try {
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: 'Pinart Flow · Računovodstvo', text: 'Izdani računi in stroški', files: [file] });
        const dates = [...invoices.map(item => item.date), ...expenses.map(item => item.date)].sort();
        await recordAccountingExport({ periodStart: dates[0] || new Date().toISOString().slice(0, 10), periodEnd: dates.at(-1) || new Date().toISOString().slice(0, 10), invoiceCount: invoices.length, expenseCount: expenses.length, sent: true });
        setFeedback('Datoteka je pripravljena za deljenje.');
      } else {
        const url = URL.createObjectURL(file); const link = document.createElement('a'); link.href = url; link.download = file.name; link.click(); URL.revokeObjectURL(url);
        const dates = [...invoices.map(item => item.date), ...expenses.map(item => item.date)].sort();
        await recordAccountingExport({ periodStart: dates[0] || new Date().toISOString().slice(0, 10), periodEnd: dates.at(-1) || new Date().toISOString().slice(0, 10), invoiceCount: invoices.length, expenseCount: expenses.length });
        setFeedback('CSV je prenesen. Pošlji ga svojemu računovodstvu.');
      }
    } catch { setFeedback('Deljenje je bilo preklicano.'); }
  };

  const openContractFile = (id: string) => {
    const request = indexedDB.open('pinart-flow-files', 1);
    request.onsuccess = () => {
      const transaction = request.result.transaction('contracts', 'readonly');
      const get = transaction.objectStore('contracts').get(id);
      get.onsuccess = () => {
        if (!(get.result instanceof Blob)) return;
        const url = URL.createObjectURL(get.result);
        window.open(url, '_blank', 'noopener,noreferrer');
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      };
      transaction.oncomplete = () => request.result.close();
    };
  };

  if (!ready) return <div className={styles.loading}>Pripravljam tvoj poslovni pregled …</div>;

  /* v spremenljivko: ponovljen clients[0] v JSX prevajalniku ne dokaze, da
     element obstaja, tudi ce je pogoj clients[0] */
  const najboljsaStranka = clients[0];
  /* ime je lahko prazno: strosek sme biti brez stranke */
  const imeNajboljse = najboljsaStranka?.client || 'Brez stranke';

  return (
    <>
      <div className={styles.previewBar}><div><strong>Predogled stanja</strong><span>Primerjaj prvi dan z utečenim poslovanjem.</span></div><div className={styles.previewSwitch}><button className={preview === 'empty' ? styles.previewActive : ''} onClick={() => setPreview('empty')}>Prazno</button><button className={preview === 'mine' ? styles.previewActive : ''} onClick={() => setPreview('mine')}>Moji</button><button className={preview === 'demo' ? styles.previewActive : ''} onClick={() => setPreview('demo')}>Demo</button></div></div>
      {feedback && <div className={styles.feedback} role="status"><span>{feedback}</span><button type="button" onClick={() => setFeedback('')} aria-label="Zapri obvestilo">×</button></div>}
      <section className={styles.flowBand} id="tools" aria-labelledby="tools-title">
        <div className={styles.sectionHeader}><div><p className={styles.eyebrow}>01 · ORODJA</p><h2 id="tools-title">Kaj boš danes uredila?</h2></div></div>
        <div className={styles.sectionNote}><strong>Smart pricing</strong><span>Ko v ponudbo dodaš storitev, Pinart predlaga ceno glede na tvoje izkušnje, trg in naročnika. Vedno jo lahko popraviš.</span></div>
        <div className={styles.flowTools}>
          <Link className={styles.offerTool} href={`${base}/kalkulator/orodje`}>
            <span>01</span><ToolIcon type="offer" /><strong>Ponudba</strong><small>Pametna cena je vključena</small><i>→</i>
          </Link>
          <Link href={`${base}/kalkulator/dolgorocno`}><span>02</span><ToolIcon type="contract" /><strong>Dolgoročno sodelovanje</strong><small>Mesečni retainer — ponudba in pogodba</small><i>→</i></Link>
          <Link href={`${base}/kalkulator/pogodbe`}><span>03</span><ToolIcon type="pogodba" /><strong>Pogodba</strong><small>Iz ponudbe ali dokument stranke</small><i>→</i></Link>
          <Link href={`${base}/kalkulator/racuni`}><span>04</span><ToolIcon type="invoice" /><strong>Račun</strong><small>Iz ponudbe ali na novo</small><i>→</i></Link>
          <Link href={`${base}/kalkulator/stroski`}><span>05</span><ToolIcon type="expense" /><strong>Strošek</strong><small>Projekt, podjetje ali naročnina</small><i>→</i></Link>
          <Link href={`${base}/kalkulator/ceniki`}><span>06</span><ToolIcon type="prices" /><strong>Moji ceniki</strong><small>Profili cen in tvoje storitve</small><i>→</i></Link>
          <Link href={`${base}/kalkulator/cas`}><span>07</span><ToolIcon type="time" /><strong>Cena &amp; čas</strong><small>Zasebni timer in donosnost dela</small><i>→</i></Link>
          <Link href={`${base}/kalkulator/poslovni-nacrt`}><span>08</span><ToolIcon type="plan" /><strong>Poslovni načrt</strong><small>Business Canvas in vodeni načrt</small><i>→</i></Link>
        </div>
      </section>

      {form && <section className={`${styles.inlineForm} ${form === 'contract' ? styles.contractBuilder : ''}`} aria-label="Vnos podatkov">
        <div className={styles.formHeading}><h2>{form === 'expense' ? 'Nov strošek' : form === 'invoice' ? 'Nov račun' : form === 'contract' ? 'Nova pogodba' : form === 'client' ? 'Nova stranka' : 'Mesečni cilj'}</h2><button onClick={() => setForm(null)} aria-label="Zapri">×</button></div>
        {form === 'client' && <form onSubmit={saveClient}>
          <label>Ime ali podjetje<input required name="name" /></label><label>E-pošta<input name="email" type="email" /></label><label>Telefon<input name="phone" /></label><label>Davčna številka<input name="tax" /></label><button type="submit">Shrani stranko</button>
        </form>}
        {form === 'contract' && <>
          <p className={styles.contractIntro}>Pogodba je navadno nadaljevanje potrjene ponudbe. Če pogodbo pošlje stranka, jo naloži in shrani ob projektu.</p>
          <div className={styles.contractModes} role="tablist" aria-label="Način priprave pogodbe">
            <button type="button" className={contractMode === 'offer' ? styles.contractModeActive : ''} onClick={() => setContractMode('offer')}><strong>Iz ponudbe</strong><span>Ustvari besedilo iz dogovorjenega obsega</span></button>
            <button type="button" className={contractMode === 'upload' ? styles.contractModeActive : ''} onClick={() => setContractMode('upload')}><strong>Pogodba stranke</strong><span>Naloži, preglej in shrani dokument</span></button>
          </div>
          {contractMode === 'offer' ? <form className={styles.contractForm} onSubmit={saveContract}>
            <label className={styles.contractWide}>Potrjena ponudba<select required value={contractOfferId} onChange={event => { setContractOfferId(event.target.value); setContractBody(''); }}><option value="">Izberi ponudbo …</option>{offers.map(offer => <option key={offer.id} value={offer.id}>{offer.title} · {offer.client}{offer.status === 'accepted' ? ' · sprejeta' : ''}</option>)}</select></label>
            <label>Datum pogodbe<input required name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></label>
            <button className={styles.generateButton} type="button" disabled={!contractOfferId} onClick={generateContract}>Pripravi osnutek</button>
            {contractBody && <label className={styles.contractEditor}>Besedilo pogodbe<textarea required name="body" rows={16} value={contractBody} onChange={event => setContractBody(event.target.value)} /></label>}
            {contractBody && <div className={styles.contractActions}><small>Osnutek lahko popraviš. Po potrditvi stranke spremeni status v »Podpisana«.</small><button type="submit">Shrani osnutek</button></div>}
          </form> : <form className={styles.contractForm} onSubmit={saveContract}>
            <label>Naziv pogodbe<input required name="title" placeholder="npr. Pogodba za novo identiteto" /></label>
            <label>Stranka<input required name="client" /></label>
            <label>Datum prejema<input required name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></label>
            <label className={styles.fileField}>Dokument PDF ali Word<input required name="file" type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" /></label>
            <label className={styles.contractEditor}>Opombe za pregled<textarea name="notes" rows={5} placeholder="Kaj moraš preveriti, popraviti ali potrditi?" /></label>
            <div className={styles.contractActions}><small>Dokument bo shranjen pri pogodbi in označen kot »Prejeta«.</small><button type="submit">Shrani pogodbo</button></div>
          </form>}
        </>}
        {form === 'expense' && <form onSubmit={saveExpense}>
          <label>Opis<input required name="title" placeholder="npr. Adobe naročnina" /></label>
          <label>Stranka ali projekt<input name="client" placeholder="neobvezno" /></label>
          <label>Znesek<input required min="0" step="0.01" name="amount" type="number" /></label>
          <button type="submit">Shrani strošek</button>
        </form>}
        {form === 'invoice' && <form onSubmit={saveInvoice}>
          <label>Poveži s ponudbo<select name="sourceOfferId" value={invoiceOfferId} onChange={event => setInvoiceOfferId(event.target.value)}><option value="">Račun brez ponudbe</option>{offers.map(offer => <option key={offer.id} value={offer.id}>{offer.title} · {offer.client}</option>)}</select></label>
          <label>Stranka<input name="client" placeholder="samodejno iz ponudbe" /></label>
          <label>Znesek<input required min="0" step="0.01" name="amount" type="number" /></label>
          <label>Datum izdaje<input required name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></label>
          <label className={styles.check}><input name="paid" type="checkbox" /> Račun je plačan</label>
          <button type="submit">Shrani račun</button>
        </form>}
        {form === 'goal' && <form className={styles.goalPlanner} onSubmit={saveGoal}>
          <div className={styles.goalCostSummary}><p className={styles.eyebrow}>TVOJA OSNOVA</p><div><span><small>Redni stroški</small><strong>{money(recurringTotal)}</strong></span><span><small>Vneseni ta mesec</small><strong>{money(currentMonthExpenses)}</strong></span><span><small>Skupaj stroški</small><strong>{money(goalCostBase)}</strong></span></div><Link href={`${base}/kalkulator/stroski`}>Preglej ali dodaj stroške →</Link></div>
          <div className={styles.costSuggestions}><strong>Preveri, ali si vključila:</strong><span>Prispevke za socialno varnost</span><span>Obvezno zdravstveno zavarovanje</span><span>Davke in druge dajatve</span><span>Najemnino in obratovalne stroške</span><span>Računovodstvo, programsko opremo in opremo</span><small>Natančne zneske preveri pri računovodstvu, saj so odvisni od oblike podjetja in tvojega statusa.</small></div>
          <div className={styles.goalInputs}><label>Želeni osebni dohodek<input min="0" step="100" type="number" value={desiredIncome} onChange={event => setDesiredIncome(Number(event.target.value))} /></label><label>Rezerva za davke in nepredvideno<input min="0" max="90" step="1" type="number" value={reservePercent} onChange={event => setReservePercent(Number(event.target.value))} /></label></div>
          <div className={styles.goalRecommendation}><span>Priporočeni mesečni cilj</span><strong>{money(recommendedGoal)}</strong><small>stroški + želeni dohodek + {reservePercent}% rezerve</small><input name="goal" type="hidden" value={recommendedGoal} /><button type="submit">Uporabi ta cilj</button></div>
        </form>}
      </section>}

      <div className={styles.overviewColumns}>
      <section className={styles.historyBand} id="accounting">
        <div className={styles.sectionHeader}><div><p className={styles.eyebrow}>02 · ZGODOVINA</p><h2>Zadnji dokumenti</h2></div><Link className={styles.accountingButton} href={`${base}/kalkulator/racunovodstvo`}>Za računovodstvo</Link></div>
        <div className={styles.sectionNote}><strong>Na enem mestu</strong><span>Spremljaj ponudbe, pogodbe in račune ter vedno veš, kateri dokument potrebuje tvojo pozornost.</span></div>
        {historyItems.length ? <div className={`${styles.tableWrap} ${styles.historyTable}`}><table><thead><tr><th>Dokument</th><th>Stranka</th><th>Datum</th><th>Status</th></tr></thead><tbody>{historyItems.map(item => <tr key={`${item.type}-${item.id}`} role="button" tabIndex={0} aria-label={`Odpri ${item.title}`} onClick={() => setSelectedDocument(item)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedDocument(item); } }}><td><div className={styles.documentCell}><span className={`${styles.documentIcon} ${styles[`document_${item.type === 'Ponudba' ? 'offer' : item.type === 'Pogodba' ? 'contract' : item.type === 'Račun' ? 'invoice' : 'expense'}`]}`}><HistoryIcon type={item.type} /></span><span><strong>{item.title}</strong><small>{item.type}</small></span></div></td><td>{item.client}</td><td>{new Date(item.date).toLocaleDateString('sl-SI')}</td><td>{statusOptions(item.type).length ? <select aria-label={`Status: ${item.title}`} className={`${styles.statusPill} ${styles[`status_${statusTone(item.status)}`]}`} value={item.status} disabled={preview !== 'mine'} title={preview !== 'mine' ? 'To so demo podatki — statusa ni mogoče spreminjati. Preklopi na »Moji podatki«.' : undefined} onClick={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()} onChange={e => updateDocumentStatus(item.type, item.id, e.target.value)}>{statusOptions(item.type).map(option => <option key={option}>{option}</option>)}</select> : <span className={`${styles.statusPill} ${styles.status_neutral}`}>{item.status}</span>}</td></tr>)}</tbody></table>{allHistoryItems.length > 8 && <button className={styles.openAll} type="button" onClick={() => setShowAll(value => !value)}>{showAll ? 'Prikaži manj' : 'Odpri vse dokumente'} <span>{showAll ? '↑' : '→'}</span></button>}</div> : <div className={styles.emptyState}><span>+</span><div><strong>Še nimaš dokumentov.</strong><p>Ponudbe, pogodbe, računi in stroški se bodo prikazali tukaj.</p></div></div>}
      </section>

      <section className={styles.resultsBand} id="clients" aria-labelledby="business-title">
        <div className={styles.sectionHeader}><div><p className={styles.eyebrow}>03 · POSLOVNI REZULTATI</p><h2 id="business-title">Kako ti gre?</h2></div><div className={styles.periodSwitch} aria-label="Obdobje prikaza">{([['month', 'Mesec'], ['quarter', 'Četrtletje'], ['year', 'Leto']] as [Period, string][]).map(([value, label]) => <button type="button" key={value} className={period === value ? styles.periodActive : ''} onClick={() => setPeriod(value)}>{label}</button>)}</div></div>
        <div className={styles.sectionNote}><strong>Dobro je vedeti</strong><span>Plačano ni isto kot izdano. Rezultat temelji na potrjenih plačilih in vnesenih stroških.</span></div>
        <div className={styles.resultsGrid}>
          <div className={styles.kpi}><span>Izdano</span><strong>{money(issued)}</strong><small>{periodInvoices.length} računov</small><b className={styles.resultIcon}><ResultIcon type="issued" /></b></div>
          <div className={styles.kpi}><span>Plačano</span><strong>{money(paid)}</strong><small>{periodInvoices.filter(i => i.paid).length} potrjenih plačil</small><b className={styles.resultIcon}><ResultIcon type="paid" /></b></div>
          <div className={styles.kpi}><span>Stroški</span><strong>{money(costs)}</strong><small>{periodExpenses.length} vnosov</small><b className={styles.resultIcon}><ResultIcon type="cost" /></b></div>
          <div className={`${styles.kpi} ${profit < 0 ? styles.negative : ''}`}><span>Ocenjeni dobiček</span><strong>{money(profit)}</strong><small>plačano minus stroški</small><b className={styles.resultIcon}><ResultIcon type="profit" /></b></div>
          <article className={styles.donutPanel}>
            <div><p className={styles.eyebrow}>RAZMERJE REZULTATA</p><h2>Kam gre tvoj denar?</h2><div className={styles.chartLegend}><span><i className={styles.legendProfit} /> Dobiček {profitShare}%</span><span><i className={styles.legendCost} /> Stroški {costShare}%</span></div></div>
            <div className={`${styles.donut} ${resultTotal === 0 ? styles.donutEmpty : ''}`} style={{ '--cost-share': `${costShare}%` } as React.CSSProperties}><div><strong>{resultTotal ? `${profitShare}%` : '0%'}</strong><small>dobička</small></div></div>
          </article>
          <article className={styles.goalPanel} id="goals">
            <div className={styles.goalCopy}><div className={styles.goalTitleRow}><p className={styles.eyebrow}>{period === 'year' ? 'LETNI CILJ' : period === 'quarter' ? 'ČETRTLETNI CILJ' : 'MESEČNI CILJ'}</p><Link className={styles.goalEdit} href={`${base}/kalkulator/cilji`} aria-label="Uredi cilj" title="Uredi cilj"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 20 4.4-1 9.9-9.9a2.1 2.1 0 0 0-3-3L5.4 16 4 20Z"/><path d="m13.8 7.6 3 3"/></svg></Link></div><h2>{money(periodGoal)}</h2><p>{money(paid)} potrjenih plačil</p></div>
            <div className={styles.goalDial} style={{ '--goal-progress': `${progress}%` } as React.CSSProperties}><div><strong>{progress}%</strong><small>doseženo</small></div></div>
          </article>
          <article className={styles.waitingPanel}><p className={styles.eyebrow}>PONUDBE</p><svg className={styles.chatIcon} viewBox="0 0 32 32" aria-hidden="true"><path d="M5 15a11 11 0 1 1 5 9.2L4 27l1.8-6A10.8 10.8 0 0 1 5 15Z"/><path d="M11 15h.1M16 15h.1M21 15h.1"/></svg><strong>{waiting.length}</strong><span>čaka odgovor</span><small>{activeOffers.length} ponudb skupaj</small></article>
          <article className={styles.clientResult}>
            <p className={styles.eyebrow}>STRANKE</p>
            {najboljsaStranka ? <><strong>{imeNajboljse}</strong><span>najdonosnejša stranka</span><small>{money(najboljsaStranka.profit)} ocenjenega dobička</small><b className={styles.clientAvatar}>{imeNajboljse.split(/\s+/).map(word => word[0] ?? '').join('').slice(0, 2).toUpperCase()}</b></> : <><strong>{clientRecords.length ? clientRecords[0].name : '—'}</strong><span>{clientRecords.length ? `${clientRecords.length} shranjenih strank` : 'Donosnost strank'}</span><small>{clientRecords.length ? clientRecords[0].email : 'Poveži račune in stroške s stranko.'}</small></>}
            <button className={styles.addClient} type="button" onClick={() => setForm('client')}>+ Dodaj stranko</button>
          </article>
        </div>
      </section>
      </div>
      {selectedDocument && <div className={styles.detailBackdrop} role="presentation" onMouseDown={() => setSelectedDocument(null)}><aside className={styles.detailPanel} role="dialog" aria-modal="true" aria-labelledby="detail-title" onMouseDown={e => e.stopPropagation()}><button className={styles.detailClose} type="button" onClick={() => setSelectedDocument(null)} aria-label="Zapri">×</button><p className={styles.eyebrow}>{selectedDocument.type}</p><h2 id="detail-title">{selectedDocument.title}</h2><dl><div><dt>Stranka</dt><dd>{selectedDocument.client}</dd></div><div><dt>Datum</dt><dd>{new Date(selectedDocument.date).toLocaleDateString('sl-SI')}</dd></div><div><dt>Status</dt><dd>{selectedDocument.status}</dd></div></dl>{selectedDocument.type === 'Pogodba' && (() => { const contract = contracts.find(item => item.id === selectedDocument.id); return contract?.fileName ? <button type="button" onClick={() => openContractFile(contract.id)}>Odpri {contract.fileName}</button> : contract?.body ? <pre className={styles.contractPreview}>{contract.body}</pre> : null; })()}{selectedDocument.sourceOfferId && (() => {
        const offer = offers.find(item => item.id === selectedDocument.sourceOfferId);
        const linkedContracts = contracts.filter(item => item.sourceOfferId === selectedDocument.sourceOfferId);
        const linkedInvoices = invoices.filter(item => item.sourceOfferId === selectedDocument.sourceOfferId);
        const billed = linkedInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);
        const agreed = offer ? offerAmounts[offer.id] || 0 : 0;
        return offer ? <section className={styles.projectBundle}><p className={styles.eyebrow}>POVEZAN PROJEKT</p><h3>{offer.title}</h3>{offer.offerNumber && <small>Ponudba {offer.offerNumber}</small>}<label className={styles.agreedAmount}>Dogovorjena vrednost ponudbe<span><input type="number" min="0" step="0.01" value={agreed || ''} onChange={event => setOfferAmount(offer.id, Number(event.target.value))} /> €</span></label><div className={styles.projectScope}><strong>Dogovorjeno v ponudbi</strong>{offer.scope?.length ? <ul>{offer.scope.map((line, index) => <li key={`${line}-${index}`}>{line}</li>)}</ul> : <p>Odpri ponudbo za podroben obseg storitev.</p>}</div><div className={styles.projectTotals}><span><small>Dogovorjeno</small><strong>{agreed ? money(agreed) : '—'}</strong></span><span><small>Zaračunano</small><strong>{money(billed)}</strong></span><span className={agreed && agreed - billed > 0 ? styles.unbilled : ''}><small>Še ni zaračunano</small><strong>{agreed ? money(agreed - billed) : '—'}</strong></span></div><div className={styles.linkedDocuments}>{linkedContracts.map(contract => <span key={contract.id}>Pogodba · {contract.title}</span>)}{linkedInvoices.map(invoice => <span key={invoice.id}>Račun · {money(invoice.amount)} · {invoice.paid ? 'plačan' : 'odprt'}</span>)}</div><button type="button" onClick={() => { setInvoiceOfferId(offer.id); setSelectedDocument(null); setForm('invoice'); }}>+ Dodaj povezan račun</button></section> : null;
      })()}<button type="button" onClick={() => setSelectedDocument(null)}>Končano</button></aside></div>}
    </>
  );
}

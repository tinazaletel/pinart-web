'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Handshake, Receipt, Wallet, Tag, Clock, FileText, CheckCircle, TrendUp, Stack, Scroll, Suitcase, EnvelopeSimple, PaperPlaneRight } from '@phosphor-icons/react';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';
import { loadFlowData, saveFlowCollection, saveOfferAmount, saveOfferStatus } from '@/lib/pinartFlowStore';
import { recordAccountingExport, saveBusinessGoal, saveCloudSettings } from '@/lib/pinartFlowCloud';
import { demoPodatki, usePredogled } from '@/lib/predogled';
import { preberiNaloge } from '@/lib/naloge';
import { preberiVsePoste, type PostaVnos } from '@/lib/postaDnevnik';

/* Demo za nadzorno ploščo (»polno poslovanje«) — naloge + komunikacija */
const DASH_DEMO_NALOGE: { naslov: string; stolpec: string; oseba?: string }[] = [
  { naslov: 'Prototip navigacije in iskalnika', stolpec: 'waiting', oseba: 'Eva Kralj' },
  { naslov: 'Wireframe ključnih strani portala', stolpec: 'in_progress', oseba: 'Luka Beg' },
  { naslov: 'Uskladitev tipografije s CGP', stolpec: 'in_progress', oseba: 'Marko Zupan' },
  { naslov: 'Testiranje dostopnosti (WCAG AA)', stolpec: 'todo', oseba: 'Luka Beg' },
];
const DASH_DEMO_POSTA: { smer: 'poslano' | 'prejeto'; kdo: string; zadeva: string }[] = [
  { smer: 'prejeto', kdo: 'info@rokusklett.si', zadeva: 'Re: Prenova portala — potrditev obsega' },
  { smer: 'poslano', kdo: 'info@rokusklett.si', zadeva: 'Prenova portala — osnutek za pregled' },
  { smer: 'prejeto', kdo: 'ana@rokusklett.si', zadeva: 'Gradiva in dostopi' },
];

type Offer = { id: string; title: string; client: string; date: string; status: OfferStatus; scope?: string[]; offerNumber?: string };
type OfferStatus = 'draft' | 'sent' | 'accepted' | 'rejected';
type Expense = { id: string; title: string; client: string; amount: number; date: string };
type Invoice = { id: string; client: string; amount: number; paid: boolean; date: string; sourceOfferId?: string };
type ContractStatus = 'draft' | 'received' | 'review' | 'active' | 'signed';
type Contract = { id: string; title: string; client: string; date: string; status: ContractStatus; sourceOfferId?: string; body?: string; fileName?: string; notes?: string };
type ClientRecord = { id: string; name: string; email: string; phone: string; tax: string };
type HistoryItem = { id: string; type: string; title: string; subtitle?: string; client: string; date: string; status: string; sourceOfferId?: string };
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
  const locale = useLocale();
  const L = (sl: string, en: string) => (locale === 'en' ? en : sl);
  const dl = locale === 'en' ? 'en-GB' : 'sl-SI';
  const [ready, setReady] = useState(false);
  /* vodoravni slide orodij: puščici ‹ › (desktop) drsata vrsto za ~70 % širine */
  const orodjaRef = useRef<HTMLDivElement>(null);
  const drsniOrodja = (smer: number) => orodjaRef.current?.scrollBy({ left: smer * orodjaRef.current.clientWidth * 0.7, behavior: 'smooth' });
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
  const [dashNaloge, setDashNaloge] = useState<{ naslov: string; stolpec: string; oseba?: string }[]>([]);
  const [dashPosta, setDashPosta] = useState<{ smer: 'poslano' | 'prejeto'; kdo: string; zadeva: string }[]>([]);
  useEffect(() => {
    if (preview === 'empty') { setDashNaloge([]); setDashPosta([]); return; }
    if (preview !== 'mine') { setDashNaloge(DASH_DEMO_NALOGE); setDashPosta(DASH_DEMO_POSTA); return; }
    try {
      setDashNaloge(preberiNaloge().filter(n => n.stolpec !== 'done').sort((a, b) => (a.stolpec === 'waiting' ? -1 : 0) - (b.stolpec === 'waiting' ? -1 : 0)).slice(0, 4).map(n => ({ naslov: n.naslov, stolpec: n.stolpec, oseba: n.dodeljenoOsebaIme })));
      setDashPosta(preberiVsePoste().slice(0, 4).map((v: PostaVnos) => ({ smer: v.smer, kdo: v.prejemniki[0] || '—', zadeva: v.zadeva || '—' })));
    } catch { setDashNaloge([]); setDashPosta([]); }
  }, [preview]);
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
  /* "Začetek" = prvi teden: nekaj demo zapisov, namenoma nepopolno (brez
     pogodb), da se vidi, kako izgledajo delne vsote ob praznih razdelkih.
     Rezine so iste kot v `podatkiZaPredogled`, ki jo uporabljajo podstrani. */
  const zac = preview === 'zacetek';
  const activeInvoices = preview === 'demo' ? demo.invoices : zac ? demo.invoices.slice(0, 1) : preview === 'mine' ? invoices : [];
  const activeExpenses = preview === 'demo' ? demo.expenses : zac ? demo.expenses.slice(0, 2) : preview === 'mine' ? expenses : [];
  const activeOffers = preview === 'demo' ? demo.offers : zac ? demo.offers.slice(0, 2) : preview === 'mine' ? offers : [];
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
    setFeedback(contractMode === 'offer' ? L('Osnutek pogodbe je shranjen. Pred podpisom ga preglej.', 'The contract draft is saved. Review it before signing.') : L('Pogodba stranke je varno shranjena v tem brskalniku.', 'The client contract is safely saved in this browser.'));
  };

  const allHistoryItems: HistoryItem[] = [
    ...activeOffers.map(o => ({ id: o.id, type: 'Ponudba', title: o.title, client: o.client, date: o.date, status: STATUS[o.status], sourceOfferId: o.id })),
    ...activeContracts.map(c => ({ id: c.id, type: 'Pogodba', title: c.title, client: c.client, date: c.date, status: ({ draft: 'Osnutek', received: 'Prejeta', review: 'V pregledu', active: 'Aktivna', signed: 'Podpisana' } as Record<ContractStatus, string>)[c.status], sourceOfferId: c.sourceOfferId })),
    ...activeInvoices.map(i => ({ id: i.id, type: 'Račun', title: 'Račun', subtitle: money(i.amount), client: i.client, date: i.date, status: i.paid ? 'Plačan' : 'Odprt', sourceOfferId: i.sourceOfferId })),
    ...activeExpenses.map(e => ({ id: e.id, type: 'Strošek', title: e.title, client: e.client || '—', date: e.date, status: money(e.amount) })),
  ].sort((a, b) => b.date.localeCompare(a.date));
  const historyItems = showAll ? allHistoryItems : allHistoryItems.slice(0, 4);
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
    setClientRecords(next); saveFlowCollection('clients', next); setForm(null); setFeedback(L('Stranka je shranjena.', 'Client saved.'));
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
        setFeedback(L('Datoteka je pripravljena za deljenje.', 'The file is ready to share.'));
      } else {
        const url = URL.createObjectURL(file); const link = document.createElement('a'); link.href = url; link.download = file.name; link.click(); URL.revokeObjectURL(url);
        const dates = [...invoices.map(item => item.date), ...expenses.map(item => item.date)].sort();
        await recordAccountingExport({ periodStart: dates[0] || new Date().toISOString().slice(0, 10), periodEnd: dates.at(-1) || new Date().toISOString().slice(0, 10), invoiceCount: invoices.length, expenseCount: expenses.length });
        setFeedback(L('CSV je prenesen. Pošlji ga svojemu računovodstvu.', 'The CSV is downloaded. Send it to your accountant.'));
      }
    } catch { setFeedback(L('Deljenje je bilo preklicano.', 'Sharing was cancelled.')); }
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

  if (!ready) return <div className={styles.loading}>{L('Pripravljam tvoj poslovni pregled …', 'Preparing your business overview …')}</div>;

  /* v spremenljivko: ponovljen clients[0] v JSX prevajalniku ne dokaze, da
     element obstaja, tudi ce je pogoj clients[0] */
  const najboljsaStranka = clients[0];
  /* ime je lahko prazno: strosek sme biti brez stranke */
  const imeNajboljse = najboljsaStranka?.client || L('Brez stranke', 'No client');

  return (
    <>
      {/* Preklop stanj je zdaj v zgornji vrstici (samo na razvoju). Tu je bil
          preozek — stiri gumbi v 12.7rem so se prekrivali in besedila ni bilo brati. */}
      {feedback && <div className={styles.feedback} role="status"><span>{feedback}</span><button type="button" onClick={() => setFeedback('')} aria-label={L('Zapri obvestilo', 'Close notification')}>×</button></div>}
      <section className={styles.flowBand} id="tools" aria-labelledby="tools-title">
        <div className={styles.bandTop}><p className={styles.eyebrow}>{L('01 · ORODJA', '01 · TOOLS')}</p><div className={styles.sectionNote}><strong>Smart pricing</strong><span>{L('Cena po tvojih izkušnjah, trgu in naročniku.', 'Pricing based on your experience, the market and the client.')}</span></div></div>
        <div className={styles.bandBody}>
        <div className={styles.flowToolsGlava}>
          <h2 id="tools-title" className={styles.bandNaslov}>{L('Kaj boš danes uredila?', 'What will you take care of today?')}</h2>
          <div className={styles.flowToolsNav} aria-hidden="true">
            <button type="button" onClick={() => drsniOrodja(-1)} aria-label={L('Nazaj', 'Back')}>‹</button>
            <button type="button" onClick={() => drsniOrodja(1)} aria-label={L('Naprej', 'Next')}>›</button>
          </div>
        </div>
        <div className={styles.flowTools} ref={orodjaRef}>
          <Link className={styles.offerTool} href={`${base}/kalkulator/orodje`}>
            <b className={styles.cardBubbles} aria-hidden><u /><u /><u /><u /></b>
            <strong>{L('Ponudba', 'Offer')}</strong><small>{L('Pametna cena je vključena', 'Smart pricing included')}</small><i><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></i>
          </Link>
          <Link href={`${base}/kalkulator/racuni`}><b className={styles.cardBubbles} aria-hidden><u /><u /><u /><u /></b><strong>{L('Račun', 'Invoice')}</strong><small>{L('Iz ponudbe ali na novo', 'From an offer or from scratch')}</small><i><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></i></Link>
          <Link href={`${base}/kalkulator/nov-projekt`}><b className={styles.cardBubbles} aria-hidden><u /><u /><u /><u /></b><strong>{L('Ustvari projekt', 'Create project')}</strong><small>{L('Nov projekt za stranko', 'A new project for a client')}</small><i><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></i></Link>
          <Link href={`${base}/kalkulator/stranke`}><b className={styles.cardBubbles} aria-hidden><u /><u /><u /><u /></b><strong>{L('Stranke', 'Clients')}</strong><small>{L('Kartoteka in zgodovina sodelovanja', 'Records and collaboration history')}</small><i><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></i></Link>
          <Link href={`${base}/kalkulator/koledar`}><b className={styles.cardBubbles} aria-hidden><u /><u /><u /><u /></b><strong>{L('Koledar', 'Calendar')}</strong><small>{L('Sestanki, klici in roki projektov', 'Meetings, calls and project deadlines')}</small><i><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></i></Link>
          <Link href={`${base}/kalkulator/pogodbe`}><b className={styles.cardBubbles} aria-hidden><u /><u /><u /><u /></b><strong>{L('Pogodba', 'Contract')}</strong><small>{L('Iz ponudbe ali dokument stranke', 'From an offer or a client document')}</small><i><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></i></Link>
          <Link href={`${base}/kalkulator/dolgorocno`}><b className={styles.cardBubbles} aria-hidden><u /><u /><u /><u /></b><strong>{L('Dolgoročno', 'Retainer')}</strong><small>{L('Mesečno sodelovanje in paketi', 'Monthly retainers and packages')}</small><i><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></i></Link>
          <Link href={`${base}/kalkulator/stroski`}><b className={styles.cardBubbles} aria-hidden><u /><u /><u /><u /></b><strong>{L('Stroški', 'Expenses')}</strong><small>{L('Vodi stroške in osnovo cene', 'Track costs and your pricing base')}</small><i><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></i></Link>
          <Link href={`${base}/kalkulator/ceniki`}><b className={styles.cardBubbles} aria-hidden><u /><u /><u /><u /></b><strong>{L('Ceniki', 'Price lists')}</strong><small>{L('Tvoje storitve in cene', 'Your services and prices')}</small><i><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></i></Link>
          <Link href={`${base}/kalkulator/naloge`}><b className={styles.cardBubbles} aria-hidden><u /><u /><u /><u /></b><strong>{L('Naloge', 'Tasks')}</strong><small>{L('Kaj je treba narediti', 'What needs to get done')}</small><i><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></i></Link>
          <Link href={`${base}/kalkulator/komunikacija`}><b className={styles.cardBubbles} aria-hidden><u /><u /><u /><u /></b><strong>{L('Komunikacija', 'Communication')}</strong><small>{L('Maili in klepeti pri projektu', 'Project mail and chats')}</small><i><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></i></Link>
          <Link href={`${base}/kalkulator/sef`}><b className={styles.cardBubbles} aria-hidden><u /><u /><u /><u /></b><strong>{L('Sef avtorstva', 'Authorship vault')}</strong><small>{L('Dokaži, da je delo tvoje', 'Prove the work is yours')}</small><i><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></i></Link>
          <Link href={`${base}/kalkulator/cas`}><b className={styles.cardBubbles} aria-hidden><u /><u /><u /><u /></b><strong>{L('Štoparica', 'Timer')}</strong><small>{L('Meri čas na projektu', 'Track time on a project')}</small><i><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></i></Link>
          <Link href={`${base}/kalkulator/racunovodstvo`}><b className={styles.cardBubbles} aria-hidden><u /><u /><u /><u /></b><strong>{L('Računovodstvo', 'Accounting')}</strong><small>{L('Izdani računi in stroški na enem mestu', 'Issued invoices and expenses in one place')}</small><i><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></i></Link>
        </div>
        </div>
      </section>

      {form && <section className={`${styles.inlineForm} ${form === 'contract' ? styles.contractBuilder : ''}`} aria-label={L('Vnos podatkov', 'Data entry')}>
        <div className={styles.formHeading}><h2>{form === 'expense' ? L('Nov strošek', 'New cost') : form === 'invoice' ? L('Nov račun', 'New invoice') : form === 'contract' ? L('Nova pogodba', 'New contract') : form === 'client' ? L('Nova stranka', 'New client') : L('Mesečni cilj', 'Monthly goal')}</h2><button onClick={() => setForm(null)} aria-label={L('Zapri', 'Close')}>×</button></div>
        {form === 'client' && <form onSubmit={saveClient}>
          <label>{L('Ime ali podjetje', 'Name or company')}<input required name="name" /></label><label>{L('E-pošta', 'Email')}<input name="email" type="email" /></label><label>{L('Telefon', 'Phone')}<input name="phone" /></label><label>{L('Davčna številka', 'Tax number')}<input name="tax" /></label><button type="submit">{L('Shrani stranko', 'Save client')}</button>
        </form>}
        {form === 'contract' && <>
          <p className={styles.contractIntro}>{L('Pogodba je navadno nadaljevanje potrjene ponudbe. Če pogodbo pošlje stranka, jo naloži in shrani ob projektu.', 'A contract is usually a continuation of an accepted offer. If the client sends the contract, upload it and store it with the project.')}</p>
          <div className={styles.contractModes} role="tablist" aria-label={L('Način priprave pogodbe', 'Contract creation mode')}>
            <button type="button" className={contractMode === 'offer' ? styles.contractModeActive : ''} onClick={() => setContractMode('offer')}><strong>{L('Iz ponudbe', 'From an offer')}</strong><span>{L('Ustvari besedilo iz dogovorjenega obsega', 'Generate the text from the agreed scope')}</span></button>
            <button type="button" className={contractMode === 'upload' ? styles.contractModeActive : ''} onClick={() => setContractMode('upload')}><strong>{L('Pogodba stranke', 'Client contract')}</strong><span>{L('Naloži, preglej in shrani dokument', 'Upload, review and save the document')}</span></button>
          </div>
          {contractMode === 'offer' ? <form className={styles.contractForm} onSubmit={saveContract}>
            <label className={styles.contractWide}>{L('Potrjena ponudba', 'Accepted offer')}<select required value={contractOfferId} onChange={event => { setContractOfferId(event.target.value); setContractBody(''); }}><option value="">{L('Izberi ponudbo …', 'Choose an offer …')}</option>{offers.map(offer => <option key={offer.id} value={offer.id}>{offer.title} · {offer.client}{offer.status === 'accepted' ? L(' · sprejeta', ' · accepted') : ''}</option>)}</select></label>
            <label>{L('Datum pogodbe', 'Contract date')}<input required name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></label>
            <button className={styles.generateButton} type="button" disabled={!contractOfferId} onClick={generateContract}>{L('Pripravi osnutek', 'Generate draft')}</button>
            {contractBody && <label className={styles.contractEditor}>{L('Besedilo pogodbe', 'Contract text')}<textarea required name="body" rows={16} value={contractBody} onChange={event => setContractBody(event.target.value)} /></label>}
            {contractBody && <div className={styles.contractActions}><small>{L('Osnutek lahko popraviš. Po potrditvi stranke spremeni status v »Podpisana«.', 'You can edit the draft. Once the client confirms, change the status to »Signed«.')}</small><button type="submit">{L('Shrani osnutek', 'Save draft')}</button></div>}
          </form> : <form className={styles.contractForm} onSubmit={saveContract}>
            <label>{L('Naziv pogodbe', 'Contract title')}<input required name="title" placeholder={L('npr. Pogodba za novo identiteto', 'e.g. Contract for a new identity')} /></label>
            <label>{L('Stranka', 'Client')}<input required name="client" /></label>
            <label>{L('Datum prejema', 'Date received')}<input required name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></label>
            <label className={styles.fileField}>{L('Dokument PDF ali Word', 'PDF or Word document')}<input required name="file" type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" /></label>
            <label className={styles.contractEditor}>{L('Opombe za pregled', 'Review notes')}<textarea name="notes" rows={5} placeholder={L('Kaj moraš preveriti, popraviti ali potrditi?', 'What do you need to check, fix or confirm?')} /></label>
            <div className={styles.contractActions}><small>{L('Dokument bo shranjen pri pogodbi in označen kot »Prejeta«.', 'The document will be saved with the contract and marked as »Received«.')}</small><button type="submit">{L('Shrani pogodbo', 'Save contract')}</button></div>
          </form>}
        </>}
        {form === 'expense' && <form onSubmit={saveExpense}>
          <label>{L('Opis', 'Description')}<input required name="title" placeholder={L('npr. Adobe naročnina', 'e.g. Adobe subscription')} /></label>
          <label>{L('Stranka ali projekt', 'Client or project')}<input name="client" placeholder={L('neobvezno', 'optional')} /></label>
          <label>{L('Znesek', 'Amount')}<input required min="0" step="0.01" name="amount" type="number" /></label>
          <button type="submit">{L('Shrani strošek', 'Save cost')}</button>
        </form>}
        {form === 'invoice' && <form onSubmit={saveInvoice}>
          <label>{L('Poveži s ponudbo', 'Link to an offer')}<select name="sourceOfferId" value={invoiceOfferId} onChange={event => setInvoiceOfferId(event.target.value)}><option value="">{L('Račun brez ponudbe', 'Invoice without an offer')}</option>{offers.map(offer => <option key={offer.id} value={offer.id}>{offer.title} · {offer.client}</option>)}</select></label>
          <label>{L('Stranka', 'Client')}<input name="client" placeholder={L('samodejno iz ponudbe', 'auto-filled from the offer')} /></label>
          <label>{L('Znesek', 'Amount')}<input required min="0" step="0.01" name="amount" type="number" /></label>
          <label>{L('Datum izdaje', 'Issue date')}<input required name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></label>
          <label className={styles.check}><input name="paid" type="checkbox" /> {L('Račun je plačan', 'Invoice is paid')}</label>
          <button type="submit">{L('Shrani račun', 'Save invoice')}</button>
        </form>}
        {form === 'goal' && <form className={styles.goalPlanner} onSubmit={saveGoal}>
          <div className={styles.goalCostSummary}><p className={styles.eyebrow}>{L('TVOJA OSNOVA', 'YOUR BASE')}</p><div><span><small>{L('Redni stroški', 'Recurring costs')}</small><strong>{money(recurringTotal)}</strong></span><span><small>{L('Vneseni ta mesec', 'Entered this month')}</small><strong>{money(currentMonthExpenses)}</strong></span><span><small>{L('Skupaj stroški', 'Total costs')}</small><strong>{money(goalCostBase)}</strong></span></div><Link href={`${base}/kalkulator/stroski`}>{L('Preglej ali dodaj stroške →', 'Review or add costs →')}</Link></div>
          <div className={styles.costSuggestions}><strong>{L('Preveri, ali si vključila:', 'Check that you included:')}</strong><span>{L('Prispevke za socialno varnost', 'Social security contributions')}</span><span>{L('Obvezno zdravstveno zavarovanje', 'Mandatory health insurance')}</span><span>{L('Davke in druge dajatve', 'Taxes and other levies')}</span><span>{L('Najemnino in obratovalne stroške', 'Rent and operating costs')}</span><span>{L('Računovodstvo, programsko opremo in opremo', 'Accounting, software and equipment')}</span><small>{L('Natančne zneske preveri pri računovodstvu, saj so odvisni od oblike podjetja in tvojega statusa.', 'Check the exact amounts with your accountant, as they depend on your company form and status.')}</small></div>
          <div className={styles.goalInputs}><label>{L('Želeni osebni dohodek', 'Desired personal income')}<input min="0" step="100" type="number" value={desiredIncome} onChange={event => setDesiredIncome(Number(event.target.value))} /></label><label>{L('Rezerva za davke in nepredvideno', 'Reserve for taxes and surprises')}<input min="0" max="90" step="1" type="number" value={reservePercent} onChange={event => setReservePercent(Number(event.target.value))} /></label></div>
          <div className={styles.goalRecommendation}><span>{L('Priporočeni mesečni cilj', 'Recommended monthly goal')}</span><strong>{money(recommendedGoal)}</strong><small>{L(`stroški + želeni dohodek + ${reservePercent}% rezerve`, `costs + desired income + ${reservePercent}% reserve`)}</small><input name="goal" type="hidden" value={recommendedGoal} /><button type="submit">{L('Uporabi ta cilj', 'Use this goal')}</button></div>
        </form>}
      </section>}

      <div className={styles.overviewColumns}>
      <section className={styles.historyBand} aria-labelledby="proj-title">
          <div className={styles.bandTop}><p className={styles.eyebrow}>{L('02 · PROJEKTI', '02 · PROJECTS')}</p><Link className={styles.accountingButton} href={`${base}/kalkulator/projekti`}><span className={styles.abTxt}>{L('Vsi projekti', 'All projects')}</span><span className={styles.abShort}>{L('Več', 'More')}</span> <span className={styles.abArrow} aria-hidden><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg></span></Link></div>
          <div className={styles.bandBody}>
          <h2 id="proj-title" className={styles.bandNaslov}>{L('Zadnji projekti', 'Recent projects')}</h2>
          {activeOffers.length ? <div className={`${styles.tableWrap} ${styles.historyTable}`}><table><thead><tr><th>{L('Projekt', 'Project')}</th><th>Status</th><th>{L('Rok', 'Deadline')}</th></tr></thead><tbody>{activeOffers.slice(0, 5).map(o => {
            const map: Record<string, [string, string]> = { draft: [L('Osnutek', 'Draft'), 'neutral'], sent: [L('V teku', 'In progress'), 'info'], accepted: [L('Zaključeno', 'Completed'), 'success'], rejected: [L('Zavrnjeno', 'Rejected'), 'danger'] };
            const [label, tone] = map[o.status] || ['—', 'neutral'];
            return <tr key={o.id}><td><div className={styles.documentCell}><span><strong>{o.title}</strong><small>{o.client || '—'}</small></span></div></td><td><span className={`${styles.statusPill} ${styles[`status_${tone}`]}`}>{label}</span></td><td>{new Date(o.date).toLocaleDateString(dl)}</td></tr>;
          })}</tbody></table></div> : <div className={styles.emptyState}><span><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg></span><div><strong>{L('Še ni projektov.', 'No projects yet.')}</strong><p>{L('Projekti se prikažejo tukaj, ko ustvariš ponudbo.', 'Projects will appear here once you create an offer.')}</p></div></div>}
          </div>
        </section>

      <section className={styles.resultsBand} id="clients" aria-labelledby="business-title">
        <div className={styles.bandTop}><p className={styles.eyebrow}>{L('03 · POSLOVNI REZULTATI', '03 · BUSINESS RESULTS')}</p><select className={styles.periodSelect} value={period} onChange={e => setPeriod(e.target.value as Period)} aria-label={L('Obdobje prikaza', 'Display period')}><option value="month">{L('Ta mesec', 'This month')}</option><option value="quarter">{L('To četrtletje', 'This quarter')}</option><option value="year">{L('Letos', 'This year')}</option></select></div>
        <div className={styles.bandBody}>
        <h2 id="business-title" className={styles.bandNaslov}>{L('Kako ti gre?', 'How are you doing?')}</h2>
        <div className={styles.kpiGrid}>
          <div className={styles.kpi}><span>{L('Izdano', 'Issued')}</span><strong>{money(issued)}</strong><small>{L(`${periodInvoices.length} računov`, `${periodInvoices.length} invoices`)}</small><b className={styles.resultIcon} aria-hidden><ResultIcon type="issued" /></b></div>
          <div className={styles.kpi}><span>{L('Plačano', 'Paid')}</span><strong>{money(paid)}</strong><small>{L(`${periodInvoices.filter(i => i.paid).length} potrjenih plačil`, `${periodInvoices.filter(i => i.paid).length} confirmed payments`)}</small><b className={styles.resultIcon} aria-hidden><ResultIcon type="paid" /></b></div>
          <div className={styles.kpi}><span>{L('Stroški', 'Costs')}</span><strong>{money(costs)}</strong><small>{L(`${periodExpenses.length} vnosov`, `${periodExpenses.length} entries`)}</small><b className={styles.resultIcon} aria-hidden><ResultIcon type="cost" /></b></div>
          <div className={`${styles.kpi} ${profit < 0 ? styles.negative : ''}`}><span>{L('Ocenjeni dobiček', 'Estimated profit')}</span><strong>{money(profit)}</strong><small>{L('plačano minus stroški', 'paid minus costs')}</small><b className={styles.resultIcon} aria-hidden><ResultIcon type="profit" /></b></div>
        </div>
        <Link className={styles.panelMore} href={`${base}/kalkulator/racunovodstvo`}>{L('Pojdi na podrobnosti', 'Go to details')} <span aria-hidden>→</span></Link>
        </div>
      </section>

      <section className={styles.eventsBand} id="events" aria-labelledby="events-title">
        <div className={styles.bandTop}><p className={styles.eyebrow}>{L('04 · PRIHODNJI DOGODKI', '04 · UPCOMING EVENTS')}</p><Link className={styles.accountingButton} href={`${base}/kalkulator/koledar`}><span className={styles.abTxt}>{L('Vsi dogodki', 'All events')}</span><span className={styles.abShort}>{L('Več', 'More')}</span> <span className={styles.abArrow} aria-hidden><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg></span></Link></div>
        <div className={styles.bandBody}>
        <h2 id="events-title" className={styles.bandNaslov}>{L('Dogodki & roki', 'Events & deadlines')}</h2>
        {(() => {
          const addDays = (iso: string, n: number) => { const dt = new Date(iso); dt.setDate(dt.getDate() + n); return dt; };
          const ev = [
            ...periodInvoices.filter(i => !i.paid).map(i => ({ id: `inv-${i.id}`, kind: L('Rok plačila', 'Payment due'), who: i.client || L('Račun', 'Invoice'), when: addDays(i.date, 15), tone: 'waiting' })),
            ...waiting.map(o => ({ id: `off-${o.id}`, kind: L('Ponudba čaka odgovor', 'Offer awaiting reply'), who: o.client || o.title, when: addDays(o.date, 8), tone: 'info' })),
            ...activeOffers.filter(o => o.status === 'accepted').map(o => ({ id: `acc-${o.id}`, kind: L('Rok izvedbe', 'Delivery deadline'), who: o.client || o.title, when: addDays(o.date, 20), tone: 'waiting' })),
          ].sort((a, b) => a.when.getTime() - b.when.getTime()).slice(0, 5);
          return ev.length ? <ul className={styles.eventList}>{ev.map(e => <li key={e.id}><span className={styles.eventDate} data-tone={e.tone}><b>{e.when.getDate()}</b><small>{e.when.toLocaleDateString(dl, { month: 'short' }).replace('.', '').toUpperCase()}</small></span><span className={styles.eventCard}><span className={styles.eventIco} data-tone={e.tone} aria-hidden>{e.tone === 'waiting' ? <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg> : <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" /></svg>}</span><span className={styles.eventBody}><strong>{e.kind}</strong><small>{e.who}</small></span><i className={styles.eventDot} data-tone={e.tone} aria-hidden /></span></li>)}</ul> : <div className={styles.emptyState}><span><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg></span><div><strong>{L('Ni prihodnjih rokov.', 'No upcoming deadlines.')}</strong><p>{L('Roki plačil in ponudbe, ki čakajo odgovor, se prikažejo tukaj.', 'Payment due dates and offers awaiting a reply will appear here.')}</p></div></div>;
        })()}
        </div>
      </section>
      </div>

      <div className={styles.detailRow}>
        <section className={styles.historyBand} aria-labelledby="task-title">
          <div className={styles.bandTop}><p className={styles.eyebrow}>{L('05 · NALOGE', '05 · TASKS')}</p><Link className={styles.accountingButton} href={`${base}/kalkulator/naloge`}><span className={styles.abTxt}>{L('Vse naloge', 'All tasks')}</span><span className={styles.abShort}>{L('Več', 'More')}</span> <span className={styles.abArrow} aria-hidden><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg></span></Link></div>
          <div className={styles.bandBody}>
          <h2 id="task-title" className={styles.bandNaslov}>{L('Aktivne naloge', 'Active tasks')}</h2>
          {dashNaloge.length ? <ul className={styles.dashList} style={{ listStyle: 'none', margin: '.3rem 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '.1rem' }}>
            {dashNaloge.map((n, i) => { const tone = n.stolpec === 'in_progress' ? 'info' : n.stolpec === 'waiting' ? 'waiting' : n.stolpec === 'done' ? 'success' : 'neutral'; const lbl = n.stolpec === 'in_progress' ? L('V teku', 'In progress') : n.stolpec === 'waiting' ? L('Za pregled', 'For review') : n.stolpec === 'done' ? L('Končano', 'Done') : L('Za začeti', 'To do'); return (
              <li key={i}><Link className={styles.dashRow} href={`${base}/kalkulator/naloge`}>
                <span className={styles[`status_${tone}`]} aria-hidden style={{ flex: '0 0 auto', display: 'grid', placeItems: 'center', width: '2rem', height: '2rem', borderRadius: '50%', background: 'var(--pill-bg)', color: 'var(--pill-ink)' }}><CheckCircle size={17} weight="regular" /></span>
                <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}><b style={{ fontSize: '.85rem', fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.naslov}</b>{n.oseba && <small style={{ fontSize: '.72rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.oseba}</small>}</span>
                <span className={`${styles.statusPill} ${styles[`status_${tone}`]}`}>{lbl}</span>
                <span className={styles.dashRowArrow} aria-hidden>›</span>
              </Link></li>
            ); })}
          </ul> : <div className={styles.emptyState}><span><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg></span><div><strong>{L('Ni odprtih nalog.', 'No open tasks.')}</strong><p>{L('Naloge se prikažejo tukaj — dodaj jih v Task managerju.', 'Tasks appear here — add them in the Task manager.')}</p></div></div>}
          </div>
        </section>

        <section className={styles.historyBand} aria-labelledby="comm-title">
          <div className={styles.bandTop}><p className={styles.eyebrow}>{L('06 · KOMUNIKACIJA', '06 · COMMUNICATION')}</p><Link className={styles.accountingButton} href={`${base}/kalkulator/komunikacija`}><span className={styles.abTxt}>{L('Odpri komunikacijo', 'Open communication')}</span><span className={styles.abShort}>{L('Več', 'More')}</span> <span className={styles.abArrow} aria-hidden><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg></span></Link></div>
          <div className={styles.bandBody}>
          <h2 id="comm-title" className={styles.bandNaslov}>{L('Zadnja pošta', 'Recent mail')}</h2>
          {dashPosta.length ? <ul className={styles.dashList} style={{ listStyle: 'none', margin: '.3rem 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '.1rem' }}>
            {dashPosta.map((v, i) => { const tone = v.smer === 'prejeto' ? 'success' : 'info'; return <li key={i}><Link className={styles.dashRow} href={`${base}/kalkulator/komunikacija`}><span className={styles[`status_${tone}`]} aria-hidden style={{ flex: '0 0 auto', display: 'grid', placeItems: 'center', width: '2rem', height: '2rem', borderRadius: '50%', background: 'var(--pill-bg)', color: 'var(--pill-ink)' }}>{v.smer === 'prejeto' ? <EnvelopeSimple size={16} weight="regular" /> : <PaperPlaneRight size={16} weight="regular" />}</span><span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}><b style={{ fontSize: '.84rem', color: 'var(--ink)', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.zadeva}</b><small style={{ fontSize: '.72rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.kdo}</small></span><span className={`${styles.statusPill} ${styles[`status_${tone}`]}`}>{v.smer === 'poslano' ? L('Poslano', 'Sent') : L('Prejeto', 'Received')}</span><span className={styles.dashRowArrow} aria-hidden>›</span></Link></li>; })}
          </ul> : <Link className={styles.emptyState} href={`${base}/kalkulator/komunikacija`}><span><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg></span><div><strong>{L('Poveži svojo pošto', 'Connect your mail')}</strong><p>{L('Projektni maili in klepeti se zbirajo tukaj. Odpri Komunikacijo, da začneš.', 'Project mail and chats collect here. Open Communication to get started.')}</p></div></Link>}
          </div>
        </section>
      </div>

      <div className={styles.detailRow}>
        <section className={styles.historyBand} id="accounting">
        <div className={styles.bandTop}><p className={styles.eyebrow}>{L('07 · ZGODOVINA', '07 · HISTORY')}</p><Link className={styles.accountingButton} href={`${base}/kalkulator/racunovodstvo`}><span className={styles.abTxt}>{L('Vsi dokumenti', 'All documents')}</span><span className={styles.abShort}>{L('Več', 'More')}</span> <span className={styles.abArrow} aria-hidden><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg></span></Link></div>
        <div className={styles.bandBody}>
        <h2 className={styles.bandNaslov}>{L('Zadnji dokumenti', 'Recent documents')}</h2>
        {historyItems.length ? <div className={`${styles.tableWrap} ${styles.historyTable}`}><table><thead><tr><th>{L('Dokument', 'Document')}</th><th>{L('Stranka', 'Client')}</th><th>{L('Datum', 'Date')}</th><th>Status</th></tr></thead><tbody>{historyItems.map(item => <tr key={`${item.type}-${item.id}`} role="button" tabIndex={0} aria-label={L(`Odpri ${item.title}`, `Open ${item.title}`)} onClick={() => setSelectedDocument(item)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedDocument(item); } }}><td><div className={styles.documentCell}><span className={`${styles.documentIcon} ${styles[`document_${item.type === 'Ponudba' ? 'offer' : item.type === 'Pogodba' ? 'contract' : item.type === 'Račun' ? 'invoice' : 'expense'}`]}`}><HistoryIcon type={item.type} /></span><span><strong>{item.title}</strong><small>{item.subtitle ?? item.type}</small></span></div></td><td>{item.client}</td><td>{new Date(item.date).toLocaleDateString(dl)}</td><td>{statusOptions(item.type).length ? <span className={`${styles.statusField} ${styles[`status_${statusTone(item.status)}`]}`} data-editable={preview === 'mine' ? '' : undefined}><span className={styles.statusPill}>{item.status}</span><select aria-label={`Status: ${item.title}`} className={styles.statusSelect} value={item.status} disabled={preview !== 'mine'} title={preview !== 'mine' ? L('To so demo podatki — statusa ni mogoče spreminjati. Preklopi na »Moji podatki«.', 'This is demo data — the status cannot be changed. Switch to »My data«.') : undefined} onClick={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()} onChange={e => updateDocumentStatus(item.type, item.id, e.target.value)}>{statusOptions(item.type).map(option => <option key={option}>{option}</option>)}</select></span> : <span className={`${styles.statusPill} ${styles.status_neutral}`}>{item.status}</span>}</td></tr>)}</tbody></table></div> : <div className={styles.emptyState}><span><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg></span><div><strong>{L('Še nimaš dokumentov.', 'You have no documents yet.')}</strong><p>{L('Ponudbe, pogodbe, računi in stroški se bodo prikazali tukaj.', 'Offers, contracts, invoices and costs will appear here.')}</p></div></div>}
        </div>
      </section>

        <section className={styles.eventsBand} aria-labelledby="rev-title">
          <div className={styles.bandTop}><p className={styles.eyebrow}>{L('08 · PRIHODKI', '08 · REVENUE')}</p><Link className={styles.accountingButton} href={`${base}/kalkulator/racunovodstvo`}><span className={styles.abTxt}>{L('Vsa poročila', 'All reports')}</span><span className={styles.abShort}>{L('Več', 'More')}</span> <span className={styles.abArrow} aria-hidden><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg></span></Link></div>
          <div className={styles.bandBody}>
          <h2 id="rev-title" className={styles.bandNaslov}>{L('Prihodki po mesecih', 'Revenue by month')}</h2>
          {(() => {
            const base0 = new Date(); base0.setDate(1);
            const months = Array.from({ length: 6 }, (_, i) => { const d = new Date(base0); d.setMonth(d.getMonth() - (5 - i)); return d; });
            const paidInv = activeInvoices.filter(i => i.paid);
            const vals = months.map(m => paidInv.filter(i => { const d = new Date(i.date); return d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth(); }).reduce((s, i) => s + i.amount, 0));
            const rawMax = Math.max(0, ...vals);
            const niceStep = (x: number) => { if (x <= 0) return 1000; const p = Math.pow(10, Math.floor(Math.log10(x))); const f = x / p; const n = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10; return n * p; };
            const step = niceStep(rawMax / 3);
            const niceMax = step * 3;
            const fmtK = (v: number) => v >= 1000 ? `${Math.round(v / 100) / 10}`.replace(/\.0$/, '') + 'k' : `${Math.round(v)}`;
            const ticks = [3, 2, 1, 0].map(t => step * t);
            return <div className={styles.chartWrap}>
              <div className={styles.chartAxis}>{ticks.map(t => <span key={t}>{fmtK(t)}</span>)}</div>
              <div className={styles.barChart}>
                <div className={styles.chartGrid} aria-hidden>{ticks.map(t => <i key={t} />)}</div>
                {months.map((m, i) => <div key={i} className={styles.bar}><b style={{ height: `${Math.max(1, Math.round((vals[i] / niceMax) * 100))}%` } as React.CSSProperties} title={money(vals[i])} /><small>{m.toLocaleDateString(dl, { month: 'short' }).replace('.', '')}</small></div>)}
              </div>
            </div>;
          })()}
          </div>
        </section>
      </div>

      <section className={styles.tipBar}>
        <div className={styles.tipMain}>
          <span className={styles.tipIcon}><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2h6c0-.8.4-1.5 1-2A7 7 0 0 0 12 2Z" /></svg></span>
          <div><p className={styles.eyebrow}>{L('Nasvet dneva', 'Tip of the day')}</p><p className={styles.tipText}>{L('Uporabi predloge in kalkulator, da prihraniš čas pri pripravi ponudb.', 'Use templates and the calculator to save time preparing offers.')}</p></div>
        </div>
        <Link className={styles.tipCta} href={`${base}/kalkulator/orodje`}>{L('Odpri kalkulator', 'Open calculator')} <span aria-hidden>→</span></Link>
      </section>

      {selectedDocument && <div className={styles.detailBackdrop} role="presentation" onMouseDown={() => setSelectedDocument(null)}><aside className={styles.detailPanel} role="dialog" aria-modal="true" aria-labelledby="detail-title" onMouseDown={e => e.stopPropagation()}><button className={styles.detailClose} type="button" onClick={() => setSelectedDocument(null)} aria-label={L('Zapri', 'Close')}>×</button><p className={styles.eyebrow}>{selectedDocument.type}</p><h2 id="detail-title">{selectedDocument.title}</h2><dl><div><dt>{L('Stranka', 'Client')}</dt><dd>{selectedDocument.client}</dd></div><div><dt>{L('Datum', 'Date')}</dt><dd>{new Date(selectedDocument.date).toLocaleDateString(dl)}</dd></div><div><dt>Status</dt><dd>{selectedDocument.status}</dd></div></dl>{selectedDocument.type === 'Pogodba' && (() => { const contract = contracts.find(item => item.id === selectedDocument.id); if (contract?.fileName) return <button type="button" onClick={() => openContractFile(contract.id)}>{L('Odpri', 'Open')} {contract.fileName}</button>;
        if (!contract?.body) return null;
        /* novo telo je HTML (predloga s cleni in podpisi) — izrisi ga kot dokument;
           stara plain-text telesa ostanejo v <pre>, da se ne polomijo */
        const jeHtml = contract.body.includes('<h1') || contract.body.includes('<div');
        return jeHtml
          ? <div className={styles.contractPreview} dangerouslySetInnerHTML={{ __html: contract.body }} />
          : <pre className={styles.contractPreview}>{contract.body}</pre>; })()}{selectedDocument.sourceOfferId && (() => {
        const offer = offers.find(item => item.id === selectedDocument.sourceOfferId);
        const linkedContracts = contracts.filter(item => item.sourceOfferId === selectedDocument.sourceOfferId);
        const linkedInvoices = invoices.filter(item => item.sourceOfferId === selectedDocument.sourceOfferId);
        const billed = linkedInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);
        const agreed = offer ? offerAmounts[offer.id] || 0 : 0;
        return offer ? <section className={styles.projectBundle}><p className={styles.eyebrow}>{L('POVEZAN PROJEKT', 'LINKED PROJECT')}</p><h3>{offer.title}</h3>{offer.offerNumber && <small>{L('Ponudba', 'Offer')} {offer.offerNumber}</small>}<label className={styles.agreedAmount}>{L('Dogovorjena vrednost ponudbe', 'Agreed offer value')}<span><input type="number" min="0" step="0.01" value={agreed || ''} onChange={event => setOfferAmount(offer.id, Number(event.target.value))} /> €</span></label><div className={styles.projectScope}><strong>{L('Dogovorjeno v ponudbi', 'Agreed in the offer')}</strong>{offer.scope?.length ? <ul>{offer.scope.map((line, index) => <li key={`${line}-${index}`}>{line}</li>)}</ul> : <p>{L('Odpri ponudbo za podroben obseg storitev.', 'Open the offer for the detailed scope of services.')}</p>}</div><div className={styles.projectTotals}><span><small>{L('Dogovorjeno', 'Agreed')}</small><strong>{agreed ? money(agreed) : '—'}</strong></span><span><small>{L('Zaračunano', 'Invoiced')}</small><strong>{money(billed)}</strong></span><span className={agreed && agreed - billed > 0 ? styles.unbilled : ''}><small>{L('Še ni zaračunano', 'Not yet invoiced')}</small><strong>{agreed ? money(agreed - billed) : '—'}</strong></span></div><div className={styles.linkedDocuments}>{linkedContracts.map(contract => <span key={contract.id}>{L('Pogodba', 'Contract')} · {contract.title}</span>)}{linkedInvoices.map(invoice => <span key={invoice.id}>{L('Račun', 'Invoice')} · {money(invoice.amount)} · {invoice.paid ? L('plačan', 'paid') : L('odprt', 'open')}</span>)}</div><button type="button" onClick={() => { setInvoiceOfferId(offer.id); setSelectedDocument(null); setForm('invoice'); }}>{L('+ Dodaj povezan račun', '+ Add a linked invoice')}</button></section> : null;
      })()}<button type="button" onClick={() => setSelectedDocument(null)}>{L('Končano', 'Done')}</button></aside></div>}
    </>
  );
}

'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';
import { loadFlowData, saveFlowCollection, type FlowExpense } from '@/lib/pinartFlowStore';
import MetricIcon from '@/components/MetricIcon';
import { saveCloudSettings, uploadBusinessDocument } from '@/lib/pinartFlowCloud';
import { podatkiZaPredogled, usePredogled } from '@/lib/predogled';

type Offer = { id: string; title: string; client: string };
type Recurring = { ime: string; znesek: string };
const money = (value: number) => `${value.toLocaleString('sl-SI', { maximumFractionDigits: 2 })} €`;

export default function ExpenseWorkspace() {
  const [expenses, setExpenses] = useState<FlowExpense[]>([]);
  const [recurring, setRecurring] = useState<Recurring[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [companies, setCompanies] = useState<string[]>([]);
  const [editing, setEditing] = useState<FlowExpense | null>(null);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'project' | 'company'>('all');
  /* Demo/Prazno velja za VSE strani (lib/predogled.ts). V teh nacinih je
     urejanje onemogoceno — sicer bi popravek izmisljenega zapisa pisal v pravo bazo. */
  const [nacin] = usePredogled();
  const samoOgled = nacin !== 'mine';


  useEffect(() => {
    const flow = podatkiZaPredogled(nacin, loadFlowData());
    setExpenses(flow.expenses);
    const settings = JSON.parse(localStorage.getItem('pinart-kalkulator-v2') || '{}'); setRecurring(Array.isArray(settings.stroski) ? settings.stroski : []);
    setOffers(flow.offers.map(({ id, title, client }) => ({ id, title, client })));
    const savedCompanies = JSON.parse(localStorage.getItem('pinart-kalkulator-podjetja') || '{}') as Record<string, { ime?: string }>; setCompanies(Object.entries(savedCompanies).map(([id, item]) => item.ime || id));
  }, [nacin]);

  const persist = (next: FlowExpense[]) => { if (samoOgled) return; setExpenses(next); saveFlowCollection('expenses', next); };
  const persistRecurring = (next: Recurring[]) => { setRecurring(next); const settings = JSON.parse(localStorage.getItem('pinart-kalkulator-v2') || '{}'); localStorage.setItem('pinart-kalkulator-v2', JSON.stringify({ ...settings, stroski: next.length ? next : undefined })); void saveCloudSettings({ recurringCosts: next }); };
  /* Redne stroske je bilo prej mogoce samo brisati — vnesti pa le v nastavitvah
     kalkulatorja, kar iz te strani ni bilo razvidno. Zato vnos tudi tukaj. */
  const dodajReden = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (samoOgled) return;
    const d = new FormData(event.currentTarget);
    const ime = String(d.get('ime') || '').trim();
    const znesek = String(d.get('znesek') || '').trim();
    if (!ime || !(Number(znesek) > 0)) return;
    persistRecurring([...recurring, { ime, znesek }]);
    event.currentTarget.reset();
  };

  const save = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); const sourceOfferId = String(data.get('sourceOfferId') || ''); const offer = offers.find(item => item.id === sourceOfferId); let item: FlowExpense = { id: editing?.id || crypto.randomUUID(), title: String(data.get('title')), client: offer?.client || String(data.get('client')), amount: Number(data.get('amount')), date: String(data.get('date')), sourceOfferId: sourceOfferId || undefined, company: String(data.get('company') || '') || undefined, category: String(data.get('category') || ''), fileName: editing?.fileName, filePath: editing?.filePath }; const document = data.get('document'); if (document instanceof File && document.size) { try { const filePath = await uploadBusinessDocument(document, 'expenses', item.id); item = { ...item, fileName: document.name, filePath }; } catch { /* strošek ostane shranjen tudi brez priloge */ } } persist(editing ? expenses.map(expense => expense.id === editing.id ? item : expense) : [item, ...expenses]); setEditing(null); setOpen(false); };
  const remove = (id: string) => { if (window.confirm('Izbrišem ta strošek?')) persist(expenses.filter(item => item.id !== id)); };
  const shown = expenses.filter(item => filter === 'all' || (filter === 'project' ? item.sourceOfferId : item.company));
  const monthTotal = useMemo(() => { const now = new Date(); return expenses.filter(item => { const date = new Date(`${item.date}T00:00:00`); return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear(); }).reduce((sum, item) => sum + item.amount, 0); }, [expenses]);
  const recurringTotal = recurring.reduce((sum, item) => sum + (Number(item.znesek) || 0), 0);

  return <div className={styles.expensePage}>
    <section className={styles.expenseSummary}><article><small>Ta mesec</small><strong>{money(monthTotal)}</strong><span>{expenses.length} evidentiranih stroškov</span><b className={styles.subpageMetricIcon}><MetricIcon type="cost" /></b></article><article><small>Redni mesečni</small><strong>{money(recurringTotal)}</strong><span>iz nastavitev kalkulatorja</span><b className={styles.subpageMetricIcon}><MetricIcon type="recurring" /></b></article><article><small>Skupaj osnova</small><strong>{money(monthTotal + recurringTotal)}</strong><span>poslovni in projektni stroški</span><b className={styles.subpageMetricIcon}><MetricIcon type="profit" /></b></article><button onClick={() => { setEditing(null); setOpen(true); }}><span>+</span><strong>Dodaj strošek</strong><small>Projekt, podjetje ali splošno</small></button></section>
    {open && <section className={styles.expenseEditor}><div><p className={styles.eyebrow}>{editing ? 'UREDI STROŠEK' : 'NOV STROŠEK'}</p><h2>Kam ga pripišemo?</h2><p>Projektni stroški vplivajo na donosnost stranke. Splošni ostanejo strošek podjetja.</p></div><form onSubmit={save}><label>Opis<input required name="title" defaultValue={editing?.title} /></label><label>Kategorija<select name="category" defaultValue={editing?.category || 'Drugo'}><option>Programska oprema</option><option>Zunanji sodelavec</option><option>Produkcija</option><option>Oprema</option><option>Potni stroški</option><option>Drugo</option></select></label><label>Znesek<input required name="amount" type="number" min="0" step="0.01" defaultValue={editing?.amount} /></label><label>Datum<input required name="date" type="date" defaultValue={editing?.date || new Date().toISOString().slice(0, 10)} /></label><label>Račun ali potrdilo<input name="document" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" />{editing?.fileName && <small>Trenutno: {editing.fileName}</small>}</label><label>Projekt / ponudba<select name="sourceOfferId" defaultValue={editing?.sourceOfferId || ''}><option value="">Ni vezan na projekt</option>{offers.map(offer => <option key={offer.id} value={offer.id}>{offer.title} · {offer.client}</option>)}</select></label><label>Podjetje<select name="company" defaultValue={editing?.company || ''}><option value="">Moje glavno podjetje</option>{companies.map(company => <option key={company}>{company}</option>)}</select></label><label>Stranka brez ponudbe<input name="client" defaultValue={editing?.client} placeholder="neobvezno" /></label><div className={styles.expenseEditorActions}><button type="button" onClick={() => { setOpen(false); setEditing(null); }}>Prekliči</button><button>{editing ? 'Shrani spremembe' : 'Shrani strošek'}</button></div></form></section>}
    <section className={styles.expenseArchive}><header><div><p className={styles.eyebrow}>EVIDENCA</p><h2>Stroški po namenu.</h2></div><div className={styles.invoiceFilters}>{(['all', 'project', 'company'] as const).map(value => <button key={value} className={filter === value ? styles.invoiceFilterActive : ''} onClick={() => setFilter(value)}>{value === 'all' ? 'Vsi' : value === 'project' ? 'Projektni' : 'Podjetje'}</button>)}</div></header>{shown.length ? <div className={styles.expenseList}>{shown.map(item => { const offer = offers.find(offerItem => offerItem.id === item.sourceOfferId); return <article key={item.id}><span className={styles.expenseCoin}>€</span><div><strong>{item.title}</strong><small>{item.category || 'Strošek'} · {new Date(item.date).toLocaleDateString('sl-SI')}</small></div><div><strong>{money(item.amount)}</strong><small>{offer ? `Projekt: ${offer.title}` : item.company ? `Podjetje: ${item.company}` : 'Splošni strošek'}</small></div><button onClick={() => { setEditing(item); setOpen(true); }}>Uredi</button><button className={styles.expenseDelete} onClick={() => remove(item.id)} aria-label={`Izbriši ${item.title}`}>×</button></article>; })}</div> : <p className={styles.invoiceEmpty}>V tem pogledu še ni stroškov.</p>}</section>
    <section className={styles.recurringCosts}><div><p className={styles.eyebrow}>IZ KALKULATORJA</p><h2>Redni mesečni stroški</h2><p>Ti vnosi se uporabljajo kot poslovna osnova in niso vezani na en projekt.</p></div><div>{recurring.length ? recurring.map((item, index) => <article key={`${item.ime}-${index}`}><span>{item.ime}</span><strong>{money(Number(item.znesek) || 0)} / mesec</strong><button onClick={() => persistRecurring(recurring.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Izbriši ${item.ime}`}>×</button></article>) : <p>Še nimaš rednih mesečnih stroškov. Vpiši jih spodaj — na primer najemnina, programska oprema, računovodstvo.</p>}<form className={styles.recurringForm} onSubmit={dodajReden}><label>Strošek<input name="ime" required placeholder="npr. Adobe paket" disabled={samoOgled} /></label><label>Znesek / mesec<input name="znesek" type="number" min="0" step="0.01" required placeholder="0" disabled={samoOgled} /></label><button type="submit" disabled={samoOgled}>Dodaj</button></form></div></section>
  </div>;
}

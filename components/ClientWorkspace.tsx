'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { MagnifyingGlass } from '@phosphor-icons/react';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';
import { loadFlowData, saveFlowCollection, type FlowClient } from '@/lib/pinartFlowStore';

/* Ikone poenotene na Phosphor. Inline fill/stroke preglasi stare stroke-based
   CSS pravila (fill:none), da so Phosphor ikone vidne. */
const IKONA_SLOG = { fill: 'currentColor', stroke: 'none' } as const;

type Client = FlowClient;
type CalculatorClient = { ime: string; email?: string; oseba?: string; naslov?: string; davcna?: string };
type Offer = { nazivPonudbe?: string; narocnikPonudbe?: string; datum?: string };
type Invoice = { id: string; client: string; amount: number; paid: boolean; date: string; sourceOfferId?: string };
type Expense = { id: string; client?: string; amount: number; sourceOfferId?: string };
type Contract = { id: string; title: string; client: string; status: string; sourceOfferId?: string };
const key = (value: string) => value.trim().toLocaleLowerCase('sl-SI');
const money = (value: number) => `${value.toLocaleString('sl-SI', { maximumFractionDigits: 2 })} €`;

export default function ClientWorkspace() {
  const [clients, setClients] = useState<Client[]>([]);
  const [offers, setOffers] = useState<Array<{ id: string } & Offer>>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selected, setSelected] = useState<Client | null>(null);
  const [editing, setEditing] = useState<Client | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const calculator = JSON.parse(localStorage.getItem('pinart-kalkulator-narocniki') || '[]') as Array<CalculatorClient | string>;
    const flow = loadFlowData();
    const dashboard = flow.clients;
    const merged = new Map<string, Client>();
    calculator.forEach(item => { const value = typeof item === 'string' ? { ime: item } : item; if (value.ime) merged.set(key(value.ime), { id: crypto.randomUUID(), name: value.ime, email: value.email, contact: value.oseba, address: value.naslov, tax: value.davcna }); });
    dashboard.forEach(item => { const old = merged.get(key(item.name)); merged.set(key(item.name), { ...old, id: item.id || old?.id || crypto.randomUUID(), name: item.name, email: item.email || old?.email, phone: item.phone, tax: item.tax || old?.tax }); });
    setClients([...merged.values()]);
    const archive = JSON.parse(localStorage.getItem('pinart-kalkulator-arhiv') || '{}') as Record<string, Offer>; setOffers(Object.entries(archive).map(([id, item]) => ({ id, ...item })));
    setInvoices(flow.invoices); setExpenses(flow.expenses); setContracts(flow.contracts);
  }, []);

  const persist = (next: Client[]) => {
    setClients(next);
    saveFlowCollection('clients', next);
    localStorage.setItem('pinart-kalkulator-narocniki', JSON.stringify(next.map(item => ({ ime: item.name, email: item.email, oseba: item.contact, naslov: item.address, davcna: item.tax }))));
  };
  const save = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); const client: Client = { id: editing?.id || crypto.randomUUID(), name: String(data.get('name')), email: String(data.get('email') || ''), contact: String(data.get('contact') || ''), phone: String(data.get('phone') || ''), address: String(data.get('address') || ''), tax: String(data.get('tax') || '') }; const next = editing ? clients.map(item => item.id === editing.id ? client : item) : [client, ...clients]; persist(next); setSelected(client); setEditing(null); setOpen(false); };
  const remove = (client: Client) => { if (!window.confirm(`Izbrišem profil stranke »${client.name}«? Ponudbe, pogodbe in računi bodo ostali shranjeni.`)) return; persist(clients.filter(item => item.id !== client.id)); setSelected(null); };
  const visible = clients.filter(client => [client.name, client.email, client.contact].some(value => value?.toLocaleLowerCase('sl-SI').includes(search.toLocaleLowerCase('sl-SI'))));
  const stats = useMemo(() => clients.map(client => { const name = key(client.name); const clientInvoices = invoices.filter(item => key(item.client) === name); const clientExpenses = expenses.filter(item => item.client && key(item.client) === name); return { id: client.id, revenue: clientInvoices.filter(item => item.paid).reduce((sum, item) => sum + item.amount, 0), open: clientInvoices.filter(item => !item.paid).reduce((sum, item) => sum + item.amount, 0), profit: clientInvoices.filter(item => item.paid).reduce((sum, item) => sum + item.amount, 0) - clientExpenses.reduce((sum, item) => sum + item.amount, 0) }; }), [clients, invoices, expenses]);
  const selectedOffers = selected ? offers.filter(item => key(item.narocnikPonudbe || '') === key(selected.name)) : [];
  const selectedInvoices = selected ? invoices.filter(item => key(item.client) === key(selected.name)) : [];
  const selectedContracts = selected ? contracts.filter(item => key(item.client) === key(selected.name)) : [];
  const selectedExpenses = selected ? expenses.filter(item => item.client && key(item.client) === key(selected.name)) : [];

  return <div className={styles.clientPage}>
    <section className={styles.clientToolbar}><label><MagnifyingGlass className={styles.searchIcon} size={20} weight="regular" aria-hidden="true" style={IKONA_SLOG} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Poišči stranko, kontakt ali e-pošto …" /></label><button onClick={() => { setEditing(null); setOpen(true); }}>+ Nova stranka</button></section>
    {open && <section className={styles.clientEditor}><div><p className={styles.eyebrow}>{editing ? 'UREDI PROFIL' : 'NOVA STRANKA'}</p><h2>Podatki, ki jih potrebuješ.</h2></div><form onSubmit={save}><label>Podjetje ali ime<input required name="name" defaultValue={editing?.name} /></label><label>Kontaktna oseba<input name="contact" defaultValue={editing?.contact} /></label><label>E-pošta<input name="email" type="email" defaultValue={editing?.email} /></label><label>Telefon<input name="phone" defaultValue={editing?.phone} /></label><label>Naslov<input name="address" defaultValue={editing?.address} /></label><label>Davčna številka<input name="tax" defaultValue={editing?.tax} /></label><div className={styles.clientEditorActions}><button type="button" onClick={() => setOpen(false)}>Prekliči</button><button>Shrani profil</button></div></form></section>}
    <div className={styles.clientLayout}><section className={styles.clientDirectory}><header><div><p className={styles.eyebrow}>IMENIK</p><h2>{visible.length} strank</h2></div></header>{visible.length ? visible.map(client => { const result = stats.find(item => item.id === client.id); return <button key={client.id} className={selected?.id === client.id ? styles.clientActive : ''} onClick={() => setSelected(client)}><span className={styles.clientInitials}>{client.name.split(/\s+/).map(word => word[0]).join('').slice(0, 2).toUpperCase()}</span><span><strong>{client.name}</strong><small>{client.contact || client.email || 'Brez kontakta'}</small></span><span><strong>{money(result?.revenue || 0)}</strong><small>plačano</small></span><i>›</i></button>; }) : <p className={styles.clientEmpty}>Ni najdenih strank.</p>}</section>
      <section className={styles.clientProfile}>{selected ? <><header><span className={styles.clientProfileAvatar}>{selected.name.split(/\s+/).map(word => word[0]).join('').slice(0, 2).toUpperCase()}</span><div><p className={styles.eyebrow}>PROFIL STRANKE</p><h2>{selected.name}</h2><span>{selected.contact || 'Brez kontaktne osebe'}</span></div><button onClick={() => { setEditing(selected); setOpen(true); }}>Uredi</button></header><div className={styles.clientContacts}><span><small>E-pošta</small><strong>{selected.email || '—'}</strong></span><span><small>Telefon</small><strong>{selected.phone || '—'}</strong></span><span><small>Davčna št.</small><strong>{selected.tax || '—'}</strong></span><span><small>Naslov</small><strong>{selected.address || '—'}</strong></span></div><div className={styles.clientFinance}><span><small>Plačano</small><strong>{money(selectedInvoices.filter(item => item.paid).reduce((sum, item) => sum + item.amount, 0))}</strong></span><span><small>Odprti računi</small><strong>{money(selectedInvoices.filter(item => !item.paid).reduce((sum, item) => sum + item.amount, 0))}</strong></span><span><small>Stroški</small><strong>{money(selectedExpenses.reduce((sum, item) => sum + item.amount, 0))}</strong></span></div><div className={styles.clientDocuments}><h3>Dokumenti in projekti</h3>{selectedOffers.map(item => <span key={item.id}><b>Ponudba</b>{item.nazivPonudbe || item.id}</span>)}{selectedContracts.map(item => <span key={item.id}><b>Pogodba</b>{item.title}</span>)}{selectedInvoices.map(item => <span key={item.id}><b>Račun</b>{money(item.amount)} · {item.paid ? 'plačan' : 'odprt'}</span>)}{!selectedOffers.length && !selectedContracts.length && !selectedInvoices.length && <p>Stranka še nima povezanih dokumentov.</p>}</div><button className={styles.deleteClient} onClick={() => remove(selected)}>Izbriši profil stranke</button></> : <div className={styles.clientProfileEmpty}><span>↗</span><strong>Izberi stranko.</strong><p>Na enem mestu boš videla vse njene dogovore in rezultate.</p></div>}</section></div>
  </div>;
}

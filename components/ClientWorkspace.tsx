'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { MagnifyingGlass } from '@phosphor-icons/react';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';
import { loadFlowData, saveFlowCollection, type FlowClient, type FlowOffer, type FlowProjectLink } from '@/lib/pinartFlowStore';
import { podatkiZaPredogled, usePredogled } from '@/lib/predogled';

/* Ikone poenotene na Phosphor. Inline fill/stroke preglasi stare stroke-based
   CSS pravila (fill:none), da so Phosphor ikone vidne. */
const IKONA_SLOG = { fill: 'currentColor', stroke: 'none' } as const;

/* status projekta (ponudba => projekt) — ista beseda/odtenek kot v ProjectsWorkspace
   (projectStatusInfo), da je jezik med "stranka" in "projekt" strani enoten */
const projectStatusInfo = (status: FlowOffer['status']): { label: string; tone: 'success' | 'waiting' | 'danger' | 'neutral' } => {
  if (status === 'accepted') return { label: 'Aktivni', tone: 'success' };
  if (status === 'sent') return { label: 'Čakajo', tone: 'waiting' };
  if (status === 'rejected') return { label: 'Zaključeni', tone: 'success' };
  return { label: 'Osnutek', tone: 'neutral' };
};

type Client = FlowClient;
type CalculatorClient = { ime: string; email?: string; oseba?: string; naslov?: string; davcna?: string };
type Invoice = { id: string; client: string; amount: number; paid: boolean; date: string; sourceOfferId?: string };
type Expense = { id: string; client?: string; amount: number; sourceOfferId?: string };
type Contract = { id: string; title: string; client: string; status: string; sourceOfferId?: string };
const key = (value: string) => value.trim().toLocaleLowerCase('sl-SI');
const money = (value: number) => `${value.toLocaleString('sl-SI', { maximumFractionDigits: 2 })} €`;
const datStr = (s: string) => { const d = new Date(s); return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('sl-SI'); };

/* Povezave do zunanjih datotek/orodij ZA STRANKO ("Dokumentacija / povezave" na
   profilu stranke) — enak UX kot "05 · DOKUMENTACIJA" na projektu (glej
   ProjectsWorkspace + lib/pinartFlowStore loadProjectLinks/saveProjectLinks),
   a ločena, lahka shramba po ID-ju stranke (ne posegamo v pinartFlowStore.ts). */
const CLIENT_LINKS_KEY = 'pinart-flow-stranka-linki';
const loadClientLinks = (clientId: string): FlowProjectLink[] => {
  if (typeof window === 'undefined') return [];
  try {
    const all = JSON.parse(localStorage.getItem(CLIENT_LINKS_KEY) || '{}') as Record<string, FlowProjectLink[]>;
    return all[clientId] || [];
  } catch { return []; }
};
const saveClientLinks = (clientId: string, links: FlowProjectLink[]) => {
  if (typeof window === 'undefined') return;
  let all: Record<string, FlowProjectLink[]> = {};
  try { all = JSON.parse(localStorage.getItem(CLIENT_LINKS_KEY) || '{}'); } catch { all = {}; }
  localStorage.setItem(CLIENT_LINKS_KEY, JSON.stringify({ ...all, [clientId]: links }));
};

export default function ClientWorkspace() {
  const [clients, setClients] = useState<Client[]>([]);
  /* Demo/Prazno velja za VSE strani (lib/predogled.ts). V teh nacinih je
     urejanje onemogoceno — sicer bi popravek izmisljenega zapisa pisal v pravo bazo. */
  const [nacin] = usePredogled();
  const samoOgled = nacin !== 'mine';
  /* isti base kot DashboardSidebar/NazajNaPregled — klik na projekt odpre
     ${base}/kalkulator/projekti?projekt=<id> (bere ga ProjectsWorkspace) */
  const pathname = usePathname() || '';
  const base = pathname.startsWith('/en/') ? '/en' : '';

  const [offers, setOffers] = useState<FlowOffer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selected, setSelected] = useState<Client | null>(null);
  const [editing, setEditing] = useState<Client | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  /* Dokumentacija / povezave — glej razlago pri CLIENT_LINKS_KEY zgoraj.
     V predogledu (demo/prazno) prikažemo primere, dodajanje je onemogočeno. */
  const [links, setLinks] = useState<FlowProjectLink[]>([]);
  const [linkOznaka, setLinkOznaka] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [dodajOdprt, setDodajOdprt] = useState(false);

  useEffect(() => {
    const calculator = JSON.parse(localStorage.getItem('pinart-kalkulator-narocniki') || '[]') as Array<CalculatorClient | string>;
    const flow = podatkiZaPredogled(nacin, loadFlowData());
    const dashboard = flow.clients;
    const merged = new Map<string, Client>();
    calculator.forEach(item => { const value = typeof item === 'string' ? { ime: item } : item; if (value.ime) merged.set(key(value.ime), { id: crypto.randomUUID(), name: value.ime, email: value.email, contact: value.oseba, address: value.naslov, tax: value.davcna }); });
    dashboard.forEach(item => { const old = merged.get(key(item.name)); merged.set(key(item.name), { ...old, id: item.id || old?.id || crypto.randomUUID(), name: item.name, email: item.email || old?.email, phone: item.phone, tax: item.tax || old?.tax }); });
    setClients([...merged.values()]);
    /* flow.offers (ne surov arhiv) = ISTI seznam kot ga ProjectsWorkspace bere prek
       podatkiZaPredogled (id/status/agreedAmount usklajeni, demo/prazno spoštovana) —
       tako klik na projekt tu odpre pravi projekt v ProjectsWorkspace. */
    setOffers(flow.offers);
    setInvoices(flow.invoices); setExpenses(flow.expenses); setContracts(flow.contracts);
  }, [nacin]);

  /* povezave sledijo izbrani stranki; v predogledu prikažemo primere, da se vidi
     poln videz razdelka, v pravem računu preberemo dejansko shranjene povezave */
  useEffect(() => {
    const demo: FlowProjectLink[] = [
      { oznaka: 'Figma · Dizajn', url: 'https://figma.com' },
      { oznaka: 'Drive · Pogodbe', url: 'https://drive.google.com' },
      { oznaka: 'Splet · Živa stran', url: 'https://pinart.si' },
    ];
    setLinks(samoOgled ? demo : (selected ? loadClientLinks(selected.id) : []));
    setLinkOznaka(''); setLinkUrl(''); setDodajOdprt(false);
  }, [selected?.id, samoOgled]);

  const addClientLink = () => {
    if (samoOgled || !selected) return;
    const oznaka = linkOznaka.trim(); const url = linkUrl.trim();
    if (!oznaka || !url) return;
    const next = [...links, { oznaka, url }];
    setLinks(next); saveClientLinks(selected.id, next);
    setLinkOznaka(''); setLinkUrl('');
  };
  const removeClientLink = (index: number) => {
    if (samoOgled || !selected) return;
    const next = links.filter((_, i) => i !== index);
    setLinks(next); saveClientLinks(selected.id, next);
  };

  const persist = (next: Client[]) => {
    if (samoOgled) return;
    setClients(next);
    saveFlowCollection('clients', next);
    localStorage.setItem('pinart-kalkulator-narocniki', JSON.stringify(next.map(item => ({ ime: item.name, email: item.email, oseba: item.contact, naslov: item.address, davcna: item.tax }))));
  };
  const save = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); const client: Client = { id: editing?.id || crypto.randomUUID(), name: String(data.get('name')), email: String(data.get('email') || ''), contact: String(data.get('contact') || ''), phone: String(data.get('phone') || ''), address: String(data.get('address') || ''), tax: String(data.get('tax') || '') }; const next = editing ? clients.map(item => item.id === editing.id ? client : item) : [client, ...clients]; persist(next); setSelected(client); setEditing(null); setOpen(false); };
  const remove = (client: Client) => { if (!window.confirm(`Izbrišem profil stranke »${client.name}«? Ponudbe, pogodbe in računi bodo ostali shranjeni.`)) return; persist(clients.filter(item => item.id !== client.id)); setSelected(null); };
  const visible = clients.filter(client => [client.name, client.email, client.contact].some(value => value?.toLocaleLowerCase('sl-SI').includes(search.toLocaleLowerCase('sl-SI'))));
  const stats = useMemo(() => clients.map(client => { const name = key(client.name); const clientInvoices = invoices.filter(item => key(item.client) === name); const clientExpenses = expenses.filter(item => item.client && key(item.client) === name); return { id: client.id, revenue: clientInvoices.filter(item => item.paid).reduce((sum, item) => sum + item.amount, 0), open: clientInvoices.filter(item => !item.paid).reduce((sum, item) => sum + item.amount, 0), profit: clientInvoices.filter(item => item.paid).reduce((sum, item) => sum + item.amount, 0) - clientExpenses.reduce((sum, item) => sum + item.amount, 0) }; }), [clients, invoices, expenses]);
  const selectedProjects = selected ? offers.filter(item => key(item.client) === key(selected.name)) : [];
  const selectedInvoices = selected ? invoices.filter(item => key(item.client) === key(selected.name)) : [];
  const selectedExpenses = selected ? expenses.filter(item => item.client && key(item.client) === key(selected.name)) : [];

  return <div className={styles.clientPage}>
    <section className={styles.clientToolbar}><label><MagnifyingGlass className={styles.searchIcon} size={20} weight="regular" aria-hidden="true" style={IKONA_SLOG} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Poišči stranko, kontakt ali e-pošto …" /></label><button onClick={() => { setEditing(null); setOpen(true); }}>+ Nova stranka</button></section>
    {open && <section className={styles.clientEditor}><div><p className={styles.eyebrow}>{editing ? 'UREDI PROFIL' : 'NOVA STRANKA'}</p><h2>Podatki, ki jih potrebuješ.</h2></div><form onSubmit={save}><label>Podjetje ali ime<input required name="name" defaultValue={editing?.name} /></label><label>Kontaktna oseba<input name="contact" defaultValue={editing?.contact} /></label><label>E-pošta<input name="email" type="email" defaultValue={editing?.email} /></label><label>Telefon<input name="phone" defaultValue={editing?.phone} /></label><label>Naslov<input name="address" defaultValue={editing?.address} /></label><label>Davčna številka<input name="tax" defaultValue={editing?.tax} /></label><div className={styles.clientEditorActions}><button type="button" onClick={() => setOpen(false)}>Prekliči</button><button>Shrani profil</button></div></form></section>}
    <div className={styles.clientLayout}><section className={styles.clientDirectory}><header><div><p className={styles.eyebrow}>IMENIK</p><h2>{visible.length} strank</h2></div></header>{visible.length ? visible.map(client => { const result = stats.find(item => item.id === client.id); return <button key={client.id} className={selected?.id === client.id ? styles.clientActive : ''} onClick={() => setSelected(client)}><span className={styles.clientInitials}>{client.name.split(/\s+/).map(word => word[0]).join('').slice(0, 2).toUpperCase()}</span><span><strong>{client.name}</strong><small>{client.contact || client.email || 'Brez kontakta'}</small></span><span><strong>{money(result?.revenue || 0)}</strong><small>plačano</small></span><i>›</i></button>; }) : <p className={styles.clientEmpty}>Ni najdenih strank.</p>}</section>
      <section className={styles.clientProfile}>{selected ? <><header><span className={styles.clientProfileAvatar}>{selected.name.split(/\s+/).map(word => word[0]).join('').slice(0, 2).toUpperCase()}</span><div><p className={styles.eyebrow}>PROFIL STRANKE</p><h2>{selected.name}</h2><span>{selected.contact || 'Brez kontaktne osebe'}</span></div><button onClick={() => { setEditing(selected); setOpen(true); }}>Uredi</button></header><div className={styles.clientContacts}><span><small>E-pošta</small><strong>{selected.email || '—'}</strong></span><span><small>Telefon</small><strong>{selected.phone || '—'}</strong></span><span><small>Davčna št.</small><strong>{selected.tax || '—'}</strong></span><span><small>Naslov</small><strong>{selected.address || '—'}</strong></span></div><div className={styles.clientFinance}><span><small>Plačano</small><strong>{money(selectedInvoices.filter(item => item.paid).reduce((sum, item) => sum + item.amount, 0))}</strong></span><span><small>Odprti računi</small><strong>{money(selectedInvoices.filter(item => !item.paid).reduce((sum, item) => sum + item.amount, 0))}</strong></span><span><small>Stroški</small><strong>{money(selectedExpenses.reduce((sum, item) => sum + item.amount, 0))}</strong></span></div><div className={styles.clientProjects}><h3>Projekti stranke</h3>{selectedProjects.length ? <div className={styles.clientProjectList}>{selectedProjects.map(offer => { const info = projectStatusInfo(offer.status); return <Link key={offer.id} href={`${base}/kalkulator/projekti?projekt=${offer.id}`} className={styles.clientProjectRow}><span className={styles.clientProjectVrh}><strong>{offer.title}</strong><strong className={styles.clientProjectZnesek}>{offer.agreedAmount ? money(offer.agreedAmount) : '—'}</strong></span><span className={styles.clientProjectDno}><small>{datStr(offer.date)}</small><i className={styles.clientProjectPika} data-tone={info.tone}>{info.label}</i></span></Link>; })}</div> : <p className={styles.clientProjectPrazno}>Ta stranka še nima projektov.</p>}</div><div className={styles.clientLinki}><div className={styles.clientLinkGlava}><div><h3>Skupne povezave stranke</h3><small className={styles.clientLinkPodnaslov}>Viri, ki veljajo čez vse projekte (npr. blagovna knjiga, živa spletna stran). Projektni dokumenti so na projektu.</small></div><button type="button" className={styles.clientLinkGumb} onClick={() => setDodajOdprt(prej => !prej)}>{dodajOdprt ? 'Prekliči' : '+ Dodaj povezavo'}</button></div>{links.length ? <div className={styles.clientLinkSeznam}>{links.map((link, index) => <div key={`${link.url}-${index}`} className={styles.clientLinkVrstica}><a href={link.url} target="_blank" rel="noopener noreferrer">{link.oznaka}</a>{!samoOgled && <button type="button" className={styles.clientLinkBrisi} onClick={() => removeClientLink(index)} aria-label={`Izbriši povezavo ${link.oznaka}`}>×</button>}</div>)}</div> : <p className={styles.clientLinkPrazno}>Še ni dodanih povezav.</p>}{!samoOgled && dodajOdprt && <div className={styles.clientLinkObrazec}><input type="text" value={linkOznaka} onChange={event => setLinkOznaka(event.target.value)} placeholder="npr. Figma" aria-label="Oznaka povezave" /><input type="url" value={linkUrl} onChange={event => setLinkUrl(event.target.value)} placeholder="https://…" aria-label="Naslov povezave (Figma, Drive, spletna stran …)" /><button type="button" className={styles.clientLinkDodaj} onClick={addClientLink} disabled={!linkOznaka.trim() || !linkUrl.trim()}>Shrani povezavo</button></div>}{samoOgled && dodajOdprt && <p className={styles.clientLinkNamig}>Dodajanje povezav ni na voljo v predogledu (demo). Prijavi se v svoj račun.</p>}</div><button className={styles.deleteClient} onClick={() => remove(selected)}>Izbriši profil stranke</button></> : <div className={styles.clientProfileEmpty}><span>↗</span><strong>Izberi stranko.</strong><p>Na enem mestu boš videla vse njene dogovore in rezultate.</p></div>}</section></div>
  </div>;
}

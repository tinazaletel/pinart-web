'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { MagnifyingGlass, Globe, Phone, EnvelopeSimple, PencilSimple } from '@phosphor-icons/react';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';
import { loadFlowData, saveFlowCollection, type FlowClient, type FlowOffer, type FlowProjectLink, type Kontakt } from '@/lib/pinartFlowStore';
import { podatkiZaPredogled, usePredogled } from '@/lib/predogled';
import { preberiDnevnik, shraniDnevnik, zabeleziInterakcijo, DNEVNIK_TIPI, dnevnikTipLabel, type DnevnikVnos, type DnevnikTip } from '@/lib/dnevnik';

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
type CalculatorClient = { ime: string; email?: string; oseba?: string; naslov?: string; davcna?: string; splet?: string };
type Invoice = { id: string; client: string; amount: number; paid: boolean; date: string; sourceOfferId?: string };
type Expense = { id: string; client?: string; amount: number; sourceOfferId?: string };
type Contract = { id: string; title: string; client: string; status: string; sourceOfferId?: string };
const key = (value: string) => value.trim().toLocaleLowerCase('sl-SI');
const money = (value: number) => `${value.toLocaleString('sl-SI', { maximumFractionDigits: 2 })} €`;
const datStr = (s: string) => { const d = new Date(s); return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('sl-SI'); };
const casStr = (s: string) => { const d = new Date(s); return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' }); };

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
/* Klicne kode držav — izbirnik pred telefonsko številko. Ob shranjevanju se
   koda + številka združita v en niz (npr. "+386 31 569 103"). */
const DIAL_KODE: { koda: string; zastava: string; ime: string }[] = [
  { koda: '+386', zastava: '🇸🇮', ime: 'Slovenija' },
  { koda: '+385', zastava: '🇭🇷', ime: 'Hrvaška' },
  { koda: '+43', zastava: '🇦🇹', ime: 'Avstrija' },
  { koda: '+39', zastava: '🇮🇹', ime: 'Italija' },
  { koda: '+49', zastava: '🇩🇪', ime: 'Nemčija' },
  { koda: '+381', zastava: '🇷🇸', ime: 'Srbija' },
  { koda: '+387', zastava: '🇧🇦', ime: 'BiH' },
  { koda: '+382', zastava: '🇲🇪', ime: 'Črna gora' },
  { koda: '+389', zastava: '🇲🇰', ime: 'Makedonija' },
  { koda: '+44', zastava: '🇬🇧', ime: 'Zdr. kraljestvo' },
  { koda: '+41', zastava: '🇨🇭', ime: 'Švica' },
  { koda: '+36', zastava: '🇭🇺', ime: 'Madžarska' },
  { koda: '+420', zastava: '🇨🇿', ime: 'Češka' },
  { koda: '+1', zastava: '🇺🇸', ime: 'ZDA / Kanada' },
];
const razcleniTel = (p?: string): { koda: string; num: string } => {
  const t = (p || '').trim();
  const najden = [...DIAL_KODE].sort((a, b) => b.koda.length - a.koda.length).find(k => t.startsWith(k.koda));
  return najden ? { koda: najden.koda, num: t.slice(najden.koda.length).trim() } : { koda: '+386', num: t };
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
  const [nacin, nastaviNacin] = usePredogled();
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

  /* CRM dnevnik stranke — kronologija klicev/sestankov/dogovorov, glej lib/dnevnik.ts.
     Isti vzorec kot povezave stranke zgoraj (samoOgled prikaže demo, sicer prava shramba). */
  const [dnevnik, setDnevnik] = useState<DnevnikVnos[]>([]);
  const [dnOdprt, setDnOdprt] = useState(false);
  const [dnTip, setDnTip] = useState<DnevnikTip>('klic');
  const [dnDatum, setDnDatum] = useState(() => new Date().toISOString().slice(0, 10));
  const [dnCas, setDnCas] = useState(() => new Date().toTimeString().slice(0, 5));
  const [dnBesedilo, setDnBesedilo] = useState('');
  const [dnProjekt, setDnProjekt] = useState('');

  /* Kontakti stranke (vec oseb — Honeywell bolečina: vsaka svoj telefon/mail).
     Shranjeni na FlowClient.kontakti (lib/pinartFlowStore), klik na pokliči/piši
     samodejno zabelezi zapis v dnevnik (glej beleziStik spodaj). */
  const [kontaktOdprt, setKontaktOdprt] = useState(false);
  const [kontaktUrejam, setKontaktUrejam] = useState<Kontakt | null>(null);
  const kontaktiDemo: Kontakt[] = [
    { id: 'k1', ime: 'Ana Novak', vloga: 'Vodja nabave', telefon: '+386 40 111 222', email: 'ana.novak@primer.si' },
    { id: 'k2', ime: 'Bine Kranjc', vloga: 'IT kontakt', telefon: '+386 41 333 444', email: 'bine.kranjc@primer.si' },
    { id: 'k3', ime: 'Nina Kralj', vloga: 'Direktorica marketinga', telefon: '+386 31 555 666', email: 'nina.kralj@primer.si' },
  ];
  const kontakti = samoOgled ? kontaktiDemo : (selected?.kontakti || []);

  useEffect(() => {
    const calculator = JSON.parse(localStorage.getItem('pinart-kalkulator-narocniki') || '[]') as Array<CalculatorClient | string>;
    const flow = podatkiZaPredogled(nacin, loadFlowData());
    const dashboard = flow.clients;
    const merged = new Map<string, Client>();
    calculator.forEach(item => { const value = typeof item === 'string' ? { ime: item } : item; if (value.ime) merged.set(key(value.ime), { id: crypto.randomUUID(), name: value.ime, email: value.email, contact: value.oseba, address: value.naslov, tax: value.davcna, website: value.splet }); });
    dashboard.forEach(item => { const old = merged.get(key(item.name)); merged.set(key(item.name), { ...old, id: item.id || old?.id || crypto.randomUUID(), name: item.name, email: item.email || old?.email, phone: item.phone, tax: item.tax || old?.tax, website: item.website || old?.website }); });
    setClients([...merged.values()]);
    /* flow.offers (ne surov arhiv) = ISTI seznam kot ga ProjectsWorkspace bere prek
       podatkiZaPredogled (id/status/agreedAmount usklajeni, demo/prazno spoštovana) —
       tako klik na projekt tu odpre pravi projekt v ProjectsWorkspace. */
    setOffers(flow.offers);
    setInvoices(flow.invoices); setExpenses(flow.expenses); setContracts(flow.contracts);
  }, [nacin]);

  /* ?stranka=<ime> (npr. klik na naročnika v projektu) -> samodejno izberi to stranko */
  const searchParams = useSearchParams();
  const strankaIzUrla = useRef(false);
  useEffect(() => {
    if (strankaIzUrla.current) return;
    const ime = searchParams.get('stranka');
    if (!ime) return;
    const najdena = clients.find(client => key(client.name) === key(ime));
    if (!najdena) return;
    strankaIzUrla.current = true;
    setSelected(najdena);
  }, [clients, searchParams]);

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

  /* dnevnik sledi izbrani stranki — enak vzorec kot povezave zgoraj */
  useEffect(() => {
    const danes = new Date().toISOString().slice(0, 10);
    const demo: DnevnikVnos[] = [
      { id: 'd1', clientId: 'demo', tip: 'dogovor', datum: danes, besedilo: 'Potrdili obseg prenove; začetek naslednji teden.', created: '3' },
      { id: 'd2', clientId: 'demo', tip: 'klic', datum: danes, besedilo: 'Uskladili termin sestanka in potrebna gradiva.', created: '2' },
      { id: 'd3', clientId: 'demo', tip: 'email', datum: danes, besedilo: 'Poslala predlog barvne palete v pregled.', created: '1' },
    ];
    setDnevnik(samoOgled ? demo : (selected ? preberiDnevnik(selected.id) : []));
    setDnOdprt(false); setDnTip('klic'); setDnDatum(danes); setDnBesedilo(''); setDnProjekt('');
  }, [selected?.id, samoOgled]);

  /* kontakti obrazec se zapre ob menjavi stranke — enak vzorec kot dnevnik/povezave */
  useEffect(() => { setKontaktOdprt(false); setKontaktUrejam(null); }, [selected?.id]);

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

  const addDnevnik = () => {
    if (samoOgled || !selected) return;
    const besedilo = dnBesedilo.trim(); if (!besedilo) return;
    const dan = dnDatum || new Date().toISOString().slice(0, 10);
    const kdaj = new Date(`${dan}T${dnCas || new Date().toTimeString().slice(0, 5)}:00`);
    const created = isNaN(kdaj.getTime()) ? new Date().toISOString() : kdaj.toISOString();
    const vnos: DnevnikVnos = { id: crypto.randomUUID(), clientId: selected.id, projectId: dnProjekt || undefined, tip: dnTip, datum: dan, besedilo, created };
    const next = [vnos, ...dnevnik].sort((a, b) => (b.datum + b.created).localeCompare(a.datum + a.created));
    setDnevnik(next); shraniDnevnik(selected.id, next);
    setDnBesedilo(''); setDnProjekt(''); setDnTip('klic'); setDnOdprt(false);
  };
  const removeDnevnik = (id: string) => {
    if (samoOgled || !selected) return;
    const next = dnevnik.filter(v => v.id !== id);
    setDnevnik(next); shraniDnevnik(selected.id, next);
  };

  /* Kontakti: shrani seznam na izbrano stranko (isti persist() kot za ostala
     polja profila, torej gre skozi saveFlowCollection + cloud sync). */
  const persistKontakti = (next: Kontakt[]) => {
    if (samoOgled || !selected) return;
    const posodobljena: Client = { ...selected, kontakti: next };
    persist(clients.map(item => item.id === selected.id ? posodobljena : item));
    setSelected(posodobljena);
  };
  const shraniKontakt = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (samoOgled || !selected) return;
    const data = new FormData(event.currentTarget);
    const ime = String(data.get('ime') || '').trim();
    if (!ime) return;
    const kontakt: Kontakt = {
      id: kontaktUrejam?.id || crypto.randomUUID(),
      ime,
      vloga: String(data.get('vloga') || '').trim() || undefined,
      telefon: String(data.get('telefon') || '').trim() || undefined,
      email: String(data.get('email') || '').trim() || undefined,
    };
    const obstojeci = selected.kontakti || [];
    const next = kontaktUrejam ? obstojeci.map(item => item.id === kontaktUrejam.id ? kontakt : item) : [...obstojeci, kontakt];
    persistKontakti(next);
    setKontaktUrejam(null); setKontaktOdprt(false);
  };
  const izbrisiKontakt = (id: string) => {
    if (samoOgled || !selected) return;
    persistKontakti((selected.kontakti || []).filter(item => item.id !== id));
  };
  /* klik na "pokliči"/"piši" pri kontaktu -> samodejen zapis v dnevnik stranke
     (glej lib/dnevnik zabeleziInterakcijo); link (tel:/mailto:) deluje naprej,
     samo osvezimo prikazan dnevnik, da se zapis takoj vidi. */
  const beleziStik = (kontakt: Kontakt, vrsta: 'klic' | 'epošta') => {
    if (samoOgled || !selected) return;
    zabeleziInterakcijo(selected.id, {
      tip: vrsta,
      besedilo: (vrsta === 'klic' ? 'Klic — ' : 'E-pošta — ') + kontakt.ime,
      kontaktId: kontakt.id,
    });
    setDnevnik(preberiDnevnik(selected.id));
  };

  const persist = (next: Client[]) => {
    if (samoOgled) return;
    setClients(next);
    saveFlowCollection('clients', next);
    localStorage.setItem('pinart-kalkulator-narocniki', JSON.stringify(next.map(item => ({ ime: item.name, email: item.email, oseba: item.contact, naslov: item.address, davcna: item.tax, splet: item.website }))));
  };
  const save = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); const client: Client = { id: editing?.id || crypto.randomUUID(), name: String(data.get('name')), email: String(data.get('email') || ''), contact: String(data.get('contact') || ''), phone: [String(data.get('predklic') || '').trim(), String(data.get('phone') || '').trim()].filter(Boolean).join(' '), address: String(data.get('address') || ''), tax: String(data.get('tax') || ''), website: String(data.get('website') || '') }; const next = editing ? clients.map(item => item.id === editing.id ? client : item) : [client, ...clients]; persist(next); setSelected(client); setEditing(null); setOpen(false); };
  const remove = (client: Client) => { if (!window.confirm(`Izbrišem profil stranke »${client.name}«? Ponudbe, pogodbe in računi bodo ostali shranjeni.`)) return; persist(clients.filter(item => item.id !== client.id)); setSelected(null); };
  const visible = clients.filter(client => [client.name, client.email, client.contact].some(value => value?.toLocaleLowerCase('sl-SI').includes(search.toLocaleLowerCase('sl-SI'))));
  const stats = useMemo(() => clients.map(client => { const name = key(client.name); const clientInvoices = invoices.filter(item => key(item.client) === name); const clientExpenses = expenses.filter(item => item.client && key(item.client) === name); return { id: client.id, revenue: clientInvoices.filter(item => item.paid).reduce((sum, item) => sum + item.amount, 0), open: clientInvoices.filter(item => !item.paid).reduce((sum, item) => sum + item.amount, 0), profit: clientInvoices.filter(item => item.paid).reduce((sum, item) => sum + item.amount, 0) - clientExpenses.reduce((sum, item) => sum + item.amount, 0) }; }), [clients, invoices, expenses]);
  const selectedProjects = selected ? offers.filter(item => key(item.client) === key(selected.name)) : [];
  const selectedInvoices = selected ? invoices.filter(item => key(item.client) === key(selected.name)) : [];
  const selectedExpenses = selected ? expenses.filter(item => item.client && key(item.client) === key(selected.name)) : [];

  return <div className={styles.clientPage}>
    <section className={styles.clientToolbar}><label><MagnifyingGlass className={styles.searchIcon} size={20} weight="regular" aria-hidden="true" style={IKONA_SLOG} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Poišči stranko, kontakt ali e-pošto …" /></label><button onClick={() => { setEditing(null); setOpen(true); }}>+ Nova stranka</button></section>
    {samoOgled && <section className={styles.predogledBanner}><span><strong>Predogled</strong> — vzorčni podatki, urejanje je izklopljeno. (V pravem orodju tega ni, vedno urejaš.)</span><button type="button" onClick={() => nastaviNacin('mine')}>Preklopi na »Moji podatki«</button></section>}
    {open && <section className={styles.clientEditor}><div><p className={styles.eyebrow}>{editing ? 'UREDI PROFIL' : 'NOVA STRANKA'}</p><h2>Podatki, ki jih potrebuješ.</h2></div><form onSubmit={save}><label>Podjetje ali ime<input required name="name" defaultValue={editing?.name} /></label><label>Kontaktna oseba<input name="contact" defaultValue={editing?.contact} /></label><label>E-pošta<input name="email" type="email" defaultValue={editing?.email} /></label><label>Telefon<span style={{ display: 'flex', gap: '.4rem' }}><select name="predklic" defaultValue={razcleniTel(editing?.phone).koda} aria-label="Klicna koda" style={{ flex: 'none', width: '7.3rem' }}>{DIAL_KODE.map(k => <option key={k.koda} value={k.koda}>{k.zastava} {k.koda}</option>)}</select><input name="phone" defaultValue={razcleniTel(editing?.phone).num} inputMode="tel" placeholder="31 569 103" style={{ flex: 1, minWidth: 0 }} /></span></label><label>Naslov<input name="address" defaultValue={editing?.address} /></label><label>Davčna številka<input name="tax" defaultValue={editing?.tax} /></label><label>Spletna stran<input name="website" type="text" defaultValue={editing?.website} placeholder="www.primer.com" /></label><div className={styles.clientEditorActions}><button type="button" onClick={() => setOpen(false)}>Prekliči</button><button>Shrani profil</button></div></form></section>}
    <div className={styles.clientLayout}><section className={styles.clientDirectory}><header><div><p className={styles.eyebrow}>IMENIK</p><h2>{visible.length} strank</h2></div></header>{visible.length ? visible.map(client => { const result = stats.find(item => item.id === client.id); return <button key={client.id} className={selected?.id === client.id ? styles.clientActive : ''} onClick={() => setSelected(client)}><span className={styles.clientInitials}>{client.name.split(/\s+/).map(word => word[0]).join('').slice(0, 2).toUpperCase()}</span><span><strong>{client.name}</strong><small>{client.contact || client.email || 'Brez kontakta'}</small></span><span><strong>{money(result?.revenue || 0)}</strong><small>plačano</small></span><i>›</i></button>; }) : <p className={styles.clientEmpty}>Ni najdenih strank.</p>}</section>
      <section className={styles.clientProfile}>{selected ? <><header><span className={styles.clientProfileAvatar}>{selected.name.split(/\s+/).map(word => word[0]).join('').slice(0, 2).toUpperCase()}</span><div><p className={styles.eyebrow}>PROFIL STRANKE</p><h2>{selected.name}</h2><span>{selected.contact || 'Brez kontaktne osebe'}</span></div><button onClick={() => { setEditing(selected); setOpen(true); }} title="Uredi podatke stranke" aria-label="Uredi podatke stranke" style={{ display: 'inline-flex', alignItems: 'center', gap: '.35rem' }}><PencilSimple size={13} weight="bold" /> Uredi</button></header><div className={styles.clientContacts}><span className={styles.clientSplet} style={{ order: 99 }}><small>Spletna stran</small>{selected.website ? <a href={selected.website.startsWith('http') ? selected.website : `https://${selected.website}`} target="_blank" rel="noopener noreferrer"><Globe size={15} weight="bold" /><strong>{selected.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</strong></a> : <strong>—</strong>}</span><span><small>E-pošta</small><strong>{selected.email || '—'}</strong></span><span><small>Telefon</small>{selected.phone ? <a href={`tel:${selected.phone.replace(/\s+/g, '')}`} onClick={() => { if (!samoOgled && selected) { zabeleziInterakcijo(selected.id, { tip: 'klic', besedilo: 'Klic — ' + selected.name }); setDnevnik(preberiDnevnik(selected.id)); } }} style={{ color: 'inherit', textDecoration: 'none' }}><strong>{selected.phone}</strong></a> : <strong>—</strong>}</span><span><small>Davčna št.</small><strong>{selected.tax || '—'}</strong></span><span><small>Naslov</small><strong>{selected.address || '—'}</strong></span></div><div className={styles.clientFinance}><span><small>Plačano</small><strong>{money(selectedInvoices.filter(item => item.paid).reduce((sum, item) => sum + item.amount, 0))}</strong></span><span><small>Odprti računi</small><strong>{money(selectedInvoices.filter(item => !item.paid).reduce((sum, item) => sum + item.amount, 0))}</strong></span><span><small>Stroški</small><strong>{money(selectedExpenses.reduce((sum, item) => sum + item.amount, 0))}</strong></span></div><div className={styles.clientLinki}><div className={styles.clientLinkGlava}><div><h3>Kontakti</h3><small className={styles.clientLinkPodnaslov}>Vsaka oseba pri stranki — svoj telefon in mail. Klic ali mail se sam zabeleži spodaj v dnevniku.</small></div><button type="button" className={styles.clientLinkGumb} disabled={samoOgled} title={samoOgled ? 'Na voljo v načinu »Moji podatki« — zdaj gledaš predogled' : undefined} style={samoOgled ? { opacity: 0.5 } : undefined} onClick={() => { setKontaktUrejam(null); setKontaktOdprt(p => !p); }}>{kontaktOdprt ? 'Zapri' : 'Uredi kontakte'}</button></div>{!samoOgled && kontaktOdprt && <div className={styles.clientEditor}><div><p className={styles.eyebrow}>{kontaktUrejam ? 'UREDI OSEBO' : 'NOVA OSEBA'}</p><h2>Kontaktna oseba.</h2></div><form onSubmit={shraniKontakt}><label>Ime in priimek<input required name="ime" defaultValue={kontaktUrejam?.ime} /></label><label>Vloga<input name="vloga" defaultValue={kontaktUrejam?.vloga} placeholder="npr. vodja nabave" /></label><label>Telefon<input name="telefon" defaultValue={kontaktUrejam?.telefon} /></label><label>E-pošta<input name="email" type="email" defaultValue={kontaktUrejam?.email} /></label><div className={styles.clientEditorActions}><button type="button" onClick={() => { setKontaktOdprt(false); setKontaktUrejam(null); }}>Prekliči</button><button>Shrani osebo</button></div></form></div>}{kontakti.length ? <div className={styles.clientLinkSeznam}>{kontakti.map(k => <div key={k.id} className={styles.clientLinkVrstica} style={{ flexDirection: 'column', alignItems: 'stretch', gap: '.35rem' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '.5rem' }}><span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}><strong>{k.ime}</strong>{k.vloga && <small style={{ fontWeight: 500, color: 'var(--ink)' }}>{k.vloga}</small>}</span><span style={{ display: 'flex', gap: '.6rem', flexShrink: 0 }}><button type="button" className={styles.clientLinkBrisi} disabled={samoOgled} title={samoOgled ? 'Na voljo v načinu »Moji podatki«' : 'Uredi kontakt'} style={samoOgled ? { opacity: 0.5 } : undefined} onClick={() => { setKontaktUrejam(k); setKontaktOdprt(true); }} aria-label={`Uredi kontakt ${k.ime}`}><PencilSimple size={14} weight="bold" /></button><button type="button" className={styles.clientLinkBrisi} disabled={samoOgled} title={samoOgled ? 'Na voljo v načinu »Moji podatki«' : undefined} style={samoOgled ? { opacity: 0.5 } : undefined} onClick={() => izbrisiKontakt(k.id)} aria-label={`Izbriši kontakt ${k.ime}`}>×</button></span></div>{(k.telefon || k.email) && <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem' }}>{k.telefon && <a href={`tel:${k.telefon.replace(/\s+/g, '')}`} className={styles.clientDnevnikProj} style={{ display: 'inline-flex', alignItems: 'center', gap: '.35rem' }} onClick={() => beleziStik(k, 'klic')}><Phone size={13} weight="bold" style={IKONA_SLOG} aria-hidden="true" />{k.telefon}</a>}{k.email && <a href={`mailto:${k.email}`} className={styles.clientDnevnikProj} style={{ display: 'inline-flex', alignItems: 'center', gap: '.35rem' }} onClick={() => beleziStik(k, 'epošta')}><EnvelopeSimple size={13} weight="bold" style={IKONA_SLOG} aria-hidden="true" />{k.email}</a>}</div>}</div>)}</div> : <p className={styles.clientLinkPrazno}>Še ni dodanih oseb.</p>}{samoOgled && kontaktOdprt && <p className={styles.clientLinkNamig}>Dodajanje kontaktov ni na voljo v predogledu (demo). Prijavi se v svoj račun.</p>}</div><div className={styles.clientProjects}><h3>Projekti stranke</h3>{selectedProjects.length ? <div className={styles.clientProjectList}>{selectedProjects.map(offer => { const info = projectStatusInfo(offer.status); return <Link key={offer.id} href={`${base}/kalkulator/projekti?projekt=${offer.id}`} className={styles.clientProjectRow}><span className={styles.clientProjectVrh}><strong>{offer.title}</strong><strong className={styles.clientProjectZnesek}>{offer.agreedAmount ? money(offer.agreedAmount) : '—'}</strong></span><span className={styles.clientProjectDno}><small>{datStr(offer.date)}</small><i className={styles.clientProjectPika} data-tone={info.tone}>{info.label}</i></span></Link>; })}</div> : <p className={styles.clientProjectPrazno}>Ta stranka še nima projektov.</p>}</div><div className={styles.clientDnevnik}><div className={styles.clientDnevnikGlava}><div><h3>Dnevnik stranke</h3><small className={styles.clientLinkPodnaslov}>Klici, sestanki, dogovori — kronologija odnosa. Tisto, kar Gmail search ne najde.</small></div><button type="button" className={styles.clientLinkGumb} disabled={samoOgled} title={samoOgled ? 'Na voljo v načinu »Moji podatki« — zdaj gledaš predogled' : undefined} style={samoOgled ? { opacity: 0.5 } : undefined} onClick={() => setDnOdprt(p => !p)}>{dnOdprt ? 'Prekliči' : '+ Dodaj zapis'}</button></div>{!samoOgled && dnOdprt && <div className={styles.clientDnevnikObrazec}><div className={styles.clientDnevnikTipi} role="group" aria-label="Vrsta zapisa">{DNEVNIK_TIPI.map(t => <button key={t.tip} type="button" className={dnTip === t.tip ? styles.clientDnevnikTipOn : ''} onClick={() => setDnTip(t.tip)}>{t.label}</button>)}</div><div className={styles.clientDnevnikVrsta}><input type="date" value={dnDatum} onChange={e => setDnDatum(e.target.value)} aria-label="Datum" /><input type="time" value={dnCas} onChange={e => setDnCas(e.target.value)} aria-label="Ura" />{selectedProjects.length > 0 && <select value={dnProjekt} onChange={e => setDnProjekt(e.target.value)} aria-label="Projekt (neobvezno)"><option value="">Brez projekta</option>{selectedProjects.map(o => <option key={o.id} value={o.id}>{o.title}</option>)}</select>}</div><textarea value={dnBesedilo} onChange={e => setDnBesedilo(e.target.value)} placeholder="Kaj je bilo dogovorjeno?" rows={3} aria-label="Zapis" /><button type="button" className={styles.clientLinkDodaj} onClick={addDnevnik} disabled={!dnBesedilo.trim()}>Shrani zapis</button></div>}{samoOgled && dnOdprt && <p className={styles.clientLinkNamig}>Dodajanje zapisov ni na voljo v predogledu (demo). Prijavi se v svoj račun.</p>}{dnevnik.length ? <ol className={styles.clientDnevnikSeznam}>{dnevnik.map(v => { const proj = v.projectId ? selectedProjects.find(o => o.id === v.projectId) : null; return <li key={v.id} className={styles.clientDnevnikVnos} data-tip={v.tip}><span className={styles.clientDnevnikPika} aria-hidden /><div className={styles.clientDnevnikVsebina}><div className={styles.clientDnevnikMeta}><strong>{dnevnikTipLabel(v.tip)}</strong><small>{datStr(v.datum)}{casStr(v.created) ? ` · ${casStr(v.created)}` : ''}</small>{proj && <i className={styles.clientDnevnikProj}>{proj.title}</i>}</div><p>{v.besedilo}</p></div>{!samoOgled && <button type="button" className={styles.clientLinkBrisi} onClick={() => removeDnevnik(v.id)} aria-label="Izbriši zapis">×</button>}</li>; })}</ol> : <p className={styles.clientLinkPrazno}>Še ni zapisov. Prvi klic ali sestanek zabeleži tukaj.</p>}</div><div className={styles.clientLinki}><div className={styles.clientLinkGlava}><div><h3>Skupne povezave stranke</h3><small className={styles.clientLinkPodnaslov}>Viri, ki veljajo čez vse projekte (npr. blagovna knjiga, živa spletna stran). Projektni dokumenti so na projektu.</small></div><button type="button" className={styles.clientLinkGumb} disabled={samoOgled} title={samoOgled ? 'Na voljo v načinu »Moji podatki« — zdaj gledaš predogled' : undefined} style={samoOgled ? { opacity: 0.5 } : undefined} onClick={() => setDodajOdprt(prej => !prej)}>{dodajOdprt ? 'Prekliči' : '+ Dodaj povezavo'}</button></div>{links.length ? <div className={styles.clientLinkSeznam}>{links.map((link, index) => <div key={`${link.url}-${index}`} className={styles.clientLinkVrstica}><a href={link.url} target="_blank" rel="noopener noreferrer">{link.oznaka}</a>{!samoOgled && <button type="button" className={styles.clientLinkBrisi} onClick={() => removeClientLink(index)} aria-label={`Izbriši povezavo ${link.oznaka}`}>×</button>}</div>)}</div> : <p className={styles.clientLinkPrazno}>Še ni dodanih povezav.</p>}{!samoOgled && dodajOdprt && <div className={styles.clientLinkObrazec}><input type="text" value={linkOznaka} onChange={event => setLinkOznaka(event.target.value)} placeholder="npr. Figma" aria-label="Oznaka povezave" /><input type="url" value={linkUrl} onChange={event => setLinkUrl(event.target.value)} placeholder="https://…" aria-label="Naslov povezave (Figma, Drive, spletna stran …)" /><button type="button" className={styles.clientLinkDodaj} onClick={addClientLink} disabled={!linkOznaka.trim() || !linkUrl.trim()}>Shrani povezavo</button></div>}{samoOgled && dodajOdprt && <p className={styles.clientLinkNamig}>Dodajanje povezav ni na voljo v predogledu (demo). Prijavi se v svoj račun.</p>}</div><button className={styles.deleteClient} onClick={() => remove(selected)}>Izbriši profil stranke</button></> : <div className={styles.clientProfileEmpty}><span>↗</span><strong>Izberi stranko.</strong><p>Na enem mestu boš videla vse njene dogovore in rezultate.</p></div>}</section></div>
  </div>;
}

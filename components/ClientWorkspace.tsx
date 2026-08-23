'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { usePathname, useSearchParams } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { MagnifyingGlass, Globe, Phone, EnvelopeSimple, PencilSimple, CaretLeft, Trash, DownloadSimple, UploadSimple } from '@phosphor-icons/react';
import Paginacija from '@/components/Paginacija';
import IskalnikMob from '@/components/IskalnikMob';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';
import { loadFlowData, saveFlowCollection, type FlowClient, type FlowOffer, type FlowProjectLink, type Kontakt } from '@/lib/pinartFlowStore';
import { podatkiZaPredogled, usePredogled } from '@/lib/predogled';
import { preberiDnevnik, shraniDnevnik, zabeleziInterakcijo, DNEVNIK_TIPI, dnevnikTipLabel, type DnevnikVnos, type DnevnikTip } from '@/lib/dnevnik';
import MetricIcon from '@/components/MetricIcon';
import DeliZapis from '@/components/DeliZapis';
import IskalnikPodjetij from '@/components/IskalnikPodjetij';
import { jeLicencaPotekla } from '@/lib/licencePotek';
import { preberiProjekti, type Projekt } from '@/lib/projekti';

/* Ikone poenotene na Phosphor. Inline fill/stroke preglasi stare stroke-based
   CSS pravila (fill:none), da so Phosphor ikone vidne. */
const IKONA_SLOG = { fill: 'currentColor', stroke: 'none' } as const;

/* ── CSV uvoz/izvoz strank ──────────────────────────────────────────────────
   Izvoz: BOM + CRLF, da Excel takoj pravilno odpre šumnike. Uvoz: zazna ločilo
   (, ali ;), spoštuje narekovaje, prepozna glavo po ključnih besedah (sicer
   pozicijsko), dedup po imenu. */
const csvCel = (v: string): string => (/[",;\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v);
function zaznajLocilo(text: string): string {
  const prva = text.split(/\r?\n/, 1)[0] || '';
  return prva.split(';').length > prva.split(',').length ? ';' : ',';
}
function razcleniCsv(text: string, loc: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let vNar = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (vNar) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i += 1; } else vNar = false; }
      else cell += c;
    } else if (c === '"') vNar = true;
    else if (c === loc) { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim() !== ''));
}
function najdiStolpec(glava: string[], kljuci: string[]): number {
  const norm = glava.map(h => h.trim().toLowerCase());
  for (const k of kljuci) { const i = norm.findIndex(h => h.includes(k)); if (i >= 0) return i; }
  return -1;
}

/* status projekta (ponudba => projekt) — ista beseda/odtenek kot v ProjectsWorkspace
   (projectStatusInfo), da je jezik med "stranka" in "projekt" strani enoten */
type Prevod = (sl: string, en: string) => string;
const projectStatusInfo = (status: FlowOffer['status'], L: Prevod): { label: string; tone: 'success' | 'waiting' | 'danger' | 'neutral' } => {
  if (status === 'accepted') return { label: L('Aktivni', 'Active'), tone: 'success' };
  if (status === 'sent') return { label: L('Čakajo', 'Waiting'), tone: 'waiting' };
  if (status === 'rejected') return { label: L('Zaključeni', 'Completed'), tone: 'success' };
  return { label: L('Osnutek', 'Draft'), tone: 'neutral' };
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
  const locale = useLocale();
  const L = (sl: string, en: string) => (locale === 'en' ? en : sl);
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
  const [projekti, setProjekti] = useState<Projekt[]>([]);
  const [selected, setSelected] = useState<Client | null>(null);
  const profilRef = useRef<HTMLElement | null>(null);
  /* Mobilno: profil prevzame cel zaslon (samostojna stran z »nazaj«) — ob izbiri skoči na vrh. */
  useEffect(() => {
    if (selected && typeof window !== 'undefined' && window.matchMedia('(max-width: 980px)').matches) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [selected]);
  const [editing, setEditing] = useState<Client | null>(null);
  const [open, setOpen] = useState(false);
  /* Ime in naslov sta v stanju (druga polja so neupravljana), ker ju ob izbiri
     iz Poslovnega registra izpolni nasepetavalnik. */
  const [imeVnos, setImeVnos] = useState('');
  /* Naslov je v shrambi EN niz (»Rimska cesta 56, 3311 Šempeter«), v obrazcu pa
     tri polja — tako ga register lahko izpolni natancno, ob shranjevanju pa ga
     spet sestavimo v isti niz in dokumentom ni treba nicesar spreminjati. */
  const [ulicaVnos, setUlicaVnos] = useState('');
  const [postaStVnos, setPostaStVnos] = useState('');
  const [krajVnos, setKrajVnos] = useState('');
  const [davcnaVnos, setDavcnaVnos] = useState('');
  /* Ob odpiranju obrazca napolni obe polji — pri urejanju z obstojecimi podatki,
     pri novi stranki prazno (neupravljana polja to sicer naredijo sama). */
  useEffect(() => {
    if (!open) return;
    setImeVnos(editing?.name || '');
    setDavcnaVnos(editing?.tax || '');
    const naslov = (editing?.address || '').trim();
    const razbit = naslov.match(/^(.*?),\s*(\d{4})\s+(.*)$/);
    setUlicaVnos(razbit ? razbit[1].trim() : naslov);
    setPostaStVnos(razbit ? razbit[2] : '');
    setKrajVnos(razbit ? razbit[3].trim() : '');
  }, [open, editing]);
  const [search, setSearch] = useState('');
  const [stranImenik, setStranImenik] = useState(1);
  useEffect(() => { setStranImenik(1); }, [search]);

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
    /* Prave narocnike iz kalkulatorja primesamo SAMO v nacinu 'mine' — v predogledih
       (empty/demo/zacetek) mora slika priti izkljucno iz podatkiZaPredogled. */
    const calculator = nacin === 'mine'
      ? JSON.parse(localStorage.getItem('pinart-kalkulator-narocniki') || '[]') as Array<CalculatorClient | string>
      : [];
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
    setProjekti(nacin === 'mine' ? preberiProjekti() : []);
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
      /* created mora biti ISO cas — prej so bili tu razvrstitveni kljuci '3','2','1',
         zato je datStr('3') izpisal "1. 1. 3" namesto datuma. */
      { id: 'd1', clientId: 'demo', tip: 'dogovor', datum: danes, besedilo: 'Potrdili obseg prenove; začetek naslednji teden.', created: `${danes}T14:20:00.000Z` },
      { id: 'd2', clientId: 'demo', tip: 'klic', datum: danes, besedilo: 'Uskladili termin sestanka in potrebna gradiva.', created: `${danes}T11:05:00.000Z` },
      { id: 'd3', clientId: 'demo', tip: 'email', datum: danes, besedilo: 'Poslala predlog barvne palete v pregled.', created: `${danes}T09:30:00.000Z` },
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
  /* Izvoz: CSV (Excel-varen: BOM + CRLF). Izvozi VSE stranke, ne le vidnih. */
  const izvoziStranke = () => {
    const glave = ['Ime', 'E-pošta', 'Kontaktna oseba', 'Telefon', 'Davčna', 'Naslov', 'Spletna stran'];
    const telo = clients.map(c => [c.name, c.email || '', c.contact || '', c.phone || '', c.tax || '', c.address || '', c.website || '']);
    const csv = [glave, ...telo].map(r => r.map(csvCel).join(',')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stranke-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };
  /* Uvoz: izbereš CSV -> doda NOVE stranke (dedup po imenu). Ne prepiše obstoječih. */
  const uvoziStranke = () => {
    if (samoOgled) return;
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.csv,text/csv,text/plain';
    inp.onchange = () => {
      const file = inp.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const text = String(reader.result || '');
          const rows = razcleniCsv(text, zaznajLocilo(text));
          if (!rows.length) { window.alert(L('Datoteka je prazna.', 'The file is empty.')); return; }
          const glava = rows[0];
          const iName0 = najdiStolpec(glava, ['ime', 'naziv', 'name', 'stranka', 'podjetje']);
          const imaGlavo = iName0 >= 0 || glava.some(h => /mail|telefon|phone|naslov|davčn|davcn|kontakt|web|splet/i.test(h));
          const telo = imaGlavo ? rows.slice(1) : rows;
          const col = (kljuci: string[], poz: number) => (imaGlavo ? najdiStolpec(glava, kljuci) : poz);
          const iName = imaGlavo ? (iName0 >= 0 ? iName0 : 0) : 0;
          const iEmail = col(['mail', 'email', 'pošt', 'post'], 1);
          const iContact = col(['kontakt', 'oseba', 'contact'], 2);
          const iPhone = col(['telefon', 'phone', 'tel'], 3);
          const iTax = col(['davčn', 'davcn', 'tax', 'vat'], 4);
          const iAddr = col(['naslov', 'address'], 5);
          const iWeb = col(['splet', 'web', 'url', 'stran'], 6);
          const val = (r: string[], i: number) => (i >= 0 && r[i] ? r[i].trim() : '');
          const obstojeca = new Set(clients.map(c => c.name.trim().toLowerCase()));
          const dodani: Client[] = [];
          for (const r of telo) {
            const name = val(r, iName);
            if (!name || obstojeca.has(name.toLowerCase())) continue;
            obstojeca.add(name.toLowerCase());
            dodani.push({ id: crypto.randomUUID(), name, email: val(r, iEmail) || undefined, contact: val(r, iContact) || undefined, phone: val(r, iPhone) || undefined, address: val(r, iAddr) || undefined, tax: val(r, iTax) || undefined, website: val(r, iWeb) || undefined });
          }
          if (!dodani.length) { window.alert(L('Ni novih strank za uvoz (vse že obstajajo ali manjka ime).', 'No new clients to import (all exist already or the name is missing).')); return; }
          persist([...dodani, ...clients]);
          window.alert(L(`Uvoženih ${dodani.length} strank.`, `Imported ${dodani.length} clients.`));
        } catch { window.alert(L('Uvoz ni uspel — preveri, da je datoteka CSV.', 'Import failed — please check the CSV file.')); }
      };
      reader.readAsText(file, 'utf-8');
    };
    inp.click();
  };
  const save = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); const client: Client = { id: editing?.id || crypto.randomUUID(), name: String(data.get('name')), email: String(data.get('email') || ''), contact: String(data.get('contact') || ''), phone: [String(data.get('predklic') || '').trim(), String(data.get('phone') || '').trim()].filter(Boolean).join(' '), address: [String(data.get('ulica') || '').trim(), [String(data.get('postaSt') || '').trim(), String(data.get('kraj') || '').trim()].filter(Boolean).join(' ')].filter(Boolean).join(', '), tax: String(data.get('tax') || ''), website: String(data.get('website') || '') }; const next = editing ? clients.map(item => item.id === editing.id ? client : item) : [client, ...clients]; persist(next); setSelected(client); setEditing(null); setOpen(false); };
  const remove = (client: Client) => { if (!window.confirm(L(`Izbrišem profil stranke »${client.name}«? Ponudbe, pogodbe in računi bodo ostali shranjeni.`, `Delete the profile for »${client.name}«? Offers, contracts and invoices will remain saved.`))) return; persist(clients.filter(item => item.id !== client.id)); setSelected(null); };
  const visible = clients.filter(client => [client.name, client.email, client.contact].some(value => value?.toLocaleLowerCase('sl-SI').includes(search.toLocaleLowerCase('sl-SI'))));
  const NA_STRAN = 8;
  const straniImenik = Math.max(1, Math.ceil(visible.length / NA_STRAN));
  const stranImenikVarno = Math.min(stranImenik, straniImenik);
  const imenikStran = visible.slice((stranImenikVarno - 1) * NA_STRAN, stranImenikVarno * NA_STRAN);
  const stats = useMemo(() => clients.map(client => { const name = key(client.name); const clientInvoices = invoices.filter(item => key(item.client) === name); const clientExpenses = expenses.filter(item => item.client && key(item.client) === name); return { id: client.id, revenue: clientInvoices.filter(item => item.paid).reduce((sum, item) => sum + item.amount, 0), open: clientInvoices.filter(item => !item.paid).reduce((sum, item) => sum + item.amount, 0), profit: clientInvoices.filter(item => item.paid).reduce((sum, item) => sum + item.amount, 0) - clientExpenses.reduce((sum, item) => sum + item.amount, 0) }; }), [clients, invoices, expenses]);
  const selectedProjects = selected ? offers.filter(item => key(item.client) === key(selected.name)) : [];
  const selectedContracts = selected ? contracts.filter(item => key(item.client) === key(selected.name)) : [];
  const selectedInvoices = selected ? invoices.filter(item => key(item.client) === key(selected.name)) : [];
  const selectedExpenses = selected ? expenses.filter(item => item.client && key(item.client) === key(selected.name)) : [];
  const selectedRealProjects = selected ? projekti.filter(item => item.strankaId === selected.id || (item.strankaIme && key(item.strankaIme) === key(selected.name))) : [];
  const zadnjeDelo = [...selectedRealProjects.map(p => p.updatedAt || p.created), ...selectedProjects.map(p => p.date)].filter(Boolean).sort().at(-1);
  /* dan dogodka, ne cas vpisa: zanima nas, kdaj je bil stik, ne kdaj sem ga vpisala */
  const zadnjiStik = dnevnik.map(v => v.datum).filter(Boolean).sort().at(-1);

  const povezaniDokumenti = selected ? (
    <>
    {selectedRealProjects.length > 0 && <div className={styles.clientProjects}>
      <h3>{L('Projekti', 'Projects')}</h3>
      <div className={styles.clientProjectList}>{selectedRealProjects.map(projekt => <Link key={projekt.id} href={`${base}/kalkulator/projekti?projekt=real-${projekt.id}`} className={styles.clientProjectRow}><span className={styles.clientProjectVrh}><strong>{projekt.naslov}</strong></span><span className={styles.clientProjectDno}><small>{projekt.rok ? `${L('Rok', 'Due')} ${datStr(projekt.rok)}` : L('Brez roka', 'No deadline')}</small><i className={styles.clientProjectPika} data-tone={projekt.status === 'aktiven' ? 'success' : 'neutral'}>{projekt.status}</i></span></Link>)}</div>
    </div>}
    {selectedProjects.some(offer => offer.licencaDo) && <div className={styles.clientProjects}>
      <h3>{L('Roki in podaljšanja', 'Deadlines and renewals')}</h3>
      <div className={styles.clientProjectList}>{selectedProjects.filter(offer => offer.licencaDo).sort((a, b) => (a.licencaDo || '').localeCompare(b.licencaDo || '')).map(offer => <div key={`rok-${offer.id}`} className={styles.clientProjectRow}><span className={styles.clientProjectVrh}><strong>{jeLicencaPotekla(offer.licencaDo) ? L(`Licenca je potekla. Predlagaj podaljšanje.`, `Licence expired. Suggest a renewal.`) : L(`Licenca poteče. Pripravi predlog podaljšanja.`, `Licence expires. Prepare a renewal proposal.`)}</strong></span><span className={styles.clientProjectDno}><small>{datStr(offer.licencaDo!)}</small><i className={styles.clientProjectPika} style={jeLicencaPotekla(offer.licencaDo) ? { color: '#a4342a', borderColor: '#a4342a' } : undefined}>{offer.title}</i></span></div>)}</div>
    </div>}
    <div className={styles.clientProjects}>
      <h3>{L('Dokumenti', 'Documents')}</h3>
      <div className={styles.clientProjectList}>
        {selectedProjects.map(offer => (
          <Link key={`offer-${offer.id}`} href={`${base}/kalkulator/arhiv?tip=ponudbe&odpri=${offer.id}`} className={styles.clientProjectRow}>
            <span className={styles.clientProjectVrh}><strong>{L('Ponudba', 'Offer')} · {offer.title}</strong><strong className={styles.clientProjectZnesek}>{offer.agreedAmount ? money(offer.agreedAmount) : '—'}</strong></span>
            <span className={styles.clientProjectDno}><small>{offer.number ? `${L('Št.', 'No.')} ${offer.number} · ` : ''}{datStr(offer.date)}</small>{jeLicencaPotekla(offer.licencaDo) && <i className={styles.clientProjectPika} style={{ color: '#a4342a', borderColor: '#a4342a' }}>{L('Licenca potekla', 'Licence expired')}</i>}<i className={styles.clientProjectPika} data-tone={projectStatusInfo(offer.status, L).tone}>{projectStatusInfo(offer.status, L).label}</i></span>
          </Link>
        ))}
        {selectedContracts.map(contract => (
          <Link key={`contract-${contract.id}`} href={`${base}/kalkulator/arhiv?tip=pogodbe&odpri=${contract.id}`} className={styles.clientProjectRow}>
            <span className={styles.clientProjectVrh}><strong>{L('Pogodba', 'Contract')} · {contract.title}</strong></span>
            <span className={styles.clientProjectDno}><small>{contract.status}</small><i className={styles.clientProjectPika} data-tone="neutral">{L('Pogodba', 'Contract')}</i></span>
          </Link>
        ))}
        {selectedInvoices.map(invoice => (
          <Link key={`invoice-${invoice.id}`} href={`${base}/kalkulator/arhiv?tip=racuni&odpri=${invoice.id}`} className={styles.clientProjectRow}>
            <span className={styles.clientProjectVrh}><strong>{L('Račun', 'Invoice')}</strong><strong className={styles.clientProjectZnesek}>{money(invoice.amount)}</strong></span>
            <span className={styles.clientProjectDno}><small>{datStr(invoice.date)}</small><i className={styles.clientProjectPika} data-tone={invoice.paid ? 'success' : 'waiting'}>{invoice.paid ? L('Plačan', 'Paid') : L('Odprt', 'Open')}</i></span>
          </Link>
        ))}
      </div>
      {!selectedProjects.length && !selectedContracts.length && !selectedInvoices.length && <p className={styles.clientProjectPrazno}>{L('Ta stranka še nima ponudb, pogodb ali računov.', 'This client has no offers, contracts or invoices yet.')}</p>}
    </div>
    </>
  ) : null;

  /* Mobilni »samostojna stran«: ko je stranka izbrana, skrij zgornji naslov (page .topbar) +
     iskalno vrstico — profil dobi cel zaslon (kot pri stroških). Signal prek body-class. */
  useEffect(() => {
    document.body.classList.toggle('stranka-odprta', !!selected);
    return () => document.body.classList.remove('stranka-odprta');
  }, [selected]);
  /* urejanje profila = tudi samostojna stran (skrij vse ostalo, pokaži le urejevalnik + Nazaj) */
  useEffect(() => {
    document.body.classList.toggle('stranka-urejanje', open);
    return () => document.body.classList.remove('stranka-urejanje');
  }, [open]);

  return <div className={styles.clientPage}>
    <section className={styles.clientToolbar}><IskalnikMob vrednost={search} naVrednost={setSearch} placeholder={L('Poišči stranko, kontakt ali e-pošto …', 'Search client, contact or email …')} label={L('Poišči stranko', 'Search client')} /><button type="button" onClick={uvoziStranke} disabled={samoOgled} title={L('Uvozi stranke iz CSV', 'Import clients from CSV')} aria-label={L('Uvozi stranke iz CSV', 'Import clients from CSV')} style={{ flex: 'none', display: 'inline-grid', placeItems: 'center', width: '3rem', minWidth: '3rem', minHeight: '3rem', padding: 0, borderRadius: '50%', border: '1px solid var(--line)', background: '#fff', color: 'var(--ink)', cursor: samoOgled ? 'default' : 'pointer', opacity: samoOgled ? 0.5 : 1 }}><UploadSimple size={16} weight="bold" /></button><button type="button" onClick={izvoziStranke} disabled={!clients.length} title={L('Izvozi stranke v CSV', 'Export clients to CSV')} aria-label={L('Izvozi stranke v CSV', 'Export clients to CSV')} style={{ flex: 'none', display: 'inline-grid', placeItems: 'center', width: '3rem', minWidth: '3rem', minHeight: '3rem', padding: 0, borderRadius: '50%', border: '1px solid var(--line)', background: '#fff', color: 'var(--ink)', cursor: clients.length ? 'pointer' : 'default', opacity: clients.length ? 1 : 0.5 }}><DownloadSimple size={16} weight="bold" /></button><button onClick={() => { setEditing(null); setOpen(true); }}>{L('+ Nova stranka', '+ New client')}</button></section>
    {samoOgled && <section className={styles.predogledBanner}><span><strong>{L('Predogled', 'Preview')}</strong>{L(' — vzorčni podatki, urejanje je izklopljeno. (V pravem orodju tega ni, vedno urejaš.)', ' — sample data, editing is disabled. (In the real tool this is gone, you always edit.)')}</span><button type="button" onClick={() => nastaviNacin('mine')}>{L('Preklopi na »Moji podatki«', 'Switch to »My data«')}</button></section>}
    {open && <section className={styles.clientEditor}><button type="button" className={styles.clientBack} onClick={() => { setOpen(false); setEditing(null); }} aria-label={L('Nazaj', 'Back')}><CaretLeft size={16} weight="bold" /> {L('Nazaj', 'Back')}</button><div><p className={styles.eyebrow}>{editing ? L('UREDI PROFIL', 'EDIT PROFILE') : L('NOVA STRANKA', 'NEW CLIENT')}</p><h2>{L('Podatki, ki jih potrebuješ.', 'The details you need.')}</h2></div><form onSubmit={save}><label key="ime" style={{ gridColumn: '1 / -1' }}>{L('Podjetje ali ime', 'Company or name')}<IskalnikPodjetij vrednost={imeVnos} naVrednost={setImeVnos} naIzbiro={p => { setUlicaVnos(p.naslov || ''); setPostaStVnos(p.posta_st || ''); setKrajVnos(p.posta || ''); if (p.davcna) setDavcnaVnos(p.davcna); }} obvezno ime="name" jeEn={locale === 'en'} /></label><label key="ulica" style={{ gridColumn: '1 / -1' }}>{L('Ulica in hišna številka', 'Street and number')}<input name="ulica" value={ulicaVnos} onChange={e => setUlicaVnos(e.target.value)} /></label><div key="naslov2" style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '7rem minmax(0, 1fr)', gap: '.7rem', alignItems: 'end' }}><label>{L('Poštna številka', 'Postal code')}<input name="postaSt" value={postaStVnos} onChange={e => setPostaStVnos(e.target.value)} inputMode="numeric" /></label><label>{L('Kraj', 'City')}<input name="kraj" value={krajVnos} onChange={e => setKrajVnos(e.target.value)} /></label></div><label key="tax">{L('Davčna številka', 'Tax number')}<input name="tax" value={davcnaVnos} onChange={e => setDavcnaVnos(e.target.value)} style={{ maxWidth: '11rem' }} /></label><label key="contact" style={{ gridColumn: 'span 2' }}>{L('Kontaktna oseba', 'Contact person')}<input name="contact" defaultValue={editing?.contact} /></label><label key="phone">{L('Telefon', 'Phone')}<span style={{ display: 'flex', gap: '.4rem', minWidth: 0 }}><select name="predklic" defaultValue={razcleniTel(editing?.phone).koda} aria-label={L('Klicna koda', 'Dial code')} style={{ flex: '0 0 auto', width: 'auto', paddingRight: '1.6rem' }}>{DIAL_KODE.map(k => <option key={k.koda} value={k.koda}>{k.zastava} {k.koda}</option>)}</select><input name="phone" defaultValue={razcleniTel(editing?.phone).num} inputMode="tel" placeholder="31 569 103" style={{ flex: 1, minWidth: 0 }} /></span></label><label key="email" style={{ gridColumn: 'span 2' }}>{L('E-pošta', 'Email')}<input name="email" type="email" defaultValue={editing?.email} /></label><label key="website">{L('Spletna stran', 'Website')}<input name="website" type="text" defaultValue={editing?.website} placeholder="www.primer.com" /></label><div className={styles.clientEditorActions}><button type="button" onClick={() => setOpen(false)}>{L('Prekliči', 'Cancel')}</button><button>{L('Shrani profil', 'Save profile')}</button></div></form></section>}
    <div className={styles.clientLayout} data-selected={selected ? '1' : '0'}><section className={styles.clientDirectory}><header><div><p className={styles.eyebrow}>{L('IMENIK', 'DIRECTORY')}</p><h2>{L(`${visible.length} strank`, `${visible.length} ${visible.length === 1 ? 'client' : 'clients'}`)}</h2></div></header>{visible.length ? imenikStran.map(client => { const result = stats.find(item => item.id === client.id); return <button key={client.id} className={selected?.id === client.id ? styles.clientActive : ''} onClick={() => setSelected(client)}><span className={styles.clientInitials}>{client.name.split(/\s+/).map(word => word[0]).join('').slice(0, 2).toUpperCase()}</span><span><strong>{client.name}</strong><small>{client.contact || client.email || L('Brez kontakta', 'No contact')}</small></span><span><strong>{money(result?.revenue || 0)}</strong><small>{L('plačano', 'paid')}</small></span><i>›</i></button>; }) : <p className={styles.clientEmpty}>{L('Ni najdenih strank.', 'No clients found.')}</p>}<Paginacija stran={stranImenikVarno} strani={straniImenik} naStran={setStranImenik} /></section>
      <section className={styles.clientProfile} ref={profilRef}>{selected ? <><div className={styles.clientProfileTop}><button type="button" className={styles.clientBack} onClick={() => setSelected(null)} aria-label={L('Nazaj na imenik', 'Back to directory')}><CaretLeft size={16} weight="bold" /> {L('Imenik', 'Directory')}</button><button type="button" className={styles.clientEditPen} onClick={() => { setEditing(selected); setOpen(true); }} title={L('Uredi podatke stranke', 'Edit client details')} aria-label={L('Uredi podatke stranke', 'Edit client details')}><PencilSimple size={15} weight="bold" /></button><button type="button" className={styles.clientDeleteIcon} onClick={() => remove(selected)} title={L('Izbriši profil stranke', 'Delete client profile')} aria-label={L('Izbriši profil stranke', 'Delete client profile')}><Trash size={15} weight="bold" /></button></div><header><span className={styles.clientProfileAvatar}>{selected.name.split(/\s+/).map(word => word[0]).join('').slice(0, 2).toUpperCase()}</span><div><p className={styles.eyebrow}>{L('PROFIL STRANKE', 'CLIENT PROFILE')}</p><h2>{selected.name}</h2><span>{selected.contact || L('Brez kontaktne osebe', 'No contact person')}</span></div></header><div className={styles.clientContacts}><span><small>{L('Telefon', 'Phone')}</small>{selected.phone ? <a href={`tel:${selected.phone.replace(/\s+/g, '')}`} onClick={() => { if (!samoOgled && selected) { zabeleziInterakcijo(selected.id, { tip: 'klic', besedilo: 'Klic — ' + selected.name }); setDnevnik(preberiDnevnik(selected.id)); } }} style={{ color: 'inherit', textDecoration: 'none' }}><strong>{selected.phone}</strong></a> : <strong>—</strong>}</span><span><small>{L('E-pošta', 'Email')}</small><strong>{selected.email || '—'}</strong></span><span><small>{L('Naslov', 'Address')}</small><strong>{selected.address || '—'}</strong></span><span><small>{L('Davčna št.', 'Tax no.')}</small><strong>{selected.tax || '—'}</strong></span><span className={styles.clientSplet}><small>{L('Spletna stran', 'Website')}</small>{selected.website ? <a href={selected.website.startsWith('http') ? selected.website : `https://${selected.website}`} target="_blank" rel="noopener noreferrer"><Globe size={15} weight="bold" /><strong>{selected.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</strong></a> : <strong>—</strong>}</span></div><div className={styles.clientFinance}><span><small>{L('Plačano', 'Paid')}</small><strong>{money(selectedInvoices.filter(item => item.paid).reduce((sum, item) => sum + item.amount, 0))}</strong><b className={styles.subpageMetricIcon}><MetricIcon type="paid" /></b></span><span><small>{L('Odprti računi', 'Open invoices')}</small><strong>{money(selectedInvoices.filter(item => !item.paid).reduce((sum, item) => sum + item.amount, 0))}</strong><b className={styles.subpageMetricIcon}><MetricIcon type="document" /></b></span><span><small>{L('Stroški', 'Costs')}</small><strong>{money(selectedExpenses.reduce((sum, item) => sum + item.amount, 0))}</strong><b className={styles.subpageMetricIcon}><MetricIcon type="cost" /></b></span><span><small>{L('Zadnje delo', 'Last work')}</small><strong>{zadnjeDelo ? datStr(zadnjeDelo) : '—'}</strong><b className={styles.subpageMetricIcon}><MetricIcon type="projekti" /></b></span><span><small>{L('Zadnji stik', 'Last contact')}</small><strong>{zadnjiStik ? datStr(zadnjiStik) : '—'}</strong><b className={styles.subpageMetricIcon}><MetricIcon type="ura" /></b></span></div><div className={styles.clientLinki}><div className={styles.clientLinkGlava}><div><h3>{L('Kontakti', 'Contacts')}</h3><small className={styles.clientLinkPodnaslov}>{L('Vsaka oseba pri stranki — svoj telefon in mail. Klic ali mail se sam zabeleži spodaj v dnevniku.', 'Every person at the client — their own phone and email. A call or email is logged automatically in the journal below.')}</small></div><button type="button" className={styles.clientLinkGumb} disabled={samoOgled} title={samoOgled ? L('Na voljo v načinu »Moji podatki« — zdaj gledaš predogled', 'Available in »My data« mode — you are viewing a preview') : undefined} style={samoOgled ? { opacity: 0.5 } : undefined} onClick={() => { setKontaktUrejam(null); setKontaktOdprt(p => !p); }}>{kontaktOdprt ? L('Zapri', 'Close') : L('+ Dodaj osebo', '+ Add person')}</button></div>{!samoOgled && kontaktOdprt && <div className={styles.clientEditor}><div><p className={styles.eyebrow}>{kontaktUrejam ? L('UREDI OSEBO', 'EDIT PERSON') : L('NOVA OSEBA', 'NEW PERSON')}</p><h2>{L('Kontaktna oseba.', 'Contact person.')}</h2></div><form onSubmit={shraniKontakt}><label>{L('Ime in priimek', 'Full name')}<input required name="ime" defaultValue={kontaktUrejam?.ime} /></label><label>{L('Vloga', 'Role')}<input name="vloga" defaultValue={kontaktUrejam?.vloga} placeholder={L('npr. vodja nabave', 'e.g. head of purchasing')} /></label><label>{L('Telefon', 'Phone')}<input name="telefon" defaultValue={kontaktUrejam?.telefon} /></label><label>{L('E-pošta', 'Email')}<input name="email" type="email" defaultValue={kontaktUrejam?.email} /></label><div className={styles.clientEditorActions}>{kontaktUrejam && <button type="button" className={styles.clientEditorDelete} onClick={() => { izbrisiKontakt(kontaktUrejam.id); setKontaktOdprt(false); setKontaktUrejam(null); }} aria-label={L('Izbriši osebo', 'Delete person')} title={L('Izbriši osebo', 'Delete person')}><Trash size={15} weight="bold" /></button>}<button type="button" onClick={() => { setKontaktOdprt(false); setKontaktUrejam(null); }}>{L('Prekliči', 'Cancel')}</button><button>{L('Shrani osebo', 'Save person')}</button></div></form></div>}{kontakti.length ? <div className={styles.clientLinkSeznam}>{kontakti.map(k => <div key={k.id} className={styles.clientLinkVrstica} style={{ flexDirection: 'column', alignItems: 'stretch', gap: '.35rem' }}><div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}><span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}><strong>{k.ime}</strong>{k.vloga && <small style={{ fontWeight: 500, color: 'var(--ink)' }}>{k.vloga}</small>}</span><button type="button" className={styles.clientKontaktAkcija} disabled={samoOgled} onClick={() => { setKontaktUrejam(k); setKontaktOdprt(true); }} aria-label={L(`Uredi osebo ${k.ime}`, `Edit person ${k.ime}`)}><PencilSimple size={15} weight="bold" /></button><button type="button" className={`${styles.clientKontaktAkcija} ${styles.clientKontaktBrisiBtn}`} disabled={samoOgled} onClick={() => izbrisiKontakt(k.id)} aria-label={L(`Izbriši osebo ${k.ime}`, `Delete person ${k.ime}`)}><Trash size={14} weight="bold" /></button></div>{(k.telefon || k.email) && <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '.35rem', minWidth: 0 }}>{k.telefon && <a href={`tel:${k.telefon.replace(/\s+/g, '')}`} className={styles.clientDnevnikProj} style={{ display: 'inline-flex', alignItems: 'center', gap: '.35rem' }} onClick={() => beleziStik(k, 'klic')}><Phone size={13} weight="bold" style={IKONA_SLOG} aria-hidden="true" />{k.telefon}</a>}{k.email && <a href={`mailto:${k.email}`} className={styles.clientDnevnikProj} style={{ display: 'inline-flex', alignItems: 'center', gap: '.35rem', maxWidth: '100%', minWidth: 0 }} onClick={() => beleziStik(k, 'epošta')}><EnvelopeSimple size={13} weight="bold" style={IKONA_SLOG} aria-hidden="true" /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{k.email}</span></a>}</div>}</div>)}</div> : <p className={styles.clientLinkPrazno}>{L('Še ni dodanih oseb.', 'No people added yet.')}</p>}{samoOgled && kontaktOdprt && <p className={styles.clientLinkNamig}>{L('Dodajanje kontaktov ni na voljo v predogledu (demo). Prijavi se v svoj račun.', 'Adding contacts is not available in the preview (demo). Sign in to your account.')}</p>}</div><div className={styles.clientProjects}><h3>{L('Projekti stranke', 'Client projects')}</h3>{selectedProjects.length ? <div className={styles.clientProjectList}>{selectedProjects.map(offer => { const info = projectStatusInfo(offer.status, L); return <Link key={offer.id} href={`${base}/kalkulator/projekti?projekt=${offer.id}`} className={styles.clientProjectRow}><span className={styles.clientProjectVrh}><strong>{offer.title}</strong><strong className={styles.clientProjectZnesek}>{offer.agreedAmount ? money(offer.agreedAmount) : '—'}</strong></span><span className={styles.clientProjectDno}><small>{datStr(offer.date)}</small><i className={styles.clientProjectPika} data-tone={info.tone}>{info.label}</i></span></Link>; })}</div> : <p className={styles.clientProjectPrazno}>{L('Ta stranka še nima projektov.', 'This client has no projects yet.')}</p>}</div><div className={styles.clientDnevnik}><div className={styles.clientDnevnikGlava}><div><h3>{L('Dnevnik stranke', 'Client journal')}</h3><small className={styles.clientLinkPodnaslov}>{L('Klici, sestanki, dogovori — kronologija odnosa. Tisto, kar Gmail search ne najde.', 'Calls, meetings, agreements — a timeline of the relationship. The things Gmail search cannot find.')}</small></div><button type="button" className={styles.clientLinkGumb} disabled={samoOgled} title={samoOgled ? L('Na voljo v načinu »Moji podatki« — zdaj gledaš predogled', 'Available in »My data« mode — you are viewing a preview') : undefined} style={samoOgled ? { opacity: 0.5 } : undefined} onClick={() => setDnOdprt(p => !p)}>{dnOdprt ? L('Prekliči', 'Cancel') : L('+ Dodaj zapis', '+ Add entry')}</button></div>{!samoOgled && dnOdprt && <div className={styles.clientDnevnikObrazec}><div className={styles.clientDnevnikTipi} role="group" aria-label={L('Vrsta zapisa', 'Entry type')}>{DNEVNIK_TIPI.map(t => <button key={t.tip} type="button" className={dnTip === t.tip ? styles.clientDnevnikTipOn : ''} onClick={() => setDnTip(t.tip)}>{t.label}</button>)}</div><div className={styles.clientDnevnikVrsta}><input type="date" value={dnDatum} onChange={e => setDnDatum(e.target.value)} aria-label={L('Datum', 'Date')} /><input type="time" value={dnCas} onChange={e => setDnCas(e.target.value)} aria-label={L('Ura', 'Time')} />{selectedProjects.length > 0 && <select value={dnProjekt} onChange={e => setDnProjekt(e.target.value)} aria-label={L('Projekt (neobvezno)', 'Project (optional)')}><option value="">{L('Brez projekta', 'No project')}</option>{selectedProjects.map(o => <option key={o.id} value={o.id}>{o.title}</option>)}</select>}</div><textarea value={dnBesedilo} onChange={e => setDnBesedilo(e.target.value)} placeholder={L('Kaj je bilo dogovorjeno?', 'What was agreed?')} rows={3} aria-label={L('Zapis', 'Entry')} /><button type="button" className={styles.clientLinkDodaj} onClick={addDnevnik} disabled={!dnBesedilo.trim()}>{L('Shrani zapis', 'Save entry')}</button></div>}{samoOgled && dnOdprt && <p className={styles.clientLinkNamig}>{L('Dodajanje zapisov ni na voljo v predogledu (demo). Prijavi se v svoj račun.', 'Adding entries is not available in the preview (demo). Sign in to your account.')}</p>}{dnevnik.length ? <ol className={styles.clientDnevnikSeznam}>{dnevnik.map(v => { const proj = v.projectId ? selectedProjects.find(o => o.id === v.projectId) : null; return <li key={v.id} className={styles.clientDnevnikVnos} data-tip={v.tip}><span className={styles.clientDnevnikPika} aria-hidden /><div className={styles.clientDnevnikVsebina}><div className={styles.clientDnevnikMeta}><strong>{dnevnikTipLabel(v.tip)}</strong><small>{datStr(v.datum)}{casStr(v.created) ? ` · ${casStr(v.created)}` : ''}</small>{proj && <i className={styles.clientDnevnikProj}>{proj.title}</i>}</div><p>{v.besedilo}</p></div>{!samoOgled && <button type="button" className={styles.clientLinkBrisi} onClick={() => removeDnevnik(v.id)} aria-label={L('Izbriši zapis', 'Delete entry')}>×</button>}</li>; })}</ol> : <p className={styles.clientLinkPrazno}>{L('Še ni zapisov. Prvi klic ali sestanek zabeleži tukaj.', 'No entries yet. Log your first call or meeting here.')}</p>}</div><div className={styles.clientLinki}><div className={styles.clientLinkGlava}><div><h3>{L('Skupne povezave stranke', 'Shared client links')}</h3><small className={styles.clientLinkPodnaslov}>{L('Viri, ki veljajo čez vse projekte (npr. blagovna knjiga, živa spletna stran). Projektni dokumenti so na projektu.', 'Resources that apply across all projects (e.g. brand book, live website). Project documents live on the project.')}</small></div><button type="button" className={styles.clientLinkGumb} disabled={samoOgled} title={samoOgled ? L('Na voljo v načinu »Moji podatki« — zdaj gledaš predogled', 'Available in »My data« mode — you are viewing a preview') : undefined} style={samoOgled ? { opacity: 0.5 } : undefined} onClick={() => setDodajOdprt(prej => !prej)}>{dodajOdprt ? L('Prekliči', 'Cancel') : L('+ Dodaj povezavo', '+ Add link')}</button></div>{links.length ? <div className={styles.clientLinkSeznam}>{links.map((link, index) => <div key={`${link.url}-${index}`} className={styles.clientLinkVrstica}><a href={link.url} target="_blank" rel="noopener noreferrer">{link.oznaka}</a>{!samoOgled && <button type="button" className={styles.clientLinkBrisi} onClick={() => removeClientLink(index)} aria-label={L(`Izbriši povezavo ${link.oznaka}`, `Delete link ${link.oznaka}`)}>×</button>}</div>)}</div> : <p className={styles.clientLinkPrazno}>{L('Še ni dodanih povezav.', 'No links added yet.')}</p>}{!samoOgled && dodajOdprt && <div className={styles.clientLinkObrazec}><input type="text" value={linkOznaka} onChange={event => setLinkOznaka(event.target.value)} placeholder={L('npr. Figma', 'e.g. Figma')} aria-label={L('Oznaka povezave', 'Link label')} /><input type="url" value={linkUrl} onChange={event => setLinkUrl(event.target.value)} placeholder="https://…" aria-label={L('Naslov povezave (Figma, Drive, spletna stran …)', 'Link address (Figma, Drive, website …)')} /><button type="button" className={styles.clientLinkDodaj} onClick={addClientLink} disabled={!linkOznaka.trim() || !linkUrl.trim()}>{L('Shrani povezavo', 'Save link')}</button></div>}{samoOgled && dodajOdprt && <p className={styles.clientLinkNamig}>{L('Dodajanje povezav ni na voljo v predogledu (demo). Prijavi se v svoj račun.', 'Adding links is not available in the preview (demo). Sign in to your account.')}</p>}</div>{povezaniDokumenti}{!samoOgled && <div className={styles.clientLinki}><DeliZapis vir="clients" lokalniId={selected.id} naslov={selected.name} jeEn={locale === 'en'} /></div>}</> : <div className={styles.clientProfileEmpty}><span>↗</span><strong>{L('Izberi stranko.', 'Select a client.')}</strong><p>{L('Na enem mestu boš videla vse njene dogovore in rezultate.', 'See all their agreements and results in one place.')}</p></div>}</section></div>
      </div>;
}

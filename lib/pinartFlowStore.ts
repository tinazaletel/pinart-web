export type FlowOfferStatus = 'draft' | 'sent' | 'accepted' | 'rejected';
export type FlowContractStatus = 'draft' | 'received' | 'review' | 'active' | 'signed';
export type FlowInvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export type FlowOffer = {
  id: string;
  title: string;
  client: string;
  date: string;
  number?: string;
  scope: string[];
  status: FlowOfferStatus;
  agreedAmount: number;
  deletedAt?: string;
  deletedBy?: string;
  updatedAt?: string;
};

/* Postavka racuna (ZDDV-1): cena je NA ENOTO in BREZ DDV; popust v %, ddv = stopnja v %. */
export type FlowInvoiceItem = {
  opis: string;
  kolicina: number;
  cena: number;
  popust?: number;
  ddv?: number;
};

/* Podpis na racunu — isti vzorec kot pri pogodbah (rocno narisana ali nalozena
   slika, shranjena kot data URL); morebitno ime/kraj/datum podpisnika so
   neobvezni in se izpisejo pod crto skupaj s sliko. */
export type FlowInvoiceSignature = {
  image: string;
  name?: string;
  place?: string;
  date?: string;
};

export type FlowInvoice = {
  id: string;
  number?: string;
  title?: string;
  client: string;
  amount: number;
  paid: boolean;
  status?: FlowInvoiceStatus;
  date: string;
  dueDays?: number;
  sourceOfferId?: string;
  source?: string;
  fileName?: string;
  filePath?: string;
  /* neobvezna polja za racun po ZDDV-1 — stari zapisi jih nimajo in se delujejo */
  items?: FlowInvoiceItem[];
  serviceDate?: string;
  vatPayer?: boolean;
  net?: number;
  vatAmount?: number;
  /* neobvezen podpis — stari zapisi ga nimajo in se delujejo (dokument ga preprosto ne izrise) */
  signature?: FlowInvoiceSignature;
  /* neobvezna noga racuna: opomba (npr. »izdan elektronsko, veljaven brez ziga in
     podpisa«). footerOn=false skrije nogo; stari zapisi (undefined) -> privzeto vklopljeno. */
  footerOn?: boolean;
  footerText?: string;
  /* neobvezno: predracun (poziv k placilu vnaprej) namesto pravega racuna —
     stari zapisi ga nimajo -> false/undefined -> delujejo kot doslej (racun) */
  predracun?: boolean;
  /* neobvezno: AVANS (delni znesek) — dokument zaracuna samo delez celote.
     stari zapisi ga nimajo -> undefined pomeni 100 % (cel znesek), delujejo kot doslej */
  avansPct?: number;
  /* poln znesek dokumenta (za izracun preostanka / kasnejso pretvorbo v koncni racun) */
  polnaVrednost?: number;
  issuedAt?: string;
  version?: number;
  supersedesId?: string;
  stornoOfId?: string;
  cancelledAt?: string;
  cancelReason?: string;
  /* Davcna potrditev je locena od internega zivljenjskega cikla dokumenta. */
  fiscalConfirmedAt?: string;
  fiscalEor?: string;
  fiscalZoi?: string;
  fiscalProvider?: string;
  deletedAt?: string;
  deletedBy?: string;
  updatedAt?: string;
};

export type DavcniStatus = 'osnutek' | 'izdan' | 'placan';

export function davcniStatus(invoice: Pick<FlowInvoice, 'paid' | 'status' | 'issuedAt'>): DavcniStatus {
  if (invoice.paid || invoice.status === 'paid') return 'placan';
  if (invoice.issuedAt || invoice.status === 'sent' || invoice.status === 'overdue' || invoice.status === 'cancelled') return 'izdan';
  return 'osnutek';
}

export function jeDavcnoPotrjen(
  invoice: Pick<FlowInvoice, 'fiscalConfirmedAt' | 'fiscalEor' | 'fiscalZoi'>,
): boolean {
  return Boolean(invoice.fiscalConfirmedAt?.trim() && invoice.fiscalEor?.trim() && invoice.fiscalZoi?.trim());
}

export type FlowExpense = {
  id: string;
  title: string;
  client?: string;
  amount: number;
  date: string;
  sourceOfferId?: string;
  company?: string;
  category?: string;
  fileName?: string;
  filePath?: string;
  /* neobvezno: znacke za locevanje/filtriranje stroskov (npr. "najem", "narocnina") */
  tags?: string[];
  /* obdobje stroska: enkratni (privzeto), mesecni ali letni. Mesecni/letni sluzijo
     kot poslovna osnova (redni stroski). Odsotnost = enkratni (nazaj-zdruzljivo). */
  obdobje?: 'enkratni' | 'mesecni' | 'letni';
  deletedAt?: string;
  deletedBy?: string;
  updatedAt?: string;
};

export type FlowContract = {
  id: string;
  title: string;
  client: string;
  date: string;
  status: FlowContractStatus;
  sourceOfferId?: string;
  body?: string;
  fileName?: string;
  filePath?: string;
  notes?: string;
  lockedAt?: string;
  signedContentHash?: string;
  deletedAt?: string;
  deletedBy?: string;
  updatedAt?: string;
};

/* Ena kontaktna oseba pri stranki (npr. Honeywell ima vec ljudi, vsak svoj
   telefon/mail) — locena od glavnega "contact" polja zgoraj (ki ostaja kot
   privzeta/edina oseba za stare zapise); kontakti je seznam DODATNIH/vseh
   oseb, ce jih uporabnica zeli voditi loceno. */
export type Kontakt = {
  id: string;
  ime: string;
  vloga?: string;
  telefon?: string;
  email?: string;
};

export type FlowClient = {
  id: string;
  name: string;
  email?: string;
  contact?: string;
  phone?: string;
  address?: string;
  tax?: string;
  website?: string;
  /* neobvezno: vec kontaktnih oseb pri stranki — stari zapisi ga nimajo,
     privzemi prazen seznam, delujejo kot doslej */
  kontakti?: Kontakt[];
  updatedAt?: string;
};

export type FlowData = {
  version: 1;
  offers: FlowOffer[];
  invoices: FlowInvoice[];
  expenses: FlowExpense[];
  contracts: FlowContract[];
  clients: FlowClient[];
};

type ArchivedOffer = {
  nazivPonudbe?: string;
  narocnikPonudbe?: string;
  datum?: string;
  stevilkaPonudbe?: string;
  vrstice?: Array<{ ime?: string; kolicina?: number }>;
};
type LegacyClient = { ime?: string; email?: string; oseba?: string; telefon?: string; naslov?: string; davcna?: string };

const FLOW_KEY = 'pinart-flow-data-v1';
const UNSYNCED_KEY = 'pinart-flow-unsynced';
const legacyKeys = {
  invoices: 'pinart-dashboard-invoices',
  expenses: 'pinart-dashboard-expenses',
  contracts: 'pinart-dashboard-contracts',
  clients: 'pinart-dashboard-clients',
} as const;

const read = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  try { return JSON.parse(localStorage.getItem(key) || '') as T; } catch { return fallback; }
};

const unique = <T extends { id: string }>(primary: T[], fallback: T[]) => {
  const items = new Map(fallback.map(item => [item.id, item]));
  primary.forEach(item => items.set(item.id, item));
  return [...items.values()];
};

const legacyOffers = (): FlowOffer[] => {
  const archive = read<Record<string, ArchivedOffer>>('pinart-kalkulator-arhiv', {});
  const statuses = read<Record<string, FlowOfferStatus>>('pinart-dashboard-offer-status', {});
  const amounts = read<Record<string, number>>('pinart-dashboard-offer-amounts', {});
  return Object.entries(archive).map(([id, item]) => ({
    id,
    title: item.nazivPonudbe || id,
    client: item.narocnikPonudbe || 'Brez stranke',
    date: item.datum || new Date().toISOString(),
    number: item.stevilkaPonudbe,
    scope: item.vrstice?.map(row => `${row.ime || 'Storitev'}${(row.kolicina || 1) > 1 ? ` × ${row.kolicina}` : ''}`) || [],
    status: statuses[id] || 'draft',
    agreedAmount: Number(amounts[id]) || 0,
  }));
};

const legacyClients = (): FlowClient[] => {
  const values = read<Array<string | LegacyClient>>('pinart-kalkulator-narocniki', []);
  return values.map(value => typeof value === 'string' ? { ime: value } : value).filter(value => Boolean(value.ime?.trim())).map(value => {
    const name = value.ime!.trim();
    let hash = 2166136261;
    for (let index = 0; index < name.length; index += 1) { hash ^= name.charCodeAt(index); hash = Math.imul(hash, 16777619); }
    return { id: `legacy-client-${(hash >>> 0).toString(36)}`, name, email: value.email, contact: value.oseba, phone: value.telefon, address: value.naslov, tax: value.davcna };
  });
};

export const loadFlowData = (): FlowData => {
  const stored = read<Partial<FlowData>>(FLOW_KEY, {});
  const data: FlowData = {
    version: 1,
    offers: unique(legacyOffers(), stored.offers || []),
    invoices: unique(stored.invoices || [], read<FlowInvoice[]>(legacyKeys.invoices, [])),
    expenses: unique(stored.expenses || [], read<FlowExpense[]>(legacyKeys.expenses, [])),
    contracts: unique(stored.contracts || [], read<FlowContract[]>(legacyKeys.contracts, [])),
    clients: unique(stored.clients || [], unique(read<FlowClient[]>(legacyKeys.clients, []), legacyClients())),
  };
  if (typeof window !== 'undefined') localStorage.setItem(FLOW_KEY, JSON.stringify(data));
  return data;
};

export const writeFlowDataLocally = (data: FlowData) => {
  localStorage.setItem(FLOW_KEY, JSON.stringify(data));
  localStorage.setItem(legacyKeys.invoices, JSON.stringify(data.invoices));
  localStorage.setItem(legacyKeys.expenses, JSON.stringify(data.expenses));
  localStorage.setItem(legacyKeys.contracts, JSON.stringify(data.contracts));
  localStorage.setItem(legacyKeys.clients, JSON.stringify(data.clients));
  localStorage.setItem('pinart-kalkulator-narocniki', JSON.stringify(data.clients.map(client => ({ ime: client.name, email: client.email, oseba: client.contact, telefon: client.phone, naslov: client.address, davcna: client.tax }))));
  const archive = read<Record<string, ArchivedOffer>>('pinart-kalkulator-arhiv', {});
  data.offers.forEach(offer => {
    archive[offer.id] = {
      ...archive[offer.id],
      nazivPonudbe: offer.title,
      narocnikPonudbe: offer.client,
      datum: offer.date,
      stevilkaPonudbe: offer.number,
      vrstice: archive[offer.id]?.vrstice || offer.scope.map(ime => ({ ime, kolicina: 1 })),
    };
  });
  localStorage.setItem('pinart-kalkulator-arhiv', JSON.stringify(archive));
  localStorage.setItem('pinart-dashboard-offer-status', JSON.stringify(Object.fromEntries(data.offers.map(offer => [offer.id, offer.status]))));
  localStorage.setItem('pinart-dashboard-offer-amounts', JSON.stringify(Object.fromEntries(data.offers.map(offer => [offer.id, offer.agreedAmount]))));
};

const scheduleCloudSync = (data: FlowData) => {
  oznaciNesinhronizirano();
  queueMicrotask(() => {
    import('./pinartFlowCloud')
      .then(({ pushFlowData }) => pushFlowData(data))
      .catch(error => console.error('Pinart Flow cloud sync:', error));
  });
};

type FlowRecord = FlowOffer | FlowInvoice | FlowExpense | FlowContract | FlowClient;

const withUpdatedAt = <T extends FlowRecord>(nextItems: T[], previousItems: T[]): T[] => {
  const previous = new Map(previousItems.map(item => [item.id, item]));
  const now = new Date().toISOString();
  return nextItems.map(item => {
    const old = previous.get(item.id);
    if (!old) return { ...item, updatedAt: item.updatedAt || now };
    const { updatedAt: _nextUpdatedAt, ...nextComparable } = item;
    const { updatedAt: _oldUpdatedAt, ...oldComparable } = old;
    return JSON.stringify(nextComparable) === JSON.stringify(oldComparable)
      ? { ...item, updatedAt: item.updatedAt || old.updatedAt }
      : { ...item, updatedAt: now };
  });
};

export const saveFlowCollection = <K extends 'invoices' | 'expenses' | 'contracts' | 'clients'>(key: K, items: FlowData[K]) => {
  const data = loadFlowData();
  const stampedItems = withUpdatedAt(items as FlowRecord[], data[key] as FlowRecord[]) as FlowData[K];
  const nextIds = new Set(stampedItems.map(item => item.id));
  const removedIds = data[key].filter(item => !nextIds.has(item.id)).map(item => item.id);
  const next = { ...data, [key]: stampedItems };
  localStorage.setItem(FLOW_KEY, JSON.stringify(next));
  localStorage.setItem(legacyKeys[key], JSON.stringify(stampedItems));
  window.dispatchEvent(new CustomEvent('pinart-flow-change', { detail: { key } }));
  if (removedIds.length) queueMicrotask(() => import('./pinartFlowCloud').then(({ deleteCloudRecords }) => deleteCloudRecords(key, removedIds)).catch(error => console.error('Pinart Flow cloud delete:', error)));
  scheduleCloudSync(next);
};

export const saveOffers = (offers: FlowOffer[]) => {
  const data = loadFlowData();
  const stampedOffers = withUpdatedAt(offers, data.offers);
  const nextIds = new Set(stampedOffers.map(offer => offer.id));
  const removedIds = data.offers.filter(offer => !nextIds.has(offer.id)).map(offer => offer.id);
  const next = { ...data, offers: stampedOffers };
  localStorage.setItem(FLOW_KEY, JSON.stringify(next));
  localStorage.setItem('pinart-dashboard-offer-status', JSON.stringify(Object.fromEntries(stampedOffers.map(offer => [offer.id, offer.status]))));
  localStorage.setItem('pinart-dashboard-offer-amounts', JSON.stringify(Object.fromEntries(stampedOffers.map(offer => [offer.id, offer.agreedAmount]))));
  window.dispatchEvent(new CustomEvent('pinart-flow-change', { detail: { key: 'offers' } }));
  if (removedIds.length) queueMicrotask(() => import('./pinartFlowCloud').then(({ deleteCloudRecords }) => deleteCloudRecords('offers', removedIds)).catch(error => console.error('Pinart Flow cloud delete:', error)));
  scheduleCloudSync(next);
};

export const saveOfferAmount = (offerId: string, agreedAmount: number) => {
  const data = loadFlowData();
  const offers = data.offers.map(offer => offer.id === offerId ? { ...offer, agreedAmount, updatedAt: new Date().toISOString() } : offer);
  localStorage.setItem(FLOW_KEY, JSON.stringify({ ...data, offers }));
  const amounts = read<Record<string, number>>('pinart-dashboard-offer-amounts', {});
  localStorage.setItem('pinart-dashboard-offer-amounts', JSON.stringify({ ...amounts, [offerId]: agreedAmount }));
  window.dispatchEvent(new CustomEvent('pinart-flow-change', { detail: { key: 'offers' } }));
  scheduleCloudSync({ ...data, offers });
};

export function oznaciNesinhronizirano(): void {
  if (typeof window !== 'undefined') localStorage.setItem(UNSYNCED_KEY, '1');
}

export function oznaciSinhronizirano(): void {
  if (typeof window !== 'undefined') localStorage.removeItem(UNSYNCED_KEY);
}

export function jeSamoLokalno(): boolean {
  if (typeof window === 'undefined') return false;
  const projectRef = (() => {
    try {
      return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '').hostname.split('.')[0];
    } catch {
      return '';
    }
  })();
  const authCookiePrefix = projectRef ? `sb-${projectRef}-auth-token` : 'sb-';
  const imaSejo = document.cookie.split(';').some(cookie => {
    const name = cookie.trim().split('=')[0];
    return name === authCookiePrefix || name.startsWith(`${authCookiePrefix}.`);
  });
  return !imaSejo || localStorage.getItem(UNSYNCED_KEY) === '1';
}

export function izvoziFlowJSON(): string {
  const settingsKeys = [
    'pinart-dashboard-goal', 'pinart-dashboard-goal-settings', 'pinart-flow-delovnik-ure',
    'pinart-kalkulator-podjetja', 'pinart-kalkulator-profili', 'pinart-moje-podloge',
  ];
  const settings = typeof window === 'undefined' ? {} : Object.fromEntries(
    settingsKeys.map(key => [key, read<unknown>(key, null)]),
  );
  return JSON.stringify({ exportedAt: new Date().toISOString(), data: loadFlowData(), settings }, null, 2);
}

export const saveOfferStatus = (offerId: string, status: FlowOfferStatus) => {
  const data = loadFlowData();
  const offers = data.offers.map(offer => offer.id === offerId ? { ...offer, status } : offer);
  saveOffers(offers);
};

/* Povezave do zunanjih datotek projekta (Figma/Miro/IDD/mapa Drive ipd.) —
   "05 · DOKUMENTACIJA" v detajlu projekta. Ločena, lahka shramba (ni del
   FlowData/cloud sinhronizacije): kljuc offer.id -> seznam povezav. */
export type FlowProjectLink = { oznaka: string; url: string };

const PROJECT_LINKS_KEY = 'pinart-flow-projekt-linki';

export const loadProjectLinks = (offerId: string): FlowProjectLink[] => {
  const all = read<Record<string, FlowProjectLink[]>>(PROJECT_LINKS_KEY, {});
  return all[offerId] || [];
};

export const saveProjectLinks = (offerId: string, links: FlowProjectLink[]) => {
  if (typeof window === 'undefined') return;
  const all = read<Record<string, FlowProjectLink[]>>(PROJECT_LINKS_KEY, {});
  localStorage.setItem(PROJECT_LINKS_KEY, JSON.stringify({ ...all, [offerId]: links }));
};

export type FlowOfferStatus = 'draft' | 'sent' | 'accepted' | 'rejected';
export type FlowContractStatus = 'draft' | 'received' | 'review' | 'active' | 'signed';

export type FlowOffer = {
  id: string;
  title: string;
  client: string;
  date: string;
  number?: string;
  scope: string[];
  status: FlowOfferStatus;
  agreedAmount: number;
};

export type FlowInvoice = {
  id: string;
  number?: string;
  title?: string;
  client: string;
  amount: number;
  paid: boolean;
  date: string;
  dueDays?: number;
  sourceOfferId?: string;
  source?: string;
  fileName?: string;
  filePath?: string;
};

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
};

export type FlowClient = {
  id: string;
  name: string;
  email?: string;
  contact?: string;
  phone?: string;
  address?: string;
  tax?: string;
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
  queueMicrotask(() => {
    import('./pinartFlowCloud')
      .then(({ pushFlowData }) => pushFlowData(data))
      .catch(error => console.error('Pinart Flow cloud sync:', error));
  });
};

export const saveFlowCollection = <K extends 'invoices' | 'expenses' | 'contracts' | 'clients'>(key: K, items: FlowData[K]) => {
  const data = loadFlowData();
  const nextIds = new Set(items.map(item => item.id));
  const removedIds = data[key].filter(item => !nextIds.has(item.id)).map(item => item.id);
  const next = { ...data, [key]: items };
  localStorage.setItem(FLOW_KEY, JSON.stringify(next));
  localStorage.setItem(legacyKeys[key], JSON.stringify(items));
  window.dispatchEvent(new CustomEvent('pinart-flow-change', { detail: { key } }));
  if (removedIds.length) queueMicrotask(() => import('./pinartFlowCloud').then(({ deleteCloudRecords }) => deleteCloudRecords(key, removedIds)).catch(error => console.error('Pinart Flow cloud delete:', error)));
  scheduleCloudSync(next);
};

export const saveOffers = (offers: FlowOffer[]) => {
  const data = loadFlowData();
  const nextIds = new Set(offers.map(offer => offer.id));
  const removedIds = data.offers.filter(offer => !nextIds.has(offer.id)).map(offer => offer.id);
  const next = { ...data, offers };
  localStorage.setItem(FLOW_KEY, JSON.stringify(next));
  localStorage.setItem('pinart-dashboard-offer-status', JSON.stringify(Object.fromEntries(offers.map(offer => [offer.id, offer.status]))));
  localStorage.setItem('pinart-dashboard-offer-amounts', JSON.stringify(Object.fromEntries(offers.map(offer => [offer.id, offer.agreedAmount]))));
  window.dispatchEvent(new CustomEvent('pinart-flow-change', { detail: { key: 'offers' } }));
  if (removedIds.length) queueMicrotask(() => import('./pinartFlowCloud').then(({ deleteCloudRecords }) => deleteCloudRecords('offers', removedIds)).catch(error => console.error('Pinart Flow cloud delete:', error)));
  scheduleCloudSync(next);
};

export const saveOfferAmount = (offerId: string, agreedAmount: number) => {
  const data = loadFlowData();
  const offers = data.offers.map(offer => offer.id === offerId ? { ...offer, agreedAmount } : offer);
  localStorage.setItem(FLOW_KEY, JSON.stringify({ ...data, offers }));
  const amounts = read<Record<string, number>>('pinart-dashboard-offer-amounts', {});
  localStorage.setItem('pinart-dashboard-offer-amounts', JSON.stringify({ ...amounts, [offerId]: agreedAmount }));
  window.dispatchEvent(new CustomEvent('pinart-flow-change', { detail: { key: 'offers' } }));
  scheduleCloudSync({ ...data, offers });
};

export const saveOfferStatus = (offerId: string, status: FlowOfferStatus) => {
  const data = loadFlowData();
  const offers = data.offers.map(offer => offer.id === offerId ? { ...offer, status } : offer);
  saveOffers(offers);
};

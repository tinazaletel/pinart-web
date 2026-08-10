import { createClient } from '@/utils/supabase/client';
import { oznaciSinhronizirano } from './pinartFlowStore';
import type { FlowClient, FlowContract, FlowData, FlowExpense, FlowInvoice, FlowOffer } from './pinartFlowStore';

type OrganizationContext = { organizationId: string; userId: string };
export type UserOrganization = { id: string; name: string };
const ACTIVE_ORGANIZATION_KEY = 'pinart-flow-active-organization';
export type OrganizationProfile = { name: string; tax?: string; address?: string; email?: string; phone?: string; bankAccount?: string };
type CloudSettings = {
  monthlyGoal: number;
  desiredIncome: number;
  reservePercent: number;
  recurringCosts: Array<{ ime: string; znesek: string }>;
  priceProfiles: Record<string, unknown>;
  activePriceProfile?: string;
  accountingEmail?: string;
  accountingFrequency: 'monthly' | 'quarterly';
  legacyMigrationCompletedAt?: string;
  workdayHours?: number;
};

const dateOnly = (value?: string) => (value || new Date().toISOString()).slice(0, 10);
const stableId = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `legacy-client-${(hash >>> 0).toString(36)}`;
};

export async function getOrganizationContext(): Promise<OrganizationContext | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('organization_members')
    .select('organization_id,organizations(name)')
    .eq('user_id', user.id)
    .limit(100);
  if (!error && data?.length) {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(ACTIVE_ORGANIZATION_KEY) : null;
    const selected = data.find(item => String(item.organization_id) === stored) || data[0];
    return { organizationId: String(selected.organization_id), userId: user.id };
  }
  const { data: organizationId, error: ensureError } = await supabase.rpc('ensure_user_organization');
  if (ensureError || !organizationId) return null;
  return { organizationId: String(organizationId), userId: user.id };
}

export async function listUserOrganizations(): Promise<UserOrganization[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('organization_members')
    .select('organization_id,organizations(name)')
    .eq('user_id', user.id);
  if (error) throw error;
  return (data || []).map(item => {
    const organization = Array.isArray(item.organizations) ? item.organizations[0] : item.organizations;
    return { id: String(item.organization_id), name: String(organization?.name || 'Moje podjetje') };
  });
}

export function setActiveOrganization(organizationId: string): void {
  localStorage.setItem(ACTIVE_ORGANIZATION_KEY, organizationId);
}

export function getActiveOrganizationId(): string | null {
  return typeof window === 'undefined' ? null : localStorage.getItem(ACTIVE_ORGANIZATION_KEY);
}

export async function loadOrganizationProfile(): Promise<OrganizationProfile | null> {
  const context = await getOrganizationContext();
  if (!context) return null;
  const { data, error } = await createClient().from('organizations').select('name,tax_number,address,email,phone,bank_account').eq('id', context.organizationId).single();
  if (error) throw error;
  return { name: String(data.name), tax: data.tax_number || undefined, address: data.address || undefined, email: data.email || undefined, phone: data.phone || undefined, bankAccount: data.bank_account || undefined };
}

export async function saveOrganizationProfile(profile: OrganizationProfile): Promise<void> {
  const context = await getOrganizationContext();
  if (!context) return;
  const { error } = await createClient().from('organizations').update({
    name: profile.name || 'Moje podjetje', tax_number: profile.tax || null, address: profile.address || null,
    email: profile.email || null, phone: profile.phone || null, bank_account: profile.bankAccount || null, updated_at: new Date().toISOString(),
  }).eq('id', context.organizationId);
  if (error) throw error;
}

function allClients(data: FlowData): FlowClient[] {
  const byName = new Map<string, FlowClient>();
  data.clients.forEach(client => byName.set(client.name.trim().toLocaleLowerCase('sl'), client));
  const names = [
    ...data.offers.map(item => item.client),
    ...data.invoices.map(item => item.client),
    ...data.expenses.map(item => item.client || ''),
    ...data.contracts.map(item => item.client),
  ].map(name => name.trim()).filter(name => name && name !== 'Brez stranke');
  names.forEach(name => {
    const key = name.toLocaleLowerCase('sl');
    if (!byName.has(key)) byName.set(key, { id: stableId(key), name });
  });
  return [...byName.values()];
}

export async function pushFlowData(data: FlowData): Promise<void> {
  const context = await getOrganizationContext();
  if (!context) return;
  const supabase = createClient();
  const organizationId = context.organizationId;
  const clients = allClients(data);

  if (clients.length) {
    const { error } = await supabase.from('clients').upsert(clients.map(client => ({
      organization_id: organizationId,
      external_id: client.id,
      name: client.name,
      email: client.email || null,
      contact_name: client.contact || null,
      phone: client.phone || null,
      address: client.address || null,
      tax_number: client.tax || null,
      updated_at: client.updatedAt || new Date(0).toISOString(),
    })), { onConflict: 'organization_id,external_id' });
    if (error) throw error;
  }

  const { data: clientRows, error: clientError } = await supabase.from('clients').select('id,external_id,name').eq('organization_id', organizationId);
  if (clientError) throw clientError;
  const clientByName = new Map((clientRows || []).map(row => [String(row.name).trim().toLocaleLowerCase('sl'), String(row.id)]));

  if (data.offers.length) {
    const { error } = await supabase.from('offers').upsert(data.offers.map(offer => ({
      organization_id: organizationId,
      external_id: offer.id,
      client_id: clientByName.get(offer.client.trim().toLocaleLowerCase('sl')) || null,
      number: offer.number || null,
      title: offer.title,
      status: offer.status,
      issue_date: dateOnly(offer.date),
      scope: offer.scope,
      amount: offer.agreedAmount || 0,
      deleted_at: offer.deletedAt || null,
      deleted_by: offer.deletedBy || null,
      updated_at: offer.updatedAt || new Date(0).toISOString(),
    })), { onConflict: 'organization_id,external_id' });
    if (error) throw error;
  }

  const { data: offerRows, error: offerError } = await supabase.from('offers').select('id,external_id').eq('organization_id', organizationId);
  if (offerError) throw offerError;
  const offerByExternalId = new Map((offerRows || []).map(row => [String(row.external_id), String(row.id)]));

  if (data.invoices.length) {
    const { error } = await supabase.from('invoices').upsert(data.invoices.map(invoice => ({
      organization_id: organizationId,
      external_id: invoice.id,
      client_id: clientByName.get(invoice.client.trim().toLocaleLowerCase('sl')) || null,
      offer_id: invoice.sourceOfferId ? offerByExternalId.get(invoice.sourceOfferId) || null : null,
      number: invoice.number || null,
      title: invoice.title || null,
      status: invoice.status || (invoice.paid ? 'paid' : invoice.issuedAt ? 'sent' : 'draft'),
      issue_date: dateOnly(invoice.date),
      due_date: invoice.dueDays ? dateOnly(new Date(new Date(dateOnly(invoice.date)).getTime() + invoice.dueDays * 86400000).toISOString()) : null,
      paid_at: invoice.paid ? dateOnly(invoice.date) : null,
      amount: invoice.amount || 0,
      items: invoice.items || [],
      file_path: invoice.filePath || null,
      issued_at: invoice.issuedAt || null,
      version: invoice.version || 1,
      supersedes_id: invoice.supersedesId || null,
      storno_of_id: invoice.stornoOfId || null,
      cancelled_at: invoice.cancelledAt || null,
      cancel_reason: invoice.cancelReason || null,
      deleted_at: invoice.deletedAt || null,
      deleted_by: invoice.deletedBy || null,
      updated_at: invoice.updatedAt || new Date(0).toISOString(),
    })), { onConflict: 'organization_id,external_id' });
    if (error) throw error;
  }

  if (data.expenses.length) {
    const { error } = await supabase.from('expenses').upsert(data.expenses.map(expense => ({
      organization_id: organizationId,
      external_id: expense.id,
      client_id: expense.client ? clientByName.get(expense.client.trim().toLocaleLowerCase('sl')) || null : null,
      offer_id: expense.sourceOfferId ? offerByExternalId.get(expense.sourceOfferId) || null : null,
      title: expense.title,
      supplier: expense.company || null,
      category: expense.category || null,
      expense_date: dateOnly(expense.date),
      amount: expense.amount || 0,
      file_path: expense.filePath || null,
      deleted_at: expense.deletedAt || null,
      deleted_by: expense.deletedBy || null,
      updated_at: expense.updatedAt || new Date(0).toISOString(),
    })), { onConflict: 'organization_id,external_id' });
    if (error) throw error;
  }

  if (data.contracts.length) {
    const { error } = await supabase.from('contracts').upsert(data.contracts.map(contract => ({
      organization_id: organizationId,
      external_id: contract.id,
      client_id: clientByName.get(contract.client.trim().toLocaleLowerCase('sl')) || null,
      offer_id: contract.sourceOfferId ? offerByExternalId.get(contract.sourceOfferId) || null : null,
      title: contract.title,
      status: contract.status,
      contract_date: dateOnly(contract.date),
      body: contract.body || null,
      file_path: contract.filePath || null,
      notes: contract.notes || null,
      deleted_at: contract.deletedAt || null,
      deleted_by: contract.deletedBy || null,
      updated_at: contract.updatedAt || new Date(0).toISOString(),
    })), { onConflict: 'organization_id,external_id' });
    if (error) throw error;
  }

  oznaciSinhronizirano();
}

export async function deleteCloudRecords(
  collection: 'offers' | 'invoices' | 'expenses' | 'contracts' | 'clients',
  externalIds: string[],
): Promise<void> {
  if (!externalIds.length) return;
  const context = await getOrganizationContext();
  if (!context) return;
  const supabase = createClient();
  if (collection === 'clients') {
    const { error } = await supabase.from('clients').delete().eq('organization_id', context.organizationId).in('external_id', externalIds);
    if (error) throw error;
    return;
  }
  if (collection === 'invoices') {
    const { data, error: readError } = await supabase.from('invoices').select('external_id,issued_at').eq('organization_id', context.organizationId).in('external_id', externalIds);
    if (readError) throw readError;
    if ((data || []).some(row => row.issued_at)) throw new Error('Izdanega računa ni mogoče izbrisati. Uporabi storno.');
  }
  const table = ({ offers: 'offers', invoices: 'invoices', expenses: 'expenses', contracts: 'contracts' } as const)[collection];
  const { error } = await supabase.from(table).update({ deleted_at: new Date().toISOString(), deleted_by: context.userId }).eq('organization_id', context.organizationId).in('external_id', externalIds);
  if (error) throw error;
}

export async function pullFlowData(): Promise<FlowData | null> {
  const context = await getOrganizationContext();
  if (!context) return null;
  const supabase = createClient();
  const organizationId = context.organizationId;
  const [clientsResult, offersResult, invoicesResult, expensesResult, contractsResult] = await Promise.all([
    supabase.from('clients').select('*').eq('organization_id', organizationId),
    supabase.from('offers').select('*').eq('organization_id', organizationId),
    supabase.from('invoices').select('*').eq('organization_id', organizationId),
    supabase.from('expenses').select('*').eq('organization_id', organizationId),
    supabase.from('contracts').select('*').eq('organization_id', organizationId),
  ]);
  const firstError = [clientsResult.error, offersResult.error, invoicesResult.error, expensesResult.error, contractsResult.error].find(Boolean);
  if (firstError) throw firstError;
  const clients = clientsResult.data || [];
  const clientNameById = new Map(clients.map(row => [String(row.id), String(row.name)]));
  const offers = offersResult.data || [];
  const offerExternalById = new Map(offers.map(row => [String(row.id), String(row.external_id || row.id)]));

  return {
    version: 1,
    clients: clients.map(row => ({
      id: String(row.external_id || row.id), name: String(row.name), email: row.email || undefined,
      contact: row.contact_name || undefined, phone: row.phone || undefined, address: row.address || undefined, tax: row.tax_number || undefined,
      updatedAt: row.updated_at || undefined,
    })),
    offers: offers.map(row => ({
      id: String(row.external_id || row.id), title: String(row.title), client: clientNameById.get(String(row.client_id)) || 'Brez stranke',
      date: String(row.issue_date), number: row.number || undefined, scope: Array.isArray(row.scope) ? row.scope.map(String) : [],
      status: row.status as FlowOffer['status'], agreedAmount: Number(row.amount) || 0,
      deletedAt: row.deleted_at || undefined, deletedBy: row.deleted_by || undefined, updatedAt: row.updated_at || undefined,
    })),
    invoices: (invoicesResult.data || []).map(row => ({
      id: String(row.external_id || row.id), number: row.number || undefined, title: row.title || undefined,
      client: clientNameById.get(String(row.client_id)) || 'Brez stranke', amount: Number(row.amount) || 0,
      paid: row.status === 'paid', status: row.status as FlowInvoice['status'], date: String(row.issue_date),
      dueDays: row.due_date ? Math.max(0, Math.round((new Date(String(row.due_date)).getTime() - new Date(String(row.issue_date)).getTime()) / 86400000)) : undefined,
      sourceOfferId: row.offer_id ? offerExternalById.get(String(row.offer_id)) : undefined,
      source: row.offer_id ? 'offer' : 'manual',
      filePath: row.file_path || undefined, fileName: row.file_path ? String(row.file_path).split('/').pop() : undefined,
      items: Array.isArray(row.items) ? row.items : undefined, issuedAt: row.issued_at || undefined,
      version: row.version ? Number(row.version) : undefined, supersedesId: row.supersedes_id || undefined,
      stornoOfId: row.storno_of_id || undefined, cancelledAt: row.cancelled_at || undefined,
      cancelReason: row.cancel_reason || undefined,
      fiscalConfirmedAt: row.fiscal_confirmed_at || undefined, fiscalEor: row.fiscal_eor || undefined,
      fiscalZoi: row.fiscal_zoi || undefined, fiscalProvider: row.fiscal_provider || undefined,
      deletedAt: row.deleted_at || undefined, deletedBy: row.deleted_by || undefined, updatedAt: row.updated_at || undefined,
    })),
    expenses: (expensesResult.data || []).map(row => ({
      id: String(row.external_id || row.id), title: String(row.title), client: row.client_id ? clientNameById.get(String(row.client_id)) : undefined,
      amount: Number(row.amount) || 0, date: String(row.expense_date), sourceOfferId: row.offer_id ? offerExternalById.get(String(row.offer_id)) : undefined,
      company: row.supplier || undefined, category: row.category || undefined,
      filePath: row.file_path || undefined, fileName: row.file_path ? String(row.file_path).split('/').pop() : undefined,
      deletedAt: row.deleted_at || undefined, deletedBy: row.deleted_by || undefined, updatedAt: row.updated_at || undefined,
    })),
    contracts: (contractsResult.data || []).map(row => ({
      id: String(row.external_id || row.id), title: String(row.title), client: clientNameById.get(String(row.client_id)) || 'Brez stranke',
      date: String(row.contract_date), status: row.status as FlowContract['status'], sourceOfferId: row.offer_id ? offerExternalById.get(String(row.offer_id)) : undefined,
      body: row.body || undefined, notes: row.notes || undefined, filePath: row.file_path || undefined, fileName: row.file_path ? String(row.file_path).split('/').pop() : undefined,
      deletedAt: row.deleted_at || undefined, deletedBy: row.deleted_by || undefined, updatedAt: row.updated_at || undefined,
    })),
  };
}

export async function stornirajRacun(externalId: string, reason?: string): Promise<string> {
  const context = await getOrganizationContext();
  if (!context) throw new Error('Prijava je potekla.');
  const supabase = createClient();
  const { data: invoice, error: invoiceError } = await supabase.from('invoices').select('id').eq('organization_id', context.organizationId).eq('external_id', externalId).single();
  if (invoiceError) throw invoiceError;
  const { data, error } = await supabase.rpc('storniraj_racun', { p_id: invoice.id, p_razlog: reason || null });
  if (error) throw error;
  return String(data);
}

export type DocumentAuditEntry = {
  id: string;
  tableName: string;
  recordId: string;
  action: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  createdAt: string;
};

export async function listAudit(recordId: string): Promise<DocumentAuditEntry[]> {
  const context = await getOrganizationContext();
  if (!context) return [];
  const { data, error } = await createClient().from('document_audit').select('*').eq('organization_id', context.organizationId).eq('record_id', recordId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(row => ({
    id: String(row.id), tableName: String(row.table_name), recordId: String(row.record_id), action: String(row.action),
    oldData: row.old_data || undefined, newData: row.new_data || undefined, createdAt: String(row.created_at),
  }));
}

export const mergeByUpdatedAt = <T extends { id: string; updatedAt?: string; deletedAt?: string }>(cloud: T[], local: T[]) => {
  const items = new Map<string, T>();
  for (const item of [...cloud, ...local]) {
    const current = items.get(item.id);
    if (!current) { items.set(item.id, item); continue; }
    const currentTime = current.updatedAt ? Date.parse(current.updatedAt) : Number.NEGATIVE_INFINITY;
    const itemTime = item.updatedAt ? Date.parse(item.updatedAt) : Number.NEGATIVE_INFINITY;
    if (itemTime > currentTime || (itemTime === currentTime && !item.updatedAt)) items.set(item.id, item);
  }
  return [...items.values()].filter(item => !item.deletedAt);
};

export function mergeFlowData(cloud: FlowData, local: FlowData): FlowData {
  return {
    version: 1,
    offers: mergeByUpdatedAt(cloud.offers, local.offers), invoices: mergeByUpdatedAt(cloud.invoices, local.invoices),
    expenses: mergeByUpdatedAt(cloud.expenses, local.expenses), contracts: mergeByUpdatedAt(cloud.contracts, local.contracts), clients: mergeByUpdatedAt(cloud.clients, local.clients),
  };
}

const BUSINESS_DOCUMENT_BUCKET = 'business-documents';
const MAX_BUSINESS_DOCUMENT_BYTES = 25 * 1024 * 1024;
const MAX_SIGNED_URL_SECONDS = 3600;
const ALLOWED_BUSINESS_DOCUMENT_TYPES: Record<string, readonly string[]> = {
  pdf: ['application/pdf'],
  png: ['image/png'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  webp: ['image/webp'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  csv: ['text/csv', 'application/csv'],
  zip: ['application/zip', 'application/x-zip-compressed'],
};

export type BusinessDocumentFile = {
  id: string;
  organizationId: string;
  uploadedBy: string;
  bucket: string;
  path: string;
  name: string;
  mime: string;
  size: number;
  section: string;
  externalId: string;
  scanStatus: 'pending' | 'clean' | 'infected';
  createdAt: string;
};

function safePathSegment(value: string, label: string): string {
  const cleaned = value.trim().replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  if (!cleaned || value.includes('..') || value.startsWith('.')) throw new Error(`${label} ni veljaven.`);
  return cleaned;
}

function validateBusinessDocument(file: File): { safeName: string; mime: string } {
  const originalName = file.name.trim();
  if (!originalName || originalName.length > 180 || originalName.startsWith('.') || originalName.includes('..')) {
    throw new Error('Ime datoteke ni veljavno ali je predolgo.');
  }
  if (file.size <= 0 || file.size > MAX_BUSINESS_DOCUMENT_BYTES) {
    throw new Error('Datoteka mora biti manjša od 25 MB.');
  }
  const extension = originalName.split('.').pop()?.toLowerCase() || '';
  const allowedMime = ALLOWED_BUSINESS_DOCUMENT_TYPES[extension];
  const mime = file.type.trim().toLowerCase();
  if (!allowedMime || !mime || !allowedMime.includes(mime)) {
    throw new Error('Dovoljene so datoteke PDF, PNG, JPG, WEBP, DOCX, XLSX, CSV in ZIP.');
  }
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^\.+/, '').slice(0, 180);
  if (!safeName || safeName.includes('..')) throw new Error('Ime datoteke ni veljavno.');
  return { safeName, mime };
}

export async function uploadBusinessDocument(file: File, section: string, externalId: string): Promise<string> {
  const context = await getOrganizationContext();
  if (!context) throw new Error('Prijava je potekla.');
  const { safeName, mime } = validateBusinessDocument(file);
  const safeSection = safePathSegment(section, 'Vrsta dokumenta');
  const safeExternalId = safePathSegment(externalId, 'Povezava dokumenta');
  const path = `${context.organizationId}/${safeSection}/${safeExternalId}/${Date.now()}-${safeName}`;
  const supabase = createClient();
  const { error } = await supabase.storage.from(BUSINESS_DOCUMENT_BUCKET).upload(path, file, {
    upsert: false,
    contentType: mime,
  });
  if (error) throw error;
  /* Ob lansiranju AV pregled še ni aktiven, zato je začetno stanje clean.
     Ko bo worker priklopljen, se tu zamenja v pending, scan API pa ga zaključi. */
  const { error: metadataError } = await supabase.from('document_files').insert({
    organization_id: context.organizationId,
    uploaded_by: context.userId,
    bucket: BUSINESS_DOCUMENT_BUCKET,
    path,
    original_name: file.name,
    mime,
    size_bytes: file.size,
    section: safeSection,
    external_id: safeExternalId,
    scan_status: 'clean',
  });
  if (metadataError) {
    await supabase.storage.from(BUSINESS_DOCUMENT_BUCKET).remove([path]);
    throw metadataError;
  }
  return path;
}

export async function getBusinessDocumentUrl(path: string, expiresIn = 60): Promise<string> {
  const context = await getOrganizationContext();
  if (!context) throw new Error('Prijava je potekla.');
  if (!path.startsWith(`${context.organizationId}/`) || path.includes('..')) {
    throw new Error('Datoteka ne pripada aktivni organizaciji.');
  }
  const supabase = createClient();
  const { data: document, error: documentError } = await supabase
    .from('document_files')
    .select('bucket,scan_status,deleted_at')
    .eq('organization_id', context.organizationId)
    .eq('path', path)
    .maybeSingle();
  if (documentError) throw documentError;
  if (!document || document.deleted_at) throw new Error('Datoteka ne obstaja ali je arhivirana.');
  if (document.scan_status !== 'clean') throw new Error('Datoteka še ni varnostno potrjena.');
  const seconds = Math.min(MAX_SIGNED_URL_SECONDS, Math.max(1, Number.isFinite(expiresIn) ? Math.floor(expiresIn) : 60));
  const { data, error } = await supabase.storage.from(document.bucket).createSignedUrl(path, seconds);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteBusinessDocument(path: string): Promise<void> {
  const context = await getOrganizationContext();
  if (!context) throw new Error('Prijava je potekla.');
  if (!path.startsWith(`${context.organizationId}/`) || path.includes('..')) throw new Error('Datoteka ne pripada aktivni organizaciji.');
  /* Storage objekt ostane za obnovitev/backup. Trajni purge je dovoljen le
     prihodnji administratorski poti s service-role ključem. */
  const { data, error } = await createClient().rpc('archive_document_file', {
    p_organization_id: context.organizationId,
    p_path: path,
  });
  if (error) throw error;
  if (data !== true) throw new Error('Datoteka ne obstaja ali je že arhivirana.');
}

export async function listOrgFiles(): Promise<BusinessDocumentFile[]> {
  const context = await getOrganizationContext();
  if (!context) throw new Error('Prijava je potekla.');
  const { data, error } = await createClient().from('document_files').select(
    'id,organization_id,uploaded_by,bucket,path,original_name,mime,size_bytes,section,external_id,scan_status,created_at',
  ).eq('organization_id', context.organizationId).is('deleted_at', null).order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(item => ({
    id: String(item.id),
    organizationId: String(item.organization_id),
    uploadedBy: String(item.uploaded_by),
    bucket: String(item.bucket),
    path: String(item.path),
    name: String(item.original_name),
    mime: String(item.mime),
    size: Number(item.size_bytes),
    section: String(item.section),
    externalId: String(item.external_id),
    scanStatus: item.scan_status as BusinessDocumentFile['scanStatus'],
    createdAt: String(item.created_at),
  }));
}

export async function saveCloudSettings(settings: Partial<CloudSettings>): Promise<void> {
  const context = await getOrganizationContext();
  if (!context) return;
  const payload: Record<string, unknown> = { organization_id: context.organizationId, updated_at: new Date().toISOString() };
  if (settings.monthlyGoal !== undefined) payload.monthly_goal = settings.monthlyGoal;
  if (settings.desiredIncome !== undefined) payload.desired_income = settings.desiredIncome;
  if (settings.reservePercent !== undefined) payload.reserve_percent = settings.reservePercent;
  if (settings.recurringCosts !== undefined) payload.recurring_costs = settings.recurringCosts;
  if (settings.priceProfiles !== undefined) payload.price_profiles = settings.priceProfiles;
  if (settings.activePriceProfile !== undefined) payload.active_price_profile = settings.activePriceProfile;
  if (settings.accountingEmail !== undefined) payload.accounting_email = settings.accountingEmail;
  if (settings.accountingFrequency !== undefined) payload.accounting_frequency = settings.accountingFrequency;
  if (settings.legacyMigrationCompletedAt !== undefined) payload.legacy_migration_completed_at = settings.legacyMigrationCompletedAt;
  if (settings.workdayHours !== undefined) payload.workday_hours = settings.workdayHours;
  const { error } = await createClient().from('organization_settings').upsert(payload, { onConflict: 'organization_id' });
  if (error) throw error;
}

export async function loadCloudSettings(): Promise<CloudSettings | null> {
  const context = await getOrganizationContext();
  if (!context) return null;
  const { data, error } = await createClient().from('organization_settings').select('*').eq('organization_id', context.organizationId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    monthlyGoal: Number(data.monthly_goal) || 5000, desiredIncome: Number(data.desired_income) || 2000,
    reservePercent: Number(data.reserve_percent) || 20, recurringCosts: Array.isArray(data.recurring_costs) ? data.recurring_costs : [],
    priceProfiles: data.price_profiles && typeof data.price_profiles === 'object' ? data.price_profiles as Record<string, unknown> : {},
    activePriceProfile: data.active_price_profile || undefined, accountingEmail: data.accounting_email || undefined,
    accountingFrequency: data.accounting_frequency === 'monthly' ? 'monthly' : 'quarterly',
    legacyMigrationCompletedAt: data.legacy_migration_completed_at || undefined,
    workdayHours: Number(data.workday_hours) || 8,
  };
}

export async function saveBusinessGoal(revenueTarget: number, notes?: string): Promise<void> {
  const context = await getOrganizationContext();
  if (!context) return;
  const now = new Date();
  const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const periodStart = localDate(new Date(now.getFullYear(), now.getMonth(), 1));
  const periodEnd = localDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  const { error } = await createClient().from('business_goals').upsert({
    organization_id: context.organizationId,
    period_start: periodStart,
    period_end: periodEnd,
    revenue_target: revenueTarget,
    notes: notes || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'organization_id,period_start,period_end' });
  if (error) throw error;
}

export async function recordAccountingExport(input: {
  periodStart: string; periodEnd: string; recipientEmail?: string; archivePath?: string;
  invoiceCount: number; expenseCount: number; bankStatementCount?: number; sent?: boolean;
}): Promise<void> {
  const context = await getOrganizationContext();
  if (!context) return;
  const { error } = await createClient().from('accounting_exports').insert({
    organization_id: context.organizationId, period_start: input.periodStart, period_end: input.periodEnd,
    recipient_email: input.recipientEmail || null, archive_path: input.archivePath || null,
    invoice_count: input.invoiceCount, expense_count: input.expenseCount, bank_statement_count: input.bankStatementCount || 0,
    sent_at: input.sent ? new Date().toISOString() : null,
  });
  if (error) throw error;
}

export type AccountingExportRecord = {
  id: string; periodStart: string; periodEnd: string; recipientEmail?: string;
  sentAt?: string; archivePath?: string; invoiceCount: number; expenseCount: number;
  bankStatementCount: number; createdAt: string;
};

export async function listAccountingExports(): Promise<AccountingExportRecord[]> {
  const context = await getOrganizationContext();
  if (!context) return [];
  const { data, error } = await createClient().from('accounting_exports').select('*').eq('organization_id', context.organizationId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(row => ({
    id: String(row.id), periodStart: String(row.period_start), periodEnd: String(row.period_end), recipientEmail: row.recipient_email || undefined,
    sentAt: row.sent_at || undefined, archivePath: row.archive_path || undefined, invoiceCount: Number(row.invoice_count) || 0,
    expenseCount: Number(row.expense_count) || 0, bankStatementCount: Number(row.bank_statement_count) || 0, createdAt: String(row.created_at),
  }));
}

export async function saveRetainerDraft(input: {
  externalId: string; number?: string; client: FlowClient; scope: string[];
  pricingModel: 'hours' | 'package' | 'combined'; hoursPerMonth: number; hourlyRate: number;
  packageAmount: number; monthlyAmount: number; durationMonths: number; noticeDays: number;
  rightsText: string; document?: { file: File; kind: 'offer' | 'contract' };
}): Promise<void> {
  const context = await getOrganizationContext();
  if (!context) throw new Error('Prijava je potekla.');
  const supabase = createClient();
  const clientExternalId = input.client.id || stableId(input.client.name.toLocaleLowerCase('sl'));
  const { error: clientError } = await supabase.from('clients').upsert({
    organization_id: context.organizationId, external_id: clientExternalId, name: input.client.name,
    email: input.client.email || null, contact_name: input.client.contact || null,
    address: input.client.address || null, tax_number: input.client.tax || null, updated_at: new Date().toISOString(),
  }, { onConflict: 'organization_id,external_id' });
  if (clientError) throw clientError;
  const { data: clientRow, error: lookupError } = await supabase.from('clients').select('id').eq('organization_id', context.organizationId).eq('external_id', clientExternalId).single();
  if (lookupError) throw lookupError;
  let documentPath: string | undefined;
  if (input.document) documentPath = await uploadBusinessDocument(input.document.file, 'retainers', input.externalId);
  const payload: Record<string, unknown> = {
    organization_id: context.organizationId, external_id: input.externalId, client_id: clientRow.id,
    number: input.number || null, title: `Dolgoročno sodelovanje · ${input.client.name}`, status: 'draft', scope: input.scope,
    pricing_model: input.pricingModel, hours_per_month: input.hoursPerMonth, hourly_rate: input.hourlyRate,
    package_amount: input.packageAmount, monthly_amount: input.monthlyAmount, duration_months: input.durationMonths,
    notice_days: input.noticeDays, rights_text: input.rightsText, updated_at: new Date().toISOString(),
  };
  if (input.document?.kind === 'offer') payload.offer_file_path = documentPath;
  if (input.document?.kind === 'contract') payload.contract_file_path = documentPath;
  const { error } = await supabase.from('retainers').upsert(payload, { onConflict: 'organization_id,external_id' });
  if (error) throw error;
}

export type { CloudSettings };

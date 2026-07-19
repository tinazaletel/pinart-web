import { createClient } from '@/utils/supabase/client';
import type { FlowClient, FlowContract, FlowData, FlowExpense, FlowInvoice, FlowOffer } from './pinartFlowStore';

type OrganizationContext = { organizationId: string; userId: string };
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
    .select('organization_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();
  if (!error && data) return { organizationId: String(data.organization_id), userId: user.id };
  const { data: organizationId, error: ensureError } = await supabase.rpc('ensure_user_organization');
  if (ensureError || !organizationId) return null;
  return { organizationId: String(organizationId), userId: user.id };
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
      updated_at: new Date().toISOString(),
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
      updated_at: new Date().toISOString(),
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
      status: invoice.paid ? 'paid' : 'sent',
      issue_date: dateOnly(invoice.date),
      due_date: invoice.dueDays ? dateOnly(new Date(new Date(dateOnly(invoice.date)).getTime() + invoice.dueDays * 86400000).toISOString()) : null,
      paid_at: invoice.paid ? dateOnly(invoice.date) : null,
      amount: invoice.amount || 0,
      file_path: invoice.filePath || null,
      updated_at: new Date().toISOString(),
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
      updated_at: new Date().toISOString(),
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
      updated_at: new Date().toISOString(),
    })), { onConflict: 'organization_id,external_id' });
    if (error) throw error;
  }
}

export async function deleteCloudRecords(
  collection: 'offers' | 'invoices' | 'expenses' | 'contracts' | 'clients',
  externalIds: string[],
): Promise<void> {
  if (!externalIds.length) return;
  const context = await getOrganizationContext();
  if (!context) return;
  const table = ({ offers: 'offers', invoices: 'invoices', expenses: 'expenses', contracts: 'contracts', clients: 'clients' } as const)[collection];
  const { error } = await createClient().from(table).delete().eq('organization_id', context.organizationId).in('external_id', externalIds);
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
    })),
    offers: offers.map(row => ({
      id: String(row.external_id || row.id), title: String(row.title), client: clientNameById.get(String(row.client_id)) || 'Brez stranke',
      date: String(row.issue_date), number: row.number || undefined, scope: Array.isArray(row.scope) ? row.scope.map(String) : [],
      status: row.status as FlowOffer['status'], agreedAmount: Number(row.amount) || 0,
    })),
    invoices: (invoicesResult.data || []).map(row => ({
      id: String(row.external_id || row.id), number: row.number || undefined, title: row.title || undefined,
      client: clientNameById.get(String(row.client_id)) || 'Brez stranke', amount: Number(row.amount) || 0,
      paid: row.status === 'paid', date: String(row.issue_date),
      dueDays: row.due_date ? Math.max(0, Math.round((new Date(String(row.due_date)).getTime() - new Date(String(row.issue_date)).getTime()) / 86400000)) : undefined,
      sourceOfferId: row.offer_id ? offerExternalById.get(String(row.offer_id)) : undefined,
      source: row.offer_id ? 'offer' : 'manual',
      filePath: row.file_path || undefined, fileName: row.file_path ? String(row.file_path).split('/').pop() : undefined,
    })),
    expenses: (expensesResult.data || []).map(row => ({
      id: String(row.external_id || row.id), title: String(row.title), client: row.client_id ? clientNameById.get(String(row.client_id)) : undefined,
      amount: Number(row.amount) || 0, date: String(row.expense_date), sourceOfferId: row.offer_id ? offerExternalById.get(String(row.offer_id)) : undefined,
      company: row.supplier || undefined, category: row.category || undefined,
      filePath: row.file_path || undefined, fileName: row.file_path ? String(row.file_path).split('/').pop() : undefined,
    })),
    contracts: (contractsResult.data || []).map(row => ({
      id: String(row.external_id || row.id), title: String(row.title), client: clientNameById.get(String(row.client_id)) || 'Brez stranke',
      date: String(row.contract_date), status: row.status as FlowContract['status'], sourceOfferId: row.offer_id ? offerExternalById.get(String(row.offer_id)) : undefined,
      body: row.body || undefined, notes: row.notes || undefined, filePath: row.file_path || undefined, fileName: row.file_path ? String(row.file_path).split('/').pop() : undefined,
    })),
  };
}

const merge = <T extends { id: string }>(cloud: T[], local: T[]) => {
  const items = new Map(cloud.map(item => [item.id, item]));
  local.forEach(item => items.set(item.id, item));
  return [...items.values()];
};

export function mergeFlowData(cloud: FlowData, local: FlowData): FlowData {
  return {
    version: 1,
    offers: merge(cloud.offers, local.offers), invoices: merge(cloud.invoices, local.invoices),
    expenses: merge(cloud.expenses, local.expenses), contracts: merge(cloud.contracts, local.contracts), clients: merge(cloud.clients, local.clients),
  };
}

export async function uploadBusinessDocument(file: File, section: string, externalId: string): Promise<string> {
  const context = await getOrganizationContext();
  if (!context) throw new Error('Prijava je potekla.');
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-');
  const path = `${context.organizationId}/${section}/${externalId}/${Date.now()}-${safeName}`;
  const { error } = await createClient().storage.from('business-documents').upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}

export async function getBusinessDocumentUrl(path: string, expiresIn = 60): Promise<string> {
  const { data, error } = await createClient().storage.from('business-documents').createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
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

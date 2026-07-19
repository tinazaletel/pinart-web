import { createClient } from '@/utils/supabase/client';
import { getOrganizationContext } from '@/lib/pinartFlowCloud';

export type BusinessPlan = {
  desiredMonthlyIncome: number;
  fixedMonthlyCosts: number;
  taxReservePercent: number;
  safetyReservePercent: number;
  billableHoursMonthly: number;
  averageProjectValue: number;
  workDaysWeekly: number;
  weeksOffYearly: number;
  notes: string;
};

export type PrivateTimeEntry = {
  id: string;
  projectName: string;
  serviceName: string;
  startedAt: string;
  endedAt?: string;
  durationMinutes: number;
  amount: number;
  scopeStatus: 'included' | 'extra';
  overrunReason?: string;
  note?: string;
};

export const DEFAULT_BUSINESS_PLAN: BusinessPlan = {
  desiredMonthlyIncome: 2000, fixedMonthlyCosts: 0, taxReservePercent: 20,
  safetyReservePercent: 10, billableHoursMonthly: 80, averageProjectValue: 1000,
  workDaysWeekly: 5, weeksOffYearly: 5, notes: '',
};

const PLAN_KEY = 'pinart-flow-business-plan-v1';
const TIME_KEY = 'pinart-flow-private-time-v1';

export function calculatePlan(plan: BusinessPlan) {
  const reserve = Math.min(80, Math.max(0, plan.taxReservePercent + plan.safetyReservePercent)) / 100;
  const monthlyRevenueTarget = Math.ceil(((plan.fixedMonthlyCosts + plan.desiredMonthlyIncome) / Math.max(.2, 1 - reserve)) / 50) * 50;
  const sustainableHourlyRate = plan.billableHoursMonthly > 0 ? monthlyRevenueTarget / plan.billableHoursMonthly : 0;
  const projectsNeeded = plan.averageProjectValue > 0 ? Math.ceil(monthlyRevenueTarget / plan.averageProjectValue) : 0;
  return { monthlyRevenueTarget, annualRevenueTarget: monthlyRevenueTarget * 12, sustainableHourlyRate, projectsNeeded };
}

export function loadLocalPlan(): BusinessPlan {
  if (typeof window === 'undefined') return DEFAULT_BUSINESS_PLAN;
  try { return { ...DEFAULT_BUSINESS_PLAN, ...JSON.parse(localStorage.getItem(PLAN_KEY) || '{}') }; }
  catch { return DEFAULT_BUSINESS_PLAN; }
}

export function saveLocalPlan(plan: BusinessPlan) {
  localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
}

export function loadLocalTimeEntries(): PrivateTimeEntry[] {
  if (typeof window === 'undefined') return [];
  try { const value = JSON.parse(localStorage.getItem(TIME_KEY) || '[]'); return Array.isArray(value) ? value : []; }
  catch { return []; }
}

export function saveLocalTimeEntries(entries: PrivateTimeEntry[]) {
  localStorage.setItem(TIME_KEY, JSON.stringify(entries));
}

export async function loadCloudBusinessPlan(): Promise<BusinessPlan | null> {
  const context = await getOrganizationContext();
  if (!context) return null;
  const { data, error } = await createClient().from('business_plans').select('*').eq('organization_id', context.organizationId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    desiredMonthlyIncome: Number(data.desired_monthly_income), fixedMonthlyCosts: Number(data.fixed_monthly_costs),
    taxReservePercent: Number(data.tax_reserve_percent), safetyReservePercent: Number(data.safety_reserve_percent),
    billableHoursMonthly: Number(data.billable_hours_monthly), averageProjectValue: Number(data.average_project_value),
    workDaysWeekly: Number(data.work_days_weekly), weeksOffYearly: Number(data.weeks_off_yearly), notes: data.notes || '',
  };
}

export async function saveCloudBusinessPlan(plan: BusinessPlan): Promise<void> {
  const context = await getOrganizationContext();
  if (!context) return;
  const { error } = await createClient().from('business_plans').upsert({
    organization_id: context.organizationId, desired_monthly_income: plan.desiredMonthlyIncome,
    fixed_monthly_costs: plan.fixedMonthlyCosts, tax_reserve_percent: plan.taxReservePercent,
    safety_reserve_percent: plan.safetyReservePercent, billable_hours_monthly: plan.billableHoursMonthly,
    average_project_value: plan.averageProjectValue, work_days_weekly: plan.workDaysWeekly,
    weeks_off_yearly: plan.weeksOffYearly, notes: plan.notes || null, updated_at: new Date().toISOString(),
  }, { onConflict: 'organization_id' });
  if (error) throw error;
}

const fromRow = (row: Record<string, unknown>): PrivateTimeEntry => ({
  id: String(row.id), projectName: String(row.project_name), serviceName: String(row.service_name || ''),
  startedAt: String(row.started_at), endedAt: row.ended_at ? String(row.ended_at) : undefined,
  durationMinutes: Number(row.duration_minutes) || 0, amount: Number(row.amount) || 0,
  scopeStatus: row.scope_status === 'extra' ? 'extra' : 'included',
  overrunReason: row.overrun_reason ? String(row.overrun_reason) : undefined, note: row.note ? String(row.note) : undefined,
});

export async function loadCloudTimeEntries(): Promise<PrivateTimeEntry[]> {
  const context = await getOrganizationContext();
  if (!context) return [];
  const { data, error } = await createClient().from('private_time_entries').select('*').eq('user_id', context.userId).order('started_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(row => fromRow(row));
}

export async function saveCloudTimeEntry(entry: PrivateTimeEntry): Promise<void> {
  const context = await getOrganizationContext();
  if (!context) return;
  const { error } = await createClient().from('private_time_entries').upsert({
    id: entry.id, organization_id: context.organizationId, user_id: context.userId,
    project_name: entry.projectName, service_name: entry.serviceName || null, started_at: entry.startedAt,
    ended_at: entry.endedAt || null, duration_minutes: entry.durationMinutes, amount: entry.amount,
    scope_status: entry.scopeStatus, overrun_reason: entry.overrunReason || null, note: entry.note || null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function deleteCloudTimeEntry(id: string): Promise<void> {
  const context = await getOrganizationContext();
  if (!context) return;
  const { error } = await createClient().from('private_time_entries').delete().eq('id', id).eq('user_id', context.userId);
  if (error) throw error;
}

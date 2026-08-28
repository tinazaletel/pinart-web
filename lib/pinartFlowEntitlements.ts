import { createClient } from '@/utils/supabase/client';
import { jeTester } from '@/lib/testerji';
import { aktivnaDodelitev, dodelitevOdklene } from '@/lib/dostop';

export type AccessTier = 'anonymous' | 'free' | 'premium' | 'pro';

export type FlowRole = 'owner' | 'admin' | 'accounting' | 'member' | 'viewer';
export type FlowRoleAction =
  | 'view'
  | 'edit'
  | 'issueInvoice'
  | 'exportAccounting'
  | 'delete'
  | 'manageMembers'
  | 'overrideInvoiceNumber';

type DatabaseFlowRole = FlowRole | 'accountant';

const ROLE_RANK: Record<FlowRole, number> = {
  viewer: 1,
  member: 2,
  accounting: 3,
  admin: 4,
  owner: 5,
};

const normalizeRole = (role: DatabaseFlowRole | null | undefined): FlowRole | null => {
  if (!role) return null;
  return role === 'accountant' ? 'accounting' : role;
};

export function roleAtLeast(role: FlowRole | null, minimum: FlowRole): boolean {
  return role !== null && ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export function roleCan(role: FlowRole | null, action: FlowRoleAction): boolean {
  if (action === 'view') return roleAtLeast(role, 'viewer');
  if (action === 'edit') return roleAtLeast(role, 'member');
  if (action === 'issueInvoice' || action === 'exportAccounting') {
    return roleAtLeast(role, 'accounting');
  }
  return roleAtLeast(role, 'admin');
}

export const canIssueInvoice = (role: FlowRole | null) => roleCan(role, 'issueInvoice');
export const canDelete = (role: FlowRole | null) => roleCan(role, 'delete');
export const canManageMembers = (role: FlowRole | null) => roleCan(role, 'manageMembers');
export const canExportAccounting = (role: FlowRole | null) => roleCan(role, 'exportAccounting');
export const canOverrideNumber = (role: FlowRole | null) => roleCan(role, 'overrideInvoiceNumber');

export async function getMembershipRole(): Promise<FlowRole | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('organization_members')
    .select('organization_id,role')
    .eq('user_id', user.id)
    .order('created_at')
    .limit(100);
  if (error || !data?.length) return null;

  const activeOrganization = typeof window === 'undefined'
    ? null
    : localStorage.getItem('pinart-flow-active-organization');
  const membership = data.find(item => item.organization_id === activeOrganization) || data[0];
  return normalizeRole(membership.role as DatabaseFlowRole);
}

export type FlowFeature =
  | 'calculator'
  | 'localPdf'
  | 'cloudBackup'
  | 'basicHistory'
  | 'clients'
  | 'contracts'
  | 'expenses'
  | 'businessInsights'
  | 'accountingExport'
  | 'aiConnector';

/* Brezplacni paket: neomejene ponudbe, shranjene v oblaku. Kartoteka strank je
   placljiva — delna kartoteka (3 stranke) je bila samo obcutek pomanjkanja in je
   vpis delala manj privlacen od uporabe brez racuna. */
export const FREE_LIMITS = {
  documentsPerMonth: 0,   /* 0 = brez omejitve */
  priceProfiles: 1,
} as const;

const FEATURES: Record<AccessTier, ReadonlySet<FlowFeature>> = {
  anonymous: new Set(['calculator', 'localPdf']),
  free: new Set(['calculator', 'localPdf', 'cloudBackup', 'basicHistory']),
  /* Premium ima vse iz Pro RAZEN vključene Pupe na našem računu — AI si priklopi
     sam prek 'aiConnector' in ga plača svojemu ponudniku, natanko kot piše v
     ceniku. Razliko med paketoma dela kvota, ne zaklenjena vrata. */
  premium: new Set([
    'calculator', 'localPdf', 'cloudBackup', 'basicHistory', 'clients',
    'contracts', 'expenses', 'businessInsights', 'accountingExport', 'aiConnector',
  ]),
  pro: new Set([
    'calculator', 'localPdf', 'cloudBackup', 'basicHistory', 'clients',
    'contracts', 'expenses', 'businessInsights', 'accountingExport', 'aiConnector',
  ]),
};

export function canUseFeature(tier: AccessTier, feature: FlowFeature): boolean {
  return FEATURES[tier].has(feature);
}

export async function getAccessTier(): Promise<AccessTier> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 'anonymous';

  /* Zaprta beta / dodelitve: povabljeni testerji in nagrajenci (znotraj obdobja)
     dobijo poln (pro) paket zastonj, ne glede na placilo. Env seznam je varovalka
     (Tina), baza (RPC) pa je samopostrezni vir, ki ga upravljas v adminu. */
  if (jeTester(user.email)) return 'pro';
  try {
    if (dodelitevOdklene(await aktivnaDodelitev(supabase, user.email))) return 'pro';
  } catch { /* ce RPC pade, nadaljujemo z obicajnim entitlementom */ }

  const { data, error } = await supabase.rpc('current_organization_entitlements');
  if (error || !Array.isArray(data) || !data[0]) return 'free';

  const entitlement = data[0] as {
    tier?: string;
    status?: string;
    valid_until?: string | null;
  };
  const usableStatus = entitlement.status === 'active' || entitlement.status === 'trialing';
  const expired = entitlement.valid_until
    ? new Date(entitlement.valid_until).getTime() < Date.now()
    : false;

  /* Premium je obstajal v ceniku in v bazi, tu pa ne — zato je plačnik videl
     ključavnico na Pupi, čeprav mu jo cenik obljublja (Tina, 28. 8. 2026).
     Razlika med paketoma ostaja v kvoti: Pro ima sporočila vključena, Premium
     priklopi svoj AI ključ in ga plača svojemu ponudniku. */
  if (!usableStatus || expired) return 'free';
  if (entitlement.tier === 'pro') return 'pro';
  if (entitlement.tier === 'premium') return 'premium';
  return 'free';
}

import { createClient } from '@/utils/supabase/client';
import { jeTester } from '@/lib/testerji';
import { aktivnaDodelitev, dodelitevOdklene } from '@/lib/dostop';

export type AccessTier = 'anonymous' | 'free' | 'pro';

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

  return entitlement.tier === 'pro' && usableStatus && !expired ? 'pro' : 'free';
}

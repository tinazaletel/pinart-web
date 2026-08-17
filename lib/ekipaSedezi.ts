/* Sedeži po planu — Faza 5 večuporabniškega sloja.
   Sedež = aktiven član (organization_members) + čakajoče vabilo (organization_invites).
   Plana: 'free' in 'pro' (pro = advance paket). Team je predviden kot plačljiva
   prednost advance paketa.

   OPOMBA (beta): dokler plačevanje ni povezano, so vsi 'free'. Da team res postane
   prednost pro paketa, ob zagonu billinga znižaj FREE na 1 (samo lastnik). Za zdaj
   free dovoli manjšo ekipo, da beta testiranje deluje. Številke so nastavljive. */

export type Plan = 'free' | 'pro';

export const SEDEZI_PO_PLANU: Record<Plan, number> = {
  free: 3,   // beta: lastnik + 2; ob billingu razmisli o znižanju na 1 (team = pro)
  pro: 25,
};

export function mejaSedezev(plan: string | null | undefined): number {
  return SEDEZI_PO_PLANU[(plan as Plan)] ?? SEDEZI_PO_PLANU.free;
}

export function planOznaka(plan: string | null | undefined): string {
  return plan === 'pro' ? 'Napredni' : 'Brezplačni';
}

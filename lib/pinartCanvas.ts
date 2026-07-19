import { createClient } from '@/utils/supabase/client';
import { getOrganizationContext } from '@/lib/pinartFlowCloud';

export type BusinessCanvas = {
  partners: string;
  activities: string;
  resources: string;
  value: string;
  relationships: string;
  channels: string;
  segments: string;
  costs: string;
  revenue: string;
};

export const EMPTY_BUSINESS_CANVAS: BusinessCanvas = {
  partners: '', activities: '', resources: '', value: '', relationships: '',
  channels: '', segments: '', costs: '', revenue: '',
};

const STORAGE_KEY = 'pinart-flow-business-canvas-v1';

export function loadLocalCanvas(): BusinessCanvas {
  if (typeof window === 'undefined') return EMPTY_BUSINESS_CANVAS;
  try { return { ...EMPTY_BUSINESS_CANVAS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }; }
  catch { return EMPTY_BUSINESS_CANVAS; }
}

export function saveLocalCanvas(canvas: BusinessCanvas) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(canvas));
}

export async function loadCloudCanvas(): Promise<BusinessCanvas | null> {
  const context = await getOrganizationContext();
  if (!context) return null;
  const { data, error } = await createClient().from('business_canvases').select('blocks').eq('organization_id', context.organizationId).maybeSingle();
  if (error) throw error;
  return data?.blocks ? { ...EMPTY_BUSINESS_CANVAS, ...(data.blocks as Partial<BusinessCanvas>) } : null;
}

export async function saveCloudCanvas(canvas: BusinessCanvas): Promise<void> {
  const context = await getOrganizationContext();
  if (!context) return;
  const { error } = await createClient().from('business_canvases').upsert({
    organization_id: context.organizationId, blocks: canvas, updated_at: new Date().toISOString(),
  }, { onConflict: 'organization_id' });
  if (error) throw error;
}

export function canvasToPlan(canvas: BusinessCanvas): string {
  const section = (title: string, value: string) => `${title}\n${value.trim() || 'Še ni določeno.'}`;
  return [
    'OSNOVNI POSLOVNI NAČRT',
    section('1. Poslovna ideja in vrednost za stranko', canvas.value),
    section('2. Ciljne stranke', canvas.segments),
    section('3. Prodajni in komunikacijski kanali', canvas.channels),
    section('4. Odnosi s strankami', canvas.relationships),
    section('5. Ključne aktivnosti', canvas.activities),
    section('6. Ključni viri', canvas.resources),
    section('7. Ključni partnerji', canvas.partners),
    section('8. Prihodki', canvas.revenue),
    section('9. Stroški', canvas.costs),
    'Naslednji korak\nZ AI asistentom preveri trg, konkurenco, tveganja, prodajni načrt in finančne projekcije.',
  ].join('\n\n');
}

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
const DOCUMENTS_STORAGE_KEY = 'pinart-flow-business-canvases-v2';
const ACTIVE_DOCUMENT_KEY = 'pinart-flow-active-business-canvas';
const LEGACY_MIGRATED_KEY = 'pinart-flow-business-canvases-legacy-migrated';
const scopedKey = (key: string, scope: string) => `${key}:${scope || 'anonymous'}`;

export type BusinessCanvasDocument = {
  id: string;
  name: string;
  companyName: string;
  brandName: string;
  blocks: BusinessCanvas;
  updatedAt: string;
};

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `canvas-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createCanvasDocument(companyName = '', brandName = ''): BusinessCanvasDocument {
  return {
    id: newId(),
    name: brandName || companyName || 'Nov Canvas',
    companyName,
    brandName,
    blocks: { ...EMPTY_BUSINESS_CANVAS },
    updatedAt: new Date().toISOString(),
  };
}

export function loadLocalCanvasDocuments(scope = 'anonymous'): BusinessCanvasDocument[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = JSON.parse(localStorage.getItem(scopedKey(DOCUMENTS_STORAGE_KEY, scope)) || '[]') as BusinessCanvasDocument[];
    if (Array.isArray(saved) && saved.length) {
      return saved.map(document => ({
        ...document,
        companyName: document.companyName || '',
        brandName: document.brandName || '',
        blocks: { ...EMPTY_BUSINESS_CANVAS, ...document.blocks },
      }));
    }
    if (!localStorage.getItem(LEGACY_MIGRATED_KEY)) {
      const previousDocuments = JSON.parse(localStorage.getItem(DOCUMENTS_STORAGE_KEY) || '[]') as BusinessCanvasDocument[];
      const legacy = previousDocuments.length ? previousDocuments[0].blocks : loadLocalCanvas();
      if (!Object.values(legacy).some(value => value.trim())) return [];
      const document = previousDocuments[0] || { ...createCanvasDocument('', ''), name: 'Glavni Canvas', blocks: legacy };
      saveLocalCanvasDocuments([document], scope);
      localStorage.setItem(LEGACY_MIGRATED_KEY, '1');
      return [document];
    }
  } catch { /* neveljaven lokalni zapis se obravnava kot prazen */ }
  return [];
}

export function saveLocalCanvasDocuments(documents: BusinessCanvasDocument[], scope = 'anonymous'): void {
  localStorage.setItem(scopedKey(DOCUMENTS_STORAGE_KEY, scope), JSON.stringify(documents));
}

export function loadActiveCanvasId(scope = 'anonymous'): string | null {
  return typeof window === 'undefined' ? null : localStorage.getItem(scopedKey(ACTIVE_DOCUMENT_KEY, scope));
}

export function saveActiveCanvasId(id: string, scope = 'anonymous'): void {
  localStorage.setItem(scopedKey(ACTIVE_DOCUMENT_KEY, scope), id);
}

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

export async function loadCloudCanvasDocuments(): Promise<BusinessCanvasDocument[]> {
  const context = await getOrganizationContext();
  if (!context) return [];
  const { data, error } = await createClient()
    .from('business_canvases')
    .select('id,name,company_name,brand_name,blocks,updated_at')
    .eq('organization_id', context.organizationId)
    .eq('is_archived', false)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(row => ({
    id: String(row.id),
    name: String(row.name || 'Glavni Canvas'),
    companyName: String(row.company_name || ''),
    brandName: String(row.brand_name || ''),
    blocks: { ...EMPTY_BUSINESS_CANVAS, ...(row.blocks as Partial<BusinessCanvas>) },
    updatedAt: String(row.updated_at),
  }));
}

export async function saveCloudCanvasDocument(document: BusinessCanvasDocument): Promise<boolean> {
  const context = await getOrganizationContext();
  if (!context) return false;
  const { error } = await createClient().from('business_canvases').upsert({
    id: document.id,
    organization_id: context.organizationId,
    name: document.name,
    company_name: document.companyName || null,
    brand_name: document.brandName || null,
    blocks: document.blocks,
    updated_at: document.updatedAt,
    is_archived: false,
  }, { onConflict: 'id' });
  if (error) throw error;
  return true;
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

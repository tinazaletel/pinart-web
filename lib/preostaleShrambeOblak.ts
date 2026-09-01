/* Majhne lokalne zbirke ↔ oblak. localStorage ostane sinhrona lokalna kopija;
   ta modul pokliče FlowCloudBridge ob prijavi in ob spodaj navedenih dogodkih. */
import { createClient } from '@/utils/supabase/client';
import { getOrganizationContext } from './pinartFlowCloud';
import { jeSamoPredogled } from './predogled';
import { preberiKlepetVsi, zapisiKlepetVsi, type KlepetSporocilo } from './klepet';
import { preberiMarketingKampanjeVse, zapisiMarketingKampanjeVse, preberiObjaveVse, zapisiObjaveVse,
         type MarketingKampanja, type MarketingObjava } from './marketing';
import { preberiVsoPostoSurovo, zapisiVsoPostoSurovo, type PostaVnos } from './postaDnevnik';
import { preberiVideno, shraniVideno } from './komObvestila';
import { preberiPupaStanjeZapis, zapisiPupaStanjeZapis, type PupaStanjeZapis } from './pupaNastavitve';

type Zapis = { id: string; updatedAt?: string; deletedAt?: string; [kljuc: string]: unknown };
type Zbirka = 'klepet' | 'marketing' | 'objave' | 'kom-obvestila' | 'posta' | 'pupa-nastavitve';
type Vrstica = { external_id: string; data: unknown; updated_at: string | null; deleted_at: string | null };

const cas = (z: { updatedAt?: string }): number => {
  const t = Date.parse(z.updatedAt || '');
  return Number.isNaN(t) ? 0 : t;
};
const podpis = (z: Zapis[]) => z.map(v => `${v.id}:${v.updatedAt || ''}:${v.deletedAt || ''}`).sort().join('|');
const izVrstice = (v: Vrstica): Zapis => ({
  ...((v.data && typeof v.data === 'object' ? v.data : {}) as Zapis),
  id: v.external_id, updatedAt: v.updated_at || undefined, deletedAt: v.deleted_at || undefined,
});

async function push(zbirka: Zbirka, lokalno: Zapis[]): Promise<void> {
  if (jeSamoPredogled() || !lokalno.length) return;
  const context = await getOrganizationContext();
  if (!context) return;
  const supabase = createClient();
  const { data, error } = await supabase.from('organization_local_records')
    .select('external_id,updated_at,deleted_at').eq('organization_id', context.organizationId).eq('collection', zbirka);
  if (error) throw error;
  const oblak = new Map((data || []).map(v => [String(v.external_id), v]));
  const novejse = lokalno.filter(z => {
    const o = oblak.get(z.id);
    return !o || cas(z) >= (o.updated_at ? Date.parse(o.updated_at) : 0);
  });
  if (!novejse.length) return;
  const { error: napaka } = await supabase.from('organization_local_records').upsert(novejse.map(z => ({
    organization_id: context.organizationId, collection: zbirka, external_id: z.id,
    data: z, updated_at: z.updatedAt || new Date(0).toISOString(), deleted_at: z.deletedAt || null,
  })), { onConflict: 'organization_id,collection,external_id' });
  if (napaka) throw napaka;
}

async function pull(zbirka: Zbirka): Promise<Zapis[] | null> {
  if (jeSamoPredogled()) return null;
  const context = await getOrganizationContext();
  if (!context) return null;
  const { data, error } = await createClient().from('organization_local_records')
    .select('external_id,data,updated_at,deleted_at').eq('organization_id', context.organizationId).eq('collection', zbirka);
  if (error) throw error;
  return (data || []).map(v => izVrstice(v as Vrstica));
}

async function sinhroniziraj(zbirka: Zbirka, beri: () => Zapis[], zapisi: (z: Zapis[]) => void): Promise<boolean> {
  try {
    const lokalno = beri();
    await push(zbirka, lokalno);
    const oddaljeno = await pull(zbirka);
    if (!oddaljeno) return false;
    const poId = new Map(lokalno.map(z => [z.id, z]));
    oddaljeno.forEach(z => { const star = poId.get(z.id); if (!star || cas(z) >= cas(star)) poId.set(z.id, z); });
    const zlito = [...poId.values()];
    if (podpis(zlito) === podpis(lokalno)) return false;
    zapisi(zlito);
    return true;
  } catch (e) {
    console.error(`Sinhronizacija zbirke ${zbirka} ni uspela:`, e);
    return false;
  }
}

const beriVideno = (): Zapis[] => Object.entries(preberiVideno()).map(([id, updatedAt]) => ({ id, updatedAt }));
const zapisiVideno = (z: Zapis[]) => shraniVideno(Object.fromEntries(z.filter(v => !v.deletedAt).map(v => [v.id, v.updatedAt || ''])));

export const pushKlepet = () => push('klepet', preberiKlepetVsi() as Zapis[]);
export const pushMarketing = () => push('marketing', preberiMarketingKampanjeVse() as Zapis[]);
export const pushObjave = () => push('objave', preberiObjaveVse() as Zapis[]);
export const pushKomObvestila = () => push('kom-obvestila', beriVideno());
export const pushPostaDnevnik = () => push('posta', preberiVsoPostoSurovo() as Zapis[]);
export const pushPupaNastavitve = () => push('pupa-nastavitve', [preberiPupaStanjeZapis()]);

export const sinhronizirajKlepet = () => sinhroniziraj('klepet', preberiKlepetVsi as () => Zapis[], z => zapisiKlepetVsi(z as KlepetSporocilo[]));
export const sinhronizirajMarketing = () => sinhroniziraj('marketing', preberiMarketingKampanjeVse as () => Zapis[], z => zapisiMarketingKampanjeVse(z as MarketingKampanja[]));
export const sinhronizirajObjave = () => sinhroniziraj('objave', preberiObjaveVse as () => Zapis[], z => zapisiObjaveVse(z as MarketingObjava[]));
export const sinhronizirajKomObvestila = () => sinhroniziraj('kom-obvestila', beriVideno, zapisiVideno);
export const sinhronizirajPostaDnevnik = () => sinhroniziraj('posta', preberiVsoPostoSurovo as () => Zapis[], z => zapisiVsoPostoSurovo(z as PostaVnos[]));
export const sinhronizirajPupaNastavitve = () => sinhroniziraj('pupa-nastavitve', () => [preberiPupaStanjeZapis()], z => z[0] && zapisiPupaStanjeZapis(z[0] as PupaStanjeZapis));

/* PROJEKTI ↔ OBLAK
   Projekti (lib/projekti.ts) so do zdaj živeli samo v localStorage, zato jih ni
   bilo mogoče deliti s sodelavcem ne videti na drugi napravi. Ta modul jih
   sinhronizira s tabelo public.projects (migracija 20260819100000).

   Zakaj lasten modul in ne del pushFlowData: projekti niso del FlowData
   (druga shramba, drug tip), zato bi jih vrivanje v tisto pot le zapletlo.
   Vzorec je namenoma isti kot pri ostalih zbirkah — external_id = lokalni
   Projekt.id, upsert po organization_id+external_id, ob sporu zmaga novejši
   updatedAt, brisanje potuje kot nagrobnik (deleted_at).

   localStorage OSTAJA — je lokalna kopija, ki jo vmesnik bere sinhrono. Zato
   ProjectsWorkspace in ostale komponente ostanejo nespremenjene. */

import { createClient } from '@/utils/supabase/client';
import { getOrganizationContext } from './pinartFlowCloud';
import { jeDemoId, jeSamoPredogled } from './predogled';
import { preberiProjektiVsi, zapisiProjekteVsi, type Projekt } from './projekti';

/* Zapisi brez updatedAt (nastali pred to migracijo) se štejejo za stare, da
   jih oblak ne prepiše po nesreči; created je boljši približek kot nič. */
const cas = (p: Projekt): number => {
  const vir = p.updatedAt || p.created;
  const t = vir ? Date.parse(vir) : NaN;
  return Number.isNaN(t) ? 0 : t;
};

type Vrstica = {
  external_id: string;
  title: string | null;
  status: string | null;
  faza: string | null;
  data: unknown;
  client_id: string | null;
  updated_at: string | null;
  deleted_at: string | null;
};

/* Iz vrstice v bazi sestavi Projekt: jedrni stolpci so merodajni, vse ostalo
   (brief, cilji, povezave, dodatna vprašanja) pride iz data jsonb. */
const izVrstice = (v: Vrstica): Projekt | null => {
  const d = (v.data && typeof v.data === 'object' ? v.data : {}) as Partial<Projekt>;
  if (!v.external_id) return null;
  return {
    ...(d as Projekt),
    id: v.external_id,
    naslov: v.title || d.naslov || '',
    status: (v.status as Projekt['status']) || d.status || 'aktiven',
    faza: (v.faza as Projekt['faza']) || d.faza,
    updatedAt: v.updated_at || d.updatedAt,
    deletedAt: v.deleted_at || undefined,
  };
};

export async function pushProjekti(projekti?: Projekt[]): Promise<void> {
  if (jeSamoPredogled()) return;
  const context = await getOrganizationContext();
  if (!context) return;

  const vsi = (projekti || preberiProjektiVsi()).filter(p => p.id && !jeDemoId(p.id));
  if (!vsi.length) return;

  const supabase = createClient();
  const { data: obstojece, error: bralnaNapaka } = await supabase
    .from('projects').select('external_id,updated_at,deleted_at')
    .eq('organization_id', context.organizationId);
  if (bralnaNapaka) throw bralnaNapaka;

  const vOblaku = new Map((obstojece || []).map(v => [String(v.external_id), v]));

  /* Poveži projekt s stranko v bazi, da deljenje stranke zajame tudi njene
     projekte (sme_videti_zapis upošteva related_client). */
  const { data: strankeVrstice } = await supabase
    .from('clients').select('id,external_id').eq('organization_id', context.organizationId);
  const strankaPoId = new Map((strankeVrstice || []).map(v => [String(v.external_id), String(v.id)]));

  const zaPosiljanje = vsi.filter(p => {
    const cloud = vOblaku.get(p.id);
    if (!cloud) return true;
    /* nagrobnika ne obujaj, svojega pa pošlji */
    if (cloud.deleted_at && !p.deletedAt) return false;
    if (p.deletedAt && !cloud.deleted_at) return true;
    const cloudCas = cloud.updated_at ? Date.parse(cloud.updated_at) : 0;
    return cas(p) >= (Number.isNaN(cloudCas) ? 0 : cloudCas);
  });
  if (!zaPosiljanje.length) return;

  const vrstice = zaPosiljanje.map(p => ({
    organization_id: context.organizationId,
    external_id: p.id,
    title: p.naslov || '',
    client_id: p.strankaId ? strankaPoId.get(p.strankaId) || null : null,
    status: p.status || null,
    faza: p.faza || null,
    data: p,
    updated_at: p.updatedAt || p.created || new Date(0).toISOString(),
    deleted_at: p.deletedAt || null,
  }));

  const { error } = await supabase.from('projects').upsert(vrstice, { onConflict: 'organization_id,external_id' });
  if (error) throw error;
}

export async function pullProjekti(): Promise<Projekt[] | null> {
  if (jeSamoPredogled()) return null;
  const context = await getOrganizationContext();
  if (!context) return null;

  const supabase = createClient();
  const { data, error } = await supabase
    .from('projects')
    .select('external_id,title,status,faza,data,client_id,updated_at,deleted_at')
    .eq('organization_id', context.organizationId);
  if (error) throw error;

  return (data || []).map(v => izVrstice(v as Vrstica)).filter((p): p is Projekt => Boolean(p));
}

/* Zlij oblak z lokalnim in zapiši rezultat. Ob istem id zmaga novejši zapis;
   nagrobnik prevlada nad starejšo živo različico. */
export function zlijProjekte(oblak: Projekt[], lokalno: Projekt[]): Projekt[] {
  const poId = new Map<string, Projekt>();
  lokalno.forEach(p => poId.set(p.id, p));
  oblak.forEach(p => {
    const obstojec = poId.get(p.id);
    if (!obstojec || cas(p) >= cas(obstojec)) poId.set(p.id, p);
  });
  return Array.from(poId.values()).sort((a, b) => cas(b) - cas(a));
}

/* Celoten cikel ob prijavi/osvežitvi: pošlji svoje, poberi tuje, zlij, zapiši.
   Vrne true, če se je lokalna slika spremenila (klicatelj lahko osveži prikaz). */
export async function sinhronizirajProjekte(): Promise<boolean> {
  if (jeSamoPredogled()) return false;
  try {
    await pushProjekti();
    const oblak = await pullProjekti();
    if (!oblak) return false;
    const lokalno = preberiProjektiVsi();
    const zlito = zlijProjekte(oblak, lokalno);
    /* Primerjaj VSEBINO, ne vrstnega reda — zlivanje seznam uredi po času, zato
       bi primerjava celotnega JSON-a ob vsaki prijavi lažno javila spremembo
       in po nepotrebnem znova naložila stran. */
    const podpis = (s: Projekt[]) => s.map(p => `${p.id}:${p.updatedAt || p.created}:${p.deletedAt || ''}`).sort().join('|');
    const seJeSpremenilo = podpis(zlito) !== podpis(lokalno);
    if (seJeSpremenilo) zapisiProjekteVsi(zlito);
    return seJeSpremenilo;
  } catch (e) {
    console.error('Sinhronizacija projektov ni uspela:', e);
    return false;
  }
}

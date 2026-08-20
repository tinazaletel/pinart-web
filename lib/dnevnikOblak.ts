/* CRM DNEVNIK ↔ OBLAK
   Dnevnik stranke (lib/dnevnik.ts) — klici, sestanki, dogovori — je do zdaj
   živel samo v localStorage. Pri CRM-ju, kjer je stranka vozlišče, je to
   pomenilo, da zgodovine odnosa ni videla druga naprava ne sodelavec. Ta modul
   ga sinhronizira s tabelo public.crm_dnevnik (migracija 20260820022000).

   Vzorec je isti kot pri projektih (lib/projektiOblak.ts): external_id =
   lokalni DnevnikVnos.id, upsert po organization_id+external_id, ob sporu zmaga
   novejši updatedAt, brisanje potuje kot nagrobnik (deleted_at).

   client_id v bazi je PRAVI uuid vrstice v public.clients (ne lokalni id) — po
   njem RLS prek sme_videti_zapis samodejno odpre dnevnik vsakomur, s komer je
   deljena STRANKA. Preslikavo naredi dbIdZaZapis('clients', lokalniId).

   localStorage OSTAJA — je lokalna kopija, ki jo vmesnik bere sinhrono. Zato
   ClientWorkspace ostane nespremenjen. */

import { createClient } from '@/utils/supabase/client';
import { dbIdZaZapis, getOrganizationContext } from './pinartFlowCloud';
import { jeDemoId, jeSamoPredogled } from './predogled';
import { preberiDnevnikVsi, zapisiDnevnikVsi, type DnevnikVnos } from './dnevnik';

/* Zapisi brez updatedAt (nastali pred to migracijo) se štejejo za stare, da jih
   oblak ne prepiše po nesreči; created je boljši približek kot nič — pri
   dnevniku je to čas vnosa in ne prihodnji termin, zato je varen. */
const cas = (v: DnevnikVnos): number => {
  const vir = v.updatedAt || v.created;
  const t = vir ? Date.parse(vir) : NaN;
  return Number.isNaN(t) ? 0 : t;
};

type Vrstica = {
  external_id: string;
  data: unknown;
  updated_at: string | null;
  deleted_at: string | null;
};

/* Iz vrstice v bazi sestavi vnos. Vse vsebinsko je v data jsonb — tudi clientId
   ostane LOKALNI id stranke, zato preslikave nazaj iz client_id ne rabimo. */
const izVrstice = (v: Vrstica): DnevnikVnos | null => {
  const d = (v.data && typeof v.data === 'object' ? v.data : {}) as Partial<DnevnikVnos>;
  if (!v.external_id || !d.clientId) return null;
  return {
    ...(d as DnevnikVnos),
    id: v.external_id,
    updatedAt: v.updated_at || d.updatedAt,
    deletedAt: v.deleted_at || undefined,
  };
};

export async function pushDnevnik(vnosi?: DnevnikVnos[]): Promise<void> {
  if (jeSamoPredogled()) return;
  const context = await getOrganizationContext();
  if (!context) return;

  const vsi = (vnosi || preberiDnevnikVsi())
    .filter(v => v.id && v.clientId && !jeDemoId(v.id) && !jeDemoId(v.clientId));
  if (!vsi.length) return;

  const supabase = createClient();
  const { data: obstojece, error: bralnaNapaka } = await supabase
    .from('crm_dnevnik').select('external_id,updated_at,deleted_at')
    .eq('organization_id', context.organizationId);
  if (bralnaNapaka) throw bralnaNapaka;

  const vOblaku = new Map((obstojece || []).map(v => [String(v.external_id), v]));

  const zaPosiljanje = vsi.filter(v => {
    const cloud = vOblaku.get(v.id);
    if (!cloud) return true;
    /* nagrobnika ne obujaj, svojega pa pošlji */
    if (cloud.deleted_at && !v.deletedAt) return false;
    if (v.deletedAt && !cloud.deleted_at) return true;
    const cloudCas = cloud.updated_at ? Date.parse(cloud.updated_at) : 0;
    return cas(v) >= (Number.isNaN(cloudCas) ? 0 : cloudCas);
  });
  if (!zaPosiljanje.length) return;

  /* uuid stranke poiščemo enkrat na stranko, ne na vnos (dbIdZaZapis je eno
     poizvedovanje na klic) */
  const strankaPoId = new Map<string, string | null>();
  for (const lokalniId of Array.from(new Set(zaPosiljanje.map(v => v.clientId)))) {
    strankaPoId.set(lokalniId, await dbIdZaZapis('clients', lokalniId));
  }

  const vrstice = zaPosiljanje.map(v => ({
    organization_id: context.organizationId,
    external_id: v.id,
    client_id: strankaPoId.get(v.clientId) || null,
    stranka_external_id: v.clientId,
    projekt_external_id: v.projectId || null,
    vrsta: v.tip,
    besedilo: v.besedilo,
    zgodilo_se: v.created,
    data: v,
    updated_at: v.updatedAt || v.created || new Date(0).toISOString(),
    deleted_at: v.deletedAt || null,
  }));

  const { error } = await supabase.from('crm_dnevnik').upsert(vrstice, { onConflict: 'organization_id,external_id' });
  if (error) throw error;
}

export async function pullDnevnik(): Promise<DnevnikVnos[] | null> {
  if (jeSamoPredogled()) return null;
  const context = await getOrganizationContext();
  if (!context) return null;

  const supabase = createClient();
  const { data, error } = await supabase
    .from('crm_dnevnik')
    .select('external_id,data,updated_at,deleted_at')
    .eq('organization_id', context.organizationId);
  if (error) throw error;

  return (data || []).map(v => izVrstice(v as Vrstica)).filter((v): v is DnevnikVnos => Boolean(v));
}

/* Zlij oblak z lokalnim. Ob istem id zmaga novejši zapis; nagrobnik prevlada
   nad starejšo živo različico. */
export function zlijDnevnik(oblak: DnevnikVnos[], lokalno: DnevnikVnos[]): DnevnikVnos[] {
  const poId = new Map<string, DnevnikVnos>();
  lokalno.forEach(v => poId.set(v.id, v));
  oblak.forEach(v => {
    const obstojec = poId.get(v.id);
    if (!obstojec || cas(v) >= cas(obstojec)) poId.set(v.id, v);
  });
  return Array.from(poId.values());
}

/* Celoten cikel ob prijavi/osvežitvi: pošlji svoje, poberi tuje, zlij, zapiši.
   Vrne true, če se je lokalna slika spremenila (klicatelj lahko osveži prikaz). */
export async function sinhronizirajDnevnik(): Promise<boolean> {
  if (jeSamoPredogled()) return false;
  try {
    await pushDnevnik();
    const oblak = await pullDnevnik();
    if (!oblak) return false;
    const lokalno = preberiDnevnikVsi();
    const zlito = zlijDnevnik(oblak, lokalno);
    /* Primerjaj VSEBINO, ne vrstnega reda — shramba je razdeljena po strankah,
       zato bi primerjava celotnega JSON-a lažno javila spremembo. */
    const podpis = (s: DnevnikVnos[]) => s.map(x => `${x.id}:${x.updatedAt || x.created}:${x.deletedAt || ''}`).sort().join('|');
    const seJeSpremenilo = podpis(zlito) !== podpis(lokalno);
    if (seJeSpremenilo) zapisiDnevnikVsi(zlito);
    return seJeSpremenilo;
  } catch (e) {
    console.error('Sinhronizacija dnevnika ni uspela:', e);
    return false;
  }
}

/* SESTANKI ↔ OBLAK
   Sestanki in klici iz Koledarja (lib/sestanki.ts) so do zdaj živeli samo v
   localStorage, zato dogovorjenega termina ni videla druga naprava ne sodelavec.
   Ta modul jih sinhronizira s tabelo public.sestanki (migracija 20260820022000).

   Vzorec je namenoma isti kot pri projektih (lib/projektiOblak.ts) —
   external_id = lokalni Sestanek.id, upsert po organization_id+external_id, ob
   sporu zmaga novejši updatedAt, brisanje potuje kot nagrobnik (deleted_at).

   localStorage OSTAJA — je lokalna kopija, ki jo vmesnik bere sinhrono. Zato
   KoledarWorkspace ostane nespremenjen. */

import { createClient } from '@/utils/supabase/client';
import { getOrganizationContext } from './pinartFlowCloud';
import { jeDemoId, jeSamoPredogled } from './predogled';
import { preberiSestankiVsi, zapisiSestankeVsi, type Sestanek } from './sestanki';

/* Zapisi brez updatedAt (nastali pred to migracijo) se štejejo za stare, da jih
   oblak ne prepiše po nesreči. Za razliko od projektov sestanek nima polja
   `created`, datum+ura pa sta čas DOGODKA (lahko v prihodnosti) in ne čas
   zapisa — zato bi bila slab približek. Takrat velja 0. */
const cas = (s: Sestanek): number => {
  const t = s.updatedAt ? Date.parse(s.updatedAt) : NaN;
  return Number.isNaN(t) ? 0 : t;
};

/* datum (YYYY-MM-DD) + ura (HH:MM) -> ISO trenutek za stolpec `zacetek`.
   Bere se kot LOKALNI čas uporabnice (tako je bil tudi vnesen v obrazcu). */
const zacetekIso = (s: Sestanek): string | null => {
  if (!s.datum) return null;
  const d = new Date(`${s.datum}T${s.ura || '00:00'}:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

type Vrstica = {
  external_id: string;
  naslov: string | null;
  zacetek: string | null;
  data: unknown;
  updated_at: string | null;
  deleted_at: string | null;
};

/* Iz vrstice v bazi sestavi Sestanek: naslov je merodajen iz stolpca, datum/ura
   in vse ostalo (tip, lokacija, opomba, stranka) pa iz data jsonb — tam sta
   datum in ura shranjena točno tako, kot ju kaže vmesnik, brez preračunavanja
   časovnih pasov nazaj iz `zacetek`. */
const izVrstice = (v: Vrstica): Sestanek | null => {
  const d = (v.data && typeof v.data === 'object' ? v.data : {}) as Partial<Sestanek>;
  if (!v.external_id) return null;
  return {
    ...(d as Sestanek),
    id: v.external_id,
    naslov: v.naslov || d.naslov || '',
    tip: d.tip === 'klic' ? 'klic' : 'sestanek',
    datum: d.datum || '',
    ura: d.ura || '',
    updatedAt: v.updated_at || d.updatedAt,
    deletedAt: v.deleted_at || undefined,
  };
};

export async function pushSestanki(sestanki?: Sestanek[]): Promise<void> {
  if (jeSamoPredogled()) return;
  const context = await getOrganizationContext();
  if (!context) return;

  const vsi = (sestanki || preberiSestankiVsi()).filter(s => s.id && !jeDemoId(s.id));
  if (!vsi.length) return;

  const supabase = createClient();
  const { data: obstojece, error: bralnaNapaka } = await supabase
    .from('sestanki').select('external_id,updated_at,deleted_at')
    .eq('organization_id', context.organizationId);
  if (bralnaNapaka) throw bralnaNapaka;

  const vOblaku = new Map((obstojece || []).map(v => [String(v.external_id), v]));

  const zaPosiljanje = vsi.filter(s => {
    const cloud = vOblaku.get(s.id);
    if (!cloud) return true;
    /* nagrobnika ne obujaj, svojega pa pošlji */
    if (cloud.deleted_at && !s.deletedAt) return false;
    if (s.deletedAt && !cloud.deleted_at) return true;
    const cloudCas = cloud.updated_at ? Date.parse(cloud.updated_at) : 0;
    return cas(s) >= (Number.isNaN(cloudCas) ? 0 : cloudCas);
  });
  if (!zaPosiljanje.length) return;

  const vrstice = zaPosiljanje.map(s => ({
    organization_id: context.organizationId,
    external_id: s.id,
    naslov: s.naslov || '',
    zacetek: zacetekIso(s),
    data: s,
    updated_at: s.updatedAt || new Date(0).toISOString(),
    deleted_at: s.deletedAt || null,
  }));

  const { error } = await supabase.from('sestanki').upsert(vrstice, { onConflict: 'organization_id,external_id' });
  if (error) throw error;
}

export async function pullSestanki(): Promise<Sestanek[] | null> {
  if (jeSamoPredogled()) return null;
  const context = await getOrganizationContext();
  if (!context) return null;

  const supabase = createClient();
  const { data, error } = await supabase
    .from('sestanki')
    .select('external_id,naslov,zacetek,data,updated_at,deleted_at')
    .eq('organization_id', context.organizationId);
  if (error) throw error;

  return (data || []).map(v => izVrstice(v as Vrstica)).filter((s): s is Sestanek => Boolean(s));
}

/* Zlij oblak z lokalnim. Ob istem id zmaga novejši zapis; nagrobnik prevlada
   nad starejšo živo različico. */
export function zlijSestanke(oblak: Sestanek[], lokalno: Sestanek[]): Sestanek[] {
  const poId = new Map<string, Sestanek>();
  lokalno.forEach(s => poId.set(s.id, s));
  oblak.forEach(s => {
    const obstojec = poId.get(s.id);
    if (!obstojec || cas(s) >= cas(obstojec)) poId.set(s.id, s);
  });
  return Array.from(poId.values()).sort((a, b) => (a.datum + a.ura).localeCompare(b.datum + b.ura));
}

/* Celoten cikel ob prijavi/osvežitvi: pošlji svoje, poberi tuje, zlij, zapiši.
   Vrne true, če se je lokalna slika spremenila (klicatelj lahko osveži prikaz). */
export async function sinhronizirajSestanke(): Promise<boolean> {
  if (jeSamoPredogled()) return false;
  try {
    await pushSestanki();
    const oblak = await pullSestanki();
    if (!oblak) return false;
    const lokalno = preberiSestankiVsi();
    const zlito = zlijSestanke(oblak, lokalno);
    /* Primerjaj VSEBINO, ne vrstnega reda — zlivanje seznam uredi po terminu,
       zato bi primerjava celotnega JSON-a ob vsaki prijavi lažno javila
       spremembo in po nepotrebnem znova naložila stran. */
    const podpis = (s: Sestanek[]) => s.map(x => `${x.id}:${x.updatedAt || ''}:${x.deletedAt || ''}`).sort().join('|');
    const seJeSpremenilo = podpis(zlito) !== podpis(lokalno);
    if (seJeSpremenilo) zapisiSestankeVsi(zlito);
    return seJeSpremenilo;
  } catch (e) {
    console.error('Sinhronizacija sestankov ni uspela:', e);
    return false;
  }
}

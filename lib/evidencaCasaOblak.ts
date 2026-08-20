/* EVIDENCA DELOVNEGA ČASA ↔ OBLAK
   Evidenca po ZEPDSV (lib/evidencaCasa.ts) živi v localStorage, kar za zakonsko
   evidenco ne zadostuje — ob menjavi naprave ali brisanju brskalnika bi izginila,
   zakon pa jo šteje za listino trajne vrednosti. Ta modul jo sinhronizira s
   tabelo public.delovni_dnevi (migracija 20260820230000_evidenca_casa).

   Vzorec je IDENTIČEN kot pri projektih (lib/projektiOblak.ts): upsert po
   organization_id + external_id, ob sporu zmaga novejši updatedAt, brisanje
   potuje kot nagrobnik (deleted_at), primerjava podpisa prepreči, da bi se
   seznam osvežil, kadar se v resnici ni nič spremenilo.

   Edina razlika: external_id ni prost id zapisa, ampak "<user_id>:<datum>".
   En koledarski dan ene osebe je ena vrstica — s tem se isti dan, vpisan na
   dveh napravah, ne podvoji, dnevi dveh oseb pa se ne zaletita v unikatni
   indeks. Zato tudi pull filtrira po user_id: v localStorage pride SAMO svoja
   evidenca, čeprav admin v bazi vidi celo organizacijo.

   localStorage OSTAJA — je lokalna kopija, ki jo vmesnik bere sinhrono. */

import { createClient } from '@/utils/supabase/client';
import { getOrganizationContext } from './pinartFlowCloud';
import { jeSamoPredogled } from './predogled';
import { cas, preberiEvidencoVse, zapisiEvidencoVse, type DelovniDan, type VrstaDneva } from './evidencaCasa';

const VELJAVNE: VrstaDneva[] = ['delo', 'dopust', 'bolniska', 'praznik', 'prosto'];

type Vrstica = {
  external_id: string;
  datum: string;
  prihod: string | null;
  odhod: string | null;
  odmor_minute: number | null;
  vrsta: string | null;
  opomba: string | null;
  updated_at: string | null;
  deleted_at: string | null;
};

const zunanjiId = (userId: string, datum: string) => `${userId}:${datum}`;

/* Baza hrani time kot "08:30:00", vmesnik pa dela s "08:30". */
const kratkaUra = (v: string | null): string | undefined => (v ? v.slice(0, 5) : undefined);
const dolgaUra = (v?: string): string | null => (v && /^\d{2}:\d{2}$/.test(v) ? `${v}:00` : null);

const izVrstice = (v: Vrstica): DelovniDan | null => {
  const datum = String(v.datum || '').slice(0, 10);
  if (!datum) return null;
  const vrsta = VELJAVNE.includes(v.vrsta as VrstaDneva) ? (v.vrsta as VrstaDneva) : 'delo';
  return {
    datum,
    prihod: kratkaUra(v.prihod),
    odhod: kratkaUra(v.odhod),
    odmorMinute: Number(v.odmor_minute) || 0,
    vrsta,
    opomba: v.opomba || undefined,
    updatedAt: v.updated_at || undefined,
    deletedAt: v.deleted_at || undefined,
  };
};

export async function pushEvidencaCasa(dnevi?: DelovniDan[]): Promise<void> {
  if (jeSamoPredogled()) return;
  const context = await getOrganizationContext();
  if (!context) return;

  const vsi = (dnevi || preberiEvidencoVse()).filter(d => d.datum);
  if (!vsi.length) return;

  const supabase = createClient();
  const { data: obstojece, error: bralnaNapaka } = await supabase
    .from('delovni_dnevi').select('external_id,updated_at,deleted_at')
    .eq('organization_id', context.organizationId)
    .eq('user_id', context.userId);
  if (bralnaNapaka) throw bralnaNapaka;

  const vOblaku = new Map((obstojece || []).map(v => [String(v.external_id), v]));

  const zaPosiljanje = vsi.filter(d => {
    const cloud = vOblaku.get(zunanjiId(context.userId, d.datum));
    if (!cloud) return true;
    /* nagrobnika ne obujaj, svojega pa pošlji */
    if (cloud.deleted_at && !d.deletedAt) return false;
    if (d.deletedAt && !cloud.deleted_at) return true;
    const cloudCas = cloud.updated_at ? Date.parse(cloud.updated_at) : 0;
    return cas(d) >= (Number.isNaN(cloudCas) ? 0 : cloudCas);
  });
  if (!zaPosiljanje.length) return;

  const vrstice = zaPosiljanje.map(d => ({
    organization_id: context.organizationId,
    external_id: zunanjiId(context.userId, d.datum),
    user_id: context.userId,
    datum: d.datum,
    prihod: dolgaUra(d.prihod),
    odhod: dolgaUra(d.odhod),
    odmor_minute: Math.max(0, Number(d.odmorMinute) || 0),
    vrsta: d.vrsta || 'delo',
    opomba: d.opomba || null,
    updated_at: d.updatedAt || new Date(0).toISOString(),
    deleted_at: d.deletedAt || null,
  }));

  const { error } = await supabase.from('delovni_dnevi').upsert(vrstice, { onConflict: 'organization_id,external_id' });
  if (error) throw error;
}

export async function pullEvidencaCasa(): Promise<DelovniDan[] | null> {
  if (jeSamoPredogled()) return null;
  const context = await getOrganizationContext();
  if (!context) return null;

  const supabase = createClient();
  const { data, error } = await supabase
    .from('delovni_dnevi')
    .select('external_id,datum,prihod,odhod,odmor_minute,vrsta,opomba,updated_at,deleted_at')
    .eq('organization_id', context.organizationId)
    .eq('user_id', context.userId);
  if (error) throw error;

  return (data || []).map(v => izVrstice(v as Vrstica)).filter((d): d is DelovniDan => Boolean(d));
}

/* Zlij oblak z lokalnim. Ključ je DATUM (en dan = ena vrstica); ob istem datumu
   zmaga novejši zapis, nagrobnik prevlada nad starejšo živo različico. */
export function zlijEvidencoCasa(oblak: DelovniDan[], lokalno: DelovniDan[]): DelovniDan[] {
  const poDatumu = new Map<string, DelovniDan>();
  lokalno.forEach(d => poDatumu.set(d.datum, d));
  oblak.forEach(d => {
    const obstojec = poDatumu.get(d.datum);
    if (!obstojec || cas(d) >= cas(obstojec)) poDatumu.set(d.datum, d);
  });
  return Array.from(poDatumu.values()).sort((a, b) => a.datum.localeCompare(b.datum));
}

/* Celoten cikel ob prijavi/osvežitvi: pošlji svoje, poberi tuje, zlij, zapiši.
   Vrne true, če se je lokalna slika spremenila (klicatelj lahko osveži prikaz). */
export async function sinhronizirajEvidencoCasa(): Promise<boolean> {
  if (jeSamoPredogled()) return false;
  try {
    await pushEvidencaCasa();
    const oblak = await pullEvidencaCasa();
    if (!oblak) return false;
    const lokalno = preberiEvidencoVse();
    const zlito = zlijEvidencoCasa(oblak, lokalno);
    /* Primerjaj VSEBINO, ne vrstnega reda — zlivanje seznam uredi po datumu,
       zato bi primerjava celotnega JSON-a ob vsaki prijavi lažno javila
       spremembo in po nepotrebnem znova naložila stran. */
    const podpis = (s: DelovniDan[]) => s.map(d => `${d.datum}:${d.updatedAt || ''}:${d.deletedAt || ''}`).sort().join('|');
    const seJeSpremenilo = podpis(zlito) !== podpis(lokalno);
    if (seJeSpremenilo) zapisiEvidencoVse(zlito);
    return seJeSpremenilo;
  } catch (e) {
    console.error('Sinhronizacija evidence časa ni uspela:', e);
    return false;
  }
}

'use client';

/* VPRAŠALNIKI V OBLAKU — branje in urejanje za prijavljeno uporabnico.
 *
 * Teče neposredno prek Supabase pod RLS (član podjetja vidi svoje vprašalnike
 * in odgovore). Strežniška pot obstaja samo za izdajo žetona, ker ta ne sme v
 * brskalnik nezgoščen — glej app/api/vprasalnik.
 */

import { createClient } from '@/utils/supabase/client';
import { getOrganizationContext } from '@/lib/pinartFlowCloud';
import type { Odgovor, Vprasalnik, Vprasanje } from '@/lib/vprasalnik';

type Vrstica = Record<string, unknown>;

const izVrstice = (v: Vrstica): Vprasalnik => ({
  id: String(v.id),
  naslov: String(v.naslov || ''),
  uvod: v.uvod ? String(v.uvod) : undefined,
  vprasanja: Array.isArray(v.vprasanja) ? (v.vprasanja as Vprasanje[]) : [],
  odprt: v.odprt !== false,
  ustvarjen: v.created_at ? String(v.created_at) : undefined,
});

/** Vprašalniki podjetja, novejši najprej, s številom odgovorov. */
export async function vprasalniki(): Promise<Vprasalnik[]> {
  const ctx = await getOrganizationContext();
  if (!ctx) return [];
  const supa = createClient();
  const [{ data: sez }, { data: odg }] = await Promise.all([
    supa.from('vprasalniki').select('*').eq('organization_id', ctx.organizationId)
      .order('created_at', { ascending: false }).limit(50),
    supa.from('vprasalnik_odgovori').select('vprasalnik_id')
      .eq('organization_id', ctx.organizationId).limit(2000),
  ]);
  const steviloPo = new Map<string, number>();
  for (const o of odg || []) {
    const k = String((o as Vrstica).vprasalnik_id);
    steviloPo.set(k, (steviloPo.get(k) || 0) + 1);
  }
  return (sez || []).map(v => {
    const osnova = izVrstice(v as Vrstica);
    return { ...osnova, odgovorov: steviloPo.get(osnova.id) || 0 };
  });
}

/** Ustvari nov vprašalnik. Vrne ID in žeton — žeton se pokaže ENKRAT. */
export async function ustvariVprasalnik(vhod: {
  naslov?: string; uvod?: string; vprasanja?: Vprasanje[]; jeEn?: boolean;
}): Promise<{ id: string; zeton: string } | null> {
  /* Aktivno podjetje pove odjemalec — strežnik ga preveri. Brez tega bi
     vprašalnik nastal v prvem podjetju po vrsti, seznam pa bere izbrano. */
  const ctx = await getOrganizationContext();
  const odgovor = await fetch('/api/vprasalnik', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...vhod, organizationId: ctx?.organizationId }),
  });
  if (!odgovor.ok) return null;
  return odgovor.json();
}

/** Nova povezava; stara neha delati. */
export async function novZeton(id: string): Promise<string | null> {
  const odgovor = await fetch('/api/vprasalnik', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }),
  });
  if (!odgovor.ok) return null;
  const j = await odgovor.json().catch(() => null);
  return j?.zeton || null;
}

export async function shraniVprasalnik(v: Vprasalnik): Promise<boolean> {
  const supa = createClient();
  const { error } = await supa.from('vprasalniki').update({
    naslov: v.naslov, uvod: v.uvod ?? null, vprasanja: v.vprasanja, odprt: v.odprt,
    updated_at: new Date().toISOString(),
  }).eq('id', v.id);
  return !error;
}

export async function izbrisiVprasalnik(id: string): Promise<boolean> {
  const supa = createClient();
  const { error } = await supa.from('vprasalniki').delete().eq('id', id);
  return !error;
}

/** Odgovori enega vprašalnika (ali vsi, če id ni podan). */
export async function odgovori(vprasalnikId?: string): Promise<Odgovor[]> {
  const ctx = await getOrganizationContext();
  if (!ctx) return [];
  const supa = createClient();
  let poizvedba = supa.from('vprasalnik_odgovori').select('*')
    .eq('organization_id', ctx.organizationId)
    .order('created_at', { ascending: false }).limit(500);
  if (vprasalnikId) poizvedba = poizvedba.eq('vprasalnik_id', vprasalnikId);
  const { data } = await poizvedba;
  return (data || []).map(v => {
    const o = v as Vrstica;
    return {
      id: String(o.id),
      odgovori: (o.odgovori || {}) as Record<string, string | string[]>,
      ime: o.ime ? String(o.ime) : undefined,
      eposta: o.eposta ? String(o.eposta) : undefined,
      podjetje: o.podjetje ? String(o.podjetje) : undefined,
      pregledano: o.pregledano === true,
      ustvarjen: String(o.created_at || ''),
    };
  });
}

export async function oznaciPregledano(id: string, pregledano = true): Promise<boolean> {
  const supa = createClient();
  const { error } = await supa.from('vprasalnik_odgovori').update({ pregledano }).eq('id', id);
  return !error;
}

export async function izbrisiOdgovor(id: string): Promise<boolean> {
  const supa = createClient();
  const { error } = await supa.from('vprasalnik_odgovori').delete().eq('id', id);
  return !error;
}

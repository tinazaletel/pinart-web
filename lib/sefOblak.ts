/* SEF AVTORSTVA ↔ OBLAK
   Zapisi sefa (components/SefAvtorstvaWorkspace.tsx) zivijo v localStorage pod
   kljucem `pinart-sef-avtorstva`. Za OVERJEN CASOVNI ZIG pa mora zapis obstajati
   tudi v bazi: zig pridobi STREZNIK (app/api/sef/zig), ker se le tako zeton in
   njegov cas zapiseta tja, kjer ju uporabnik ne more naknadno popraviti — v tem
   je celotna vrednost dokaza.

   Kaj gre v oblak: zgostitev, naslov, ime datoteke, orodje, kategorija, opombe.
   Datoteka NIKOLI. In kar gre od streznika navzven na TSA, je samo zgostitev.

   localStorage OSTAJA glavna, sinhrono brana kopija — vmesnik se ne spremeni.
   Tabela: public.sef_zapisi (migracija 20260821000000_sef_casovni_zig.sql). */

import { createClient } from '@/utils/supabase/client';
import { getOrganizationContext } from './pinartFlowCloud';
import { jeSamoPredogled } from './predogled';

export type SefZigStanje = 'caka' | 'overjeno' | 'napaka';

export type SefZapisOblak = {
  id: string;
  naslov: string;
  datoteka: string;
  hash: string;
  orodje?: string;
  kategorija?: string;
  opombe?: string;
  velikost?: number;
  tip?: string;
  posnetekIme?: string;
  posnetekHash?: string;
  ustvarjeno: string;
};

export type SefZigStanjeZapis = {
  stanje: SefZigStanje;
  cas?: string;
  streznik?: string;
};

/* Zapise sefa v oblak pospravimo tiho: ce uporabnica ni prijavljena ali je v
   predogledu, sef deluje naprej lokalno — le ziga ni. */
export async function shraniVOblak(zapis: SefZapisOblak): Promise<boolean> {
  if (jeSamoPredogled()) return false;
  try {
    const context = await getOrganizationContext();
    if (!context) return false;
    const { error } = await createClient().from('sef_zapisi').upsert({
      organization_id: context.organizationId,
      external_id: zapis.id,
      naslov: zapis.naslov,
      datoteka: zapis.datoteka,
      zgostitev: zapis.hash,
      orodje: zapis.orodje || null,
      kategorija: zapis.kategorija || null,
      zabelezeno: zapis.ustvarjeno,
      data: {
        opombe: zapis.opombe || null,
        velikost: zapis.velikost ?? null,
        tip: zapis.tip || null,
        posnetekIme: zapis.posnetekIme || null,
        posnetekHash: zapis.posnetekHash || null,
      },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'organization_id,external_id' });
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('Zapisa sefa ni bilo mogoce shraniti v oblak:', e);
    return false;
  }
}

/* Stanja zigov za vse zapise organizacije — vmesnik jih ob nalaganju zlije s
   svojimi lokalnimi zapisi (ne prepise jih, doda le zig). */
export async function preberiZige(): Promise<Record<string, SefZigStanjeZapis>> {
  if (jeSamoPredogled()) return {};
  try {
    const context = await getOrganizationContext();
    if (!context) return {};
    const { data, error } = await createClient().from('sef_zapisi')
      .select('external_id,zig_stanje,zig_cas,zig_streznik')
      .eq('organization_id', context.organizationId)
      .is('deleted_at', null);
    if (error) throw error;
    const izid: Record<string, SefZigStanjeZapis> = {};
    (data || []).forEach(v => {
      izid[String(v.external_id)] = {
        stanje: (v.zig_stanje as SefZigStanje) || 'caka',
        cas: v.zig_cas || undefined,
        streznik: v.zig_streznik || undefined,
      };
    });
    return izid;
  } catch (e) {
    console.error('Stanj casovnih zigov ni bilo mogoce prebrati:', e);
    return {};
  }
}

export type ZigOdgovor = { stanje: SefZigStanje; cas?: string; streznik?: string; napaka?: string };

/* Pridobi overjen casovni zig za ze shranjen zapis. Streznik poslje na TSA
   SAMO zgostitev — glej app/api/sef/zig/route.ts. */
export async function zigosaj(zapisId: string): Promise<ZigOdgovor> {
  try {
    const odgovor = await fetch('/api/sef/zig', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zapisId }),
    });
    const telo = await odgovor.json().catch(() => ({}));
    if (!odgovor.ok) {
      return { stanje: 'napaka', napaka: typeof telo?.napaka === 'string' ? telo.napaka : 'Casovnega ziga ni bilo mogoce pridobiti.' };
    }
    return { stanje: 'overjeno', cas: telo?.cas || undefined, streznik: telo?.streznik || undefined };
  } catch {
    return { stanje: 'napaka', napaka: 'Streznika za casovni zig ni bilo mogoce doseci.' };
  }
}

/* Shrani v oblak IN takoj zigosaj — to je pot, ki jo uporablja gumb »Zasciti«. */
export async function shraniInZigosaj(zapis: SefZapisOblak): Promise<ZigOdgovor> {
  const shranjeno = await shraniVOblak(zapis);
  if (!shranjeno) return { stanje: 'caka' };
  return zigosaj(zapis.id);
}

/* PREVERJANJE shranjenega ziga (cas iz zetona + ujemanje zgostitve) in zeton,
   s katerim isto preveri tudi tretja oseba (openssl). */
export async function preveriZig(zapisId: string): Promise<{ ujema: boolean; cas?: string; napaka?: string; streznik?: string; zeton?: string }> {
  try {
    const odgovor = await fetch(`/api/sef/zig?zapisId=${encodeURIComponent(zapisId)}`, { cache: 'no-store' });
    const telo = await odgovor.json().catch(() => ({}));
    if (!odgovor.ok) return { ujema: false, napaka: typeof telo?.napaka === 'string' ? telo.napaka : 'Preverjanje ni uspelo.' };
    return { ujema: telo?.ujema === true, cas: telo?.cas || undefined, napaka: telo?.napaka, streznik: telo?.streznik, zeton: telo?.zeton };
  } catch {
    return { ujema: false, napaka: 'Preverjanje ni uspelo.' };
  }
}

/* Zeton kot binarna .tsr datoteka — natanko to, kar prebere `openssl ts`. */
export function zetonVBlob(zetonBase64: string): Blob {
  const surovo = atob(zetonBase64);
  const bajti = new Uint8Array(surovo.length);
  for (let i = 0; i < surovo.length; i++) bajti[i] = surovo.charCodeAt(i);
  return new Blob([bajti], { type: 'application/timestamp-reply' });
}

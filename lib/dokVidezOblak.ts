/* VIDEZ DOKUMENTOV ↔ OBLAK
   Videz dokumentov (lib/dokVidez.ts: predloge — barva, pisava, logo, glava/noga,
   podlogi, nalozena lastna pisava) je do zdaj zivel samo v localStorage, zato je
   bil vezan na eno napravo: ponudba, poslana z drugega racunalnika, je izgledala
   drugace. Ta modul ga sinhronizira s tabelo public.dok_videz
   (migracija 20260820020000_dok_videz_oblak.sql).

   POSEBNOST proti projektiOblak: to ni zbirka zapisov, ampak ENA nastavitev
   ORGANIZACIJE (znamka podjetja). Zato ena vrstica na organizacijo, brez
   external_id in brez nagrobnikov, in zlivanje po zapisih ne pride v postev —
   zmaga NOVEJSA cela slika. Pisati sme samo admin/lastnik (RLS); sodelavcu
   zapis pade po pravici, kar tu tiho pozresemo (bere pa jo normalno).

   localStorage OSTAJA lokalna kopija, ki jo vmesnik bere sinhrono — komponente
   (VidezDokumentov, doc builderji) ostanejo nespremenjene. */

import { createClient } from '@/utils/supabase/client';
import { getOrganizationContext } from './pinartFlowCloud';
import { jeSamoPredogled } from './predogled';
import { preberiDokVidez, zapisiDokVidez, type DokPredloga, type DokVidezSlika } from './dokVidez';

/* Slika brez updatedAt (racun od prej) se steje za najstarejso, da je oblak
   po nesreci ne prepise v napacno smer. */
const cas = (s: { updatedAt?: string } | null | undefined): number => {
  const t = s?.updatedAt ? Date.parse(s.updatedAt) : NaN;
  return Number.isNaN(t) ? 0 : t;
};

/* Primerjava VSEBINE (brez casa), da sinhronizacija ne javi spremembe, ko je
   slika enaka in se razlikuje samo zig. */
const podpis = (s: DokVidezSlika): string =>
  JSON.stringify({ aktivnaId: s.aktivnaId, predloge: s.predloge });

type Vrstica = { data: unknown; updated_at: string | null };

/* Iz vrstice v bazi sestavi sliko; ce je data prazna ali brez predlog, vrne null
   (prazna vrstica ne sme povoziti lokalnega videza). */
const izVrstice = (v: Vrstica): DokVidezSlika | null => {
  const d = (v.data && typeof v.data === 'object' ? v.data : {}) as Partial<DokVidezSlika>;
  const predloge = Array.isArray(d.predloge) ? (d.predloge as DokPredloga[]).filter(p => p && p.id) : [];
  if (!predloge.length) return null;
  const aktivnaId = typeof d.aktivnaId === 'string' && predloge.some(p => p.id === d.aktivnaId)
    ? d.aktivnaId
    : predloge[0].id;
  return { predloge, aktivnaId, updatedAt: v.updated_at || d.updatedAt };
};

/* Zapis videza je po RLS dovoljen samo adminu/lastniku. Sodelavcu ne javljamo
   napake — njegov brskalnik le nima kaj poslati. */
const jePravicaZavrnjena = (e: unknown): boolean => {
  const koda = (e as { code?: string } | null)?.code;
  return koda === '42501' || koda === 'PGRST301';
};

export async function pushDokVidez(slika?: DokVidezSlika): Promise<void> {
  if (jeSamoPredogled()) return;
  const context = await getOrganizationContext();
  if (!context) return;

  const lokalno = slika || preberiDokVidez();
  if (!lokalno.predloge.length) return;

  const supabase = createClient();
  const { data: obstojeca, error: bralnaNapaka } = await supabase
    .from('dok_videz').select('data,updated_at')
    .eq('organization_id', context.organizationId)
    .maybeSingle();
  if (bralnaNapaka) throw bralnaNapaka;

  if (obstojeca) {
    const vOblaku = izVrstice(obstojeca as Vrstica);
    /* Oblak je novejsi -> ne povozi ga; pull bo poskrbel za lokalno stran. */
    if (cas(vOblaku) > cas(lokalno)) return;
    /* Enaka vsebina -> ni kaj posiljati. */
    if (vOblaku && podpis(vOblaku) === podpis(lokalno)) return;
  }

  const { error } = await supabase.from('dok_videz').upsert({
    organization_id: context.organizationId,
    data: { predloge: lokalno.predloge, aktivnaId: lokalno.aktivnaId },
    /* Brez lokalnega ziga posljemo epoho: vsak kasnejsi zavesten zapis (od
       koderkoli) je s tem samodejno novejsi in prevlada. */
    updated_at: lokalno.updatedAt || new Date(0).toISOString(),
  }, { onConflict: 'organization_id' });
  if (error) {
    if (jePravicaZavrnjena(error)) return;   /* sodelavec: videza ne sme spreminjati */
    throw error;
  }
}

export async function pullDokVidez(): Promise<DokVidezSlika | null> {
  if (jeSamoPredogled()) return null;
  const context = await getOrganizationContext();
  if (!context) return null;

  const supabase = createClient();
  const { data, error } = await supabase
    .from('dok_videz').select('data,updated_at')
    .eq('organization_id', context.organizationId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  return izVrstice(data as Vrstica);
}

/* Celoten cikel ob prijavi/osvezitvi: posiji svoje, poberi tuje, po potrebi
   zapisi. Vrne true, ce se je lokalna slika spremenila (klicatelj lahko
   osvezi prikaz). */
export async function sinhronizirajDokVidez(): Promise<boolean> {
  if (jeSamoPredogled()) return false;
  try {
    await pushDokVidez();
    const oblak = await pullDokVidez();
    if (!oblak) return false;

    const lokalno = preberiDokVidez();
    /* Lokalno je novejse -> push ga je ze poslal, lokalne slike ne diramo. */
    if (cas(oblak) < cas(lokalno)) return false;
    if (podpis(oblak) === podpis(lokalno)) return false;

    zapisiDokVidez(oblak);
    return true;
  } catch (e) {
    console.error('Sinhronizacija videza dokumentov ni uspela:', e);
    return false;
  }
}

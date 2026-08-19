/* KATALOGI ORGANIZACIJE ↔ OBLAK
   ------------------------------------------------------------------------
   Pet manjsih shramb (sodelavci, oddelki, podrocja, postavke, produkti) je do
   zdaj zivelo samo v localStorage, zato sodelavec na drugi napravi ni videl ne
   ekipe ne cenika. Ta modul jih sinhronizira s tabelo public.org_katalogi
   (migracija 20260820023000).

   ZAKAJ DRUGACE KOT PROJEKTI: to niso zapisi z lastnim id in nagrobniki, ampak
   NASTAVITVE cele organizacije. Zato se sinhronizira CEL SEZNAM naenkrat in ob
   sporu zmaga novejsa stran (cas zadnje spremembe, lib/katalogCas.ts). Zlivanja
   po posameznem elementu namenoma NI: brez nagrobnikov se izbrisan oddelek ne
   bi dal lociti od oddelka, ki ga druga naprava se ni videla, in bi se ob vsaki
   sinhronizaciji vrnil nazaj.

   localStorage OSTAJA — je lokalna kopija, ki jo vmesnik bere sinhrono. Zato
   Nastavitve, Task Manager, Plan in cenik ostanejo nespremenjeni. */

import { createClient } from '@/utils/supabase/client';
import { getOrganizationContext } from './pinartFlowCloud';
import { jeSamoPredogled } from './predogled';
import { nastaviCasKataloga, preberiCasKataloga, type KatalogKljuc } from './katalogCas';

import { preberiSodelavci, shraniSodelavci } from './sodelavci';
import { preberiOddelki, shraniOddelki } from './oddelki';
import { preberiPodrocja, shraniPodrocja } from './podrocja';
import { preberiPostavke, shraniPostavke } from './postavke';
import { preberiProdukte, shraniProdukte } from './produkti';

const TABELA = 'org_katalogi';

type Vrstica = { data: unknown; updated_at: string | null };

async function preberiVrstico(kljuc: KatalogKljuc, organizationId: string): Promise<Vrstica | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from(TABELA).select('data,updated_at')
    .eq('organization_id', organizationId).eq('kljuc', kljuc)
    .maybeSingle();
  if (error) throw error;
  return (data as Vrstica | null) || null;
}

async function zapisiVrstico(kljuc: KatalogKljuc, organizationId: string, seznam: unknown[], iso: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from(TABELA).upsert(
    { organization_id: organizationId, kljuc, data: seznam, updated_at: iso },
    { onConflict: 'organization_id,kljuc' },
  );
  if (error) throw error;
}

const casIz = (iso?: string | null): number => {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
};

/* Splosna sinhronizacija enega kataloga.
   Vrne true, ce se je LOKALNA slika spremenila (klicatelj lahko osvezi prikaz).

   Razsodba:
   - oblak novejsi   -> prepisi lokalno in prevzemi oblacni cas (da naslednji
                        push vidi enako vrednost in ne posilja nazaj)
   - lokalno novejse -> posilji v oblak
   - enako           -> nic

   Prvi zagon (obstojeci uporabnik ima podatke, casa pa se ni, ker je zapis
   nastal pred to migracijo): ce v oblaku vrstice SE NI in lokalni seznam ni
   prazen, ga posejemo z zdajsnjim casom. Prazen lokalni seznam brez casa
   vrstice NE ustvari — sicer bi prazna naprava povozila polno. */
export async function sinhronizirajKatalog<T>(
  kljuc: KatalogKljuc,
  preberi: () => T[],
  zapisi: (seznam: T[]) => void,
): Promise<boolean> {
  if (jeSamoPredogled()) return false;
  const context = await getOrganizationContext();
  if (!context) return false;

  const lokalno = preberi();
  const lokalniCas = preberiCasKataloga(kljuc);
  const vrstica = await preberiVrstico(kljuc, context.organizationId);

  if (!vrstica) {
    if (!lokalno.length) return false;
    const zdaj = new Date().toISOString();
    await zapisiVrstico(kljuc, context.organizationId, lokalno, zdaj);
    nastaviCasKataloga(kljuc, zdaj);
    return false;
  }

  const oblacniCasIso = vrstica.updated_at || new Date(0).toISOString();
  const oblacniCas = casIz(oblacniCasIso);

  if (oblacniCas > lokalniCas) {
    /* Neveljavne vsebine (npr. rocno pokvarjen jsonb) NE spustimo v vmesnik. */
    if (!Array.isArray(vrstica.data)) return false;
    zapisi(vrstica.data as T[]);
    /* zapisi() sprozi oznaciKatalogSpremenjen (cas = zdaj); povozimo ga z
       oblacnim casom, da se ista vsebina ne vrne takoj nazaj v oblak. */
    nastaviCasKataloga(kljuc, oblacniCasIso);
    return true;
  }

  if (lokalniCas > oblacniCas) {
    await zapisiVrstico(kljuc, context.organizationId, lokalno, new Date(lokalniCas).toISOString());
  }
  return false;
}

/* Posiljanje brez prepisovanja lokalne slike — za sproten prenos ob spremembi
   v vmesniku (FlowCloudBridge posluša 'pinart-katalogi-change'). Ce lokalna
   sprememba se ni oznacena s casom, jo oznacimo zdaj, sicer je push ne bi imel
   s cim zagovarjati proti oblacni razlicici. */
async function pushSeznam<T>(kljuc: KatalogKljuc, preberi: () => T[]): Promise<void> {
  if (jeSamoPredogled()) return;
  const context = await getOrganizationContext();
  if (!context) return;

  let lokalniCas = preberiCasKataloga(kljuc);
  if (!lokalniCas) {
    const zdaj = new Date().toISOString();
    nastaviCasKataloga(kljuc, zdaj);
    lokalniCas = casIz(zdaj);
  }

  const vrstica = await preberiVrstico(kljuc, context.organizationId);
  if (vrstica && casIz(vrstica.updated_at) >= lokalniCas) return;

  await zapisiVrstico(kljuc, context.organizationId, preberi(), new Date(lokalniCas).toISOString());
}

/* Vez = en katalog, ze povezan s svojo shrambo. Generika je tu ujeta, zato je
   spodnji zapis enotipen in nikjer ni potreben cast. */
type Vez = { sinhroniziraj: () => Promise<boolean>; push: () => Promise<void> };

const vez = <T>(kljuc: KatalogKljuc, preberi: () => T[], zapisi: (seznam: T[]) => void): Vez => ({
  sinhroniziraj: () => sinhronizirajKatalog(kljuc, preberi, zapisi),
  push: () => pushSeznam(kljuc, preberi),
});

const KATALOGI: Record<KatalogKljuc, Vez> = {
  sodelavci: vez('sodelavci', preberiSodelavci, shraniSodelavci),
  oddelki: vez('oddelki', preberiOddelki, shraniOddelki),
  podrocja: vez('podrocja', preberiPodrocja, shraniPodrocja),
  postavke: vez('postavke', preberiPostavke, shraniPostavke),
  produkti: vez('produkti', preberiProdukte, shraniProdukte),
};

const VSI_KLJUCI = Object.keys(KATALOGI) as KatalogKljuc[];

/* Prenos enega kataloga v oblak (npr. iz dogodka, ki pove, kateri se je
   spremenil: detail.kljuc). */
export async function pushKatalog(kljuc: KatalogKljuc): Promise<void> {
  const izbran = KATALOGI[kljuc];
  if (izbran) await izbran.push();
}

/* Vsi katalogi naenkrat — ko ne vemo, kateri se je spremenil. */
export async function pushKataloge(): Promise<void> {
  if (jeSamoPredogled()) return;
  for (const kljuc of VSI_KLJUCI) {
    try { await KATALOGI[kljuc].push(); } catch (e) { console.error(`Prenos kataloga ${kljuc} ni uspel:`, e); }
  }
}

/* Celoten cikel ob prijavi/osvezitvi za vseh pet katalogov.
   Vrne true, ce se je vsaj ena lokalna slika spremenila. */
export async function sinhronizirajKataloge(): Promise<boolean> {
  if (jeSamoPredogled()) return false;
  let seJeSpremenilo = false;
  for (const kljuc of VSI_KLJUCI) {
    try {
      if (await KATALOGI[kljuc].sinhroniziraj()) seJeSpremenilo = true;
    } catch (e) {
      /* En pokvarjen katalog ne sme ustaviti ostalih. */
      console.error(`Sinhronizacija kataloga ${kljuc} ni uspela:`, e);
    }
  }
  return seJeSpremenilo;
}

/* Ponovni izvoz, da ima FlowCloudBridge vse na enem mestu. */
export { DOGODEK_KATALOGI } from './katalogCas';
export type { KatalogKljuc } from './katalogCas';

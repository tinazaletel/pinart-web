/* NALOGE ↔ OBLAK
   Naloge (lib/naloge.ts) so do zdaj živele samo v localStorage — štirje ključi:
   naloge, zgodovina aktivnosti, tedenske dodelitve in dolžina cikla. Zato jih ni
   bilo mogoče videti na drugi napravi ne dodeliti sodelavcu. Ta modul jih
   sinhronizira s tabelama public.naloge in public.naloge_nastavitve
   (migracija 20260820021000).

   Vzorec je namenoma isti kot pri projektih (lib/projektiOblak): external_id =
   lokalni Naloga.id, upsert po organization_id+external_id, ob sporu zmaga
   novejši updatedAt, brisanje potuje kot nagrobnik (deleted_at).

   Zakaj sta zgodovina/dodelitve/cikel v LOČENI tabeli: to niso zapisi
   posameznika, ampak nastavitev oz. dnevnik cele organizacije (šefov razpored
   vidi vsa ekipa). Zato ena vrstica na organizacijo in vidnost = članstvo.

   localStorage OSTAJA — je lokalna kopija, ki jo vmesnik bere sinhrono. Zato
   TaskManagerWorkspace, ProjectsWorkspace, KoledarWorkspace in BusinessOverview
   ostanejo nespremenjeni. */

import { createClient } from '@/utils/supabase/client';
import { getOrganizationContext } from './pinartFlowCloud';
import { jeDemoId, jeSamoPredogled } from './predogled';
import {
  nastavitveCas,
  preberiNalogeNastavitve,
  preberiNalogeVsi,
  zapisiNalogeNastavitve,
  zapisiNalogeVsi,
  type Naloga,
  type NalogeNastavitve,
  type TedenskaDodelitev,
  type ZgodovinaAktivnosti,
} from './naloge';

/* Zapisi brez updatedAt (nastali pred to migracijo) se štejejo za stare, da
   jih oblak ne prepiše po nesreči; created je boljši približek kot nič. */
const cas = (n: Naloga): number => {
  const vir = n.updatedAt || n.created;
  const t = vir ? Date.parse(vir) : NaN;
  return Number.isNaN(t) ? 0 : t;
};

/* due_on je stolpec tipa date — Naloga.rok je prosto besedilo iz <input type="date">,
   lahko pa je tudi cel ISO čas ali prazen niz. Vzamemo samo obliko YYYY-MM-DD;
   karkoli drugega gre v bazo kot NULL (podatek se ne izgubi, ostane v data jsonb). */
const vDatum = (rok?: string): string | null => {
  if (!rok) return null;
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(rok.trim());
  return m ? m[1] : null;
};

type Vrstica = {
  external_id: string;
  title: string | null;
  status: string | null;
  assignee: string | null;
  due_on: string | null;
  project_external_id: string | null;
  data: unknown;
  updated_at: string | null;
  deleted_at: string | null;
};

/* Iz vrstice v bazi sestavi Nalogo: jedrni stolpci so merodajni, vse ostalo
   (komentarji, podopravila, oznake, štoparica) pride iz data jsonb. */
const izVrstice = (v: Vrstica): Naloga | null => {
  const d = (v.data && typeof v.data === 'object' ? v.data : {}) as Partial<Naloga>;
  if (!v.external_id) return null;
  return {
    ...(d as Naloga),
    id: v.external_id,
    naslov: v.title || d.naslov || '',
    stolpec: (v.status as Naloga['stolpec']) || d.stolpec || 'todo',
    dodeljenoOsebaId: v.assignee || d.dodeljenoOsebaId,
    /* rok raje iz data (ohrani izvorno obliko), due_on je le za poizvedbe */
    rok: d.rok || v.due_on || undefined,
    projectId: v.project_external_id || d.projectId,
    created: d.created || v.updated_at || new Date().toISOString(),
    updatedAt: v.updated_at || d.updatedAt,
    deletedAt: v.deleted_at || undefined,
  };
};

/* ── Naloge ────────────────────────────────────────────────────────────────── */

export async function pushNaloge(naloge?: Naloga[]): Promise<void> {
  if (jeSamoPredogled()) return;
  const context = await getOrganizationContext();
  if (!context) return;

  const supabase = createClient();
  const vsi = (naloge || preberiNalogeVsi()).filter(n => n.id && !jeDemoId(n.id));

  if (vsi.length) {
    const { data: obstojece, error: bralnaNapaka } = await supabase
      .from('naloge').select('external_id,updated_at,deleted_at')
      .eq('organization_id', context.organizationId);
    if (bralnaNapaka) throw bralnaNapaka;

    const vOblaku = new Map((obstojece || []).map(v => [String(v.external_id), v]));

    const zaPosiljanje = vsi.filter(n => {
      const cloud = vOblaku.get(n.id);
      if (!cloud) return true;
      /* nagrobnika ne obujaj, svojega pa pošlji */
      if (cloud.deleted_at && !n.deletedAt) return false;
      if (n.deletedAt && !cloud.deleted_at) return true;
      const cloudCas = cloud.updated_at ? Date.parse(cloud.updated_at) : 0;
      return cas(n) >= (Number.isNaN(cloudCas) ? 0 : cloudCas);
    });

    if (zaPosiljanje.length) {
      const vrstice = zaPosiljanje.map(n => ({
        organization_id: context.organizationId,
        external_id: n.id,
        title: n.naslov || '',
        status: n.stolpec || null,
        /* Sodelavec.id — stabilnejši od imena; prosto polje dodeljenoOseba ostane v data */
        assignee: n.dodeljenoOsebaId || null,
        due_on: vDatum(n.rok),
        project_external_id: n.projectId || null,
        data: n,
        updated_at: n.updatedAt || n.created || new Date(0).toISOString(),
        deleted_at: n.deletedAt || null,
      }));
      const { error } = await supabase.from('naloge').upsert(vrstice, { onConflict: 'organization_id,external_id' });
      if (error) throw error;
    }
  }

  /* Nastavitve potujejo po isti poti: dogodek 'pinart-naloge-change' se sproži
     tudi ob spremembi zgodovine/dodelitev/cikla, zato jih pošljemo tu. */
  await pushNalogeNastavitve();
}

export async function pullNaloge(): Promise<Naloga[] | null> {
  if (jeSamoPredogled()) return null;
  const context = await getOrganizationContext();
  if (!context) return null;

  const supabase = createClient();
  const { data, error } = await supabase
    .from('naloge')
    .select('external_id,title,status,assignee,due_on,project_external_id,data,updated_at,deleted_at')
    .eq('organization_id', context.organizationId);
  if (error) throw error;

  return (data || []).map(v => izVrstice(v as Vrstica)).filter((n): n is Naloga => Boolean(n));
}

/* Zlij oblak z lokalnim. Ob istem id zmaga novejši zapis; nagrobnik prevlada
   nad starejšo živo različico. */
export function zlijNaloge(oblak: Naloga[], lokalno: Naloga[]): Naloga[] {
  const poId = new Map<string, Naloga>();
  lokalno.forEach(n => poId.set(n.id, n));
  oblak.forEach(n => {
    const obstojec = poId.get(n.id);
    if (!obstojec || cas(n) >= cas(obstojec)) poId.set(n.id, n);
  });
  return Array.from(poId.values()).sort((a, b) => cas(b) - cas(a));
}

/* ── Nastavitve (zgodovina + dodelitve + cikel) ────────────────────────────── */

type NastavitveVrstica = { data: unknown; updated_at: string | null };

const izNastavitev = (v: NastavitveVrstica | null): { n: NalogeNastavitve; cas: number } | null => {
  if (!v) return null;
  const d = (v.data && typeof v.data === 'object' ? v.data : {}) as Partial<NalogeNastavitve>;
  const t = v.updated_at ? Date.parse(v.updated_at) : NaN;
  return {
    n: {
      zgodovina: Array.isArray(d.zgodovina) ? d.zgodovina : [],
      dodelitve: Array.isArray(d.dodelitve) ? d.dodelitve : [],
      cikelTednov: typeof d.cikelTednov === 'number' ? d.cikelTednov : 1,
    },
    cas: Number.isNaN(t) ? 0 : t,
  };
};

async function pullNalogeNastavitve(): Promise<{ n: NalogeNastavitve; cas: number } | null> {
  const context = await getOrganizationContext();
  if (!context) return null;
  const { data, error } = await createClient()
    .from('naloge_nastavitve').select('data,updated_at')
    .eq('organization_id', context.organizationId).maybeSingle();
  if (error) throw error;
  return izNastavitev((data as NastavitveVrstica) || null);
}

/* Zlij nastavitve:
   - ZGODOVINA je dnevnik (samo dodajanje, nikoli brisanje) -> unija po id,
     urejena po datumu; tako se zapisi z dveh naprav seštejejo, ne prepišejo.
   - DODELITVE in CIKEL sta stanje, ki ga uporabnica ureja in tudi BRIŠE; unija
     bi izbrisano dodelitev obudila, zato tu zmaga novejša stran v celoti. */
export function zlijNalogeNastavitve(
  oblak: { n: NalogeNastavitve; cas: number } | null,
  lokalno: { n: NalogeNastavitve; cas: number },
): NalogeNastavitve {
  if (!oblak) return lokalno.n;
  const poId = new Map<string, ZgodovinaAktivnosti>();
  [...oblak.n.zgodovina, ...lokalno.n.zgodovina].forEach(z => { if (z && z.id) poId.set(z.id, z); });
  const zgodovina = Array.from(poId.values())
    .sort((a, b) => Date.parse(a.datum || '') - Date.parse(b.datum || ''));

  const novejsi = lokalno.cas >= oblak.cas ? lokalno.n : oblak.n;
  const dodelitve: TedenskaDodelitev[] = novejsi.dodelitve;
  return { zgodovina, dodelitve, cikelTednov: novejsi.cikelTednov };
}

export async function pushNalogeNastavitve(nastavitve?: NalogeNastavitve): Promise<void> {
  if (jeSamoPredogled()) return;
  const context = await getOrganizationContext();
  if (!context) return;

  const lokalno = { n: nastavitve || preberiNalogeNastavitve(), cas: nastavitveCas() };
  /* nič lokalnega (nikoli nič shranjenega) -> nimamo kaj poslati */
  if (!lokalno.cas && !lokalno.n.zgodovina.length && !lokalno.n.dodelitve.length) return;

  const oblak = await pullNalogeNastavitve();
  const zlito = zlijNalogeNastavitve(oblak, lokalno);
  const casZapisa = new Date(Math.max(lokalno.cas, oblak?.cas || 0) || Date.now()).toISOString();

  if (oblak && JSON.stringify(oblak.n) === JSON.stringify(zlito)) return;

  const { error } = await createClient().from('naloge_nastavitve').upsert({
    organization_id: context.organizationId,
    data: zlito,
    updated_at: casZapisa,
  }, { onConflict: 'organization_id' });
  if (error) throw error;
}

/* ── Celoten cikel ─────────────────────────────────────────────────────────── */

/* Ob prijavi/osvežitvi: pošlji svoje, poberi tuje, zlij, zapiši. Vrne true, če
   se je lokalna slika spremenila (klicatelj lahko osveži prikaz). */
export async function sinhronizirajNaloge(): Promise<boolean> {
  if (jeSamoPredogled()) return false;
  try {
    await pushNaloge();

    let seJeSpremenilo = false;

    const oblak = await pullNaloge();
    if (oblak) {
      const lokalno = preberiNalogeVsi();
      const zlito = zlijNaloge(oblak, lokalno);
      /* Primerjaj VSEBINO, ne vrstnega reda — zlivanje seznam uredi po času, zato
         bi primerjava celotnega JSON-a ob vsaki prijavi lažno javila spremembo
         in po nepotrebnem znova naložila stran. */
      const podpis = (s: Naloga[]) => s.map(n => `${n.id}:${n.updatedAt || n.created}:${n.deletedAt || ''}`).sort().join('|');
      if (podpis(zlito) !== podpis(lokalno)) {
        zapisiNalogeVsi(zlito);
        seJeSpremenilo = true;
      }
    }

    const oblakNastavitve = await pullNalogeNastavitve();
    if (oblakNastavitve) {
      const lokalneNastavitve = { n: preberiNalogeNastavitve(), cas: nastavitveCas() };
      const zlite = zlijNalogeNastavitve(oblakNastavitve, lokalneNastavitve);
      if (JSON.stringify(zlite) !== JSON.stringify(lokalneNastavitve.n)) {
        zapisiNalogeNastavitve(zlite, new Date(Math.max(lokalneNastavitve.cas, oblakNastavitve.cas) || Date.now()).toISOString());
        seJeSpremenilo = true;
      }
    }

    return seJeSpremenilo;
  } catch (e) {
    console.error('Sinhronizacija nalog ni uspela:', e);
    return false;
  }
}

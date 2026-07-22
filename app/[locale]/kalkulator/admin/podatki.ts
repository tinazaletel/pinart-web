/**
 * Bere anonimne podatke iz Supabase (pogledi iz migracije
 * 20260722040000_analitika.sql). Google Sheet ostaja kot rezerva, dokler
 * ga Tina ne ugasne — če Supabase ni nastavljen, pade nazaj nanj.
 *
 * Vse skupaj je seštevek: nikjer ni e-pošte, imena ali podatkov o strankah.
 * Zasebni dnevnik ur se tu NE bere in se ne sme brati.
 */
import { createAdminClient } from '@/utils/supabase/admin';

type Zapis = {
  submittedAt: string;
  storitve: string;
  izkusnje: string;
  mojTrg: string;
  trgNarocnika: string;
  raba: string;
  izvedbaEUR: number;
  praviceEUR: number;
  valuta: string;
  prilagojeno: string;
};

export type Skupina = {
  kljuc: string;
  storitve: string;
  izkusnje: string;
  trgNarocnika: string;
  stevilo: number;
  mediana: number;
  min: number;
  maks: number;
};

export type Storitev = { storitev: string; stevilo: number; mediana: number };
export type Trg = { mojTrg: string; stevilo: number; mediana: number };
export type Racuni = { paket: string; status: string; stevilo: number };
export type Dan = { dan: string; dogodkov: number; sej: number; nevpisanih: number };

export type Analitika = {
  napaka?: string;
  vir: 'supabase' | 'sheet' | 'brez';
  skupno: number;
  zadnji?: string;
  skupine: Skupina[];
  storitve: Storitev[];
  trgi: Trg[];
  racuni: Racuni[];
  dnevi: Dan[];
};

const prazno: Analitika = {
  vir: 'brez', skupno: 0, skupine: [], storitve: [], trgi: [], racuni: [], dnevi: [],
};

function mediana(vrednosti: number[]): number {
  const s = [...vrednosti].sort((a, b) => a - b);
  const sredina = Math.floor(s.length / 2);
  return s.length % 2 ? s[sredina] : Math.round((s[sredina - 1] + s[sredina]) / 2);
}

/* ── Supabase ─────────────────────────────────────────────────────────────── */
async function izSupabase(): Promise<Analitika | null> {
  const baza = createAdminClient();
  if (!baza) return null;

  const [cene, storitve, trgi, racuni, dnevi, zadnja] = await Promise.all([
    baza.from('analitika_cene').select('*').limit(200),
    baza.from('analitika_storitve').select('*').limit(50),
    baza.from('analitika_trgi').select('*').limit(50),
    baza.from('analitika_racuni').select('*'),
    baza.from('analitika_dnevno').select('*').limit(30),
    baza.from('cenovne_tocke').select('created_at').order('created_at', { ascending: false }).limit(1),
  ]);

  /* Ce pogledov se ni (migracija ni bila pognana), naj se pokaze jasen razlog,
     ne prazna stran. */
  if (cene.error) {
    return { ...prazno, napaka: `Supabase: ${cene.error.message}. Je migracija 20260722040000_analitika.sql pognana?` };
  }

  const skupine: Skupina[] = (cene.data || []).map(r => ({
    kljuc: `${r.storitve}|${r.izkusnje}|${r.trg_narocnika}`,
    storitve: String(r.storitve || '—'),
    izkusnje: String(r.izkusnje || '—'),
    trgNarocnika: String(r.trg_narocnika || '—'),
    stevilo: Number(r.stevilo) || 0,
    mediana: Number(r.mediana) || 0,
    min: Number(r.najnizja) || 0,
    maks: Number(r.najvisja) || 0,
  }));

  return {
    vir: 'supabase',
    skupno: skupine.reduce((s, x) => s + x.stevilo, 0),
    zadnji: zadnja.data?.[0]?.created_at,
    skupine,
    storitve: (storitve.data || []).map(r => ({ storitev: String(r.storitev), stevilo: Number(r.stevilo) || 0, mediana: Number(r.mediana) || 0 })),
    trgi: (trgi.data || []).map(r => ({ mojTrg: String(r.moj_trg), stevilo: Number(r.stevilo) || 0, mediana: Number(r.mediana) || 0 })),
    racuni: (racuni.data || []).map(r => ({ paket: String(r.paket), status: String(r.status), stevilo: Number(r.stevilo) || 0 })),
    dnevi: (dnevi.data || []).map(r => ({ dan: String(r.dan), dogodkov: Number(r.dogodkov) || 0, sej: Number(r.sej) || 0, nevpisanih: Number(r.nevpisanih) || 0 })),
  };
}

/* ── Google Sheet (stara pot, rezerva) ────────────────────────────────────── */
async function izSheeta(): Promise<Analitika> {
  const endpoint = process.env.GOOGLE_SHEETS_CENE_WEBHOOK_URL;
  const secret = process.env.GOOGLE_SHEETS_CENE_READ_SECRET;
  if (!endpoint || !secret) {
    return { ...prazno, napaka: 'Analitika še ni nastavljena. Dodaj SUPABASE_SERVICE_ROLE_KEY in poženi migracijo 20260722040000_analitika.sql.' };
  }

  let vrstice: Zapis[];
  try {
    const res = await fetch(`${endpoint}?secret=${encodeURIComponent(secret)}`, { cache: 'no-store' });
    if (!res.ok) return { ...prazno, napaka: `Sheet ni odgovoril (${res.status}).` };
    vrstice = await res.json();
    if (!Array.isArray(vrstice)) throw new Error('ni seznam');
  } catch {
    return { ...prazno, napaka: 'Napaka pri branju iz Google Sheeta.' };
  }

  const skupine = new Map<string, { storitve: string; izkusnje: string; trgNarocnika: string; zneski: number[] }>();
  for (const v of vrstice) {
    const znesek = Number(v.izvedbaEUR);
    if (!znesek) continue;
    const kljuc = `${v.storitve}|${v.izkusnje}|${v.trgNarocnika}`;
    if (!skupine.has(kljuc)) {
      skupine.set(kljuc, { storitve: v.storitve, izkusnje: v.izkusnje, trgNarocnika: v.trgNarocnika, zneski: [] });
    }
    skupine.get(kljuc)!.zneski.push(znesek);
  }

  return {
    ...prazno,
    vir: 'sheet',
    skupno: vrstice.length,
    zadnji: vrstice.length ? vrstice[vrstice.length - 1].submittedAt : undefined,
    skupine: [...skupine.entries()]
      .map(([kljuc, s]) => ({
        kljuc, storitve: s.storitve, izkusnje: s.izkusnje, trgNarocnika: s.trgNarocnika,
        stevilo: s.zneski.length, mediana: mediana(s.zneski),
        min: Math.min(...s.zneski), maks: Math.max(...s.zneski),
      }))
      .sort((a, b) => b.stevilo - a.stevilo),
  };
}

export async function pridobiCenovnePodatke(): Promise<Analitika> {
  const iz = await izSupabase();
  if (iz) return iz;
  return izSheeta();
}

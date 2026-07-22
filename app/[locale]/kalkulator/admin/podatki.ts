/**
 * Podatki za pregled poslovanja. Bere Supabase s service ključem.
 *
 * Bere OSNOVNI tabeli, ne pogledov: pogledi seštevajo vse od nekdaj in ne znajo
 * omejiti obdobja. Seštevanje v TypeScriptu je pri teh količinah zanemarljivo,
 * daje pa preklop 30 dni / 3 mesece / leto / vse.
 *
 * Vse je seštevek — nikjer ni e-pošte, imena ali podatkov o strankah.
 * Zasebni dnevnik ur se tu NE bere in se ne sme brati.
 */
import { createAdminClient } from '@/utils/supabase/admin';
import { podrocjeZaIme } from '@/lib/pricingCatalog';

/* Cena paketa PRO na mesec. Dokler plačil ne obdeluje ponudnik, je prihodek
   OCENA (število PRO × cena), ne dejansko nakazan denar — in tako mora pisati. */
export const CENA_PRO_MESECNO = 19;

export type Obdobje = 30 | 90 | 365 | 0;   // 0 = vse

export type Skupina = {
  kljuc: string; storitve: string; izkusnje: string; trgNarocnika: string;
  stevilo: number; mediana: number; min: number; maks: number;
};
export type Storitev = { storitev: string; podrocje: string; stevilo: number; mediana: number };
export type Trg = { mojTrg: string; stevilo: number; mediana: number };
export type Racuni = { paket: string; status: string; stevilo: number };
export type Mesec = { mesec: string; sej: number; nevpisanih: number; dogodkov: number; cenovnihTock: number };

export type Analitika = {
  napaka?: string;
  vir: 'supabase' | 'brez';
  obdobje: Obdobje;
  skupno: number;
  zadnji?: string;
  skupine: Skupina[];
  storitve: Storitev[];
  trgi: Trg[];
  racuni: Racuni[];
  meseci: Mesec[];
  racunovSkupaj: number;
  proRacunov: number;
  ocenjenPrihodekMesecno: number;
};

const prazno: Analitika = {
  vir: 'brez', obdobje: 0, skupno: 0, skupine: [], storitve: [], trgi: [],
  racuni: [], meseci: [], racunovSkupaj: 0, proRacunov: 0, ocenjenPrihodekMesecno: 0,
};

function mediana(v: number[]): number {
  if (!v.length) return 0;
  const s = [...v].sort((a, b) => a - b);
  const i = Math.floor(s.length / 2);
  return s.length % 2 ? s[i]! : Math.round((s[i - 1]! + s[i]!) / 2);
}

const mesecKljuc = (iso: string) => iso.slice(0, 7);          // 2026-07
const odKdaj = (dni: Obdobje) =>
  (dni ? new Date(Date.now() - dni * 86_400_000).toISOString() : null);

type Tocka = {
  created_at: string; storitve: string[] | null; izkusnje: string | null;
  moj_trg: string | null; trg_narocnika: string | null; izvedba_eur: number | string;
};
type Dogodek = { created_at: string; seja: string | null; paket: string | null };

export async function pridobiAnalitiko(obdobje: Obdobje = 90): Promise<Analitika> {
  const baza = createAdminClient();
  if (!baza) {
    return { ...prazno, napaka: 'Analitika ni nastavljena: manjka SUPABASE_SERVICE_ROLE_KEY.' };
  }

  const od = odKdaj(obdobje);
  let tocke = baza.from('cenovne_tocke')
    .select('created_at,storitve,izkusnje,moj_trg,trg_narocnika,izvedba_eur')
    .order('created_at', { ascending: false }).limit(20000);
  let dogodki = baza.from('dogodki')
    .select('created_at,seja,paket')
    .order('created_at', { ascending: false }).limit(50000);
  if (od) { tocke = tocke.gte('created_at', od); dogodki = dogodki.gte('created_at', od); }

  const [t, d, racuni] = await Promise.all([tocke, dogodki, baza.from('analitika_racuni').select('*')]);

  if (t.error) {
    return { ...prazno, obdobje, napaka: `Supabase: ${t.error.message}` };
  }

  const vrstice = (t.data || []) as Tocka[];
  const dogodkiV = (d.data || []) as Dogodek[];

  /* ── cene po storitvi × izkušnjah × trgu ─────────────────────────────── */
  const skupineMap = new Map<string, { s: string; i: string; tn: string; zneski: number[] }>();
  const poStoritvi = new Map<string, number[]>();
  const poTrgu = new Map<string, number[]>();

  for (const v of vrstice) {
    const znesek = Number(v.izvedba_eur) || 0;
    if (!znesek) continue;
    const imena = (v.storitve || []).filter(Boolean);
    const s = imena.join(' + ') || '—';
    const i = v.izkusnje || '—';
    const tn = v.trg_narocnika || '—';
    const kljuc = `${s}|${i}|${tn}`;
    if (!skupineMap.has(kljuc)) skupineMap.set(kljuc, { s, i, tn, zneski: [] });
    skupineMap.get(kljuc)!.zneski.push(znesek);

    /* posamezna storitev: znesek je za cel skupek, zato ga delimo na storitve —
       drugace bi ponudba s petimi storitvami vsaki pripisala celotno ceno */
    const delez = imena.length ? znesek / imena.length : znesek;
    imena.forEach(ime => poStoritvi.set(ime, [...(poStoritvi.get(ime) || []), delez]));

    const trg = v.moj_trg || '—';
    poTrgu.set(trg, [...(poTrgu.get(trg) || []), znesek]);
  }

  const skupine: Skupina[] = [...skupineMap.entries()].map(([kljuc, g]) => ({
    kljuc, storitve: g.s, izkusnje: g.i, trgNarocnika: g.tn,
    stevilo: g.zneski.length, mediana: mediana(g.zneski),
    min: Math.min(...g.zneski), maks: Math.max(...g.zneski),
  })).sort((a, b) => b.stevilo - a.stevilo);

  const storitve: Storitev[] = [...poStoritvi.entries()].map(([ime, z]) => ({
    storitev: ime,
    podrocje: podrocjeZaIme(ime)?.ime || 'Drugo',
    stevilo: z.length, mediana: mediana(z),
  })).sort((a, b) => b.stevilo - a.stevilo);

  const trgi: Trg[] = [...poTrgu.entries()].map(([mojTrg, z]) => ({
    mojTrg, stevilo: z.length, mediana: mediana(z),
  })).sort((a, b) => b.stevilo - a.stevilo);

  /* ── uporaba po mesecih ──────────────────────────────────────────────── */
  const mesecMap = new Map<string, { seje: Set<string>; anon: Set<string>; dogodkov: number; tocke: number }>();
  const vzemi = (k: string) => {
    if (!mesecMap.has(k)) mesecMap.set(k, { seje: new Set(), anon: new Set(), dogodkov: 0, tocke: 0 });
    return mesecMap.get(k)!;
  };
  for (const x of dogodkiV) {
    const m = vzemi(mesecKljuc(x.created_at));
    m.dogodkov += 1;
    if (x.seja) { m.seje.add(x.seja); if ((x.paket || 'anon') === 'anon') m.anon.add(x.seja); }
  }
  for (const v of vrstice) vzemi(mesecKljuc(v.created_at)).tocke += 1;

  const meseci: Mesec[] = [...mesecMap.entries()]
    .map(([mesec, m]) => ({ mesec, sej: m.seje.size, nevpisanih: m.anon.size, dogodkov: m.dogodkov, cenovnihTock: m.tocke }))
    .sort((a, b) => b.mesec.localeCompare(a.mesec));

  /* ── računi in ocena prihodka ────────────────────────────────────────── */
  const racuniV: Racuni[] = (racuni.data || []).map(r => ({
    paket: String(r.paket), status: String(r.status), stevilo: Number(r.stevilo) || 0,
  }));
  const racunovSkupaj = racuniV.reduce((s, r) => s + r.stevilo, 0);
  const proRacunov = racuniV.filter(r => r.paket === 'pro' && r.status === 'active')
    .reduce((s, r) => s + r.stevilo, 0);

  return {
    vir: 'supabase', obdobje,
    skupno: vrstice.length,
    zadnji: vrstice[0]?.created_at,
    skupine, storitve, trgi, meseci,
    racuni: racuniV, racunovSkupaj, proRacunov,
    ocenjenPrihodekMesecno: proRacunov * CENA_PRO_MESECNO,
  };
}

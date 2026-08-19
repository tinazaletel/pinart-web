import { NextResponse } from 'next/server';
import { omejiApi } from '@/lib/rate-limit';
import { preberiJson, sporociloValidacije } from '@/lib/validacija';
import {
  preveriApiKljuc, odgovorBrezDostopa, omejiPoKljucu, imaObseg, type ApiKontekst,
} from '@/lib/apiKljuc';
import {
  adminOdjemalec, jeVeljavenZunanjiId, sestejPoValuti, zemljevidStrank,
  oblikujStranko, oblikujProjekt, oblikujPonudbo, oblikujRacun,
  STOLPCI_STRANKE, STOLPCI_PROJEKTA, STOLPCI_PONUDBE, STOLPCI_RACUNA,
  PRIVZETI_LIMIT, NAJVECJI_LIMIT,
} from '@/lib/apiV1';

/* =============================================================================
   MCP STREŽNIK ZA FLOW — SAMO BRANJE (različica 1)
   =============================================================================

   Kaj je to: končna točka Model Context Protocol, na katero se Claude (ali drug
   MCP odjemalec) poveže kot na »konektor« in BERE uporabnikove podatke v Flowu.
   Nobeno orodje tu ničesar ne ustvari, spremeni ali izbriše — pisanje pride
   šele v drugi različici. Ključ mora nositi obseg `branje`.

   PROTOKOL (prebrano iz specifikacije, ne ugibano)
   ------------------------------------------------
   - Zadnja revizija je 2026-07-28 (»modern«): brez seje in brez rokovanja
     `initialize`; vsaka zahteva nosi svojo različico v `_meta` in v glavi
     `MCP-Protocol-Version`, odkrivanje teče prek `server/discover`.
   - Starejše revizije (2024-11-05 … 2025-11-25, »legacy«) uporabljajo rokovanje
     `initialize` + `notifications/initialized`. Konektorji v Claude.ai danes
     govorijo prav to.
   Strežnik je zato DVOEROBEN (dual-era) in odgovori obema; specifikacija to
   izrecno dovoli: »A dual-era server MAY serve both eras concurrently on the
   same endpoint«. Ob `initialize` vrnemo legacy obliko, ob `_meta`/glavi
   2026-07-28 pa moderno (z `resultType`).

   TRANSPORT: Streamable HTTP. Vsako sporočilo je svoj HTTP POST na to pot,
   odgovor vrnemo kot en sam JSON objekt (`application/json`). SSE ne rabimo,
   ker so vsi odgovori kratki in sinhroni — specifikacija dopušča oboje.
   GET in DELETE vrneta 405, ker revizija 2026-07-28 GET-tok in seje odpravlja.

   OD KOD PODATKI: prek `lib/apiV1`, torej iz istih poizvedb in istih
   preslikav kot javni REST API `/api/v1/*` — samo brez HTTP skoka vmes.
   Klic lastne poti prek `fetch` bi na Vercelu zahteval absolutni URL, plačal
   dodatno omrežno pot in mrzel start ter dvakrat preveril isti ključ, pridobili
   pa ne bi nič. Ker si z REST API-jem delimo `oblikuj*` in `STOLPCI_*`, sta
   obe poti nujno skladni: kar doda ali skrije REST, doda ali skrije tudi MCP.

   ZAKAJ TO NI VARNOSTNA LUKNJA: `adminOdjemalec` obide RLS, zato je omejitev na
   `organization_id` ROČNA in obvezna pri VSAKI poizvedbi spodaj. Notranji uuid-ji
   baze ne gredo ven — navzven potuje `external_id` (glej `lib/apiV1`).
   ========================================================================== */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* ---------------------------------------------------------------------------
   Različice protokola
   --------------------------------------------------------------------------- */

const RAZLICICA_MODERN = '2026-07-28';
const RAZLICICE_LEGACY = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];
const PODPRTE = [RAZLICICA_MODERN, ...RAZLICICE_LEGACY];

/* Kaj odgovorimo na `initialize`, kadar odjemalec zahteva različico, ki je ne
   poznamo: po specifikaciji najnovejšo, ki jo znamo govoriti. */
const PRIVZETA_LEGACY = '2025-06-18';

const STREZNIK = { name: 'pinart-flow', title: 'Pinart Flow', version: '1.0.0' };

const NAVODILA =
  'Bralni dostop do uporabnikovega računa v Pinart Flow: stranke, projekti, ponudbe in računi. '
  + 'Vsa orodja samo berejo — nič ne ustvarijo, spremenijo ali izbrišejo. '
  + 'Vidni so izključno podatki organizacije, ki ji pripada uporabljeni API ključ. '
  + 'Oznake »id« so zunanji identifikatorji Flowa; z njimi povezuj zapise med orodji. '
  + 'Zneski so vedno navedeni skupaj z valuto — seštevki so razbiti po valutah, ker '
  + 'lahko podjetje izdaja v več valutah hkrati.';

/* ---------------------------------------------------------------------------
   JSON-RPC pomočniki
   --------------------------------------------------------------------------- */

type Id = string | number | null;

/* `resultType: 'complete'` je polje revizije 2026-07-28; legacy odjemalcu ga ne
   pošiljamo, da dobi točno tako obliko, kot jo pričakuje. */
function rpcOk(id: Id, result: Record<string, unknown>, modern: boolean): NextResponse {
  return NextResponse.json(
    { jsonrpc: '2.0', id, result: modern ? { resultType: 'complete', ...result } : result },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

function rpcErr(id: Id, code: number, message: string, status = 200, data?: unknown): NextResponse {
  const error = data === undefined ? { code, message } : { code, message, data };
  return NextResponse.json(
    { jsonrpc: '2.0', id, error },
    { status, headers: { 'Cache-Control': 'no-store' } },
  );
}

/* ---------------------------------------------------------------------------
   Opis orodij — vsa BRALNA
   --------------------------------------------------------------------------- */

const OPIS_OMEJITVE = `Največ zapisov v odgovoru (1–${NAJVECJI_LIMIT}, privzeto ${PRIVZETI_LIMIT}).`;
const OPIS_ODMIKA = 'Koliko zapisov preskočiš — za listanje po straneh (privzeto 0).';
const OPIS_STRANKE = 'Id stranke, kakršnega vrne orodje flow_stranke. Vrne samo zapise te stranke.';

/* Namig odjemalcu, da klic ničesar ne spremeni. Po specifikaciji so anotacije
   za odjemalca nezavezujoče (»untrusted«), a Claude jih zna prikazati. */
const ANOTACIJE_BRANJE = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

const ORODJA = [
  {
    name: 'flow_stranke',
    title: 'Stranke',
    description:
      'Vrne seznam strank iz uporabnikovega računa v Flowu: ime, kontaktna oseba, e-pošta, telefon, naslov, davčna številka in opombe. '
      + 'Neobvezni »iskanje« filtrira po imenu, kontaktni osebi, e-pošti ali davčni številki. '
      + 'Uporabi ga za vprašanja tipa »katere stranke imam«, »daj mi kontakt te stranke«, in kadar potrebuješ id stranke za druga orodja. '
      + 'Samo branje.',
    inputSchema: {
      type: 'object',
      properties: {
        iskanje: {
          type: 'string',
          description: 'Del imena, kontaktne osebe, e-pošte ali davčne številke. Če izpustiš, vrne vse stranke.',
        },
        omejitev: { type: 'integer', minimum: 1, maximum: NAJVECJI_LIMIT, description: OPIS_OMEJITVE },
        odmik: { type: 'integer', minimum: 0, description: OPIS_ODMIKA },
      },
      additionalProperties: false,
    },
    annotations: ANOTACIJE_BRANJE,
  },
  {
    name: 'flow_projekti',
    title: 'Projekti',
    description:
      'Vrne seznam projektov: naslov, status, faza, stranka in datum zadnje spremembe, najnovejši najprej. '
      + 'Neobvezno filtriraj z »iskanje« (del naslova), »status« ali »strankaId«. '
      + 'Uporabi ga za »kaj imam v delu«, »kateri projekti tečejo za to stranko«. '
      + 'Izbrisani projekti niso vključeni. Samo branje.',
    inputSchema: {
      type: 'object',
      properties: {
        iskanje: { type: 'string', description: 'Del naslova projekta.' },
        status: { type: 'string', description: 'Točen status projekta, kakršen je zapisan v Flowu (npr. »v teku«).' },
        strankaId: { type: 'string', description: OPIS_STRANKE },
        omejitev: { type: 'integer', minimum: 1, maximum: NAJVECJI_LIMIT, description: OPIS_OMEJITVE },
        odmik: { type: 'integer', minimum: 0, description: OPIS_ODMIKA },
      },
      additionalProperties: false,
    },
    annotations: ANOTACIJE_BRANJE,
  },
  {
    name: 'flow_ponudbe',
    title: 'Ponudbe',
    description:
      'Vrne seznam ponudb: številka, naslov, stranka, status, datum izdaje, veljavnost, znesek in valuta, najnovejše najprej. '
      + 'Neobvezni »status« je eden od: draft (osnutek), sent (poslana), accepted (sprejeta), rejected (zavrnjena). '
      + 'Uporabi ga za »katere ponudbe čakajo na odgovor«, »koliko ponudb je bilo sprejetih«. '
      + 'Postavk ponudbe ta različica ne vrača. Samo branje.',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['draft', 'sent', 'accepted', 'rejected'],
          description: 'draft = osnutek, sent = poslana, accepted = sprejeta, rejected = zavrnjena.',
        },
        strankaId: { type: 'string', description: OPIS_STRANKE },
        omejitev: { type: 'integer', minimum: 1, maximum: NAJVECJI_LIMIT, description: OPIS_OMEJITVE },
        odmik: { type: 'integer', minimum: 0, description: OPIS_ODMIKA },
      },
      additionalProperties: false,
    },
    annotations: ANOTACIJE_BRANJE,
  },
  {
    name: 'flow_racuni',
    title: 'Računi',
    description:
      'Vrne seznam izdanih računov: številka, stranka, status, datum izdaje, rok plačila, datum plačila, znesek in valuta, najnovejši najprej. '
      + 'Če je »neplacani« true, vrne samo terjatve — račune brez datuma plačila, ki niso osnutek in niso stornirani — in pri vsakem označi, ali je rok že potekel. '
      + 'Uporabi ga za »kdo mi še ni plačal«, »koliko imam odprtih računov«, »kaj je zapadlo«. '
      + 'Stornirani računi so sicer vrnjeni, ker so del davčne sledi. Samo branje.',
    inputSchema: {
      type: 'object',
      properties: {
        neplacani: {
          type: 'boolean',
          description: 'True = samo neplačane terjatve (brez osnutkov in storniranih). False ali izpuščeno = vsi računi.',
        },
        status: {
          type: 'string',
          enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
          description: 'draft = osnutek, sent = poslan, paid = plačan, overdue = zapadel, cancelled = storniran.',
        },
        strankaId: { type: 'string', description: OPIS_STRANKE },
        omejitev: { type: 'integer', minimum: 1, maximum: NAJVECJI_LIMIT, description: OPIS_OMEJITVE },
        odmik: { type: 'integer', minimum: 0, description: OPIS_ODMIKA },
      },
      additionalProperties: false,
    },
    annotations: ANOTACIJE_BRANJE,
  },
  {
    name: 'flow_stranka',
    title: 'Stranka s povzetkom',
    description:
      'Vrne eno stranko s povzetkom sodelovanja: njene projekte, ponudbe in račune ter seštevke — '
      + 'število projektov, vrednost ponudb, vrednost izdanih računov in koliko je še neplačanega (vse razbito po valutah). '
      + 'Stranko določi z »strankaId« ali z »ime« (išče po delu imena; če ustreza več strankam, vrne seznam kandidatk, da izbereš). '
      + 'Uporabi ga, kadar uporabnik vpraša »kako stojim s to stranko«. Samo branje.',
    inputSchema: {
      type: 'object',
      properties: {
        strankaId: { type: 'string', description: 'Id stranke iz orodja flow_stranke. Ima prednost pred »ime«.' },
        ime: { type: 'string', description: 'Del imena stranke, kadar id-ja ne poznaš.' },
        omejitev: { type: 'integer', minimum: 1, maximum: NAJVECJI_LIMIT, description: OPIS_OMEJITVE },
      },
      additionalProperties: false,
    },
    annotations: ANOTACIJE_BRANJE,
  },
];

/* ---------------------------------------------------------------------------
   Branje podatkov
   Vsaka poizvedba je omejena na `kontekst.organizationId`. Brez tega bi
   service-role odjemalec vrnil podatke vseh podjetij — druge varovalke ni.
   --------------------------------------------------------------------------- */

/** Napaka, ki jo sme videti model (in si jo lahko sam popravi). */
class NapakaOrodja extends Error {}

type Admin = NonNullable<ReturnType<typeof adminOdjemalec>>;
type Args = Record<string, unknown>;

/* Zgornja meja za seštevke — dovolj visoka, da je v praksi neomejena, a
   prepreči, da bi ena stranka z ogromno zgodovino ustavila odgovor.
   Enaka meja kot v `/api/v1/stranke/[id]`. */
const MEJA_SESTEVKOV = 5000;

function razpon(args: Args): { od: number; do: number; omejitev: number } {
  const surovaOmejitev = Number(args.omejitev);
  const surovOdmik = Number(args.odmik);
  const omejitev = Number.isFinite(surovaOmejitev) && surovaOmejitev > 0
    ? Math.min(Math.trunc(surovaOmejitev), NAJVECJI_LIMIT)
    : PRIVZETI_LIMIT;
  const odmik = Number.isFinite(surovOdmik) && surovOdmik > 0 ? Math.trunc(surovOdmik) : 0;
  return { od: odmik, do: odmik + omejitev - 1, omejitev };
}

function besedilo(vrednost: unknown, najvec = 200): string {
  return typeof vrednost === 'string' ? vrednost.trim().slice(0, najvec) : '';
}

/* PostgREST `ilike` vzorec: vrednost damo v narekovaje, da vejica ali oklepaj v
   iskalnem nizu ne razbije slovnice filtra; narekovaj in poševnico odstranimo. */
function vzorec(vrednost: string): string {
  return `"%${vrednost.replace(/["\\]/g, '')}%"`;
}

function preveriStatus(vrednost: unknown, dovoljeni: string[], kaj: string): string {
  const s = besedilo(vrednost, 30);
  if (s && !dovoljeni.includes(s)) {
    throw new NapakaOrodja(`Neveljaven status ${kaj} »${s}«. Dovoljeni so: ${dovoljeni.join(', ')}.`);
  }
  return s;
}

/* Zunanji id stranke prevedemo v notranji uuid, ker so povezave
   (projects/offers/invoices.client_id) vezane nanj. Uuid ostane v strežniku. */
async function notranjiIdStranke(admin: Admin, orgId: string, args: Args): Promise<string | null> {
  const zunanji = besedilo(args.strankaId, 80);
  if (!zunanji) return null;
  if (!jeVeljavenZunanjiId(zunanji)) {
    throw new NapakaOrodja('Neveljaven »strankaId«. Uporabi id, kakršnega vrne orodje flow_stranke.');
  }
  const { data, error } = await admin
    .from('clients')
    .select('id')
    .eq('organization_id', orgId)
    .eq('external_id', zunanji)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new NapakaOrodja(`Stranke z id »${zunanji}« v tem računu ni.`);
  return String(data.id);
}

type Izid = { povzetek: string; podatki: unknown };

async function orodjeStranke(admin: Admin, orgId: string, args: Args): Promise<Izid> {
  const iskanje = besedilo(args.iskanje, 120);
  const { od, do: doVrstice } = razpon(args);

  let q = admin
    .from('clients')
    .select(STOLPCI_STRANKE)
    .eq('organization_id', orgId)
    .order('name', { ascending: true })
    .range(od, doVrstice);
  if (iskanje) {
    const v = vzorec(iskanje);
    q = q.or(`name.ilike.${v},contact_name.ilike.${v},email.ilike.${v},tax_number.ilike.${v}`);
  }

  const { data, error } = await q;
  if (error) throw error;

  const stranke = (data || []).map(v => oblikujStranko(v));
  return {
    povzetek: iskanje
      ? `Strank, ki ustrezajo iskanju »${iskanje}«: ${stranke.length}.`
      : `Strank v računu: ${stranke.length}.`,
    podatki: { stevilo: stranke.length, stranke },
  };
}

async function orodjeProjekti(admin: Admin, orgId: string, args: Args): Promise<Izid> {
  const iskanje = besedilo(args.iskanje, 120);
  const status = besedilo(args.status, 60);
  const strankaId = await notranjiIdStranke(admin, orgId, args);
  const { od, do: doVrstice } = razpon(args);

  let q = admin
    .from('projects')
    .select(STOLPCI_PROJEKTA)
    .eq('organization_id', orgId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .range(od, doVrstice);
  if (status) q = q.eq('status', status);
  if (strankaId) q = q.eq('client_id', strankaId);
  if (iskanje) q = q.ilike('title', `%${iskanje}%`);

  const { data, error } = await q;
  if (error) throw error;

  const vrstice = data || [];
  const stranke = await zemljevidStrank(admin, orgId, vrstice.map(v => v.client_id as string | null));
  const projekti = vrstice.map(v => oblikujProjekt(v, stranke.get(String(v.client_id))));
  return {
    povzetek: `Projektov: ${projekti.length}.`,
    podatki: { stevilo: projekti.length, projekti },
  };
}

async function orodjePonudbe(admin: Admin, orgId: string, args: Args): Promise<Izid> {
  const status = preveriStatus(args.status, ['draft', 'sent', 'accepted', 'rejected'], 'ponudbe');
  const strankaId = await notranjiIdStranke(admin, orgId, args);
  const { od, do: doVrstice } = razpon(args);

  let q = admin
    .from('offers')
    .select(STOLPCI_PONUDBE)
    .eq('organization_id', orgId)
    .is('deleted_at', null)
    .order('issue_date', { ascending: false })
    .range(od, doVrstice);
  if (status) q = q.eq('status', status);
  if (strankaId) q = q.eq('client_id', strankaId);

  const { data, error } = await q;
  if (error) throw error;

  const vrstice = data || [];
  const stranke = await zemljevidStrank(admin, orgId, vrstice.map(v => v.client_id as string | null));
  const ponudbe = vrstice.map(v => oblikujPonudbo(v, stranke.get(String(v.client_id))));
  const vrednost = sestejPoValuti(vrstice);
  return {
    povzetek: `Ponudb: ${ponudbe.length}. Skupna vrednost: ${zapisiZneske(vrednost)}.`,
    podatki: { stevilo: ponudbe.length, vrednostPoValutah: vrednost, ponudbe },
  };
}

async function orodjeRacuni(admin: Admin, orgId: string, args: Args): Promise<Izid> {
  const samoNeplacani = args.neplacani === true;
  const status = preveriStatus(args.status, ['draft', 'sent', 'paid', 'overdue', 'cancelled'], 'računa');
  const strankaId = await notranjiIdStranke(admin, orgId, args);
  const { od, do: doVrstice } = razpon(args);

  let q = admin
    .from('invoices')
    .select(STOLPCI_RACUNA)
    .eq('organization_id', orgId)
    .is('deleted_at', null)
    .order('issue_date', { ascending: false })
    .range(od, doVrstice);
  if (status) q = q.eq('status', status);
  if (strankaId) q = q.eq('client_id', strankaId);
  /* Neplačano = ni datuma plačila, ni preklican, ni osnutek. Osnutek še ni
     terjatev — enaka razlaga kot v `/api/v1/stranke/[id]`. */
  if (samoNeplacani) q = q.is('paid_at', null).not('status', 'in', '(cancelled,draft)');

  const { data, error } = await q;
  if (error) throw error;

  const vrstice = data || [];
  const stranke = await zemljevidStrank(admin, orgId, vrstice.map(v => v.client_id as string | null));
  const dnes = new Date().toISOString().slice(0, 10);
  const racuni = vrstice.map(v => {
    const r = oblikujRacun(v, stranke.get(String(v.client_id)));
    const terjatev = !r.placano && r.status !== 'cancelled' && r.status !== 'draft';
    return { ...r, zapadel: terjatev && !!r.rokPlacila && r.rokPlacila < dnes };
  });
  const vrednost = sestejPoValuti(vrstice);
  const zapadli = racuni.filter(r => r.zapadel).length;

  return {
    povzetek: samoNeplacani
      ? `Neplačanih računov: ${racuni.length}, od tega zapadlih ${zapadli}. Skupaj: ${zapisiZneske(vrednost)}.`
      : `Računov: ${racuni.length}. Skupaj: ${zapisiZneske(vrednost)}.`,
    podatki: { stevilo: racuni.length, steviloZapadlih: zapadli, vrednostPoValutah: vrednost, racuni },
  };
}

async function orodjeStranka(admin: Admin, orgId: string, args: Args): Promise<Izid> {
  const zunanjiId = besedilo(args.strankaId, 80);
  const ime = besedilo(args.ime, 120);
  if (!zunanjiId && !ime) {
    throw new NapakaOrodja('Navedi »strankaId« ali »ime« stranke.');
  }

  /* Iskanje stranke — vedno znotraj organizacije ključa. */
  let iskalna = admin
    .from('clients')
    .select(`id,${STOLPCI_STRANKE}`)
    .eq('organization_id', orgId)
    .limit(10);
  if (zunanjiId) {
    if (!jeVeljavenZunanjiId(zunanjiId)) {
      throw new NapakaOrodja('Neveljaven »strankaId«. Uporabi id, kakršnega vrne orodje flow_stranke.');
    }
    iskalna = iskalna.eq('external_id', zunanjiId);
  } else {
    iskalna = iskalna.ilike('name', `%${ime}%`);
  }

  const { data: najdene, error } = await iskalna;
  if (error) throw error;

  const seznam = najdene || [];
  if (!seznam.length) {
    throw new NapakaOrodja(
      zunanjiId ? `Stranke z id »${zunanjiId}« v tem računu ni.` : `Stranke z imenom »${ime}« nisem našel.`,
    );
  }
  if (seznam.length > 1) {
    const kandidatke = seznam.map(v => ({ id: v.external_id, ime: v.name }));
    return {
      povzetek: `Imenu »${ime}« ustreza več strank (${kandidatke.length}). Izberi eno in klic ponovi s »strankaId«.`,
      podatki: { vecKandidatk: true, kandidatke },
    };
  }

  const vrstica = seznam[0];
  const notranjiId = String(vrstica.id);
  const strankaKratko = {
    id: typeof vrstica.external_id === 'string' ? vrstica.external_id : null,
    ime: typeof vrstica.name === 'string' ? vrstica.name : null,
  };
  const { od, do: doVrstice } = razpon(args);

  const [projekti, ponudbe, racuni, vsePonudbe, vsiRacuni] = await Promise.all([
    admin.from('projects').select(STOLPCI_PROJEKTA, { count: 'exact' })
      .eq('organization_id', orgId).eq('client_id', notranjiId)
      .is('deleted_at', null).order('updated_at', { ascending: false }).range(od, doVrstice),
    admin.from('offers').select(STOLPCI_PONUDBE, { count: 'exact' })
      .eq('organization_id', orgId).eq('client_id', notranjiId)
      .is('deleted_at', null).order('issue_date', { ascending: false }).range(od, doVrstice),
    admin.from('invoices').select(STOLPCI_RACUNA, { count: 'exact' })
      .eq('organization_id', orgId).eq('client_id', notranjiId)
      .is('deleted_at', null).order('issue_date', { ascending: false }).range(od, doVrstice),
    /* Ločeni lahki poizvedbi samo za seštevke: brez njiju bi »skupaj« veljalo
       le za trenutno stran in bi zavajalo. */
    admin.from('offers').select('amount,currency,status')
      .eq('organization_id', orgId).eq('client_id', notranjiId)
      .is('deleted_at', null).range(0, MEJA_SESTEVKOV - 1),
    admin.from('invoices').select('amount,currency,status,paid_at')
      .eq('organization_id', orgId).eq('client_id', notranjiId)
      .is('deleted_at', null).range(0, MEJA_SESTEVKOV - 1),
  ]);

  const prvaNapaka = [projekti.error, ponudbe.error, racuni.error, vsePonudbe.error, vsiRacuni.error].find(Boolean);
  if (prvaNapaka) throw prvaNapaka;

  const racuniZaSestevek = vsiRacuni.data || [];
  const neplacani = racuniZaSestevek.filter(v => !v.paid_at && v.status !== 'cancelled' && v.status !== 'draft');

  const steviloProjektov = projekti.count ?? (projekti.data || []).length;
  const steviloPonudb = ponudbe.count ?? (ponudbe.data || []).length;
  const steviloRacunov = racuni.count ?? (racuni.data || []).length;
  const neplacano = sestejPoValuti(neplacani);

  return {
    povzetek:
      `${strankaKratko.ime || 'Stranka'}: ${steviloProjektov} projektov, ${steviloPonudb} ponudb, `
      + `${steviloRacunov} računov. Izdano ${zapisiZneske(sestejPoValuti(racuniZaSestevek))}, `
      + `neplačano ${zapisiZneske(neplacano)}.`,
    podatki: {
      stranka: oblikujStranko(vrstica),
      projekti: (projekti.data || []).map(v => oblikujProjekt(v, strankaKratko)),
      ponudbe: (ponudbe.data || []).map(v => oblikujPonudbo(v, strankaKratko)),
      racuni: (racuni.data || []).map(v => oblikujRacun(v, strankaKratko)),
      povzetek: {
        steviloProjektov,
        steviloPonudb,
        steviloRacunov,
        vrednostPonudb: sestejPoValuti(vsePonudbe.data || []),
        vrednostRacunov: sestejPoValuti(racuniZaSestevek),
        neplacano,
      },
    },
  };
}

/** »1.240,00 EUR in 300,00 USD« → berljivo za model in za uporabnika. */
function zapisiZneske(poValutah: Record<string, number>): string {
  const deli = Object.entries(poValutah).map(([valuta, znesek]) => `${znesek.toFixed(2)} ${valuta}`);
  return deli.length ? deli.join(' + ') : '0';
}

async function pozeniOrodje(ime: string, admin: Admin, orgId: string, args: Args): Promise<Izid> {
  switch (ime) {
    case 'flow_stranke': return orodjeStranke(admin, orgId, args);
    case 'flow_projekti': return orodjeProjekti(admin, orgId, args);
    case 'flow_ponudbe': return orodjePonudbe(admin, orgId, args);
    case 'flow_racuni': return orodjeRacuni(admin, orgId, args);
    case 'flow_stranka': return orodjeStranka(admin, orgId, args);
    default: throw new NapakaOrodja(`Orodje »${ime}« ne obstaja.`);
  }
}

/* ---------------------------------------------------------------------------
   HTTP obravnava
   --------------------------------------------------------------------------- */

/* Revizija 2026-07-28 odpravi GET-tok in seje; starejšemu odjemalcu po
   specifikaciji odgovorimo s 405, da preide na POST. */
function neDovoljeno(): NextResponse {
  return NextResponse.json(
    { jsonrpc: '2.0', id: null, error: { code: -32000, message: 'Uporabi HTTP POST na /api/mcp.' } },
    { status: 405, headers: { Allow: 'POST' } },
  );
}

export async function GET() { return neDovoljeno(); }
export async function DELETE() { return neDovoljeno(); }

export async function POST(request: Request) {
  /* 1) Ključ. Brez veljavnega `Authorization: Bearer pf_...` ne gre nič naprej —
        niti `initialize`. Neuspeli poskusi so omejeni po IP, da ključa ni
        mogoče ugibati na silo (uspešni klici so omejeni po ključu, spodaj). */
  const kontekst: ApiKontekst | null = await preveriApiKljuc(request);
  if (!kontekst) {
    const omejitevIp = await omejiApi(request, 'mcp-neuspeh', 30);
    if (omejitevIp) return omejitevIp;
    return odgovorBrezDostopa();
  }

  /* 2) Obseg. Ta strežnik samo bere, zato zahteva natanko pravico branja. */
  if (!imaObseg(kontekst, 'branje')) {
    return rpcErr(null, -32001, 'Ključ nima pravice branja.', 403);
  }

  /* 3) Omejitev pogostosti — kvota je vezana na ključ, ne na IP. */
  const omejitev = await omejiPoKljucu(request, 'mcp', 120, kontekst);
  if (omejitev) return omejitev;

  /* 4) Telo sporočila. Po specifikaciji je to en sam JSON-RPC zahtevek ali
        obvestilo (paketi so bili odpravljeni v reviziji 2025-06-18). */
  let telo: Record<string, unknown>;
  try {
    telo = await preberiJson(request, 200_000);
  } catch (error) {
    return rpcErr(null, -32700, sporociloValidacije(error), 400);
  }

  const id = (typeof telo.id === 'string' || typeof telo.id === 'number' ? telo.id : null) as Id;
  const method = typeof telo.method === 'string' ? telo.method : '';
  const params = (telo.params && typeof telo.params === 'object' && !Array.isArray(telo.params)
    ? telo.params
    : {}) as Record<string, unknown>;

  /* 5) Različica protokola. Glava `MCP-Protocol-Version` in `_meta` v telesu se
        morata ujemati — sicer -32020 HeaderMismatch (revizija 2026-07-28). */
  const glavaRazlicica = request.headers.get('mcp-protocol-version')?.trim() || '';
  const meta = (params._meta && typeof params._meta === 'object' ? params._meta : {}) as Record<string, unknown>;
  const teloRazlicica = typeof meta['io.modelcontextprotocol/protocolVersion'] === 'string'
    ? String(meta['io.modelcontextprotocol/protocolVersion'])
    : '';

  if (glavaRazlicica && !PODPRTE.includes(glavaRazlicica)) {
    return rpcErr(id, -32022, 'Unsupported protocol version', 400, {
      supported: PODPRTE,
      requested: glavaRazlicica,
    });
  }
  if (glavaRazlicica && teloRazlicica && glavaRazlicica !== teloRazlicica) {
    return rpcErr(
      id,
      -32020,
      `Header mismatch: MCP-Protocol-Version header value '${glavaRazlicica}' does not match body value '${teloRazlicica}'`,
      400,
    );
  }

  const modern = glavaRazlicica === RAZLICICA_MODERN || teloRazlicica === RAZLICICA_MODERN;

  /* 6) Obvestila (brez `id`) — po specifikaciji 202 Accepted brez telesa. */
  if (method.startsWith('notifications/') || telo.id === undefined) {
    return new NextResponse(null, { status: 202 });
  }

  try {
    switch (method) {
      /* --- legacy rokovanje (kar govorijo konektorji v Claude.ai) ---------- */
      case 'initialize': {
        const zeljena = typeof params.protocolVersion === 'string' ? params.protocolVersion : '';
        const izbrana = PODPRTE.includes(zeljena) ? zeljena : PRIVZETA_LEGACY;
        return rpcOk(id, {
          protocolVersion: izbrana,
          capabilities: { tools: { listChanged: false } },
          serverInfo: STREZNIK,
          instructions: NAVODILA,
        }, false);
      }

      /* --- moderno odkrivanje (2026-07-28) -------------------------------- */
      case 'server/discover':
        return rpcOk(id, {
          supportedVersions: PODPRTE,
          capabilities: { tools: {} },
          instructions: NAVODILA,
          _meta: { 'io.modelcontextprotocol/serverInfo': STREZNIK },
        }, modern);

      case 'ping':
        return rpcOk(id, {}, modern);

      case 'tools/list':
        return rpcOk(id, { tools: ORODJA }, modern);

      /* Zmogljivosti za vire in pozive ne oglašujemo, a nekateri odjemalci
         vseeno vprašajo — prazen seznam je prijaznejši od napake. */
      case 'resources/list':
        return rpcOk(id, { resources: [] }, modern);
      case 'resources/templates/list':
        return rpcOk(id, { resourceTemplates: [] }, modern);
      case 'prompts/list':
        return rpcOk(id, { prompts: [] }, modern);

      case 'tools/call': {
        const imeOrodja = typeof params.name === 'string' ? params.name : '';
        if (!ORODJA.some(o => o.name === imeOrodja)) {
          return rpcErr(id, -32602, `Unknown tool: ${imeOrodja || '(brez imena)'}`);
        }
        /* Glava `Mcp-Name` se mora ujemati s `params.name` (2026-07-28). */
        const glavaIme = request.headers.get('mcp-name');
        if (modern && glavaIme && odkodirajGlavo(glavaIme) !== imeOrodja) {
          return rpcErr(
            id,
            -32020,
            `Header mismatch: Mcp-Name header value '${glavaIme}' does not match body value '${imeOrodja}'`,
            400,
          );
        }

        const args = (params.arguments && typeof params.arguments === 'object' && !Array.isArray(params.arguments)
          ? params.arguments
          : {}) as Args;

        const admin = adminOdjemalec();
        if (!admin) {
          console.error('MCP: service-role odjemalec ni nastavljen.');
          return rpcOk(id, {
            content: [{ type: 'text', text: 'Storitev trenutno ni na voljo.' }],
            isError: true,
          }, modern);
        }

        try {
          const { povzetek, podatki } = await pozeniOrodje(imeOrodja, admin, kontekst.organizationId, args);
          return rpcOk(id, {
            content: [{ type: 'text', text: `${povzetek}\n\n${JSON.stringify(podatki, null, 2)}` }],
            structuredContent: podatki,
            isError: false,
          }, modern);
        } catch (e) {
          /* Napake orodja vrnemo kot `isError: true`, ne kot JSON-RPC napako —
             tako se model lahko sam popravi (npr. napačen id stranke).
             Podrobnosti baze NIKOLI ne gredo ven, samo v strežniški dnevnik. */
          if (e instanceof NapakaOrodja) {
            return rpcOk(id, { content: [{ type: 'text', text: e.message }], isError: true }, modern);
          }
          console.error(`MCP orodje ${imeOrodja}:`, e instanceof Error ? e.message : e);
          return rpcOk(id, {
            content: [{ type: 'text', text: 'Podatkov trenutno ni bilo mogoče prebrati.' }],
            isError: true,
          }, modern);
        }
      }

      default:
        /* 2026-07-28 zahteva 404 za neznano metodo; legacy odjemalec pričakuje
           200 z JSON-RPC napako. */
        return rpcErr(id, -32601, `Method not found: ${method || '(brez metode)'}`, modern ? 404 : 200);
    }
  } catch (e) {
    console.error('MCP strežnik:', e instanceof Error ? e.message : e);
    return rpcErr(id, -32603, 'Notranja napaka strežnika.', 500);
  }
}

/* Glave smejo biti Base64 v ovoju `=?base64?...?=` (2026-07-28, Value Encoding). */
function odkodirajGlavo(vrednost: string): string {
  const ujem = /^=\?base64\?(.*)\?=$/.exec(vrednost.trim());
  if (!ujem) return vrednost.trim();
  try {
    return Buffer.from(ujem[1], 'base64').toString('utf8');
  } catch {
    return vrednost.trim();
  }
}

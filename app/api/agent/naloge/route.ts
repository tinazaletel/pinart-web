import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { omejiApi } from '@/lib/rate-limit';
import { preberiJson, sporociloValidacije } from '@/lib/validacija';
import { agentKljucIzGlave, zgostiAgentKljuc } from '@/lib/agentKljuc';
import { odgovorBrezDostopa } from '@/lib/apiKljuc';
import type { Naloga } from '@/lib/naloge';

/* VHODNA POT ZA ZUNANJEGA AGENTA — ena sama stvar: ustvari nalogo.
 *
 * Ko agent (Claude Code, skripta, urnik) opravi delo, mora ostati sled tam, kjer
 * se meri čas — v Flowu, ne v klepetu. Ta pot je zato namenoma ozka: samo POST,
 * samo vpis. Ničesar ne bere, ničesar ne spreminja, ničesar ne briše. Branje
 * ima svoj vmesnik (app/api/v1, docs/API.md) in svoje ključe.
 *
 * Klicatelj NI prijavljen uporabnik — ni piškotka, ni seje. Zato:
 *   - avtentikacija teče prek ključa iz tabele `agent_kljuci` (lib/agentKljuc),
 *   - vpis gre prek service-role odjemalca, ki OBIDE RLS, kar pomeni, da je
 *     `organization_id` iz ključa edina varovalka izolacije. Nikoli ga ne jemlji
 *     iz telesa zahtevka.
 *
 * Naloga pristane v public.naloge (migracija 20260820021000) po istem vzorcu kot
 * lib/nalogeOblak: `external_id` je lokalni Naloga.id, celotna naloga gre v
 * `data` jsonb, jedrni stolpci so za poizvedbe. Zato jo Task Manager pobere ob
 * naslednji sinhronizaciji brez posebne obravnave.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* Meje vsebine. Naloga je opravilo, ne dokument — kdor rabi več, naj napiše
   opis v Flowu. Telo je omejeno že pri branju, da predolg JSON sploh ne pride
   v pomnilnik. */
const NAJVEC_TELO = 20_000;
const NAJVEC_NASLOV = 200;
const NAJVEC_OPIS = 2_000;
const NAJVEC_PROJEKT = 200;
const NAJVEC_OZNAK = 10;
const NAJVEC_OZNAKA = 40;

/* Vsaka tako nastala naloga nosi to oznako — po njej se v Task Managerju filtrira,
   kaj je naredil agent in kaj človek. Ni je mogoče izklopiti prek telesa. */
const OZNAKA_AGENT = 'agent';

/* Kanban stolpec, v katerega naloga vedno pade. Agent naloge ne zaključi; o tem,
   ali je opravljena, odloči človek. */
const STOLPEC: Naloga['stolpec'] = 'todo';

type VrsticaKljuca = {
  id: string;
  organization_id: string;
  created_by: string | null;
  revoked_at: string | null;
};

function napaka(sporocilo: string, status: number): NextResponse {
  return NextResponse.json({ napaka: sporocilo }, { status, headers: { 'Cache-Control': 'no-store' } });
}

/* due_on je stolpec tipa date. Sprejmemo izključno YYYY-MM-DD in preverimo, da
   je datum res obstoječ — "2026-02-31" ustreza vzorcu, a koledarju ne. */
function jeVeljavenRok(vrednost: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(vrednost)) return false;
  const datum = new Date(`${vrednost}T00:00:00.000Z`);
  return !Number.isNaN(datum.getTime()) && datum.toISOString().slice(0, 10) === vrednost;
}

/* Oznake: samo nizi, obrezani, brez praznih in brez podvojitev. `agent` je
   vedno zraven in vedno prva, tudi če je klicatelj ne pošlje. */
function preberiOznake(vrednost: unknown): string[] | null {
  if (vrednost === undefined || vrednost === null) return [OZNAKA_AGENT];
  if (!Array.isArray(vrednost) || vrednost.length > NAJVEC_OZNAK) return null;

  const zbrane = new Set<string>([OZNAKA_AGENT]);
  for (const surova of vrednost) {
    if (typeof surova !== 'string') return null;
    const oznaka = surova.trim();
    if (!oznaka) continue;
    if (oznaka.length > NAJVEC_OZNAKA) return null;
    zbrane.add(oznaka);
  }
  return Array.from(zbrane);
}

/**
 * POST /api/agent/naloge
 *
 * Glava:  Authorization: Bearer pf_<32 znakov>
 * Telo:   { naslov, opis?, rok?, projekt?, oznake? }
 * Odgovor: { ok: true, id, external_id }
 */
export async function POST(request: Request) {
  /* 1. OBLIKA KLJUČA — preverjena pred vsakim dotikom baze, da smeti ne pridejo
        niti do poizvedbe. Manjkajoča glava, napačna shema in napačna oblika
        dajo enak odgovor kot neznan ključ. */
  const kljuc = agentKljucIzGlave(request.headers.get('authorization'));
  if (!kljuc) return odgovorBrezDostopa();

  /* 2. OMEJITEV PO IP — pred iskanjem ključa. Pot je javna, zato bi brez tega
        vsak neuspel poskus ugibanja stal eno poizvedbo v bazo. */
  const omejitevIp = await omejiApi(request, 'agent-naloge-vhod', 120);
  if (omejitevIp) return omejitevIp;

  /* 3. ZALEDJE — klicatelj ni prijavljen, zato ni RLS konteksta in je
        service-role edina pot. Če ni nastavljen, ne odpiramo vrat (fail-closed). */
  const admin = createAdminClient();
  if (!admin) {
    console.error('Agent naloge: service-role odjemalec ni nastavljen, zavračam vpis.');
    return napaka('Storitev trenutno ni na voljo.', 503);
  }

  /* 4. KLJUČ — iskanje po UNIQUE indeksu na zgostitvi. V dnevnik gre samo
        sporočilo baze, nikoli ključ in nikoli zgostitev. */
  const { data, error } = await admin
    .from('agent_kljuci')
    .select('id, organization_id, created_by, revoked_at')
    .eq('kljuc_hash', zgostiAgentKljuc(kljuc))
    .maybeSingle();

  if (error) {
    console.error('Agent naloge: preverjanje ključa ni uspelo:', error.message);
    return napaka('Storitev trenutno ni na voljo.', 503);
  }
  const zapisKljuca = data as VrsticaKljuca | null;
  if (!zapisKljuca || zapisKljuca.revoked_at) return odgovorBrezDostopa();

  /* 5. OMEJITEV PO KLJUČU — en ključ, ena kvota, ne glede na to, od kod kliče.
        Predpona `agent:` loči ta prostor od omejitev prijavljenih uporabnikov
        in od ključev bralnega API-ja. */
  const omejitevKljuca = await omejiApi(request, 'agent-naloge-vpis', 60, `agent:${zapisKljuca.id}`);
  if (omejitevKljuca) return omejitevKljuca;

  /* 6. TELO */
  let telo: { naslov?: unknown; opis?: unknown; rok?: unknown; projekt?: unknown; oznake?: unknown };
  try {
    telo = await preberiJson(request, NAJVEC_TELO);
  } catch (e) {
    return napaka(sporociloValidacije(e), 400);
  }

  const naslov = typeof telo.naslov === 'string' ? telo.naslov.trim() : '';
  if (!naslov) return napaka('Polje "naslov" je obvezno.', 400);
  if (naslov.length > NAJVEC_NASLOV) return napaka(`Naslov je predolg (največ ${NAJVEC_NASLOV} znakov).`, 400);

  if (telo.opis !== undefined && telo.opis !== null && typeof telo.opis !== 'string') {
    return napaka('Polje "opis" mora biti besedilo.', 400);
  }
  const opis = typeof telo.opis === 'string' ? telo.opis.trim() : '';
  if (opis.length > NAJVEC_OPIS) return napaka(`Opis je predolg (največ ${NAJVEC_OPIS} znakov).`, 400);

  let rok: string | null = null;
  if (telo.rok !== undefined && telo.rok !== null && telo.rok !== '') {
    if (typeof telo.rok !== 'string' || !jeVeljavenRok(telo.rok.trim())) {
      return napaka('Polje "rok" mora biti datum v obliki YYYY-MM-DD.', 400);
    }
    rok = telo.rok.trim();
  }

  if (telo.projekt !== undefined && telo.projekt !== null && typeof telo.projekt !== 'string') {
    return napaka('Polje "projekt" mora biti besedilo.', 400);
  }
  const projekt = typeof telo.projekt === 'string' ? telo.projekt.trim() : '';
  if (projekt.length > NAJVEC_PROJEKT) return napaka(`Ime projekta je predolgo (največ ${NAJVEC_PROJEKT} znakov).`, 400);

  const oznake = preberiOznake(telo.oznake);
  if (!oznake) return napaka(`Polje "oznake" mora biti seznam besedil (največ ${NAJVEC_OZNAK}).`, 400);

  /* 7. VPIS. `external_id` je navaden UUID — enak zapis, kot ga naredi Task
        Manager sam, zato ga lib/nalogeOblak obravnava brez izjem.
        `created_by` je lastnik ključa: brez njega bi vrstica ostala brez
        avtorja in bi jo prek `sme_videti_zapis` videl samo skrbnik. */
  const externalId = randomUUID();
  const zdaj = new Date().toISOString();

  const naloga: Naloga = {
    id: externalId,
    naslov,
    stolpec: STOLPEC,
    oznake,
    created: zdaj,
    updatedAt: zdaj,
    ...(opis ? { opis } : {}),
    ...(rok ? { rok } : {}),
    ...(projekt ? { projectId: projekt } : {}),
  };

  const { data: vrstica, error: napakaVpisa } = await admin
    .from('naloge')
    .insert({
      organization_id: zapisKljuca.organization_id,
      external_id: externalId,
      created_by: zapisKljuca.created_by,
      title: naslov,
      status: STOLPEC,
      due_on: rok,
      project_external_id: projekt || null,
      data: naloga,
      updated_at: zdaj,
    })
    .select('id')
    .single();

  if (napakaVpisa || !vrstica) {
    console.error('Agent naloge: vpis ni uspel:', napakaVpisa?.message);
    return napaka('Naloge ni bilo mogoče ustvariti.', 500);
  }

  /* 8. SLED RABE. Lastnica po tem vidi, ali je ključ še v uporabi. Če zapis ne
        uspe, naloga vseeno obstaja — zato napake tu ne vračamo. */
  const { error: napakaRabe } = await admin
    .from('agent_kljuci')
    .update({ last_used_at: zdaj })
    .eq('id', zapisKljuca.id);
  if (napakaRabe) console.error('Agent naloge: zapis rabe ključa ni uspel:', napakaRabe.message);

  return NextResponse.json(
    { ok: true, id: String(vrstica.id), external_id: externalId },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

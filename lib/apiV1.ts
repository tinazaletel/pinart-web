/* JAVNI BRALNI API v1 — skupni pripomočki
   ==========================================================================
   Poti pod `app/api/v1/**` streže ZUNANJI odjemalec (integracija, MCP
   strežnik), ne prijavljen uporabnik v brskalniku. Zato:

   - avtentikacija teče prek API ključa (lib/apiKljuc), ne prek seje;
   - branje gre prek service-role odjemalca, ki OBIDE RLS — kar pomeni, da je
     filtriranje po `organization_id` ROČNO in obvezno pri VSAKI poizvedbi.
     Ena pozabljena `.eq('organization_id', ...)` pomeni, da odjemalec enega
     podjetja vidi podatke vseh. Tu ni druge varovalke.

   Ta modul namenoma NE vsebuje nobene poti, ki bi karkoli spreminjala —
   prva različica je izključno bralna (GET). To je zavestna omejitev.

   Odgovori uporabljajo slovenske ključe in vračajo `external_id` kot `id`,
   da notranji UUID-ji baze ne uhajajo ven (so uporabni samo za napad in za
   sklepanje o velikosti podatkovne baze). */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import type { SupabaseClient } from '@supabase/supabase-js';

export const PRIVZETI_LIMIT = 50;
export const NAJVECJI_LIMIT = 200;

/* Zunanji id (external_id) je lokalno ustvarjen ključ — UUID, `legacy-client-x`
   ali `p<base36>`. Omejimo obliko in dolžino, da v poizvedbo ne pride nekaj
   nesmiselno dolgega; supabase-js sicer parametrizira, a raje zavrnemo takoj. */
const OBLIKA_ZUNANJEGA_ID = /^[A-Za-z0-9_-]{1,80}$/;

export function jeVeljavenZunanjiId(vrednost: unknown): vrednost is string {
  return typeof vrednost === 'string' && OBLIKA_ZUNANJEGA_ID.test(vrednost);
}

/* Vse napake potujejo skozi to funkcijo, da odjemalec NIKOLI ne vidi
   podrobnosti baze (imena stolpcev, SQL, Postgres kode). Podrobnost gre v
   strežniški log, ven gre samo splošen slovenski stavek. */
export function napaka(sporocilo: string, status: number, podrobnost?: unknown): NextResponse {
  if (podrobnost !== undefined) {
    console.error(`API v1 (${status}): ${sporocilo}`, podrobnost instanceof Error ? podrobnost.message : podrobnost);
  }
  return NextResponse.json({ napaka: sporocilo }, { status });
}

/* Uspešen odgovor. `no-store`, ker gre za poslovne podatke enega podjetja —
   noben posrednik jih ne sme shraniti in postreči drugemu ključu. */
export function odgovor(telo: unknown): NextResponse {
  return NextResponse.json(telo, { headers: { 'Cache-Control': 'no-store' } });
}

/* Service-role odjemalec ali povedna 503. Manjkajoč ključ je napaka
   nastavitve strežnika, ne odjemalčeva — zato 503 in ne 500. */
export function adminOdjemalec(): SupabaseClient | null {
  return createAdminClient();
}

export function odgovorBrezZaledja(): NextResponse {
  return napaka('Storitev trenutno ni na voljo.', 503);
}

export type Stranicenje = { limit: number; offset: number; od: number; do: number };

/* ?limit= (privzeto 50, največ 200) in ?offset=. Nesmiselne vrednosti tiho
   pretvorimo v privzete — zunanji odjemalec naj ne dobi 400 zaradi tipkarske
   napake v številki. */
export function beriStranicenje(url: URL): Stranicenje {
  const surovLimit = Number.parseInt(url.searchParams.get('limit') || '', 10);
  const surovOffset = Number.parseInt(url.searchParams.get('offset') || '', 10);
  const limit = Number.isFinite(surovLimit) && surovLimit > 0
    ? Math.min(surovLimit, NAJVECJI_LIMIT)
    : PRIVZETI_LIMIT;
  const offset = Number.isFinite(surovOffset) && surovOffset > 0 ? surovOffset : 0;
  return { limit, offset, od: offset, do: offset + limit - 1 };
}

/* numeric(12,2) pride iz PostgREST kot število ali kot niz — poenotimo. */
export function stevilka(vrednost: unknown): number | null {
  if (vrednost === null || vrednost === undefined) return null;
  const n = typeof vrednost === 'number' ? vrednost : Number(vrednost);
  return Number.isFinite(n) ? n : null;
}

export function niz(vrednost: unknown): string | null {
  return typeof vrednost === 'string' && vrednost !== '' ? vrednost : null;
}

export type StrankaKratko = { id: string | null; ime: string | null };

/* Ponudbe/računi/projekti kažejo na stranko z NOTRANJIM uuid (client_id).
   Ta uuid ne sme ven, zato ga prevedemo v external_id + ime. Beremo samo
   stranke, ki jih trenutna stran res omenja, in vedno znotraj organizacije. */
export async function zemljevidStrank(
  admin: SupabaseClient,
  organizationId: string,
  notranjiIdji: (string | null | undefined)[],
): Promise<Map<string, StrankaKratko>> {
  const unikatni = Array.from(new Set(notranjiIdji.filter((v): v is string => typeof v === 'string' && v !== '')));
  if (!unikatni.length) return new Map();

  const { data, error } = await admin
    .from('clients')
    .select('id,external_id,name')
    .eq('organization_id', organizationId)
    .in('id', unikatni);
  if (error) throw error;

  return new Map((data || []).map(vrstica => [
    String(vrstica.id),
    { id: niz(vrstica.external_id), ime: niz(vrstica.name) } as StrankaKratko,
  ]));
}

/* Seštevki po valuti, ne en sam znesek: organizacija lahko izdaja v EUR in v
   USD hkrati in »skupaj 12.400« bi bilo v tem primeru laž. */
export function sestejPoValuti(vrstice: { amount?: unknown; currency?: unknown }[]): Record<string, number> {
  const skupaj: Record<string, number> = {};
  vrstice.forEach(vrstica => {
    const valuta = niz(vrstica.currency) || 'EUR';
    const znesek = stevilka(vrstica.amount) || 0;
    skupaj[valuta] = Math.round(((skupaj[valuta] || 0) + znesek) * 100) / 100;
  });
  return skupaj;
}

/* ---------------------------------------------------------------------------
   Stolpci in preslikave
   Naštevamo jih izrecno (nikoli `select('*')`), da nov notranji stolpec ne
   uide v javni odgovor kar sam od sebe. Seznami so tu, da se poti in podrobni
   pogled stranke ne razideta. */

export const STOLPCI_STRANKE =
  'external_id,name,email,contact_name,phone,address,tax_number,notes,created_at,updated_at';
export const STOLPCI_PROJEKTA =
  'external_id,title,status,faza,client_id,created_at,updated_at';
export const STOLPCI_PONUDBE =
  'external_id,number,title,status,issue_date,valid_until,amount,currency,client_id,created_at,updated_at';
export const STOLPCI_RACUNA =
  'external_id,number,title,status,issue_date,due_date,paid_at,issued_at,cancelled_at,amount,currency,client_id,created_at,updated_at';

type Vrstica = Record<string, unknown>;

export function oblikujStranko(v: Vrstica) {
  return {
    id: niz(v.external_id),
    ime: niz(v.name),
    email: niz(v.email),
    kontakt: niz(v.contact_name),
    telefon: niz(v.phone),
    naslov: niz(v.address),
    davcna: niz(v.tax_number),
    opombe: niz(v.notes),
    ustvarjeno: niz(v.created_at),
    posodobljeno: niz(v.updated_at),
  };
}

export function oblikujProjekt(v: Vrstica, stranka?: StrankaKratko) {
  return {
    id: niz(v.external_id),
    naslov: niz(v.title),
    status: niz(v.status),
    faza: niz(v.faza),
    strankaId: stranka?.id ?? null,
    stranka: stranka?.ime ?? null,
    ustvarjeno: niz(v.created_at),
    posodobljeno: niz(v.updated_at),
  };
}

export function oblikujPonudbo(v: Vrstica, stranka?: StrankaKratko) {
  return {
    id: niz(v.external_id),
    stevilka: niz(v.number),
    naslov: niz(v.title),
    status: niz(v.status),
    datum: niz(v.issue_date),
    veljaDo: niz(v.valid_until),
    znesek: stevilka(v.amount) ?? 0,
    valuta: niz(v.currency) || 'EUR',
    strankaId: stranka?.id ?? null,
    stranka: stranka?.ime ?? null,
    ustvarjeno: niz(v.created_at),
    posodobljeno: niz(v.updated_at),
  };
}

export function oblikujRacun(v: Vrstica, stranka?: StrankaKratko) {
  return {
    id: niz(v.external_id),
    stevilka: niz(v.number),
    naslov: niz(v.title),
    status: niz(v.status),
    datum: niz(v.issue_date),
    rokPlacila: niz(v.due_date),
    placano: niz(v.paid_at),
    izdano: niz(v.issued_at),
    preklicano: niz(v.cancelled_at),
    znesek: stevilka(v.amount) ?? 0,
    valuta: niz(v.currency) || 'EUR',
    strankaId: stranka?.id ?? null,
    stranka: stranka?.ime ?? null,
    ustvarjeno: niz(v.created_at),
    posodobljeno: niz(v.updated_at),
  };
}

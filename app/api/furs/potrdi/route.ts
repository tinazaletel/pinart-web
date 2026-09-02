import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { preberiClanstvo } from '@/lib/clanstvo';
import { omejiApi } from '@/lib/rate-limit';
import { preberiJson, sporociloValidacije } from '@/lib/validacija';
import {
  izberiFursOkolje, izracunajZoi, podatkiPotrdila, podpisiJws,
  razcleniInPreveriJws, sestaviZahtevoRacuna, vsebinaKode,
  type FursDavcnaPostavka, type FursNacinPlacila, type FursRacun,
} from '@/lib/furs';
import { posljiFurs } from '@/lib/fursHttp';
import { fursSifrirniKljuc, odsifrirajFursSkrivnost } from '@/lib/fursSkrivnosti';

import { fursNaStrezniku, FURS_V_PRIPRAVI_SL } from '@/lib/fursVklop';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Telo = { invoiceId?: string; nacinPlacila?: FursNacinPlacila; potrjenoGotovinskoPlacilo?: boolean };
type Postavka = { kolicina?: unknown; cena?: unknown; popust?: unknown; ddv?: unknown };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function varnoSporocilo(napaka: unknown): string {
  const sporocilo = napaka instanceof Error ? napaka.message : 'Davčna potrditev ni uspela.';
  return sporocilo.replace(/-----BEGIN[\s\S]*?-----END[^-]*-----/g, '[skrivnost odstranjena]').slice(0, 300);
}

function davkiIzPostavk(postavke: unknown): FursDavcnaPostavka[] {
  if (!Array.isArray(postavke)) return [];
  const skupine = new Map<number, { osnova: number; davek: number }>();
  for (const surova of postavke as Postavka[]) {
    const kolicina = Number(surova.kolicina ?? 0);
    const cena = Number(surova.cena ?? 0);
    const popust = Math.min(100, Math.max(0, Number(surova.popust ?? 0)));
    const stopnja = Number(surova.ddv ?? 0);
    if (![kolicina, cena, popust, stopnja].every(Number.isFinite)) throw new Error('Postavke računa niso veljavne.');
    if (stopnja <= 0) continue;
    const osnova = kolicina * cena * (1 - popust / 100);
    const obstojeca = skupine.get(stopnja) || { osnova: 0, davek: 0 };
    obstojeca.osnova += osnova;
    obstojeca.davek += osnova * stopnja / 100;
    skupine.set(stopnja, obstojeca);
  }
  return [...skupine.entries()].map(([stopnja, v]) => ({
    stopnja, osnova: Math.round(v.osnova * 100) / 100, davek: Math.round(v.davek * 100) / 100,
  }));
}

function preberiEor(vsebina: Record<string, unknown>): string | null {
  const odgovor = vsebina.InvoiceResponse;
  if (!odgovor || typeof odgovor !== 'object') return null;
  const eor = (odgovor as Record<string, unknown>).UniqueInvoiceID;
  return typeof eor === 'string' && UUID.test(eor) ? eor : null;
}

export async function POST(request: Request) {
  if (!fursNaStrezniku()) {
    return NextResponse.json({ napaka: FURS_V_PRIPRAVI_SL, koda: 'FURS_V_PRIPRAVI' }, { status: 503 });
  }
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ napaka: 'Prijava je potekla.' }, { status: 401 });
  const omejitev = await omejiApi(request, 'furs-potrdi', 20, user.id);
  if (omejitev) return omejitev;

  let telo: Telo;
  try { telo = await preberiJson(request, 2_000); }
  catch (napaka) { return NextResponse.json({ napaka: sporociloValidacije(napaka) }, { status: 400 }); }
  if (!telo.invoiceId || !UUID.test(telo.invoiceId)) return NextResponse.json({ napaka: 'Račun ni veljaven.' }, { status: 400 });
  if (telo.potrjenoGotovinskoPlacilo !== true || !['gotovina', 'kartica', 'drugo_gotovinsko'].includes(String(telo.nacinPlacila))) {
    return NextResponse.json({
      napaka: 'Pred davčno potrditvijo moraš izrecno potrditi gotovinski način plačila.',
      code: 'PAYMENT_CONFIRMATION_REQUIRED',
    }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ napaka: 'Strežniška baza ni nastavljena.' }, { status: 503 });
  const clanstvo = await preberiClanstvo(admin, null, user.id);
  if (!clanstvo || clanstvo.disabled_at || !['owner', 'admin', 'accounting'].includes(String(clanstvo.role))) {
    return NextResponse.json({ napaka: 'Za davčno potrditev nimaš dovoljenja.' }, { status: 403 });
  }
  const organizationId = String(clanstvo.organization_id);
  const { data: invoice, error: invoiceError } = await admin.from('invoices')
    .select('id,organization_id,status,issued_at,amount,items,fiscal_eor,fiscal_zoi,fiscal_confirmed_at,fiscal_invoice_number,fiscal_business_premise,fiscal_electronic_device')
    .eq('organization_id', organizationId).or(`id.eq.${telo.invoiceId},external_id.eq.${telo.invoiceId}`).maybeSingle();
  if (invoiceError || !invoice) return NextResponse.json({ napaka: 'Računa ni mogoče najti.' }, { status: 404 });
  if (invoice.fiscal_eor && invoice.fiscal_zoi && invoice.fiscal_confirmed_at) {
    return NextResponse.json({ potrjeno: true, zePotrjeno: true, eor: invoice.fiscal_eor, zoi: invoice.fiscal_zoi });
  }
  if (!invoice.issued_at || invoice.status === 'draft' || invoice.status === 'cancelled') {
    return NextResponse.json({ napaka: 'Davčno se lahko potrdi le izdan, nestorniran račun.' }, { status: 409 });
  }
  const { data: nastavitve } = await admin.from('furs_settings').select('*').eq('organization_id', organizationId).maybeSingle();
  if (!nastavitve) return NextResponse.json({ napaka: 'FURS nastavitve še niso pripravljene.' }, { status: 503 });
  if (!nastavitve.prostor_prijavljen_at) return NextResponse.json({ napaka: 'Poslovni prostor še ni prijavljen pri FURS.' }, { status: 409 });

  const messageId = randomUUID();
  try {
    const okolje = izberiFursOkolje(String(nastavitve.okolje), process.env.FURS_PRODUKCIJA === '1');
    const sifrirniKljuc = fursSifrirniKljuc();
    const certifikatPem = odsifrirajFursSkrivnost({
      vsebina: String(nastavitve.certifikat_sifriran), iv: String(nastavitve.certifikat_iv), oznaka: String(nastavitve.certifikat_oznaka),
    }, sifrirniKljuc);
    const zasebniKljucPem = odsifrirajFursSkrivnost({
      vsebina: String(nastavitve.kljuc_sifriran), iv: String(nastavitve.kljuc_iv), oznaka: String(nastavitve.kljuc_oznaka),
    }, sifrirniKljuc);
    const geslo = nastavitve.geslo_sifrirano ? odsifrirajFursSkrivnost({
      vsebina: String(nastavitve.geslo_sifrirano), iv: String(nastavitve.geslo_iv), oznaka: String(nastavitve.geslo_oznaka),
    }, sifrirniKljuc) : undefined;
    const { data: rezervirana, error: reserveError } = await admin.rpc('reserve_furs_invoice_number', {
      p_organization_id: organizationId, p_invoice_id: invoice.id,
    });
    if (reserveError || !rezervirana) throw new Error('FURS zaporedne številke ni mogoče rezervirati.');

    const casIzdaje = new Date(String(invoice.issued_at));
    const racun: FursRacun = {
      davcnaStevilka: String(nastavitve.davcna_stevilka), casIzdaje,
      zaporednaStevilka: String(rezervirana),
      poslovniProstor: String(invoice.fiscal_business_premise || nastavitve.poslovni_prostor),
      elektronskaNaprava: String(invoice.fiscal_electronic_device || nastavitve.elektronska_naprava),
      znesek: Number(invoice.amount), znesekPlacila: Number(invoice.amount),
      davki: davkiIzPostavk(invoice.items),
      davcnaStevilkaOperaterja: nastavitve.davcna_stevilka_operaterja || undefined,
      stevilcenje: nastavitve.struktura_stevilcenja === 'C' ? 'C' : 'B',
    };
    const zoi = izracunajZoi(racun, zasebniKljucPem, geslo);
    const zahteva = sestaviZahtevoRacuna(racun, zoi, new Date(), messageId);
    const token = podpisiJws(zahteva, podatkiPotrdila(certifikatPem), zasebniKljucPem, geslo);
    await admin.from('invoices').update({
      payment_method: telo.nacinPlacila === 'kartica' ? 'card' : telo.nacinPlacila === 'gotovina' ? 'cash' : 'other_cash',
      fiscal_attempted_at: new Date().toISOString(), fiscal_zoi: zoi,
      fiscal_error_code: null, fiscal_error_message: null,
    }).eq('id', invoice.id).eq('organization_id', organizationId);

    const odgovorToken = await posljiFurs(token, { okolje, certifikatPem, zasebniKljucPem, gesloKljuca: geslo });
    const { vsebina } = razcleniInPreveriJws(odgovorToken);
    const eor = preberiEor(vsebina);
    if (!eor) throw new Error('FURS je vrnil podpisan odgovor brez EOR.');
    const potrjenoAt = new Date().toISOString();
    const koda = vsebinaKode(zoi, racun.davcnaStevilka, casIzdaje);
    const { error: updateError } = await admin.from('invoices').update({
      fiscal_confirmed_at: potrjenoAt, fiscal_eor: eor, fiscal_zoi: zoi,
      fiscal_provider: `FURS:${okolje}`, fiscal_qr_payload: koda,
      fiscal_error_code: null, fiscal_error_message: null,
    }).eq('id', invoice.id).eq('organization_id', organizationId);
    if (updateError) throw new Error('Potrjenega računa ni mogoče varno zapisati.');
    await admin.from('furs_attempts').insert({ organization_id: organizationId, invoice_id: invoice.id, message_id: messageId, okolje, uspesno: true });
    return NextResponse.json({ potrjeno: true, eor, zoi, koda });
  } catch (napaka) {
    const sporocilo = varnoSporocilo(napaka);
    await admin.from('invoices').update({
      fiscal_attempted_at: new Date().toISOString(), fiscal_error_code: 'FURS_FAILED', fiscal_error_message: sporocilo,
    }).eq('id', invoice.id).eq('organization_id', organizationId);
    await admin.from('furs_attempts').insert({
      organization_id: organizationId, invoice_id: invoice.id, message_id: messageId,
      okolje: String(nastavitve.okolje) === 'produkcija' ? 'produkcija' : 'test',
      uspesno: false, error_code: 'FURS_FAILED', error_message: sporocilo,
    });
    return NextResponse.json({ napaka: sporocilo, code: 'FURS_FAILED' }, { status: 502 });
  }
}

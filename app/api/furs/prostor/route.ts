import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { preberiClanstvo } from '@/lib/clanstvo';
import { omejiApi } from '@/lib/rate-limit';
import { preberiJson, sporociloValidacije } from '@/lib/validacija';
import {
  izberiFursOkolje, podatkiPotrdila, podpisiJws, razcleniInPreveriJws,
  sestaviZahtevoProstora, type FursPoslovniProstor,
} from '@/lib/furs';
import { posljiFurs } from '@/lib/fursHttp';
import { fursSifrirniKljuc, odsifrirajFursSkrivnost } from '@/lib/fursSkrivnosti';

import { fursNaStrezniku, FURS_V_PRIPRAVI_SL } from '@/lib/fursVklop';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Telo = Omit<FursPoslovniProstor, 'davcnaStevilka' | 'poslovniProstor'> & { potrdiPrijavo?: boolean };

export async function POST(request: Request) {
  if (!fursNaStrezniku()) {
    return NextResponse.json({ napaka: FURS_V_PRIPRAVI_SL, koda: 'FURS_V_PRIPRAVI' }, { status: 503 });
  }
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ napaka: 'Prijava je potekla.' }, { status: 401 });
  const omejitev = await omejiApi(request, 'furs-prostor', 5, user.id);
  if (omejitev) return omejitev;
  let telo: Telo;
  try { telo = await preberiJson(request, 10_000); }
  catch (napaka) { return NextResponse.json({ napaka: sporociloValidacije(napaka) }, { status: 400 }); }
  if (telo.potrdiPrijavo !== true) return NextResponse.json({
    napaka: 'Prijavo poslovnega prostora moraš izrecno potrditi.', code: 'PREMISE_CONFIRMATION_REQUIRED',
  }, { status: 400 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ napaka: 'Strežniška baza ni nastavljena.' }, { status: 503 });
  const clanstvo = await preberiClanstvo(admin, null, user.id);
  if (!clanstvo || clanstvo.disabled_at || !['owner', 'admin'].includes(String(clanstvo.role))) {
    return NextResponse.json({ napaka: 'Za prijavo poslovnega prostora nimaš dovoljenja.' }, { status: 403 });
  }
  const organizationId = String(clanstvo.organization_id);
  const { data: nastavitve } = await admin.from('furs_settings').select('*').eq('organization_id', organizationId).maybeSingle();
  if (!nastavitve) return NextResponse.json({ napaka: 'Najprej shrani FURS nastavitve in certifikat.' }, { status: 409 });

  try {
    const okolje = izberiFursOkolje(String(nastavitve.okolje), process.env.FURS_PRODUKCIJA === '1');
    const kljuc = fursSifrirniKljuc();
    const certifikatPem = odsifrirajFursSkrivnost({
      vsebina: String(nastavitve.certifikat_sifriran), iv: String(nastavitve.certifikat_iv), oznaka: String(nastavitve.certifikat_oznaka),
    }, kljuc);
    const zasebniKljucPem = odsifrirajFursSkrivnost({
      vsebina: String(nastavitve.kljuc_sifriran), iv: String(nastavitve.kljuc_iv), oznaka: String(nastavitve.kljuc_oznaka),
    }, kljuc);
    const geslo = nastavitve.geslo_sifrirano ? odsifrirajFursSkrivnost({
      vsebina: String(nastavitve.geslo_sifrirano), iv: String(nastavitve.geslo_iv), oznaka: String(nastavitve.geslo_oznaka),
    }, kljuc) : undefined;
    const davcnaProizvajalca = process.env.FURS_DAVCNA_PROIZVAJALCA?.replace(/\D/g, '');
    if (telo.vrsta === 'premicni' && !/^\d{8}$/.test(davcnaProizvajalca || '')) {
      throw new Error('Davčna številka proizvajalca Pinart Flow ni nastavljena. Piši podpori.');
    }
    const prostor = {
      ...telo,
      ...(telo.vrsta === 'premicni' ? { davcnaStevilkaProizvajalca: davcnaProizvajalca } : {}),
      davcnaStevilka: String(nastavitve.davcna_stevilka),
      poslovniProstor: String(nastavitve.poslovni_prostor),
    } as FursPoslovniProstor;
    const messageId = randomUUID();
    const zahteva = sestaviZahtevoProstora(prostor, new Date(), messageId);
    const token = podpisiJws(zahteva, podatkiPotrdila(certifikatPem), zasebniKljucPem, geslo);
    const odgovorToken = await posljiFurs(token, { okolje, certifikatPem, zasebniKljucPem, gesloKljuca: geslo }, 'prostor');
    const { vsebina } = razcleniInPreveriJws(odgovorToken);
    if (!vsebina.BusinessPremiseResponse || typeof vsebina.BusinessPremiseResponse !== 'object') {
      throw new Error('FURS je vrnil podpisan odgovor brez potrditve poslovnega prostora.');
    }
    const prijavljenAt = new Date().toISOString();
    const { error } = await admin.from('furs_settings').update({
      prostor_prijavljen_at: prijavljenAt,
      prostor_podatki: prostor,
      updated_at: prijavljenAt,
    }).eq('organization_id', organizationId);
    if (error) throw new Error('Potrditve poslovnega prostora ni mogoče varno zapisati.');
    return NextResponse.json({ prijavljen: true, poslovniProstor: prostor.poslovniProstor, okolje });
  } catch (napaka) {
    const sporocilo = napaka instanceof Error ? napaka.message.slice(0, 300) : 'Prijava poslovnega prostora ni uspela.';
    return NextResponse.json({ napaka: sporocilo, code: 'FURS_PREMISE_FAILED' }, { status: 502 });
  }
}

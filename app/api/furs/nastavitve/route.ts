import { createSign, createVerify, X509Certificate } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { preberiClanstvo } from '@/lib/clanstvo';
import { omejiApi } from '@/lib/rate-limit';
import { preberiJson, sporociloValidacije } from '@/lib/validacija';
import { izberiFursOkolje } from '@/lib/furs';
import { fursSifrirniKljuc, sifrirajFursSkrivnost } from '@/lib/fursSkrivnosti';

import { fursNaStrezniku, FURS_V_PRIPRAVI_SL } from '@/lib/fursVklop';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Nastavitve = {
  okolje?: string;
  davcnaStevilka?: string;
  davcnaStevilkaOperaterja?: string;
  poslovniProstor?: string;
  elektronskaNaprava?: string;
  strukturaStevilcenja?: string;
  naslednjaStevilka?: number;
  certifikatPem?: string;
  zasebniKljucPem?: string;
  gesloKljuca?: string;
};

async function kontekst() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  if (!admin) return null;
  const clanstvo = await preberiClanstvo(admin, null, user.id);
  if (!clanstvo || clanstvo.disabled_at || !['owner', 'admin'].includes(String(clanstvo.role))) return null;
  return { user, admin, organizationId: String(clanstvo.organization_id) };
}

function preveriPar(certifikatPem: string, zasebniKljucPem: string, geslo?: string): X509Certificate {
  const certifikat = new X509Certificate(certifikatPem);
  const preizkus = Buffer.from('pinart-flow-furs-preizkus', 'utf8');
  const podpis = createSign('RSA-SHA256');
  podpis.update(preizkus); podpis.end();
  const rezultat = podpis.sign({ key: zasebniKljucPem, passphrase: geslo });
  const preverjanje = createVerify('RSA-SHA256');
  preverjanje.update(preizkus); preverjanje.end();
  if (!preverjanje.verify(certifikat.publicKey, rezultat)) throw new Error('Certifikat in zasebni ključ ne sodita skupaj.');
  const zdaj = Date.now();
  if (Date.parse(certifikat.validFrom) > zdaj || Date.parse(certifikat.validTo) <= zdaj) throw new Error('FURS certifikat ni veljaven ali je potekel.');
  return certifikat;
}

export async function GET(request: Request) {
  if (!fursNaStrezniku()) {
    return NextResponse.json({ napaka: FURS_V_PRIPRAVI_SL, koda: 'FURS_V_PRIPRAVI' }, { status: 503 });
  }
  const ctx = await kontekst();
  if (!ctx) return NextResponse.json({ napaka: 'Za FURS nastavitve nimaš dovoljenja.' }, { status: 403 });
  const omejitev = await omejiApi(request, 'furs-nastavitve', 30, ctx.user.id);
  if (omejitev) return omejitev;
  const { data } = await ctx.admin.from('furs_settings')
    .select('okolje,davcna_stevilka,davcna_stevilka_operaterja,poslovni_prostor,elektronska_naprava,struktura_stevilcenja,naslednja_stevilka,prostor_prijavljen_at,updated_at')
    .eq('organization_id', ctx.organizationId).maybeSingle();
  return NextResponse.json({ nastavljeno: Boolean(data), nastavitve: data || null });
}

export async function POST(request: Request) {
  if (!fursNaStrezniku()) {
    return NextResponse.json({ napaka: FURS_V_PRIPRAVI_SL, koda: 'FURS_V_PRIPRAVI' }, { status: 503 });
  }
  const ctx = await kontekst();
  if (!ctx) return NextResponse.json({ napaka: 'Za FURS nastavitve nimaš dovoljenja.' }, { status: 403 });
  const omejitev = await omejiApi(request, 'furs-nastavitve', 10, ctx.user.id);
  if (omejitev) return omejitev;
  let telo: Nastavitve;
  try { telo = await preberiJson(request, 80_000); }
  catch (napaka) { return NextResponse.json({ napaka: sporociloValidacije(napaka) }, { status: 400 }); }

  try {
    const okolje = izberiFursOkolje(telo.okolje, process.env.FURS_PRODUKCIJA === '1');
    if (!/^\d{8}$/.test(telo.davcnaStevilka || '')) throw new Error('Davčna številka mora imeti 8 številk.');
    if (telo.davcnaStevilkaOperaterja && !/^\d{8}$/.test(telo.davcnaStevilkaOperaterja)) throw new Error('Davčna številka operaterja mora imeti 8 številk.');
    if (!/^[0-9A-Za-z]{1,20}$/.test(telo.poslovniProstor || '')) throw new Error('Oznaka poslovnega prostora ni veljavna.');
    if (!/^[0-9A-Za-z]{1,20}$/.test(telo.elektronskaNaprava || '')) throw new Error('Oznaka elektronske naprave ni veljavna.');
    if (!telo.certifikatPem?.includes('BEGIN CERTIFICATE') || !telo.zasebniKljucPem?.includes('PRIVATE KEY')) throw new Error('Dodaj certifikat in zasebni ključ v PEM obliki.');
    const certifikat = preveriPar(telo.certifikatPem, telo.zasebniKljucPem, telo.gesloKljuca);
    const jeTestni = /TEST/i.test(certifikat.subject) || /Test/i.test(certifikat.issuer);
    if (okolje === 'test' && !jeTestni) throw new Error('Za testno okolje potrebuješ testni FURS certifikat.');
    if (okolje === 'produkcija' && jeTestni) throw new Error('Testnega certifikata ni dovoljeno uporabiti v produkciji.');

    const kljuc = fursSifrirniKljuc();
    const cert = sifrirajFursSkrivnost(telo.certifikatPem, kljuc);
    const zasebni = sifrirajFursSkrivnost(telo.zasebniKljucPem, kljuc);
    const geslo = telo.gesloKljuca ? sifrirajFursSkrivnost(telo.gesloKljuca, kljuc) : null;
    const { error } = await ctx.admin.from('furs_settings').upsert({
      organization_id: ctx.organizationId, okolje,
      davcna_stevilka: telo.davcnaStevilka,
      davcna_stevilka_operaterja: telo.davcnaStevilkaOperaterja || null,
      poslovni_prostor: telo.poslovniProstor,
      elektronska_naprava: telo.elektronskaNaprava,
      struktura_stevilcenja: telo.strukturaStevilcenja === 'C' ? 'C' : 'B',
      naslednja_stevilka: Number.isInteger(telo.naslednjaStevilka) && Number(telo.naslednjaStevilka) > 0 ? telo.naslednjaStevilka : 1,
      prostor_prijavljen_at: null,
      certifikat_sifriran: cert.vsebina, certifikat_iv: cert.iv, certifikat_oznaka: cert.oznaka,
      kljuc_sifriran: zasebni.vsebina, kljuc_iv: zasebni.iv, kljuc_oznaka: zasebni.oznaka,
      geslo_sifrirano: geslo?.vsebina || null, geslo_iv: geslo?.iv || null, geslo_oznaka: geslo?.oznaka || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'organization_id' });
    if (error) throw new Error('FURS nastavitev ni mogoče shraniti.');
    return NextResponse.json({ shranjeno: true, okolje, veljavenDo: certifikat.validTo });
  } catch (napaka) {
    return NextResponse.json({ napaka: napaka instanceof Error ? napaka.message.slice(0, 300) : 'Nastavitev ni uspela.' }, { status: 400 });
  }
}

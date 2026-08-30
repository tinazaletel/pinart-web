import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { kvotaZa, mejiObdobij, preveriKvoto } from '@/lib/ajpesKvota';
import { omejiApi } from '@/lib/rate-limit';
import {
  razcleniGetData,
  razcleniSeznam,
  zahtevaGetCompanyList,
  zahtevaGetData,
  type ProfipoNabor,
  type ProfipoVrstaLp,
} from '@/lib/ajpesProfipo';
import {
  izberiAjpesNaslov,
  manjkajoAjpesPoverilnice,
  preveriAjpesZahtevo,
  soapActionIzOvojnice,
  type AjpesTelo,
} from './logika';

/* AJPES proFi=Po — strežniški prehod, da poverilnici nikoli ne prideta v
   brskalnik. GetData je plačljiv, zato poleg prijave zahteva izrecno potrditev. */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const omejitev = await omejiApi(request, 'podjetja-ajpes', 20, user?.id);
  if (omejitev) return omejitev;
  if (!user) return NextResponse.json({ error: 'Prijava je obvezna.' }, { status: 401 });

  const uporabnik = process.env.AJPES_UPORABNIK;
  const geslo = process.env.AJPES_GESLO;
  if (manjkajoAjpesPoverilnice(uporabnik, geslo)) {
    return NextResponse.json({ error: 'AJPES ni nastavljen.' }, { status: 503 });
  }

  let telo: AjpesTelo;
  try {
    telo = await request.json() as AjpesTelo;
  } catch {
    return NextResponse.json({ error: 'Neveljaven zahtevek.' }, { status: 400 });
  }

  /* Stranke v Flowu matične ne hranijo — hranijo davčno. Matično zato poiščemo
     v registru (tabela `podjetja`, 294.000 vpisov z davčnimi), da uporabnici ni
     treba nikamor prepisovati številk. Register je javen in bran pod RLS z
     uporabnikovim odjemalcem, ne s service-role ključem. */
  if (!telo.maticna && typeof (telo as { davcna?: unknown }).davcna === 'string') {
    const davcna = String((telo as { davcna?: unknown }).davcna).replace(/[^0-9]/g, '');
    if (davcna.length < 8) return NextResponse.json({ error: 'Davčna številka ni veljavna.' }, { status: 400 });
    const { data: vpis } = await supabase.from('podjetja').select('maticna,ime').eq('davcna', davcna).maybeSingle();
    if (!vpis?.maticna) return NextResponse.json({ error: 'Podjetja s to davčno številko v registru ni.' }, { status: 404 });
    telo.maticna = String(vpis.maticna);
  }

  const napakaZahteve = preveriAjpesZahtevo(telo);
  if (napakaZahteve) return NextResponse.json({ error: napakaZahteve }, { status: 400 });

  const metoda = telo.metoda === 'seznam' ? 'GetCompanyList' : 'GetData';

  /* KVOTA — samo za GetData, ki porabi enoto. Seznam je zastonj in gre mimo.
     Enote so Pinartove, ne uporabnikove, zato mora meja obstajati na strežniku;
     v vmesniku bi jo bilo mogoče obiti z enim klicem iz konzole. */
  const maticna = String(telo.maticna || '').trim();
  const leto = String(telo.leto || '').trim();
  const nabor = String(telo.nabor || '').trim();
  const vrstaLp = String(telo.vrstaLp || '').trim();
  let organizationId = '';
  let zeVzeto = false;

  if (metoda === 'GetData') {
    const { data: pravice } = await supabase.rpc('current_organization_entitlements');
    const vrstica = Array.isArray(pravice) ? pravice[0] as { organization_id?: string; tier?: string } | undefined : undefined;
    organizationId = String(vrstica?.organization_id || '');
    if (!organizationId) return NextResponse.json({ error: 'Uporabnik ni v nobeni organizaciji.' }, { status: 400 });

    const { odDanes, odMeseca } = mejiObdobij(new Date());
    /* Ista kombinacija je pri AJPES-u brezplačna — če jo imamo, ne bremeni kvote. */
    const { count: zeImamo } = await supabase
      .from('ajpes_pregledi')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('maticna', maticna).eq('leto', leto).eq('nabor', nabor).eq('vrsta_lp', vrstaLp);
    zeVzeto = (zeImamo ?? 0) > 0;

    const { count: danes } = await supabase
      .from('ajpes_pregledi')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId).eq('porabljena_enota', true).gte('created_at', odDanes);
    const { count: mesec } = await supabase
      .from('ajpes_pregledi')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId).eq('porabljena_enota', true).gte('created_at', odMeseca);

    const izid = preveriKvoto(String(vrstica?.tier || 'free'), danes ?? 0, mesec ?? 0, zeVzeto);
    if (!izid.dovoljeno) {
      return NextResponse.json({ error: izid.sporocilo, razlog: izid.razlog }, { status: izid.razlog === 'paket' ? 403 : 429 });
    }
  }
  const ovojnica = metoda === 'GetCompanyList'
    ? zahtevaGetCompanyList({ uporabnik: uporabnik!, geslo: geslo! })
    : zahtevaGetData({
        uporabnik: uporabnik!,
        geslo: geslo!,
        maticna: String(telo.maticna).trim(),
        nabor: String(telo.nabor) as ProfipoNabor,
        leto: String(telo.leto),
        vrstaLp: String(telo.vrstaLp) as ProfipoVrstaLp,
      });

  let odgovor: Response;
  try {
    odgovor = await fetch(izberiAjpesNaslov(process.env.AJPES_PRODUKCIJA), {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: `"${soapActionIzOvojnice(ovojnica, metoda)}"`,
      },
      body: ovojnica,
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ error: 'Povezava z AJPES ni uspela.' }, { status: 502 });
  }

  if (!odgovor.ok) {
    return NextResponse.json({ error: 'AJPES je vrnil napako.' }, { status: 502 });
  }

  const xml = await odgovor.text();
  const rezultat = metoda === 'GetCompanyList'
    ? razcleniSeznam(xml, 'GetCompanyList')
    : razcleniGetData(xml);

  /* Porabo zapišemo šele, ko je AJPES res odgovoril s podatki. Če bi jo zapisali
     prej, bi vsaka njihova napaka uporabnici pojedla enoto, ki je ni dobila.
     Zapis gre prek service-role ključa — članu je tabela samo berljiva. */
  if (metoda === 'GetData' && organizationId && !('napaka' in rezultat && rezultat.napaka)) {
    const baza = createAdminClient();
    if (baza) {
      await baza.from('ajpes_pregledi').insert({
        organization_id: organizationId,
        user_id: user.id,
        maticna, leto, nabor, vrsta_lp: vrstaLp,
        porabljena_enota: !zeVzeto,
        povzetek: 'podjetje' in rezultat && rezultat.podjetje ? {
          naziv: rezultat.podjetje.naziv || null,
          oblika: rezultat.podjetje.oblika || null,
          blokada: rezultat.podjetje.imaBlokado,
          insolventnost: rezultat.podjetje.imaInsolvencneObjave,
          odprtRacun: rezultat.podjetje.imaOdprtRacun,
          neporavnane12m: rezultat.podjetje.neporavnaneZadnjih12m ?? null,
          kazalnikTveganja: rezultat.podjetje.kazalnikTveganja || null,
          leto: rezultat.podjetje.leto || null,
          /* Postavke letnega poročila shranimo cele, ne le izbranih treh:
             ožja shema jih ima nekaj deset, jsonb to prenese brez težav, mi pa
             se izognemo temu, da bi ob spremembi prikaza morali znova porabiti
             enoto za podatke, ki smo jih že imeli v rokah. */
          postavke: rezultat.podjetje.postavke || [],
          kazalniki: rezultat.podjetje.kazalniki || [],
          /* Izluščene tri, ki jih rabi kalkulator za ceno — da jih ni treba
             vsakič iskati po šifrantu na strani odjemalca. */
          cistiPrihodki: rezultat.podjetje.cistiPrihodki ?? null,
          cistiDobicek: rezultat.podjetje.cistiDobicek ?? null,
          zaposlenih: rezultat.podjetje.zaposlenih ?? null,
        } : null,
      });
    }
  }

  return NextResponse.json(rezultat);
}


/* Zadnji opravljeni pregled za dano davčno številko.
 *
 * Brez tega bi morala uporabnica ob vsakem odprtju stranke klikniti znova, da
 * bi sploh videla, ali je bilo kdaj preverjeno. Izid zato beremo iz evidence —
 * AJPES-a se ne dotaknemo in nobena enota se ne porabi. */
/* Koliko pregledov organizaciji ostane ta mesec. Bere isto evidenco kot
   omejevalnik, zato se števki ne moreta razhajati. */
async function stanjeKvote(supabase: ReturnType<typeof createClient>) {
  const { data: pravice } = await supabase.rpc('current_organization_entitlements');
  const vrstica = Array.isArray(pravice) ? pravice[0] as { organization_id?: string; tier?: string } | undefined : undefined;
  const organizationId = String(vrstica?.organization_id || '');
  const paket = String(vrstica?.tier || 'free');
  const kvota = kvotaZa(paket);
  if (!organizationId) return { paket, mesecno: kvota.mesec, ostanek: 0 };
  const { odMeseca } = mejiObdobij(new Date());
  const { count } = await supabase
    .from('ajpes_pregledi')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId).eq('porabljena_enota', true).gte('created_at', odMeseca);
  return { paket, mesecno: kvota.mesec, ostanek: Math.max(0, kvota.mesec - (count ?? 0)) };
}

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Prijava je obvezna.' }, { status: 401 });

  const kvota = await stanjeKvote(supabase);
  const davcna = String(new URL(request.url).searchParams.get('davcna') || '').replace(/[^0-9]/g, '');
  if (davcna.length < 8) return NextResponse.json({ pregled: null, kvota });

  const { data: vpis } = await supabase.from('podjetja').select('maticna').eq('davcna', davcna).maybeSingle();
  if (!vpis?.maticna) return NextResponse.json({ pregled: null, vRegistru: false, kvota });

  const { data } = await supabase
    .from('ajpes_pregledi')
    .select('created_at,povzetek')
    .eq('maticna', String(vpis.maticna))
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ pregled: data || null, vRegistru: true, kvota });
}

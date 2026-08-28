import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
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

  const napakaZahteve = preveriAjpesZahtevo(telo);
  if (napakaZahteve) return NextResponse.json({ error: napakaZahteve }, { status: 400 });

  const metoda = telo.metoda === 'seznam' ? 'GetCompanyList' : 'GetData';
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
  return NextResponse.json(rezultat);
}

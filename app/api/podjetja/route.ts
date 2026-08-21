import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { omejiApi } from '@/lib/rate-limit';

/* ISKALNIK PODJETIJ — Poslovni register Slovenije (AJPES prek OPSI, CC BY 4.0).
   Vrne največ 10 zadetkov za vpisani niz, da se ob dodajanju stranke ime,
   naslov in matična izpolnijo sami.

   Zakaj prek zaledja in ne neposredno iz brskalnika: tabela je berljiva samo
   prijavljenim, hkrati pa tu omejimo pogostost klicev — našepetavalnik proži
   poizvedbo ob tipkanju. */

export const dynamic = 'force-dynamic';

/* male crke brez sumnikov — enako kot stolpec iskalno ob uvozu, sicer
   »Jersinovic« ne najde »Jeršinovič« */
const poenoti = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  /* Register je JAVEN (AJPES, FURS), zato ga sme brati tudi neprijavljen
     obiskovalec brezplacnega kalkulatorja — brez tega iskalnik tam vrne prazno.
     Lastne stranke uporabnice NISO v tej tabeli in skozi to pot ne gredo.
     Neprijavljenim damo nizjo mejo, da pobiranje registra ni prakticno. */
  const omejitev = await omejiApi(request, 'podjetja-isci', user ? 120 : 30, user?.id);
  if (omejitev) return omejitev;

  const q = poenoti(String(new URL(request.url).searchParams.get('q') || '').trim());
  /* pod tremi znaki iskanje nima smisla — trigramski indeks ga ne more zožiti
     in vrnilo bi tisoče zadetkov */
  if (q.length < 3) return NextResponse.json({ zadetki: [] });

  /* Ubezimo samo nadomestna znaka za ILIKE. Vejic NE odstranjujemo —
     imena v registru so polna vejic (»Inovis, druzba za …«) in brez njih
     iskanje polnega imena ne najde nicesar. */
  const varen = q.replace(/[%_]/g, ' ');
  const { data, error } = await supabase
    .from('podjetja')
    .select('maticna,ime,naslov,posta_st,posta,davcna,ddv')
    .ilike('iskalno', `%${varen}%`)
    .limit(25);

  if (error) return NextResponse.json({ error: 'Iskanje ni uspelo.' }, { status: 500 });

  /* Kar se ZAČNE z vpisanim, gre naprej ("ino" -> Inovis pred Inoks Ratej),
     med enakovrednimi pa najprej krajše ime, ker je to praviloma matično
     podjetje in ne poslovna enota z dolgim opisom. */
  const zadetki = (data || [])
    .map(v => ({ ...v, zacetek: poenoti(String(v.ime)).startsWith(q) }))
    .sort((a, b) => (Number(b.zacetek) - Number(a.zacetek)) || (String(a.ime).length - String(b.ime).length))
    .slice(0, 10)
    .map(({ zacetek, ...ostalo }) => ostalo);

  return NextResponse.json({ zadetki });
}

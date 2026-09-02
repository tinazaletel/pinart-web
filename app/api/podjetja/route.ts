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
  /* Iscemo po BESEDAH, ne po celem nizu. Register hrani imena v svojem
     vrstnem redu ("MANCINI LUKA s.p."), uporabnik pa tipka po svoje
     ("Luka Mancini") — z enim samim %niz% ni bilo zadetka (Tina, 2. 9. 2026).
     Vsaka beseda mora biti v imenu, vrstni red pa ni pomemben. */
  const besede = varen.split(/\s+/).filter(b => b.length >= 2);
  let poizvedba = supabase
    .from('podjetja')
    .select('maticna,ime,naslov,posta_st,posta,davcna,ddv');
  for (const beseda of (besede.length ? besede : [varen])) {
    poizvedba = poizvedba.ilike('iskalno', `%${beseda}%`);
  }
  const { data, error } = await poizvedba.limit(25);

  if (error) return NextResponse.json({ error: 'Iskanje ni uspelo.' }, { status: 500 });

  /* Ujemanja SREDI besede vržemo stran.
     Poizvedba gre v bazo kot %niz%, zato je "Inovi" našel VUKAŠ-INOVI-Ć in
     VUJAS-INOVI-Ć — tehnično pravilno, uporabno pa nesmiselno (Tina, 28. 8.
     2026). Pri imenih podjetij človek vedno tipka ZAČETEK besede, ne sredine;
     prazen seznam je zato boljši od naključnih priimkov.

     Vrstni red: kar se začne z vpisanim, nato kjer se z vpisanim začne katera
     od besed, med enakovrednimi pa krajše ime — to je praviloma matično
     podjetje in ne poslovna enota z dolgim opisom. */
  const rang = (ime: string): number => {
    const p = poenoti(ime);
    if (p.startsWith(q)) return 0;
    const deli = p.split(/[^a-z0-9]+/).filter(Boolean);
    /* Vsaka vpisana beseda mora ZACETI katero od besed imena. Tako
       "luka mancini" najde "mancini luka s.p.", "inovi" pa se vedno ne
       ujame sredi "vukasinovic". */
    if (besede.length && besede.every(b => deli.some(d => d.startsWith(b)))) return 1;
    if (deli.some(d => d.startsWith(q))) return 1;
    return 2;
  };

  const zadetki = (data || [])
    .map(v => ({ ...v, r: rang(String(v.ime)) }))
    .filter(v => v.r < 2)
    .sort((a, b) => (a.r - b.r) || (String(a.ime).length - String(b.ime).length))
    .slice(0, 10)
    .map(({ r, ...ostalo }) => ostalo);

  return NextResponse.json({ zadetki });
}

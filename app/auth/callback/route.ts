import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

/* Callback za: Google OAuth, potrditev registracije in ponastavitev gesla.
   Vsaka napaka gre NAZAJ na prijavo kot ?napaka=<besedilo>, da je vidna v UI —
   prej se je vse skrilo v ?error=confirmation, ki ga obrazec ni bral, zato je
   spodletela Google prijava izgledala kot "nic se ne zgodi". */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  /* Cilj pride iz piskotka (glej AuthForm), ?next= ostaja kot rezerva za stare povezave.
     Sprejmemo samo relativne poti — "//" bi bil zunanji naslov (odprt redirect). */
  const c = await cookies();
  const izPiskotka = c.get('flow_next')?.value;
  const zeljen = (izPiskotka && decodeURIComponent(izPiskotka)) || searchParams.get('next') || '';
  const next = zeljen.startsWith('/') && !zeljen.startsWith('//') ? zeljen : '/kalkulator/pregled';

  /* Ponudnik (Google) lahko vrne napako se preden pride do kode. */
  const providerError = searchParams.get('error_description') || searchParams.get('error');
  if (providerError) {
    return NextResponse.redirect(`${origin}/kalkulator/prijava?napaka=${encodeURIComponent(providerError)}`);
  }

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const naprej = NextResponse.redirect(`${origin}${next}`);
      naprej.cookies.delete('flow_next'); // enkratna raba
      return naprej;
    }
    return NextResponse.redirect(`${origin}/kalkulator/prijava?napaka=${encodeURIComponent(error.message)}`);
  }

  return NextResponse.redirect(
    `${origin}/kalkulator/prijava?napaka=${encodeURIComponent('Povezava je potekla ali ni veljavna. Zahtevaj novo.')}`,
  );
}

import { NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/server';

/* Potrditev E-POŠTNIH povezav (ponastavitev gesla, potrditev registracije,
   sprememba e-pošte) prek `token_hash` + verifyOtp.
   Zakaj ločeno od /auth/callback: callback dela PKCE `?code=` izmenjavo, ki RABI
   isti brskalnik kot ob zahtevi — zato reset-link, odprt v drugem brskalniku/na
   drugi napravi, pade in te vrže na prijavo. token_hash tega ne rabi, zato DELUJE
   ČEZ BRSKALNIKE (uporabnik odpre mail kjerkoli).

   Supabase e-poštne predloge naj kažejo sem, npr. za ponastavitev gesla:
   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/kalkulator/geslo
   Sprejmemo samo relativne `next` poti (brez odprtega redirecta). */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const zeljen = searchParams.get('next') || '/kalkulator/pregled';
  const next = zeljen.startsWith('/') && !zeljen.startsWith('//') ? zeljen : '/kalkulator/pregled';

  if (token_hash && type) {
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      /* Seja je vzpostavljena (piškotki na tem odgovoru) -> naprej na cilj
         (npr. /kalkulator/geslo, kjer NovoGesloForm vidi sejo in ponudi novo geslo). */
      return NextResponse.redirect(`${origin}${next}`);
    }
    return NextResponse.redirect(
      `${origin}/kalkulator/prijava?napaka=${encodeURIComponent(error.message)}`,
    );
  }

  return NextResponse.redirect(
    `${origin}/kalkulator/prijava?napaka=${encodeURIComponent('Povezava je potekla ali ni veljavna. Zahtevaj novo.')}`,
  );
}

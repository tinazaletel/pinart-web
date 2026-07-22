import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { updateSession } from './utils/supabase/middleware';

const intlMiddleware = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
  /* pinartflow.com/ = Flow landing (ne studijski portfolio).
     REWRITE, ne redirect: stran se postrezi s korena, naslov ostane
     "www.pinartflow.com" brez "/flow". Preusmeritev je pisala ime izdelka
     dvakrat in dodala odboj pred nalaganjem. pinart.si ostane portfolio. */
  const host = request.headers.get('host') || '';
  if (/(^|\.)pinartflow\.com$/i.test(host) && request.nextUrl.pathname === '/') {
    const url = request.nextUrl.clone();
    /* MORA biti "/sl/flow", ne "/flow": pot je app/[locale]/flow. Privzeti jezik
       je sicer brez predpone, a ta rewrite obide next-intl, zato bi "flow"
       pristal kot vrednost [locale] (neveljaven jezik) -> 404. */
    url.pathname = '/sl/flow';
    return NextResponse.rewrite(url);
  }

  const response = intlMiddleware(request);

  /* Supabase seja tece na vsaki zahtevi. Ce Supabase pade ali env manjka, NE
     zrusimo strani — pinart.si in vse ne-Flow strani morajo delovati normalno.
     ZAKLENJENE poti pa v tem primeru NE spustimo skozi (fail-closed): prej je
     ta catch vrnil stran brez preverjanja, zato so bili pregled, dolgorocno in
     celo admin javno dostopni, ce Supabase ni odgovoril. */
  let sessionResponse = response;
  let user: Awaited<ReturnType<typeof updateSession>>['user'] = null;
  let sejaPreverjena = false;
  try {
    const r = await updateSession(request, response);
    sessionResponse = r.response;
    user = r.user;
    sejaPreverjena = true;
  } catch {
    sejaPreverjena = false;
  }

  /* Brezplacna in javna: /kalkulator (landing), /kalkulator/orodje, /prijava, /geslo, /pogoji.
     Vse ostalo je vezano na racun. */
  /* /kalkulator/admin NI na tem seznamu: to ni del Flow racuna, ampak pregled
     poslovanja. Vsebina je strezniško zascitena z geslom KALKULATOR_ADMIN_GESLO
     (piskotek pinart_admin), zato dvojna kljucavnica ni potrebna in je samo
     ovirala dostop. */
  const protectedFlowRoute = /^\/(?:sl\/|en\/)?kalkulator\/(pregled|projekti|pogodbe|racuni|stroski|stranke|cilji|ceniki|dolgorocno|racunovodstvo|profil|cas|poslovni-nacrt|nastavitve|pomoc|paket)(?:\/|$)/.test(request.nextUrl.pathname);

  if (protectedFlowRoute && (!sejaPreverjena || !user)) {
    const localePrefix = request.nextUrl.pathname.startsWith('/en/') ? '/en' : '';
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = `${localePrefix}/kalkulator/prijava`;
    loginUrl.search = '';
    loginUrl.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);
    const redirect = NextResponse.redirect(loginUrl);
    sessionResponse.cookies.getAll().forEach(cookie => redirect.cookies.set(cookie));
    return redirect;
  }

  return sessionResponse;
}

export const config = {
  // skip api/internal/static assets
  matcher: ['/((?!api|auth|_next|_vercel|favicon.ico|.*\\..*).*)']
};

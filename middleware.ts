import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { updateSession } from './utils/supabase/middleware';

const intlMiddleware = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
  const response = intlMiddleware(request);
  const { response: sessionResponse, user } = await updateSession(request, response);
  const protectedFlowRoute = /^\/(?:sl\/|en\/)?kalkulator\/(pregled|projekti|pogodbe|racuni|stroski|stranke|cilji|ceniki|dolgorocno|racunovodstvo)(?:\/|$)/.test(request.nextUrl.pathname);

  if (protectedFlowRoute && !user) {
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

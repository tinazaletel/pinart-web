import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { updateSession } from './utils/supabase/middleware';
import { jeTester } from './lib/testerji';
import { aktivnaDodelitev, dodelitevOdklene } from './lib/dostop';

const intlMiddleware = createMiddleware(routing);

/* Pred-launch: pinartflow.com je javno ZAPRT z geslom (Basic Auth). Dokler
   geslo (SITE_GESLO) ni nastavljeno, se pokaze "Kmalu" stran. pinart.si
   (portfolio), Vercel preview in localhost NISO prizadeti. */
const KMALU_HTML = `<!doctype html>
<html lang="sl"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Pinart Flow — kmalu</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{min-height:100svh;display:grid;place-items:center;padding:2rem;
    font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;color:#26211f;
    background:radial-gradient(120% 90% at 50% -10%, #efe9fb, #f6f4ef 62%)}
  .w{max-width:34rem;text-align:center}
  .ey{display:inline-flex;align-items:center;gap:.55rem;font-size:.76rem;font-weight:800;
    letter-spacing:.24em;text-transform:uppercase;color:#7c3aed;margin-bottom:1.6rem}
  .dot{width:8px;height:8px;border-radius:50%;background:#7c3aed;box-shadow:0 0 0 6px rgba(124,58,237,.14)}
  h1{font-family:Georgia,"Times New Roman",serif;font-weight:500;font-size:clamp(2.6rem,9vw,4.4rem);
    line-height:1.03;letter-spacing:-.01em;margin-bottom:1.1rem}
  h1 em{font-style:italic}
  p{font-size:1.02rem;line-height:1.6;color:#5c5650;max-width:27rem;margin:0 auto 2rem}
  a{display:inline-flex;align-items:center;gap:.45rem;font-weight:700;color:#26211f;text-decoration:none;
    border:1px solid rgba(38,33,31,.16);border-radius:999px;padding:.72rem 1.35rem;font-size:.92rem}
  a:hover{background:rgba(255,255,255,.65)}
</style></head><body>
<div class="w">
  <div class="ey"><span class="dot"></span>Pinart Flow</div>
  <h1>Nekaj lepega <em>nastaja.</em></h1>
  <p>Orodje za samostojne kreativce — poštene cene, ponudbe, projekti in AI asistentka Pupa. Kmalu na voljo.</p>
  <a href="mailto:tina@pinart.si">Piši nam &rarr;</a>
</div>
</body></html>`;

/* Zaklenjena stran (401 telo) — z jorkijem, ista znamka kot Flow 404. Prikaze se
   za geslo-oknom / ce ga uporabnik preklice. Slika je staticna (.png), zato jo
   matcher spusti mimo middlewara. */
const ZAKLENJENO_HTML = `<!doctype html>
<html lang="sl"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Pinart Flow — zaprta beta</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{min-height:100svh;position:relative;overflow:hidden;background:#f4f4f3;color:#26211f;
    font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
  .slika{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:74% 62%;z-index:0}
  .scrim{position:absolute;inset:0;z-index:1;background:linear-gradient(100deg,#f4f4f3 26%,rgba(244,244,243,.72) 44%,rgba(244,244,243,0) 62%)}
  .w{position:relative;z-index:2;max-width:1180px;margin:0 auto;min-height:100svh;display:flex;flex-direction:column;
    justify-content:center;align-items:flex-start;padding:2.5rem clamp(1.5rem,5vw,5rem)}
  .ey{display:inline-flex;align-items:center;gap:.55rem;font-size:.76rem;font-weight:800;letter-spacing:.22em;
    text-transform:uppercase;color:#7c3aed;margin-bottom:1.2rem}
  .dot{width:8px;height:8px;border-radius:50%;background:#7c3aed;box-shadow:0 0 0 6px rgba(124,58,237,.14)}
  h1{font-family:Georgia,"Times New Roman",serif;font-weight:500;font-size:clamp(2.2rem,6.5vw,3.6rem);
    line-height:1.04;letter-spacing:-.01em;margin-bottom:.85rem}
  h1 em{font-style:italic;color:#7c3aed}
  p{font-size:1.02rem;line-height:1.55;color:#5c5650;max-width:32ch}
</style></head><body>
<img class="slika" src="/flow/jorki-404.png" alt="" aria-hidden="true">
<div class="scrim"></div>
<div class="w">
  <div class="ey"><span class="dot"></span>Pinart Flow</div>
  <h1>Zaprta <em>beta.</em></h1>
  <p>Flow je za zdaj na povabilo. Vpiši geslo v okno brskalnika za vstop — ali nam piši na tina@pinart.si za dostop.</p>
</div>
</body></html>`;

function gesloVeljavno(auth: string, geslo: string): boolean {
  if (!auth.startsWith('Basic ')) return false;
  try {
    const dekodirano = atob(auth.slice(6));
    return dekodirano.slice(dekodirano.indexOf(':') + 1) === geslo;
  } catch {
    return false;
  }
}

export default async function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const jePinartflow = /(^|\.)pinartflow\.com$/i.test(host);
  const jeFlowPot = /^\/(?:sl\/|en\/)?(?:flow|kalkulator)(?:\/|$)/.test(request.nextUrl.pathname);

  /* Pred-launch geslo-zid — skrijemo VES Flow do launcha:
       - pinartflow.com: cela domena;
       - druge domene (pinart.si ...): SAMO Flow poti (/flow, /kalkulator); portfolio ostane odprt.
     Brez SITE_GESLO se pinartflow pokaze kot "Kmalu"; Flow poti drugod (dev/localhost brez
     gesla) pa NE blokiramo, da razvoj tece normalno. */
  if (jePinartflow || jeFlowPot) {
    const geslo = process.env.SITE_GESLO;
    if (!geslo) {
      if (jePinartflow) {
        return new NextResponse(KMALU_HTML, {
          status: 200,
          headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store, max-age=0' },
        });
      }
      /* Flow pot na drugih domenah brez nastavljenega gesla (npr. localhost) = odprto. */
    } else if (!gesloVeljavno(request.headers.get('authorization') || '', geslo)) {
      return new NextResponse(ZAKLENJENO_HTML, {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="Pinart Flow (zaprta beta)"',
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'no-store, max-age=0',
        },
      });
    }
    /* geslo pravilno -> pade skozi na obicajno logiko */
  }

  /* pinartflow.com/ = Flow landing (ne studijski portfolio).
     REWRITE, ne redirect: stran se postrezi s korena, naslov ostane
     "www.pinartflow.com" brez "/flow". Preusmeritev je pisala ime izdelka
     dvakrat in dodala odboj pred nalaganjem. pinart.si ostane portfolio. */
  if (jePinartflow && request.nextUrl.pathname === '/') {
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
  let supabase: Awaited<ReturnType<typeof updateSession>>['supabase'] | null = null;
  let sejaPreverjena = false;
  try {
    const r = await updateSession(request, response);
    sessionResponse = r.response;
    user = r.user;
    supabase = r.supabase;
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

  /* Zaprta beta: uporabnik JE prijavljen, a nima dostopa (ni na env seznamu IN
     nima aktivne dodelitve v bazi) -> preusmerimo na razlagalno stran (dostop
     po vabilu). Landing, kalkulator in prijava ostanejo javni. Env seznam je
     varovalka (Tina), da zaklep deluje tudi ce baza pade. */
  if (protectedFlowRoute && sejaPreverjena && user) {
    let dovoljen = jeTester(user.email);
    if (!dovoljen && supabase) {
      try {
        dovoljen = dodelitevOdklene(await aktivnaDodelitev(supabase, user.email));
      } catch {
        dovoljen = false;
      }
    }
    if (!dovoljen) {
      const localePrefix = request.nextUrl.pathname.startsWith('/en/') ? '/en' : '';
      const betaUrl = request.nextUrl.clone();
      betaUrl.pathname = `${localePrefix}/kalkulator/beta`;
      betaUrl.search = '';
      const redirect = NextResponse.redirect(betaUrl);
      sessionResponse.cookies.getAll().forEach(cookie => redirect.cookies.set(cookie));
      return redirect;
    }
  }

  return sessionResponse;
}

export const config = {
  // skip api/internal/static assets
  matcher: ['/((?!api|auth|_next|_vercel|favicon.ico|.*\\..*).*)']
};

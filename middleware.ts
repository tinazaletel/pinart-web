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
/* Zaklenjeni zaslon govori jezik obiskovalca: kdor pride na /en, ne sme
   naleteti na slovenscino (Tina, 25. 8.). */
const zaklenjenoHtml = (en: boolean) => `<!doctype html>
<html lang="${en ? 'en' : 'sl'}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${en ? 'Pinart Flow — in testing' : 'Pinart Flow — v testiranju'}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{min-height:100svh;position:relative;overflow-x:hidden;background:#f4f4f3;color:#26211f;
    font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
  .slika{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:74% 62%;z-index:0}
  .scrim{position:absolute;inset:0;z-index:1;background:linear-gradient(100deg,#f4f4f3 30%,rgba(244,244,243,.8) 50%,rgba(244,244,243,0) 68%)}
  .w{position:relative;z-index:2;max-width:1180px;margin:0 auto;min-height:100svh;display:flex;flex-direction:column;
    justify-content:center;align-items:flex-start;padding:3rem clamp(1.5rem,5vw,5rem)}
  .ey{display:inline-flex;align-items:center;gap:.55rem;font-size:.76rem;font-weight:800;letter-spacing:.22em;
    text-transform:uppercase;color:#7c3aed;margin-bottom:1.1rem}
  .pika{width:8px;height:8px;border-radius:50%;background:#7c3aed;box-shadow:0 0 0 6px rgba(124,58,237,.14)}
  h1{font-family:Georgia,"Times New Roman",serif;font-weight:500;font-size:clamp(2.1rem,6vw,3.4rem);
    line-height:1.05;letter-spacing:-.01em;margin-bottom:.8rem}
  h1 em{font-style:italic;color:#7c3aed}
  .uvod{font-size:1.02rem;line-height:1.6;color:#5c5650;max-width:38ch;margin-bottom:1.6rem}
  .kalk{display:inline-flex;align-items:center;gap:.5rem;padding:.85rem 1.4rem;border-radius:999px;
    background:#26211f;color:#faf7f2;font-weight:700;font-size:.9rem;text-decoration:none;margin-bottom:2.2rem}
  .kalk:hover{transform:translateY(-1px)}
  .kartica{width:100%;max-width:26rem;background:rgba(255,255,255,.72);backdrop-filter:blur(14px);
    border:1px solid rgba(255,255,255,.7);border-radius:1.1rem;padding:1.2rem 1.25rem;
    box-shadow:0 10px 30px rgba(40,30,60,.08)}
  .kartica h2{font-size:.98rem;font-weight:750;margin-bottom:.3rem}
  .kartica p{font-size:.86rem;line-height:1.5;color:#5c5650;margin-bottom:.85rem}
  .geslo-ovoj{position:relative;display:block}
  .geslo-ovoj input{width:100%;box-sizing:border-box;padding-right:2.9rem}
  .geslo-ovoj button{position:absolute;right:.35rem;top:50%;transform:translateY(-50%);
    display:grid;place-items:center;width:2.2rem;height:2.2rem;margin:0;padding:0;
    border:none;background:none;color:rgba(17,17,17,.55);cursor:pointer}
  .geslo-ovoj button:hover{color:#111}
  .nazaj{display:inline-block;margin-bottom:1.2rem;font-size:.9rem;font-weight:600;color:rgba(17,17,17,.72);text-decoration:none}
  .nazaj:hover{color:#111}
  .se-ne{margin-top:1.1rem;padding-top:1rem;border-top:1px solid rgba(17,17,17,.12);text-align:center}
  .se-ne p{margin:0 0 .6rem;font-size:.9rem;color:rgba(17,17,17,.7)}
  .se-ne button{background:transparent;color:#111;border:1px solid rgba(17,17,17,.35)}
  label{display:block;font-size:.68rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;
    color:#6b655d;margin-bottom:.25rem}
  input{width:100%;padding:.7rem .85rem;border:1px solid rgba(17,17,17,.14);border-radius:.7rem;
    background:#fff;font:500 .92rem inherit;color:#26211f;margin-bottom:.7rem}
  input:focus{outline:none;border-color:#7c3aed;box-shadow:0 0 0 3px rgba(124,58,237,.18)}
  button{width:100%;padding:.75rem 1rem;border:0;border-radius:999px;background:#7c3aed;color:#fff;
    font:800 .86rem inherit;cursor:pointer}
  button:disabled{opacity:.55;cursor:default}
  .sporocilo{margin-top:.6rem;font-size:.84rem;font-weight:600;line-height:1.45}
  .ok{color:#2F5D50}.napaka{color:#a4342a}
  .geslo{margin-top:1rem;padding-top:.9rem;border-top:1px solid rgba(17,17,17,.09)}
  .geslo summary{font-size:.82rem;font-weight:700;color:#6b655d;cursor:pointer}
  .geslo form{margin-top:.7rem}
  .geslo button{background:#26211f}
  @media (max-width:640px){ .scrim{background:linear-gradient(180deg,#f4f4f3 42%,rgba(244,244,243,.86) 100%)} }
</style></head><body>
<img class="slika" src="/flow/jorki-404.png" alt="" aria-hidden="true">
<div class="scrim"></div>
<div class="w">
  <div class="ey"><span class="pika"></span>Pinart Flow</div>
  <a class="nazaj" href="${en ? '/en' : '/'}">&larr; ${en ? 'Back to the overview' : 'Nazaj na predstavitev'}</a>
  <h1>${en ? 'Just <em>final testing</em> left.' : 'Še <em>zadnje teste</em> delamo.'}</h1>
  <p class="uvod">${en ? 'Flow is in final testing and launches in early September. Until then the free calculator is open to everyone, with no account and no sign-in.' : 'Flow je v zaključnem testiranju in pride na trg predvidoma v začetku septembra. Do takrat je brezplačni kalkulator odprt za vse — brez računa in brez prijave.'}</p>
  <a class="kalk" href="${en ? '/en' : ''}/kalkulator/orodje">${en ? 'Try the free calculator' : 'Preizkusi brezplačni kalkulator'} &rarr;</a>

  <div class="kartica">
    <h2>${en ? 'Tester sign-in' : 'Vstop za testerje'}</h2>
    <p>${en ? 'Enter the password we sent you.' : 'Vpiši geslo, ki si ga dobil/-a od nas.'}</p>
    <form id="vstop">
      <label for="geslo">${en ? 'Password' : 'Geslo'}</label>
      <span class="geslo-ovoj">
        <input id="geslo" name="geslo" type="password" autocomplete="current-password" required maxlength="200">
        <button type="button" id="okoGesla" aria-label="${en ? 'Show password' : 'Pokaži geslo'}">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z"/><circle cx="12" cy="12" r="2.6"/><path id="okoCrta" d="m4 20 16-16"/>
          </svg>
        </button>
      </span>
      <button type="submit">${en ? 'Sign in' : 'Prijavi se'}</button>
      <p class="sporocilo" id="odzivGeslo" role="status"></p>
    </form>

    <div class="se-ne">
      <p>${en ? 'Not a tester yet?' : 'Še nisi tester?'}</p>
      <button type="button" id="odpriPrijavo">${en ? 'Apply to test' : 'Prijavi se za testiranje'}</button>
    </div>

    <form id="prijava" hidden>
      <label for="pime">${en ? 'Name' : 'Ime'}</label>
      <input id="pime" name="ime" autocomplete="name" required maxlength="200">
      <label for="pemail">${en ? 'Email' : 'E-naslov'}</label>
      <input id="pemail" name="email" type="email" autocomplete="email" required maxlength="200">
      <button type="submit">${en ? 'Send application' : 'Pošlji prijavo'}</button>
      <p class="sporocilo" id="odziv" role="status"></p>
    </form>
  </div>
</div>
<script>
(function(){
  function poslji(url, telo){
    return fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(telo)})
      .then(function(r){ return r.json().then(function(d){ return {ok:r.ok, d:d}; }); });
  }
  var odpri = document.getElementById('odpriPrijavo');
  odpri.addEventListener('click', function(){
    var f = document.getElementById('prijava');
    f.hidden = false; odpri.parentNode.hidden = true; f.querySelector('input').focus();
  });
  var pf = document.getElementById('prijava'), po = document.getElementById('odziv');
  pf.addEventListener('submit', function(e){
    e.preventDefault();
    var g = pf.querySelector('button'); g.disabled = true; po.textContent = ''; po.className = 'sporocilo';
    poslji('/api/beta', {dejanje:'prijava', ime: pf.ime.value, email: pf.email.value})
      .then(function(r){
        if(r.ok){ pf.reset(); po.className='sporocilo ok'; po.textContent=${en ? "'Thank you! We will be in touch at this address.'" : "'Hvala! Javimo se ti na ta naslov.'"}; }
        else { po.className='sporocilo napaka'; po.textContent = (r.d && r.d.napaka) || ${en ? "'Sign-up failed.'" : "'Prijava ni uspela.'"}; }
      })
      .catch(function(){ po.className='sporocilo napaka'; po.textContent=${en ? "'No connection. Try again.'" : "'Ni povezave. Poskusi znova.'"}; })
      .then(function(){ g.disabled = false; });
  });
  var oko = document.getElementById('okoGesla');
  oko.addEventListener('click', function(){
    var g = document.getElementById('geslo'), crta = document.getElementById('okoCrta');
    var skrito = g.type === 'password';
    g.type = skrito ? 'text' : 'password';
    crta.style.display = skrito ? 'none' : '';
    g.focus();
  });
  var vf = document.getElementById('vstop'), vo = document.getElementById('odzivGeslo');
  vf.addEventListener('submit', function(e){
    e.preventDefault();
    var g = vf.querySelector('button'); g.disabled = true; vo.textContent = ''; vo.className='sporocilo';
    poslji('/api/beta', {dejanje:'geslo', geslo: vf.geslo.value})
      .then(function(r){
        if(r.ok){ location.reload(); }
        else { vo.className='sporocilo napaka'; vo.textContent='Geslo ni pravilno.'; g.disabled = false; }
      })
      .catch(function(){ vo.className='sporocilo napaka'; vo.textContent='Ni povezave.'; g.disabled = false; });
  });
})();
</script>
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

  /* JAVNI DEL (21. 8. 2026): pred zagonom odpremo predstavitev, brezplacni
     kalkulator, pravne strani, vgradljiv obrazec in portal za stranko —
     odvetnik, AJPES in prvi obiskovalci morajo do njih brez gesla.
     Aplikacija (projekti, stranke, racuni, Pupa, nastavitve) ostane zaklenjena.
     Seznam je NAMENOMA popoln in ozek: kar ni tu, je zaprto. */
  /* STIKALO: ko je false, je pinartflow.com spet cel za geslom. Seznam poti
     spodaj ostane, da je ponovno odprtje ena beseda in ne nova presoja.
     Zaprto 21. 8. 2026 na Tinino zahtevo — cenovni izracun se ni pravilen in
     obiskovalec ne sme videti napacnih stevilk. */
  /* ODPRTO 25. 8. 2026 na Tinino odlocitev: stran gre v eter z brezplacnim
     kalkulatorjem — odvetnik, tehnoloski park in prvi obiskovalci morajo do
     javnega dela brez gesla. Aplikacija ostane zaklenjena (beta). */
  const ODPRT_JAVNI_DEL = true;
  const pot = request.nextUrl.pathname.replace(/^\/(?:sl|en)(?=\/|$)/, '') || '/';
  const jeJavnaPot =
    pot === '/'
    || pot === '/kalkulator'
    || pot === '/kalkulator/orodje'
    || pot === '/kalkulator/pogoji'
    || pot === '/zasebnost'
    || pot === '/dostopnost'
    || pot === '/ai-politika'
    || /^\/povprasevanje(?:\/|$)/.test(pot)
    || /^\/p\//.test(pot)
    || pot === '/obvescanje';

  /* Pred-launch geslo-zid — skrijemo VES Flow do launcha:
       - pinartflow.com: cela domena;
       - druge domene (pinart.si ...): SAMO Flow poti (/flow, /kalkulator); portfolio ostane odprt.
     Brez SITE_GESLO se pinartflow pokaze kot "Kmalu"; Flow poti drugod (dev/localhost brez
     gesla) pa NE blokiramo, da razvoj tece normalno. */
  /* Potrditev in odjava od obvescanja gresta MIMO zaklepa, vedno — tudi ko je
     pinartflow cel za geslom. Povezava iz pisemca, ki zadene geslo, pomeni
     odjavo, ki je ni mogoce izvesti; to je huje od tega, da odjave ne bi
     ponujali. Stran nima nicesar obcutljivega: pove le izid klika. */
  const jeObvescanje = pot === '/obvescanje';
  if ((jePinartflow || jeFlowPot) && !jeObvescanje && !(ODPRT_JAVNI_DEL && jeJavnaPot)) {
    const geslo = process.env.SITE_GESLO;
    if (!geslo) {
      if (jePinartflow) {
        return new NextResponse(KMALU_HTML, {
          status: 200,
          headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store, max-age=0' },
        });
      }
      /* Flow pot na drugih domenah brez nastavljenega gesla (npr. localhost) = odprto. */
    } else {
      /* Piskotek 'flow_gate' pomeni, da je ta brskalnik ze vpisal pravilno geslo.
         Brez njega je bil Basic Auth edini gate — a brskalnikovo geslo-okno se je ob
         Google OAuth preusmeritvi sprozilo DRUGIC. S piskotkom vprasamo SAMO enkrat. */
      const cookieOk = request.cookies.get('flow_gate')?.value === geslo;
      const authOk = gesloVeljavno(request.headers.get('authorization') || '', geslo);
      if (!cookieOk && !authOk) {
        return new NextResponse(zaklenjenoHtml(request.nextUrl.pathname.startsWith('/en')), {
          status: 401,
          headers: {
            'content-type': 'text/html; charset=utf-8',
            'cache-control': 'no-store, max-age=0',
          },
        });
      }
      if (authOk && !cookieOk) {
        /* Prvic pravilno geslo prek Basic Auth -> nastavi piskotek in preusmeri na
           isti URL, da naprej (tudi po Google-preusmeritvi) NE sprasuje vec. */
        const res = NextResponse.redirect(request.nextUrl.clone());
        res.cookies.set('flow_gate', geslo, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 });
        return res;
      }
      /* cookieOk -> pade skozi brez ponovnega vprasanja */
    }
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
    /* CLAN EKIPE ima dostop tudi brez lastne dodelitve: ce ga je lastnik povabil
       in je vabilo sprejel, ga zaprta beta ne sme ustaviti — sicer sprejme vabilo,
       postane clan, nato pa ga vrata vrzejo na "Flow je se v zaprti beti".
       Dostop clana zivi od organizacije (in njenega paketa), ne od seznama testerjev. */
    if (!dovoljen && supabase) {
      try {
        const { data: clanstvo } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', user.id)
          .limit(1);
        dovoljen = Array.isArray(clanstvo) && clanstvo.length > 0;
      } catch {
        /* ce poizvedba pade, ostane dovoljen = false (zaklep drzi) */
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

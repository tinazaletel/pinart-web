import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { omejiApi } from '@/lib/rate-limit';
import { preberiJson, sporociloValidacije } from '@/lib/validacija';
import { posiljatelj } from '@/lib/posiljatelj';
import { createAdminClient } from '@/utils/supabase/admin';

/* VSTOP V ZAPRTO BETO in PRIJAVA TESTERJEV.
 *
 * Tina, 21. 8. 2026: brskalnikovo okno »Sign in to www.pinartflow.com:443« je
 * bilo prvo, kar je videl obiskovalec — brez pojasnila, brez izhoda, brez
 * imena izdelka. Tak zaslon ne pove niti, da izdelek obstaja.
 *
 * Zato ta pot naredi dvoje:
 *  - `dejanje: 'geslo'` — tester vpise geslo v NASEM obrazcu; ce je pravilno,
 *    dobi piskotek in vstopi. Basic Auth glave ne posiljamo vec, zato
 *    brskalnikovo okno ne skoci.
 *  - `dejanje: 'prijava'` — kdor gesla nima, pusti ime in e-naslov. To je
 *    vrednejse od zaprtih vrat: iz obiskovalca nastane seznam ljudi, ki jih
 *    zanima, in Tina ve, kdo je prisel.
 *
 * Odgovor je NAMENOMA enak pri napacnem geslu ne glede na razlog, da se z
 * ugibanjem ne da ugotavljati, ali geslo sploh obstaja.
 */

export const dynamic = 'force-dynamic';

const MAX = 200;

export async function POST(request: Request) {
  /* Omejitev po IP, ne po uporabniku — tu prijavljenega uporabnika se ni. */
  const omejitev = await omejiApi(request, 'beta-vstop', 20);
  if (omejitev) return omejitev;

  let telo: { dejanje?: unknown; geslo?: unknown; ime?: unknown; email?: unknown; jezik?: unknown };
  try { telo = await preberiJson(request, 4_000); }
  catch (error) { return NextResponse.json({ napaka: sporociloValidacije(error) }, { status: 400 }); }

  /* ── VSTOP Z GESLOM ──────────────────────────────────────────────────── */
  if (telo.dejanje === 'geslo') {
    const vpisano = typeof telo.geslo === 'string' ? telo.geslo : '';
    const pravo = process.env.SITE_GESLO || '';
    if (!pravo || !vpisano || vpisano.length > MAX || vpisano !== pravo) {
      return NextResponse.json({ napaka: 'Geslo ni pravilno.' }, { status: 401 });
    }
    const res = NextResponse.json({ ok: true });
    res.cookies.set('flow_gate', pravo, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 });
    return res;
  }

  /* ── PRIJAVA ZA TESTIRANJE ───────────────────────────────────────────── */
  const ime = typeof telo.ime === 'string' ? telo.ime.trim().slice(0, MAX) : '';
  const email = typeof telo.email === 'string' ? telo.email.trim().slice(0, MAX) : '';
  if (!ime || !/^[^@\s]+@[^@\s.]+\.[^@\s]{2,}$/.test(email)) {
    return NextResponse.json({ napaka: 'Vpiši ime in veljaven e-naslov.' }, { status: 400 });
  }

  /* Jezik strani, s katere se je prijavil (/en/... => 'en'). Brez tega bi
     navodila ob sprejemu vedno prisla v slovenscini, tudi tujejezicnemu
     obiskovalcu (Tina, 3. 9. 2026). Vrednost, ki je ne prepoznamo, pade na 'sl'. */
  const jezik = telo.jezik === 'en' ? 'en' : 'sl';

  const kljuc = process.env.RESEND_API_KEY;
  if (!kljuc) {
    /* Brez posiljanja prijave ne izgubimo tiho — povemo, kam naj pisejo. */
    console.error('Prijava testerja ni bila poslana (manjka RESEND_API_KEY):', email);
    return NextResponse.json({ napaka: 'Prijave trenutno ne moremo sprejeti. Piši nam na tina@pinart.si.' }, { status: 503 });
  }

  /* Prijavo najprej ZAPISEMO, sele nato posljemo mail. Mail se lahko izgubi
     med neprebranimi, zapis pa ostane — v adminu je seznam, kdo caka
     (Tina, 2. 9. 2026). Ce zapis ne uspe, prijave ne zavrnemo: mail je se
     vedno boljsi od nicesar. */
  try {
    const admin = createAdminClient();
    if (admin) await admin.from('beta_prijave').upsert(
      { ime, email, stanje: 'prijavljen', prijavljen: new Date().toISOString(), jezik },
      { onConflict: 'email' },
    );
  } catch (napaka) {
    console.error('Prijave testerja ni bilo mogoce zapisati:', napaka);
  }

  try {
    const resend = new Resend(kljuc);
    const { error } = await resend.emails.send({
      from: posiljatelj(),
      to: 'tina@pinart.si',
      replyTo: email,
      subject: `Prijava za testiranje — ${ime}`,
      text: `Ime: ${ime}\nE-naslov: ${email}\n\nPrijavljeno prek strani zaprte bete.`,
    });
    if (error) throw new Error(String(error.message || error));
  } catch (napaka) {
    console.error('Prijava testerja ni bila poslana:', napaka);
    return NextResponse.json({ napaka: 'Prijave trenutno ne moremo sprejeti. Piši nam na tina@pinart.si.' }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}

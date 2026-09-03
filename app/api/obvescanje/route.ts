import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { Resend } from 'resend';
import { omejiApi } from '@/lib/rate-limit';
import { jeEmail, omejenNiz, preberiJson, sporociloValidacije } from '@/lib/validacija';
import { odgovorNaslov, posiljatelj } from '@/lib/posiljatelj';
import { createAdminClient } from '@/utils/supabase/admin';
import { normalizirajEmail, potrditvenoPisemce, ustvariZeton } from '@/lib/obvescanje';

/* PRIJAVA NA OBVESCANJE — dvojna privolitev.
 *
 * Prej je prijava padla v isti Google Sheet kot povprasevanja, odjava pa je
 * pocistila samo brskalnik — naslov je ostal pri nas. Zdaj:
 *   1. zapisemo NEPOTRJENO prijavo,
 *   2. posljemo pisemce s povezavo,
 *   3. seznam za posiljanje nastane sele ob kliku.
 *
 * Brez CAPTCHE. Skrito polje (honeypot) + omejitev hitrosti + potrditev prek
 * maila so za ta primer mocnejsi in ne dodajo novega podobdelovalca.
 *
 * Odgovor je NAMENOMA vedno enak: kdor vpisuje tuje naslove, iz njega ne sme
 * izvedeti, ali je nekdo na seznamu ali ne. */

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const omejitev = await omejiApi(request, 'obvescanje-prijava', 5);
  if (omejitev) return omejitev;

  let telo: Record<string, unknown>;
  try { telo = await preberiJson(request, 4_000); }
  catch (error) { return NextResponse.json({ napaka: sporociloValidacije(error) }, { status: 400 }); }

  /* Skrito polje: clovek ga ne vidi, bot ga izpolni. Odgovor je enak kot pri
     uspehu, da bot ne izve, da je bil zavrnjen. */
  if (telo.website) return NextResponse.json({ ok: true });

  if (!jeEmail(telo.email) || !omejenNiz(telo.ime, 120, true)) {
    return NextResponse.json({ napaka: 'Vpisi veljaven e-naslov.' }, { status: 400 });
  }

  const email = normalizirajEmail(String(telo.email));
  const jezik = telo.jezik === 'en' ? 'en' : 'sl';
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ napaka: 'Prijava trenutno ni mogoca.' }, { status: 503 });

  const zeton = ustvariZeton(() => randomUUID());
  /* Ponovna prijava istega naslova ne sme pasti: dobi nov zeton in novo
     pisemce. Ce je bil ze potrjen, potrjeno_ob ostane in mail je le opomnik. */
  const { data: obstojeci } = await admin
    .from('obvescanje_prijave').select('zeton, potrjeno_ob').eq('email', email).maybeSingle();

  /* Ze potrjen naslov: pisemca NE posiljamo. Vmesniku to POVEMO, sicer bi
     uporabniku rekel "poglej v posto", pisemca pa ne bi bilo (Tina, 3. 9. 2026). */
  if (obstojeci?.potrjeno_ob) return NextResponse.json({ ok: true, ze: true });

  const { error } = await admin.from('obvescanje_prijave').upsert({
    email,
    ime: omejenNiz(telo.ime, 120, true) && telo.ime ? String(telo.ime) : null,
    jezik,
    vir: typeof telo.vir === 'string' ? telo.vir.slice(0, 40) : 'kalkulator',
    pogoji_razlicica: typeof telo.pogojiRazlicica === 'string' ? telo.pogojiRazlicica.slice(0, 20) : null,
    zeton,
  }, { onConflict: 'email' });
  if (error) {
    console.error('Prijava na obvescanje ni uspela:', error.message);
    return NextResponse.json({ napaka: 'Prijava trenutno ni mogoca.' }, { status: 503 });
  }

  /* Ali je pisemce RES odslo. Brez tega vmesnik ne more lociti "poglej v
     posto" od "prijava je zapisana, pisemca pa ni bilo" — na razvojnem
     racunalniku brez kljuca se je zgodilo prav to. */
  let poslano = false;
  const kljuc = process.env.RESEND_API_KEY;
  if (kljuc) {
    const osnova = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
    const pisemce = potrditvenoPisemce(`${osnova}/api/obvescanje/potrdi?zeton=${zeton}`, jezik);
    try {
      await new Resend(kljuc).emails.send({
        from: posiljatelj(), to: email, replyTo: odgovorNaslov(),
        subject: pisemce.zadeva, html: pisemce.html, text: pisemce.text,
        /* Brez te glave nas Yahoo in Gmail stejeta za masovnega posiljatelja
           brez izhoda. Odjava mora delovati tudi iz pisemca, ki ga clovek
           nikoli ne potrdi (Tina, 3. 9. 2026). */
        headers: {
          'List-Unsubscribe': `<${osnova}/api/obvescanje/odjava?email=${encodeURIComponent(email)}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      });
      poslano = true;
    } catch (napaka) {
      console.error('Potrditveno pisemce ni odslo:', napaka instanceof Error ? napaka.message : napaka);
    }
  }

  return NextResponse.json({ ok: true, poslano });
}

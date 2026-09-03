import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { omejiApi } from '@/lib/rate-limit';
import { preberiJson, sporociloValidacije } from '@/lib/validacija';
import { posiljatelj } from '@/lib/posiljatelj';
import { createAdminClient } from '@/utils/supabase/admin';
import { panogaZa, steviloVprasanj } from '@/lib/vprasalnikPanoge';

/* SPREJEM IZPOLNJENEGA VPRAŠALNIKA O CENAH.
 *
 * Odgovori so tuje poslovne skrivnosti — prave cene ljudi, ki jih Tina pozna.
 * Zato NIKOLI javnega vpisa v tabelo: zapiše ga strežnik s service-role
 * ključem, po omejitvi pogostosti in po preverjanju, da so ključi odgovorov
 * res iz tega vprašalnika. Brez tega bi lahko kdorkoli napolnil tabelo s
 * čimerkoli.
 *
 * Obljuba na strani ("cen ne objavim, ne pokažem posamično, ne delim naprej")
 * je razlog, da kdo sploh odgovori. Vse tu mora biti skladno z njo.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_ODGOVOR = 600;
const MAX_POLJE = 200;

type Telo = { panoga?: unknown; odgovori?: unknown; ime?: unknown; email?: unknown };

const niz = (v: unknown, meja: number) =>
  (typeof v === 'string' ? v.trim().slice(0, meja) : '');

export async function POST(request: Request) {
  /* Po IP — prijavljenega uporabnika tu ni in ga tudi ne zahtevamo. */
  const omejitev = await omejiApi(request, 'vprasalnik', 10);
  if (omejitev) return omejitev;

  let telo: Telo;
  try { telo = await preberiJson(request, 120_000); }
  catch (error) { return NextResponse.json({ napaka: sporociloValidacije(error) }, { status: 400 }); }

  const panoga = panogaZa(niz(telo.panoga, 40));
  if (!panoga) return NextResponse.json({ napaka: 'Neznan vprašalnik.' }, { status: 400 });

  if (!telo.odgovori || typeof telo.odgovori !== 'object' || Array.isArray(telo.odgovori)) {
    return NextResponse.json({ napaka: 'Odgovori manjkajo.' }, { status: 400 });
  }

  /* Sprejmemo SAMO kljuce, ki obstajajo v tem vprasalniku (in njihova
     dopolnila), da tabela ostane primerljiva med ljudmi. */
  const dovoljeni = new Set<string>();
  for (const s of panoga.sklopi) {
    for (const v of s.vprasanja) { dovoljeni.add(v.id); dovoljeni.add(`${v.id}::dop`); }
  }

  const odgovori: Record<string, string> = {};
  for (const [k, v] of Object.entries(telo.odgovori as Record<string, unknown>)) {
    if (!dovoljeni.has(k)) continue;
    const besedilo = niz(v, MAX_ODGOVOR);
    if (besedilo) odgovori[k] = besedilo;
  }
  if (!Object.keys(odgovori).length) {
    return NextResponse.json({ napaka: 'Vprašalnik je prazen.' }, { status: 400 });
  }

  const ime = niz(telo.ime, MAX_POLJE);
  const email = niz(telo.email, MAX_POLJE);
  const skupaj = steviloVprasanj(panoga);
  const izpolnjenih = Object.keys(odgovori).filter(k => !k.endsWith('::dop')).length;

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ napaka: 'Shramba ni na voljo.' }, { status: 503 });

  const { error } = await admin.from('vprasalnik_odgovori').insert({
    panoga: panoga.id,
    odgovori,
    ime: ime || null,
    email: email || null,
    izpolnjenih,
    skupaj,
  });
  if (error) return NextResponse.json({ napaka: 'Odgovorov ni bilo mogoče shraniti.' }, { status: 500 });

  /* Obvestilo Tini. Ce mail ne odide, vprasalnik JE shranjen — zato napake
     tu ne vracamo kot neuspeh oddaje. */
  const kljuc = process.env.RESEND_API_KEY;
  if (kljuc) {
    try {
      await new Resend(kljuc).emails.send({
        from: posiljatelj(),
        to: 'tina@pinart.si',
        subject: `Vprašalnik ${panoga.ime}${ime ? ` — ${ime}` : ''}`,
        text: [
          `Panoga: ${panoga.ime}`,
          `Odgovoril: ${ime || '(brez imena)'}${email ? ` <${email}>` : ''}`,
          `Izpolnjenih: ${izpolnjenih} od ${skupaj}`,
          '',
          'Odgovore vidiš v adminu.',
        ].join('\n'),
      });
    } catch { /* shranjeno je; mail je postranski */ }
  }

  return NextResponse.json({ ok: true });
}

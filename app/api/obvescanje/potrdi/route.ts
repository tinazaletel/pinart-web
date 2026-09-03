import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { posiljatelj } from '@/lib/posiljatelj';
import { createAdminClient } from '@/utils/supabase/admin';
import { jePotekla, potIzida } from '@/lib/obvescanje';

/* POTRDITEV PRIJAVE (dvojna privolitev).
 *
 * Do tega klika seznama ni: brez potrditve ne posljemo nicesar. Sele tu
 * nastane privolitev, ki jo znamo tudi dokazati — s casom in razlicico
 * pogojev, zapisano ob prijavi.
 *
 * Povezava je GET iz maila, zato brez prijave in brez piskotkov. */

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const zeton = new URL(request.url).searchParams.get('zeton') || '';
  const naStran = (stanje: 'potrjeno' | 'poteklo' | 'napaka', jezik = 'sl') =>
    NextResponse.redirect(new URL(potIzida(jezik, stanje), request.url));

  if (!zeton || zeton.length > 64) return naStran('napaka');
  const admin = createAdminClient();
  if (!admin) return naStran('napaka');

  const { data: prijava } = await admin
    .from('obvescanje_prijave').select('id, email, ime, jezik, ustvarjeno, potrjeno_ob').eq('zeton', zeton).maybeSingle();
  if (!prijava) return naStran('napaka');

  const jezik = prijava.jezik === 'en' ? 'en' : 'sl';
  if (prijava.potrjeno_ob) return naStran('potrjeno', jezik);

  /* Nepotrjena prijava po roku ni vec veljavna — privolitve zanjo nimamo,
     zato zapis izbrisemo, namesto da bi ga potrdili za nazaj. */
  if (jePotekla(String(prijava.ustvarjeno), new Date())) {
    await admin.from('obvescanje_prijave').delete().eq('id', prijava.id);
    return naStran('poteklo', jezik);
  }

  const { error } = await admin
    .from('obvescanje_prijave').update({ potrjeno_ob: new Date().toISOString() }).eq('id', prijava.id);
  if (error) {
    console.error('Potrditev obvescanja ni uspela:', error.message);
    return naStran('napaka', jezik);
  }

  /* OBVESTILO TINI. Doslej ga ni bilo: clovek je prijavo potrdil, na seznam je
     prisel, Tina pa tega ni izvedela nikoli (Tina, 3. 9. 2026). Napaka pri
     posiljanju ne sme razveljaviti potrjene prijave — ta je ze zapisana. */
  const kljuc = process.env.RESEND_API_KEY;
  if (kljuc) {
    try {
      const naslov = String((prijava as { email?: string }).email || '');
      const imePrijave = String((prijava as { ime?: string }).ime || '').trim();
      await new Resend(kljuc).emails.send({
        from: posiljatelj(),
        to: 'tina@pinart.si',
        subject: `Nov naročnik na novice${imePrijave ? ` — ${imePrijave}` : ''}`,
        text: [
          `${imePrijave || '(brez imena)'} <${naslov}>`,
          `Jezik: ${jezik}`,
          '',
          'Prijava je POTRJENA (klik v pisemcu).',
        ].join('\n'),
      });
    } catch { /* prijava je potrjena; obvestilo je postransko */ }
  }

  return naStran('potrjeno', jezik);
}

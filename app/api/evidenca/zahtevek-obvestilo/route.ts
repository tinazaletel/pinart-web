import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { omejiApi } from '@/lib/rate-limit';
import { preberiJson } from '@/lib/validacija';
import { preberiClanstvo } from '@/lib/clanstvo';
import { odgovorNaslov, posiljatelj } from '@/lib/posiljatelj';

export const dynamic = 'force-dynamic';

/* Obvestilo skrbniku, da je nekdo vložil zahtevek za popravek evidence.
   Skrbnik zahtevka ne sme odkriti po naključju — zato gre sporočilo takoj, ko
   je zahtevek vložen (Tina, 30. 8. 2026). Če ključa za pošto ni, tiho odnehamo:
   zahtevek je v bazi in ga skrbnik vidi v seznamu. */

const cas = (v: unknown) => (typeof v === 'string' && /^\d{2}:\d{2}$/.test(v) ? v : null);

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Prijava je potekla.' }, { status: 401 });

  const omejitev = await omejiApi(request, 'evidenca-zahtevek', 20, user.id);
  if (omejitev) return omejitev;

  const telo = await preberiJson<{ datum?: string; razlog?: string; prica?: string | null; prihod?: string | null; odhod?: string | null }>(request);
  const datum = String(telo?.datum || '');
  const razlog = String(telo?.razlog || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum) || !razlog) {
    return NextResponse.json({ error: 'Manjka datum ali razlog.' }, { status: 400 });
  }

  const clanstvo = await preberiClanstvo(supabase, null, user.id);
  if (!clanstvo) return NextResponse.json({ error: 'Podjetje ni povezano.' }, { status: 403 });

  const admin = createAdminClient();
  const kljuc = process.env.RESEND_API_KEY;
  if (!admin || !kljuc) return NextResponse.json({ ok: true, poslano: false });

  /* Komu: vsem lastnikom in skrbnikom organizacije. */
  const { data: skrbniki } = await admin
    .from('organization_members')
    .select('user_id, role')
    .eq('organization_id', clanstvo.organization_id)
    .in('role', ['owner', 'admin']);

  const naslovi: string[] = [];
  for (const s of skrbniki || []) {
    if (String(s.user_id) === user.id) continue;      // sebi ne pošiljamo
    try {
      const { data } = await admin.auth.admin.getUserById(String(s.user_id));
      if (data?.user?.email) naslovi.push(data.user.email);
    } catch { /* brez e-pošte pač ne obvestimo */ }
  }
  if (!naslovi.length) return NextResponse.json({ ok: true, poslano: false });

  const kdo = (user.user_metadata as { full_name?: string } | undefined)?.full_name || user.email || 'Sodelavec';
  const od = cas(telo?.prihod), doU = cas(telo?.odhod);
  const razpon = od && doU ? `${od} – ${doU}` : od || doU || '—';
  const prica = telo?.prica ? String(telo.prica).slice(0, 120) : '';

  try {
    await new Resend(kljuc).emails.send({
      from: posiljatelj(),
      to: naslovi,
      replyTo: odgovorNaslov(),
      subject: `Zahtevek za popravek evidence — ${kdo}, ${datum}`,
      text: [
        `${kdo} prosi za popravek delovnega časa.`,
        '',
        `Dan: ${datum}`,
        `Predlog: ${razpon}`,
        `Razlog: ${razlog}`,
        prica ? `Priča: ${prica}` : '',
        '',
        'Zahtevek odobriš ali zavrneš v Flowu, na strani Prisotnost.',
      ].filter(Boolean).join('\n'),
    });
  } catch {
    return NextResponse.json({ ok: true, poslano: false });
  }
  return NextResponse.json({ ok: true, poslano: true });
}

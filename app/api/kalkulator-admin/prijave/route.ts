import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Resend } from 'resend';
import { createAdminClient } from '@/utils/supabase/admin';
import { preberiJson, sporociloValidacije } from '@/lib/validacija';
import { omejiApi } from '@/lib/rate-limit';
import { posiljatelj } from '@/lib/posiljatelj';

/**
 * PRIJAVE ZA TESTIRANJE (tabela beta_prijave).
 *   GET  -> seznam prijav, najnovejsa zgoraj
 *   POST -> {email, dejanje: 'sprejmi' | 'zavrni'}
 *
 * "sprejmi" naredi troje v enem koraku: doda e-mail med testerje
 * (flow_dostop), oznaci prijavo kot obdelano in POSLJE cloveku navodila.
 * Prej je bilo prvo rocno, drugega ni bilo, tretjega pa sploh — zato Luka ni
 * vedel, da lahko vstopi (Tina, 2. 9. 2026).
 *
 * ZASCITA: isti piskotek kot pregled poslovanja (KALKULATOR_ADMIN_GESLO).
 */

async function preveriGeslo(): Promise<boolean> {
  const geslo = process.env.KALKULATOR_ADMIN_GESLO;
  const c = await cookies();
  return !!geslo && c.get('pinart_admin')?.value === geslo;
}

const ociEmail = (v: unknown) => String(v || '').trim().toLowerCase();

export async function GET(request: Request) {
  const omejitev = await omejiApi(request, 'admin-prijave', 30);
  if (omejitev) return omejitev;
  if (!(await preveriGeslo())) return NextResponse.json({ error: 'Ni dovoljenja' }, { status: 401 });
  const baza = createAdminClient();
  if (!baza) return NextResponse.json({ error: 'Baza ni nastavljena' }, { status: 500 });

  const { data, error } = await baza
    .from('beta_prijave')
    .select('id,ime,email,stanje,opomba,prijavljen,obdelan')
    .order('prijavljen', { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ prijave: data || [] });
}

/* Besedilo, ki ga dobi tester. Kratko namenoma: kdor dobi tri odstavke, ne
   naredi nicesar. Geslo je v sporocilu, ker brez njega ne pride niti do
   registracije. */
function navodila(ime: string, geslo: string, naslov: string, jezik: string) {
  const gol = naslov.replace(/^https?:\/\//, '');
  if (jezik === 'en') {
    const prvo = ime.split(/\s+/)[0] || 'Hi';
    return `<div style="font:15px/1.6 system-ui,-apple-system,'Segoe UI',sans-serif;color:#221E19">
<p>Hi ${prvo},</p>
<p>your access to Pinart Flow is open. Three steps:</p>
<ol style="padding-left:1.1rem">
  <li>Open <a href="${naslov}/en/kalkulator/testiranje" style="color:#6D3BEB">${gol}/en/kalkulator/testiranje</a></li>
  <li>Enter the password <b>${geslo}</b></li>
  <li>Create an account <b>with this email address</b> — the system won't let you in with another one.</li>
</ol>
<p><b>One favour before you start.</b> Fill in a short questionnaire about your prices: <a href="${naslov}/en/vprasalnik" style="color:#6D3BEB">${gol}/en/vprasalnik</a><br>
Fifteen minutes. I'm asking you <b>first</b> because once you've seen the calculator's prices, your answers anchor to them and stop telling me anything new. I won't publish your prices, show them individually, or share them further.</p>
<p>If anything gets stuck, just reply to this email and tell me what's on the screen.</p>
<p>Thanks for testing.<br>Tina</p>
</div>`;
  }
  const prvo = ime.split(/\s+/)[0] || 'Živjo';
  return `<div style="font:15px/1.6 system-ui,-apple-system,'Segoe UI',sans-serif;color:#221E19">
<p>Živjo ${prvo},</p>
<p>dostop do Pinart Flowa je odprt. Trije koraki:</p>
<ol style="padding-left:1.1rem">
  <li>Odpri <a href="${naslov}/kalkulator/testiranje" style="color:#6D3BEB">${gol}/kalkulator/testiranje</a></li>
  <li>Vpiši geslo <b>${geslo}</b></li>
  <li>Ustvari račun <b>s tem e-naslovom</b> — na drugega te sistem ne bo spustil.</li>
</ol>
<p><b>Prošnja, preden začneš.</b> Izpolni kratek vprašalnik o svojih cenah: <a href="${naslov}/vprasalnik" style="color:#6D3BEB">${gol}/vprasalnik</a><br>
Petnajst minut. Vprašam te <b>prej</b> zato, ker so odgovori po tem, ko vidiš cene kalkulatorja, zasidrani nanje — in mi ne povedo več ničesar. Tvojih cen ne objavim, ne pokažem posamično in jih ne delim naprej.</p>
<p>Če se kje zatakne, mi kar odgovori na to sporočilo in napiši, kaj piše na zaslonu.</p>
<p>Hvala, ker preizkušaš.<br>Tina</p>
</div>`;
}

export async function POST(request: Request) {
  const omejitev = await omejiApi(request, 'admin-prijave', 30);
  if (omejitev) return omejitev;
  if (!(await preveriGeslo())) return NextResponse.json({ error: 'Ni dovoljenja' }, { status: 401 });
  const baza = createAdminClient();
  if (!baza) return NextResponse.json({ error: 'Baza ni nastavljena' }, { status: 500 });

  let body: Record<string, unknown>;
  try { body = await preberiJson(request, 4_000); }
  catch (error) { return NextResponse.json({ error: sporociloValidacije(error) }, { status: 400 }); }

  const email = ociEmail(body.email);
  const dejanje = String(body.dejanje || 'sprejmi');
  if (!email.includes('@')) return NextResponse.json({ error: 'Neveljaven e-mail' }, { status: 400 });

  if (dejanje === 'zavrni') {
    const { error } = await baza.from('beta_prijave')
      .update({ stanje: 'zavrnjen', obdelan: new Date().toISOString() })
      .eq('email', email);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  /* 1) med testerje */
  const { error: dostopNapaka } = await baza.from('flow_dostop')
    .upsert({ email, vrsta: 'tester', velja_od: null, velja_do: null, popust: null,
              opomba: 'iz prijave za testiranje' }, { onConflict: 'email' });
  if (dostopNapaka) return NextResponse.json({ error: dostopNapaka.message }, { status: 500 });

  /* 2) navodila cloveku — brez tega ne ve, da lahko vstopi */
  const kljuc = process.env.RESEND_API_KEY;
  const geslo = process.env.SITE_GESLO || '';
  const naslov = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.pinartflow.com';
  let poslano = false;
  if (kljuc && geslo) {
    const { data: vrstica } = await baza.from('beta_prijave').select('ime, jezik').eq('email', email).maybeSingle();
    const jezik = String(vrstica?.jezik || '') === 'en' ? 'en' : 'sl';
    try {
      const { error } = await new Resend(kljuc).emails.send({
        from: posiljatelj(),
        to: email,
        replyTo: 'tina@pinart.si',
        subject: jezik === 'en' ? 'Your access to Pinart Flow is open' : 'Dostop do Pinart Flowa je odprt',
        html: navodila(String(vrstica?.ime || ''), geslo, naslov, jezik),
      });
      poslano = !error;
      if (error) console.error('Navodila testerju niso odsla:', error.message || error);
    } catch (napaka) { console.error('Navodila testerju niso odsla:', napaka); }
  }

  /* 3) oznacimo prijavo — tudi ce mail ni odsel, dostop ze ima */
  await baza.from('beta_prijave')
    .update({ stanje: 'povabljen', obdelan: new Date().toISOString() })
    .eq('email', email);

  return NextResponse.json({ ok: true, poslano });
}

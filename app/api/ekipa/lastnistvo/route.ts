import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { omejiApi } from '@/lib/rate-limit';
import { preberiJson, sporociloValidacije } from '@/lib/validacija';

/* Prenos lastništva organizacije (Faza 3). Samo trenutni LASTNIK sme predati
   vlogo 'owner' drugemu članu. Ob prenosu se dosedanji lastnik degradira v
   'admin' (dostopa ne izgubi, ni pa več lastnik) — enolastniški model. */
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Prijava je potekla.' }, { status: 401 });
  const omejitev = await omejiApi(request, 'ekipa-lastnistvo', 10, user.id);
  if (omejitev) return omejitev;

  let body: { userId?: string };
  try { body = await preberiJson(request, 5_000); }
  catch (error) { return NextResponse.json({ error: sporociloValidacije(error) }, { status: 400 }); }
  const targetId = String(body.userId || '').trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(targetId)) {
    return NextResponse.json({ error: 'Neveljaven član.' }, { status: 400 });
  }
  if (targetId === user.id) return NextResponse.json({ error: 'Lastništvo je že tvoje.' }, { status: 400 });

  /* Klicatelj mora biti LASTNIK. */
  const { data: mine } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .eq('role', 'owner')
    .limit(1);
  const organizationId = mine?.[0]?.organization_id;
  if (!organizationId) return NextResponse.json({ error: 'Lastništvo lahko prenese le trenutni lastnik.' }, { status: 403 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: 'Ekipa v oblaku ni konfigurirana.' }, { status: 503 });

  /* Cilj mora biti obstoječi član te organizacije. */
  const { data: target } = await admin
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', organizationId)
    .eq('user_id', targetId)
    .maybeSingle();
  if (!target) return NextResponse.json({ error: 'Izbrana oseba ni član te ekipe.' }, { status: 404 });

  /* Najprej povišaj cilj v lastnika, nato degradiraj sebe — tako organizacija
     nikoli ni brez lastnika. */
  const { error: upErr } = await admin
    .from('organization_members')
    .update({ role: 'owner' })
    .eq('organization_id', organizationId)
    .eq('user_id', targetId);
  if (upErr) return NextResponse.json({ error: 'Prenosa ni bilo mogoče izvesti.' }, { status: 500 });

  const { error: downErr } = await admin
    .from('organization_members')
    .update({ role: 'admin' })
    .eq('organization_id', organizationId)
    .eq('user_id', user.id);
  if (downErr) {
    /* Cilj je zdaj lastnik; ti si ostal(a) lastnik (dva lastnika). Ni kritično —
       vrni jasno opozorilo, da lahko poskusiš znova. */
    return NextResponse.json({ ok: true, opozorilo: 'Lastništvo preneseno, tvoje vloge ni bilo mogoče spremeniti — poskusi znova ali uredi ročno.' });
  }
  return NextResponse.json({ ok: true });
}

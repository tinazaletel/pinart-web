import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { omejiApi } from '@/lib/rate-limit';
import { preberiJson, sporociloValidacije } from '@/lib/validacija';

/* Deljenje zapisa s članom — Faza 4 Stage 3 (backend).
   Admin deli zapis (ali celo stranko) s članom -> vpis v record_shares. Vidljivost
   nato uveljavi RLS (sme_videti_zapis, Stage 1/2). »Deli stranko« = resource='clients':
   član samodejno vidi vse ponudbe/račune/… te stranke.
   ⚠️ Deluje šele, ko sta pognani migraciji Stage 1 (record_shares) + Stage 2 (RLS). */

const DOVOLJENI_VIRI = new Set(['clients', 'offers', 'invoices', 'contracts', 'retainers', 'expenses', 'projects']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function adminContext(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', userId)
    .in('role', ['owner', 'admin'])
    .limit(1);
  return data?.[0]?.organization_id ? String(data[0].organization_id) : null;
}

/* GET ?resource=&recordId= -> s kom je zapis deljen (za admina). */
export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Prijava je potekla.' }, { status: 401 });
  const omejitev = await omejiApi(request, 'ekipa-deli-get', 60, user.id);
  if (omejitev) return omejitev;

  const url = new URL(request.url);
  const resource = String(url.searchParams.get('resource') || '');
  const recordId = String(url.searchParams.get('recordId') || '');
  if (!DOVOLJENI_VIRI.has(resource) || !UUID.test(recordId)) {
    return NextResponse.json({ error: 'Neveljaven zapis.' }, { status: 400 });
  }
  const organizationId = await adminContext(supabase, user.id);
  if (!organizationId) return NextResponse.json({ error: 'Za deljenje potrebuješ skrbniške pravice.' }, { status: 403 });

  const { data } = await supabase
    .from('record_shares')
    .select('shared_with')
    .eq('organization_id', organizationId)
    .eq('resource', resource)
    .eq('record_id', recordId);
  return NextResponse.json({ sharedWith: (data || []).map((r) => String(r.shared_with)) });
}

/* POST {resource, recordId, sharedWith} -> deli. */
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Prijava je potekla.' }, { status: 401 });
  const omejitev = await omejiApi(request, 'ekipa-deli', 40, user.id);
  if (omejitev) return omejitev;

  let body: { resource?: string; recordId?: string; sharedWith?: string };
  try { body = await preberiJson(request, 5_000); }
  catch (error) { return NextResponse.json({ error: sporociloValidacije(error) }, { status: 400 }); }
  const resource = String(body.resource || '');
  const recordId = String(body.recordId || '').trim();
  const sharedWith = String(body.sharedWith || '').trim();
  if (!DOVOLJENI_VIRI.has(resource) || !UUID.test(recordId) || !UUID.test(sharedWith)) {
    return NextResponse.json({ error: 'Neveljavni podatki za deljenje.' }, { status: 400 });
  }

  const organizationId = await adminContext(supabase, user.id);
  if (!organizationId) return NextResponse.json({ error: 'Za deljenje potrebuješ skrbniške pravice.' }, { status: 403 });

  /* Deli lahko le s članom te organizacije. */
  const { data: clan } = await supabase
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', organizationId)
    .eq('user_id', sharedWith)
    .maybeSingle();
  if (!clan) return NextResponse.json({ error: 'Izbrana oseba ni član te ekipe.' }, { status: 400 });

  const { error: insErr } = await supabase
    .from('record_shares')
    .upsert(
      { organization_id: organizationId, resource, record_id: recordId, shared_with: sharedWith, created_by: user.id },
      { onConflict: 'resource,record_id,shared_with' },
    );
  if (insErr) return NextResponse.json({ error: 'Deljenja ni bilo mogoče shraniti.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/* DELETE {resource, recordId, sharedWith} -> prekliči deljenje. */
export async function DELETE(request: Request) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Prijava je potekla.' }, { status: 401 });
  const omejitev = await omejiApi(request, 'ekipa-deli-del', 40, user.id);
  if (omejitev) return omejitev;

  let body: { resource?: string; recordId?: string; sharedWith?: string };
  try { body = await preberiJson(request, 5_000); }
  catch (error) { return NextResponse.json({ error: sporociloValidacije(error) }, { status: 400 }); }
  const resource = String(body.resource || '');
  const recordId = String(body.recordId || '').trim();
  const sharedWith = String(body.sharedWith || '').trim();
  if (!DOVOLJENI_VIRI.has(resource) || !UUID.test(recordId) || !UUID.test(sharedWith)) {
    return NextResponse.json({ error: 'Neveljavni podatki.' }, { status: 400 });
  }
  const organizationId = await adminContext(supabase, user.id);
  if (!organizationId) return NextResponse.json({ error: 'Za deljenje potrebuješ skrbniške pravice.' }, { status: 403 });

  const { error: delErr } = await supabase
    .from('record_shares')
    .delete()
    .eq('organization_id', organizationId)
    .eq('resource', resource)
    .eq('record_id', recordId)
    .eq('shared_with', sharedWith);
  if (delErr) return NextResponse.json({ error: 'Deljenja ni bilo mogoče preklicati.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

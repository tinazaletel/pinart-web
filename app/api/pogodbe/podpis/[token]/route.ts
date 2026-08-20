import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { omejiApi } from '@/lib/rate-limit';
import { hashZetona } from '@/lib/podpisPogodbe';

type Params = { params: { token: string } };

async function zahteva(token: string) {
  const admin = createAdminClient();
  if (!admin) return { admin: null, zapis: null };
  const { data } = await admin.from('contract_signing_requests')
    .select('id,contract_id,content_hash,content_snapshot,expires_at,completed_at,contracts(title)')
    .eq('token_hash', hashZetona(token)).maybeSingle();
  return { admin, zapis: data };
}

export async function GET(request: Request, { params }: Params) {
  const omejitev = await omejiApi(request, 'pogodba-podpis-javno', 30);
  if (omejitev) return omejitev;
  const { admin, zapis } = await zahteva(params.token);
  if (!admin || !zapis) return NextResponse.json({ napaka: 'Povezava ni veljavna.' }, { status: 404 });
  if (new Date(zapis.expires_at).getTime() <= Date.now()) return NextResponse.json({ napaka: 'Povezava je potekla.' }, { status: 410 });
  const { data: signatures } = await admin.from('contract_signatures').select('party,signer_name,signed_at').eq('signing_request_id', zapis.id);
  return NextResponse.json({ title: (zapis.contracts as unknown as { title?: string } | null)?.title || 'Pogodba', html: zapis.content_snapshot, contentHash: zapis.content_hash, completedAt: zapis.completed_at, signatures: signatures || [] });
}

export async function POST(request: Request, { params }: Params) {
  const omejitev = await omejiApi(request, 'pogodba-podpis-oddaja', 10);
  if (omejitev) return omejitev;
  const { admin, zapis } = await zahteva(params.token);
  if (!admin || !zapis) return NextResponse.json({ napaka: 'Povezava ni veljavna.' }, { status: 404 });
  if (new Date(zapis.expires_at).getTime() <= Date.now()) return NextResponse.json({ napaka: 'Povezava je potekla.' }, { status: 410 });
  if (zapis.completed_at) return NextResponse.json({ napaka: 'Pogodba je že podpisana.' }, { status: 409 });
  const telo = await request.json().catch(() => ({})) as Record<string, unknown>;
  const signerName = typeof telo.signerName === 'string' ? telo.signerName.trim().slice(0, 160) : '';
  const consent = telo.consent === true;
  if (!signerName || !consent) return NextResponse.json({ napaka: 'Vpiši ime in potrdi soglasje.' }, { status: 400 });
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip');
  const { data, error } = await admin.rpc('podpisi_pogodbo_javno', {
    p_token_hash: hashZetona(params.token), p_signer_name: signerName,
    p_ip: ip || null, p_user_agent: request.headers.get('user-agent') || '',
  });
  if (error) return NextResponse.json({ napaka: 'Podpisa ni bilo mogoče zabeležiti ali pa je pogodba že podpisana.' }, { status: 409 });
  const rezultat = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({ signedAt: rezultat?.signed_at, contentHash: rezultat?.content_hash });
}

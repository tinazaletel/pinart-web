import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { omejiApi } from '@/lib/rate-limit';
import { hashPogodbe, hashZetona, novPodpisniZeton, varenPosnetekPogodbe } from '@/lib/podpisPogodbe';

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ napaka: 'Prijava je potekla.' }, { status: 401 });
  const omejitev = await omejiApi(request, 'pogodba-podpis-priprava', 10, user.id);
  if (omejitev) return omejitev;

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ napaka: 'Podpisovanje ni konfigurirano.' }, { status: 503 });
  const telo = await request.json().catch(() => ({})) as Record<string, unknown>;
  const externalId = typeof telo.externalId === 'string' ? telo.externalId : '';
  const signerName = typeof telo.signerName === 'string' ? telo.signerName.trim().slice(0, 160) : '';
  const clientEmail = typeof telo.clientEmail === 'string' ? telo.clientEmail.trim().slice(0, 254) : '';
  const snapshot = varenPosnetekPogodbe(typeof telo.html === 'string' ? telo.html : '');
  if (!externalId || !signerName || snapshot.length < 20 || snapshot.length > 2_000_000) {
    return NextResponse.json({ napaka: 'Manjkajo podatki pogodbe ali podpisnika.' }, { status: 400 });
  }

  const { data: memberships } = await admin.from('organization_members').select('organization_id,role,disabled_at').eq('user_id', user.id);
  const dovoljeniOrg = (memberships || []).filter(v => !v.disabled_at && (v.role === 'owner' || v.role === 'admin')).map(v => v.organization_id);
  if (!dovoljeniOrg.length) return NextResponse.json({ napaka: 'Za to dejanje nimaš dovoljenja.' }, { status: 403 });
  const { data: contract } = await admin.from('contracts').select('id,organization_id,locked_at').eq('external_id', externalId).in('organization_id', dovoljeniOrg).maybeSingle();
  if (!contract) return NextResponse.json({ napaka: 'Pogodbe ni bilo mogoče najti v oblaku.' }, { status: 404 });
  if (contract.locked_at) return NextResponse.json({ napaka: 'Pogodba je že podpisana in zaklenjena.' }, { status: 409 });

  const token = novPodpisniZeton();
  const contentHash = hashPogodbe(snapshot);
  const expiresAt = new Date(Date.now() + 14 * 86400_000).toISOString();
  const { data: signing, error } = await admin.from('contract_signing_requests').insert({
    organization_id: contract.organization_id,
    contract_id: contract.id,
    token_hash: hashZetona(token), content_hash: contentHash, content_snapshot: snapshot,
    client_email: clientEmail || null, expires_at: expiresAt, created_by: user.id,
  }).select('id').single();
  if (error || !signing) return NextResponse.json({ napaka: 'Povezave za podpis ni bilo mogoče ustvariti.' }, { status: 500 });
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip');
  const { error: signatureError } = await admin.from('contract_signatures').insert({
    signing_request_id: signing.id, party: 'provider', signer_name: signerName,
    signer_user_id: user.id, ip_address: ip || null,
    user_agent: (request.headers.get('user-agent') || '').slice(0, 500) || null, content_hash: contentHash,
  });
  if (signatureError) return NextResponse.json({ napaka: 'Podpisa izvajalca ni bilo mogoče zabeležiti.' }, { status: 500 });
  return NextResponse.json({ url: `${new URL(request.url).origin}/podpis/${token}`, expiresAt, contentHash });
}

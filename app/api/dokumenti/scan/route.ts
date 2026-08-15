import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { preberiJson, sporociloValidacije } from '@/lib/validacija';
import { omejiApi } from '@/lib/rate-limit';

const dovoljeniStatusi = new Set(['pending', 'clean', 'infected']);

function enakSkrivniKljuc(received: string, expected: string): boolean {
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

/* Integracijska tocka za prihodnji AV worker. Trenutno datotek ne pregleduje;
   sprejme le overjen rezultat workerja in posodobi evidenco. */
export async function POST(request: Request) {
  // IP-osnovna omejitev: to je strojna pot (worker), overjena s skupnim
  // skrivnim kljucem, ne z uporabnisko prijavo — zato brez userId. Omejitev je
  // pred preverjanjem kljuca, da upocasni tudi ugibanje skrivnosti.
  const omejitev = await omejiApi(request, 'dokumenti-scan', 20);
  if (omejitev) return omejitev;

  const expectedSecret = process.env.DOCUMENT_SCAN_SECRET || '';
  const receivedSecret = request.headers.get('x-document-scan-secret') || '';
  if (!expectedSecret || !receivedSecret || !enakSkrivniKljuc(receivedSecret, expectedSecret)) {
    return NextResponse.json({ error: 'Neveljavna avtentikacija.' }, { status: 401 });
  }

  let body: { path?: string; status?: string };
  try {
    body = await preberiJson(request, 4_000);
  } catch (error) {
    return NextResponse.json({ error: sporociloValidacije(error) }, { status: 400 });
  }
  const path = String(body.path || '').trim();
  const status = String(body.status || '').trim();
  if (!path || path.length > 1024 || path.includes('..') || !dovoljeniStatusi.has(status)) {
    return NextResponse.json({ error: 'Neveljavna pot ali status.' }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: 'Storitev ni konfigurirana.' }, { status: 503 });
  const { data, error } = await admin.from('document_files').update({
    scan_status: status,
    updated_at: new Date().toISOString(),
  }).eq('bucket', 'business-documents').eq('path', path).is('deleted_at', null).select('id').maybeSingle();
  if (error) return NextResponse.json({ error: 'Posodobitev ni uspela.' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Datoteka ne obstaja.' }, { status: 404 });
  return NextResponse.json({ ok: true });
}

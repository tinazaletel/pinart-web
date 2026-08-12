import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

const SPOROCILO = 'Preveč zahtev, poskusi čez minuto.';

function ipIzZahteve(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

function hash(vrednost: string): string {
  const salt = process.env.API_RATE_LIMIT_SALT
    || process.env.AI_RATE_LIMIT_SALT
    || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!salt) throw new Error('API_RATE_LIMIT_SALT ni nastavljen.');
  return createHash('sha256').update(`${salt}:${vrednost}`).digest('hex');
}

export async function omejiApi(
  request: Request,
  pot: string,
  meja: number,
  userId?: string,
  oknoSekund = 60,
): Promise<NextResponse | null> {
  /* FAIL-OPEN: rate-limiter je zaščita, ne osrednja pot. Če limiter ne deluje
     (manjka service-role, manjka RPC/migracija, napaka baze), NE blokiramo
     legitimnega prometa — dovolimo (return null). Sicer bi ena manjkajoča
     migracija ustavila pošiljanje/Pupo za vse. Nad-limit ostane 429. */
  const admin = createAdminClient();
  if (!admin) {
    return null; // limiter ni konfiguriran -> fail-open
  }

  let kljucHash: string;
  try {
    kljucHash = hash(userId ? `user:${userId}` : `ip:${ipIzZahteve(request)}`);
  } catch (error) {
    console.error('API limiter ni konfiguriran (fail-open):', error instanceof Error ? error.message : error);
    return null; // fail-open
  }

  const { data, error } = await admin.rpc('preveri_api_omejitev', {
    p_kljuc_hash: kljucHash,
    p_pot: pot,
    p_limit: meja,
    p_okno_sekund: oknoSekund,
  });
  if (error) {
    console.error('API rate-limit napaka (fail-open, dovolim):', error.message);
    return null; // RPC ne deluje (npr. migracija ni pognana) -> fail-open, da pošiljanje ne obtiči
  }
  return data === true
    ? null
    : NextResponse.json({ napaka: SPOROCILO }, { status: 429 });
}

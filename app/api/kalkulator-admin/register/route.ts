import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/utils/supabase/admin';
import { omejiApi } from '@/lib/rate-limit';

/* Kdaj je bil register podjetij nazadnje osvežen (glej scripts/osveziRegister.mjs).
   Bere ga opomnik v pregledu poslovanja. Ista zaščita kot ostali admin klici —
   piškotek s KALKULATOR_ADMIN_GESLO, preverjen na strežniku. */

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const omejitev = await omejiApi(request, 'admin-register', 30);
  if (omejitev) return omejitev;

  const geslo = process.env.KALKULATOR_ADMIN_GESLO;
  const c = await cookies();
  if (!geslo || c.get('pinart_admin')?.value !== geslo) {
    return NextResponse.json({ error: 'Ni dostopa.' }, { status: 401 });
  }

  const supabase = createAdminClient();
  if (!supabase) return NextResponse.json({ osvezeno: null });

  const { data, error } = await supabase
    .from('register_meta').select('osvezeno,stevilo,opomba').eq('kljuc', 'podjetja').limit(1);
  if (error) return NextResponse.json({ osvezeno: null });

  const v = data?.[0];
  return NextResponse.json({
    osvezeno: v?.osvezeno || null,
    stevilo: v?.stevilo ?? null,
    opomba: v?.opomba || null,
  });
}

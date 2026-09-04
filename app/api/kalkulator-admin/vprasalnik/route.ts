import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { omejiApi } from '@/lib/rate-limit';
import { cookies } from 'next/headers';

/* Isti piskotek kot ostali admin (KALKULATOR_ADMIN_GESLO). */
async function preveriGeslo(): Promise<boolean> {
  const geslo = process.env.KALKULATOR_ADMIN_GESLO;
  const c = await cookies();
  return !!geslo && c.get('pinart_admin')?.value === geslo;
}

/* Branje izpolnjenih vprašalnikov za admin.
   Vsebina so tuje cene, zato je za istim geslom kot ostali admin. */

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const omejitev = await omejiApi(request, 'admin-vprasalnik', 30);
  if (omejitev) return omejitev;
  if (!(await preveriGeslo())) return NextResponse.json({ error: 'Ni dovoljenja' }, { status: 401 });

  const baza = createAdminClient();
  if (!baza) return NextResponse.json({ error: 'Baza ni nastavljena' }, { status: 500 });

  const { data, error } = await baza
    .from('vprasalnik_cene')
    .select('id,panoga,odgovori,ime,email,izpolnjenih,skupaj,created_at')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: 'Branje ni uspelo' }, { status: 500 });

  return NextResponse.json({ vprasalniki: data || [] });
}

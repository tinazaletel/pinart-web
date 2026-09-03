import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/utils/supabase/admin';
import { omejiApi } from '@/lib/rate-limit';

/* Naročniki na novice in povpraševanja — na enem mestu.
   Obojega doslej ni bilo nikjer videti: naročnik je potrdil prijavo in Tina
   tega ni izvedela, povpraševanje pa je obstajalo samo v Googlovem listu. */

export const dynamic = 'force-dynamic';

async function preveriGeslo(): Promise<boolean> {
  const geslo = process.env.KALKULATOR_ADMIN_GESLO;
  const c = await cookies();
  return !!geslo && c.get('pinart_admin')?.value === geslo;
}

export async function GET(request: Request) {
  const omejitev = await omejiApi(request, 'admin-stiki', 30);
  if (omejitev) return omejitev;
  if (!(await preveriGeslo())) return NextResponse.json({ error: 'Ni dovoljenja' }, { status: 401 });

  const baza = createAdminClient();
  if (!baza) return NextResponse.json({ error: 'Baza ni nastavljena' }, { status: 500 });

  const [naroceni, povprasevanja] = await Promise.all([
    baza.from('obvescanje_prijave')
      .select('email,ime,jezik,ustvarjeno,potrjeno_ob')
      .order('ustvarjeno', { ascending: false }).limit(300),
    baza.from('povprasevanja')
      .select('id,ime,email,podjetje,brief,proracun,termin,vir,posredovano,napaka,created_at')
      .order('created_at', { ascending: false }).limit(200),
  ]);

  return NextResponse.json({
    naroceni: naroceni.data || [],
    povprasevanja: povprasevanja.data || [],
    /* Tabela povprasevanj je nova; dokler migracija ni pognana, to ni napaka. */
    opozorilo: povprasevanja.error ? 'Tabele povprasevanja še ni — poženi migracijo.' : null,
  });
}

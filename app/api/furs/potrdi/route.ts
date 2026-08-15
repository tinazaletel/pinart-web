import { NextResponse } from 'next/server';
import { omejiApi } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  // IP-osnovna omejitev: ta pot nima uporabniske avtentikacije (stub, ki vrne
  // 503). Ko bo FURS integracija aktivna in bo pridobila prijavljenega
  // uporabnika, se lahko userId doda kot 4. argument.
  const omejitev = await omejiApi(request, 'furs-potrdi', 30);
  if (omejitev) return omejitev;

  // Prihodnja FURS integracija bo po uspesni potrditvi s service-role odjemalcem
  // zapisala fiscal_confirmed_at, fiscal_eor, fiscal_zoi in fiscal_provider.
  return NextResponse.json(
    { error: 'FURS integracija se ni aktivna.', code: 'FURS_NOT_CONFIGURED' },
    { status: 503 },
  );
}

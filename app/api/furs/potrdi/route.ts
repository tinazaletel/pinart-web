import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST() {
  // Prihodnja FURS integracija bo po uspesni potrditvi s service-role odjemalcem
  // zapisala fiscal_confirmed_at, fiscal_eor, fiscal_zoi in fiscal_provider.
  return NextResponse.json(
    { error: 'FURS integracija se ni aktivna.', code: 'FURS_NOT_CONFIGURED' },
    { status: 503 },
  );
}

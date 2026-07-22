import { NextResponse } from 'next/server';

/**
 * Prijava v admin pregled cen (/kalkulator/admin). Eno samo geslo,
 * eno samo skrbnico — brez uporabniskih racunov, brez baze.
 */
export async function POST(request: Request) {
  const geslo = process.env.KALKULATOR_ADMIN_GESLO;
  if (!geslo) return NextResponse.json({ ok: false, reason: 'not-configured' }, { status: 500 });

  let body: { geslo?: string } = {};
  try { body = await request.json(); } catch { /* prazno telo zavrnemo spodaj */ }

  if (body.geslo !== geslo) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set('pinart_admin', geslo, {
    httpOnly: true,
    /* secure samo v produkciji: Safari piskotka z 'secure' na http://localhost
       NE shrani, zato je prijava uspela, seje pa ni bilo */
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

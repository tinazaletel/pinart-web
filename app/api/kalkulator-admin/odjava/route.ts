import { NextResponse } from 'next/server';

/**
 * Odjava iz pregleda poslovanja: piškotek se izbriše.
 *
 * maxAge: 0 in ista pot kot ob prijavi — brskalnik piškotek izbriše samo, če se
 * ujemata pot in domena, sicer bi ostal in odjava ne bi delovala.
 */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set('pinart_admin', '', {
    httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 0,
  });
  return res;
}

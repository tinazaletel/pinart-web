import { NextResponse } from 'next/server';
import { jeEmail, omejenNiz, preberiJson, sporociloValidacije } from '@/lib/validacija';

export async function POST(request: Request) {
  const endpoint = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  let body: Record<string, unknown>;
  try { body = await preberiJson(request, 8_000); }
  catch (error) { return NextResponse.json({ error: sporociloValidacije(error) }, { status: 400 }); }

  if (body.website) return NextResponse.json({ ok: true });
  if (!omejenNiz(body.name, 120, true) || !jeEmail(body.email) || !omejenNiz(body.brief, 5000, true)) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  if (!endpoint) {
    return NextResponse.json({ error: 'Google Sheets webhook is not configured' }, { status: 503 });
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ ...body, submittedAt: new Date().toISOString() }),
    redirect: 'follow',
  });

  if (!response.ok) return NextResponse.json({ error: 'Submission failed' }, { status: 502 });
  return NextResponse.json({ ok: true });
}

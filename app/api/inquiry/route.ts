import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const endpoint = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  const body = await request.json();

  if (body.website) return NextResponse.json({ ok: true });
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email || '');
  if (!body.name || !emailValid || !body.brief || body.name.length > 120 || body.brief.length > 5000) {
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

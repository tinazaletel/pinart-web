import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

const stanje = vi.hoisted(() => ({ omejitev: null as Response | null, org: null as Record<string, unknown> | null }));
vi.mock('@/lib/rate-limit', () => ({ omejiApi: vi.fn(async () => stanje.omejitev) }));
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: () => ({ from: () => { const q = { select: () => q, eq: () => q, maybeSingle: async () => ({ data: stanje.org }) }; return q; } }) }));
vi.mock('resend', () => ({ Resend: class { emails = { send: vi.fn() }; } }));

import { GET, POST } from '@/app/api/povprasevanje/[slug]/route';

const ctx = { params: { slug: 'studio-test' } };

describe('javna pot povprasevanja', () => {
  beforeEach(() => { stanje.omejitev = null; stanje.org = null; });

  it('neobstojec slug vrne 404', async () => {
    expect((await GET(new Request('https://flow.test/api/povprasevanje/studio-test'), ctx)).status).toBe(404);
  });

  it('honeypot tiho sprejme bota brez zapisa', async () => {
    const request = new Request('https://flow.test/api/povprasevanje/studio-test', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ website: 'https://spam.test' }) });
    const response = await POST(request, ctx);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it('prekoračena omejitev vrne 429', async () => {
    stanje.omejitev = NextResponse.json({ napaka: 'Preveč zahtev.' }, { status: 429 });
    const request = new Request('https://flow.test/api/povprasevanje/studio-test', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    expect((await POST(request, ctx)).status).toBe(429);
  });

  it('prevelik zahtevek zavrne pred branjem podatkov', async () => {
    const request = new Request('https://flow.test/api/povprasevanje/studio-test', { method: 'POST', headers: { 'content-type': 'application/json', 'content-length': '50000' }, body: '{}' });
    expect((await POST(request, ctx)).status).toBe(400);
  });
});

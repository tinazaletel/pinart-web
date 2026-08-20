import { beforeEach, describe, expect, it, vi } from 'vitest';

const stanje = vi.hoisted(() => ({ zapis: null as null | Record<string, unknown>, rpc: vi.fn() }));
vi.mock('@/lib/rate-limit', () => ({ omejiApi: vi.fn(async () => null) }));
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: () => ({
  from: (table: string) => {
    const chain: Record<string, unknown> = { select: () => chain, eq: () => chain, maybeSingle: async () => ({ data: stanje.zapis }), then: (resolve: (v: unknown) => unknown) => resolve(table === 'contract_signatures' ? { data: [] } : { data: null }) };
    return chain;
  },
  rpc: stanje.rpc,
}) }));

import { GET, POST } from '@/app/api/pogodbe/podpis/[token]/route';

const kontekst = { params: { token: 'veljaven-neuganljiv-zeton' } };
const zapis = (spremembe: Record<string, unknown> = {}) => ({ id: 'r1', contract_id: 'c1', content_hash: 'a'.repeat(64), content_snapshot: '<p>Pogodba</p>', expires_at: new Date(Date.now() + 60_000).toISOString(), completed_at: null, contracts: { title: 'Pogodba' }, ...spremembe });

describe('javna pot podpisa pogodbe', () => {
  beforeEach(() => { stanje.zapis = zapis(); stanje.rpc.mockReset(); });

  it('veljaven zeton vrne nespremenljiv posnetek', async () => {
    const response = await GET(new Request('https://flow.test/api/pogodbe/podpis/x'), kontekst);
    expect(response.status).toBe(200);
    expect((await response.json()).contentHash).toBe('a'.repeat(64));
  });

  it('potekel zeton zavrne', async () => {
    stanje.zapis = zapis({ expires_at: new Date(Date.now() - 1000).toISOString() });
    expect((await GET(new Request('https://flow.test/api/pogodbe/podpis/x'), kontekst)).status).toBe(410);
  });

  it('dvojni podpis zavrne pred zapisom', async () => {
    stanje.zapis = zapis({ completed_at: new Date().toISOString() });
    const request = new Request('https://flow.test/api/pogodbe/podpis/x', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ signerName: 'Ana Novak', consent: true }) });
    expect((await POST(request, kontekst)).status).toBe(409);
    expect(stanje.rpc).not.toHaveBeenCalled();
  });

  it('podpis uporabi transakcijski RPC, ki zaklene pogodbo', async () => {
    stanje.rpc.mockResolvedValue({ data: [{ signed_at: '2026-08-20T12:00:00Z', content_hash: 'a'.repeat(64) }], error: null });
    const request = new Request('https://flow.test/api/pogodbe/podpis/x', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ signerName: 'Ana Novak', consent: true }) });
    const response = await POST(request, kontekst);
    expect(response.status).toBe(200);
    expect(stanje.rpc).toHaveBeenCalledWith('podpisi_pogodbo_javno', expect.objectContaining({ p_signer_name: 'Ana Novak' }));
  });
});

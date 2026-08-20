import { describe, expect, it } from 'vitest';
import { preberiClanstvo } from '@/lib/clanstvo';

describe('preberiClanstvo', () => {
  it('ob podvojenem clanstvu izbere owner pred member', async () => {
    const query = { select: () => query, eq: async () => ({ data: [
      { organization_id: 'o1', role: 'member', disabled_at: null },
      { organization_id: 'o1', role: 'owner', disabled_at: null },
    ], error: null }) };
    const admin = { from: () => query } as never;
    await expect(preberiClanstvo(admin, 'o1', 'u1')).resolves.toMatchObject({ role: 'owner' });
  });
});

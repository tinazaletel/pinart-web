import { describe, expect, it } from 'vitest';
import { normalizirajZadevo, zdruziPostoVNiti } from '@/lib/postaNiti';
import type { PostaVnos } from '@/lib/postaDnevnik';

const mail = (delno: Partial<PostaVnos> & Pick<PostaVnos, 'id' | 'datum'>): PostaVnos => ({
  smer: 'prejeto', prejemniki: ['stranka@example.com'], zadeva: 'Projekt', ...delno,
});

describe('niti pošte', () => {
  it('odstrani ponavljajoče se predpone odgovora', () => {
    expect(normalizirajZadevo(' Re: Fwd:  Nova celostna podoba ')).toBe('nova celostna podoba');
  });

  it('združi po In-Reply-To in ohrani kronološki vrstni red', () => {
    const niti = zdruziPostoVNiti([
      mail({ id: 'b', datum: '2026-08-20T11:00:00Z', inReplyTo: '<a>', zadeva: 'Druga zadeva' }),
      mail({ id: 'a', datum: '2026-08-20T10:00:00Z', messageId: '<a>' }),
    ]);
    expect(niti).toHaveLength(1);
    expect(niti[0].sporocila.map(v => v.id)).toEqual(['a', 'b']);
  });

  it('brez glav združi le isto zadevo istega projekta', () => {
    const niti = zdruziPostoVNiti([
      mail({ id: 'a', datum: '2026-08-20T10:00:00Z', projectId: 'p1', zadeva: 'Ponudba' }),
      mail({ id: 'b', datum: '2026-08-20T11:00:00Z', projectId: 'p1', zadeva: 'Re: Ponudba', smer: 'poslano' }),
      mail({ id: 'c', datum: '2026-08-20T12:00:00Z', projectId: 'p2', zadeva: 'Ponudba' }),
    ]);
    expect(niti).toHaveLength(2);
  });
});

import { describe, expect, it } from 'vitest';
import { fursQrSvg } from '@/lib/fursQr';

describe('FURS QR', () => {
  it('izdela predpisano kodo 25 × 25 z robom štirih modulov', () => {
    const svg = fursQrSvg('223175087923687075112234402528973166755123456781508151013321');
    expect(svg).toContain('viewBox="0 0 33 33"');
    expect(svg).toContain('shape-rendering="crispEdges"');
  });

  it('zavrne vsebino napačne dolžine', () => {
    expect(() => fursQrSvg('123')).toThrow(/60 številk/);
  });
});

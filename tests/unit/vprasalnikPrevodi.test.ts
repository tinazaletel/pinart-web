import { describe, expect, it } from 'vitest';
import { PANOGE } from '../../lib/vprasalnikPanoge';
import { SKLOPI_EN, UVOD_EN, VPRASANJA_EN, prevodVprasanja } from '../../lib/vprasalnikPanogeEn';

/* Angleska razlicica vprasalnika je slovar po panogi in oznaki vprasanja.
   Ce kdo v slovenski vir doda ali preimenuje vprasanje, mora ta test pasti —
   sicer bi tuji izpolnjevalec sredi angleskega vprasalnika dobil slovensko
   vprasanje (Tina, 3. 9. 2026). */

const SUMNIKI = /[čšžČŠŽ]/;

describe('vprasalnik: angleska besedila', () => {
  it('oznake vprasanj so znotraj vsake panoge enolicne', () => {
    for (const p of PANOGE) {
      const oznake = p.sklopi.flatMap(s => s.vprasanja.map(v => v.id));
      expect(new Set(oznake).size, p.id).toBe(oznake.length);
    }
  });

  it('vsaka panoga ima angleski uvod in vsak sklop angleski naslov', () => {
    for (const p of PANOGE) {
      expect(UVOD_EN[p.id], `uvod ${p.id}`).toBeTruthy();
      for (const s of p.sklopi) expect(SKLOPI_EN[s.sklop], `sklop »${s.sklop}« (${p.id})`).toBeTruthy();
    }
  });

  it('vsako vprasanje ima prevod z enako oblikovanimi izbirami, namigom in dopolnilom', () => {
    for (const p of PANOGE) {
      for (const s of p.sklopi) {
        for (const v of s.vprasanja) {
          const t = prevodVprasanja(p.id, v.id);
          expect(t, `${p.id}/${v.id}`).toBeTruthy();
          if (!t) continue;
          expect(t.q.trim().length, `${p.id}/${v.id} q`).toBeGreaterThan(0);
          expect(Boolean(t.namig), `${p.id}/${v.id} namig`).toBe(Boolean(v.namig));
          expect(Boolean(t.dopolnilo), `${p.id}/${v.id} dopolnilo`).toBe(Boolean(v.dopolnilo));
          if (v.izbire) expect(t.izbire, `${p.id}/${v.id} izbire`).toHaveLength(v.izbire.length);
          else expect(t.izbire, `${p.id}/${v.id} izbire`).toBeUndefined();
        }
      }
    }
  });

  it('noben prevod ne visi brez vprasanja in nobena panoga brez slovarja', () => {
    const panoge = new Set(PANOGE.map(p => p.id));
    for (const panogaId of Object.keys(VPRASANJA_EN)) {
      expect(panoge.has(panogaId), `panoga ${panogaId}`).toBe(true);
      const oznake = new Set(PANOGE.find(p => p.id === panogaId)!.sklopi.flatMap(s => s.vprasanja.map(v => v.id)));
      for (const oznaka of Object.keys(VPRASANJA_EN[panogaId])) {
        expect(oznake.has(oznaka), `${panogaId}/${oznaka} nima vprasanja`).toBe(true);
      }
    }
    for (const p of PANOGE) expect(VPRASANJA_EN[p.id], `slovar ${p.id}`).toBeTruthy();
  });

  it('v angleskih besedilih ni slovenskih sumnikov (nepreveden prepis)', () => {
    const besedila: string[] = [...Object.values(SKLOPI_EN), ...Object.values(UVOD_EN)];
    for (const slovar of Object.values(VPRASANJA_EN)) {
      for (const t of Object.values(slovar)) {
        besedila.push(t.q);
        if (t.namig) besedila.push(t.namig);
        if (t.dopolnilo) besedila.push(t.dopolnilo);
        if (t.izbire) besedila.push(...t.izbire);
      }
    }
    for (const b of besedila) expect(b, b).not.toMatch(SUMNIKI);
  });

  it('kljucno vprasanje za primerjavo s trgom ima prevod', () => {
    expect(prevodVprasanja('grafika', 'tiskovine-koliko-zaracunas-na-stran-ko-gre-s-18')?.q).toContain('per page');
    expect(prevodVprasanja('marketing', 'druzbena-omrezja-koliko-zaracunas-za-vodenj-5')?.q).toContain('social network');
  });
});

import { describe, it, expect } from 'vitest';
import { pregledCopilot, type CopilotVhod } from '@/lib/copilot';

/* Zdrava ponudba: cena na trgu, pravice zaračunane, priporočeni paket, brez popusta. */
const zdrava: CopilotVhod = {
  izbraniSkupaj: 1000,
  referencaDelo: 1000,
  delo: 800,
  pravice: 200,
  licenca: 0,
  prenos: 'izkljucni',
  raba: 'projekt',
  popustPct: 0,
  trgMult: 1,
  ddvZavezanec: true,
  izbraniPaketId: 'priporoceni',
  trgNarocnikaIme: 'Slovenija',
  glavnaStoritevIme: 'Logotip',
  praviceVrstice: [],
};

const ids = (v: CopilotVhod) => pregledCopilot(v).map(n => n.id);

describe('copilot — svetovalna pravila', () => {
  it('zdrava ponudba nima opozoril', () => {
    expect(pregledCopilot(zdrava)).toEqual([]);
  });

  it('cena pod trgom -> pod-trgom', () => {
    expect(ids({ ...zdrava, izbraniSkupaj: 500 })).toContain('pod-trgom');
  });

  it('znamka brez zaračunanih pravic -> opozorilo manjka-pravice', () => {
    const n = pregledCopilot({ ...zdrava, raba: 'znamka', pravice: 0 });
    expect(n.map(x => x.id)).toContain('manjka-pravice');
    expect(n.find(x => x.id === 'manjka-pravice')?.resnost).toBe('opozorilo');
  });

  it('model licenca z zneskom 0 -> licenca-brez-pravic', () => {
    expect(ids({ ...zdrava, prenos: 'licenca', licenca: 0 })).toContain('licenca-brez-pravic');
  });

  it('osnovni paket pri velikem obsegu -> ni-revizij', () => {
    expect(ids({ ...zdrava, izbraniPaketId: 'osnovni', delo: 1500 })).toContain('ni-revizij');
  });

  it('izdelek z izključnim odkupom brez tantiem -> tantieme predlog', () => {
    expect(ids({ ...zdrava, praviceVrstice: [{ sid: 'embalaza', ime: 'Embalaža', prenos: 'izkljucni', obsegMult: 1 }] }))
      .toContain('tantieme-namesto-odkupa');
  });

  it('velik popust -> previsok-popust', () => {
    expect(ids({ ...zdrava, popustPct: 25 })).toContain('previsok-popust');
  });

  it('DDV pri visokem znesku brez zavezanosti -> ddv-nepotrjen', () => {
    expect(ids({ ...zdrava, ddvZavezanec: false, delo: 6000 })).toContain('ddv-nepotrjen');
  });
});

import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  DOLZINA_NAKLJUCJA,
  DOLZINA_NAMIGA,
  PREDPONA_AGENT_KLJUCA,
  agentKljucIzGlave,
  jeVeljavnaOblikaKljuca,
  namigAgentKljuca,
  ustvariAgentKljuc,
  zgostiAgentKljuc,
} from '@/lib/agentKljuc';

/* Ključi za zunanje agente — čiste funkcije, brez baze in brez mreže.
   Kar je tu preverjeno, je varnostna pogodba poti /api/agent/naloge:
   ključ ima točno določeno obliko, zgostitev je deterministična (sicer ključa
   po njej ne bi bilo mogoče najti) in namig razkrije samo štiri znake. */

/* Ključ z ničlami — dolžinsko pravi, a povsem predvidljiv, zato uporaben kot
   stalna testna vrednost. Zgostitev je izračunana z node:crypto. */
const TESTNI_KLJUC = 'pf_00000000000000000000000000000000';
const TESTNA_ZGOSTITEV = '438e2bcb0a0bba3fd373c631410a7e5eb3b2d0ea1df427c1dec0e11bec1678be';

describe('agentKljuc — oblika ključa', () => {
  it('ustvari ključ s predpono pf_ in 32 naključnimi znaki', () => {
    const { kljuc } = ustvariAgentKljuc();
    expect(kljuc.startsWith(PREDPONA_AGENT_KLJUCA)).toBe(true);
    expect(kljuc).toHaveLength(PREDPONA_AGENT_KLJUCA.length + DOLZINA_NAKLJUCJA);
    expect(kljuc).toMatch(/^pf_[A-Za-z0-9_-]{32}$/);
  });

  it('ustvarjeni ključ prestane lastno preverjanje oblike', () => {
    for (let i = 0; i < 50; i += 1) {
      expect(jeVeljavnaOblikaKljuca(ustvariAgentKljuc().kljuc)).toBe(true);
    }
  });

  it('dva zaporedna ključa nista enaka (naključje res teče)', () => {
    const kljuci = new Set(Array.from({ length: 100 }, () => ustvariAgentKljuc().kljuc));
    expect(kljuci.size).toBe(100);
  });

  it('ključ ne vsebuje znakov, ki bi jih bilo treba ubežiti v glavi ali .env', () => {
    const { kljuc } = ustvariAgentKljuc();
    expect(kljuc).not.toMatch(/[=+/\s"'\\]/);
  });
});

describe('agentKljuc — zgostitev', () => {
  it('je stabilna: isti ključ da vedno isto zgostitev', () => {
    expect(zgostiAgentKljuc(TESTNI_KLJUC)).toBe(TESTNA_ZGOSTITEV);
    expect(zgostiAgentKljuc(TESTNI_KLJUC)).toBe(zgostiAgentKljuc(TESTNI_KLJUC));
  });

  it('je SHA-256 v hex — 64 znakov [0-9a-f]', () => {
    const { zgostitev } = ustvariAgentKljuc();
    expect(zgostitev).toHaveLength(64);
    expect(zgostitev).toMatch(/^[0-9a-f]{64}$/);
  });

  it('se ujema z node:crypto (nič lastnega izračuna)', () => {
    const { kljuc, zgostitev } = ustvariAgentKljuc();
    expect(zgostitev).toBe(createHash('sha256').update(kljuc, 'utf8').digest('hex'));
  });

  it('različna ključa dasta različni zgostitvi', () => {
    const a = ustvariAgentKljuc();
    const b = ustvariAgentKljuc();
    expect(a.zgostitev).not.toBe(b.zgostitev);
  });

  it('zgostitev ne vsebuje ključa (enosmernost)', () => {
    const { kljuc, zgostitev } = ustvariAgentKljuc();
    expect(zgostitev).not.toContain(kljuc.slice(PREDPONA_AGENT_KLJUCA.length));
    expect(zgostitev).not.toContain(PREDPONA_AGENT_KLJUCA);
  });

  it('en sam spremenjen znak da povsem drugo zgostitev', () => {
    const drugacen = `${TESTNI_KLJUC.slice(0, -1)}1`;
    expect(zgostiAgentKljuc(drugacen)).not.toBe(TESTNA_ZGOSTITEV);
  });
});

describe('agentKljuc — namig', () => {
  it('je zadnjih 4 znakov ključa', () => {
    expect(namigAgentKljuca('pf_abcdefghijklmnopqrstuvwxyz012345')).toBe('2345');
    expect(namigAgentKljuca(TESTNI_KLJUC)).toBe('0000');
  });

  it('ustvarjeni ključ vrne namig, ki se ujema s koncem ključa', () => {
    const { kljuc, namig } = ustvariAgentKljuc();
    expect(namig).toHaveLength(DOLZINA_NAMIGA);
    expect(kljuc.endsWith(namig)).toBe(true);
  });

  it('razkrije natanko štiri znake, ostalo ostane skrito', () => {
    const { kljuc, namig } = ustvariAgentKljuc();
    expect(namig).not.toBe(kljuc);
    /* 35 znakov ključa minus 4 znaki namiga = 31 znakov, ki jih namig ne izda. */
    expect(kljuc.length - namig.length).toBe(31);
    expect(namigAgentKljuca(TESTNI_KLJUC)).not.toContain(PREDPONA_AGENT_KLJUCA);
  });

  it('krajši niz od štirih znakov vrne sam sebe (robni primer)', () => {
    expect(namigAgentKljuca('ab')).toBe('ab');
    expect(namigAgentKljuca('')).toBe('');
  });
});

describe('agentKljuc — zavrnitev napačne oblike', () => {
  it('zavrne napačno predpono', () => {
    expect(jeVeljavnaOblikaKljuca('sk_00000000000000000000000000000000')).toBe(false);
    expect(jeVeljavnaOblikaKljuca('pf-00000000000000000000000000000000')).toBe(false);
    expect(jeVeljavnaOblikaKljuca('00000000000000000000000000000000')).toBe(false);
  });

  it('zavrne napačno dolžino (prekratek in predolg)', () => {
    expect(jeVeljavnaOblikaKljuca(`pf_${'a'.repeat(31)}`)).toBe(false);
    expect(jeVeljavnaOblikaKljuca(`pf_${'a'.repeat(33)}`)).toBe(false);
    expect(jeVeljavnaOblikaKljuca('pf_')).toBe(false);
  });

  it('zavrne ključ bralnega API-ja v1 (pf_ + 43 znakov)', () => {
    /* Ključa se ne smeta zamenjati: bralni ključ ne sme odpirati vpisa nalog. */
    expect(jeVeljavnaOblikaKljuca(`pf_${'a'.repeat(43)}`)).toBe(false);
  });

  it('zavrne nedovoljene znake in presledke', () => {
    expect(jeVeljavnaOblikaKljuca(`pf_${'a'.repeat(31)}!`)).toBe(false);
    expect(jeVeljavnaOblikaKljuca(`pf_${'a'.repeat(31)} `)).toBe(false);
    expect(jeVeljavnaOblikaKljuca(` pf_${'a'.repeat(32)}`)).toBe(false);
    expect(jeVeljavnaOblikaKljuca(`pf_${'a'.repeat(31)}\n`)).toBe(false);
  });

  it('zavrne vse, kar ni niz', () => {
    expect(jeVeljavnaOblikaKljuca(undefined)).toBe(false);
    expect(jeVeljavnaOblikaKljuca(null)).toBe(false);
    expect(jeVeljavnaOblikaKljuca(123)).toBe(false);
    expect(jeVeljavnaOblikaKljuca({})).toBe(false);
    expect(jeVeljavnaOblikaKljuca([`pf_${'a'.repeat(32)}`])).toBe(false);
  });
});

describe('agentKljuc — glava Authorization', () => {
  it('izlušči ključ iz sheme Bearer', () => {
    const { kljuc } = ustvariAgentKljuc();
    expect(agentKljucIzGlave(`Bearer ${kljuc}`)).toBe(kljuc);
    expect(agentKljucIzGlave(`bearer ${kljuc}`)).toBe(kljuc);
    expect(agentKljucIzGlave(`  Bearer   ${kljuc}  `)).toBe(kljuc);
  });

  it('vrne null, kadar glave ni ali je prazna', () => {
    expect(agentKljucIzGlave(null)).toBeNull();
    expect(agentKljucIzGlave(undefined)).toBeNull();
    expect(agentKljucIzGlave('')).toBeNull();
    expect(agentKljucIzGlave('   ')).toBeNull();
  });

  it('vrne null za drugo shemo ali gol ključ brez sheme', () => {
    const { kljuc } = ustvariAgentKljuc();
    expect(agentKljucIzGlave(kljuc)).toBeNull();
    expect(agentKljucIzGlave(`Basic ${kljuc}`)).toBeNull();
    expect(agentKljucIzGlave(`Token ${kljuc}`)).toBeNull();
  });

  it('vrne null, kadar je za Bearer nekaj napačne oblike', () => {
    expect(agentKljucIzGlave('Bearer nekaj-drugega')).toBeNull();
    expect(agentKljucIzGlave(`Bearer pf_${'a'.repeat(43)}`)).toBeNull();
    expect(agentKljucIzGlave('Bearer')).toBeNull();
  });
});

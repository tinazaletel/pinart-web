import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { lookupKeyZa, razberiLookup, kljucUstrezaPonudbi, vsiKljuci } from '@/lib/stripeCene';
import { preveriPodpis, razcleniGlavo } from '@/lib/stripePodpis';
import { splosciPolja } from '@/lib/stripeKlic';

describe('preslikava cen v Stripove lestvice', () => {
  it('vrne pravi ključ za vsako ponudbo, ki jo prodajamo', () => {
    expect(lookupKeyZa('ustanovna', 'premium', 'mesec')).toBe('premium_ustanovna');
    expect(lookupKeyZa('ustanovna', 'premium', 'leto')).toBe('premium_ustanovna_letno');
    expect(lookupKeyZa('uvodna', 'premium', 'mesec')).toBe('premium_mesecno');
    expect(lookupKeyZa('uvodna', 'premium', 'leto')).toBe('premium_letno');
    expect(lookupKeyZa('uvodna', 'pro', 'mesec')).toBe('pro_mesecno');
    expect(lookupKeyZa('uvodna', 'pro', 'leto')).toBe('pro_letno');
  });

  it('za free nikoli ne vrne lestvice', () => {
    expect(lookupKeyZa('uvodna', 'free', 'mesec')).toBeNull();
    expect(lookupKeyZa('redna', 'free', 'leto')).toBeNull();
  });

  it('prizna, da redne mesečne in ustanovne Pro lestvice ni', () => {
    /* Namerno prazno, ne pozabljeno: 19 € in 39 € v Stripu še ne obstajata,
       ustanovne ponudbe za Pro pa nismo nikoli oglaševali. */
    expect(lookupKeyZa('redna', 'premium', 'mesec')).toBeNull();
    expect(lookupKeyZa('redna', 'pro', 'mesec')).toBeNull();
    expect(lookupKeyZa('ustanovna', 'pro', 'mesec')).toBeNull();
    expect(lookupKeyZa('ustanovna', 'pro', 'leto')).toBeNull();
  });

  it('pričakuje natanko tistih šest ključev, ki so v Stripu', () => {
    expect(vsiKljuci()).toEqual([
      'premium_letno', 'premium_mesecno', 'premium_ustanovna', 'premium_ustanovna_letno', 'pro_letno', 'pro_mesecno',
    ]);
  });

  it('iz ključa razbere paket in obdobje', () => {
    expect(razberiLookup('pro_letno')).toEqual({ ponudba: 'uvodna', paket: 'pro', obdobje: 'leto' });
    expect(razberiLookup('premium_ustanovna')).toEqual({ ponudba: 'ustanovna', paket: 'premium', obdobje: 'mesec' });
  });

  it('neznanega ključa ne ugiba', () => {
    expect(razberiLookup('nekaj_drugega')).toBeNull();
    expect(razberiLookup(null)).toBeNull();
    expect(razberiLookup(undefined)).toBeNull();
  });

  it('ve, da isti ključ pripada dvema ponudbama', () => {
    /* premium_letno je uvodna IN redna cena — zato ponudbe ni dovoljeno brati
       iz ključa, ampak jo določi ura naročila. */
    expect(kljucUstrezaPonudbi('premium_letno', 'uvodna', 'premium', 'leto')).toBe(true);
    expect(kljucUstrezaPonudbi('premium_letno', 'redna', 'premium', 'leto')).toBe(true);
    expect(kljucUstrezaPonudbi('premium_letno', 'ustanovna', 'premium', 'leto')).toBe(false);
  });
});

describe('podpis webhooka', () => {
  const skrivnost = 'whsec_test_skrivnost';
  const telo = '{"id":"evt_1","type":"checkout.session.completed"}';
  const podpisi = (cas: number, s = skrivnost) => createHmac('sha256', s).update(`${cas}.${telo}`, 'utf8').digest('hex');

  it('sprejme veljaven podpis', () => {
    const cas = 1_700_000_000;
    expect(preveriPodpis(telo, `t=${cas},v1=${podpisi(cas)}`, skrivnost, cas)).toEqual({ ok: true });
  });

  it('sprejme, če se ujema kateri koli od več podpisov', () => {
    const cas = 1_700_000_000;
    const glava = `t=${cas},v1=${'0'.repeat(64)},v1=${podpisi(cas)}`;
    expect(preveriPodpis(telo, glava, skrivnost, cas).ok).toBe(true);
  });

  it('zavrne tuj podpis', () => {
    const cas = 1_700_000_000;
    const izid = preveriPodpis(telo, `t=${cas},v1=${podpisi(cas, 'druga_skrivnost')}`, skrivnost, cas);
    expect(izid).toEqual({ ok: false, razlog: 'podpis se ne ujema' });
  });

  it('zavrne spremenjeno telo', () => {
    const cas = 1_700_000_000;
    const glava = `t=${cas},v1=${podpisi(cas)}`;
    expect(preveriPodpis(telo.replace('evt_1', 'evt_2'), glava, skrivnost, cas).ok).toBe(false);
  });

  it('zavrne prestar žig (ponovljen zahtevek)', () => {
    const cas = 1_700_000_000;
    const izid = preveriPodpis(telo, `t=${cas},v1=${podpisi(cas)}`, skrivnost, cas + 3_600);
    expect(izid).toEqual({ ok: false, razlog: 'časovni žig je prestar' });
  });

  it('zavrne, dokler skrivnost ni nastavljena', () => {
    expect(preveriPodpis(telo, 't=1,v1=x', '', 1).ok).toBe(false);
  });

  it('zavrne glavo brez žiga ali podpisa', () => {
    expect(preveriPodpis(telo, 'v1=abc', skrivnost, 1).ok).toBe(false);
    expect(preveriPodpis(telo, 't=1', skrivnost, 1).ok).toBe(false);
    expect(preveriPodpis(telo, '', skrivnost, 1).ok).toBe(false);
  });

  it('razčleni glavo z več podpisi', () => {
    expect(razcleniGlavo('t=123,v1=a,v0=b,v1=c')).toEqual({ cas: 123, podpisi: ['a', 'c'] });
  });
});

describe('oblika polj za Stripe', () => {
  it('gnezdene objekte zapiše v oglatih oklepajih', () => {
    expect(splosciPolja({ metadata: { organization_id: 'org-1', paket: 'pro' }, mode: 'subscription' })).toEqual([
      ['metadata[organization_id]', 'org-1'],
      ['metadata[paket]', 'pro'],
      ['mode', 'subscription'],
    ]);
  });

  it('izpusti prazne vrednosti, ne pa ničle', () => {
    expect(splosciPolja({ a: undefined, b: null, c: 0 })).toEqual([['c', '0']]);
  });
});

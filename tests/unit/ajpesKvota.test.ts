import { describe, it, expect } from 'vitest';
import { AJPES_KVOTE, kvotaZa, preveriKvoto, mejiObdobij } from '@/lib/ajpesKvota';

describe('kvota AJPES pregledov', () => {
  it('brezplačni paket pregleda nima', () => {
    const izid = preveriKvoto('free', 0, 0);
    expect(izid.dovoljeno).toBe(false);
    if (!izid.dovoljeno) expect(izid.razlog).toBe('paket');
  });

  it('neznan paket obravnava kot brezplačnega, ne kot Pro', () => {
    /* Napaka v imenu paketa ne sme razdajati plačanih enot. */
    expect(kvotaZa('nekaj-cisto-drugega')).toEqual(AJPES_KVOTE.free);
  });

  it('Premium dovoli pregled in vrne ostanek', () => {
    const izid = preveriKvoto('premium', 0, 0);
    expect(izid).toEqual({ dovoljeno: true, ostanekDanes: 2, ostanekMesec: 9 });
  });

  it('ustavi ob dnevni meji, čeprav je mesečna še odprta', () => {
    const izid = preveriKvoto('premium', 3, 5);
    expect(izid.dovoljeno).toBe(false);
    if (!izid.dovoljeno) expect(izid.razlog).toBe('dan');
  });

  it('mesečna meja ima prednost pred dnevno', () => {
    /* Ob prvem v mesecu je dnevna poraba 0, mesečna pa polna — sporočilo mora
       povedati pravi razlog, sicer človek jutri spet poskuša zaman. */
    const izid = preveriKvoto('premium', 0, 10);
    expect(izid.dovoljeno).toBe(false);
    if (!izid.dovoljeno) expect(izid.razlog).toBe('mesec');
  });

  it('Pro ima višji meji od Premiuma', () => {
    expect(AJPES_KVOTE.pro.dan).toBeGreaterThan(AJPES_KVOTE.premium.dan);
    expect(AJPES_KVOTE.pro.mesec).toBeGreaterThan(AJPES_KVOTE.premium.mesec);
  });

  it('že prevzeta kombinacija gre mimo obeh mej', () => {
    /* AJPES iste kombinacije ne zaračuna dvakrat — če bi jo šteli v kvoto,
       bi uporabnica plačevala za nekaj, kar je zastonj. */
    const izid = preveriKvoto('premium', 5, 20, true);
    expect(izid.dovoljeno).toBe(true);
  });

  it('tudi na brezplačnem paketu je ponovni ogled dovoljen', () => {
    expect(preveriKvoto('free', 0, 0, true).dovoljeno).toBe(true);
  });

  it('meji obdobij sta začetek dneva in začetek meseca', () => {
    const meje = mejiObdobij(new Date(2026, 7, 28, 13, 45));
    expect(new Date(meje.odDanes).getDate()).toBe(28);
    expect(new Date(meje.odDanes).getHours()).toBe(0);
    expect(new Date(meje.odMeseca).getDate()).toBe(1);
  });
});

'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

type Podatki = { title: string; html: string; contentHash: string; completedAt?: string; signatures: Array<{ party: string; signer_name: string; signed_at: string }> };

export default function JavniPodpisPogodbe() {
  const { token } = useParams<{ token: string }>();
  const [podatki, setPodatki] = useState<Podatki | null>(null);
  const [napaka, setNapaka] = useState('');
  const [ime, setIme] = useState('');
  const [soglasje, setSoglasje] = useState(false);
  const [posiljam, setPosiljam] = useState(false);
  const [podpisano, setPodpisano] = useState(false);

  useEffect(() => {
    void fetch(`/api/pogodbe/podpis/${encodeURIComponent(token)}`, { cache: 'no-store' })
      .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.napaka); return d; })
      .then(d => { setPodatki(d); setPodpisano(Boolean(d.completedAt)); })
      .catch(e => setNapaka(e instanceof Error ? e.message : 'Povezave ni bilo mogoče odpreti.'));
  }, [token]);

  const podpisi = async (e: FormEvent) => {
    e.preventDefault(); setNapaka(''); setPosiljam(true);
    try {
      const r = await fetch(`/api/pogodbe/podpis/${encodeURIComponent(token)}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ signerName: ime, consent: soglasje }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.napaka || 'Podpis ni uspel.');
      setPodpisano(true);
    } catch (e) { setNapaka(e instanceof Error ? e.message : 'Podpis ni uspel.'); }
    setPosiljam(false);
  };

  return <main style={{ maxWidth: 980, margin: '0 auto', padding: '32px 18px 64px', color: '#28231f', fontFamily: 'Arial, sans-serif' }}>
    <p style={{ color: '#6E4FA6', fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', fontSize: 12 }}>Pinart · dokazilo o soglasju</p>
    <h1>{podatki?.title || 'Pogodba za podpis'}</h1>
    <p style={{ color: '#625b54', lineHeight: 1.55 }}>Ta postopek zabeleži soglasje, čas, naslov IP in nespremenljiv hash vsebine. To ni kvalificiran elektronski podpis po eIDAS in ga ne nadomešča.</p>
    {napaka && <p role="alert" style={{ color: '#a4342a', fontWeight: 700 }}>{napaka}</p>}
    {podatki && <iframe title="Vsebina pogodbe" srcDoc={podatki.html} sandbox="" style={{ width: '100%', minHeight: '70vh', border: '1px solid #d8d2cb', borderRadius: 12, background: '#fff' }} />}
    {podatki && <p style={{ color: '#625b54', fontSize: 12, overflowWrap: 'anywhere' }}>SHA-256 vsebine: {podatki.contentHash}</p>}
    {podpisano ? <section style={{ padding: 20, borderRadius: 12, background: '#edf4f0', color: '#2F5D50' }}><b>Pogodba je podpisana in zaklenjena.</b></section> : podatki && <form onSubmit={podpisi} style={{ display: 'grid', gap: 14, marginTop: 24, padding: 22, border: '1px solid #d8d2cb', borderRadius: 12 }}>
      <label style={{ display: 'grid', gap: 6, fontWeight: 700 }}>Ime in priimek podpisnika<input required value={ime} onChange={e => setIme(e.target.value)} maxLength={160} style={{ padding: 12, border: '1px solid #8a8177', borderRadius: 8, font: 'inherit' }} /></label>
      <label style={{ display: 'flex', gap: 10, lineHeight: 1.45 }}><input type="checkbox" required checked={soglasje} onChange={e => setSoglasje(e.target.checked)} /> Potrjujem, da sem prebrala oziroma prebral prikazano pogodbo in soglašam z njeno vsebino.</label>
      <button disabled={posiljam} style={{ justifySelf: 'start', border: 0, borderRadius: 999, padding: '12px 20px', background: '#6E4FA6', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>{posiljam ? 'Beležim podpis …' : 'Podpiši pogodbo'}</button>
    </form>}
  </main>;
}

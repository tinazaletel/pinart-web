'use client';

import { useState } from 'react';

export default function AdminLogin() {
  const [geslo, setGeslo] = useState('');
  const [napaka, setNapaka] = useState(false);
  const [nalaganje, setNalaganje] = useState(false);
  /* oko: brez njega ne vidis, ali si zadela presledek ali napacno crko */
  const [vidno, setVidno] = useState(false);

  const prijava = async (e: React.FormEvent) => {
    e.preventDefault();
    setNalaganje(true);
    setNapaka(false);
    const res = await fetch('/api/kalkulator-admin/prijava', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ geslo }),
    });
    if (res.ok) {
      window.location.reload();
    } else {
      setNapaka(true);
      setNalaganje(false);
    }
  };

  return (
    <main style={{
      position: 'relative',
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#F5F2EA', fontFamily: 'system-ui, sans-serif', padding: '1.5rem',
    }}>
      {/* ABSOLUTNA pot: "../pregled" se je z naslova /kalkulator/admin (brez koncne posevnice)
          razrešil v /pregled -> 404. */}
      <a href="/kalkulator/pregled" style={{
        position: 'absolute', top: '1.5rem', left: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '.4rem',
        fontSize: '.82rem', fontWeight: 600, color: '#111', textDecoration: 'none',
        background: '#fff', border: '1px solid rgba(17,17,17,.12)', borderRadius: 999, padding: '.5rem 1rem',
      }}>← Pinart Flow</a>
      <form onSubmit={prijava} style={{
        background: '#fff', padding: '2.5rem', borderRadius: 16,
        boxShadow: '0 4px 18px rgba(17,17,17,.08)', width: 320, maxWidth: '100%',
      }}>
        <h1 style={{ fontSize: '1.1rem', marginBottom: '.5rem', color: '#111' }}>Admin — Kalkulator cene</h1>
        {/* pojasnilo, zakaj DRUGO geslo — brez tega izgleda, kot da te je odjavilo */}
        <p style={{ fontSize: '.82rem', lineHeight: 1.45, color: 'rgba(17,17,17,.6)', margin: '0 0 1.2rem' }}>
          Pregled poslovanja Pinart Flow. Ločen od tvojega Flow računa — zaščiten s svojim geslom, ker prikazuje cene z vsega trga.
        </p>
        <div style={{ position: 'relative', marginBottom: '.9rem' }}>
          <input
            type={vidno ? 'text' : 'password'} autoFocus value={geslo} onChange={e => setGeslo(e.target.value)}
            placeholder="Geslo"
            style={{
              width: '100%', boxSizing: 'border-box', padding: '.7rem 3rem .7rem .9rem', borderRadius: 8,
              border: '1px solid rgba(17,17,17,.25)', fontSize: '1rem', fontFamily: 'inherit',
            }}
          />
          <button type="button" onClick={() => setVidno(v => !v)}
            aria-label={vidno ? 'Skrij geslo' : 'Pokaži geslo'} title={vidno ? 'Skrij geslo' : 'Pokaži geslo'}
            style={{
              position: 'absolute', top: '50%', right: '.35rem', transform: 'translateY(-50%)',
              display: 'grid', placeItems: 'center', width: '2.4rem', height: '2.4rem',
              border: 0, borderRadius: '50%', background: 'none', color: 'rgba(17,17,17,.55)', cursor: 'pointer',
            }}>
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor"
              strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" /><circle cx="12" cy="12" r="2.6" />
              {!vidno && <path d="m4 20 16-16" />}
            </svg>
          </button>
        </div>
        {napaka && <p style={{ color: '#b25476', fontSize: '.85rem', margin: '0 0 .9rem' }}>Napačno geslo.</p>}
        <button type="submit" disabled={nalaganje} style={{
          width: '100%', padding: '.75rem', borderRadius: 8, border: 'none',
          background: '#111', color: '#fff', fontWeight: 600, fontSize: '.95rem',
          cursor: nalaganje ? 'default' : 'pointer', opacity: nalaganje ? .6 : 1,
        }}>
          {nalaganje ? 'Preverjam ...' : 'Prijava'}
        </button>
      </form>
    </main>
  );
}

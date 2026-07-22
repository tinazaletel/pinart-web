'use client';

import { useState } from 'react';
import type { Racun } from './upravljanje';

/**
 * Rocna dodelitev paketa: ustanoviteljica, testerji, sodelavci.
 *
 * Dodelitev nima datuma poteka — podarjen paket velja, dokler ga ne odvzames.
 * Stolpec "vir" loci podarjeno ("rocno") od placanega, da cez leto dni ves,
 * koga si kdaj sama odklenila.
 */
export default function AdminPaketi({ racuni }: { racuni: Racun[] }) {
  const [stanje, setStanje] = useState<Record<string, 'free' | 'pro'>>(
    Object.fromEntries(racuni.map(r => [r.id, r.paket])),
  );
  const [dela, setDela] = useState('');
  const [napaka, setNapaka] = useState('');
  const [iskanje, setIskanje] = useState('');

  const nastavi = async (id: string, paket: 'free' | 'pro') => {
    setDela(id); setNapaka('');
    const res = await fetch('/api/kalkulator-admin/paket', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizationId: id, paket }),
    });
    setDela('');
    if (!res.ok) { setNapaka('Ni uspelo. Poskusi znova.'); return; }
    setStanje(s => ({ ...s, [id]: paket }));
  };

  const q = iskanje.trim().toLowerCase();
  const vidni = q ? racuni.filter(r => r.ime.toLowerCase().includes(q)) : racuni;

  const TD = { padding: '.55rem .5rem' } as const;

  return (
    <>
      <h2 style={{ fontSize: '1rem', margin: '2.4rem 0 .3rem', fontWeight: 700 }}>Računi in paketi</h2>
      <p style={{ opacity: .55, fontSize: '.78rem', margin: '0 0 .8rem' }}>
        Edini del te strani, ki ni anonimen — brez imena računa paketa ni mogoče dodeliti.
        Podarjen paket nima datuma poteka.
      </p>

      <input value={iskanje} onChange={e => setIskanje(e.target.value)} type="search"
        placeholder="Išči račun…" aria-label="Išči račun"
        style={{
          width: 'min(22rem, 100%)', padding: '.55rem .95rem', marginBottom: '.8rem',
          borderRadius: 999, border: '1px solid rgba(17,17,17,.12)', background: '#fff',
          font: 'inherit', fontSize: '.82rem',
        }} />

      {napaka && <p style={{ color: '#b25476', fontSize: '.82rem' }}>{napaka}</p>}

      <div style={{
        background: '#fff', borderRadius: 16, padding: '.5rem 1.3rem 1rem',
        boxShadow: '0 4px 18px rgba(17,17,17,.05)', overflowX: 'auto',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.88rem', minWidth: 520 }}>
          <thead><tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(17,17,17,.15)' }}>
            <th style={TD}>Račun</th><th style={TD}>Ustvarjen</th><th style={TD}>Paket</th><th style={TD}>Dodeli</th>
          </tr></thead>
          <tbody>
            {vidni.map(r => {
              const paket = stanje[r.id] || r.paket;
              return <tr key={r.id} style={{ borderBottom: '1px solid rgba(17,17,17,.06)' }}>
                <td style={TD}>{r.ime}</td>
                <td style={{ ...TD, opacity: .6 }}>{new Date(r.ustvarjen).toLocaleDateString('sl-SI')}</td>
                <td style={TD}>
                  <b>{paket === 'pro' ? 'Pro' : 'Brezplačno'}</b>
                  {r.vir === 'rocno' && paket === 'pro' && <small style={{ opacity: .55 }}> · podarjen</small>}
                </td>
                <td style={TD}>
                  <div style={{ display: 'flex', gap: '.35rem' }}>
                    {(['free', 'pro'] as const).map(p => (
                      <button key={p} type="button" disabled={dela === r.id || paket === p}
                        onClick={() => nastavi(r.id, p)}
                        style={{
                          padding: '.35rem .8rem', borderRadius: 999, cursor: paket === p ? 'default' : 'pointer',
                          border: '1px solid ' + (paket === p ? '#111' : 'rgba(17,17,17,.15)'),
                          background: paket === p ? '#111' : '#fff',
                          color: paket === p ? '#fff' : '#111',
                          font: 'inherit', fontSize: '.72rem', fontWeight: 700,
                          opacity: dela === r.id ? .5 : 1,
                        }}>{p === 'pro' ? 'Pro' : 'Brezplačno'}</button>
                    ))}
                  </div>
                </td>
              </tr>;
            })}
            {!vidni.length && <tr><td colSpan={4} style={{ padding: '1.4rem .5rem', opacity: .6 }}>Ni računov.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

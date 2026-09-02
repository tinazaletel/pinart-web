'use client';

import { useEffect, useState } from 'react';

/**
 * PRIJAVE ZA TESTIRANJE (tabela beta_prijave).
 *
 * Prej so prijave prisle samo po e-posti in se nikjer niso shranile — med
 * enajst tisoc neprebranimi se je prijava izgubila brez sledu. Tu je seznam
 * tistih, ki cakajo, in en gumb, ki naredi vse troje: doda med testerje,
 * posije navodila in oznaci prijavo (Tina, 2. 9. 2026).
 */

type Prijava = {
  id: string;
  ime: string;
  email: string;
  stanje: 'prijavljen' | 'povabljen' | 'zavrnjen';
  opomba: string | null;
  prijavljen: string;
  obdelan: string | null;
};

const datum = (s: string | null) => (s ? new Date(s).toLocaleDateString('sl-SI', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

export default function AdminPrijave() {
  const [prijave, setPrijave] = useState<Prijava[] | null>(null);
  const [tece, setTece] = useState<string | null>(null);
  const [sporocilo, setSporocilo] = useState('');

  const nalozi = async () => {
    try {
      const r = await fetch('/api/kalkulator-admin/prijave');
      const d = await r.json();
      setPrijave(Array.isArray(d.prijave) ? d.prijave : []);
    } catch { setPrijave([]); }
  };
  useEffect(() => { void nalozi(); }, []);

  const ukrepaj = async (email: string, dejanje: 'sprejmi' | 'zavrni') => {
    setTece(email); setSporocilo('');
    try {
      const r = await fetch('/api/kalkulator-admin/prijave', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, dejanje }),
      });
      const d = await r.json();
      if (!r.ok) setSporocilo(d.error || 'Ni uspelo.');
      else if (dejanje === 'sprejmi') {
        setSporocilo(d.poslano
          ? `${email} je med testerji, navodila so poslana.`
          : `${email} je med testerji, MAILA PA NI ODNESLO — piši mu sama.`);
      }
      await nalozi();
    } catch { setSporocilo('Ni povezave.'); }
    finally { setTece(null); }
  };

  const cakajo = (prijave || []).filter(p => p.stanje === 'prijavljen');
  const ostali = (prijave || []).filter(p => p.stanje !== 'prijavljen');

  return (
    <section style={{ marginTop: '2.5rem' }}>
      <h2 style={{ margin: '0 0 .3rem', font: '600 1.05rem system-ui, sans-serif' }}>
        Prijave za testiranje {cakajo.length > 0 && <span style={{ color: '#6D3BEB' }}>· {cakajo.length} čaka</span>}
      </h2>
      <p style={{ margin: '0 0 1rem', fontSize: '.85rem', color: 'rgba(17,17,17,.6)' }}>
        »Sprejmi« doda e-naslov med testerje in mu pošlje navodila z geslom. Brez tega ne ve, da lahko vstopi.
      </p>

      {sporocilo && (
        <p role="status" style={{
          margin: '0 0 1rem', padding: '.6rem .8rem', borderRadius: '.6rem',
          background: sporocilo.includes('NI ODNESLO') ? 'rgba(214,64,64,.09)' : 'rgba(64,160,110,.12)',
          fontSize: '.85rem',
        }}>{sporocilo}</p>
      )}

      {prijave === null ? <p style={{ fontSize: '.85rem' }}>Nalagam …</p>
        : prijave.length === 0 ? <p style={{ fontSize: '.85rem', color: 'rgba(17,17,17,.6)' }}>Ni še nobene prijave.</p>
        : (
          <div style={{ display: 'grid', gap: '.5rem' }}>
            {[...cakajo, ...ostali].map(p => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: '.8rem', flexWrap: 'wrap',
                padding: '.7rem .9rem', border: '1px solid rgba(17,17,17,.1)', borderRadius: '.7rem',
                background: p.stanje === 'prijavljen' ? '#fff' : 'rgba(17,17,17,.02)',
              }}>
                <div style={{ flex: '1 1 16rem', minWidth: 0 }}>
                  <div style={{ font: '700 .9rem system-ui, sans-serif' }}>{p.ime}</div>
                  <div style={{ fontSize: '.8rem', color: 'rgba(17,17,17,.65)' }}>
                    {p.email} · prijava {datum(p.prijavljen)}
                    {p.obdelan && ` · obdelano ${datum(p.obdelan)}`}
                  </div>
                </div>
                <span style={{
                  padding: '.2rem .6rem', borderRadius: 999, fontSize: '.72rem', fontWeight: 700,
                  background: p.stanje === 'povabljen' ? 'rgba(64,160,110,.15)'
                    : p.stanje === 'zavrnjen' ? 'rgba(17,17,17,.08)' : 'rgba(109,59,235,.12)',
                  color: p.stanje === 'povabljen' ? '#2c6b4a' : p.stanje === 'zavrnjen' ? 'rgba(17,17,17,.55)' : '#5b2fd0',
                }}>
                  {p.stanje === 'prijavljen' ? 'čaka' : p.stanje === 'povabljen' ? 'povabljen' : 'zavrnjen'}
                </span>
                {p.stanje === 'prijavljen' && (
                  <span style={{ display: 'inline-flex', gap: '.4rem' }}>
                    <button type="button" disabled={tece === p.email} onClick={() => ukrepaj(p.email, 'sprejmi')}
                      style={{ minHeight: '2.25rem', padding: '0 1.05rem', borderRadius: 999, border: 0,
                               background: '#111', color: '#fff', font: '700 .82rem system-ui, sans-serif', cursor: 'pointer' }}>
                      {tece === p.email ? 'Pošiljam …' : 'Sprejmi'}
                    </button>
                    <button type="button" disabled={tece === p.email} onClick={() => ukrepaj(p.email, 'zavrni')}
                      style={{ minHeight: '2.25rem', padding: '0 .9rem', borderRadius: 999,
                               border: '1px solid rgba(17,17,17,.18)', background: 'transparent',
                               font: '700 .82rem system-ui, sans-serif', cursor: 'pointer' }}>
                      Zavrni
                    </button>
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
    </section>
  );
}

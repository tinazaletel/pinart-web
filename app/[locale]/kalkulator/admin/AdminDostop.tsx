'use client';

import { useEffect, useState } from 'react';

/**
 * Upravljanje zaprte bete in dodelitev (tabela flow_dostop).
 *   · tester  — poln dostop do aplikacije (beta)
 *   · nagrada — poln dostop za OBDOBJE (velja_od–velja_do), potem poteče → plačilo
 *   · popust  — zabeležen % ob plačilu (uveljavi se, ko bo plačilni sistem živ)
 *
 * Env seznam NEXT_PUBLIC_BETA_TESTERJI ostane varovalka (Tina); ta panel je
 * samopostrežni vir, ki teče prek /api/kalkulator-admin/dostop (service-role za
 * geslom pinart_admin).
 */

type Vrsta = 'tester' | 'nagrada' | 'popust';

type Dodelitev = {
  email: string;
  vrsta: Vrsta;
  velja_od: string | null;
  velja_do: string | null;
  popust: number | null;
  opomba: string | null;
  dodan?: string;
  vpisan?: boolean;          // ali se je e-mail dejansko prijavil (auth uporabnik obstaja)
  zadnji_vpis?: string | null; // ISO zadnjega vpisa
  dni?: number | null;       // stevilo razlicnih dni aktivnosti
  odprtij?: number | null;   // skupaj odprtij aplikacije
};

const PRAZEN = { email: '', vrsta: 'tester' as Vrsta, velja_od: '', velja_do: '', popust: '', opomba: '' };

const VRSTA_OPIS: Record<Vrsta, string> = {
  tester: 'Beta tester — poln dostop',
  nagrada: 'Nagrada — poln dostop za obdobje',
  popust: 'Popust — % ob plačilu',
};

export default function AdminDostop() {
  const [vrstice, setVrstice] = useState<Dodelitev[]>([]);
  const [obr, setObr] = useState(PRAZEN);
  const [dela, setDela] = useState(false);
  const [napaka, setNapaka] = useState('');
  const [nalagam, setNalagam] = useState(true);

  async function osveziSeznam() {
    setNalagam(true);
    try {
      const res = await fetch('/api/kalkulator-admin/dostop', { cache: 'no-store' });
      const j = await res.json();
      if (!res.ok) { setNapaka(j.error || 'Seznama ni bilo mogoče prebrati.'); setVrstice([]); }
      else { setVrstice(j.vrstice || []); setNapaka(''); }
    } catch {
      setNapaka('Seznama ni bilo mogoče prebrati.');
    }
    setNalagam(false);
  }

  useEffect(() => { osveziSeznam(); }, []);

  async function shrani(e: React.FormEvent) {
    e.preventDefault();
    setDela(true); setNapaka('');
    const res = await fetch('/api/kalkulator-admin/dostop', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: obr.email,
        vrsta: obr.vrsta,
        velja_od: obr.velja_od || null,
        velja_do: obr.velja_do || null,
        popust: obr.vrsta === 'popust' ? obr.popust : null,
        opomba: obr.opomba || null,
      }),
    });
    setDela(false);
    if (!res.ok) { const j = await res.json().catch(() => ({})); setNapaka(j.error || 'Ni uspelo.'); return; }
    setObr(PRAZEN);
    osveziSeznam();
  }

  async function izbrisi(email: string) {
    setDela(true); setNapaka('');
    const res = await fetch('/api/kalkulator-admin/dostop', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    setDela(false);
    if (!res.ok) { setNapaka('Brisanje ni uspelo.'); return; }
    osveziSeznam();
  }

  function uredi(d: Dodelitev) {
    setObr({
      email: d.email, vrsta: d.vrsta,
      velja_od: d.velja_od || '', velja_do: d.velja_do || '',
      popust: d.popust != null ? String(d.popust) : '', opomba: d.opomba || '',
    });
    if (typeof window !== 'undefined') window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }

  const danes = new Date().toISOString().slice(0, 10);
  const jePotekel = (d: Dodelitev) => !!d.velja_do && d.velja_do < danes;

  const INP: React.CSSProperties = {
    height: '2.6rem', boxSizing: 'border-box', padding: '.5rem .8rem', borderRadius: 10,
    border: '1px solid rgba(17,17,17,.14)', background: '#fff', font: 'inherit', fontSize: '.85rem',
  };
  const TD = { padding: '.55rem .5rem', verticalAlign: 'top' } as const;
  const znak = (bg: string, fg: string): React.CSSProperties => ({
    display: 'inline-block', padding: '.12rem .5rem', borderRadius: 999,
    fontSize: '.7rem', fontWeight: 700, background: bg, color: fg,
  });

  return (
    <>
      <h2 style={{ fontSize: '1rem', margin: '2.6rem 0 .3rem', fontWeight: 700 }}>Zaprta beta in dodelitve</h2>
      <p style={{ opacity: .55, fontSize: '.78rem', margin: '0 0 1rem', maxWidth: '44rem' }}>
        Kdo lahko vstopi v aplikacijo in kdo dobi poln paket zastonj. Nagrada poteče po obdobju
        (nato plačilo). Popust se dejansko uveljavi šele, ko bo plačilni sistem živ — dotlej ga panel le beleži.
      </p>

      {napaka && <p style={{
        color: '#b25476', fontSize: '.82rem', margin: '0 0 .8rem',
        padding: '.7rem .95rem', borderRadius: 12, background: 'rgba(178,84,118,.08)',
      }}>{napaka}</p>}

      {/* Tabela */}
      <div style={{
        background: '#fff', borderRadius: 16, padding: '.5rem 1.3rem 1rem',
        boxShadow: '0 4px 18px rgba(17,17,17,.05)', overflowX: 'auto', marginBottom: '1.6rem',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.86rem', minWidth: 880 }}>
          <thead><tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(17,17,17,.15)' }}>
            <th style={TD}>E-mail</th><th style={TD}>Vrsta</th><th style={TD}>Vpisan?</th><th style={TD}>Obiskov (dni)</th><th style={TD}>Zadnji vpis</th><th style={TD}>Obdobje</th>
            <th style={TD}>Popust</th><th style={TD}>Opomba</th><th style={TD}></th>
          </tr></thead>
          <tbody>
            {nalagam && <tr><td colSpan={9} style={{ padding: '1.4rem .5rem', opacity: .6 }}>Nalagam…</td></tr>}
            {!nalagam && vrstice.map(d => (
              <tr key={d.email} style={{ borderBottom: '1px solid rgba(17,17,17,.06)', opacity: jePotekel(d) ? .5 : 1 }}>
                <td style={TD}><strong>{d.email}</strong></td>
                <td style={TD}>
                  {d.vrsta === 'tester' && <span style={znak('rgba(124,58,237,.12)', '#6d28d9')}>Tester</span>}
                  {d.vrsta === 'nagrada' && <span style={znak('rgba(16,140,90,.14)', '#0f7a4d')}>Nagrada</span>}
                  {d.vrsta === 'popust' && <span style={znak('rgba(200,120,20,.14)', '#a35a12')}>Popust</span>}
                </td>
                <td style={TD}>
                  {d.vpisan
                    ? <span style={znak('rgba(16,140,90,.14)', '#0f7a4d')}>Da</span>
                    : <span style={znak('rgba(17,17,17,.07)', 'rgba(17,17,17,.5)')}>Ne</span>}
                </td>
                <td style={{ ...TD, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}
                  title={d.odprtij != null ? `${d.odprtij} odprtij skupaj` : undefined}>
                  {d.dni != null
                    ? <span><strong>{d.dni}</strong> <span style={{ opacity: .5 }}>{d.dni === 1 ? 'dan' : 'dni'}</span></span>
                    : <span style={{ opacity: .4 }}>—</span>}
                </td>
                <td style={{ ...TD, opacity: .7, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                  {d.zadnji_vpis ? new Date(d.zadnji_vpis).toLocaleDateString('sl-SI', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                </td>
                <td style={{ ...TD, opacity: .75, whiteSpace: 'nowrap' }}>
                  {d.velja_od || d.velja_do
                    ? `${d.velja_od || '…'} → ${d.velja_do || '∞'}${jePotekel(d) ? ' (poteklo)' : ''}`
                    : 'neomejeno'}
                </td>
                <td style={TD}>{d.popust != null ? `${d.popust} %` : '—'}</td>
                <td style={{ ...TD, opacity: .7 }}>{d.opomba || '—'}</td>
                <td style={{ ...TD, whiteSpace: 'nowrap' }}>
                  <button type="button" onClick={() => uredi(d)} disabled={dela}
                    style={{ ...INP, height: 'auto', padding: '.3rem .7rem', cursor: 'pointer', marginRight: '.35rem', fontSize: '.72rem', fontWeight: 700 }}>Uredi</button>
                  <button type="button" onClick={() => izbrisi(d.email)} disabled={dela}
                    style={{ ...INP, height: 'auto', padding: '.3rem .7rem', cursor: 'pointer', fontSize: '.72rem', fontWeight: 700, color: '#b25476', borderColor: 'rgba(178,84,118,.35)' }}>Izbriši</button>
                </td>
              </tr>
            ))}
            {!nalagam && !vrstice.length && <tr><td colSpan={9} style={{ padding: '1.4rem .5rem', opacity: .6 }}>Še ni dodelitev.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Obrazec dodaj / uredi */}
      <form onSubmit={shrani} style={{
        background: '#fff', borderRadius: 16, padding: '1.2rem 1.3rem',
        boxShadow: '0 4px 18px rgba(17,17,17,.05)', display: 'grid', gap: '.8rem',
        gridTemplateColumns: 'repeat(auto-fit, minmax(12rem, 1fr))', alignItems: 'end', maxWidth: '52rem',
      }}>
        <label style={{ display: 'grid', gap: '.3rem', fontSize: '.76rem', fontWeight: 700 }}>
          E-mail
          <input type="email" required value={obr.email} onChange={e => setObr(o => ({ ...o, email: e.target.value }))}
            placeholder="ime@primer.si" style={INP} />
        </label>
        <label style={{ display: 'grid', gap: '.3rem', fontSize: '.76rem', fontWeight: 700 }}>
          Vrsta
          <select value={obr.vrsta} onChange={e => setObr(o => ({ ...o, vrsta: e.target.value as Vrsta }))} style={INP}>
            {(Object.keys(VRSTA_OPIS) as Vrsta[]).map(v => <option key={v} value={v}>{VRSTA_OPIS[v]}</option>)}
          </select>
        </label>
        <label style={{ display: 'grid', gap: '.3rem', fontSize: '.76rem', fontWeight: 700 }}>
          Velja od <span style={{ opacity: .5, fontWeight: 400 }}>(prazno = takoj)</span>
          <input type="date" value={obr.velja_od} onChange={e => setObr(o => ({ ...o, velja_od: e.target.value }))} style={INP} />
        </label>
        <label style={{ display: 'grid', gap: '.3rem', fontSize: '.76rem', fontWeight: 700 }}>
          Velja do <span style={{ opacity: .5, fontWeight: 400 }}>(prazno = neomejeno)</span>
          <input type="date" value={obr.velja_do} onChange={e => setObr(o => ({ ...o, velja_do: e.target.value }))} style={INP} />
        </label>
        {obr.vrsta === 'popust' && (
          <label style={{ display: 'grid', gap: '.3rem', fontSize: '.76rem', fontWeight: 700 }}>
            Popust (%)
            <input type="number" min={0} max={100} value={obr.popust}
              onChange={e => setObr(o => ({ ...o, popust: e.target.value }))} placeholder="npr. 20" style={INP} />
          </label>
        )}
        <label style={{ display: 'grid', gap: '.3rem', fontSize: '.76rem', fontWeight: 700 }}>
          Opomba
          <input type="text" value={obr.opomba} onChange={e => setObr(o => ({ ...o, opomba: e.target.value }))}
            placeholder="npr. ambasador IG" style={INP} />
        </label>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <button type="submit" disabled={dela}
            style={{ padding: '.6rem 1.2rem', borderRadius: 999, border: 0, background: '#111', color: '#fff', font: 'inherit', fontSize: '.82rem', fontWeight: 700, cursor: 'pointer', opacity: dela ? .5 : 1 }}>
            {dela ? 'Shranjujem…' : 'Dodaj / posodobi'}
          </button>
          {obr.email && <button type="button" onClick={() => setObr(PRAZEN)}
            style={{ padding: '.6rem 1rem', borderRadius: 999, border: '1px solid rgba(17,17,17,.15)', background: '#fff', font: 'inherit', fontSize: '.82rem', fontWeight: 700, cursor: 'pointer' }}>
            Počisti
          </button>}
        </div>
      </form>
    </>
  );
}

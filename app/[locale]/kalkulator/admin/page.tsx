import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import AdminLogin from './AdminLogin';
import { pridobiCenovnePodatke } from './podatki';

/* Ni javno linkana nikjer na strani + geslo pred vsebino + noindex —
   glej docs/CENE-WEBHOOK.md §4 za nastavitev. */
export const metadata: Metadata = {
  title: 'Admin — Kalkulator cene',
  robots: { index: false, follow: false },
};

export default async function KalkulatorAdminPage() {
  const geslo = process.env.KALKULATOR_ADMIN_GESLO;
  const c = await cookies();
  const prijavljen = !!geslo && c.get('pinart_admin')?.value === geslo;

  if (!prijavljen) return <AdminLogin />;

  const { napaka, vir, skupno, zadnji, skupine, storitve, trgi, racuni, dnevi } = await pridobiCenovnePodatke();

  const kartica = { background: '#fff', borderRadius: 16, padding: '1.1rem 1.3rem', boxShadow: '0 4px 18px rgba(17,17,17,.05)' } as const;
  const th = { padding: '.8rem .5rem' } as const;
  const td = { padding: '.55rem .5rem' } as const;
  const naslov = { fontSize: '1rem', margin: '2.4rem 0 .8rem', fontWeight: 700 } as const;

  const racunovSkupaj = racuni.reduce((s, r) => s + r.stevilo, 0);
  const proRacunov = racuni.filter(r => r.paket === 'pro').reduce((s, r) => s + r.stevilo, 0);
  const sejSkupaj = dnevi.reduce((s, d) => s + d.sej, 0);
  const nevpisanihSkupaj = dnevi.reduce((s, d) => s + d.nevpisanih, 0);

  return (
    <main style={{
      minHeight: '100dvh', background: '#F5F2EA', padding: '3rem clamp(1rem,4vw,3rem) 6rem',
      fontFamily: 'system-ui, sans-serif', color: '#111',
    }}>
      {/* ABSOLUTNA pot — "../pregled" je z /kalkulator/admin vodil na /pregled (404) */}
      <a href="/kalkulator/pregled" style={{
        display: 'inline-flex', alignItems: 'center', gap: '.4rem', marginBottom: '1.4rem',
        fontSize: '.82rem', fontWeight: 600, color: '#111', textDecoration: 'none',
        background: '#fff', border: '1px solid rgba(17,17,17,.12)', borderRadius: 999, padding: '.5rem 1rem',
      }}>← Pinart Flow</a>
      <h1 style={{ fontSize: '1.6rem', marginBottom: '.3rem' }}>Pinart Flow — analitika</h1>
      <p style={{ opacity: .65, marginBottom: '2rem', fontSize: '.9rem' }}>
        {skupno} cenovnih točk{zadnji ? ` · zadnja ${new Date(zadnji).toLocaleString('sl-SI')}` : ''}
        {vir === 'sheet' && ' · vir: Google Sheet (Supabase še ni nastavljen)'}
      </p>

      {napaka && <p style={{ color: '#b25476' }}>{napaka}</p>}

      {/* ── Seštevki ─────────────────────────────────────────────────────── */}
      {vir === 'supabase' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(11rem,1fr))', gap: '1rem' }}>
          {[
            { oznaka: 'Računov skupaj', vrednost: racunovSkupaj },
            { oznaka: 'Plačljivih (pro)', vrednost: proRacunov },
            { oznaka: 'Obiskov (30 dni)', vrednost: sejSkupaj },
            { oznaka: 'Od tega nevpisanih', vrednost: nevpisanihSkupaj },
          ].map(k => (
            <div key={k.oznaka} style={kartica}>
              <div style={{ fontSize: '.76rem', opacity: .6, marginBottom: '.35rem' }}>{k.oznaka}</div>
              <div style={{ fontSize: '1.7rem', fontWeight: 700 }}>{k.vrednost.toLocaleString('sl-SI')}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Najpogostejše storitve ───────────────────────────────────────── */}
      {!!storitve.length && <>
        <h2 style={naslov}>Katere storitve se največkrat vpisujejo</h2>
        <div style={{ ...kartica, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.88rem', minWidth: 380 }}>
            <thead><tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(17,17,17,.15)' }}>
              <th style={th}>Storitev</th><th style={th}>Št. vpisov</th><th style={th}>Mediana</th>
            </tr></thead>
            <tbody>{storitve.map(s => (
              <tr key={s.storitev} style={{ borderBottom: '1px solid rgba(17,17,17,.06)' }}>
                <td style={td}>{s.storitev}</td>
                <td style={td}>{s.stevilo}</td>
                <td style={{ ...td, fontWeight: 600 }}>{s.mediana.toLocaleString('sl-SI')} €</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </>}

      {/* ── Od kod so ────────────────────────────────────────────────────── */}
      {!!trgi.length && <>
        <h2 style={naslov}>Od kod so uporabniki</h2>
        <p style={{ opacity: .6, fontSize: '.82rem', margin: '-.4rem 0 .8rem' }}>
          Trg, ki ga uporabnik izbere sam v kalkulatorju. IP naslovov ne zbiramo.
        </p>
        <div style={{ ...kartica, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.88rem', minWidth: 380 }}>
            <thead><tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(17,17,17,.15)' }}>
              <th style={th}>Trg</th><th style={th}>Št.</th><th style={th}>Mediana</th>
            </tr></thead>
            <tbody>{trgi.map(t => (
              <tr key={t.mojTrg} style={{ borderBottom: '1px solid rgba(17,17,17,.06)' }}>
                <td style={td}>{t.mojTrg}</td><td style={td}>{t.stevilo}</td>
                <td style={{ ...td, fontWeight: 600 }}>{t.mediana.toLocaleString('sl-SI')} €</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </>}

      {/* ── Cene po kombinaciji ──────────────────────────────────────────── */}
      {!napaka && <>
        <h2 style={naslov}>Cene po storitvi, izkušnjah in trgu</h2>
        <div style={{ ...kartica, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.88rem', minWidth: 560 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(17,17,17,.15)' }}>
                <th style={th}>Storitve</th>
                <th style={th}>Izkušnje</th>
                <th style={th}>Trg naročnika</th>
                <th style={th}>Št.</th>
                <th style={th}>Mediana</th>
                <th style={th}>Min–maks</th>
              </tr>
            </thead>
            <tbody>
              {skupine.map(s => (
                <tr key={s.kljuc} style={{ borderBottom: '1px solid rgba(17,17,17,.06)' }}>
                  <td style={td}>{s.storitve}</td>
                  <td style={td}>{s.izkusnje}</td>
                  <td style={td}>{s.trgNarocnika}</td>
                  <td style={td}>{s.stevilo}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{s.mediana.toLocaleString('sl-SI')} €</td>
                  <td style={{ ...td, opacity: .6 }}>{s.min.toLocaleString('sl-SI')}–{s.maks.toLocaleString('sl-SI')} €</td>
                </tr>
              ))}
              {!skupine.length && (
                <tr><td colSpan={6} style={{ padding: '1.4rem .5rem', opacity: .6 }}>Še ni podatkov.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </>}

      {/* ── Uporaba po dnevih ────────────────────────────────────────────── */}
      {!!dnevi.length && <>
        <h2 style={naslov}>Uporaba po dnevih</h2>
        <div style={{ ...kartica, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.88rem', minWidth: 420 }}>
            <thead><tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(17,17,17,.15)' }}>
              <th style={th}>Dan</th><th style={th}>Obiskov</th><th style={th}>Nevpisanih</th><th style={th}>Dogodkov</th>
            </tr></thead>
            <tbody>{dnevi.map(d => (
              <tr key={d.dan} style={{ borderBottom: '1px solid rgba(17,17,17,.06)' }}>
                <td style={td}>{new Date(`${d.dan}T12:00:00`).toLocaleDateString('sl-SI')}</td>
                <td style={td}>{d.sej}</td><td style={td}>{d.nevpisanih}</td><td style={{ ...td, opacity: .6 }}>{d.dogodkov}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </>}
    </main>
  );
}

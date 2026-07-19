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

  const { napaka, skupno, zadnji, skupine } = await pridobiCenovnePodatke();

  return (
    <main style={{
      minHeight: '100dvh', background: '#F5F2EA', padding: '3rem clamp(1rem,4vw,3rem) 6rem',
      fontFamily: 'system-ui, sans-serif', color: '#111',
    }}>
      <a href="../pregled" style={{
        display: 'inline-flex', alignItems: 'center', gap: '.4rem', marginBottom: '1.4rem',
        fontSize: '.82rem', fontWeight: 600, color: '#111', textDecoration: 'none',
        background: '#fff', border: '1px solid rgba(17,17,17,.12)', borderRadius: 999, padding: '.5rem 1rem',
      }}>← Pinart Flow</a>
      <h1 style={{ fontSize: '1.6rem', marginBottom: '.3rem' }}>Kalkulator — pregled cen</h1>
      <p style={{ opacity: .65, marginBottom: '2rem', fontSize: '.9rem' }}>
        {skupno} zapisov skupaj{zadnji ? ` · zadnji ${new Date(zadnji).toLocaleString('sl-SI')}` : ''}
      </p>

      {napaka && <p style={{ color: '#b25476' }}>{napaka}</p>}

      {!napaka && (
        <div style={{
          overflowX: 'auto', background: '#fff', borderRadius: 16, padding: '.5rem 1.4rem 1rem',
          boxShadow: '0 4px 18px rgba(17,17,17,.05)',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.88rem', minWidth: 560 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(17,17,17,.15)' }}>
                <th style={{ padding: '.8rem .5rem' }}>Storitve</th>
                <th style={{ padding: '.8rem .5rem' }}>Izkušnje</th>
                <th style={{ padding: '.8rem .5rem' }}>Trg naročnika</th>
                <th style={{ padding: '.8rem .5rem' }}>Št.</th>
                <th style={{ padding: '.8rem .5rem' }}>Mediana</th>
                <th style={{ padding: '.8rem .5rem' }}>Min–maks</th>
              </tr>
            </thead>
            <tbody>
              {skupine.map(s => (
                <tr key={s.kljuc} style={{ borderBottom: '1px solid rgba(17,17,17,.06)' }}>
                  <td style={{ padding: '.55rem .5rem' }}>{s.storitve}</td>
                  <td style={{ padding: '.55rem .5rem' }}>{s.izkusnje}</td>
                  <td style={{ padding: '.55rem .5rem' }}>{s.trgNarocnika}</td>
                  <td style={{ padding: '.55rem .5rem' }}>{s.stevilo}</td>
                  <td style={{ padding: '.55rem .5rem', fontWeight: 600 }}>{s.mediana.toLocaleString('sl-SI')} €</td>
                  <td style={{ padding: '.55rem .5rem', opacity: .6 }}>{s.min.toLocaleString('sl-SI')}–{s.maks.toLocaleString('sl-SI')} €</td>
                </tr>
              ))}
              {!skupine.length && (
                <tr><td colSpan={6} style={{ padding: '1.4rem .5rem', opacity: .6 }}>Še ni podatkov.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

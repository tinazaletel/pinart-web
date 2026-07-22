import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import AdminLogin from './AdminLogin';
import AdminPregled from './AdminPregled';
import { pridobiAnalitiko, type Obdobje } from './podatki';

/* Ni javno linkana nikjer na strani + geslo pred vsebino + noindex.
   Od 2026-07-22 NI vec za Flow prijavo: to ni del uporabniskega racuna,
   ampak pregled poslovanja, zascite z lastnim geslom. */
export const metadata: Metadata = {
  title: 'Pregled poslovanja — Pinart Flow',
  robots: { index: false, follow: false },
};

const VELJAVNA: Obdobje[] = [30, 90, 365, 0];

export default async function KalkulatorAdminPage(
  { searchParams }: { searchParams: Promise<{ obdobje?: string }> },
) {
  const geslo = process.env.KALKULATOR_ADMIN_GESLO;
  const c = await cookies();
  const prijavljen = !!geslo && c.get('pinart_admin')?.value === geslo;

  if (!prijavljen) return <AdminLogin />;

  const { obdobje: q } = await searchParams;
  const izbrano = VELJAVNA.find(v => String(v) === q) ?? 90;
  const podatki = await pridobiAnalitiko(izbrano);

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

      <h1 style={{ fontSize: '1.6rem', marginBottom: '.3rem' }}>Pinart Flow — pregled poslovanja</h1>
      <p style={{ opacity: .65, marginBottom: '1.6rem', fontSize: '.9rem' }}>
        {podatki.skupno} cenovnih točk v izbranem obdobju
        {podatki.zadnji ? ` · zadnja ${new Date(podatki.zadnji).toLocaleString('sl-SI')}` : ''}
      </p>

      {podatki.napaka && <p style={{ color: '#b25476', marginBottom: '1.4rem' }}>{podatki.napaka}</p>}

      <AdminPregled podatki={podatki} />
    </main>
  );
}

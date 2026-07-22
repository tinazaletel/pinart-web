'use client';

/**
 * Odjava iz pregleda poslovanja: pobrise piskotek in vrne na vpis gesla.
 * Stoji ob gumbu "← Pinart Flow", ker sta to obe poti stran s te strani.
 */
export default function AdminOdjava() {
  const odjava = async () => {
    await fetch('/api/kalkulator-admin/odjava', { method: 'POST' });
    window.location.reload();
  };

  return (
    <button type="button" onClick={odjava} style={{
      display: 'inline-flex', alignItems: 'center', gap: '.4rem',
      padding: '.5rem 1rem', borderRadius: 999,
      border: '1px solid #111', background: '#111',
      font: 'inherit', fontSize: '.82rem', fontWeight: 600, color: '#fff', cursor: 'pointer',
    }}>
      Odjava
      {/* vrata s puscico ven — puscica sama pomeni "naprej", ne "odjava" */}
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9.5 4.5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h3.5" />
        <path d="M15.5 15.5 19.5 12l-4-3.5M19.5 12H9.8" />
      </svg>
    </button>
  );
}

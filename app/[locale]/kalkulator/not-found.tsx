import Link from 'next/link';

/* 404 ZNOTRAJ Flow aplikacije (/kalkulator/*). Globalni not-found (portfolio) je
   pošiljal na Pinart portfolio (Projekti) — v Flow kontekstu napačno. Ta segmentni
   not-found gumba usmeri nazaj v FLOW, ne na Pinart portfolio. */
export default function FlowNotFound() {
  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        padding: '2rem',
        background: 'var(--paper, #f4f1ea)',
        color: 'var(--ink, #26231d)',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: '32rem', display: 'grid', gap: '1rem', justifyItems: 'center' }}>
        <p style={{ margin: 0, fontSize: '5rem', lineHeight: 1, fontFamily: 'var(--font-serif, Georgia), serif', fontWeight: 500 }}>404</p>
        <h1 style={{ margin: 0, fontSize: '1.6rem', fontFamily: 'var(--font-serif, Georgia), serif', fontWeight: 600 }}>Te strani ni v Flowu.</h1>
        <p style={{ margin: 0, color: 'color-mix(in oklch, currentColor 60%, transparent)', fontSize: '.95rem', lineHeight: 1.5 }}>
          Morda je bila premaknjena ali je nikoli ni bilo. Nadaljuj v svojem delovnem prostoru.
        </p>
        <div style={{ display: 'flex', gap: '.7rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '.4rem' }}>
          <Link
            href="/kalkulator/pregled"
            style={{ padding: '.7rem 1.2rem', borderRadius: '999px', background: 'var(--ink, #26231d)', color: 'var(--paper, #f4f1ea)', fontWeight: 700, fontSize: '.9rem', textDecoration: 'none' }}
          >
            ← Nadzorna plošča
          </Link>
          <Link
            href="/flow"
            style={{ padding: '.7rem 1.2rem', borderRadius: '999px', border: '1px solid color-mix(in oklch, currentColor 20%, transparent)', color: 'inherit', fontWeight: 700, fontSize: '.9rem', textDecoration: 'none' }}
          >
            Flow
          </Link>
        </div>
      </div>
    </main>
  );
}

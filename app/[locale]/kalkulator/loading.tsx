/* Odziv na klik v meniju.
 *
 * Strani Flowa se izrisujejo na strežniku (preverjanje paketa, podatki), zato
 * med klikom in prikazom mine nekaj sto milisekund — v razvoju, ko se stran
 * šele prevaja, tudi nekaj sekund. Brez tega zaslona se v tem času NE zgodi
 * nič vidnega: stara stran mirno stoji in klik je videti spregledan, zato
 * človek klikne še enkrat (Tina, 26. 8. 2026).
 *
 * Brez besedila namenoma — datoteka ne pozna jezika, utripajoča črta pa ga
 * ne potrebuje. */

export default function Nalaganje() {
  return (
    <div aria-busy="true" aria-live="polite" style={{ minHeight: '60vh', padding: '2.4rem clamp(1rem, 4vw, 2.6rem)' }}>
      <span style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 3, overflow: 'hidden', zIndex: 60 }}>
        <span style={{ display: 'block', width: '35%', height: '100%', borderRadius: 3, background: 'linear-gradient(90deg, transparent, #7C3AED, transparent)', animation: 'flowNalagaCrta 1.1s ease-in-out infinite' }} />
      </span>
      <div style={{ maxWidth: '52rem', display: 'grid', gap: '1rem' }}>
        {[38, 70, 55].map((w, i) => (
          <span key={w} style={{
            height: i === 0 ? '2.2rem' : '1rem',
            width: `${w}%`,
            borderRadius: 10,
            background: 'linear-gradient(90deg, rgba(17,17,17,.05), rgba(124,58,237,.10), rgba(17,17,17,.05))',
            backgroundSize: '200% 100%',
            animation: 'flowNalagaBlok 1.4s ease-in-out infinite',
            animationDelay: `${i * 0.12}s`,
          }} />
        ))}
      </div>
      <style>{`
        @keyframes flowNalagaCrta { 0% { transform: translateX(-100%); } 100% { transform: translateX(320%); } }
        @keyframes flowNalagaBlok { 0%, 100% { background-position: 0% 0; } 50% { background-position: 100% 0; } }
        @media (prefers-reduced-motion: reduce) {
          [aria-busy="true"] span { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

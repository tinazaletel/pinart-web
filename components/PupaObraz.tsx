/* PUPIN OBRAZ — mavrični krog z obrazom, brez iskric.
 *
 * Izvorno je zivel samo v Pupa.tsx kot lokalen pomocnik OBRAZ(); tu je enkrat,
 * da ga lahko uporabijo tudi strani zunaj klepeta (npr. vprasalnik), brez
 * podvajanja iste SVG poti (Tina, 3. 9. 2026 — "tista Pupa ikonica s faco,
 * brez rumene AI ikone").
 */
export default function PupaObraz({ px }: { px: number }) {
  return (
    <span aria-hidden style={{ position: 'relative', width: px, height: px, flex: 'none', borderRadius: '50%', background: 'conic-gradient(from 210deg,#ffd54a,#7be0a0,#63c7e8,#a78bfa,#f78fb0,#ffd54a)', display: 'inline-flex' }}>
      <svg viewBox="0 0 40 40" width={px} height={px} style={{ position: 'absolute', inset: 0 }}>
        <path d="M9.8 18.2q3.2-4.6 6.4 0" stroke="#2A2035" strokeWidth="2.1" fill="none" strokeLinecap="round" />
        <path d="M23.8 18.2q3.2-4.6 6.4 0" stroke="#2A2035" strokeWidth="2.1" fill="none" strokeLinecap="round" />
        <path d="M14.5 23.5q5.5 4.6 11 0" stroke="#2A2035" strokeWidth="2.1" fill="none" strokeLinecap="round" />
        <circle cx="11.5" cy="21.5" r="1.9" fill="rgba(255,120,170,.5)" />
        <circle cx="28.5" cy="21.5" r="1.9" fill="rgba(255,120,170,.5)" />
      </svg>
    </span>
  );
}

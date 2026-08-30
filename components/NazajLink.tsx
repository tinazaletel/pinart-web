'use client';

import { useRouter } from 'next/navigation';

/**
 * Enoten "Nazaj" gumb — pill s pravo puščico, ista oblika kot projektni detajl
 * (.pw-nazaj). Uporablja se na samostojnih straneh (pogoji, zasebnost) IN na
 * lupinskih straneh (nastavitve, ideje), da so VSI "Nazaj" enako oblikovani.
 *
 * Prednost ima `router.back()` (vrne te točno tja, od koder si prišel), sicer
 * pade na `rezerva` — npr. če stran odpreš direktno v novem zavihku.
 */
export default function NazajLink({
  rezerva = '/kalkulator/pregled',
  label = 'Nazaj',
  samoMobilno = false,
}: {
  rezerva?: string;
  label?: string;
  /* Na namizju skrit. Za strani, ki jih iz menija odpres neposredno: tam nazaj
     ni kam, na telefonu pa je meni zaprt in pot nazaj je potrebna
     (Tina, 30. 8. 2026). */
  samoMobilno?: boolean;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      className={'nazaj-pill' + (samoMobilno ? ' nazaj-mobilno' : '')}
      onClick={() => { if (window.history.length > 1) router.back(); else router.push(rezerva); }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M19 12H5M11 18l-6-6 6-6" />
      </svg>
      {label}
      <style jsx>{`
        .nazaj-pill {
          display: inline-flex;
          align-items: center;
          gap: .4rem;
          margin: 0 0 1rem;
          padding: .55rem .95rem;
          border: 1px solid oklch(93% .006 82 / .55);
          border-radius: 999px;
          background: oklch(98% .008 87 / .92);
          font: 700 .72rem var(--font-sans), system-ui, sans-serif;
          color: var(--ink);
          cursor: pointer;
          transition: background .15s, color .15s;
        }
        .nazaj-pill:hover { background: var(--ink); color: var(--paper); }
        @media (min-width: 901px) { .nazaj-mobilno { display: none; } }
      `}</style>
    </button>
  );
}

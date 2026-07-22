'use client';

import { useRouter } from 'next/navigation';

/**
 * "Nazaj" na samostojnih straneh (pogoji, zasebnost), ki nimajo Flow lupine
 * in zato ne menija ne pušcice.
 *
 * Uporabi zgodovino brskalnika, ker sem lahko prides z vec mest: iz profila,
 * iz onboardinga, iz noge kalkulatorja ali iz Googla. Fiksna povezava bi
 * enega od teh vedno poslala na napacno mesto. Ce zgodovine ni (odprto v
 * novem zavihku), pade na `rezerva`.
 */
export default function NazajLink({ rezerva = '/kalkulator/pregled' }: { rezerva?: string }) {
  const router = useRouter();
  return (
    <button type="button"
      onClick={() => { if (window.history.length > 1) router.back(); else router.push(rezerva); }}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '.45rem',
        minHeight: '2.75rem', padding: 0, border: 0, background: 'none',
        color: 'rgba(17,17,17,.62)', font: 'inherit', fontSize: '.85rem', fontWeight: 600,
        cursor: 'pointer',
      }}>
      <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 4.5 6.5 10l5.5 5.5" />
      </svg>
      Nazaj
    </button>
  );
}

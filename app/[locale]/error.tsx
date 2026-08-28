'use client';

/* Varovalka strani. Brez nje katera koli napaka v odjemalskem delu (na primer
   brskalnik brez WebGL) podre CELO stran in obiskovalec vidi golo
   »Application error: a client-side exception has occurred«.
   Tu dobi razumljivo sporocilo in gumb, ki poskusi znova. */

import { useEffect } from 'react';

export default function Napaka({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    /* v konzoli ostane sled za diagnozo (digest je oznaka napake na strezniku) */
    console.error('Napaka strani:', error);
  }, [error]);

  return (
    <main style={{
      minHeight: '70vh', display: 'grid', placeItems: 'center', padding: '3rem 1.4rem',
      background: 'var(--paper, #FAF7F0)', color: 'var(--ink, #111)',
    }}>
      <div style={{ maxWidth: '34rem', textAlign: 'center' }}>
        <h1 style={{ font: '400 clamp(1.6rem, 4vw, 2.3rem)/1.15 var(--font-serif-flow, Georgia, serif)', margin: '0 0 .8rem' }}>
          Nekaj se je zataknilo
        </h1>
        <p style={{ margin: '0 0 1.6rem', fontSize: '1rem', lineHeight: 1.6, color: 'rgba(17,17,17,.72)' }}>
          Stran se ni izrisala do konca. Tvoji podatki so na varnem — poskusi znova,
          in če se ponovi, nam piši na <a href="mailto:tina@pinart.si" style={{ color: 'inherit' }}>tina@pinart.si</a>.
        </p>
        <div style={{ display: 'inline-flex', gap: '.6rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={reset}
            style={{
              border: 'none', cursor: 'pointer', borderRadius: 999, padding: '.7rem 1.5rem',
              font: '700 .92rem var(--font-sans), system-ui, sans-serif',
              background: 'var(--ink, #111)', color: 'var(--paper, #FAF7F0)',
            }}
          >
            Poskusi znova
          </button>
          <a
            href="/"
            style={{
              borderRadius: 999, padding: '.7rem 1.5rem', textDecoration: 'none',
              font: '700 .92rem var(--font-sans), system-ui, sans-serif',
              border: '1px solid rgba(17,17,17,.25)', color: 'var(--ink, #111)',
            }}
          >
            Na začetno stran
          </a>
        </div>
        {error.digest && (
          <p style={{ marginTop: '1.4rem', fontSize: '.76rem', color: 'rgba(17,17,17,.45)' }}>
            Oznaka napake: {error.digest}
          </p>
        )}
      </div>
    </main>
  );
}

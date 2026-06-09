'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function Preloader() {
  const [phase, setPhase] = useState<'visible' | 'fading' | 'done'>('visible');

  useEffect(() => {
    const hide = () => {
      setPhase('fading');
      setTimeout(() => setPhase('done'), 700);
    };

    // Wait for fonts + all resources to load, then give a tiny buffer
    Promise.all([
      document.fonts.ready,
      new Promise<void>(res => {
        if (document.readyState === 'complete') res();
        else window.addEventListener('load', () => res(), { once: true });
      }),
    ]).then(() => setTimeout(hide, 200));
  }, []);

  if (phase === 'done') return null;

  return (
    <div
      aria-hidden
      style={{
        position:       'fixed',
        inset:           0,
        zIndex:          9999,
        background:     'var(--paper)',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        opacity:         phase === 'fading' ? 0 : 1,
        transition:      phase === 'fading' ? 'opacity 0.7s ease' : 'none',
        pointerEvents:   phase === 'fading' ? 'none' : 'auto',
      }}
    >
      <Image
        src="/Logos/Logo_pinart.svg"
        alt=""
        width={56}
        height={56}
        priority
        style={{
          animation: 'preloader-pulse 1.4s ease-in-out infinite',
          opacity:    phase === 'fading' ? 0 : 1,
          transition: 'opacity 0.3s ease',
        }}
      />
    </div>
  );
}

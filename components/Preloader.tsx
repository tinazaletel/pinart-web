'use client';

import { useEffect, useState } from 'react';

// Inline Pinart logo so each coloured letter can animate independently. While
// loading, the letters gently "breathe" (scale + brighten) in a staggered wave
// across the mark — a lively, on-brand preloader.
const LETTERS = [
  { d: 'M44.5793 33.3498H40.607C40.5291 33.0097 39.9056 18.1594 39.6133 11.0464C39.5782 10.1864 39.9874 9.88281 41.0786 9.81766C43.2712 9.68736 45.4574 9.50364 47.8332 9.32773C49.6241 14.4529 51.4101 19.571 53.1915 24.6822L53.7656 24.6431C53.9436 21.7375 54.406 12.2373 54.5827 9.32773H58.6095C58.6601 9.75121 58.6095 16.6636 58.6095 16.9802C58.5653 22.0372 58.6316 33.1452 58.6316 33.1452C58.6316 33.1452 52.8252 33.3224 50.865 33.4514L45.1729 18.6598L44.5793 18.7028V33.3498Z', fill: '#50E3C2' },
  { d: 'M14.7926 54.1717L20.7756 54.0257V47.0026L13.8144 47.7453C14.1392 49.877 14.4522 51.937 14.7926 54.1717ZM20.3028 43.2878L19.513 39.3618H8.03921L7.00003 35.6014C7.00003 35.6014 13.9028 35.3564 18.114 35.2535C18.8413 35.2313 19.5666 35.3394 20.256 35.5727C22.6669 36.5395 25.0176 37.5437 27.3081 38.5852C27.8355 38.825 28.3473 39.2472 28.3473 39.5846C28.4084 46.1296 28.3915 52.6732 28.3915 59.2273L23.0514 59.2846L22.2409 57.3458L12.8883 59.527L8.03531 50.1454L11.6893 43.6448C11.6893 43.6448 18.2153 43.3972 20.2976 43.2812', fill: '#B550F8' },
  { d: 'M19.9831 14.1775L13.7571 14.5384C14.0377 17.4337 14.3053 20.2052 14.5885 23.1382L20.8742 22.63C20.5702 19.74 20.287 17.0493 19.9844 14.1827M8.03384 10.3858C12.3321 10.0131 20.6819 9.32383 20.6819 9.32383L27.1885 14.4172C27.1885 14.4172 26.2792 23.4275 25.7245 26.2745L14.3455 26.8074C14.556 29.2558 14.7612 31.6168 14.9716 34.043H8.03904L8.03384 10.3858Z', fill: '#F8E71C' },
  { d: 'M47.1207 46.8918C41.9248 47.2176 41.9378 47.2176 41.7222 43.8467C41.643 42.5932 41.4533 41.3424 41.3065 40.0198L36.8316 40.6713C37.2433 46.8593 37.6538 53.0042 38.0708 59.2833L33.0048 58.8768C32.6982 50.8204 32.393 42.8499 32.0851 34.7466L36.2223 34.2124C36.2912 35.2404 36.3522 36.1447 36.4263 37.2692C37.5876 36.6177 40.796 35.2483 40.796 35.2483L46.5764 36.6372C46.5764 36.6372 47.1207 43.9119 47.1207 46.8892', fill: '#FD725B' },
  { d: 'M62.0907 40.7899V46.4593H55.3842C55.5881 49.8275 55.7739 53.0016 55.9778 56.2917L59.3694 56.4155C59.5448 54.6721 59.7084 53.0433 59.8708 51.4315L63 51.9527L62.4155 58.7882L58.629 60C58.629 60 53.4708 58.9915 51.9055 58.7152V45.7934L48.9828 45.353C48.7906 44.093 48.6022 42.8656 48.4009 41.5483L51.2729 41.1105V35.247H55.3686V40.7899H62.0907Z', fill: '#F8E71C' },
  { d: 'M30.6492 16.9985H34.372C34.5656 19.065 34.7708 21.0925 34.9436 23.1226C35.18 25.8745 35.6554 32.7387 35.6554 32.7387C35.6554 32.7387 31.8884 32.9993 30.6466 33.1452L30.6492 16.9985Z', fill: '#FA4892' },
  { d: 'M29.5163 8.38047L34.6512 8V13.3905L30.0268 13.9325C29.8528 12.0393 29.6891 10.2542 29.5163 8.38047Z', fill: '#4A90E2' },
];

// Each letter flies in from a different scattered position + rotation.
const FROM = [
  { tx: '-30px', ty: '-34px', rot: '-42deg' },
  { tx: '32px',  ty: '26px',  rot: '38deg'  },
  { tx: '-34px', ty: '20px',  rot: '52deg'  },
  { tx: '26px',  ty: '-30px', rot: '-32deg' },
  { tx: '36px',  ty: '-12px', rot: '46deg'  },
  { tx: '-16px', ty: '36px',  rot: '-54deg' },
  { tx: '12px',  ty: '-36px', rot: '44deg'  },
];

export default function Preloader() {
  const [phase, setPhase] = useState<'visible' | 'fading' | 'done'>('visible');

  useEffect(() => {
    let done = false;
    const hide = () => {
      if (done) return;
      done = true;
      setPhase('fading');
      setTimeout(() => setPhase('done'), 700);
    };
    // On the homepage the hero needs fonts + the pupa SVG before it shows
    // anything — hiding on fonts.ready alone left a long WHITE gap between the
    // logo and the packa on slow phones. So there we hold until the hero says
    // it's visually ready ('pinart-hero-ready'), with a higher safety cap.
    // Pages without the hero keep the old fonts-based behaviour.
    const hasHero = !!document.getElementById('hero');
    const onHeroReady = () => setTimeout(hide, 100);

    if (hasHero) {
      if ((window as unknown as { __pinartHeroReady?: boolean }).__pinartHeroReady) {
        onHeroReady(); // hero was ready before this listener attached
      } else {
        window.addEventListener('pinart-hero-ready', onHeroReady, { once: true });
      }
    } else {
      // Hide as soon as the fonts are ready — NOT on window 'load', which waits
      // for every image and video and can effectively never fire on slow links.
      document.fonts.ready.then(() => setTimeout(hide, 200));
    }
    // Hard safety cap: never hold the preloader longer than this, no matter the
    // network. The page is usable underneath; media streams in progressively.
    const cap = setTimeout(hide, hasHero ? 9000 : 3500);
    return () => {
      clearTimeout(cap);
      window.removeEventListener('pinart-hero-ready', onHeroReady);
    };
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
      <svg
        className="preloader-logo"
        width={88}
        height={85}
        viewBox="0 0 70 68"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="70" height="68" rx="6" fill="black" />
        {LETTERS.map((l, i) => (
          <path
            key={i}
            d={l.d}
            fill={l.fill}
            style={{
              ['--tx']: FROM[i].tx,
              ['--ty']: FROM[i].ty,
              ['--rot']: FROM[i].rot,
              animationDelay: `${i * 0.06}s`,
            } as React.CSSProperties}
          />
        ))}
      </svg>
    </div>
  );
}

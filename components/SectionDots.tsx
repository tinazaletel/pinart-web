'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const SECTIONS = [
  { id: 'hero',                dark: false }, // hero goes dark dynamically via event
  { id: 'services',            dark: false },
  { id: 'typography-collapse', dark: true  }, // always dark background
  { id: 'work',                dark: false },
  { id: 'about',               dark: false },
  { id: 'clients',             dark: false },
  { id: 'testimonials',        dark: true  },
  { id: 'contact',             dark: true  },
];

export default function SectionDots() {
  const pathname = usePathname();
  const [active, setActive] = useState(0);
  const [isDark, setIsDark] = useState(false);

  // The dots map to sections on the home page. On subpages (more-work,
  // work/<slug>, etc.) those sections don't exist — hide the indicator.
  // Decided AFTER all hooks have been called (rules of hooks).
  const isHome = !pathname || pathname === '/' || /^\/[a-z]{2}\/?$/i.test(pathname);

  useEffect(() => {
    const updateActive = () => {
      let bestIndex = 0;
      let bestDistance = Infinity;
      const markerY = window.innerHeight * 0.45;

      SECTIONS.forEach((section, index) => {
        const el = document.getElementById(section.id);
        if (!el) return;
        const rect = el.getBoundingClientRect();

        if (rect.top <= markerY && rect.bottom >= markerY) {
          bestIndex = index;
          bestDistance = 0;
          return;
        }

        const distance = Math.min(Math.abs(rect.top - markerY), Math.abs(rect.bottom - markerY));
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = index;
        }
      });

      setActive(bestIndex);
    };

    const raf = requestAnimationFrame(updateActive);
    const interval = window.setInterval(updateActive, 350);
    updateActive();
    window.addEventListener('scroll', updateActive, { passive: true });
    window.addEventListener('resize', updateActive, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(interval);
      window.removeEventListener('scroll', updateActive);
      window.removeEventListener('resize', updateActive);
    };
  }, []);

  // update dark mode when active section changes
  useEffect(() => {
    setIsDark(SECTIONS[active].dark);
  }, [active]);

  // listen for hero sending a dark-mode event (final screen vs restart)
  useEffect(() => {
    const handler = (e: Event) => {
      setIsDark((e as CustomEvent<{ dark: boolean }>).detail.dark);
    };
    window.addEventListener('pinart-dark', handler);
    return () => window.removeEventListener('pinart-dark', handler);
  }, []);

  // hide on subpages (after hooks have run)
  if (!isHome) return null;

  const num = String(active + 1).padStart(2, '0');

  const ink   = isDark ? 'rgba(248,245,238,0.98)' : 'rgba(17,17,17,0.72)';
  const muted = isDark ? 'rgba(248,245,238,0.46)' : 'rgba(17,17,17,0.24)';

  return (
    <div
      style={{
        position: 'fixed',
        right: 'clamp(1.1rem, 2.2vw, 2.2rem)',
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 45,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.45rem',
        pointerEvents: 'none',
      }}
    >
      {/* current section number */}
      <span
        data-section-number
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '9px',
          fontWeight: 600,
          letterSpacing: '0.09em',
          color: ink,
          marginBottom: '0.3rem',
          transition: 'color 0.5s ease',
        }}
      >
        {num}
      </span>

      {/* dots */}
      {SECTIONS.map((section, i) => (
        <button
          key={section.id}
          onClick={() => {
            const el = document.getElementById(section.id);
            el?.scrollIntoView({ behavior: 'smooth' });
          }}
          aria-label={`Section ${i + 1}`}
          style={{
            width:        i === active ? '5px' : '4px',
            height:       i === active ? '5px' : '4px',
            borderRadius: '50%',
            background:   i === active ? ink : muted,
            border:       'none',
            padding:      0,
            cursor:       'pointer',
            pointerEvents: 'auto',
            transition:   'all 0.4s ease',
            flexShrink:   0,
          }}
        />
      ))}
    </div>
  );
}

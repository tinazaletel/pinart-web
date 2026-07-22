'use client';

import { useEffect, useRef } from 'react';
import { gsap } from '@/lib/gsap';

/**
 * Prelivajoče se krivulje za tekoče merjenje časa — jezik snemalnika zvoka.
 *
 * Tri valovnice drsijo vodoravno z različnimi hitrostmi in amplitudami. Vsaka
 * je narisana čez DVE periodi (širina 800 pri pogledu 400), zato je premik za
 * točno 400 popolnoma brezšiven: konec prve periode je enak začetku druge in
 * oko ne vidi preskoka.
 *
 * Animira se samo `x` (transform), nikoli oblika poti — brskalnik zato ne
 * računa nove geometrije 60-krat na sekundo in telefonu ne jé baterije.
 */

const SIRINA = 800;   // dve periodi
const VISINA = 200;
const KORAKI = 96;    // dovolj gladko pri tej velikosti, a poceni

function valovnica(amplituda: number, osnova: number, periode: number, faza: number) {
  let d = '';
  for (let i = 0; i <= KORAKI; i += 1) {
    const x = (i / KORAKI) * SIRINA;
    const y = osnova + amplituda * Math.sin(faza + (i / KORAKI) * periode * Math.PI * 2);
    d += `${i ? ' L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return `${d} L ${SIRINA} ${VISINA} L 0 ${VISINA} Z`;
}

/* amplituda, osnovna višina, št. period, fazni zamik, trajanje kroga, prosojnost.
   Trajanja so kratka in različna (2,8 / 2,0 / 1,4 s), da se preliv vidno šiba. */
const PLASTI = [
  { d: valovnica(26, 96, 2, 0), trajanje: 2.8, opacity: 0.85, barva: 'url(#valMint)' },
  { d: valovnica(19, 116, 2, 2.1), trajanje: 2.0, opacity: 0.8, barva: 'url(#valViolet)' },
  { d: valovnica(13, 136, 2, 4.3), trajanje: 1.4, opacity: 0.75, barva: 'url(#valRoza)' },
];

export default function TimerValovi({ className }: { className?: string }) {
  const ref = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    /* kdor je v sistemu izklopil animacije, dobi mirno sliko */
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = gsap.context(() => {
      PLASTI.forEach((p, i) => {
        const cilj = svg.querySelectorAll('path')[i];
        if (!cilj) return;
        /* premik za natanko eno periodo = brezšivna zanka */
        gsap.fromTo(cilj, { x: 0 }, { x: -SIRINA / 2, duration: p.trajanje, ease: 'none', repeat: -1 });
        /* rahlo dihanje po višini, da ni videti kot drseča tapeta */
        gsap.to(cilj, {
          y: i % 2 ? 8 : -8, duration: p.trajanje / 2.4,
          ease: 'sine.inOut', repeat: -1, yoyo: true,
        });
      });
    }, svg);

    return () => ctx.revert();
  }, []);

  /* Sekundnega sunka ni: ozadje naj drsi enakomerno, ne poskakuje. */

  return (
    <svg
      ref={ref} className={className} aria-hidden="true" focusable="false"
      viewBox={`0 0 ${SIRINA / 2} ${VISINA}`} preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="valMint" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="oklch(88% .15 165)" />
          <stop offset="100%" stopColor="oklch(90% .10 195)" />
        </linearGradient>
        <linearGradient id="valViolet" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="oklch(88% .13 300)" />
          <stop offset="100%" stopColor="oklch(91% .09 330)" />
        </linearGradient>
        <linearGradient id="valRoza" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="oklch(90% .12 350)" />
          <stop offset="100%" stopColor="oklch(93% .10 60)" />
        </linearGradient>
      </defs>
      {/* skupina nosi sekundni utrip, posamezne poti pa drsenje in dihanje —
          loceno, sicer bi si transformaciji med sabo brisali */}
      <g>
        {PLASTI.map(p => (
          <path key={p.barva} d={p.d} fill={p.barva} opacity={p.opacity} />
        ))}
      </g>
    </svg>
  );
}

'use client';

/* Mehurcek (orb) — VERBATIM skopiran iz kalkulatorja (OrbSfera + ikone + barve + CSS),
   da je videz IDENTICEN. Uporablja RetainerWorkspace (in lahko kdorkoli). */

import type { ReactNode } from 'react';
import {
  PenNib, Palette, Browser, Megaphone, PaintBrush, Compass, Camera, TextT,
  DeviceMobile, ShareNetwork, MagnifyingGlass, FilmSlate, Sparkle,
} from '@phosphor-icons/react';

/* osvetli hex proti beli (0..1) — za 4-stopenjski gradient kot v CGP.svg */
export function osvetli(hex: string, amt: number) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  const m = (c: number) => Math.max(0, Math.min(255, Math.round(c + (255 - c) * amt))).toString(16).padStart(2, '0');
  return `#${m(r)}${m(g)}${m(b)}`;
}

export const ORB_BARVE: [string, string][] = [
  ['#7C3AED', '#C084FC'], ['#0EA5A5', '#5EEAD4'], ['#E8A200', '#FCE38A'],
  ['#DB2777', '#F9A8D4'], ['#2563EB', '#7FB6F0'], ['#5B9E1E', '#B7E86A'],
  ['#EA580C', '#FDBA74'], ['#84A21E', '#DCEE9B'],
];

const IKONE: Record<string, ReactNode> = {
  cgp: <Palette size={19} />, logo: <PenNib size={19} />, web: <Browser size={19} />,
  smm: <ShareNetwork size={19} />, copy: <TextT size={19} />, ilustracija: <PaintBrush size={19} />,
  fotografija: <Camera size={19} />, motion: <FilmSlate size={19} />, aplikacija: <DeviceMobile size={19} />,
  seo: <MagnifyingGlass size={19} />, kampanja: <Megaphone size={19} />, direkcija: <Compass size={19} />,
};
export const ikonaZa = (id: string) => IKONE[id] ?? <Sparkle size={19} />;

/* Krogla VERNO po Tininem CGP.svg (isti gradient 4 stopnje + bela svetloba + drop & inner shadow). */
export function OrbSfera({ id, o1 }: { id: string; o1: string }) {
  const s2 = osvetli(o1, 0.18), s3 = osvetli(o1, 0.6), s4 = osvetli(o1, 0.68);
  return (
    <svg className="orb0-sfera" viewBox="0 0 413 411" aria-hidden preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id={`osf-${id}`} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse"
          gradientTransform="translate(206.477 201.802) rotate(90) scale(137.225 138.5)">
          <stop stopColor={o1} />
          <stop offset="0.288462" stopColor={s2} />
          <stop offset="0.673077" stopColor={s3} />
          <stop offset="1" stopColor={s4} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`osh-${id}`} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse"
          gradientTransform="translate(136.802 129.578) rotate(84.2205) scale(105.473 108.261)">
          <stop stopColor="#fff" />
          <stop offset="0.740385" stopColor="#fff" stopOpacity="0.077" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <filter id={`osd-${id}`} x="0" y="0" width="412.951" height="410.402" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="bg" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="ha" />
          <feOffset dy="3.39877" />
          <feGaussianBlur stdDeviation="33.9877" />
          <feComposite in2="ha" operator="out" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.781907 0 0 0 0 0.781907 0 0 0 0 0.781907 0 0 0 0.15 0" />
          <feBlend mode="normal" in2="bg" result="ds" />
          <feBlend mode="normal" in="SourceGraphic" in2="ds" result="shape" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="ha2" />
          <feOffset dy="-3.39877" />
          <feGaussianBlur stdDeviation="7.64724" />
          <feComposite in2="ha2" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.34 0" />
          <feBlend mode="normal" in2="shape" />
        </filter>
        <clipPath id={`oc-${id}`}>
          <rect x="67.9766" y="64.5767" width="277" height="274.451" rx="137.225" />
        </clipPath>
      </defs>
      <g filter={`url(#osd-${id})`}>
        <g clipPath={`url(#oc-${id})`}>
          <rect x="67.9766" y="64.5767" width="277" height="274.451" rx="137.225" fill={`url(#osf-${id})`} />
          <ellipse cx="147.423" cy="138.075" rx="98.9893" ry="96.4402" fill={`url(#osh-${id})`} />
        </g>
      </g>
    </svg>
  );
}

/* orb0 CSS — skopiran iz kalkulatorja, scopan pod .rw (namesto .cw) */
export const ORB0_CSS = `
  .rw .orb0 { position: absolute; border: none; background: none; cursor: pointer; padding: 0; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: #fff; font-family: inherit; z-index: 1; animation: rwOrbPlavaj var(--dur, 11s) ease-in-out var(--del, 0s) infinite, rwOrbVstop .7s ease var(--vdel, 0s) both; will-change: transform, filter; transition: filter .25s ease; }
  .rw .orb0:hover { filter: brightness(1.06) drop-shadow(0 9px 20px rgba(40,25,60,.24)); z-index: 3; }
  .rw .orb0.on { filter: drop-shadow(0 6px 16px rgba(40,25,60,.26)); }
  .rw .orb0:focus-visible { outline: 3px solid var(--ink); outline-offset: 4px; }
  @keyframes rwOrbVstop { from { opacity: 0; } to { opacity: 1; } }
  @keyframes rwOrbPlavaj { 0% { transform: translate(0,0); } 25% { transform: translate(var(--fx,8px), var(--fy,-10px)) scale(1.04); } 50% { transform: translate(calc(var(--fx,8px) * -.6), calc(var(--fy,-10px) * -.7)) scale(.97); } 75% { transform: translate(calc(var(--fx,8px) * .4), var(--fy,-10px)) scale(1.02); } 100% { transform: translate(0,0); } }
  @media (prefers-reduced-motion: reduce) { .rw .orb0 { animation: rwOrbVstop .5s ease both; } }
  .rw .orb0 .orb0-sfera { position: absolute; top: -22%; left: -22%; width: 144%; height: 144%; z-index: 0; pointer-events: none; }
  .rw .orb0 .orb0-ikona { position: relative; z-index: 1; display: block; margin-bottom: .12rem; filter: drop-shadow(0 1px 2px rgba(35,18,45,.45)); }
  .rw .orb0 .orb0-ikona svg { width: 24px; height: 24px; display: block; }
  .rw .orb0 .orb0-ime { position: relative; z-index: 1; font-weight: 700; font-size: .86rem; line-height: 1.12; padding: 0 1.1em; text-shadow: 0 1px 3px rgba(35,18,45,.5); }
  .rw .orb0 .orb0-check { position: absolute; top: 8%; right: 8%; z-index: 3; width: 1.5em; height: 1.5em; border-radius: 999px; background: var(--accent); color: #fff; font-weight: 800; font-size: .82rem; display: flex; align-items: center; justify-content: center; border: 2px solid rgba(255,255,255,.55); box-shadow: 0 5px 14px rgba(0,0,0,.25); }
  .rw .orb0.orb0-plus { color: rgba(17,17,17,.55); }
  .rw .orb0.orb0-plus .orb0-krog { position: absolute; inset: 4%; border-radius: 50%; border: 1.5px dashed rgba(17,17,17,.4); transition: border-color .18s; }
  .rw .orb0.orb0-plus:hover .orb0-krog { border-color: var(--ink); }
  .rw .orb0.orb0-plus .orb0-ikona { color: rgba(17,17,17,.5); filter: none; }
  .rw .orb0.orb0-plus .orb0-ime { font-weight: 600; text-shadow: none; font-size: .82rem; color: rgba(17,17,17,.5); }
  .rw .orb0.orb0-plus:hover .orb0-ikona, .rw .orb0.orb0-plus:hover .orb0-ime { color: var(--ink); }
`;
